import express, { type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import { EditedMessage } from 'telegram/events/EditedMessage.js';
import { DeletedMessage } from 'telegram/events/DeletedMessage.js';
import { computeCheck } from 'telegram/Password.js';
import { z } from 'zod';
import { AesGcmEncryptionService } from '@tsi/infrastructure';
import { loadEnv, logger } from '@tsi/shared';

interface CollectorActor {
  organizationId: string;
  employeeId: string;
  role: string;
}
interface SessionState {
  id: string;
  actor: CollectorActor;
  phone: string;
  phoneMasked: string;
  client?: TelegramClient;
  phoneCodeHash?: string;
  status: 'PENDING' | 'CONNECTED' | 'NEEDS_PASSWORD' | 'DISCONNECTED';
  tracked: Map<string, { name: string; username?: string }>;
  messageOwners: Map<string, string>;
  listenersAttached?: boolean;
}

const env = loadEnv();
const encryption = new AesGcmEncryptionService(env.ENCRYPTION_KEY);
const sessions = new Map<string, SessionState>();
const fakeMode = !env.TELEGRAM_API_ID || !env.TELEGRAM_API_HASH;
const app = express();
app.use(express.json({ limit: '256kb' }));

const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(handler(req, res)).catch(next);

function requireInternal(req: Request, res: Response, next: NextFunction) {
  if (req.headers['x-internal-service-token'] !== env.INTERNAL_SERVICE_TOKEN) {
    return res.status(401).json({ error: 'invalid service token' });
  }
  next();
}

function getActor(req: Request): CollectorActor {
  const encoded = req.headers['x-actor-context'];
  if (typeof encoded !== 'string') throw new Error('Missing actor context');
  return z
    .object({ organizationId: z.string().uuid(), employeeId: z.string().uuid(), role: z.string() })
    .parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
}

function getSession(req: Request): SessionState {
  const state = sessions.get(String(req.params.id));
  if (!state) throw new Error('Collector session not found or expired');
  const actor = getActor(req);
  if (
    state.actor.organizationId !== actor.organizationId ||
    state.actor.employeeId !== actor.employeeId
  ) {
    throw new Error('Session is outside actor scope');
  }
  return state;
}

app.get('/health', (_req, res) => res.json({ status: 'ok', fakeMode }));
app.use(requireInternal);

app.post(
  '/sessions',
  asyncRoute(async (req, res) => {
    const actor = getActor(req);
    const { phone } = z.object({ phone: z.string().min(7).max(24) }).parse(req.body);
    const id = randomUUID();
    const phoneMasked = `${phone.slice(0, 3)}${'*'.repeat(Math.max(3, phone.length - 6))}${phone.slice(-3)}`;
    sessions.set(id, {
      id,
      actor,
      phone,
      phoneMasked,
      status: 'PENDING',
      tracked: new Map(),
      messageOwners: new Map(),
    });
    res.status(201).json({ id, phoneMasked, status: 'PENDING', fakeMode });
  }),
);

app.post(
  '/sessions/:id/send-code',
  asyncRoute(async (req, res) => {
    const state = getSession(req);
    if (fakeMode) return res.json({ status: 'CODE_SENT', demoCode: '12345' });
    const client = new TelegramClient(
      new StringSession(''),
      env.TELEGRAM_API_ID!,
      env.TELEGRAM_API_HASH!,
      { connectionRetries: 5 },
    );
    await client.connect();
    const sent = await client.sendCode(
      { apiId: env.TELEGRAM_API_ID!, apiHash: env.TELEGRAM_API_HASH! },
      state.phone,
    );
    state.client = client;
    state.phoneCodeHash = sent.phoneCodeHash;
    res.json({ status: 'CODE_SENT' });
  }),
);

app.post(
  '/sessions/:id/verify-code',
  asyncRoute(async (req, res) => {
    const state = getSession(req);
    const { code } = z.object({ code: z.string().min(3).max(12) }).parse(req.body);
    if (fakeMode) {
      if (code !== '12345') return res.status(400).json({ error: 'Invalid demo code' });
      state.status = 'CONNECTED';
      await persistConnected(state, 'fake-string-session', 'demo-sale', '100001');
      return res.json({ status: 'CONNECTED', username: 'demo-sale' });
    }
    if (!state.client || !state.phoneCodeHash) throw new Error('send-code must be called first');
    try {
      const authorization = await state.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: state.phone,
          phoneCodeHash: state.phoneCodeHash,
          phoneCode: code,
        }),
      );
      state.status = 'CONNECTED';
      await afterConnected(state, authorization);
      res.json({ status: 'CONNECTED' });
    } catch (error: any) {
      if (String(error?.errorMessage ?? error?.message).includes('SESSION_PASSWORD_NEEDED')) {
        state.status = 'NEEDS_PASSWORD';
        return res.json({ status: 'NEEDS_PASSWORD' });
      }
      throw error;
    }
  }),
);

