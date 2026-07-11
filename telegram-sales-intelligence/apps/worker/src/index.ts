import { Queue, Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import {
  AnalyzeConversationWorkflow,
  GenerateDataMiningInsights,
  GenerateDailyReport,
  GenerateReplySuggestion,
  QueryService,
  TriggerReplySuggestion,
} from '@tsi/application';
import {
  insightNarrativeOutputSchema,
  suggestionAiOutputSchema,
  workflowAiOutputSchema,
} from '@tsi/contracts';
import type { ActorContext } from '@tsi/domain';
import {
  BullMqQueueAdapter,
  FakeAiProvider,
  MinioObjectStorageAdapter,
  OpenAICompatibleAiProvider,
  PrismaQueryAdapter,
  createPrismaRepositories,
  prisma,
} from '@tsi/infrastructure';
import { loadEnv, logger } from '@tsi/shared';

const env = loadEnv();
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const repositories = createPrismaRepositories(prisma);
const queryPort = new PrismaQueryAdapter(prisma);
const query = new QueryService(queryPort);
const queue = new BullMqQueueAdapter(env.REDIS_URL, env.WORKFLOW_MAX_DELAY_SECONDS * 1000);
const storage = new MinioObjectStorageAdapter(env);
const ai = env.AI_API_KEY
  ? new OpenAICompatibleAiProvider(env.AI_BASE_URL, env.AI_API_KEY, env.AI_MODEL)
  : new FakeAiProvider();
const analyzeWorkflow = new AnalyzeConversationWorkflow(repositories, ai, (value) =>
  workflowAiOutputSchema.parse(value),
);
const triggerSuggestion = new TriggerReplySuggestion(repositories, queue);
const generateSuggestion = new GenerateReplySuggestion(queryPort, ai, (value) =>
  suggestionAiOutputSchema.parse(value),
);
const generateInsights = new GenerateDataMiningInsights(queryPort, ai, (value) =>
  insightNarrativeOutputSchema.parse(value),
);
const generateReport = new GenerateDailyReport(queryPort, storage);

const actorFromJob = (job: Job): ActorContext => ({
  organizationId: String(job.data.organizationId),
  employeeId: String(job.data.employeeId),
  role: (job.data.role as ActorContext['role']) ?? 'ADMIN',
  source: 'WORKER',
});

const workers = [
  new Worker(
    'workflow-analysis',
    async (job) => {
      const actor = actorFromJob(job);
      await analyzeWorkflow.execute({ actor, conversationId: String(job.data.conversationId) });
      await queue.enqueue('conversation-summary', 'summarize', job.data);
      await queue.enqueue('reply-suggestion-trigger', 'evaluate', job.data, { delayMs: 10_000 });
    },
    { connection },
  ),
  new Worker(
    'conversation-summary',
    async (job) => {
      await query.invoke('generate-conversation-summary', actorFromJob(job), {
        conversationId: String(job.data.conversationId),
      });
    },
    { connection },
  ),
  new Worker(
    'reply-suggestion-trigger',
    async (job) => {
      if (job.name === 'evaluate') {
        await triggerSuggestion.execute({
          actor: actorFromJob(job),
          conversationId: String(job.data.conversationId),
        });
        return;
      }
      if (env.OPENCLAW_WEBHOOK_URL) {
        const response = await fetch(env.OPENCLAW_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(env.OPENCLAW_WEBHOOK_TOKEN
              ? { Authorization: `Bearer ${env.OPENCLAW_WEBHOOK_TOKEN}` }
              : {}),
          },
          body: JSON.stringify({
            eventType: 'REPLY_SUGGESTION_REQUESTED',
            organizationId: job.data.organizationId,
            employeeId: job.data.employeeId,
            conversationId: job.data.conversationId,
            messageId: job.data.messageId,
          }),
        });
        if (!response.ok) {
          throw new Error(`OpenClaw webhook returned ${response.status}`);
        }
        return;
      }
      await generateSuggestion.execute({
        actor: actorFromJob(job),
        conversationId: String(job.data.conversationId),
      });
    },
    { connection },
  ),
  new Worker(
    'daily-insight',
    async (job) =>
      generateInsights.execute({
        actor: actorFromJob(job),
        generatedAt: job.data.generatedAt ? new Date(job.data.generatedAt) : new Date(),
      }),
    { connection },
  ),
  new Worker(
    'daily-employee-metric',
    async (job) => {
      const actor = actorFromJob(job);
      const metrics = await query.invoke('generate-daily-metrics', actor, {
        metricDate: job.data.metricDate,
      });
      await query.invoke('generate-employee-experiences', actor, {
        generatedAt: new Date().toISOString(),
      });
      return metrics;
    },
    { connection },
  ),
  new Worker(
    'daily-report',
    async (job) =>
      generateReport.execute({
        actor: actorFromJob(job),
        reportDate: new Date(job.data.reportDate ?? Date.now()),
      }),
    { connection },
  ),
  new Worker(
    'workflow-scan',
    async (job) => {
      const actor = actorFromJob(job);
      const conversations = await query.invoke('conversations-needing-analysis', actor, {
        since: new Date(Date.now() - 5 * 60_000).toISOString(),
      });
      for (const conversation of conversations) {
        await queue.enqueue(
          'workflow-analysis',
          'analyze',
          {
            organizationId: actor.organizationId,
            employeeId: conversation.employeeId,
            conversationId: conversation.id,
          },
          { jobId: `workflow-${conversation.id}` },
        );
      }
      return { queued: conversations.length };
    },
    { connection },
  ),
  new Worker(
    'outbox-publisher',
    async (job) => {
      const actor = actorFromJob(job);
      const events = await query.invoke('claim-outbox', actor, {});
      for (const event of events) {
        if (event.eventType === 'WORKFLOW_ANALYSIS_REQUESTED') {
          await queue.enqueue('workflow-analysis', 'analyze', {
            ...event.payloadJson,
            organizationId: event.organizationId,
            employeeId: actor.employeeId,
          });
        }
      }
      await query.invoke('mark-outbox-published', actor, {
        ids: events.map((event: any) => event.id),
      });
    },
    { connection },
  ),
];

