'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, LogOut, MessageCircleMore, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch, formatDate } from '../../../../lib/api';
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '../../../../components/ui';

export default function TelegramPage() {
  const client = useQueryClient();
  const [phone, setPhone] = useState('+84901234567');
  const [code, setCode] = useState('12345');
  const [password, setPassword] = useState('');
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [step, setStep] = useState<'PHONE' | 'CODE' | 'PASSWORD' | 'CHATS'>('PHONE');
  const [fakeMode, setFakeMode] = useState<boolean | null>(null);
  const sessions = useQuery({
    queryKey: ['telegram-sessions'],
    queryFn: () => apiFetch<any[]>('/telegram/sessions'),
  });
  const chats = useQuery({
    queryKey: ['telegram-chats', activeSession],
    queryFn: () => apiFetch<any[]>(`/telegram/sessions/${activeSession}/chats`),
    enabled: Boolean(activeSession && step === 'CHATS'),
  });
  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) =>
      apiFetch<any>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['telegram-sessions'] }),
  });

  async function connect() {
    const created = await action.mutateAsync({ path: '/telegram/sessions', body: { phone } });
    setFakeMode(Boolean(created.fakeMode));
    setActiveSession(created.id);
    await action.mutateAsync({ path: `/telegram/sessions/${created.id}/send-code` });
    setStep('CODE');
  }
  async function verifyCode() {
    const result = await action.mutateAsync({
      path: `/telegram/sessions/${activeSession}/verify-code`,
      body: { code },
    });
    setStep(result.status === 'NEEDS_PASSWORD' ? 'PASSWORD' : 'CHATS');
  }
  async function verifyPassword() {
    await action.mutateAsync({
      path: `/telegram/sessions/${activeSession}/verify-password`,
      body: { password },
    });
    setStep('CHATS');
  }

  return (
    <>
      <PageHeader
        title="Telegram Setup"
        description="Kết nối tài khoản cá nhân và chọn private chat cần quản lý."
        actions={
          <div className="flex items-center gap-2 text-xs text-[#667085]">
            <ShieldCheck className="h-4 w-4 text-teal" /> OTP và mật khẩu 2FA không được lưu
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="panel overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-semibold">Tài khoản đã kết nối</h2>
          </div>
          {sessions.isLoading ? (
            <div className="p-5">
              <LoadingState />
            </div>
          ) : !sessions.data?.length ? (
            <div className="p-5">
              <EmptyState text="Chưa có tài khoản Telegram." />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {sessions.data.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {session.username ? `@${session.username}` : session.phoneMasked}
                      </p>
                      <StatusBadge value={session.status} />
                    </div>
                    <p className="mt-1 text-xs text-[#667085]">
                      Đồng bộ gần nhất: {formatDate(session.lastSyncedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      title="Mở danh sách chat"
                      onClick={() => {
                        setActiveSession(session.id);
                        setStep('CHATS');
                      }}
                    >
                      <RefreshCw className="h-4 w-4" /> Chats
                    </button>
                    <button
                      className="btn-secondary h-9 w-9 px-0"
                      title="Ngắt kết nối"
                      onClick={async () => {
                        await apiFetch(`/telegram/sessions/${session.id}`, { method: 'DELETE' });
                        client.invalidateQueries({ queryKey: ['telegram-sessions'] });
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="panel p-5">
          <div className="mb-5 flex items-center gap-3">
            <span
              className="grid h-9 w-9 place-items-center bg-[#e7f6f8] text-teal"
              style={{ borderRadius: 6 }}
            >
              <Link2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold">Kết nối Telegram</h2>
              <p className="text-xs text-[#667085]">
                {fakeMode === null
                  ? 'Tự động dùng chế độ thật khi server có API ID/hash'
                  : fakeMode
                    ? 'Demo mode · OTP 12345'
                    : 'Telegram thật · OTP từ ứng dụng Telegram'}
              </p>
            </div>
          </div>
          {step === 'PHONE' && (
            <div>
              <label>
                <span className="label">Số điện thoại</span>
                <input
                  className="field"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
              <button
                className="btn-primary mt-4 w-full"
                onClick={connect}
                disabled={action.isPending}
              >
                Gửi OTP
              </button>
            </div>
          )}
          {step === 'CODE' && (
            <div>
              <label>
                <span className="label">OTP Telegram</span>
                <input
                  className="field"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                />
              </label>
              <button
                className="btn-primary mt-4 w-full"
                onClick={verifyCode}
                disabled={action.isPending}
              >
                Xác nhận OTP
              </button>
            </div>
          )}
          {step === 'PASSWORD' && (
            <div>
              <label>
                <span className="label">Mật khẩu 2FA</span>
                <input
                  className="field"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button
                className="btn-primary mt-4 w-full"
                onClick={verifyPassword}
                disabled={action.isPending}
              >
                Xác nhận 2FA
              </button>
            </div>
          )}
          {step === 'CHATS' && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="label mb-0">Private chats</span>
                <button className="text-xs font-semibold text-teal" onClick={() => chats.refetch()}>
                  Làm mới
                </button>
              </div>
              {chats.isLoading ? (
                <p className="py-6 text-center text-sm text-[#667085]">Đang tải...</p>
              ) : (
                <div className="space-y-2">
                  {chats.data?.map((chat) => (
                    <div
                      key={chat.telegramUserId}
                      className="border border-line p-3"
                      style={{ borderRadius: 6 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{chat.name}</p>
                          <p className="truncate text-xs text-[#667085]">
                            {chat.username ? `@${chat.username}` : chat.lastMessage}
                          </p>
                        </div>
                        <button
                          className="btn-primary h-8 px-2 text-xs"
                          onClick={() =>
                            action.mutate({
                              path: `/telegram/sessions/${activeSession}/chats/${chat.telegramUserId}/track`,
                            })
                          }
                        >
                          <MessageCircleMore className="h-3.5 w-3.5" /> Thêm
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {action.error && <p className="mt-4 text-sm text-[#a33b25]">{action.error.message}</p>}
        </aside>
      </div>
    </>
  );
}
