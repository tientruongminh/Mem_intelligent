import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import type {
  ActorContext,
  AuditRepository,
  Conversation,
  ConversationRepository,
  Customer,
  CustomerRepository,
  DomainRepositories,
  Employee,
  EmployeeRepository,
  MessageRepository,
  OutboxRepository,
  ReplySuggestion,
  SuggestionRepository,
  TransactionManager,
  UUID,
  WorkflowAnalysisPersistence,
  WorkflowGraph,
  WorkflowNode,
  WorkflowRepository,
} from '@tsi/domain';
import { calculateEmployeeMetrics } from '@tsi/domain';
import type { QueryPort } from '@tsi/application';

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

function deterministicUuid(value: string): string {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function experienceWorkflowBlueprint(segment?: string) {
  const enterprise = segment === 'Enterprise';
  return [
    {
      stage: 'Khám phá bối cảnh',
      customerSignal: segment
        ? `Khách ${segment} mô tả mục tiêu, quy mô và hệ thống hiện tại.`
        : 'Khách mô tả mục tiêu, quy mô và vấn đề đang gây chi phí.',
      employeeAction: enterprise
        ? 'Xác định sponsor, decision maker, IT và procurement.'
        : 'Đặt câu hỏi định lượng về lead, đội sales và tỷ lệ bỏ quên.',
      recommendedResponse: 'Nhắc lại pain point bằng ngôn ngữ của khách và xác nhận ưu tiên.',
      exitCriteria: 'Có pain point, tác động, owner và urgency.',
      commonFailure: 'Giới thiệu tính năng trước khi hiểu bối cảnh.',
    },
    {
      stage: 'Xác nhận nhu cầu',
      customerSignal: 'Khách hỏi use case, demo, tích hợp hoặc tiêu chí thành công.',
      employeeAction: enterprise
        ? 'Dùng solution map, kiến trúc tích hợp và control bảo mật.'
        : 'Gắn từng nhu cầu với một use case có giá trị cao.',
      recommendedResponse: 'Chốt 2-3 tiêu chí nghiệm thu cho demo hoặc pilot.',
      exitCriteria: 'Hai bên thống nhất phạm vi giải pháp cần đánh giá.',
      commonFailure: 'Demo chung chung, không theo dữ liệu của khách.',
    },
    {
      stage: 'Xử lý rào cản',
      customerSignal: 'Khách nêu ngân sách, bảo mật, adoption, tích hợp hoặc timeline.',
      employeeAction: 'Phân loại objection, trả lời bằng evidence và phương án giảm rủi ro.',
      recommendedResponse: enterprise
        ? 'Workshop kỹ thuật, security checklist và pilot có tiêu chí nghiệm thu.'
        : 'Pilot nhỏ tạo giá trị trong hai tuần với chi phí giới hạn.',
      exitCriteria: 'Rào cản có phương án, owner và deadline.',
      commonFailure: 'Giảm giá khi chưa hiểu nguyên nhân phản đối.',
    },
    {
      stage: 'Tiến tới quyết định',
      customerSignal: 'Khách hỏi proposal, hợp đồng, lịch hoặc quy trình phê duyệt.',
      employeeAction: 'Map stakeholder và tạo mutual action plan.',
      recommendedResponse: 'Xác nhận người tham dự, deliverable và ngày quyết định.',
      exitCriteria: 'Có next step, owner, thời gian và đầu ra cụ thể.',
      commonFailure: 'Follow-up không có thời hạn.',
    },
  ];
}

class PrismaContext {
  private readonly storage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(readonly client: PrismaClient) {}

  get db(): DatabaseClient {
    return this.storage.getStore() ?? this.client;
  }

  transaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.storage.getStore()) return operation();
    return this.client.$transaction((transaction) => this.storage.run(transaction, operation));
  }
}

const asCustomer = (value: any): Customer => value as Customer;
const asConversation = (value: any): Conversation => value as Conversation;
const asMessage = (value: any) => value as any;

class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly context: PrismaContext) {}

  async findByTelegramUser(organizationId: UUID, ownerEmployeeId: UUID, telegramUserId: string) {
    const value = await this.context.db.customer.findUnique({
      where: {
        organizationId_ownerEmployeeId_telegramUserId: {
          organizationId,
          ownerEmployeeId,
          telegramUserId,
        },
      },
    });
    return value ? asCustomer(value) : null;
  }

  async findById(organizationId: UUID, id: UUID) {
    const value = await this.context.db.customer.findFirst({ where: { id, organizationId } });
    return value ? asCustomer(value) : null;
  }

  async upsertTracked(input: Omit<Customer, 'id'>) {
    const value = await this.context.db.customer.upsert({
      where: {
        organizationId_ownerEmployeeId_telegramUserId: {
          organizationId: input.organizationId,
          ownerEmployeeId: input.ownerEmployeeId,
          telegramUserId: input.telegramUserId,
        },
      },
      update: {
        fullName: input.fullName,
        telegramUsername: input.telegramUsername,
        lastContactAt: input.lastContactAt,
      },
      create: input,
    });
    return asCustomer(value);
  }
}

class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly context: PrismaContext) {}

  async findOpen(organizationId: UUID, customerId: UUID, employeeId: UUID) {
    const value = await this.context.db.conversation.findFirst({
      where: { organizationId, customerId, employeeId, status: 'OPEN' },
      orderBy: { startedAt: 'desc' },
    });
    return value ? asConversation(value) : null;
  }

  async findLatest(organizationId: UUID, customerId: UUID, employeeId: UUID) {
    const value = await this.context.db.conversation.findFirst({
      where: { organizationId, customerId, employeeId },
      orderBy: { startedAt: 'desc' },
    });
    return value ? asConversation(value) : null;
  }

  async findById(organizationId: UUID, id: UUID) {
    const value = await this.context.db.conversation.findFirst({ where: { id, organizationId } });
    return value ? asConversation(value) : null;
  }

  async create(input: Omit<Conversation, 'id'>) {
    return asConversation(await this.context.db.conversation.create({ data: input as any }));
  }

  async touch(organizationId: UUID, id: UUID, senderType: any, sentAt: Date): Promise<void> {
    await this.context.db.conversation.updateMany({
      where: { id, organizationId },
      data: {
        lastMessageAt: sentAt,
        ...(senderType === 'CUSTOMER'
          ? { lastCustomerMessageAt: sentAt }
          : senderType === 'EMPLOYEE'
            ? { lastSaleMessageAt: sentAt }
            : {}),
      },
    });
  }

  async close(
    organizationId: UUID,
    id: UUID,
    outcome: 'WON' | 'LOST' | 'STOPPED',
    actorEmployeeId: UUID,
    reason?: string,
  ) {
    const result = await this.context.db.conversation.updateMany({
      where: { id, organizationId, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        outcome,
        closedAt: new Date(),
        closedByEmployeeId: actorEmployeeId,
        closeReason: reason,
      },
    });
    if (!result.count) throw new Error('Conversation could not be closed');
    return asConversation(await this.context.db.conversation.findUniqueOrThrow({ where: { id } }));
  }
}

