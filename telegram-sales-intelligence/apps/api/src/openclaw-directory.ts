import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const openClawChatSchema = z.object({
  telegramUserId: z.string().min(1),
  name: z.string().min(1),
  username: z.string().optional(),
  type: z.literal('private'),
  verified: z.literal(true),
});

const openClawAccountSchema = z.object({
  accountId: z.string().min(1),
  openclawAccountIds: z.array(z.string().min(1)).min(1),
  telegramBotId: z.string().min(1),
  botUsername: z.string().optional(),
  displayName: z.string().min(1),
  status: z.literal('CONNECTED'),
  source: z.literal('OPENCLAW'),
  chats: z.array(openClawChatSchema),
});

const openClawDirectorySchema = z.object({
  generatedAt: z.string().datetime(),
  accounts: z.array(openClawAccountSchema),
});

export type OpenClawTelegramDirectory = z.infer<typeof openClawDirectorySchema>;

export function parseOpenClawTelegramDirectory(value: unknown): OpenClawTelegramDirectory {
  return openClawDirectorySchema.parse(value);
}

export async function readOpenClawTelegramDirectory(
  path: string,
): Promise<OpenClawTelegramDirectory> {
  try {
    return parseOpenClawTelegramDirectory(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { generatedAt: new Date(0).toISOString(), accounts: [] };
    }
    throw error;
  }
}
