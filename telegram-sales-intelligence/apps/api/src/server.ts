import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { z, ZodError } from 'zod';
import {
  AuthenticateUser,
  CloseConversation,
  IngestTelegramMessage,
  QueryService,
} from '@tsi/application';
import {
  closeConversationSchema,
  ingestTelegramMessageSchema,
  loginSchema,
  saveSuggestionSchema,
  suggestionFeedbackSchema,
} from '@tsi/contracts';
import { DomainError, type ActorContext } from '@tsi/domain';
import {
  BcryptPasswordHasher,
  BullMqQueueAdapter,
  HttpTelegramCollectorAdapter,
  JwtTokenService,
  MinioObjectStorageAdapter,
  PrismaQueryAdapter,
  createPrismaRepositories,
  prisma,
} from '@tsi/infrastructure';
import { loadEnv, logger } from '@tsi/shared';
import { readOpenClawTelegramDirectory } from './openclaw-directory.js';
import { openApiDocument } from './openapi.js';

declare global {
  // Express request augmentation uses its published namespace contract.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      actor?: ActorContext;
    }
  }
}

const env = loadEnv();
const repositories = createPrismaRepositories(prisma);
const queryPort = new PrismaQueryAdapter(prisma);
const query = new QueryService(queryPort);
const tokens = new JwtTokenService(env.JWT_SECRET);
const auth = new AuthenticateUser(queryPort, new BcryptPasswordHasher(), tokens);
const closeConversation = new CloseConversation(repositories);
const ingestMessage = new IngestTelegramMessage(repositories);
const queues = new BullMqQueueAdapter(env.REDIS_URL, env.WORKFLOW_MAX_DELAY_SECONDS * 1000);
const storage = new MinioObjectStorageAdapter(env);
const telegram = new HttpTelegramCollectorAdapter(
  env.TELEGRAM_COLLECTOR_URL,
  env.INTERNAL_SERVICE_TOKEN,
);

const app: express.Express = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

const asyncRoute =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(handler(req, res, next)).catch(next);

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token)
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
    const payload = await tokens.verify(token);
    req.actor = {
      organizationId: String(payload.organizationId),
      employeeId: String(payload.employeeId),
      userId: String(payload.sub),
      role: payload.role as ActorContext['role'],
      source: 'WEB',
    };
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}

function requireInternal(req: Request, res: Response, next: NextFunction) {
  if (req.headers['x-internal-service-token'] !== env.INTERNAL_SERVICE_TOKEN) {
    return res
      .status(401)
      .json({ error: { code: 'UNAUTHORIZED_SERVICE', message: 'Invalid service token' } });
  }
  next();
}

function actor(req: Request): ActorContext {
  if (!req.actor) throw new DomainError('Missing actor context', 'UNAUTHORIZED', 401);
  return req.actor;
}

app.get(
  '/health',
  asyncRoute(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() });
  }),
);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get('/openapi.json', (_req, res) => res.json(openApiDocument));

const api = express.Router();
api.post(
  '/auth/login',
  asyncRoute(async (req, res) => {
    const input = loginSchema.parse(req.body);
    res.json(await auth.execute(input.email, input.password));
  }),
);
api.get(
  '/auth/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json(await query.get('employees', actor(req).employeeId, actor(req)));
  }),
);

api.use(requireAuth);