class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly context: PrismaContext) {}

  async existsByTelegramId(sessionId: UUID, telegramMessageId: string) {
    return Boolean(
      await this.context.db.message.findUnique({
        where: {
          telegramUserSessionId_telegramMessageId: {
            telegramUserSessionId: sessionId,
            telegramMessageId,
          },
        },
        select: { id: true },
      }),
    );
  }

  async create(input: any) {
    return asMessage(await this.context.db.message.create({ data: input }));
  }

  async findByIds(organizationId: UUID, conversationId: UUID, ids: UUID[]) {
    return (
      await this.context.db.message.findMany({
        where: { organizationId, conversationId, id: { in: ids } },
      })
    ).map(asMessage);
  }

  async listRecent(organizationId: UUID, conversationId: UUID, limit: number) {
    const values = await this.context.db.message.findMany({
      where: { organizationId, conversationId, deletedAt: null },
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
    return values.reverse().map(asMessage);
  }
}

class PrismaWorkflowRepository implements WorkflowRepository {
  constructor(private readonly context: PrismaContext) {}

  private mapGraph(value: any): WorkflowGraph {
    return {
      ...value,
      nodes: value.nodes.map((node: any) => ({ ...node, metadata: node.metadataJson })),
      edges: value.edges.map((edge: any) => ({ ...edge, metadata: edge.metadataJson })),
    } as WorkflowGraph;
  }

  async getOrCreateGraph(organizationId: UUID, conversationId: UUID) {
    const graph = await this.context.db.workflowGraph.upsert({
      where: { conversationId },
      update: {},
      create: { organizationId, conversationId, currentRevision: 0, status: 'ACTIVE' },
      include: {
        nodes: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        edges: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (graph.organizationId !== organizationId)
      throw new Error('Organization isolation violation');
    return this.mapGraph(graph);
  }

  async findNode(organizationId: UUID, id: UUID): Promise<WorkflowNode | null> {
    const node = await this.context.db.workflowNode.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    return node ? ({ ...node, metadata: node.metadataJson } as WorkflowNode) : null;
  }

  async applyAnalysis(input: WorkflowAnalysisPersistence): Promise<WorkflowGraph> {
    const db = this.context.db;
    const run = await db.workflowAnalysisRun.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        workflowGraphId: input.graphId,
        baseRevision: input.baseRevision,
        resultRevision: input.baseRevision + 1,
        modelName: input.modelName,
        promptVersion: input.promptVersion,
        status: 'PROCESSING',
        inputSnapshotJson: input.inputSnapshot as Prisma.InputJsonValue,
        outputJson: input.output as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
    });
    const temporaryIds = new Map<string, string>();
    for (const raw of input.operations) {
      const operation = raw as any;
      let entityId = input.graphId;
      let entityType: 'NODE' | 'EDGE' | 'GRAPH' = 'GRAPH';
      let after: unknown = operation;
      if (operation.type === 'ADD_NODE') {
        const node = await db.workflowNode.create({
          data: {
            organizationId: input.organizationId,
            workflowGraphId: input.graphId,
            title: operation.title,
            description: operation.description,
            shortSummary: operation.shortSummary,
            confidence: operation.confidence,
            metadataJson: operation.metadata as Prisma.InputJsonValue,
            isAiGenerated: true,
            isLocked: false,
            createdByAnalysisRunId: run.id,
            lastUpdatedByAnalysisRunId: run.id,
          },
        });
        temporaryIds.set(operation.temporaryId, node.id);
        entityId = node.id;
        entityType = 'NODE';
        after = node;
        await this.createNodeEvidence(node.id, operation.evidenceMessageIds, input.organizationId);
      } else if (operation.type === 'UPDATE_NODE') {
        const node = await db.workflowNode.update({
          where: { id: operation.nodeId },
          data: {
            title: operation.title,
            description: operation.description,
            shortSummary: operation.shortSummary,
            confidence: operation.confidence,
            metadataJson: operation.metadata as Prisma.InputJsonValue,
            lastUpdatedByAnalysisRunId: run.id,
          },
        });
        entityId = node.id;
        entityType = 'NODE';
        after = node;
        await this.createNodeEvidence(node.id, operation.evidenceMessageIds, input.organizationId);
      } else if (operation.type === 'ADD_EDGE') {
        const fromNodeId = temporaryIds.get(operation.fromNodeId) ?? operation.fromNodeId;
        const toNodeId = temporaryIds.get(operation.toNodeId) ?? operation.toNodeId;
        const edge = await db.workflowEdge.create({
          data: {
            organizationId: input.organizationId,
            workflowGraphId: input.graphId,
            fromNodeId,
            toNodeId,
            label: operation.label,
            description: operation.description,
            confidence: operation.confidence,
            createdByAnalysisRunId: run.id,
          },
        });
        entityId = edge.id;
        entityType = 'EDGE';
        after = edge;
        await this.createEdgeEvidence(edge.id, operation.evidenceMessageIds, input.organizationId);
      } else if (operation.type === 'UPDATE_EDGE') {
        const edge = await db.workflowEdge.update({
          where: { id: operation.edgeId },
          data: {
            label: operation.label,
            description: operation.description,
            confidence: operation.confidence,
          },
        });
        entityId = edge.id;
        entityType = 'EDGE';
        after = edge;
        await this.createEdgeEvidence(edge.id, operation.evidenceMessageIds, input.organizationId);
      } else if (operation.type === 'MERGE_NODES') {
        const targetId = operation.targetNodeId ?? operation.sourceNodeIds[0];
        const node = await db.workflowNode.update({
          where: { id: targetId },
          data: {
            title: operation.title,
            description: operation.description,
            confidence: operation.confidence,
            lastUpdatedByAnalysisRunId: run.id,
          },
        });
        await db.workflowNode.updateMany({
          where: { id: { in: operation.sourceNodeIds.filter((id: string) => id !== targetId) } },
          data: { deletedAt: new Date() },
        });
        entityId = node.id;
        entityType = 'NODE';
        after = node;
        await this.createNodeEvidence(node.id, operation.evidenceMessageIds, input.organizationId);
      }
      await db.workflowChangeLog.create({
        data: {
          organizationId: input.organizationId,
          workflowAnalysisRunId: run.id,
          workflowGraphId: input.graphId,
          operationType: operation.type,
          entityType,
          entityId,
          afterJson: after as Prisma.InputJsonValue,
        },
      });
    }
    await db.workflowGraph.update({
      where: { id: input.graphId },
      data: { currentRevision: { increment: 1 } },
    });
    await db.workflowAnalysisRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return this.getOrCreateGraph(input.organizationId, input.conversationId);
  }

  private async createNodeEvidence(nodeId: string, messageIds: string[], organizationId: string) {
    for (const messageId of messageIds ?? []) {
      const message = await this.context.db.message.findUniqueOrThrow({ where: { id: messageId } });
      await this.context.db.workflowNodeEvidence.upsert({
        where: { workflowNodeId_messageId: { workflowNodeId: nodeId, messageId } },
        update: { excerpt: message.textContent ?? '[non-text message]', relevanceScore: 1 },
        create: {
          organizationId,
          workflowNodeId: nodeId,
          messageId,
          evidenceRole: 'PRIMARY',
          excerpt: message.textContent ?? '[non-text message]',
          relevanceScore: 1,
        },
      });
    }
  }

  private async createEdgeEvidence(edgeId: string, messageIds: string[], organizationId: string) {
    for (const messageId of messageIds ?? []) {
      const message = await this.context.db.message.findUniqueOrThrow({ where: { id: messageId } });
      await this.context.db.workflowEdgeEvidence.upsert({
        where: { workflowEdgeId_messageId: { workflowEdgeId: edgeId, messageId } },
        update: { excerpt: message.textContent ?? '[non-text message]', relevanceScore: 1 },
        create: {
          organizationId,
          workflowEdgeId: edgeId,
          messageId,
          excerpt: message.textContent ?? '[non-text message]',
          relevanceScore: 1,
        },
      });
    }
  }
}

class PrismaSuggestionRepository implements SuggestionRepository {
  constructor(private readonly context: PrismaContext) {}

  async findValidForRange(
    organizationId: UUID,
    conversationId: UUID,
    fromMessageId: UUID,
    toMessageId: UUID,
  ) {
    const value = await this.context.db.replySuggestion.findFirst({
      where: {
        organizationId,
        conversationId,
        basedOnFromMessageId: fromMessageId,
        basedOnToMessageId: toMessageId,
        status: { in: ['GENERATED', 'SENT', 'VIEWED'] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    return value as ReplySuggestion | null;
  }

  async create(input: Omit<ReplySuggestion, 'id'> & { basedOnMessageIds: UUID[] }) {
    const first = input.basedOnMessageIds[0];
    const last = input.basedOnMessageIds.at(-1);
    return (await this.context.db.replySuggestion.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        employeeId: input.employeeId,
        basedOnFromMessageId: first,
        basedOnToMessageId: last,
        workflowRevision: input.workflowRevision,
        suggestionText: input.suggestionText,
        shortRationale: input.shortRationale,
        confidence: input.confidence,
        status: input.status as any,
        modelName: 'openclaw-agent',
        promptVersion: 'suggestion-v1',
        generatedAt: new Date(),
        expiresAt: input.expiresAt,
      },
    })) as ReplySuggestion;
  }

  async addFeedback(input: any) {
    await this.context.db.replySuggestionFeedback.create({ data: input });
  }
}

class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly context: PrismaContext) {}
  async findById(organizationId: UUID, id: UUID) {
    return (await this.context.db.employee.findFirst({
      where: { id, organizationId },
    })) as Employee | null;
  }
}

class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly context: PrismaContext) {}
  async add(input: any) {
    await this.context.db.outboxEvent.create({
      data: {
        organizationId: input.organizationId,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payloadJson: input.payload,
        occurredAt: new Date(),
        availableAt: new Date(),
      },
    });
  }
}

class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly context: PrismaContext) {}
  async add(input: any) {
    await this.context.db.auditLog.create({
      data: {
        organizationId: input.actor.organizationId,
        actorType:
          input.actor.source === 'MCP'
            ? 'AGENT'
            : input.actor.source === 'WEB'
              ? 'EMPLOYEE'
              : 'SERVICE',
        actorId: input.actor.employeeId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadataJson: input.metadata,
      },
    });
  }
}

class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly context: PrismaContext) {}
  run<T>(operation: () => Promise<T>): Promise<T> {
    return this.context.transaction(operation);
  }
}

export function createPrismaRepositories(client: PrismaClient): DomainRepositories {
  const context = new PrismaContext(client);
  return {
    customers: new PrismaCustomerRepository(context),
    conversations: new PrismaConversationRepository(context),
    messages: new PrismaMessageRepository(context),
    workflows: new PrismaWorkflowRepository(context),
    suggestions: new PrismaSuggestionRepository(context),
    employees: new PrismaEmployeeRepository(context),
    outbox: new PrismaOutboxRepository(context),
    audit: new PrismaAuditRepository(context),
    transaction: new PrismaTransactionManager(context),
  };
}

