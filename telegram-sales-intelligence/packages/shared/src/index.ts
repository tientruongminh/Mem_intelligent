import { pino } from 'pino';
import { z } from 'zod';

const booleanString = z.string().transform((value) => value === 'true');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('postgresql://tsi:tsi_dev_password@localhost:5432/tsi'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(24).default('local-demo-jwt-secret-change-me'),
  INTERNAL_SERVICE_TOKEN: z.string().min(16).default('local-internal-service-token'),
  ENCRYPTION_KEY: z.string().length(64).default('0'.repeat(64)),
  API_PORT: z.coerce.number().default(4000),
  INTERNAL_API_URL: z.string().default('http://localhost:4000'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_PUBLIC_ENDPOINT: z.string().default('localhost'),
  MINIO_PUBLIC_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: booleanString.default('false'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin123'),
  MINIO_BUCKET: z.string().default('reports'),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gpt-4.1-mini'),
  TELEGRAM_API_ID: z.coerce.number().optional(),
  TELEGRAM_API_HASH: z.string().optional(),
  TELEGRAM_COLLECTOR_URL: z.string().default('http://localhost:4100'),
  OPENCLAW_WEBHOOK_URL: z.string().optional(),
  OPENCLAW_WEBHOOK_TOKEN: z.string().optional(),
  WORKFLOW_DEBOUNCE_SECONDS: z.coerce.number().default(300),
  WORKFLOW_MAX_DELAY_SECONDS: z.coerce.number().default(300),
  MCP_HTTP_PORT: z.coerce.number().default(4200),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'password',
      'otp',
      'code',
      'twoFactorPassword',
      'session',
      'encryptedSession',
      'apiKey',
      'token',
      'secret',
    ],
    censor: '[REDACTED]',
  },
});

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
