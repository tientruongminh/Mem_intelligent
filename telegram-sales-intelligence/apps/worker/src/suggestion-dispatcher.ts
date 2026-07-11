import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

interface DispatcherConfig {
  redisUrl: string;
  suggestionAgentId: string;
  telegramAccountId: string;
  telegramTargetId: string;
  statePath: string;
  openclawCommand: string;
  salesDataCommand: string;
  pollIntervalMs: number;
}

interface ReplySuggestion {
  id: string;
  basedOnToMessageId?: string | null;
  suggestionText: string;
  shortRationale: string;
  confidence: number;
  status: string;
  generatedAt: string;
}

interface ConversationContext {
  id: string;
  customer?: { fullName?: string; telegramUsername?: string | null };
  suggestions?: ReplySuggestion[];
}

interface ConversationListItem {
  id: string;
  status: string;
  lastMessageAt?: string | null;
  customer?: { fullName?: string };
  messages?: Array<{
    senderType: string;
    textContent?: string | null;
    sentAt?: string;
  }>;
}

interface ConversationMessage {
  id: string;
  senderType: string;
  textContent?: string | null;
  sentAt?: string;
}

interface ProcessResult {
  stdout: string;
  stderr: string;
}

interface DispatcherState {
  deliveredMessageIds: Set<string>;
  lastMessageAtByConversation: Record<string, string>;
}

export function selectSuggestion(
  suggestions: ReplySuggestion[],
  messageId: string,
): ReplySuggestion | undefined {
  return suggestions.find(
    (item) => item.basedOnToMessageId === messageId && item.status === 'GENERATED',
  );
}

export function buildSuggestionPrompt(input: {
  conversationId: string;
  messageId: string;
  customerName: string;
  customerMessage: string;
  suggestion: ReplySuggestion;
}): string {
  return [
    'Day la su kien tu dong khi khach hang vua nhan tin cho sale.',
    `Khach hang: ${input.customerName}`,
    `Conversation ID: ${input.conversationId}`,
    `Message ID: ${input.messageId}`,
    `Tin nhan moi cua khach: ${input.customerMessage}`,
    `Suggestion ID da luu: ${input.suggestion.id}`,
    `Cau tra loi de xuat da luu: ${input.suggestion.suggestionText}`,
    `Ly do ngan da luu: ${input.suggestion.shortRationale}`,
    `Confidence: ${input.suggestion.confidence}`,
    '',
    'Bat buoc dung exec goi /usr/local/bin/tsi-sales-suggestion get_reply_suggestion_context voi conversationId tren de kiem chung workflow, employeeExperiences va relevantInsights.',
    'Khong tao suggestion moi va khong gui tin cho khach hang.',
    'Gui thong bao cho sale bang tieng Viet theo dung format:',
    '[GOI Y TRA LOI TU DONG]',
    'Khach hang: <ten> | Conversation: <id>',
    'Khach vua nhan: <noi dung>',
    'Goi y tra loi: <giu nguyen noi dung suggestion da luu>',
    'Tai sao: <giai thich ngan dua tren workflow, kinh nghiem va insight vua truy xuat>',
    'Confidence: <gia tri> | Suggestion ID: <id>',
  ].join('\n');
}

export function buildNewSuggestionPrompt(input: {
  conversationId: string;
  messageId: string;
  customerName: string;
  customerMessage: string;
}): string {
  return [
    'Day la su kien tu dong khi khach hang vua nhan tin cho sale.',
    `Khach hang: ${input.customerName}`,
    `Conversation ID: ${input.conversationId}`,
    `Message ID: ${input.messageId}`,
    `Tin nhan moi cua khach: ${input.customerMessage}`,
    '',
    'Bat buoc dung exec goi /usr/local/bin/tsi-sales-suggestion get_reply_suggestion_context voi conversationId tren.',
    'Dua tren recentMessages, workflow, employeeExperiences va relevantInsights, tao mot cau tra loi cu the cho sale.',
    'Sau do bat buoc goi save_reply_suggestion voi conversationId, suggestionText, shortRationale, confidence va basedOnMessageIds chi gom Message ID tren.',
    'Khong gui tin cho khach hang va khong thay doi trang thai deal.',
    'Gui thong bao cho sale bang tieng Viet theo dung format:',
    '[GOI Y TRA LOI TU DONG]',
    'Khach hang: <ten> | Conversation: <id>',
    'Khach vua nhan: <noi dung>',
    'Goi y tra loi: <noi dung cu the>',
    'Tai sao: <workflow stage + kinh nghiem + insight co lien quan>',
    'Confidence: <gia tri> | Suggestion ID: <id vua luu>',
  ].join('\n');
}

