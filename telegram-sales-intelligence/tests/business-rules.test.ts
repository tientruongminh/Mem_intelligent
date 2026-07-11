import { describe, expect, it, vi } from 'vitest';
import {
  GenerateDailyReport,
  IngestTelegramMessage,
  QueryService,
  ResolveConversation,
  TriggerReplySuggestion,
  WorkflowValidator,
} from '@tsi/application';
import { workflowAiOutputSchema } from '@tsi/contracts';
import {
  WorkflowValidationError,
  calculateEmployeeMetrics,
  type ActorContext,
  type DomainRepositories,
} from '@tsi/domain';

const ids = {
  organization: '00000000-0000-4000-8000-000000000001',
  employee: '00000000-0000-4000-8000-000000000002',
  customer: '00000000-0000-4000-8000-000000000003',
  conversation: '00000000-0000-4000-8000-000000000004',
  graph: '00000000-0000-4000-8000-000000000005',
  message: '00000000-0000-4000-8000-000000000006',
  session: '00000000-0000-4000-8000-000000000007',
  node: '00000000-0000-4000-8000-000000000008',
};
const actor: ActorContext = {
  organizationId: ids.organization,
  employeeId: ids.employee,
  role: 'SALE',
  source: 'WEB',
};

function makeRepositories(
  options: { open?: boolean; closed?: boolean; lockedNode?: boolean } = {},
) {
  const customers: any[] = [];
  const conversations: any[] = [];
  const messages: any[] = [];
  if (options.open || options.closed)
    conversations.push({
      id: ids.conversation,
      organizationId: ids.organization,
      customerId: ids.customer,
      employeeId: ids.employee,
      status: options.open ? 'OPEN' : 'CLOSED',
      outcome: options.closed ? 'WON' : 'NONE',
      startedAt: new Date(),
      closedAt: options.closed ? new Date() : null,
    });
  const graph = {
    id: ids.graph,
    organizationId: ids.organization,
    conversationId: ids.conversation,
    currentRevision: 0,
    status: 'ACTIVE',
    nodes: options.lockedNode
      ? [
          {
            id: ids.node,
            organizationId: ids.organization,
            workflowGraphId: ids.graph,
            title: 'Locked',
            description: 'Locked node',
            confidence: 1,
            isAiGenerated: true,
            isLocked: true,
          },
        ]
      : [],
    edges: [],
  } as any;
  const repositories: DomainRepositories = {
    customers: {
      findByTelegramUser: async () => customers[0] ?? null,
      findById: async () => customers[0] ?? null,
      upsertTracked: async (input: any) => {
        if (!customers[0]) customers.push({ id: ids.customer, ...input });
        return customers[0];
      },
    },
    conversations: {
      findOpen: async () => conversations.find((value) => value.status === 'OPEN') ?? null,
      findLatest: async () => conversations.at(-1) ?? null,
      findById: async (_org, id) => conversations.find((value) => value.id === id) ?? null,
      create: async (input: any) => {
        const value = {
          id: `00000000-0000-4000-8000-${String(conversations.length + 10).padStart(12, '0')}`,
          ...input,
        };
        conversations.push(value);
        return value;
      },
      touch: async () => undefined,
      close: async () => conversations[0],
    },
    messages: {
      existsByTelegramId: async (_session, telegramId) =>
        messages.some((value) => value.telegramMessageId === telegramId),
      create: async (input: any) => {
        const value = { id: ids.message, ...input };
        messages.push(value);
        return value;
      },
      findByIds: async (_org, conversationId, evidenceIds) =>
        messages.filter(
          (value) => value.conversationId === conversationId && evidenceIds.includes(value.id),
        ),
      listRecent: async () => messages,
    },
    workflows: {
      getOrCreateGraph: async () => graph,
      findNode: async (_org, id) => graph.nodes.find((value: any) => value.id === id) ?? null,
      applyAnalysis: async () => graph,
    },
    suggestions: {
      findValidForRange: async () => null,
      create: async (input: any) => ({ id: crypto.randomUUID(), ...input }),
      addFeedback: async () => undefined,
    },
    employees: { findById: async () => null },
    outbox: { add: async () => undefined },
    audit: { add: async () => undefined },
    transaction: { run: async (operation) => operation() },
  };
  return { repositories, stores: { customers, conversations, messages, graph } };
}

const resolveInput = { actor, customer: { fullName: 'Demo Customer', telegramUserId: '200001' } };

describe('conversation resolution and message ingestion', () => {
  it('creates a new conversation when none exists', async () => {
    const { repositories, stores } = makeRepositories();
    const result = await new ResolveConversation(repositories).execute(resolveInput);
    expect(result.created).toBe(true);
    expect(stores.conversations).toHaveLength(1);
  });

  it('creates a linked conversation after the previous one was closed', async () => {
    const { repositories } = makeRepositories({ closed: true });
    const result = await new ResolveConversation(repositories).execute(resolveInput);
    expect(result.conversation.previousConversationId).toBe(ids.conversation);
  });

  it('reuses the current open conversation', async () => {
    const { repositories, stores } = makeRepositories({ open: true });
    const result = await new ResolveConversation(repositories).execute(resolveInput);
    expect(result.created).toBe(false);
    expect(stores.conversations).toHaveLength(1);
  });

  it('makes Telegram message ingestion idempotent', async () => {
    const { repositories } = makeRepositories({ open: true });
    const useCase = new IngestTelegramMessage(repositories);
    const input = {
      ...resolveInput,
      telegramUserSessionId: ids.session,
      telegramMessageId: '42',
      senderType: 'CUSTOMER' as const,
      messageType: 'TEXT' as const,
      textContent: 'Need a quote',
      sentAt: new Date(),
    };
    expect((await useCase.execute(input)).duplicate).toBe(false);
    expect((await useCase.execute(input)).duplicate).toBe(true);
  });
});

