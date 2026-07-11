import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const closeConversationSchema = z.object({
  outcome: z.enum(['WON', 'LOST', 'STOPPED']),
  reason: z.string().max(1000).optional(),
});

export const ingestTelegramMessageSchema = z.object({
  organizationId: uuidSchema,
  employeeId: uuidSchema,
  telegramUserSessionId: uuidSchema,
  telegramUserId: z.string().min(1),
  telegramUsername: z.string().nullish(),
  customerName: z.string().min(1),
  telegramMessageId: z.string().min(1),
  senderType: z.enum(['CUSTOMER', 'EMPLOYEE']),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE', 'VOICE', 'OTHER']).default('TEXT'),
  textContent: z.string().nullish(),
  sentAt: z.coerce.date(),
  rawPayload: z.record(z.unknown()).optional(),
  eventType: z.enum(['NEW', 'EDITED', 'DELETED']).default('NEW'),
});

export const addNodeOperationSchema = z.object({
  type: z.literal('ADD_NODE'),
  temporaryId: z.string().min(1),
  title: z.string().min(2).max(160),
  description: z.string().min(2).max(2000),
  shortSummary: z.string().max(300).optional(),
  confidence: z.number().min(0).max(1),
  evidenceMessageIds: z.array(uuidSchema).min(1),
  metadata: z.record(z.unknown()).optional(),
});

export const updateNodeOperationSchema = z.object({
  type: z.literal('UPDATE_NODE'),
  nodeId: uuidSchema,
  title: z.string().min(2).max(160).optional(),
  description: z.string().min(2).max(2000).optional(),
  shortSummary: z.string().max(300).optional(),
  confidence: z.number().min(0).max(1),
  evidenceMessageIds: z.array(uuidSchema).min(1),
  metadata: z.record(z.unknown()).optional(),
});

export const addEdgeOperationSchema = z.object({
  type: z.literal('ADD_EDGE'),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  label: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  confidence: z.number().min(0).max(1),
  evidenceMessageIds: z.array(uuidSchema).min(1),
  allowSelfEdge: z.boolean().optional(),
});

export const updateEdgeOperationSchema = z.object({
  type: z.literal('UPDATE_EDGE'),
  edgeId: uuidSchema,
  label: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional(),
  confidence: z.number().min(0).max(1),
  evidenceMessageIds: z.array(uuidSchema).min(1),
});

export const mergeNodesOperationSchema = z.object({
  type: z.literal('MERGE_NODES'),
  sourceNodeIds: z.array(uuidSchema).min(2),
  targetNodeId: uuidSchema.optional(),
  title: z.string().min(2).max(160),
  description: z.string().min(2).max(2000),
  confidence: z.number().min(0).max(1),
  evidenceMessageIds: z.array(uuidSchema).min(1),
});

export const noChangeOperationSchema = z.object({
  type: z.literal('NO_CHANGE'),
  reason: z.string().max(500),
});

export const workflowOperationSchema = z.discriminatedUnion('type', [
  addNodeOperationSchema,
  updateNodeOperationSchema,
  addEdgeOperationSchema,
  updateEdgeOperationSchema,
  mergeNodesOperationSchema,
  noChangeOperationSchema,
]);

export const workflowAiOutputSchema = z.object({
  summaryUpdate: z.object({ summaryText: z.string().max(5000).optional() }).optional(),
  operations: z.array(workflowOperationSchema).min(1),
});

export const suggestionFeedbackSchema = z.object({
  feedbackType: z.enum([
    'USED',
    'PARTIALLY_USED',
    'NOT_RELEVANT',
    'TOO_LONG',
    'TOO_FORMAL',
    'TOO_AGGRESSIVE',
    'REQUEST_ALTERNATIVE',
  ]),
  feedbackNote: z.string().max(1000).optional(),
});

export const saveSuggestionSchema = z.object({
  conversationId: uuidSchema,
  suggestionText: z.string().min(2).max(4000),
  shortRationale: z.string().min(2).max(1000),
  confidence: z.number().min(0).max(1),
  basedOnMessageIds: z.array(uuidSchema).min(1),
});

export const suggestionAiOutputSchema = z.object({
  suggestionText: z.string().min(2).max(4000),
  shortRationale: z.string().min(2).max(1000),
  confidence: z.number().min(0).max(1),
  appointment: z
    .object({
      detected: z.boolean(),
      title: z.string().max(300).optional(),
      startAt: z.string().datetime({ offset: true }).optional(),
      durationMinutes: z.number().int().min(15).max(480).optional(),
      askEmployeeConfirmation: z.boolean().default(true),
    })
    .optional(),
});

export const insightNarrativeOutputSchema = z.object({
  narratives: z.array(
    z.object({
      candidateId: z.string().uuid(),
      title: z.string().min(5).max(220),
      description: z.string().min(10).max(1200),
    }),
  ),
});

export type SuggestionAiOutput = z.infer<typeof suggestionAiOutputSchema>;
export type InsightNarrativeOutput = z.infer<typeof insightNarrativeOutputSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

export type WorkflowAiOutput = z.infer<typeof workflowAiOutputSchema>;
export type WorkflowOperation = z.infer<typeof workflowOperationSchema>;
export type IngestTelegramMessageInput = z.infer<typeof ingestTelegramMessageSchema>;