export function assertOpenClawResult(raw: string): void {
  const parsed = JSON.parse(raw) as {
    status?: string;
    result?: { payloads?: Array<{ text?: string }> };
  };
  const text = parsed.result?.payloads?.[0]?.text ?? '';
  if (parsed.status !== 'ok' || /LLM request failed|provider rejected/iu.test(text)) {
    throw new Error(`OpenClaw delivery failed: ${text || parsed.status || 'unknown error'}`);
  }
}

async function runProcess(
  command: string,
  args: string[],
  timeoutMs = 240_000,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
      if (stdout.length > 2_000_000) child.kill('SIGTERM');
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 200_000) child.kill('SIGTERM');
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}: ${stderr || stdout}`));
    });
  });
}

async function callSalesData<T>(
  config: DispatcherConfig,
  tool: string,
  args: Record<string, unknown>,
): Promise<T> {
  const result = await runProcess(config.salesDataCommand, [tool, JSON.stringify(args)], 60_000);
  return JSON.parse(result.stdout) as T;
}

async function loadState(path: string): Promise<DispatcherState> {
  try {
    const value = JSON.parse(await readFile(path, 'utf8')) as
      | string[]
      | { deliveredMessageIds?: string[]; lastMessageAtByConversation?: Record<string, string> };
    if (Array.isArray(value)) {
      return { deliveredMessageIds: new Set(value), lastMessageAtByConversation: {} };
    }
    return {
      deliveredMessageIds: new Set(value.deliveredMessageIds ?? []),
      lastMessageAtByConversation: value.lastMessageAtByConversation ?? {},
    };
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return { deliveredMessageIds: new Set(), lastMessageAtByConversation: {} };
    }
    throw error;
  }
}

async function saveState(path: string, state: DispatcherState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(
    temporary,
    `${JSON.stringify(
      {
        deliveredMessageIds: [...state.deliveredMessageIds].slice(-2_000),
        lastMessageAtByConversation: state.lastMessageAtByConversation,
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  await rename(temporary, path);
}

async function dispatchSuggestion(
  config: DispatcherConfig,
  data: Record<string, unknown>,
  state: DispatcherState,
): Promise<void> {
  const conversationId = String(data.conversationId ?? '');
  const messageId = String(data.messageId ?? '');
  if (!conversationId || !messageId || state.deliveredMessageIds.has(messageId)) return;

  const [context, messages] = await Promise.all([
    callSalesData<ConversationContext>(config, 'get_conversation_context', { conversationId }),
    callSalesData<ConversationMessage[]>(config, 'get_recent_messages', { conversationId }),
  ]);
  const suggestion = selectSuggestion(context.suggestions ?? [], messageId);
  const customerMessage = messages.find((item) => item.id === messageId);
  const customerName = context.customer?.fullName?.trim() || 'Khach hang chua ro ten';
  const promptInput = {
    conversationId,
    messageId,
    customerName,
    customerMessage: customerMessage?.textContent?.trim() || '(Tin nhan khong co text)',
  };
  const prompt = suggestion
    ? buildSuggestionPrompt({ ...promptInput, suggestion })
    : buildNewSuggestionPrompt(promptInput);

  const result = await runProcess(config.openclawCommand, [
    'agent',
    '--agent',
    config.suggestionAgentId,
    '--message',
    prompt,
    '--thinking',
    'low',
    '--timeout',
    '180',
    '--json',
    '--deliver',
    '--reply-channel',
    'telegram',
    '--reply-account',
    config.telegramAccountId,
    '--reply-to',
    config.telegramTargetId,
  ]);
  assertOpenClawResult(result.stdout);
  state.deliveredMessageIds.add(messageId);
  await saveState(config.statePath, state);
  console.log(
    JSON.stringify({
      event: 'suggestion_delivered',
      conversationId,
      messageId,
      suggestionId: suggestion?.id ?? 'created-by-openclaw-agent',
      customerName,
    }),
  );
}

async function pollCustomerMessages(
  config: DispatcherConfig,
  state: DispatcherState,
): Promise<void> {
  const conversations = await callSalesData<ConversationListItem[]>(
    config,
    'find_conversations',
    {},
  );
  const hasCheckpoint = Object.keys(state.lastMessageAtByConversation).length > 0;
  if (!hasCheckpoint) {
    for (const conversation of conversations) {
      if (conversation.lastMessageAt) {
        state.lastMessageAtByConversation[conversation.id] = conversation.lastMessageAt;
      }
    }
    await saveState(config.statePath, state);
    console.log(
      JSON.stringify({ event: 'poll_checkpoint_created', conversations: conversations.length }),
    );
    return;
  }

  for (const conversation of conversations) {
    const lastMessageAt = conversation.lastMessageAt ?? '';
    if (!lastMessageAt || state.lastMessageAtByConversation[conversation.id] === lastMessageAt) {
      continue;
    }
    const last = conversation.messages?.[0];
    if (conversation.status !== 'OPEN' || last?.senderType !== 'CUSTOMER') {
      state.lastMessageAtByConversation[conversation.id] = lastMessageAt;
      continue;
    }
    const messages = await callSalesData<ConversationMessage[]>(config, 'get_recent_messages', {
      conversationId: conversation.id,
    });
    const customerMessages = [...messages]
      .reverse()
      .filter((item) => item.senderType === 'CUSTOMER');
    const triggeringMessage =
      customerMessages.find((item) => item.sentAt === last.sentAt) ?? customerMessages[0];
    if (!triggeringMessage) {
      throw new Error(`Cannot resolve triggering message for conversation ${conversation.id}`);
    }
    await dispatchSuggestion(
      config,
      { conversationId: conversation.id, messageId: triggeringMessage.id },
      state,
    );
    state.lastMessageAtByConversation[conversation.id] = lastMessageAt;
    await saveState(config.statePath, state);
  }
}

function loadConfig(): DispatcherConfig {
  const required = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} is required`);
    return value;
  };
  return {
    redisUrl: required('REDIS_URL'),
    suggestionAgentId: required('OPENCLAW_SUGGESTION_AGENT_ID'),
    telegramAccountId: required('OPENCLAW_TELEGRAM_ACCOUNT_ID'),
    telegramTargetId: required('OPENCLAW_TELEGRAM_TARGET_ID'),
    statePath:
      process.env.SUGGESTION_DISPATCHER_STATE_PATH ??
      '/var/lib/tsi-openclaw-suggestion-dispatcher/delivered.json',
    openclawCommand: process.env.OPENCLAW_COMMAND ?? '/usr/local/bin/openclaw',
    salesDataCommand: process.env.TSI_SALES_DATA_COMMAND ?? '/usr/local/bin/tsi-sales-data',
    pollIntervalMs: Number(process.env.SUGGESTION_POLL_INTERVAL_MS ?? 10_000),
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue('reply-suggestion-trigger', { connection });
  const events = new QueueEvents('reply-suggestion-trigger', { connection });
  const state = await loadState(config.statePath);
  let pending = Promise.resolve();

  events.on('completed', ({ jobId }) => {
    pending = pending
      .then(async () => {
        const job = await queue.getJob(jobId);
        if (!job || job.name !== 'request') return;
        await dispatchSuggestion(config, job.data as Record<string, unknown>, state);
      })
      .catch((error) =>
        console.error(
          JSON.stringify({
            event: 'dispatch_failed',
            jobId,
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
  });
  events.on('error', (error) =>
    console.error(JSON.stringify({ event: 'queue_events_error', error: error.message })),
  );
  await events.waitUntilReady();
  console.log(
    JSON.stringify({
      event: 'dispatcher_ready',
      queue: 'reply-suggestion-trigger',
      suggestionAgentId: config.suggestionAgentId,
      telegramAccountId: config.telegramAccountId,
    }),
  );

  let polling = true;
  const poll = async () => {
    while (polling) {
      pending = pending
        .then(() => pollCustomerMessages(config, state))
        .catch((error) =>
          console.error(
            JSON.stringify({
              event: 'poll_failed',
              error: error instanceof Error ? error.message : String(error),
            }),
          ),
        );
      await pending;
      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
    }
  };
  void poll();

  const shutdown = async () => {
    polling = false;
    await pending;
    await Promise.all([events.close(), queue.close()]);
    await connection.quit();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