describe('workflow safety', () => {
  it('rejects evidence from another conversation', async () => {
    const { repositories, stores } = makeRepositories({ open: true });
    stores.messages.push({
      id: ids.message,
      conversationId: '00000000-0000-4000-8000-000000000099',
    });
    const validator = new WorkflowValidator(repositories);
    await expect(
      validator.validate({
        actor,
        conversationId: ids.conversation,
        proposal: {
          operations: [
            {
              type: 'ADD_NODE',
              temporaryId: 'n1',
              title: 'Pricing concern',
              description: 'Customer asks about price',
              confidence: 0.9,
              evidenceMessageIds: [ids.message],
            },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(WorkflowValidationError);
  });

  it('rejects an AI update to a locked node', async () => {
    const { repositories, stores } = makeRepositories({ open: true, lockedNode: true });
    stores.messages.push({ id: ids.message, conversationId: ids.conversation });
    const validator = new WorkflowValidator(repositories);
    await expect(
      validator.validate({
        actor,
        conversationId: ids.conversation,
        proposal: {
          operations: [
            {
              type: 'UPDATE_NODE',
              nodeId: ids.node,
              title: 'Changed',
              confidence: 0.9,
              evidenceMessageIds: [ids.message],
            },
          ],
        },
      }),
    ).rejects.toThrow('Locked nodes');
  });

  it('strips attempts by AI to set a conversation outcome', () => {
    const parsed = workflowAiOutputSchema.parse({
      outcome: 'WON',
      operations: [{ type: 'NO_CHANGE', reason: 'No update' }],
    });
    expect('outcome' in parsed).toBe(false);
  });
});

describe('suggestion trigger', () => {
  it('queues a suggestion when the last meaningful message is from a customer', async () => {
    const { repositories, stores } = makeRepositories({ open: true });
    stores.messages.push({
      id: ids.message,
      conversationId: ids.conversation,
      senderType: 'CUSTOMER',
      messageType: 'TEXT',
      textContent: 'Can you send the implementation quote?',
    });
    const enqueue = vi.fn();
    expect(
      await new TriggerReplySuggestion(repositories, { enqueue }).execute({
        actor,
        conversationId: ids.conversation,
      }),
    ).toBe(true);
    expect(enqueue).toHaveBeenCalledOnce();
  });

  it('does not queue after the sale has replied', async () => {
    const { repositories, stores } = makeRepositories({ open: true });
    stores.messages.push(
      {
        id: ids.message,
        conversationId: ids.conversation,
        senderType: 'CUSTOMER',
        messageType: 'TEXT',
        textContent: 'Quote?',
      },
      {
        id: crypto.randomUUID(),
        conversationId: ids.conversation,
        senderType: 'EMPLOYEE',
        messageType: 'TEXT',
        textContent: 'I sent it.',
      },
    );
    const enqueue = vi.fn();
    expect(
      await new TriggerReplySuggestion(repositories, { enqueue }).execute({
        actor,
        conversationId: ids.conversation,
      }),
    ).toBe(false);
  });
});

describe('reports, tenant isolation and metrics', () => {
  it('uploads a daily HTML report through the object storage port', async () => {
    const upload = vi.fn().mockResolvedValue({ sizeBytes: 10, checksum: 'hash' });
    const query: any = {
      invoke: vi
        .fn()
        .mockImplementation((action: string) =>
          action === 'daily-report-data' ? { openCount: 1 } : { id: 'report' },
        ),
    };
    const storage: any = { ensureBucket: vi.fn(), upload, presignedGetUrl: vi.fn() };
    await new GenerateDailyReport(query, storage).execute({
      actor,
      reportDate: new Date('2026-07-11'),
    });
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'reports', contentType: 'text/html; charset=utf-8' }),
    );
  });

  it('does not return an MCP-query resource from another organization', async () => {
    const queryPort: any = {
      get: async (_resource: string, id: string, requestActor: ActorContext) =>
        id === ids.conversation && requestActor.organizationId === ids.organization ? { id } : null,
    };
    const service = new QueryService(queryPort);
    const otherActor = {
      ...actor,
      organizationId: '00000000-0000-4000-8000-000000000099',
      source: 'MCP' as const,
    };
    await expect(service.get('conversations', ids.conversation, otherActor)).rejects.toThrow(
      'not found',
    );
  });

  it('calculates employee conversion and median close time deterministically', () => {
    const result = calculateEmployeeMetrics({
      assignedCustomers: 5,
      activeConversations: 2,
      outcomes: ['WON', 'LOST', 'STOPPED', 'WON'],
      closedDurationsSeconds: [10, 20, 100, 30],
      firstResponseDurationsSeconds: [4, 8],
    });
    expect(result.conversionRate).toBe(0.5);
    expect(result.medianCloseSeconds).toBe(25);
    expect(result.averageFirstResponseSeconds).toBe(6);
  });
});
