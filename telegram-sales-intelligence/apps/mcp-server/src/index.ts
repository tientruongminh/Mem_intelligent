import { randomUUID } from 'node:crypto';
import express, { type Request } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { loadEnv, logger } from '@tsi/shared';

type AgentType = 'SUGGESTION' | 'ANALYST';
interface Actor {
  organizationId: string;
  employeeId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALE' | 'ANALYST';
}

const env = loadEnv();
const suggestionTools = new Set([
  'get_reply_suggestion_context',
  'get_customer_history',
  'get_workflow_graph',
  'get_workflow_node_evidence',
  'compare_conversations',
  'save_reply_suggestion',
  'record_suggestion_feedback',
  'request_alternative_suggestion',
  'create_calendar_draft',
]);
const analystTools = new Set([
  'find_customers',
  'find_conversations',
  'get_customer_profile',
  'get_customer_history',
  'get_conversation_context',
  'get_conversation_timeline',
  'get_recent_messages',
  'get_workflow_graph',
  'get_workflow_node_evidence',
  'get_reply_suggestion',
  'get_suggestion_basis',
  'get_insights',
  'get_employee_metrics',
  'compare_conversations',
  'record_suggestion_feedback',
  'list_reports',
  'get_report_download_url',
  'create_calendar_draft',
]);

const idInput = { id: z.string().uuid().describe('Tenant-scoped resource id') };
const conversationInput = { conversationId: z.string().uuid() };
const customerInput = { customerId: z.string().uuid() };
const nodeInput = { nodeId: z.string().uuid() };