api.post(
  '/telegram/sessions',
  asyncRoute(async (req, res) => {
    const phone = z.object({ phone: z.string().min(7).max(24) }).parse(req.body).phone;
    const result = (await telegram.createSession({ actor: actor(req), phone })) as any;
    await query.invoke('save-telegram-session', actor(req), result as Record<string, unknown>);
    res.status(201).json(result);
  }),
);
api.post(
  '/telegram/sessions/:id/send-code',
  asyncRoute(async (req, res) => {
    res.json(await telegram.sendCode({ actor: actor(req), sessionId: String(req.params.id) }));
  }),
);
api.post(
  '/telegram/sessions/:id/verify-code',
  asyncRoute(async (req, res) => {
    const { code } = z.object({ code: z.string().min(3).max(12) }).parse(req.body);
    const result = await telegram.verifyCode({
      actor: actor(req),
      sessionId: String(req.params.id),
      code,
    });
    res.json(result);
  }),
);
api.post(
  '/telegram/sessions/:id/verify-password',
  asyncRoute(async (req, res) => {
    const { password } = z.object({ password: z.string().min(1).max(200) }).parse(req.body);
    res.json(
      await telegram.verifyPassword({
        actor: actor(req),
        sessionId: String(req.params.id),
        password,
      }),
    );
  }),
);
api.get(
  '/telegram/sessions',
  asyncRoute(async (req, res) => res.json(await query.list('telegram-sessions', actor(req)))),
);
api.get(
  '/telegram/openclaw/accounts',
  asyncRoute(async (_req, res) => {
    const directory = await readOpenClawTelegramDirectory(env.OPENCLAW_DIRECTORY_PATH);
    res.json(
      directory.accounts.map(({ chats, ...account }) => ({
        ...account,
        chatCount: chats.length,
        directoryGeneratedAt: directory.generatedAt,
      })),
    );
  }),
);
api.get(
  '/telegram/openclaw/accounts/:accountId/chats',
  asyncRoute(async (req, res) => {
    const directory = await readOpenClawTelegramDirectory(env.OPENCLAW_DIRECTORY_PATH);
    const account = directory.accounts.find(
      (item) => item.accountId === String(req.params.accountId),
    );
    if (!account) {
      throw new DomainError('OpenClaw Telegram account not found', 'NOT_FOUND', 404);
    }
    res.json(account.chats);
  }),
);
api.post(
  '/telegram/openclaw/accounts/:accountId/chats/:telegramUserId/track',
  asyncRoute(async (req, res) => {
    const directory = await readOpenClawTelegramDirectory(env.OPENCLAW_DIRECTORY_PATH);
    const account = directory.accounts.find(
      (item) => item.accountId === String(req.params.accountId),
    );
    const chat = account?.chats.find(
      (item) => item.telegramUserId === String(req.params.telegramUserId),
    );
    if (!account || !chat) {
      throw new DomainError('Verified OpenClaw private chat not found', 'NOT_FOUND', 404);
    }
    const result = await query.invoke('track-openclaw-chat', actor(req), {
      telegramUserId: chat.telegramUserId,
      fullName: chat.name,
      telegramUsername: chat.username,
      openclawAccountId: account.accountId,
      botUsername: account.botUsername,
    });
    res.status(201).json(result);
  }),
);
api.delete(
  '/telegram/sessions/:id',
  asyncRoute(async (req, res) => {
    await telegram.disconnect({ actor: actor(req), sessionId: String(req.params.id) });
    await query.invoke('disconnect-telegram-session', actor(req), { id: String(req.params.id) });
    res.status(204).end();
  }),
);
api.get(
  '/telegram/sessions/:id/chats',
  asyncRoute(async (req, res) =>
    res.json(await telegram.listChats({ actor: actor(req), sessionId: String(req.params.id) })),
  ),
);
api.post(
  '/telegram/sessions/:id/chats/:telegramUserId/track',
  asyncRoute(async (req, res) => {
    const result = await telegram.trackChat({
      actor: actor(req),
      sessionId: String(req.params.id),
      telegramUserId: String(req.params.telegramUserId),
    });
    res.status(201).json(result);
  }),
);

