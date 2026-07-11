import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { Client as MinioClient } from 'minio';
import type {
  AiProvider,
  ObjectStoragePort,
  QueuePort,
  StructuredGenerationRequest,
  StructuredGenerationResult,
  TelegramCollectorPort,
} from '@tsi/application';
import type { AppEnv } from '@tsi/shared';
import { sha256 } from './security.js';

export class BullMqQueueAdapter implements QueuePort {
  private readonly connection: Redis;
  private readonly queues = new Map<string, Queue>();

  constructor(
    redisUrl: string,
    private readonly workflowMaxDelayMs = 300_000,
  ) {
    this.connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }

  async enqueue(
    queueName: string,
    name: string,
    data: Record<string, unknown>,
    options?: { delayMs?: number; jobId?: string },
  ): Promise<void> {
    let queue = this.queues.get(queueName);
    if (!queue) {
      queue = new Queue(queueName, { connection: this.connection });
      this.queues.set(queueName, queue);
    }
    let firstUnanalyzedAt = Number(data.firstUnanalyzedAt ?? Date.now());
    if (options?.jobId) {
      const existing = await queue.getJob(options.jobId);
      if (existing) {
        firstUnanalyzedAt = Number(existing.data.firstUnanalyzedAt ?? firstUnanalyzedAt);
        await existing.remove().catch(() => undefined);
      }
    }
    const requestedDelay = options?.delayMs ?? 0;
    const remainingUntilMax = Math.max(0, firstUnanalyzedAt + this.workflowMaxDelayMs - Date.now());
    const delay =
      queueName === 'workflow-analysis'
        ? Math.min(requestedDelay, remainingUntilMax)
        : requestedDelay;
    await queue.add(
      name,
      { ...data, firstUnanalyzedAt },
      {
        delay,
        jobId: options?.jobId,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }
}

export class MinioObjectStorageAdapter implements ObjectStoragePort {
  private readonly client: MinioClient;
  private readonly publicClient: MinioClient;

  constructor(
    config: Pick<
      AppEnv,
      | 'MINIO_ENDPOINT'
      | 'MINIO_PORT'
      | 'MINIO_PUBLIC_ENDPOINT'
      | 'MINIO_PUBLIC_PORT'
      | 'MINIO_USE_SSL'
      | 'MINIO_ACCESS_KEY'
      | 'MINIO_SECRET_KEY'
    >,
  ) {
    this.client = new MinioClient({
      endPoint: config.MINIO_ENDPOINT,
      port: config.MINIO_PORT,
      useSSL: config.MINIO_USE_SSL,
      accessKey: config.MINIO_ACCESS_KEY,
      secretKey: config.MINIO_SECRET_KEY,
    });
    this.publicClient = new MinioClient({
      endPoint: config.MINIO_PUBLIC_ENDPOINT,
      port: config.MINIO_PUBLIC_PORT,
      useSSL: config.MINIO_USE_SSL,
      accessKey: config.MINIO_ACCESS_KEY,
      secretKey: config.MINIO_SECRET_KEY,
      region: 'us-east-1',
    });
  }

  async ensureBucket(bucket: string): Promise<void> {
    if (!(await this.client.bucketExists(bucket))) await this.client.makeBucket(bucket);
  }

  async upload(input: {
    bucket: string;
    objectKey: string;
    body: string | Buffer;
    contentType: string;
  }): Promise<{ sizeBytes: number; checksum: string }> {
    const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
    await this.client.putObject(input.bucket, input.objectKey, body, body.length, {
      'Content-Type': input.contentType,
    });
    return { sizeBytes: body.length, checksum: sha256(body) };
  }

  presignedGetUrl(bucket: string, objectKey: string, expiresSeconds: number): Promise<string> {
    return this.publicClient.presignedGetObject(bucket, objectKey, expiresSeconds);
  }
}

export class FakeAiProvider implements AiProvider {
  async generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>> {
    const startedAt = Date.now();
    const messages = (request.input.newMessages as Array<any> | undefined) ?? [];
    const latest = messages.at(-1);
    const existingNodes = (request.input.currentNodes as Array<any> | undefined) ?? [];
    let raw: unknown;
    if (request.schemaName === 'dynamic_workflow_analysis') {
      const latestText = String(latest?.textContent ?? '');
      const hasAppointment = /\b(hẹn|demo|meeting|gặp|lịch)\b/iu.test(latestText);
      raw = latest
        ? {
            summaryUpdate: {
              summaryText: `Conversation has ${messages.length} analyzed messages.`,
            },
            operations: existingNodes.length
              ? hasAppointment
                ? [
                    {
                      type: 'ADD_NODE',
                      temporaryId: `appointment-${latest.id}`,
                      title: 'Khách đề xuất lịch hẹn',
                      description: 'Khách hàng đề cập một buổi hẹn hoặc demo cần sale xác nhận.',
                      shortSummary: 'Lịch hẹn cần xác nhận',
                      confidence: 0.91,
                      evidenceMessageIds: [latest.id],
                      metadata: {
                        customerIntent: 'schedule_appointment',
                        appointment: {
                          detected: true,
                          rawText: latestText,
                          status: 'NEEDS_CONFIRMATION',
                        },
                      },
                    },
                  ]
                : [{ type: 'NO_CHANGE', reason: 'Fake provider keeps an existing graph stable.' }]
              : [
                  {
                    type: 'ADD_NODE',
                    temporaryId: 'fake-first-node',
                    title: 'Nhu cầu được khách hàng chia sẻ',
                    description: 'Khách hàng mô tả nhu cầu hoặc câu hỏi ban đầu.',
                    shortSummary: 'Xác định nhu cầu',
                    confidence: 0.88,
                    evidenceMessageIds: [latest.id],
                    metadata: { customerIntent: 'explore_solution', source: 'fake-provider' },
                  },
                ],
          }
        : { operations: [{ type: 'NO_CHANGE', reason: 'No messages to analyze.' }] };
    } else if (request.schemaName === 'data_mining_insight_narratives') {
      const candidates = (request.input.candidates as Array<any> | undefined) ?? [];
      raw = {
        narratives: candidates.map((candidate) => ({
          candidateId: candidate.candidateId,
          title: `${candidate.method}: ${candidate.metricName}`,
          description: `Phân tích trên ${candidate.sampleSize} mẫu cho thấy ${candidate.metricName} = ${candidate.metricValue}, so với baseline ${candidate.baselineValue}.`,
        })),
      };
    } else {
      const contextMessages = (request.input.recentMessages as Array<any> | undefined) ?? messages;
      const appointmentMessage = [...contextMessages]
        .reverse()
        .find((message) => /\b(hẹn|demo|meeting|gặp|lịch)\b/iu.test(String(message.textContent)));
      raw = {
        suggestionText: appointmentMessage
          ? 'Dạ, em đã ghi nhận đề xuất lịch hẹn. Em xác nhận lại thời gian và sẽ gửi anh/chị nội dung buổi demo ngay nhé.'
          : 'Anh/chị có thể chia sẻ thêm ưu tiên quan trọng nhất để em tư vấn sát hơn không?',
        shortRationale: appointmentMessage
          ? 'Xác nhận ý định đặt lịch trước khi tạo calendar draft.'
          : 'Làm rõ nhu cầu trước khi đề xuất giải pháp.',
        confidence: appointmentMessage ? 0.89 : 0.82,
        appointment: appointmentMessage
          ? {
              detected: true,
              title: 'Demo giải pháp với khách hàng',
              durationMinutes: 45,
              askEmployeeConfirmation: true,
            }
          : { detected: false, askEmployeeConfirmation: false },
      };
    }
    return {
      data: request.validate(raw),
      model: 'fake-ai-v1',
      tokenUsage: { input: 0, output: 0 },
      latencyMs: Date.now() - startedAt,
    };
  }
}

export class OpenAICompatibleAiProvider implements AiProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>> {
    const startedAt = Date.now();
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: JSON.stringify(request.input) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI provider failed with ${response.status}`);
    const payload = (await response.json()) as any;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI provider returned no structured content');
    return {
      data: request.validate(JSON.parse(content)),
      model: payload.model ?? this.model,
      tokenUsage: payload.usage,
      latencyMs: Date.now() - startedAt,
    };
  }
}

export class HttpTelegramCollectorAdapter implements TelegramCollectorPort {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceToken: string,
  ) {}

  private async call(path: string, method: string, actor: any, body?: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': this.serviceToken,
        'x-actor-context': Buffer.from(JSON.stringify(actor)).toString('base64url'),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`Telegram collector failed with ${response.status}`);
    return response.status === 204 ? undefined : response.json();
  }

  createSession({ actor, phone }: any) {
    return this.call('/sessions', 'POST', actor, { phone });
  }
  sendCode({ actor, sessionId }: any) {
    return this.call(`/sessions/${sessionId}/send-code`, 'POST', actor);
  }
  verifyCode({ actor, sessionId, code }: any) {
    return this.call(`/sessions/${sessionId}/verify-code`, 'POST', actor, { code });
  }
  verifyPassword({ actor, sessionId, password }: any) {
    return this.call(`/sessions/${sessionId}/verify-password`, 'POST', actor, { password });
  }
  listChats({ actor, sessionId }: any) {
    return this.call(`/sessions/${sessionId}/chats`, 'GET', actor);
  }
  trackChat({ actor, sessionId, telegramUserId }: any) {
    return this.call(`/sessions/${sessionId}/chats/${telegramUserId}/track`, 'POST', actor);
  }
  async disconnect({ actor, sessionId }: any) {
    await this.call(`/sessions/${sessionId}`, 'DELETE', actor);
  }
}