function createServer(actor: Actor, agentType: AgentType): McpServer {
  const server = new McpServer({ name: 'telegram-sales-intelligence', version: '0.1.0' });
  const call = async (toolName: string, args: Record<string, unknown>) => {
    const allowed = agentType === 'SUGGESTION' ? suggestionTools : analystTools;
    if (!allowed.has(toolName))
      throw new Error(`Tool ${toolName} is not allowed for ${agentType} agent`);
    const response = await fetch(`${env.INTERNAL_API_URL}/internal/mcp/tools/${toolName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': env.INTERNAL_SERVICE_TOKEN,
      },
      body: JSON.stringify({ actor, arguments: args, requestId: randomUUID(), agentType }),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body?.error?.message ?? `Core API returned ${response.status}`);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(body) }],
      structuredContent: body,
    };
  };

  server.tool(
    'find_customers',
    'Find customers visible to the current employee.',
    { search: z.string().optional() },
    (args) => call('find_customers', args),
  );
  server.tool('get_customer_profile', 'Get a customer profile.', customerInput, (args) =>
    call('get_customer_profile', args),
  );
  server.tool(
    'get_customer_history',
    'Get prior and current conversations for a customer.',
    customerInput,
    (args) => call('get_customer_history', args),
  );
  server.tool(
    'find_conversations',
    'Find tenant-scoped conversations.',
    { search: z.string().optional(), status: z.enum(['OPEN', 'CLOSED']).optional() },
    (args) => call('find_conversations', args),
  );
  server.tool(
    'get_conversation_context',
    'Get customer, summaries and suggestion context.',
    conversationInput,
    (args) => call('get_conversation_context', args),
  );
  server.tool(
    'get_conversation_timeline',
    'Get chronological message and analysis events.',
    conversationInput,
    (args) => call('get_conversation_timeline', args),
  );
  server.tool(
    'get_recent_messages',
    'Get recent conversation messages.',
    conversationInput,
    (args) => call('get_recent_messages', args),
  );
  server.tool(
    'get_workflow_graph',
    'Get dynamic workflow nodes and edges.',
    conversationInput,
    (args) => call('get_workflow_graph', args),
  );
  server.tool(
    'get_workflow_node_evidence',
    'Get messages supporting a workflow node.',
    nodeInput,
    (args) => call('get_workflow_node_evidence', args),
  );
  server.tool(
    'get_reply_suggestion_context',
    'Get bounded context for composing a private reply suggestion.',
    conversationInput,
    (args) => call('get_reply_suggestion_context', args),
  );
  server.tool(
    'save_reply_suggestion',
    'Save a suggestion for sale review. This does not send it to a customer.',
    {
      conversationId: z.string().uuid(),
      suggestionText: z.string().min(2).max(4000),
      shortRationale: z.string().min(2).max(1000),
      confidence: z.number().min(0).max(1),
      basedOnMessageIds: z.array(z.string().uuid()).min(1),
    },
    (args) => call('save_reply_suggestion', args),
  );
  server.tool('get_reply_suggestion', 'Get a saved suggestion.', idInput, (args) =>
    call('get_reply_suggestion', args),
  );
  server.tool('get_suggestion_basis', 'Get references used for a suggestion.', idInput, (args) =>
    call('get_suggestion_basis', args),
  );
  server.tool(
    'record_suggestion_feedback',
    'Record the sale decision about a suggestion.',
    {
      id: z.string().uuid(),
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
    },
    (args) => call('record_suggestion_feedback', args),
  );
  server.tool(
    'request_alternative_suggestion',
    'Request another suggestion without contacting the customer.',
    idInput,
    (args) => call('request_alternative_suggestion', args),
  );
  server.tool(
    'create_calendar_draft',
    'Create a prefilled Google Calendar draft after explicit employee confirmation. This never saves an event automatically.',
    {
      suggestionId: z.string().uuid(),
      confirmedByEmployee: z.literal(true),
    },
    (args) => call('create_calendar_draft', args),
  );
  server.tool(
    'get_insights',
    'Get evidence-backed organization insights.',
    {
      method: z
        .enum(['ANOMALY_DETECTION', 'CLUSTERING', 'CLASSIFICATION', 'ASSOCIATION_RULE'])
        .optional(),
    },
    (args) => call('get_insights', args),
  );
  server.tool(
    'get_employee_metrics',
    'Get calculated employee metrics.',
    { employeeId: z.string().uuid().optional() },
    (args) => call('get_employee_metrics', args),
  );
  server.tool(
    'compare_conversations',
    'Compare conversation summaries and dynamic workflows.',
    { conversationIds: z.array(z.string().uuid()).max(10) },
    (args) => call('compare_conversations', args),
  );
  server.tool(
    'list_reports',
    'List reports available to the actor.',
    { reportType: z.string().optional() },
    (args) => call('list_reports', args),
  );
  server.tool(
    'get_report_download_url',
    'Create a short-lived report download URL.',
    idInput,
    (args) => call('get_report_download_url', args),
  );
  return server;
}

function actorFromRequest(req: Request): { actor: Actor; agentType: AgentType } {
  return {
    actor: {
      organizationId: z.string().uuid().parse(req.headers['x-organization-id']),
      employeeId: z.string().uuid().parse(req.headers['x-employee-id']),
      role: z
        .enum(['OWNER', 'ADMIN', 'MANAGER', 'SALE', 'ANALYST'])
        .default('SALE')
        .parse(req.headers['x-employee-role']),
    },
    agentType: z.enum(['SUGGESTION', 'ANALYST']).parse(req.headers['x-agent-type']),
  };
}

if (process.env.MCP_TRANSPORT === 'stdio') {
  const actor: Actor = {
    organizationId: z.string().uuid().parse(process.env.MCP_ORGANIZATION_ID),
    employeeId: z.string().uuid().parse(process.env.MCP_EMPLOYEE_ID),
    role: z
      .enum(['OWNER', 'ADMIN', 'MANAGER', 'SALE', 'ANALYST'])
      .default('SALE')
      .parse(process.env.MCP_EMPLOYEE_ROLE),
  };
  const agentType = z
    .enum(['SUGGESTION', 'ANALYST'])
    .default('ANALYST')
    .parse(process.env.MCP_AGENT_TYPE);
  const server = createServer(actor, agentType);
  await server.connect(new StdioServerTransport());
} else {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'mcp-server' }));
  app.post('/mcp', async (req, res) => {
    try {
      const { actor, agentType } = actorFromRequest(req);
      const server = createServer(actor, agentType);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error({ err: error }, 'MCP request failed');
      if (!res.headersSent)
        res.status(400).json({ error: error instanceof Error ? error.message : 'MCP error' });
    }
  });
  app.listen(env.MCP_HTTP_PORT, '0.0.0.0', () =>
    logger.info({ port: env.MCP_HTTP_PORT }, 'MCP HTTP server listening'),
  );
}