api.get(
  '/dashboard',
  asyncRoute(async (req, res) => res.json(await query.invoke('dashboard', actor(req), {}))),
);
api.get(
  '/customers',
  asyncRoute(async (req, res) =>
    res.json(await query.list('customers', actor(req), req.query as any)),
  ),
);
api.get(
  '/customers/:id',
  asyncRoute(async (req, res) =>
    res.json(await query.get('customers', String(req.params.id), actor(req))),
  ),
);
api.patch(
  '/customers/:id',
  asyncRoute(async (req, res) =>
    res.json(await query.update('customers', String(req.params.id), actor(req), req.body)),
  ),
);
api.get(
  '/customers/:id/conversations',
  asyncRoute(async (req, res) =>
    res.json(
      await query.invoke('customer-conversations', actor(req), {
        customerId: String(req.params.id),
      }),
    ),
  ),
);

api.get(
  '/conversations',
  asyncRoute(async (req, res) =>
    res.json(await query.list('conversations', actor(req), req.query as any)),
  ),
);
api.get(
  '/conversations/:id',
  asyncRoute(async (req, res) => {
    const value = await query.get('conversations', String(req.params.id), actor(req));
    await repositories.audit.add({
      actor: actor(req),
      action: 'VIEW_CONVERSATION',
      resourceType: 'Conversation',
      resourceId: String(req.params.id),
    });
    res.json(value);
  }),
);
api.post(
  '/conversations/:id/close',
  asyncRoute(async (req, res) => {
    const input = closeConversationSchema.parse(req.body);
    res.json(
      await closeConversation.execute({
        actor: actor(req),
        conversationId: String(req.params.id),
        ...input,
      }),
    );
  }),
);
api.get(
  '/conversations/:id/messages',
  asyncRoute(async (req, res) =>
    res.json(
      await query.invoke('conversation-messages', actor(req), {
        conversationId: String(req.params.id),
      }),
    ),
  ),
);
api.get(
  '/conversations/:id/summary',
  asyncRoute(async (req, res) =>
    res.json(
      await query.invoke('conversation-summary', actor(req), {
        conversationId: String(req.params.id),
      }),
    ),
  ),
);
api.get(
  '/conversations/:id/workflow',
  asyncRoute(async (req, res) =>
    res.json(
      await query.invoke('conversation-workflow', actor(req), {
        conversationId: String(req.params.id),
      }),
    ),
  ),
);
api.get(
  '/conversations/:id/timeline',
  asyncRoute(async (req, res) =>
    res.json(
      await query.invoke('conversation-timeline', actor(req), {
        conversationId: String(req.params.id),
      }),
    ),
  ),
);

api.get(
  '/workflow/nodes/:id',
  asyncRoute(async (req, res) =>
    res.json(await query.get('workflow-nodes', String(req.params.id), actor(req))),
  ),
);
api.get(
  '/workflow/nodes/:id/evidence',
  asyncRoute(async (req, res) =>
    res.json(await query.invoke('node-evidence', actor(req), { id: String(req.params.id) })),
  ),
);
api.patch(
  '/workflow/nodes/:id',
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        title: z.string().min(2).max(160).optional(),
        description: z.string().min(2).max(2000).optional(),
        position: z.object({ x: z.number(), y: z.number() }).optional(),
      })
      .parse(req.body);
    const value = await query.update('workflow-nodes', String(req.params.id), actor(req), data);
    await repositories.audit.add({
      actor: actor(req),
      action: 'EDIT_WORKFLOW_NODE',
      resourceType: 'WorkflowNode',
      resourceId: String(req.params.id),
    });
    res.json(value);
  }),
);