export class PrismaQueryAdapter implements QueryPort {
  constructor(private readonly prisma: PrismaClient) {}

  listOrganizations(): Promise<Array<{ id: UUID; timezone: string }>> {
    return this.prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, timezone: true },
    });
  }

  async listCollectorSessions(): Promise<any[]> {
    const sessions = await this.prisma.telegramUserSession.findMany({
      where: { status: 'CONNECTED', encryptedSession: { not: null } },
      select: {
        id: true,
        organizationId: true,
        employeeId: true,
        phoneMasked: true,
        encryptedSession: true,
      },
    });
    return Promise.all(
      sessions.map(async (session) => ({
        ...session,
        customers: await this.prisma.customer.findMany({
          where: {
            organizationId: session.organizationId,
            ownerEmployeeId: session.employeeId,
          },
          select: { telegramUserId: true, fullName: true, telegramUsername: true },
        }),
      })),
    );
  }

  loginUserByEmail(email: string): Promise<any | null> {
    return this.prisma.user
      .findUnique({
        where: { email },
        include: { employees: { where: { status: 'ACTIVE' }, take: 1 } },
      })
      .then((user) => (user ? { ...user, employee: user.employees[0] } : null));
  }

  list(resource: string, actor: ActorContext, query: Record<string, unknown> = {}): Promise<any[]> {
    const organizationId = actor.organizationId;
    switch (resource) {
      case 'telegram-sessions':
        return this.prisma.telegramUserSession
          .findMany({
            where: {
              organizationId,
              ...(actor.role === 'SALE' ? { employeeId: actor.employeeId } : {}),
            },
            select: {
              id: true,
              employeeId: true,
              telegramUserId: true,
              phoneMasked: true,
              username: true,
              status: true,
              encryptedSession: true,
              lastSyncedAt: true,
              createdAt: true,
            },
          })
          .then((sessions) =>
            sessions.map(({ encryptedSession, ...session }) => ({
              ...session,
              hasStoredSession: Boolean(encryptedSession),
            })),
          );
      case 'customers':
        return this.prisma.customer.findMany({
          where: {
            organizationId,
            ...(actor.role === 'SALE' ? { ownerEmployeeId: actor.employeeId } : {}),
            ...(query.search
              ? { fullName: { contains: String(query.search), mode: 'insensitive' } }
              : {}),
          },
          include: {
            ownerEmployee: { select: { id: true, fullName: true } },
            conversations: { where: { status: 'OPEN' }, select: { id: true } },
          },
          orderBy: { lastContactAt: 'desc' },
        });
      case 'conversations':
        return this.prisma.conversation.findMany({
          where: {
            organizationId,
            ...(actor.role === 'SALE' ? { employeeId: actor.employeeId } : {}),
          },
          include: {
            customer: { select: { id: true, fullName: true, telegramUsername: true } },
            employee: { select: { id: true, fullName: true } },
            summaries: { orderBy: { version: 'desc' }, take: 1 },
            messages: {
              orderBy: { sentAt: 'desc' },
              take: 1,
              select: { textContent: true, sentAt: true, senderType: true },
            },
          },
          orderBy: { lastMessageAt: 'desc' },
        });
      case 'insights':
        return this.prisma.insight.findMany({
          where: {
            organizationId,
            ...(query.method ? { method: String(query.method) as any } : {}),
            ...(query.search
              ? {
                  OR: [
                    { title: { contains: String(query.search), mode: 'insensitive' } },
                    { description: { contains: String(query.search), mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
          include: { references: { take: 3, orderBy: { relevanceScore: 'desc' } } },
          orderBy: { createdAt: 'desc' },
        });
      case 'employees':
        return this.prisma.employee.findMany({
          where: { organizationId },
          include: {
            _count: { select: { customers: true, conversations: true } },
            dailyMetrics: { orderBy: { metricDate: 'desc' }, take: 1 },
            experiences: { select: { id: true, type: true, customerSegment: true } },
          },
          orderBy: { fullName: 'asc' },
        });
      case 'reports':
        return this.prisma.report.findMany({
          where: { organizationId },
          orderBy: { reportDate: 'desc' },
        });
      case 'suggestions':
        return this.prisma.replySuggestion.findMany({
          where: { organizationId, conversationId: String(query.conversationId) },
          orderBy: { generatedAt: 'desc' },
        });
      default:
        throw new Error(`Unsupported list resource: ${resource}`);
    }
  }

  async get(resource: string, id: UUID, actor: ActorContext): Promise<any | null> {
    const organizationId = actor.organizationId;
    switch (resource) {
      case 'customers':
        return this.prisma.customer.findFirst({
          where: { id, organizationId },
          include: { ownerEmployee: true },
        });
      case 'conversations':
        return this.prisma.conversation.findFirst({
          where: { id, organizationId },
          include: {
            customer: true,
            employee: true,
            previous: { include: { summaries: { orderBy: { version: 'desc' }, take: 1 } } },
            summaries: { orderBy: { version: 'desc' } },
            suggestions: { orderBy: { generatedAt: 'desc' } },
          },
        });
      case 'workflow-nodes':
        return this.prisma.workflowNode.findFirst({
          where: { id, organizationId, deletedAt: null },
          include: { evidences: { include: { message: true } } },
        });
      case 'workflow-edges':
        return this.prisma.workflowEdge.findFirst({
          where: { id, organizationId, deletedAt: null },
          include: {
            fromNode: { select: { id: true, title: true } },
            toNode: { select: { id: true, title: true } },
            evidences: { include: { message: true } },
          },
        });
      case 'insights':
        return this.getInsightDetail(organizationId, id);
      case 'employees':
        return this.prisma.employee.findFirst({
          where: { id, organizationId },
          include: {
            _count: { select: { customers: true, conversations: true } },
            dailyMetrics: { orderBy: { metricDate: 'desc' }, take: 30 },
            experiences: { orderBy: [{ type: 'asc' }, { customerSegment: 'asc' }] },
          },
        });
      case 'reports':
        return this.prisma.report.findFirst({ where: { id, organizationId } });
      case 'suggestions':
        return this.prisma.replySuggestion.findFirst({
          where: { id, organizationId },
          include: { references: true, feedback: true },
        });
      default:
        throw new Error(`Unsupported get resource: ${resource}`);
    }
  }

  async update(
    resource: string,
    id: UUID,
    actor: ActorContext,
    data: Record<string, unknown>,
  ): Promise<any> {
    const organizationId = actor.organizationId;
    if (resource === 'customers') {
      await this.assertOwned('customer', id, organizationId);
      return this.prisma.customer.update({ where: { id }, data });
    }
    if (resource === 'workflow-nodes') {
      await this.assertOwned('workflowNode', id, organizationId);
      const current = await this.prisma.workflowNode.findUniqueOrThrow({ where: { id } });
      const currentMetadata =
        current.metadataJson && typeof current.metadataJson === 'object'
          ? (current.metadataJson as Record<string, unknown>)
          : {};
      return this.prisma.workflowNode.update({
        where: { id },
        data: {
          title: data.title as string | undefined,
          description: data.description as string | undefined,
          metadataJson:
            data.position || data.metadata
              ? ({
                  ...currentMetadata,
                  ...(data.metadata as Record<string, unknown> | undefined),
                  ...(data.position ? { position: data.position } : {}),
                } as Prisma.InputJsonObject)
              : undefined,
          isAiGenerated: false,
        },
      });
    }
    if (resource === 'workflow-edges') {
      await this.assertOwned('workflowEdge', id, organizationId);
      return this.prisma.workflowEdge.update({
        where: { id },
        data: {
          label: data.label as string | undefined,
          description: data.description as string | undefined,
        },
      });
    }
    throw new Error(`Unsupported update resource: ${resource}`);
  }

  async invoke(action: string, actor: ActorContext, input: Record<string, unknown>): Promise<any> {
    const organizationId = actor.organizationId;
    const id = String(
      input.id ?? input.conversationId ?? input.customerId ?? input.employeeId ?? '',
    );
    switch (action) {
      case 'save-telegram-session':
        return this.prisma.telegramUserSession.upsert({
          where: { id: String(input.id) },
          update: {
            status: (input.status as any) ?? 'PENDING',
            phoneMasked: String(input.phoneMasked),
          },
          create: {
            id: String(input.id),
            organizationId,
            employeeId: actor.employeeId,
            phoneMasked: String(input.phoneMasked),
            status: (input.status as any) ?? 'PENDING',
          },
          select: { id: true, phoneMasked: true, status: true, createdAt: true },
        });
      case 'disconnect-telegram-session':
        return this.prisma.telegramUserSession.updateMany({
          where: {
            id,
            organizationId,
            ...(actor.role === 'SALE' ? { employeeId: actor.employeeId } : {}),
          },
          data: { status: 'DISCONNECTED', encryptedSession: null },
        });
      case 'connect-telegram-session':
        return this.prisma.telegramUserSession.updateMany({
          where: { id, organizationId, employeeId: actor.employeeId },
          data: {
            status: 'CONNECTED',
            telegramUserId: input.telegramUserId ? String(input.telegramUserId) : undefined,
            username: input.username ? String(input.username) : undefined,
            encryptedSession: String(input.encryptedSession),
            lastSyncedAt: new Date(),
          },
        });
      case 'track-openclaw-chat': {
        const telegramUserId = String(input.telegramUserId);
        const fullName = String(input.fullName);
        const telegramUsername = input.telegramUsername
          ? String(input.telegramUsername).replace(/^@/, '')
          : null;
        const botUsername = input.botUsername ? String(input.botUsername).replace(/^@/, '') : null;
        return this.prisma.customer.upsert({
          where: {
            organizationId_ownerEmployeeId_telegramUserId: {
              organizationId,
              ownerEmployeeId: actor.employeeId,
              telegramUserId,
            },
          },
          update: {
            fullName,
            telegramUsername,
            lastContactAt: new Date(),
          },
          create: {
            organizationId,
            ownerEmployeeId: actor.employeeId,
            telegramUserId,
            fullName,
            telegramUsername,
            firstContactAt: new Date(),
            lastContactAt: new Date(),
            notes: botUsername
              ? `Theo dõi từ private chat của OpenClaw bot @${botUsername}.`
              : 'Theo dõi từ private chat của OpenClaw Telegram bot.',
            profileJson: {
              source: 'OPENCLAW_TELEGRAM',
              openclawAccountId: String(input.openclawAccountId),
              botUsername,
              verifiedPrivateChat: true,
            },
          },
          include: {
            ownerEmployee: { select: { id: true, fullName: true } },
            conversations: { where: { status: 'OPEN' }, select: { id: true } },
          },
        });
      }
      case 'sync-telegram-message-change':
        return this.prisma.message.updateMany({
          where: {
            organizationId,
            telegramUserSessionId: String(input.sessionId),
            telegramMessageId: String(input.telegramMessageId),
          },
          data:
            input.eventType === 'DELETED'
              ? { deletedAt: new Date() }
              : {
                  textContent: input.textContent ? String(input.textContent) : null,
                  editedAt: new Date(),
                },
        });
      case 'customer-conversations':
        return this.prisma.conversation.findMany({
          where: { organizationId, customerId: id },
          orderBy: { startedAt: 'desc' },
        });
      case 'conversation-messages':
        return this.prisma.message.findMany({
          where: { organizationId, conversationId: id },
          orderBy: { sentAt: 'asc' },
        });
      case 'conversation-summary':
        return this.prisma.conversationSummary.findFirst({
          where: { organizationId, conversationId: id },
          orderBy: { version: 'desc' },
        });
      case 'conversation-workflow':
        return this.prisma.workflowGraph.findFirst({
          where: { organizationId, conversationId: id },
          include: {
            nodes: {
              where: { deletedAt: null },
              include: { evidences: true },
              orderBy: { createdAt: 'asc' },
            },
            edges: { where: { deletedAt: null }, include: { evidences: true } },
          },
        });
      case 'conversation-timeline': {
        const [messages, runs] = await Promise.all([
          this.prisma.message.findMany({
            where: { organizationId, conversationId: id },
            orderBy: { sentAt: 'asc' },
          }),
          this.prisma.workflowAnalysisRun.findMany({
            where: { organizationId, conversationId: id },
            orderBy: { createdAt: 'asc' },
          }),
        ]);
        return [
          ...messages.map((item) => ({ type: 'MESSAGE', at: item.sentAt, data: item })),
          ...runs.map((item) => ({ type: 'ANALYSIS', at: item.createdAt, data: item })),
        ].sort((a, b) => +a.at - +b.at);
      }
      case 'node-evidence':
        return this.prisma.workflowNodeEvidence.findMany({
          where: { organizationId, workflowNodeId: id },
          include: { message: true },
        });
      case 'edge-evidence':
        return this.prisma.workflowEdgeEvidence.findMany({
          where: { organizationId, workflowEdgeId: id },
          include: { message: true },
        });
      case 'lock-node':
      case 'unlock-node':
        await this.assertOwned('workflowNode', id, organizationId);
        return this.prisma.workflowNode.update({
          where: { id },
          data: { isLocked: action === 'lock-node' },
        });
      case 'employee-metrics':
        return this.prisma.employeeDailyMetric.findMany({
          where: { organizationId, employeeId: id },
          orderBy: { metricDate: 'desc' },
        });
      case 'employee-experiences':
        return this.prisma.employeeExperience.findMany({
          where: {
            organizationId,
            employeeId: id,
            ...(input.type ? { type: String(input.type) as any } : {}),
          },
          orderBy: [{ type: 'asc' }, { confidenceScore: 'desc' }],
        });
      case 'save-suggestion': {
        const graph = await this.prisma.workflowGraph.findFirst({
          where: { organizationId, conversationId: String(input.conversationId) },
        });
        return this.prisma.replySuggestion.create({
          data: {
            organizationId,
            conversationId: String(input.conversationId),
            employeeId: actor.employeeId,
            basedOnFromMessageId: (input.basedOnMessageIds as string[])[0],
            basedOnToMessageId: (input.basedOnMessageIds as string[]).at(-1),
            workflowRevision: graph?.currentRevision ?? 0,
            suggestionText: String(input.suggestionText),
            shortRationale: String(input.shortRationale),
            confidence: Number(input.confidence),
            modelName: String(input.modelName ?? 'openclaw-agent'),
            promptVersion: 'suggestion-v1',
            metadataJson: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
            generatedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60_000),
          },
        });
      }
      case 'suggestion-feedback':
        return this.prisma.replySuggestionFeedback.create({
          data: {
            organizationId,
            replySuggestionId: id,
            employeeId: actor.employeeId,
            feedbackType: input.feedbackType as any,
            feedbackNote: input.feedbackNote as string | undefined,
          },
        });
      case 'request-alternative':
        return this.prisma.outboxEvent.create({
          data: {
            organizationId,
            aggregateType: 'ReplySuggestion',
            aggregateId: id,
            eventType: 'REPLY_SUGGESTION_REQUESTED',
            payloadJson: { suggestionId: id, alternative: true },
            occurredAt: new Date(),
            availableAt: new Date(),
          },
        });
      case 'calendar-draft': {
        if (input.confirmedByEmployee !== true) {
          throw new Error('Employee confirmation is required before creating a calendar draft');
        }
        const suggestion = await this.prisma.replySuggestion.findFirst({
          where: { id, organizationId, employeeId: actor.employeeId },
          include: { conversation: { include: { customer: true } } },
        });
        if (!suggestion) throw new Error('Reply suggestion not found');
        const metadata = suggestion.metadataJson as {
          appointment?: {
            detected?: boolean;
            title?: string;
            startAt?: string;
            durationMinutes?: number;
          };
        } | null;
        const appointment = metadata?.appointment;
        if (!appointment?.detected || !appointment.startAt) {
          throw new Error('No confirmed appointment was detected in this suggestion');
        }
        const start = new Date(appointment.startAt);
        if (Number.isNaN(+start)) throw new Error('Appointment start time is invalid');
        const end = new Date(+start + (appointment.durationMinutes ?? 30) * 60_000);
        const calendarDate = (value: Date) =>
          value
            .toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}Z$/, 'Z');
        const params = new URLSearchParams({
          action: 'TEMPLATE',
          text: appointment.title ?? `Tư vấn với ${suggestion.conversation.customer.fullName}`,
          dates: `${calendarDate(start)}/${calendarDate(end)}`,
          details: `Cuộc hẹn từ transaction ${suggestion.conversationId}. Vui lòng kiểm tra trước khi lưu.`,
        });
        return {
          provider: 'GOOGLE_CALENDAR',
          status: 'DRAFT_REQUIRES_FINAL_SAVE',
          url: `https://calendar.google.com/calendar/render?${params.toString()}`,
          appointment: { ...appointment, startAt: start, endAt: end },
        };
      }
      case 'reply-suggestion-context': {
        const conversationId = String(input.conversationId);
        const [conversation, messages, workflow, experiences, insights] = await Promise.all([
          this.prisma.conversation.findFirst({
            where: { id: conversationId, organizationId },
            include: {
              customer: true,
              summaries: { orderBy: { version: 'desc' }, take: 1 },
              previous: { include: { summaries: { orderBy: { version: 'desc' }, take: 1 } } },
            },
          }),
          this.prisma.message.findMany({
            where: { conversationId, organizationId, deletedAt: null },
            orderBy: { sentAt: 'desc' },
            take: 30,
          }),
          this.prisma.workflowGraph.findFirst({
            where: { conversationId, organizationId },
            include: {
              nodes: { where: { deletedAt: null } },
              edges: { where: { deletedAt: null } },
            },
          }),
          this.prisma.employeeExperience.findMany({
            where: { organizationId, employeeId: actor.employeeId },
            orderBy: { confidenceScore: 'desc' },
            take: 8,
          }),
          this.prisma.insight.findMany({
            where: { organizationId, status: 'PUBLISHED' },
            orderBy: [{ confidenceScore: 'desc' }, { publishedAt: 'desc' }],
            take: 8,
          }),
        ]);
        if (!conversation) throw new Error('Conversation not found in actor organization');
        return {
          conversation,
          recentMessages: messages.reverse(),
          workflow,
          employeeExperiences: experiences,
          relevantInsights: insights,
        };
      }
      case 'compare-conversations': {
        const conversationIds = Array.isArray(input.conversationIds)
          ? input.conversationIds.map(String).slice(0, 10)
          : [];
        return this.prisma.conversation.findMany({
          where: {
            organizationId,
            ...(conversationIds.length ? { id: { in: conversationIds } } : {}),
          },
          take: 10,
          include: {
            customer: { select: { fullName: true } },
            summaries: { orderBy: { version: 'desc' }, take: 1 },
            workflowGraph: { include: { nodes: { where: { deletedAt: null } } } },
          },
          orderBy: { startedAt: 'desc' },
        });
      }
      case 'log-mcp-call':
        return this.prisma.mcpToolCallLog.create({
          data: {
            organizationId,
            employeeId: actor.employeeId,
            agentType: input.agentType as any,
            toolName: String(input.toolName),
            requestId: String(input.requestId),
            status: input.status as any,
            durationMs: Number(input.durationMs),
            errorCode: input.errorCode ? String(input.errorCode) : undefined,
          },
        });
      case 'daily-report-data': {
        const start = new Date(String(input.reportDate));
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        const [
          organization,
          grouped,
          customerCount,
          messageCount,
          totalMessageCount,
          employees,
          topInsights,
          attentionConversations,
          segmentGroups,
        ] = await Promise.all([
          this.prisma.organization.findUniqueOrThrow({
            where: { id: organizationId },
            select: { name: true, timezone: true },
          }),
          this.prisma.conversation.groupBy({
            by: ['status', 'outcome'],
            where: { organizationId, createdAt: { lt: end } },
            _count: true,
          }),
          this.prisma.customer.count({ where: { organizationId } }),
          this.prisma.message.count({
            where: { organizationId, sentAt: { gte: start, lt: end }, deletedAt: null },
          }),
          this.prisma.message.count({ where: { organizationId, deletedAt: null } }),
          this.prisma.employee.findMany({
            where: { organizationId, role: 'SALE', status: 'ACTIVE' },
            select: {
              id: true,
              fullName: true,
              customers: { select: { id: true } },
              conversations: { select: { status: true, outcome: true } },
              dailyMetrics: { orderBy: { metricDate: 'desc' }, take: 1 },
            },
            orderBy: { fullName: 'asc' },
          }),
          this.prisma.insight.findMany({
            where: { organizationId, status: 'PUBLISHED' },
            select: {
              method: true,
              title: true,
              explanationText: true,
              sampleSize: true,
              confidenceScore: true,
              severity: true,
            },
            orderBy: [{ severity: 'desc' }, { confidenceScore: 'desc' }],
            take: 10,
          }),
          this.prisma.conversation.findMany({
            where: { organizationId, status: 'OPEN' },
            select: {
              id: true,
              lastMessageAt: true,
              customer: {
                select: { fullName: true, customerType: true, leadScore: true },
              },
              employee: { select: { fullName: true } },
              messages: {
                orderBy: { sentAt: 'desc' },
                take: 1,
                select: { senderType: true, textContent: true },
              },
            },
            orderBy: [{ customer: { leadScore: 'desc' } }, { lastMessageAt: 'asc' }],
            take: 12,
          }),
          this.prisma.customer.groupBy({
            by: ['customerType'],
            where: { organizationId },
            _count: true,
            _avg: { leadScore: true },
          }),
        ]);
        const count = (status: string, outcome?: string) =>
          grouped
            .filter((g) => g.status === status && (!outcome || g.outcome === outcome))
            .reduce((sum, g) => sum + g._count, 0);
        const wonCount = count('CLOSED', 'WON');
        const lostCount = count('CLOSED', 'LOST');
        const stoppedCount = count('CLOSED', 'STOPPED');
        const closedCount = wonCount + lostCount + stoppedCount;
        const employeePerformance = employees
          .map((employee) => {
            const closed = employee.conversations.filter(
              (conversation) => conversation.status === 'CLOSED',
            );
            const won = closed.filter((conversation) => conversation.outcome === 'WON').length;
            return {
              id: employee.id,
              fullName: employee.fullName,
              assignedCustomers: employee.customers.length,
              openConversations: employee.conversations.filter(
                (conversation) => conversation.status === 'OPEN',
              ).length,
              closedConversations: closed.length,
              wonCount: won,
              conversionRate: closed.length ? won / closed.length : 0,
              averageCloseSeconds: employee.dailyMetrics[0]?.averageCloseSeconds ?? null,
            };
          })
          .sort((left, right) => right.conversionRate - left.conversionRate);
        const conversionRate = closedCount ? wonCount / closedCount : 0;
        return {
          organizationName: organization.name,
          timezone: organization.timezone,
          periodStart: start,
          periodEnd: end,
          customerCount,
          periodMessageCount: messageCount,
          messageCount: totalMessageCount,
          totalMessageCount,
          openCount: count('OPEN'),
          wonCount,
          lostCount,
          stoppedCount,
          closedCount,
          conversionRate,
          employeePerformance,
          topInsights,
          attentionConversations,
          segmentBreakdown: segmentGroups.map((group) => ({
            segment: group.customerType ?? 'Chưa phân loại',
            customers: group._count,
            averageLeadScore: group._avg.leadScore ?? 0,
          })),
          executiveSummary: `${customerCount} khách hàng đang được quản lý, ${count('OPEN')} transaction đang tư vấn và ${wonCount} deal đã chốt thành công. Tỷ lệ chốt trên các transaction đã đóng là ${(conversionRate * 100).toFixed(1)}%. Có ${attentionConversations.filter((conversation) => conversation.messages[0]?.senderType === 'CUSTOMER').length} transaction mở đang chờ sale phản hồi.`,
        };
      }
      case 'save-report':
        return this.prisma.report.create({
          data: {
            id: String(input.id),
            organizationId,
            reportType: 'TEAM_DAILY',
            reportDate: new Date(String(input.reportDate)),
            title: String(input.title),
            format: input.format as any,
            bucketName: 'reports',
            objectKey: String(input.objectKey),
            contentType: String(input.contentType),
            sizeBytes: Number(input.sizeBytes),
            checksum: String(input.checksum),
            status: 'UPLOADED',
            generatedAt: new Date(),
            uploadedAt: new Date(),
          },
        });
      case 'dashboard': {
        const [customers, open, won, insights] = await Promise.all([
          this.prisma.customer.count({ where: { organizationId } }),
          this.prisma.conversation.count({ where: { organizationId, status: 'OPEN' } }),
          this.prisma.conversation.count({ where: { organizationId, outcome: 'WON' } }),
          this.prisma.insight.count({ where: { organizationId, status: 'PUBLISHED' } }),
        ]);
        return { customers, openConversations: open, wonDeals: won, publishedInsights: insights };
      }
      case 'generate-conversation-summary': {
        const conversationId = String(input.conversationId);
        const messages = await this.prisma.message.findMany({
          where: { organizationId, conversationId, messageType: 'TEXT', deletedAt: null },
          orderBy: { sentAt: 'asc' },
        });
        const current = await this.prisma.conversationSummary.aggregate({
          where: { organizationId, conversationId },
          _max: { version: true },
        });
        const customerTexts = messages
          .filter((message) => message.senderType === 'CUSTOMER')
          .map((message) => message.textContent)
          .filter(Boolean);
        const summary = await this.prisma.conversationSummary.create({
          data: {
            organizationId,
            conversationId,
            version: (current._max.version ?? 0) + 1,
            summaryText: customerTexts.length
              ? `Khách hàng đã trao đổi ${customerTexts.length} nội dung. Gần nhất: ${customerTexts.at(-1)}`
              : 'Chưa có đủ nội dung text để tóm tắt.',
            customerNeedsJson: customerTexts.slice(-3),
            modelName: 'deterministic-summary-v1',
            promptVersion: 'summary-v1',
          },
        });
        await this.prisma.conversation.updateMany({
          where: { id: conversationId, organizationId },
          data: { currentSummaryId: summary.id },
        });
        return summary;
      }
      case 'calculate-daily-insight-candidates': {
        const generatedAt = new Date(String(input.generatedAt ?? new Date().toISOString()));
        const start = new Date(generatedAt);
        start.setUTCDate(start.getUTCDate() - 30);
        const conversations = await this.prisma.conversation.findMany({
          where: { organizationId, startedAt: { gte: start, lte: generatedAt } },
          include: {
            customer: true,
            workflowGraph: { include: { nodes: { where: { deletedAt: null } } } },
          },
        });
        if (!conversations.length) return [];
        const closed = conversations.filter(
          (conversation) => conversation.status === 'CLOSED' && conversation.closedAt,
        );
        const durations = closed.map(
          (conversation) => (+conversation.closedAt! - +conversation.startedAt) / 1000,
        );
        const average = (values: number[]) =>
          values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
        const durationMean = average(durations);
        const durationDeviation = Math.sqrt(
          average(durations.map((duration) => (duration - durationMean) ** 2)),
        );
        const anomalyConversation = [...closed].sort(
          (left, right) =>
            +right.closedAt! - +right.startedAt - (+left.closedAt! - +left.startedAt),
        )[0];
        const anomalyValue = anomalyConversation
          ? ((+anomalyConversation.closedAt! - +anomalyConversation.startedAt) / 1000 -
              durationMean) /
            (durationDeviation || 1)
          : 0;

        const segmentGroups = new Map<string, typeof conversations>();
        for (const conversation of conversations) {
          const segment = conversation.customer.customerType ?? 'UNKNOWN';
          segmentGroups.set(segment, [...(segmentGroups.get(segment) ?? []), conversation]);
        }
        const topSegment = [...segmentGroups.entries()].sort(
          (left, right) => right[1].length - left[1].length,
        )[0]!;
        const topSegmentWon = topSegment[1].filter(
          (conversation) => conversation.outcome === 'WON',
        ).length;

        const highLead = conversations.filter(
          (conversation) => (conversation.customer.leadScore ?? 0) >= 70,
        );
        const highLeadWon = highLead.filter(
          (conversation) => conversation.outcome === 'WON',
        ).length;
        const propensity = highLead.length ? highLeadWon / highLead.length : 0;

        const productGroups = new Map<string, typeof conversations>();
        for (const conversation of conversations) {
          const product = conversation.customer.productInterest ?? 'UNKNOWN';
          productGroups.set(product, [...(productGroups.get(product) ?? []), conversation]);
        }
        const topProduct = [...productGroups.entries()].sort(
          (left, right) => right[1].length - left[1].length,
        )[0]!;
        const productWithFollowUp = topProduct[1].filter((conversation) =>
          conversation.workflowGraph?.nodes.some((node) =>
            /follow|bước tiếp|hẹn|demo/iu.test(`${node.title} ${node.description}`),
          ),
        ).length;
        const support = productWithFollowUp / conversations.length;
        const productRate = topProduct[1].length / conversations.length;
        const followUpRate =
          conversations.filter((conversation) =>
            conversation.workflowGraph?.nodes.some((node) =>
              /follow|bước tiếp|hẹn|demo/iu.test(`${node.title} ${node.description}`),
            ),
          ).length / conversations.length;
        const lift = productRate && followUpRate ? support / (productRate * followUpRate) : 0;
        const day = generatedAt.toISOString().slice(0, 10);
        const candidate = (
          method: string,
          data: Record<string, unknown>,
        ): Record<string, unknown> => ({
          candidateId: deterministicUuid(`${organizationId}:${day}:${method}`),
          method,
          timeWindowStart: start.toISOString(),
          timeWindowEnd: generatedAt.toISOString(),
          sampleSize: conversations.length,
          ...data,
        });
        const nodeReference = (conversation: (typeof conversations)[number] | undefined) =>
          conversation?.workflowGraph?.nodes[0]
            ? {
                referenceType: 'WORKFLOW_NODE',
                referenceId: conversation.workflowGraph.nodes[0].id,
                label: conversation.workflowGraph.nodes[0].title,
                excerpt: conversation.workflowGraph.nodes[0].description,
                relevanceScore: 0.86,
              }
            : null;
        return [
          candidate('ANOMALY_DETECTION', {
            type: 'CLOSE_TIME_ANOMALY',
            metricName: 'close_time_zscore',
            metricValue: anomalyValue,
            baselineValue: 0,
            severity: Math.abs(anomalyValue) >= 2 ? 'HIGH' : 'INFO',
            fallbackTitle: 'Phát hiện transaction có thời gian chốt bất thường',
            fallbackDescription: `Z-score thời gian chốt lớn nhất là ${anomalyValue.toFixed(2)} trên ${closed.length} transaction đã đóng.`,
            analysis: {
              algorithm: 'Z-score trên thời gian đóng transaction',
              features: ['started_at', 'closed_at'],
              meanSeconds: durationMean,
              standardDeviationSeconds: durationDeviation,
            },
            references: anomalyConversation
              ? [
                  {
                    referenceType: 'CONVERSATION',
                    referenceId: anomalyConversation.id,
                    label: `Transaction của ${anomalyConversation.customer.fullName}`,
                    excerpt: 'Transaction có thời gian đóng lệch xa baseline.',
                    relevanceScore: 0.95,
                  },
                  nodeReference(anomalyConversation),
                ].filter(Boolean)
              : [],
          }),
          candidate('CLUSTERING', {
            type: 'CUSTOMER_CLUSTER',
            metricName: 'dominant_cluster_share',
            metricValue: topSegment[1].length / conversations.length,
            baselineValue: 1 / Math.max(1, segmentGroups.size),
            severity: 'INFO',
            fallbackTitle: `Cụm ${topSegment[0]} đang chiếm tỷ trọng lớn nhất`,
            fallbackDescription: `${topSegment[1].length}/${conversations.length} transaction thuộc nhóm ${topSegment[0]}, trong đó ${topSegmentWon} WON.`,
            analysis: {
              algorithm: 'Deterministic mixed-feature clustering baseline',
              features: ['customer_type', 'product_interest', 'lead_score', 'workflow_titles'],
              clusters: [...segmentGroups.entries()].map(([name, items]) => ({
                name,
                size: items.length,
                won: items.filter((item) => item.outcome === 'WON').length,
              })),
            },
            references: topSegment[1].slice(0, 5).map((conversation) => ({
              referenceType: 'CUSTOMER',
              referenceId: conversation.customerId,
              label: `${conversation.customer.fullName} · ${topSegment[0]}`,
              excerpt: conversation.customer.productInterest,
              relevanceScore: 0.82,
            })),
          }),
          candidate('CLASSIFICATION', {
            type: 'WON_PROPENSITY',
            metricName: 'high_lead_won_rate',
            metricValue: propensity,
            baselineValue: closed.length
              ? closed.filter((conversation) => conversation.outcome === 'WON').length /
                closed.length
              : 0,
            severity: propensity < 0.35 ? 'MEDIUM' : 'INFO',
            fallbackTitle: 'Phân loại khả năng chốt của nhóm lead score cao',
            fallbackDescription: `${highLeadWon}/${highLead.length} khách có lead score từ 70 đã chuyển thành WON.`,
            analysis: {
              algorithm: 'Interpretable rule classifier',
              features: ['lead_score>=70', 'appointment_detected', 'next_step_confirmed'],
              predictedClass: propensity >= 0.55 ? 'HIGH_PROPENSITY' : 'NEEDS_REVIEW',
            },
            references: highLead.slice(0, 5).map((conversation) => ({
              referenceType: 'CONVERSATION',
              referenceId: conversation.id,
              label: `${conversation.customer.fullName} · score ${conversation.customer.leadScore}`,
              excerpt: `Outcome ${conversation.outcome}`,
              relevanceScore: 0.88,
            })),
          }),
          candidate('ASSOCIATION_RULE', {
            type: 'PRODUCT_FOLLOWUP_RULE',
            metricName: 'lift',
            metricValue: lift,
            baselineValue: 1,
            severity: 'INFO',
            fallbackTitle: `${topProduct[0]} thường đi cùng tín hiệu follow-up/demo`,
            fallbackDescription: `Luật kết hợp có support ${support.toFixed(2)} và lift ${lift.toFixed(2)} trên ${conversations.length} transaction.`,
            analysis: {
              algorithm: 'Apriori support-confidence-lift',
              antecedent: topProduct[0],
              consequent: 'follow_up_or_demo',
              support,
              confidence: topProduct[1].length ? productWithFollowUp / topProduct[1].length : 0,
              lift,
            },
            references: topProduct[1].slice(0, 5).map((conversation) => ({
              referenceType: 'CONVERSATION',
              referenceId: conversation.id,
              label: `${conversation.customer.fullName} · ${topProduct[0]}`,
              excerpt: 'Workflow chứa bước demo hoặc follow-up.',
              relevanceScore: 0.84,
            })),
          }),
        ];
      }
      case 'save-daily-insight-candidates': {
        const candidates = (input.candidates as Array<any>) ?? [];
        return this.prisma.$transaction(async (transaction) => {
          const saved = [];
          for (const candidate of candidates) {
            const references = (candidate.references as Array<any>) ?? [];
            const explanationText =
              candidate.explanationText ??
              (candidate.method === 'ANOMALY_DETECTION'
                ? `Hệ thống thiết lập mức biến động thông thường từ ${candidate.sampleSize} transaction rồi tìm trường hợp lệch xa nhất. Giá trị ${Number(candidate.metricValue).toFixed(2)} được đánh dấu để quản lý kiểm tra nguyên nhân, không được xem là kết luận tự động.`
                : candidate.method === 'CLUSTERING'
                  ? `Hệ thống nhóm các customer có phân khúc, sản phẩm, lead score và workflow tương tự. Nhóm nổi bật được mô tả từ dữ liệu thực tế để đội sales dùng một playbook phù hợp hơn.`
                  : candidate.method === 'CLASSIFICATION'
                    ? `Hệ thống đối chiếu tín hiệu workflow và outcome lịch sử để ước lượng mức ưu tiên. Kết quả ${Number(candidate.metricValue).toFixed(2)} hỗ trợ sale sắp xếp công việc nhưng không thay thế quyết định chốt deal.`
                    : `Hệ thống đếm tần suất hai tín hiệu xuất hiện cùng nhau và so với xác suất độc lập. Lift ${Number(candidate.metricValue).toFixed(2)} cho biết mối liên hệ mạnh hơn hay yếu hơn ngẫu nhiên.`);
            const insight = await transaction.insight.upsert({
              where: { id: candidate.candidateId },
              update: {
                title: candidate.title,
                description: candidate.description,
                explanationText,
                metricValue: candidate.metricValue,
                baselineValue: candidate.baselineValue,
                sampleSize: candidate.sampleSize,
                confidenceScore: Math.min(0.98, Math.max(0.4, candidate.sampleSize / 60)),
                severity: candidate.severity,
                analysisJson: {
                  ...candidate.analysis,
                  modelName: input.modelName,
                  metricSource: 'application-code',
                },
                evidenceJson: { references },
                referenceCount: references.length,
                publishedAt: new Date(candidate.timeWindowEnd),
              },
              create: {
                id: candidate.candidateId,
                organizationId,
                method: candidate.method,
                type: candidate.type,
                title: candidate.title,
                description: candidate.description,
                explanationText,
                metricName: candidate.metricName,
                metricValue: candidate.metricValue,
                baselineValue: candidate.baselineValue,
                sampleSize: candidate.sampleSize,
                confidenceScore: Math.min(0.98, Math.max(0.4, candidate.sampleSize / 60)),
                severity: candidate.severity,
                analysisJson: {
                  ...candidate.analysis,
                  modelName: input.modelName,
                  metricSource: 'application-code',
                },
                evidenceJson: { references },
                referenceCount: references.length,
                timeWindowStart: new Date(candidate.timeWindowStart),
                timeWindowEnd: new Date(candidate.timeWindowEnd),
                status: 'PUBLISHED',
                publishedAt: new Date(candidate.timeWindowEnd),
              },
            });
            await transaction.insightReference.deleteMany({
              where: { insightId: insight.id, organizationId },
            });
            if (references.length) {
              await transaction.insightReference.createMany({
                data: references.map((reference) => ({
                  organizationId,
                  insightId: insight.id,
                  referenceType: reference.referenceType,
                  referenceId: reference.referenceId,
                  label: reference.label,
                  excerpt: reference.excerpt,
                  relevanceScore: reference.relevanceScore,
                })),
              });
            }
            saved.push(insight);
          }
          return saved;
        });
      }
      case 'generate-daily-insights': {
        const conversations = await this.prisma.conversation.findMany({
          where: { organizationId, status: 'CLOSED' },
          select: { outcome: true, startedAt: true, closedAt: true },
        });
        const won = conversations.filter((item) => item.outcome === 'WON').length;
        const stopped = conversations.filter((item) => item.outcome === 'STOPPED').length;
        const sampleSize = conversations.length;
        const now = new Date();
        const start = new Date(now);
        start.setUTCDate(start.getUTCDate() - 30);
        const values = [
          {
            type: 'CONVERSION_RATE',
            title: 'Tỷ lệ hội thoại thành công',
            description: `${won}/${sampleSize || 0} conversation đã đóng có kết quả WON.`,
            metricName: 'won_rate',
            metricValue: sampleSize ? won / sampleSize : 0,
          },
          {
            type: 'STOPPED_RATE',
            title: 'Tỷ lệ khách dừng trao đổi',
            description: `${stopped}/${sampleSize || 0} conversation đã đóng có kết quả STOPPED.`,
            metricName: 'stopped_rate',
            metricValue: sampleSize ? stopped / sampleSize : 0,
          },
        ];
        return Promise.all(
          values.map((value) =>
            this.prisma.insight.create({
              data: {
                organizationId,
                ...value,
                sampleSize,
                confidenceScore: sampleSize ? Math.min(1, sampleSize / 20) : 0,
                timeWindowStart: start,
                timeWindowEnd: now,
                evidenceJson: { source: 'conversation_outcomes' },
                status: 'PUBLISHED',
                publishedAt: now,
              },
            }),
          ),
        );
      }
      case 'generate-daily-metrics': {
        const employees = await this.prisma.employee.findMany({
          where: { organizationId, role: 'SALE', status: 'ACTIVE' },
        });
        const metricDate = new Date(
          String(input.metricDate ?? new Date().toISOString().slice(0, 10)),
        );
        return Promise.all(
          employees.map(async (employee) => {
            const [assignedCustomers, conversations] = await Promise.all([
              this.prisma.customer.count({
                where: { organizationId, ownerEmployeeId: employee.id },
              }),
              this.prisma.conversation.findMany({
                where: { organizationId, employeeId: employee.id },
              }),
            ]);
            const closed = conversations.filter((item) => item.status === 'CLOSED');
            const metric = calculateEmployeeMetrics({
              assignedCustomers,
              activeConversations: conversations.filter((item) => item.status === 'OPEN').length,
              outcomes: closed.map((item) => item.outcome),
              closedDurationsSeconds: closed
                .filter((item) => item.closedAt)
                .map((item) => (+item.closedAt! - +item.startedAt) / 1000),
              firstResponseDurationsSeconds: [],
            });
            return this.prisma.employeeDailyMetric.upsert({
              where: {
                organizationId_employeeId_metricDate: {
                  organizationId,
                  employeeId: employee.id,
                  metricDate,
                },
              },
              update: metric,
              create: { organizationId, employeeId: employee.id, metricDate, ...metric },
            });
          }),
        );
      }
      case 'generate-employee-experiences': {
        const employees = await this.prisma.employee.findMany({
          where: { organizationId, role: 'SALE', status: 'ACTIVE' },
          include: {
            conversations: {
              include: {
                customer: true,
                workflowGraph: { include: { nodes: { where: { deletedAt: null } } } },
              },
            },
          },
        });
        const generatedAt = new Date(String(input.generatedAt ?? new Date().toISOString()));
        const saved = [];
        for (const employee of employees) {
          const titleFrequency = new Map<string, number>();
          for (const conversation of employee.conversations) {
            for (const node of conversation.workflowGraph?.nodes ?? []) {
              const normalized = node.title.toLowerCase().trim();
              titleFrequency.set(normalized, (titleFrequency.get(normalized) ?? 0) + 1);
            }
          }
          const topPatterns = [...titleFrequency.entries()]
            .sort((left, right) => right[1] - left[1])
            .slice(0, 5);
          const won = employee.conversations.filter(
            (conversation) => conversation.outcome === 'WON',
          );
          const overallId = deterministicUuid(
            `${organizationId}:${employee.id}:experience:overall`,
          );
          saved.push(
            await this.prisma.employeeExperience.upsert({
              where: { id: overallId },
              update: {
                summary: `${employee.fullName} thường tạo tiến triển khi xác nhận pain point trước khi đề xuất demo/pilot. ${won.length}/${employee.conversations.length} transaction trong mẫu có outcome WON.`,
                playbookJson: {
                  topWorkflowPatterns: topPatterns,
                  recommendedFlow: topPatterns.map(([title]) => title),
                  wonCount: won.length,
                  workflowBlueprint: experienceWorkflowBlueprint(),
                  observedMetrics: {
                    sampleSize: employee.conversations.length,
                    wonRate: employee.conversations.length
                      ? won.length / employee.conversations.length
                      : 0,
                    strongestStage: topPatterns[0]?.[0] ?? 'Chưa đủ dữ liệu',
                  },
                },
                evidenceJson: {
                  conversationIds: won.slice(0, 8).map((conversation) => conversation.id),
                  workflowNodeIds: won
                    .flatMap((conversation) => conversation.workflowGraph?.nodes ?? [])
                    .slice(0, 12)
                    .map((node) => node.id),
                },
                confidenceScore: Math.min(0.95, employee.conversations.length / 12),
                sampleSize: employee.conversations.length,
                generatedAt,
              },
              create: {
                id: overallId,
                organizationId,
                employeeId: employee.id,
                type: 'OVERALL',
                title: `Kinh nghiệm tổng thể của ${employee.fullName}`,
                summary: `${employee.fullName} thường tạo tiến triển khi xác nhận pain point trước khi đề xuất demo/pilot. ${won.length}/${employee.conversations.length} transaction trong mẫu có outcome WON.`,
                playbookJson: {
                  topWorkflowPatterns: topPatterns,
                  recommendedFlow: topPatterns.map(([title]) => title),
                  wonCount: won.length,
                  workflowBlueprint: experienceWorkflowBlueprint(),
                  observedMetrics: {
                    sampleSize: employee.conversations.length,
                    wonRate: employee.conversations.length
                      ? won.length / employee.conversations.length
                      : 0,
                    strongestStage: topPatterns[0]?.[0] ?? 'Chưa đủ dữ liệu',
                  },
                },
                evidenceJson: {
                  conversationIds: won.slice(0, 8).map((conversation) => conversation.id),
                },
                confidenceScore: Math.min(0.95, employee.conversations.length / 12),
                sampleSize: employee.conversations.length,
                generatedAt,
              },
            }),
          );
          const segmentGroups = new Map<string, typeof employee.conversations>();
          for (const conversation of employee.conversations) {
            const segment = conversation.customer.customerType ?? 'UNKNOWN';
            segmentGroups.set(segment, [...(segmentGroups.get(segment) ?? []), conversation]);
          }
          for (const [segment, conversations] of segmentGroups) {
            const segmentWon = conversations.filter(
              (conversation) => conversation.outcome === 'WON',
            );
            const segmentId = deterministicUuid(
              `${organizationId}:${employee.id}:experience:${segment}`,
            );
            const segmentSummary =
              segment === 'Enterprise'
                ? 'Ưu tiên bảo mật, tích hợp, stakeholder và tiêu chí nghiệm thu pilot.'
                : segment === 'SME'
                  ? 'Tập trung hiệu quả nhanh, chi phí theo quy mô và onboarding ngắn.'
                  : segment === 'Startup'
                    ? 'Dẫn dắt bằng thử nghiệm nhỏ, tốc độ và khả năng mở rộng.'
                    : 'Giải thích ngắn, minh bạch chi phí và đưa ra lựa chọn đơn giản.';
            saved.push(
              await this.prisma.employeeExperience.upsert({
                where: { id: segmentId },
                update: {
                  summary: segmentSummary,
                  playbookJson: {
                    openingQuestion: `Mục tiêu quan trọng nhất của nhóm ${segment} là gì?`,
                    nextBestAction:
                      segment === 'Enterprise'
                        ? 'Workshop kỹ thuật có stakeholder'
                        : 'Demo theo dữ liệu mẫu',
                    wonRate: conversations.length ? segmentWon.length / conversations.length : 0,
                    workflowBlueprint: experienceWorkflowBlueprint(segment),
                    observedMetrics: {
                      sampleSize: conversations.length,
                      wonRate: conversations.length ? segmentWon.length / conversations.length : 0,
                      workflowNodeCount: conversations.reduce(
                        (total, conversation) =>
                          total + (conversation.workflowGraph?.nodes.length ?? 0),
                        0,
                      ),
                    },
                  },
                  evidenceJson: {
                    conversationIds: conversations
                      .slice(0, 8)
                      .map((conversation) => conversation.id),
                    workflowNodeIds: conversations
                      .flatMap((conversation) => conversation.workflowGraph?.nodes ?? [])
                      .slice(0, 12)
                      .map((node) => node.id),
                  },
                  confidenceScore: Math.min(0.92, conversations.length / 8),
                  sampleSize: conversations.length,
                  generatedAt,
                },
                create: {
                  id: segmentId,
                  organizationId,
                  employeeId: employee.id,
                  type: 'CUSTOMER_SEGMENT',
                  customerSegment: segment,
                  title: `Kinh nghiệm với nhóm ${segment}`,
                  summary: segmentSummary,
                  playbookJson: {
                    openingQuestion: `Mục tiêu quan trọng nhất của nhóm ${segment} là gì?`,
                    nextBestAction:
                      segment === 'Enterprise'
                        ? 'Workshop kỹ thuật có stakeholder'
                        : 'Demo theo dữ liệu mẫu',
                    wonRate: conversations.length ? segmentWon.length / conversations.length : 0,
                    workflowBlueprint: experienceWorkflowBlueprint(segment),
                    observedMetrics: {
                      sampleSize: conversations.length,
                      wonRate: conversations.length ? segmentWon.length / conversations.length : 0,
                      workflowNodeCount: conversations.reduce(
                        (total, conversation) =>
                          total + (conversation.workflowGraph?.nodes.length ?? 0),
                        0,
                      ),
                    },
                  },
                  evidenceJson: {
                    conversationIds: conversations
                      .slice(0, 8)
                      .map((conversation) => conversation.id),
                  },
                  confidenceScore: Math.min(0.92, conversations.length / 8),
                  sampleSize: conversations.length,
                  generatedAt,
                },
              }),
            );
          }
        }
        return saved;
      }
      case 'conversations-needing-analysis': {
        const since = new Date(
          String(input.since ?? new Date(Date.now() - 5 * 60_000).toISOString()),
        );
        const conversations = await this.prisma.conversation.findMany({
          where: {
            organizationId,
            status: 'OPEN',
            lastMessageAt: { gte: since },
          },
          select: {
            id: true,
            employeeId: true,
            lastMessageAt: true,
            workflowGraph: {
              select: {
                analysisRuns: {
                  where: { status: 'COMPLETED' },
                  orderBy: { completedAt: 'desc' },
                  take: 1,
                  select: { completedAt: true },
                },
              },
            },
          },
        });
        return conversations.filter((conversation) => {
          const analyzedAt = conversation.workflowGraph?.analysisRuns[0]?.completedAt;
          return (
            !analyzedAt || !conversation.lastMessageAt || analyzedAt < conversation.lastMessageAt
          );
        });
      }
      case 'claim-outbox':
        return this.prisma.$transaction(async (tx) => {
          const events = await tx.outboxEvent.findMany({
            where: { status: 'PENDING', availableAt: { lte: new Date() } },
            orderBy: { occurredAt: 'asc' },
            take: 50,
          });
          return events.filter((event) => event.organizationId === organizationId);
        });
      case 'mark-outbox-published':
        return this.prisma.outboxEvent.updateMany({
          where: { id: { in: (input.ids as string[]) ?? [] }, organizationId },
          data: { status: 'PUBLISHED', publishedAt: new Date() },
        });
      default:
        throw new Error(`Unsupported query action: ${action}`);
    }
  }

  private async getInsightDetail(organizationId: string, insightId: string) {
    const insight = await this.prisma.insight.findFirst({
      where: { id: insightId, organizationId },
      include: { references: { orderBy: { relevanceScore: 'desc' } } },
    });
    if (!insight) return null;
    const references = await Promise.all(
      insight.references.map(async (reference) => {
        let target: unknown = null;
        if (reference.referenceType === 'CONVERSATION') {
          target = await this.prisma.conversation.findFirst({
            where: { id: reference.referenceId, organizationId },
            include: {
              customer: { select: { id: true, fullName: true, customerType: true } },
              employee: { select: { id: true, fullName: true } },
              summaries: { orderBy: { version: 'desc' }, take: 1 },
            },
          });
        } else if (reference.referenceType === 'CUSTOMER') {
          target = await this.prisma.customer.findFirst({
            where: { id: reference.referenceId, organizationId },
            include: { ownerEmployee: { select: { id: true, fullName: true } } },
          });
        } else if (reference.referenceType === 'WORKFLOW_NODE') {
          target = await this.prisma.workflowNode.findFirst({
            where: { id: reference.referenceId, organizationId, deletedAt: null },
            include: {
              graph: { select: { conversationId: true, currentRevision: true } },
              evidences: { include: { message: true }, take: 5 },
            },
          });
        } else if (reference.referenceType === 'MESSAGE') {
          target = await this.prisma.message.findFirst({
            where: { id: reference.referenceId, organizationId },
          });
        } else if (reference.referenceType === 'EMPLOYEE') {
          target = await this.prisma.employee.findFirst({
            where: { id: reference.referenceId, organizationId },
            include: { dailyMetrics: { orderBy: { metricDate: 'desc' }, take: 1 } },
          });
        }
        return { ...reference, target };
      }),
    );
    return { ...insight, references };
  }

  private async assertOwned(
    model: 'customer' | 'workflowNode' | 'workflowEdge',
    id: string,
    organizationId: string,
  ) {
    const value =
      model === 'customer'
        ? await this.prisma.customer.findFirst({
            where: { id, organizationId },
            select: { id: true },
          })
        : model === 'workflowNode'
          ? await this.prisma.workflowNode.findFirst({
              where: { id, organizationId },
              select: { id: true },
            })
          : await this.prisma.workflowEdge.findFirst({
              where: { id, organizationId },
              select: { id: true },
            });
    if (!value) throw new Error('Resource not found in actor organization');
  }
}

export const prisma = new PrismaClient();
