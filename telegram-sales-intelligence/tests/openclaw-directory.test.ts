import { describe, expect, it } from 'vitest';
import { parseOpenClawTelegramDirectory } from '../apps/api/src/openclaw-directory.js';

describe('OpenClaw Telegram directory', () => {
  it('accepts a sanitized sale-assistant snapshot', () => {
    const directory = parseOpenClawTelegramDirectory({
      generatedAt: '2026-07-12T08:00:00.000Z',
      accounts: [
        {
          accountId: 'openclaw-sale-8264554740',
          saleTelegramUserId: '8264554740',
          saleName: 'Sales Owner',
          saleUsername: 'sales_owner',
          source: 'OPENCLAW_SALE_BINDING',
          status: 'BOUND_TO_ASSISTANTS',
          openclawAccountIds: ['suggestion'],
          assistantBots: [
            {
              openclawAccountId: 'suggestion',
              telegramBotId: '123',
              botUsername: 'sales_suggestion_bot',
              displayName: 'Sales Suggestion',
              role: 'SUGGESTION',
            },
          ],
        },
      ],
    });

    expect(directory.accounts[0]?.saleTelegramUserId).toBe('8264554740');
    expect(directory.accounts[0]?.assistantBots[0]?.role).toBe('SUGGESTION');
    expect(JSON.stringify(directory)).not.toContain('token');
  });

  it('normalizes legacy allowFrom chats into sale accounts', () => {
    const directory = parseOpenClawTelegramDirectory({
      generatedAt: '2026-07-12T08:00:00.000Z',
      accounts: [
        {
          accountId: 'openclaw-123',
          openclawAccountIds: ['suggestion'],
          telegramBotId: '123',
          botUsername: 'sales_suggestion_bot',
          displayName: 'Sales Suggestion',
          status: 'CONNECTED',
          source: 'OPENCLAW',
          chats: [
            {
              telegramUserId: '8264554740',
              name: 'Sales Owner',
              username: 'sales_owner',
              type: 'private',
              verified: true,
            },
          ],
        },
      ],
    });

    expect(directory.accounts[0]?.accountId).toBe('openclaw-sale-8264554740');
    expect(directory.accounts[0]?.saleName).toBe('Sales Owner');
    expect(directory.accounts[0]?.assistantBots[0]?.openclawAccountId).toBe('suggestion');
  });
});