api.get(
  '/workflow/edges/:id',
  asyncRoute(async (req, res) =>
    res.json(await query.get('workflow-edges', String(req.params.id), actor(req))),
  ),
);
api.get(
  '/workflow/edges/:id/evidence',
  asyncRoute(async (req, res) =>
    res.json(await query.invoke('edge-evidence', actor(req), { id: String(req.params.id) })),
  ),
);
api.patch(
  '/workflow/edges/:id',
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        label: z.string().min(1).max(160).optional(),
        description: z.string().max(1000).optional(),
      })
      .parse(req.body);
    const value = await query.update('workflow-edges', String(req.params.id), actor(req), data);
    await repositories.audit.add({
      actor: actor(req),
      action: 'EDIT_WORKFLOW_EDGE',
      resourceType: 'WorkflowEdge',
      resourceId: String(req.params.id),
    });
    res.json(value);
  }),
);
api.post(
  '/workflow/nodes/:id/lock',
  asyncRoute(async (req, res) =>
    res.json(await query.invoke('lock-node', actor(req), { id: String(req.params.id) })),
  ),
);
api.post(
  '/workflow/nodes/:id/unlock',
  asyncRoute(async (req, res) =>
    res.json(await query.invoke('unlock-node', actor(req), { id: String(req.params.id) })),
  ),
);

api.get(
  '/conversations/:id/suggestions',
  asyncRoute(async (req, res) =>
    res.json(
      await query.list('suggestions', actor(req), { conversationId: String(req.params.id) }),
    ),
  ),
);
api.get(
  '/suggestions/:id',
  asyncRoute(async (req, res) =>
    res.json(await query.get('suggestions', String(req.params.id), actor(req))),
  ),
);
api.post(
  '/suggestions/:id/feedback',
  asyncRoute(async (req, res) => {
    const input = suggestionFeedbackSchema.parse(req.body);
    res.status(201).json(
      await query.invoke('suggestion-feedback', actor(req), {
        id: String(req.params.id),
        ...input,
      }),
    );
  }),
);
api.post(
  '/suggestions/:id/alternative',
  asyncRoute(async (req, res) =>
    res
      .status(202)
      .json(await query.invoke('request-alternative', actor(req), { id: String(req.params.id) })),
  ),
);
api.post(
  '/suggestions/:id/calendar-draft',
  asyncRoute(async (req, res) => {
    const input = z.object({ confirmedByEmployee: z.literal(true) }).parse(req.body);
    const result = await query.invoke('calendar-draft', actor(req), {
      id: String(req.params.id),
      ...input,
    });
    await repositories.audit.add({
      actor: actor(req),
      action: 'CREATE_CALENDAR_DRAFT',
      resourceType: 'ReplySuggestion',
      resourceId: String(req.params.id),
      metadata: { provider: 'GOOGLE_CALENDAR', humanConfirmed: true },
    });
    res.json(result);
  }),
);

api.get(
  '/insights',
  asyncRoute(async (req, res) =>
    res.json(
      await query.list('insights', actor(req), {
        method: req.query.method,
        search: req.query.search,
      }),
    ),
  ),
);
api.get(
  '/insights/:id',
  asyncRoute(async (req, res) =>
    res.json(await query.get('insights', String(req.params.id), actor(req))),
  ),
);
api.get(
  '/employees',
  asyncRoute(async (req, res) => res.json(await query.list('employees', actor(req)))),
);
api.get(
  '/employees/:id',
  asyncRoute(async (req, res) =>
    res.json(await query.get('employees', String(req.params.id), actor(req))),
  ),
);
api.get(
  '/employees/:id/metrics',
  asyncRoute(async (req, res) =>
    res.json(
      await query.invoke('employee-metrics', actor(req), { employeeId: String(req.params.id) }),
    ),
  ),
);
api.get(
  '/employees/:id/experiences',
  asyncRoute(async (req, res) =>
    res.json(
      await query.invoke('employee-experiences', actor(req), {
        employeeId: String(req.params.id),
        type: req.query.type,
      }),
    ),
  ),
);
api.get(
  '/reports',
  asyncRoute(async (req, res) => res.json(await query.list('reports', actor(req)))),
);
api.post(
  '/reports/generate',
  asyncRoute(async (req, res) => {
    const input = z
      .object({ reportDate: z.string().datetime({ offset: true }).optional() })
      .parse(req.body ?? {});
    const requestActor = actor(req);
    await queues.enqueue('daily-report', 'manual', {
      organizationId: requestActor.organizationId,
      employeeId: requestActor.employeeId,
      role: requestActor.role,
      reportDate: input.reportDate ?? new Date().toISOString(),
    });
    res.status(202).json({ status: 'QUEUED', formats: ['HTML', 'LATEX'] });
  }),
);
api.get(
  '/reports/:id',
  asyncRoute(async (req, res) =>
    res.json(await query.get('reports', String(req.params.id), actor(req))),
  ),
);
api.post(
  '/reports/:id/download-url',
  asyncRoute(async (req, res) => {
    const report = await query.get('reports', String(req.params.id), actor(req));
    const url = await storage.presignedGetUrl(report.bucketName, report.objectKey, 900);
    await repositories.audit.add({
      actor: actor(req),
      action: 'DOWNLOAD_REPORT',
      resourceType: 'Report',
      resourceId: report.id,
    });
    res.json({ url, expiresInSeconds: 900 });
  }),
);
app.use('/api/v1', api);