for (const worker of workers) {
  worker.on('completed', (job) =>
    logger.info({ queue: worker.name, jobId: job.id }, 'job completed'),
  );
  worker.on('failed', (job, error) =>
    logger.error({ queue: worker.name, jobId: job?.id, err: error }, 'job failed'),
  );
}

async function scheduleDailyJobs() {
  const organizations = await queryPort.listOrganizations();
  for (const organization of organizations) {
    const employees = await query.list('employees', {
      organizationId: organization.id,
      employeeId: organization.id,
      role: 'ADMIN',
      source: 'WORKER',
    });
    const employeeId = employees[0]?.id ?? organization.id;
    const data = { organizationId: organization.id, employeeId, role: 'ADMIN' };
    for (const queueName of ['daily-insight', 'daily-employee-metric', 'daily-report']) {
      const dailyQueue = new Queue(queueName, { connection });
      await dailyQueue.add('daily', data, {
        repeat: { pattern: '0 0 * * *', tz: organization.timezone },
        jobId: `${queueName}-${organization.id}`,
      });
    }
    const outbox = new Queue('outbox-publisher', { connection });
    await outbox.add('poll', data, {
      repeat: { every: 10_000 },
      jobId: `outbox-${organization.id}`,
    });
    const workflowScan = new Queue('workflow-scan', { connection });
    await workflowScan.add('scan-recent', data, {
      repeat: { every: 300_000 },
      jobId: `workflow-scan-${organization.id}`,
    });
  }
}

scheduleDailyJobs()
  .then(() => logger.info('Worker queues ready'))
  .catch((error) => {
    logger.error({ err: error }, 'Failed to schedule jobs');
    process.exitCode = 1;
  });

async function shutdown() {
  await Promise.all(workers.map((worker) => worker.close()));
  await connection.quit();
  await prisma.$disconnect();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
