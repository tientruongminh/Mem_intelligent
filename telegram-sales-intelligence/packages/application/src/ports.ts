import type { ActorContext, UUID } from '@tsi/domain';

export interface StructuredGenerationRequest<T> {
  systemPrompt: string;
  input: Record<string, unknown>;
  schemaName: string;
  validate(value: unknown): T;
}

export interface StructuredGenerationResult<T> {
  data: T;
  model: string;
  tokenUsage?: Record<string, number>;
  latencyMs: number;
}

export interface AiProvider {
  generateStructured<T>(
    request: StructuredGenerationRequest<T>,
  ): Promise<StructuredGenerationResult<T>>;
}

export interface QueuePort {
  enqueue(
    queue: string,
    name: string,
    data: Record<string, unknown>,
    options?: { delayMs?: number; jobId?: string },
  ): Promise<void>;
}

export interface ObjectStoragePort {
  ensureBucket(bucket: string): Promise<void>;
  upload(input: {
    bucket: string;
    objectKey: string;
    body: Buffer | string;
    contentType: string;
  }): Promise<{ sizeBytes: number; checksum: string }>;
  presignedGetUrl(bucket: string, objectKey: string, expiresSeconds: number): Promise<string>;
}

export interface TelegramCollectorPort {
  createSession(input: { actor: ActorContext; phone: string }): Promise<unknown>;
  sendCode(input: { actor: ActorContext; sessionId: UUID }): Promise<unknown>;
  verifyCode(input: { actor: ActorContext; sessionId: UUID; code: string }): Promise<unknown>;
  verifyPassword(input: {
    actor: ActorContext;
    sessionId: UUID;
    password: string;
  }): Promise<unknown>;
  listChats(input: { actor: ActorContext; sessionId: UUID }): Promise<unknown>;
  trackChat(input: {
    actor: ActorContext;
    sessionId: UUID;
    telegramUserId: string;
  }): Promise<unknown>;
  disconnect(input: { actor: ActorContext; sessionId: UUID }): Promise<void>;
}

export interface PasswordHasher {
  verify(hash: string, password: string): Promise<boolean>;
}

export interface TokenService {
  sign(payload: Record<string, unknown>): Promise<string>;
  verify(token: string): Promise<Record<string, unknown>>;
}

export interface QueryPort {
  listOrganizations(): Promise<Array<{ id: UUID; timezone: string }>>;
  listCollectorSessions(): Promise<any[]>;
  loginUserByEmail(email: string): Promise<any | null>;
  list(resource: string, actor: ActorContext, query?: Record<string, unknown>): Promise<any[]>;
  get(resource: string, id: UUID, actor: ActorContext): Promise<any | null>;
  update(
    resource: string,
    id: UUID,
    actor: ActorContext,
    data: Record<string, unknown>,
  ): Promise<any>;
  invoke(action: string, actor: ActorContext, input: Record<string, unknown>): Promise<any>;
}
