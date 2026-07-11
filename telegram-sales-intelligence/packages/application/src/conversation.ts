import {
  ConflictError,
  NotFoundError,
  assertCanCloseConversation,
  type ActorContext,
  type Conversation,
  type ConversationMessage,
  type DomainRepositories,
  type UUID,
} from '@tsi/domain';

export interface ResolveConversationInput {
  actor: ActorContext;
  customer: {
    fullName: string;
    telegramUserId: string;
    telegramUsername?: string | null;
  };
  startedAt?: Date;
}

export class ResolveConversation {
  constructor(private readonly repositories: DomainRepositories) {}

  async execute(
    input: ResolveConversationInput,
  ): Promise<{ conversation: Conversation; created: boolean }> {
    const customer = await this.repositories.customers.upsertTracked({
      organizationId: input.actor.organizationId,
      ownerEmployeeId: input.actor.employeeId,
      fullName: input.customer.fullName,
      telegramUserId: input.customer.telegramUserId,
      telegramUsername: input.customer.telegramUsername,
      firstContactAt: input.startedAt ?? new Date(),
      lastContactAt: input.startedAt ?? new Date(),
    });

    const open = await this.repositories.conversations.findOpen(
      input.actor.organizationId,
      customer.id,
      input.actor.employeeId,
    );
    if (open) return { conversation: open, created: false };

    const previous = await this.repositories.conversations.findLatest(
      input.actor.organizationId,
      customer.id,
      input.actor.employeeId,
    );
    const conversation = await this.repositories.conversations.create({
      organizationId: input.actor.organizationId,
      customerId: customer.id,
      employeeId: input.actor.employeeId,
      previousConversationId: previous?.status === 'CLOSED' ? previous.id : null,
      status: 'OPEN',
      outcome: 'NONE',
      startedAt: input.startedAt ?? new Date(),
    });
    await this.repositories.workflows.getOrCreateGraph(input.actor.organizationId, conversation.id);
    await this.repositories.outbox.add({
      organizationId: input.actor.organizationId,
      aggregateType: 'Conversation',
      aggregateId: conversation.id,
      eventType: 'CONVERSATION_CREATED',
      payload: { previousConversationId: conversation.previousConversationId ?? null },
    });
    return { conversation, created: true };
  }
}

export interface IngestMessageInput extends ResolveConversationInput {
  telegramUserSessionId: UUID;
  telegramMessageId: string;
  senderType: 'CUSTOMER' | 'EMPLOYEE';
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'OTHER';
  textContent?: string | null;
  sentAt: Date;
}

export class IngestTelegramMessage {
  private readonly resolver: ResolveConversation;

  constructor(private readonly repositories: DomainRepositories) {
    this.resolver = new ResolveConversation(repositories);
  }

  async execute(
    input: IngestMessageInput,
  ): Promise<{ message: ConversationMessage | null; duplicate: boolean }> {
    if (
      await this.repositories.messages.existsByTelegramId(
        input.telegramUserSessionId,
        input.telegramMessageId,
      )
    ) {
      return { message: null, duplicate: true };
    }

    return this.repositories.transaction.run(async () => {
      const { conversation } = await this.resolver.execute(input);
      const customer = await this.repositories.customers.findByTelegramUser(
        input.actor.organizationId,
        input.actor.employeeId,
        input.customer.telegramUserId,
      );
      if (!customer) throw new NotFoundError('Customer');

      const message = await this.repositories.messages.create({
        organizationId: input.actor.organizationId,
        conversationId: conversation.id,
        telegramUserSessionId: input.telegramUserSessionId,
        telegramMessageId: input.telegramMessageId,
        senderType: input.senderType,
        senderEmployeeId: input.senderType === 'EMPLOYEE' ? input.actor.employeeId : null,
        senderCustomerId: input.senderType === 'CUSTOMER' ? customer.id : null,
        messageType: input.messageType,
        textContent: input.textContent,
        sentAt: input.sentAt,
      });
      await this.repositories.conversations.touch(
        input.actor.organizationId,
        conversation.id,
        input.senderType,
        input.sentAt,
      );
      await this.repositories.outbox.add({
        organizationId: input.actor.organizationId,
        aggregateType: 'Conversation',
        aggregateId: conversation.id,
        eventType: 'CONVERSATION_MESSAGE_ADDED',
        payload: { messageId: message.id, senderType: message.senderType },
      });
      return { message, duplicate: false };
    });
  }
}

export class CloseConversation {
  constructor(private readonly repositories: DomainRepositories) {}

  async execute(input: {
    actor: ActorContext;
    conversationId: UUID;
    outcome: 'WON' | 'LOST' | 'STOPPED';
    reason?: string;
  }): Promise<Conversation> {
    const conversation = await this.repositories.conversations.findById(
      input.actor.organizationId,
      input.conversationId,
    );
    if (!conversation) throw new NotFoundError('Conversation');
    if (conversation.status === 'CLOSED') throw new ConflictError('Conversation is already closed');
    assertCanCloseConversation(input.actor, conversation);
    const closed = await this.repositories.conversations.close(
      input.actor.organizationId,
      conversation.id,
      input.outcome,
      input.actor.employeeId,
      input.reason,
    );
    await this.repositories.outbox.add({
      organizationId: input.actor.organizationId,
      aggregateType: 'Conversation',
      aggregateId: conversation.id,
      eventType: 'CONVERSATION_CLOSED',
      payload: { outcome: input.outcome },
    });
    await this.repositories.audit.add({
      actor: input.actor,
      action: 'CLOSE_CONVERSATION',
      resourceType: 'Conversation',
      resourceId: conversation.id,
      metadata: { outcome: input.outcome },
    });
    return closed;
  }
}
