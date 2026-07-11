export type UUID = string;

export type EmployeeRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALE' | 'ANALYST';
export type ConversationStatus = 'OPEN' | 'CLOSED';
export type ConversationOutcome = 'NONE' | 'WON' | 'LOST' | 'STOPPED';
export type SenderType = 'CUSTOMER' | 'EMPLOYEE' | 'SYSTEM';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE' | 'OTHER';
export type WorkflowOperationType =
  | 'ADD_NODE'
  | 'UPDATE_NODE'
  | 'ADD_EDGE'
  | 'UPDATE_EDGE'
  | 'MERGE_NODES'
  | 'NO_CHANGE';

export interface WorkflowOperation {
  type: WorkflowOperationType;
  temporaryId?: string;
  nodeId?: UUID;
  edgeId?: UUID;
  sourceNodeIds?: UUID[];
  targetNodeId?: UUID;
  fromNodeId?: string;
  toNodeId?: string;
  title?: string;
  description?: string;
  shortSummary?: string;
  label?: string;
  confidence?: number;
  evidenceMessageIds?: UUID[];
  metadata?: Record<string, unknown>;
  allowSelfEdge?: boolean;
  reason?: string;
}

export interface WorkflowAnalysisProposal {
  summaryUpdate?: { summaryText?: string };
  operations: WorkflowOperation[];
}

export interface ActorContext {
  organizationId: UUID;
  employeeId: UUID;
  userId?: UUID;
  role: EmployeeRole;
  source: 'WEB' | 'COLLECTOR' | 'WORKER' | 'MCP';
}

export interface Organization {
  id: UUID;
  name: string;
  timezone: string;
  status: string;
}

export interface Employee {
  id: UUID;
  organizationId: UUID;
  userId?: UUID | null;
  employeeCode: string;
  fullName: string;
  email: string;
  role: EmployeeRole;
  status: string;
}

export interface Customer {
  id: UUID;
  organizationId: UUID;
  ownerEmployeeId: UUID;
  fullName: string;
  telegramUserId: string;
  telegramUsername?: string | null;
  phone?: string | null;
  customerType?: string | null;
  productInterest?: string | null;
  leadScore?: number | null;
  notes?: string | null;
  firstContactAt?: Date | null;
  lastContactAt?: Date | null;
}

export interface Conversation {
  id: UUID;
  organizationId: UUID;
  customerId: UUID;
  employeeId: UUID;
  previousConversationId?: UUID | null;
  status: ConversationStatus;
  outcome: ConversationOutcome;
  startedAt: Date;
  lastCustomerMessageAt?: Date | null;
  lastSaleMessageAt?: Date | null;
  lastMessageAt?: Date | null;
  closedAt?: Date | null;
  closedByEmployeeId?: UUID | null;
  closeReason?: string | null;
}

export interface ConversationMessage {
  id: UUID;
  organizationId: UUID;
  conversationId: UUID;
  telegramUserSessionId: UUID;
  telegramMessageId: string;
  senderType: SenderType;
  senderEmployeeId?: UUID | null;
  senderCustomerId?: UUID | null;
  messageType: MessageType;
  textContent?: string | null;
  sentAt: Date;
}

export interface WorkflowNode {
  id: UUID;
  organizationId: UUID;
  workflowGraphId: UUID;
  title: string;
  description: string;
  shortSummary?: string | null;
  confidence: number;
  metadata?: Record<string, unknown> | null;
  isAiGenerated: boolean;
  isLocked: boolean;
}

export interface WorkflowEdge {
  id: UUID;
  organizationId: UUID;
  workflowGraphId: UUID;
  fromNodeId: UUID;
  toNodeId: UUID;
  label: string;
  description?: string | null;
  confidence: number;
  metadata?: Record<string, unknown> | null;
}

export interface WorkflowGraph {
  id: UUID;
  organizationId: UUID;
  conversationId: UUID;
  currentRevision: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ReplySuggestion {
  id: UUID;
  organizationId: UUID;
  conversationId: UUID;
  employeeId: UUID;
  suggestionText: string;
  shortRationale: string;
  confidence: number;
  status: string;
  workflowRevision: number;
  expiresAt?: Date | null;
}

export interface EmployeeMetricInput {
  assignedCustomers: number;
  activeConversations: number;
  closedDurationsSeconds: number[];
  outcomes: ConversationOutcome[];
  firstResponseDurationsSeconds: number[];
}

export interface EmployeeMetricResult {
  assignedCustomers: number;
  activeConversations: number;
  closedConversations: number;
  wonCount: number;
  lostCount: number;
  stoppedCount: number;
  conversionRate: number;
  averageFirstResponseSeconds: number | null;
  averageCloseSeconds: number | null;
  medianCloseSeconds: number | null;
}
