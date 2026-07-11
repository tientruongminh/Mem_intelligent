'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, GitBranch, LockKeyhole, MessageSquareText } from 'lucide-react';
import { useState } from 'react';
import { apiFetch, formatDate } from '../../../../lib/api';
import { LoadingState, PageHeader, StatusBadge } from '../../../../components/ui';

export default function ConversationDetailPage() {
  const id = String(useParams().id);
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<'WON' | 'LOST' | 'STOPPED'>('WON');
  const [reason, setReason] = useState('');
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
  if (conversation.isLoading || messages.isLoading) return <LoadingState />;
  const item = conversation.data;
  return (
    <>
      <Link
        href="/conversations"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-teal"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Link>
      <PageHeader
        title={item.customer.fullName}
        description={`Conversation ${item.id.slice(0, 8)} · ${formatDate(item.startedAt)}`}
        actions={
          <div className="flex gap-2">
            <StatusBadge value={item.status} />
            <StatusBadge value={item.outcome} />
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="font-semibold">Messages timeline</h2>
              <p className="text-xs text-[#778195]">Đồng bộ từ tài khoản Telegram của sale</p>
            </div>
            <Link className="btn-secondary" href={`/conversations/${id}/workflow`}>
              <GitBranch className="h-4 w-4" />
              Workflow
            </Link>
          </div>
          <div className="max-h-[680px] space-y-4 overflow-y-auto p-5">
            {messages.data?.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderType === 'EMPLOYEE' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[78%] border px-4 py-3 ${message.senderType === 'EMPLOYEE' ? 'border-[#aad8dc] bg-[#e8f7f8]' : 'border-line bg-[#f7f8fa]'}`}
                  style={{ borderRadius: 8 }}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-semibold">
                      {message.senderType === 'EMPLOYEE'
                        ? item.employee.fullName
                        : item.customer.fullName}
                    </span>
                    <span className="text-[11px] text-[#778195]">{formatDate(message.sentAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {message.textContent ?? `[${message.messageType}]`}
                  </p>
                  {message.editedAt && <span className="text-[10px] text-[#778195]">đã sửa</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="space-y-5">
          <section className="panel p-5">
            <h2 className="font-semibold">Current summary</h2>
            <p className="mt-3 text-sm leading-6 text-[#667085]">
              {item.summaries?.[0]?.summaryText ?? 'Worker chưa tạo summary.'}
            </p>
            {item.previous?.summaries?.[0] && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase text-[#778195]">
                  Previous conversation
                </p>
                <p className="mt-2 text-sm leading-6 text-[#667085]">
                  {item.previous.summaries[0].summaryText}
                </p>
              </div>
            )}
          </section>
          <section className="panel p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-teal" />
              <h2 className="font-semibold">Reply suggestions</h2>
            </div>
            <div className="mt-4 space-y-3">
              {item.suggestions?.map((suggestion: any) => (
                <div
                  key={suggestion.id}
                  className="border border-line bg-[#f8fafc] p-3"
                  style={{ borderRadius: 6 }}
                >
                  <p className="text-sm leading-6">{suggestion.suggestionText}</p>
                  <p className="mt-2 text-xs text-[#667085]">{suggestion.shortRationale}</p>
                </div>
              ))}
              {!item.suggestions?.length && (
                <p className="text-sm text-[#667085]">Chưa có gợi ý phù hợp.</p>
              )}
            </div>
          </section>
          {item.status === 'OPEN' && (
            <section className="panel border-[#efc0b4] p-5">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-coral" />
                <h2 className="font-semibold">Đóng conversation</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#667085]">
                Chỉ sale/manager xác nhận kết quả. AI không thể thực hiện thao tác này.
              </p>
              <select
                className="field mt-4"
                value={outcome}
                onChange={(event) => setOutcome(event.target.value as any)}
              >
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
                <option value="STOPPED">STOPPED</option>
              </select>
              <textarea
                className="field mt-3 h-20 py-2"
                placeholder="Lý do (không bắt buộc)"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <button
                className="btn-danger mt-3 w-full"
                onClick={() => close.mutate()}
                disabled={close.isPending}
              >
                Xác nhận đóng
              </button>
              {close.error && <p className="mt-2 text-xs text-[#a33b25]">{close.error.message}</p>}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