const internal = express.Router();
internal.use(requireInternal);
internal.get(
  '/telegram/sessions/connected',
  asyncRoute(async (_req, res) => res.json(await query.listCollectorSessions())),
);
internal.post(
  '/telegram/messages',
  asyncRoute(async (req, res) => {
    const input = ingestTelegramMessageSchema.parse(req.body);
    const collectorActor: ActorContext = {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      role: 'SALE',
      source: 'COLLECTOR',
    };
    if (input.eventType === 'EDITED' || input.eventType === 'DELETED') {
      const result = await query.invoke('sync-telegram-message-change', collectorActor, {
        sessionId: input.telegramUserSessionId,
        telegramMessageId: input.telegramMessageId,
        eventType: input.eventType,
        textContent: input.textContent,
        sentAt: input.sentAt.toISOString(),
      });
      return res.json(result);
    }
    const result = await ingestMessage.execute({
      actor: collectorActor,
      customer: {
        fullName: input.customerName,
        telegramUserId: input.telegramUserId,
        telegramUsername: input.telegramUsername,
      },
      telegramUserSessionId: input.telegramUserSessionId,
      telegramMessageId: input.telegramMessageId,
      senderType: input.senderType,
      messageType: input.messageType,
      textContent: input.textContent,
      sentAt: input.sentAt,
    });
    if (result.message) {
      await queues.enqueue(
        'workflow-analysis',
        'analyze',
        {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          conversationId: result.message.conversationId,
        },
        {
          delayMs: env.WORKFLOW_DEBOUNCE_SECONDS * 1000,
          jobId: `workflow-${result.message.conversationId}`,
        },
      );
    }
    res.status(result.duplicate ? 200 : 201).json(result);
  }),
);
internal.post(
  '/telegram/sessions/:id/connected',
  asyncRoute(async (req, res) => {
    const input = z
      .object({
        actor: z.object({ organizationId: z.string().uuid(), employeeId: z.string().uuid() }),
        encryptedSession: z.string().min(10),
        telegramUserId: z.string().optional(),
        username: z.string().optional(),
      })
      .parse(req.body);
    const collectorActor: ActorContext = { ...input.actor, role: 'SALE', source: 'COLLECTOR' };
    const result = await query.invoke('connect-telegram-session', collectorActor, {
      id: String(req.params.id),
      ...input,
    });
    res.json(result);
  }),
);

