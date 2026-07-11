'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, MessageCircleMore, Plus, Search, X } from 'lucide-react';
import { apiFetch, formatDate } from '../../../lib/api';
import { EmptyState, LoadingState, PageHeader } from '../../../components/ui';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const customers = useQuery({
    queryKey: ['customers', search],
    queryFn: () => apiFetch<any[]>(`/customers?${new URLSearchParams(search ? { search } : {})}`),
  });
  const sessions = useQuery({
    queryKey: ['telegram-sessions'],
    queryFn: () => apiFetch<any[]>('/telegram/sessions'),
    enabled: open,
  });
  const chats = useQuery({
    queryKey: ['telegram-chats', sessionId],
    queryFn: () => apiFetch<any[]>(`/telegram/sessions/${sessionId}/chats`),
    enabled: open && Boolean(sessionId),
  });
  const track = useMutation({
    mutationFn: (telegramUserId: string) =>
      apiFetch(`/telegram/sessions/${sessionId}/chats/${telegramUserId}/track`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['telegram-chats', sessionId] });
    },
  });
  const connected = sessions.data?.filter((session) => session.status === 'CONNECTED') ?? [];

  return (
    <>
      <PageHeader
        title="Manage Customer"
        description="Khách hàng Telegram đang được đội ngũ theo dõi và tư vấn."
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#8a95a5]" />
              <input
                className="field pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm khách hàng"
              />
            </div>
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm khách hàng
            </button>
          </div>
        }
      />
      {customers.isLoading ? (
        <LoadingState />
      ) : !customers.data?.length ? (
        <EmptyState text="Chọn một chat Telegram để bắt đầu quản lý." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Telegram</th>
                <th>Sale phụ trách</th>
                <th>Loại khách</th>
                <th>Sản phẩm</th>
                <th>Đang tư vấn</th>
                <th>Tương tác gần nhất</th>
                <th>Lead score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.data.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">{item.fullName}</td>
                  <td className="text-[#667085]">
                    {item.telegramUsername ? `@${item.telegramUsername}` : '—'}
                  </td>
                  <td>{item.ownerEmployee.fullName}</td>
                  <td>{item.customerType ?? 'Chưa phân loại'}</td>
                  <td>{item.productInterest ?? '—'}</td>
                  <td>{item.conversations.length}</td>
                  <td className="whitespace-nowrap">{formatDate(item.lastContactAt)}</td>
                  <td>
                    <span className="font-semibold text-teal">{item.leadScore ?? '—'}</span>
                  </td>
                  <td>
                    <Link
                      className="btn-secondary h-8 w-8 px-0"
                      title="Xem khách hàng"
                      href={`/customers/${item.id}`}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/35"
            aria-label="Đóng"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-line bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-white px-5 py-4">
              <div>
                <h2 className="font-semibold">Thêm khách hàng từ Telegram</h2>
                <p className="mt-1 text-sm text-[#667085]">
                  Chọn tài khoản rồi chọn private chat cần theo dõi.
                </p>
              </div>
              <button
                className="btn-secondary h-8 w-8 px-0"
                title="Đóng"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {sessions.isLoading ? (
                <LoadingState />
              ) : connected.length === 0 ? (
                <div className="border border-line bg-[#f8fafc] p-5 text-center">
                  <p className="text-sm text-[#667085]">Chưa có tài khoản Telegram đang kết nối.</p>
                  <Link href="/integrations/telegram" className="btn-primary mt-4">
                    Mở Telegram Setup
                  </Link>
                </div>
              ) : (
                <>
                  <label>
                    <span className="label">Tài khoản Telegram</span>
                    <select
                      className="field"
                      value={sessionId}
                      onChange={(event) => setSessionId(event.target.value)}
                    >
                      <option value="">Chọn tài khoản</option>
                      {connected.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.username ? `@${session.username}` : session.phoneMasked}
                        </option>
                      ))}
                    </select>
                  </label>
                  {sessionId && (
                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase text-[#667085]">
                          Private chats
                        </p>
                        <button
                          className="text-xs font-semibold text-teal"
                          onClick={() => chats.refetch()}
                        >
                          Làm mới
                        </button>
                      </div>
                      {chats.isLoading ? (
                        <LoadingState />
                      ) : !chats.data?.length ? (
                        <EmptyState text="Không tìm thấy private chat." />
                      ) : (
                        <div className="divide-y divide-line border-y border-line">
                          {chats.data.map((chat) => (
                            <div key={chat.telegramUserId} className="flex items-center gap-3 py-4">
                              <div
                                className="grid h-10 w-10 shrink-0 place-items-center bg-[#edf2f8] font-bold text-[#365f9d]"
                                style={{ borderRadius: 6 }}
                              >
                                {chat.name?.slice(0, 1)?.toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{chat.name}</p>
                                <p className="truncate text-xs text-[#667085]">
                                  {chat.username ? `@${chat.username}` : chat.lastMessage}
                                </p>
                              </div>
                              <button
                                className="btn-primary h-8"
                                disabled={track.isPending}
                                onClick={() => track.mutate(chat.telegramUserId)}
                              >
                                <MessageCircleMore className="h-3.5 w-3.5" /> Theo dõi
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {track.isSuccess && (
                    <p className="mt-4 border border-[#9ed7c6] bg-[#e9f8f2] p-3 text-sm text-[#146c50]">
                      Đã thêm khách hàng và bắt đầu đồng bộ tin nhắn.
                    </p>
                  )}
                  {track.error && (
                    <p className="mt-4 text-sm text-[#a33b25]">{track.error.message}</p>
                  )}
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
