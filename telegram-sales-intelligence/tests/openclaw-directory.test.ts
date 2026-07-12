import { describe, expect, it } from 'vitest';
import { parseOpenClawTelegramDirectory } from '../apps/api/src/openclaw-directory.js';

describe('OpenClaw Telegram directory', () => {
  it('accepts a sanitized verified private-chat snapshot', () => {
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

    expect(directory.accounts[0]?.chats[0]?.telegramUserId).toBe('8264554740');
    expect(JSON.stringify(directory)).not.toContain('token');
  });

  it('rejects unverified or non-private chats', () => {
    expect(() =>
      parseOpenClawTelegramDirectory({
        generatedAt: '2026-07-12T08:00:00.000Z',
        accounts: [
          {
            accountId: 'openclaw-123',
            openclawAccountIds: ['suggestion'],
            telegramBotId: '123',
            displayName: 'Sales Suggestion',
            status: 'CONNECTED',
            source: 'OPENCLAW',
            chats: [
              {
                telegramUserId: '-100123',
                name: 'A group',
                type: 'group',
                verified: false,
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });
});
