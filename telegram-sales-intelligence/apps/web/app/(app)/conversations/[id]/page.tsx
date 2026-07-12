'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, GitBranch } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, formatDate } from '../../../../lib/api';
import { ReadableText } from '../../../../components/readable-text';
import {
  BackLink,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from '../../../../components/ui';

export default function ConversationDetailPage() {
  const id = String(useParams().id);
  const queryClient = useQueryClient();
  const chatRef = useRef<HTMLDivElement>(null);
  const [outcome, setOutcome] = useState<'WON' | 'LOST' | 'STOPPED'>('WON');
  const [reason, setReason] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const conversation = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => apiFetch<any>(`/conversations/${id}`),
  });
  const messages = useQuery({
    queryKey: ['messages', id],
    queryFn: () => apiFetch<any[]>(`/conversations/${id}/messages`),
  });
  const close = useMutation({
    mutationFn: () =>
      apiFetch(`/conversations/${id}/close`, {
        method: 'POST',
        body: JSON.stringify({ outcome, reason: reason || undefined }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', id] }),
  });

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.data?.length]);

  async function copySuggestion(text: string, suggestionId: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(suggestionId);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  if (conversation.isLoading || messages.isLoading) return <LoadingState />;
  const item = conversation.data;

  return (
    <>
      <BackLink href="/conversations" label="Back to transactions" />
      <PageHeader
        title={item.customer.fullName}
        description={`Transactions #${item.id.slice(0, 8)} · Started ${formatDate(item.startedAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={item.status} />
            <StatusBadge value={item.outcome} />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <SectionCard
          title="Messages"
          description="Synced from the sales rep's Telegram account"
          action={
            <Link
              className="btn-secondary h-9 gap-1.5 px-3 text-xs"
              href={`/conversations/${id}/workflow`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Workflow
            </Link>
          }
        >
          <div ref={chatRef} className="chat-scroll max-h-[680px] space-y-3 overflow-y-auto p-5">
            {messages.data?.map((message) => {
              const outgoing = message.senderType === 'EMPLOYEE';
              return (
                <div
                  key={message.id}
                  className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={outgoing ? 'chat-bubble-out' : 'chat-bubble-in'}>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium">
                        {outgoing ? item.employee.fullName : item.customer.fullName}
                      </span>
                      <span className="text-[11px] text-ink-subtle">
                        {formatDate(message.sentAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">
                      {message.textContent ?? `[${message.messageType}]`}
                    </p>
                    {message.editedAt && (
                      <span className="mt-1 block text-[10px] text-ink-subtle">edited</span>
                    )}
                  </div>
                </div>
              );
            })}
            {!messages.data?.length && (
              <p className="py-8 text-center text-sm text-ink-muted">No messages yet.</p>
            )}
          </div>
        </SectionCard>

        <aside className="panel divide-y divide-line">
          <section className="p-5">
            <h2 className="doc-label">Summary</h2>
            <div className="mt-3">
              {item.summaries?.[0]?.summaryText ? (
                <ReadableText text={item.summaries[0].summaryText} />
              ) : (
                <p className="text-sm text-ink-muted">The worker has not created a summary yet.</p>
              )}
            </div>
            {item.previous?.summaries?.[0] && (
              <div className="mt-6 border-t border-line-subtle pt-5">
                <h3 className="doc-label">Previous transaction</h3>
                <ReadableText text={item.previous.summaries[0].summaryText} className="mt-3" />
              </div>
            )}
          </section>

          <section className="p-5">
            <h2 className="doc-label">Reply suggestions</h2>
            <div className="mt-4 space-y-4">
              {item.suggestions?.map((suggestion: any) => (
                <div key={suggestion.id} className="border-l-2 border-line pl-4">
                  <p className="text-sm font-medium leading-6 text-ink">
                    {suggestion.suggestionText}
                  </p>
                  <p className="mt-1.5 text-sm text-ink-muted">{suggestion.shortRationale}</p>
                  <button
                    type="button"
                    className="btn-ghost mt-2 h-8 gap-1.5 px-0 text-xs"
                    onClick={() => copySuggestion(suggestion.suggestionText, suggestion.id)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedId === suggestion.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
              {!item.suggestions?.length && (
                <p className="text-sm text-ink-muted">No suitable suggestion yet.</p>
              )}
            </div>
          </section>

          {item.status === 'OPEN' && (
            <section className="p-5">
              <h2 className="doc-label text-danger-foreground">Close transaction</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Only a sales rep or manager can confirm this. The system never closes automatically.
              </p>
              <label className="mt-4 block">
                <span className="label">Outcome</span>
                <select
                  className="field"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value as typeof outcome)}
                >
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                  <option value="STOPPED">Stopped</option>
                </select>
              </label>
              <label className="mt-3 block">
                <span className="label">Reason (optional)</span>
                <textarea
                  className="field h-20 py-2"
                  placeholder="Add a note..."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <button
                className="btn-danger mt-3 w-full"
                onClick={() => close.mutate()}
                disabled={close.isPending}
              >
                {close.isPending ? 'Processing...' : 'Confirm close'}
              </button>
              {close.error && <p className="alert-danger mt-2">{close.error.message}</p>}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
