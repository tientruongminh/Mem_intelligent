import { describe, expect, it } from 'vitest';
import {
  assertOpenClawResult,
  buildNewSuggestionPrompt,
  buildSuggestionPrompt,
  selectSuggestion,
} from '../apps/worker/src/suggestion-dispatcher.js';

const suggestion = {
  id: 'suggestion-1',
  basedOnToMessageId: 'message-1',
  suggestionText: 'Em gửi anh proposal trong hôm nay nhé.',
  shortRationale: 'Khách vừa yêu cầu proposal.',
  confidence: 0.91,
  status: 'GENERATED',
  generatedAt: '2026-07-12T00:00:00.000Z',
};

describe('suggestion dispatcher', () => {
  it('selects the generated suggestion based on the triggering message', () => {
    expect(
      selectSuggestion(
        [{ ...suggestion, id: 'newer', basedOnToMessageId: 'other-message' }, suggestion],
        'message-1',
      ),
    ).toEqual(suggestion);
  });

  it('builds a customer-specific grounded notification prompt', () => {
    const prompt = buildSuggestionPrompt({
      conversationId: 'conversation-1',
      messageId: 'message-1',
      customerName: 'Nguyễn Văn An',
      customerMessage: 'Gửi anh báo giá nhé.',
      suggestion,
    });
    expect(prompt).toContain('Khach hang: Nguyễn Văn An');
    expect(prompt).toContain('Conversation ID: conversation-1');
    expect(prompt).toContain('get_reply_suggestion_context');
    expect(prompt).toContain(suggestion.suggestionText);
    expect(prompt).toContain('Khong tao suggestion moi');
  });

  it('requires an unsaved automatic suggestion to be persisted against the message', () => {
    const prompt = buildNewSuggestionPrompt({
      conversationId: 'conversation-1',
      messageId: 'message-1',
      customerName: 'Nguyễn Văn An',
      customerMessage: 'Gửi anh báo giá nhé.',
    });
    expect(prompt).toContain('save_reply_suggestion');
    expect(prompt).toContain('basedOnMessageIds');
    expect(prompt).toContain('Message ID: message-1');
    expect(prompt).toContain('Khach hang: Nguyễn Văn An');
  });

  it('rejects failed OpenClaw turns', () => {
    expect(() =>
      assertOpenClawResult(
        JSON.stringify({ status: 'ok', result: { payloads: [{ text: 'LLM request failed' }] } }),
      ),
    ).toThrow('OpenClaw delivery failed');
    expect(() =>
      assertOpenClawResult(
        JSON.stringify({ status: 'ok', result: { payloads: [{ text: 'Đã gửi gợi ý' }] } }),
      ),
    ).not.toThrow();
  });
});
