import type {
  ActorContext,
  Conversation,
  ConversationMessage,
  Customer,
  Employee,
  ReplySuggestion,
  SenderType,
  UUID,
  WorkflowGraph,
  WorkflowNode,
} from './types.js';

export interface CustomerRepository {
  findByTelegramUser(
    organizationId: UUID,
    ownerEmployeeId: UUID,
    telegramUserId: string,
  ): Promise<Customer | null>;
  findById(organizationId: UUID, id: UUID): Promise<Customer | null>;
  upsertTracked(input: Omit<Customer, 'id'>): Promise<Customer>;
}

export interface ConversationRepository {
  findOpen(organizationId: UUID, customerId: UUID, employeeId: UUID): Promise<Conversation | null>;
  findLatest(
    organizationId: UUID,
    customerId: UUID,
    employeeId: UUID,
  ): Promise<Conversation | null>;
  findById(organizationId: UUID, id: UUID): Promise<Conversation | null>;
  create(input: Omit<Conversation, 'id'>): Promise<Conversation>;
  touch(organizationId: UUID, id: UUID, senderType: SenderType, sentAt: Date): Promise<void>;
  close(
    organizationId: UUID,
    id: UUID,
    outcome: 'WON' | 'LOST' | 'STOPPED',
    actorEmployeeId: UUID,
    reason?: string,
  ): Promise<Conversation>;
}

export interface MessageRepository {
  existsByTelegramId(sessionId: UUID, telegramMessageId: string): Promise<boolean>;
  create(input: Omit<ConversationMessage, 'id'>): Promise<ConversationMessage>;
  findByIds(
    organizationId: UUID,
    conversationId: UUID,
    ids: UUID[],
  ): Promise<ConversationMessage[]>;
  listRecent(
    organizationId: UUID,
    conversationId: UUID,
    limit: number,
  ): Promise<ConversationMessage[]>;
}

export interface WorkflowRepository {
  getOrCreateGraph(organizationId: UUID, conversationId: UUID): Promise<WorkflowGraph>;
  findNode(organizationId: UUID, id: UUID): Promise<WorkflowNode | null>;
  applyAnalysis(input: WorkflowAnalysisPersistence): Promise<WorkflowGraph>;
}

export interface SuggestionRepository {
  findValidForRange(
    organizationId: UUID,
    conversationId: UUID,
    fromMessageId: UUID,
    toMessageId: UUID,
  ): Promise<ReplySuggestion | null>;
  create(
    input: Omit<ReplySuggestion, 'id'> & { basedOnMessageIds: UUID[] },
  ): Promise<ReplySuggestion>;
  addFeedback(input: {
    organizationId: UUID;
    suggestionId: UUID;
    employeeId: UUID;
    feedbackType: string;
    feedbackNote?: string;
  }): Promise<void>;
}

export interface EmployeeRepository {
  findById(organizationId: UUID, id: UUID): Promise<Employee | null>;
}

export interface OutboxRepository {
  add(input: {
    organizationId: UUID;
    aggregateType: string;
    aggregateId: UUID;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export interface AuditRepository {
  add(input: {
    actor: ActorContext;
    action: string;
    resourceType: string;
    resourceId?: UUID;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface TransactionManager {
  run<T>(operation: () => Promise<T>): Promise<T>;
}

export interface WorkflowAnalysisPersistence {
  organizationId: UUID;
  conversationId: UUID;
  graphId: UUID;
  baseRevision: number;
  modelName: string;
  promptVersion: string;
  inputSnapshot: Record<string, unknown>;
  output: Record<string, unknown>;
  operations: Array<Record<string, unknown>>;
}

export interface DomainRepositories {
  customers: CustomerRepository;
  conversations: ConversationRepository;
  messages: MessageRepository;
  workflows: WorkflowRepository;
  suggestions: SuggestionRepository;
  employees: EmployeeRepository;
  outbox: OutboxRepository;
  audit: AuditRepository;
  transaction: TransactionManager;
}
