'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, MessageCircleMore, Plus } from 'lucide-react';
import { apiFetch, formatDate } from '../../../lib/api';
import { StaggerGrid, StaggerItem, SlideOver } from '../../../components/motion';
import {
  EmptyState,
  PageHeader,
  SearchField,
  SkeletonTable,
} from '../../../components/ui';

export default function CustomersPage() {
  const router = useRouter();
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
        title="Khách hàng"
        description="Khách hàng Telegram đang được đội ngũ theo dõi và tư vấn."
        meta={customers.data ? `${customers.data.length} khách` : undefined}
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <SearchField
              className="min-w-56 flex-1"
              value={search}
              onChange={setSearch}
              placeholder="Tìm theo tên hoặc @username"
            />
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm khách hàng
            </button>
          </div>
        }
      />

      {customers.isLoading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : !customers.data?.length ? (
        <EmptyState
          text="Chưa có khách hàng nào. Kết nối Telegram và chọn chat để bắt đầu theo dõi."
          action={
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm khách hàng
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Telegram</th>
                <th className="col-hide-sm">Sale phụ trách</th>
                <th className="col-hide-lg">Loại khách</th>
                <th className="col-hide-lg">Sản phẩm</th>
                <th className="col-hide-sm">Đang tư vấn</th>
                <th className="col-hide-sm">Tương tác gần nhất</th>
                <th>Lead score</th>
                <th aria-hidden />
              </tr>
            </thead>
            <tbody>
              {customers.data.map((item) => (
                <tr
                  key={item.id}
                  className="row-link"
                  onClick={() => router.push(`/customers/${item.id}`)}
                >
                  <td className="font-medium">{item.fullName}</td>
                  <td className="text-ink-muted">
                    {item.telegramUsername ? `@${item.telegramUsername}` : 'Chưa có'}
                  </td>
                  <td className="col-hide-sm">{item.ownerEmployee.fullName}</td>
                  <td className="col-hide-lg">{item.customerType ?? 'Chưa phân loại'}</td>
                  <td className="col-hide-lg">{item.productInterest ?? 'Chưa có'}</td>
                  <td className="col-hide-sm tabular-nums">{item.conversations.length}</td>
                  <td className="col-hide-sm whitespace-nowrap text-ink-muted">
                    {formatDate(item.lastContactAt)}
                  </td>
                  <td>
                    <span className="font-semibold tabular-nums text-accent">
                      {item.leadScore ?? 'Chưa có'}
                    </span>
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <Link
                      className="btn-secondary h-8 gap-1.5 px-2.5 text-xs"
                      aria-label={`Xem ${item.fullName}`}
                      href={`/customers/${item.id}`}
                    >
                      Chi tiết
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SlideOver open={open} onClose={() => setOpen(false)}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-surface/95 px-5 py-4 backdrop-blur-md">
          <div>
            <h2 className="font-semibold tracking-tight">Thêm khách hàng từ Telegram</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Chọn tài khoản, sau đó chọn private chat cần theo dõi.
            </p>
          </div>
          <button className="btn-secondary h-8 px-3 text-xs" onClick={() => setOpen(false)}>
            Đóng
          </button>
        </div>
        <div className="p-5">
          {sessions.isLoading ? (
            <SkeletonTable rows={3} cols={3} />
          ) : connected.length === 0 ? (
            <EmptyState
              text="Chưa có tài khoản Telegram đang kết nối."
              action={
                <Link href="/integrations/telegram" className="btn-primary">
                  Kết nối Telegram
                </Link>
              }
            />
          ) : (
            <>
              <label className="block">
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
                    <p className="text-sm font-medium text-ink">Private chats</p>
                    <button className="text-sm font-medium text-accent" onClick={() => chats.refetch()}>
                      Làm mới
                    </button>
                  </div>
                  {chats.isLoading ? (
                    <SkeletonTable rows={4} cols={2} />
                  ) : !chats.data?.length ? (
                    <EmptyState text="Không tìm thấy private chat trong tài khoản này." />
                  ) : (
                    <StaggerGrid className="space-y-2">
                      {chats.data.map((chat) => (
                        <StaggerItem
                          key={chat.telegramUserId}
                          className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:bg-canvas-subtle/70"
                        >
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-muted font-semibold text-accent">
                            {chat.name?.slice(0, 1)?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{chat.name}</p>
                            <p className="truncate text-xs text-ink-muted">
                              {chat.username ? `@${chat.username}` : chat.lastMessage}
                            </p>
                          </div>
                          <button
                            className="btn-primary h-9 shrink-0 px-3 text-xs"
                            disabled={track.isPending}
                            onClick={() => track.mutate(chat.telegramUserId)}
                          >
                            <MessageCircleMore className="h-3.5 w-3.5" /> Theo dõi
                          </button>
                        </StaggerItem>
                      ))}
                    </StaggerGrid>
                  )}
                </div>
              )}
              {track.isSuccess && (
                <p className="alert-success mt-4">Đã thêm khách hàng và bắt đầu đồng bộ tin nhắn.</p>
              )}
              {track.error && <p className="alert-danger mt-4">{track.error.message}</p>}
            </>
          )}
        </div>
      </SlideOver>
    </>
  );
}