app.post(
  '/sessions/:id/verify-password',
  asyncRoute(async (req, res) => {
    const state = getSession(req);
    const { password } = z.object({ password: z.string().min(1).max(200) }).parse(req.body);
    if (fakeMode) {
      state.status = 'CONNECTED';
      await persistConnected(state, 'fake-string-session', 'demo-sale', '100001');
      return res.json({ status: 'CONNECTED' });
    }
    if (!state.client) throw new Error('Telegram client is not initialized');
    const passwordInfo = await state.client.invoke(new Api.account.GetPassword());
    const passwordCheck = await computeCheck(passwordInfo, password);
    const authorization = await state.client.invoke(
      new Api.auth.CheckPassword({ password: passwordCheck }),
    );
    state.status = 'CONNECTED';
    await afterConnected(state, authorization);
    res.json({ status: 'CONNECTED' });
  }),
);

app.get(
  '/sessions/:id/chats',
  asyncRoute(async (req, res) => {
    const state = getSession(req);
    if (fakeMode) {
      return res.json([
        {
          telegramUserId: '200001',
          name: 'Nguyễn Văn An',
          username: 'an_demo',
          lastMessage: 'Cho anh xin báo giá nhé',
          unreadCount: 1,
        },
        {
          telegramUserId: '200002',
          name: 'Trần Minh Hà',
          username: 'ha_demo',
          lastMessage: 'Cảm ơn em',
          unreadCount: 0,
        },
      ]);
    }
    if (!state.client || state.status !== 'CONNECTED')
      throw new Error('Telegram session is not connected');
    const dialogs = await state.client.getDialogs({ limit: 100 });
    res.json(
      dialogs
        .filter((dialog) => dialog.isUser)
        .map((dialog: any) => ({
          telegramUserId: String(dialog.entity?.id ?? dialog.id),
          name: dialog.name,
          username: dialog.entity?.username,
          lastMessage: dialog.message?.message,
          unreadCount: dialog.unreadCount,
        })),
    );
  }),
);

app.post(
  '/sessions/:id/chats/:telegramUserId/track',
  asyncRoute(async (req, res) => {
    const state = getSession(req);
    const telegramUserId = String(req.params.telegramUserId);
    if (fakeMode) {
      const chat =
        telegramUserId === '200002'
          ? { name: 'Trần Minh Hà', username: 'ha_demo' }
          : { name: 'Nguyễn Văn An', username: 'an_demo' };
      state.tracked.set(telegramUserId, chat);
      const samples = [
        ['CUSTOMER', 'Chào em, anh đang tìm giải pháp quản lý đội sales.'],
        ['EMPLOYEE', 'Em chào anh, đội của anh hiện có bao nhiêu người ạ?'],
        ['CUSTOMER', 'Khoảng 12 người. Cho anh xin báo giá và thời gian triển khai nhé.'],
      ] as const;
      for (const [index, sample] of samples.entries()) {
        await ingest(
          state,
          telegramUserId,
          chat,
          `fake-${telegramUserId}-${index + 1}`,
          sample[0],
          sample[1],
          new Date(Date.now() - (samples.length - index) * 60_000),
        );
      }
      return res.status(201).json({ tracked: true, syncedMessages: samples.length });
    }
    if (!state.client || state.status !== 'CONNECTED')
      throw new Error('Telegram session is not connected');
    const entity: any = await state.client.getEntity(telegramUserId);
    const chat = {
      name:
        [entity.firstName, entity.lastName].filter(Boolean).join(' ') ||
        entity.username ||
        telegramUserId,
      username: entity.username,
    };
    state.tracked.set(telegramUserId, chat);
    const history = await state.client.getMessages(entity, { limit: 100 });
    for (const message of [...history].reverse()) {
      await ingest(
        state,
        telegramUserId,
        chat,
        String(message.id),
        message.out ? 'EMPLOYEE' : 'CUSTOMER',
        message.message ?? null,
        new Date(Number(message.date) * 1000),
      );
    }
    attachListeners(state);
    res.status(201).json({ tracked: true, syncedMessages: history.length });
  }),
);

app.delete(
  '/sessions/:id',
  asyncRoute(async (req, res) => {
    const state = getSession(req);
    await state.client?.disconnect();
    state.status = 'DISCONNECTED';
    sessions.delete(state.id);
    res.status(204).end();
  }),
);

async function afterConnected(state: SessionState, authorization: any) {
  const me: any = 'user' in authorization ? authorization.user : await state.client!.getMe();
  const serialized = (state.client!.session as StringSession).save();
  await persistConnected(state, serialized, me.username, String(me.id));
}

async function persistConnected(
  state: SessionState,
  serialized: string,
  username?: string,
  telegramUserId?: string,
) {
  await fetch(`${env.INTERNAL_API_URL}/internal/telegram/sessions/${state.id}/connected`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-service-token': env.INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify({
      actor: state.actor,
      encryptedSession: encryption.encrypt(serialized),
      username,
      telegramUserId,
    }),
  });
}

