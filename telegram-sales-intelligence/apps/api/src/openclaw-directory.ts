import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const rawDirectorySchema = z.object({
  generatedAt: z.string().datetime(),
  accounts: z.array(z.record(z.unknown())),
});

const assistantBotSchema = z.object({
  openclawAccountId: z.string().min(1),
  telegramBotId: z.string().min(1).optional(),
  botUsername: z.string().optional(),
  displayName: z.string().min(1),
  role: z.enum(['SUGGESTION', 'QA', 'CHAT', 'UNKNOWN']).default('UNKNOWN'),
});

const saleAccountSchema = z.object({
  accountId: z.string().min(1),
  saleTelegramUserId: z.string().min(1),
  saleName: z.string().min(1),
  saleUsername: z.string().optional(),
  source: z.literal('OPENCLAW_SALE_BINDING'),
  status: z.literal('BOUND_TO_ASSISTANTS'),
  openclawAccountIds: z.array(z.string().min(1)).min(1),
  assistantBots: z.array(assistantBotSchema).min(1),
});

const legacyChatSchema = z.object({
  telegramUserId: z.string().min(1),
  name: z.string().min(1),
  username: z.string().optional(),
  type: z.literal('private'),
  verified: z.literal(true),
});

const legacyBotAccountSchema = z.object({
  accountId: z.string().min(1),
  openclawAccountIds: z.array(z.string().min(1)).min(1),
  telegramBotId: z.string().min(1).optional(),
  botUsername: z.string().optional(),
  displayName: z.string().min(1),
  chats: z.array(legacyChatSchema),
});

const openClawDirectorySchema = z.object({
  generatedAt: z.string().datetime(),
  accounts: z.array(saleAccountSchema),
});

export type OpenClawTelegramDirectory = z.infer<typeof openClawDirectorySchema>;
export type OpenClawSaleAccount = OpenClawTelegramDirectory['accounts'][number];

function cleanOptionalString(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

function inferAssistantRole(input: {
  openclawAccountId: string;
  botUsername?: string;
  displayName?: string;
}): 'SUGGESTION' | 'QA' | 'CHAT' | 'UNKNOWN' {
  const label = [input.openclawAccountId, input.botUsername, input.displayName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/(suggest|reply)/iu.test(label)) return 'SUGGESTION';
  if (/(qa|analyst|analysis)/iu.test(label)) return 'QA';
  if (/(chat|assistant)/iu.test(label)) return 'CHAT';
  return 'UNKNOWN';
}

function addAssistant(
  account: OpenClawSaleAccount,
  assistant: z.infer<typeof assistantBotSchema>,
): OpenClawSaleAccount {
  if (
    !account.assistantBots.some(
      (item) =>
        item.openclawAccountId === assistant.openclawAccountId &&
        item.telegramBotId === assistant.telegramBotId,
    )
  ) {
    account.assistantBots.push(assistant);
  }
  account.openclawAccountIds = [
    ...new Set(account.assistantBots.map((item) => item.openclawAccountId)),
  ];
  return account;
}

function normalizeLegacyAccount(
  account: z.infer<typeof legacyBotAccountSchema>,
  bySaleId: Map<string, OpenClawSaleAccount>,
) {
  const assistant = assistantBotSchema.parse({
    openclawAccountId: account.openclawAccountIds[0] ?? account.accountId,
    telegramBotId: account.telegramBotId,
    botUsername: account.botUsername,
    displayName: account.displayName,
    role: inferAssistantRole({
      openclawAccountId: account.openclawAccountIds.join(' '),
      botUsername: account.botUsername,
      displayName: account.displayName,
    }),
  });
  for (const chat of account.chats) {
    const existing = bySaleId.get(chat.telegramUserId);
    const saleAccount =
      existing ??
      saleAccountSchema.parse({
        accountId: `openclaw-sale-${chat.telegramUserId}`,
        saleTelegramUserId: chat.telegramUserId,
        saleName: chat.name,
        saleUsername: chat.username,
        source: 'OPENCLAW_SALE_BINDING',
        status: 'BOUND_TO_ASSISTANTS',
        openclawAccountIds: [assistant.openclawAccountId],
        assistantBots: [assistant],
      });
    if (existing) addAssistant(saleAccount, assistant);
    bySaleId.set(chat.telegramUserId, saleAccount);
  }
}

export function parseOpenClawTelegramDirectory(value: unknown): OpenClawTelegramDirectory {
  const raw = rawDirectorySchema.parse(value);
  const bySaleId = new Map<string, OpenClawSaleAccount>();
  for (const item of raw.accounts) {
    const direct = saleAccountSchema.safeParse({
      ...item,
      saleUsername: cleanOptionalString(item.saleUsername),
      assistantBots: Array.isArray(item.assistantBots)
        ? item.assistantBots.map((assistant) => ({
            ...(assistant as Record<string, unknown>),
            botUsername: cleanOptionalString((assistant as Record<string, unknown>).botUsername),
          }))
        : item.assistantBots,
    });
    if (direct.success) {
      const existing = bySaleId.get(direct.data.saleTelegramUserId);
      if (existing) {
        for (const assistant of direct.data.assistantBots) addAssistant(existing, assistant);
      } else {
        bySaleId.set(direct.data.saleTelegramUserId, direct.data);
      }
      continue;
    }

    const legacy = legacyBotAccountSchema.safeParse({
      ...item,
      botUsername: cleanOptionalString(item.botUsername),
      chats: Array.isArray(item.chats)
        ? item.chats.map((chat) => ({
            ...(chat as Record<string, unknown>),
            username: cleanOptionalString((chat as Record<string, unknown>).username),
          }))
        : item.chats,
    });
    if (legacy.success) {
      normalizeLegacyAccount(legacy.data, bySaleId);
      continue;
    }
    saleAccountSchema.parse(item);
  }
  return openClawDirectorySchema.parse({
    generatedAt: raw.generatedAt,
    accounts: [...bySaleId.values()].sort((left, right) =>
      left.saleName.localeCompare(right.saleName, 'en'),
    ),
  });
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
