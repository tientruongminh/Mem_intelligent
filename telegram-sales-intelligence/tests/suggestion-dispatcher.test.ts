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
  suggestionText: 'I will send the proposal today.',
  shortRationale: 'The customer just requested a proposal.',
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

  it('does not reuse a generated suggestion from another message', () => {
    expect(
      selectSuggestion([{ ...suggestion, basedOnToMessageId: 'other-message' }], 'message-1'),
    ).toBeUndefined();
  });

  it('builds a customer-specific grounded notification prompt', () => {
    const prompt = buildSuggestionPrompt({
      conversationId: 'conversation-1',
      messageId: 'message-1',
      customerName: 'Alex Nguyen',
      customerMessage: 'Please send me the pricing.',
      suggestion,
    });
    expect(prompt).toContain('Customer: Alex Nguyen');
    expect(prompt).toContain('Conversation ID: conversation-1');
    expect(prompt).toContain('get_reply_suggestion_context');
    expect(prompt).toContain(suggestion.suggestionText);
    expect(prompt).toContain('Do not create a new suggestion');
  });

  it('requires an unsaved automatic suggestion to be persisted against the message', () => {
    const prompt = buildNewSuggestionPrompt({
      conversationId: 'conversation-1',
      messageId: 'message-1',
      customerName: 'Alex Nguyen',
      customerMessage: 'Please send me the pricing.',
    });
    expect(prompt).toContain('save_reply_suggestion');
    expect(prompt).toContain('basedOnMessageIds');
    expect(prompt).toContain('Message ID: message-1');
    expect(prompt).toContain('Customer: Alex Nguyen');
  });

  it('rejects failed OpenClaw turns', () => {
    expect(() =>
      assertOpenClawResult(
        JSON.stringify({ status: 'ok', result: { payloads: [{ text: 'LLM request failed' }] } }),
      ),
    ).toThrow('OpenClaw delivery failed');
    expect(() =>
      assertOpenClawResult(
        JSON.stringify({ status: 'ok', result: { payloads: [{ text: 'Suggestion sent' }] } }),
      ),
    ).not.toThrow();
  });
});