function attachListeners(state: SessionState) {
  if (state.listenersAttached) return;
  state.listenersAttached = true;
  const client = state.client!;
  client.addEventHandler(async (event: any) => {
    const message = event.message;
    const peerId = String(message.chatId ?? message.peerId?.userId ?? '');
    const chat = state.tracked.get(peerId);
    if (chat)
      await ingest(
        state,
        peerId,
        chat,
        String(message.id),
        message.out ? 'EMPLOYEE' : 'CUSTOMER',
        message.message ?? null,
        message.date,
        'NEW',
      );
  }, new NewMessage({}));
  client.addEventHandler(async (event: any) => {
    const message = event.message;
    const peerId = String(message.chatId ?? message.peerId?.userId ?? '');
    const chat = state.tracked.get(peerId);
    if (chat)
      await ingest(
        state,
        peerId,
        chat,
        String(message.id),
        message.out ? 'EMPLOYEE' : 'CUSTOMER',
        message.message ?? null,
        message.date,
        'EDITED',
      );
  }, new EditedMessage({}));
  client.addEventHandler(async (event: any) => {
    for (const deletedId of event.deletedIds ?? []) {
      const telegramMessageId = String(deletedId);
      const peerId = state.messageOwners.get(telegramMessageId);
      const chat = peerId ? state.tracked.get(peerId) : undefined;
      if (peerId && chat) {
        await ingest(
          state,
          peerId,
          chat,
          telegramMessageId,
          'CUSTOMER',
          null,
          new Date(),
          'DELETED',
        );
      }
    }
  }, new DeletedMessage({}));
}

async function restoreConnectedSessions() {
  if (fakeMode) return;
  const response = await fetch(`${env.INTERNAL_API_URL}/internal/telegram/sessions/connected`, {
    headers: { 'x-internal-service-token': env.INTERNAL_SERVICE_TOKEN },
  });
  if (!response.ok) throw new Error(`Cannot restore Telegram sessions (${response.status})`);
  const persisted = (await response.json()) as Array<any>;
  for (const item of persisted) {
    try {
      const serialized = encryption.decrypt(String(item.encryptedSession));
      const client = new TelegramClient(
        new StringSession(serialized),
        env.TELEGRAM_API_ID!,
        env.TELEGRAM_API_HASH!,
        { connectionRetries: 5 },
      );
      await client.connect();
      if (!(await client.isUserAuthorized())) {
        logger.warn({ sessionId: item.id }, 'Stored Telegram session is no longer authorized');
        await client.disconnect();
        continue;
      }
      const state: SessionState = {
        id: item.id,
        actor: {
          organizationId: item.organizationId,
          employeeId: item.employeeId,
          role: 'SALE',
        },
        phone: item.phoneMasked,
        phoneMasked: item.phoneMasked,
        client,
        status: 'CONNECTED',
        tracked: new Map(
          item.customers.map((customer: any) => [
            String(customer.telegramUserId),
            { name: customer.fullName, username: customer.telegramUsername ?? undefined },
          ]),
        ),
        messageOwners: new Map(),
      };
      sessions.set(state.id, state);
      attachListeners(state);
      logger.info(
        { sessionId: state.id, trackedChats: state.tracked.size },
        'Telegram session restored',
      );
    } catch (error) {
      logger.error({ err: error, sessionId: item.id }, 'Failed to restore Telegram session');
    }
  }
}

async function ingest(
  state: SessionState,
  telegramUserId: string,
  chat: { name: string; username?: string },
  telegramMessageId: string,
  senderType: 'CUSTOMER' | 'EMPLOYEE',
  textContent: string | null,
  sentAt: Date,
  eventType: 'NEW' | 'EDITED' | 'DELETED' = 'NEW',
) {
  state.messageOwners.set(telegramMessageId, telegramUserId);
  const response = await fetch(`${env.INTERNAL_API_URL}/internal/telegram/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-service-token': env.INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify({
      organizationId: state.actor.organizationId,
      employeeId: state.actor.employeeId,
      telegramUserSessionId: state.id,
      telegramUserId,
      telegramUsername: chat.username,
      customerName: chat.name,
      telegramMessageId,
      senderType,
      messageType: 'TEXT',
      textContent,
      sentAt: sentAt.toISOString(),
      eventType,
    }),
  });
  if (!response.ok)
    logger.error(
      { status: response.status, sessionId: state.id, telegramMessageId },
      'Core API rejected Telegram message',
    );
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: error }, 'Collector request failed');
  res.status(400).json({ error: error instanceof Error ? error.message : 'Collector error' });
});

app.listen(4100, '0.0.0.0', () => {
  logger.info({ port: 4100, fakeMode }, 'Telegram collector listening');
  restoreConnectedSessions().catch((error) =>
    logger.error({ err: error }, 'Telegram restore bootstrap failed'),
  );
});