const mcpToolSchema = z.object({
  actor: z.object({
    organizationId: z.string().uuid(),
    employeeId: z.string().uuid(),
    role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'SALE', 'ANALYST']),
  }),
  arguments: z.record(z.unknown()).default({}),
  requestId: z.string().min(1),
  agentType: z.enum(['SUGGESTION', 'ANALYST']),
});
internal.post(
  '/mcp/tools/:tool',
  asyncRoute(async (req, res) => {
    const body = mcpToolSchema.parse(req.body);
    const mcpActor: ActorContext = { ...body.actor, source: 'MCP' };
    const startedAt = Date.now();
    try {
      const output = await executeMcpTool(String(req.params.tool), body.arguments, mcpActor);
      await query.invoke('log-mcp-call', mcpActor, {
        toolName: String(req.params.tool),
        requestId: body.requestId,
        agentType: body.agentType,
        status: 'SUCCESS',
        durationMs: Date.now() - startedAt,
      });
      res.json(output);
    } catch (error) {
      await query.invoke('log-mcp-call', mcpActor, {
        toolName: String(req.params.tool),
        requestId: body.requestId,
        agentType: body.agentType,
        status: 'FAILED',
        durationMs: Date.now() - startedAt,
        errorCode: error instanceof DomainError ? error.code : 'INTERNAL',
      });
      throw error;
    }
  }),
);
app.use('/internal', internal);

async function executeMcpTool(
  tool: string,
  args: Record<string, unknown>,
  mcpActor: ActorContext,
): Promise<unknown> {
  const id = String(
    args.id ??
      args.customerId ??
      args.conversationId ??
      args.nodeId ??
      args.suggestionId ??
      args.employeeId ??
      '',
  );
  switch (tool) {
    case 'find_customers':
      return query.list('customers', mcpActor, args);
    case 'get_customer_profile':
      return query.get('customers', id, mcpActor);
    case 'get_customer_history':
      return query.invoke('customer-conversations', mcpActor, { customerId: id });
    case 'find_conversations':
      return query.list('conversations', mcpActor, args);
    case 'get_conversation_context':
      return query.get('conversations', id, mcpActor);
    case 'get_conversation_timeline':
      return query.invoke('conversation-timeline', mcpActor, { conversationId: id });
    case 'get_recent_messages':
      return query.invoke('conversation-messages', mcpActor, { conversationId: id });
    case 'get_workflow_graph':
      return query.invoke('conversation-workflow', mcpActor, { conversationId: id });
    case 'get_workflow_node_evidence':
      return query.invoke('node-evidence', mcpActor, { id });
    case 'get_reply_suggestion_context':
      return query.invoke('reply-suggestion-context', mcpActor, { conversationId: id });
    case 'save_reply_suggestion':
      return query.invoke('save-suggestion', mcpActor, saveSuggestionSchema.parse(args));
    case 'get_reply_suggestion':
    case 'get_suggestion_basis':
      return query.get('suggestions', id, mcpActor);
    case 'record_suggestion_feedback':
      return query.invoke('suggestion-feedback', mcpActor, {
        id,
        ...suggestionFeedbackSchema.parse(args),
      });
    case 'request_alternative_suggestion':
      return query.invoke('request-alternative', mcpActor, { id });
    case 'create_calendar_draft':
      return query.invoke('calendar-draft', mcpActor, {
        id,
        confirmedByEmployee: args.confirmedByEmployee,
      });
    case 'get_insights':
      return query.list('insights', mcpActor, args);
    case 'get_employee_metrics':
      return query.invoke('employee-metrics', mcpActor, { employeeId: id || mcpActor.employeeId });
    case 'compare_conversations':
      return query.invoke('compare-conversations', mcpActor, args);
    case 'list_reports':
      return query.list('reports', mcpActor, args);
    case 'get_report_download_url': {
      const report = await query.get('reports', id, mcpActor);
      return {
        url: await storage.presignedGetUrl(report.bucketName, report.objectKey, 900),
        expiresInSeconds: 900,
      };
    }
    default:
      throw new DomainError('Tool is not allowed or does not exist', 'MCP_TOOL_FORBIDDEN', 403);
  }
}

app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log.error({ err: error }, 'request failed');
  if (error instanceof ZodError)
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.flatten() },
    });
  if (error instanceof DomainError)
    return res
      .status(error.statusCode)
      .json({ error: { code: error.code, message: error.message } });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
});

const server = app.listen(env.API_PORT, '0.0.0.0', () =>
  logger.info({ port: env.API_PORT }, 'API listening'),
);
const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app };
