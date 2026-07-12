import { ForbiddenError } from './errors.js';
import type {
  ActorContext,
  Conversation,
  ConversationMessage,
  EmployeeMetricInput,
  EmployeeMetricResult,
} from './types.js';

export function canCloseConversation(actor: ActorContext, conversation: Conversation): boolean {
  return (
    actor.role === 'OWNER' ||
    actor.role === 'ADMIN' ||
    actor.role === 'MANAGER' ||
    (actor.role === 'SALE' && actor.employeeId === conversation.employeeId)
  );
}

export function assertCanCloseConversation(actor: ActorContext, conversation: Conversation): void {
  if (!canCloseConversation(actor, conversation)) {
    throw new ForbiddenError(
      'Only the assigned sale, manager, admin or owner can close this conversation',
    );
  }
}

const meaninglessMessages = /^(ok|okay|oki|uh|uhm|👍|👌|🙂|😊|❤️|❤|thanks|thank you)[.!\s]*$/iu;

export function shouldTriggerSuggestion(input: {
  conversation: Conversation;
  messages: ConversationMessage[];
  hasSuggestionForRange: boolean;
}): boolean {
  if (input.conversation.status !== 'OPEN' || input.hasSuggestionForRange) return false;
  const last = input.messages.at(-1);
  if (!last || last.senderType !== 'CUSTOMER' || last.messageType !== 'TEXT') return false;
  const text = last.textContent?.trim() ?? '';
  return text.length >= 2 && !meaninglessMessages.test(text);
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? null);
}

export function calculateEmployeeMetrics(input: EmployeeMetricInput): EmployeeMetricResult {
  const wonCount = input.outcomes.filter((value) => value === 'WON').length;
  const lostCount = input.outcomes.filter((value) => value === 'LOST').length;
  const stoppedCount = input.outcomes.filter((value) => value === 'STOPPED').length;
  const closedConversations = wonCount + lostCount + stoppedCount;
  return {
    assignedCustomers: input.assignedCustomers,
    activeConversations: input.activeConversations,
    closedConversations,
    wonCount,
    lostCount,
    stoppedCount,
    conversionRate: closedConversations ? wonCount / closedConversations : 0,
    averageFirstResponseSeconds: average(input.firstResponseDurationsSeconds),
    averageCloseSeconds: average(input.closedDurationsSeconds),
    medianCloseSeconds: median(input.closedDurationsSeconds),
  };
}

export function normalizeWorkflowTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
