'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, LogOut, MessageCircleMore, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch, formatDate } from '../../../../lib/api';
import { StaggerGrid, StaggerItem } from '../../../../components/motion';
import {
  EmptyState,
  PageHeader,
  SectionCard,
  SkeletonTable,
  StatusBadge,
  StepIndicator,
} from '../../../../components/ui';

const steps = [
  { key: 'PHONE', label: 'Số điện thoại' },
  { key: 'CODE', label: 'OTP' },
  { key: 'PASSWORD', label: '2FA' },
  { key: 'CHATS', label: 'Chọn chat' },
];

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
        title="Telegram"
        description="Kết nối tài khoản cá nhân và chọn private chat cần quản lý."
        meta={sessions.data ? `${sessions.data.length} tài khoản` : undefined}
        actions={
          <div className="flex items-center gap-2 rounded-full bg-canvas-subtle px-3 py-1.5 text-xs text-ink-muted">
            <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.75} />
            OTP và 2FA không được lưu
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <SectionCard
          title="Tài khoản đã kết nối"
          description="Danh sách session Telegram đang hoạt động"
        >
          {sessions.isLoading ? (
            <div className="p-5">
              <SkeletonTable rows={3} cols={3} />
            </div>
          ) : !sessions.data?.length ? (
            <div className="p-5">
              <EmptyState
                text="Chưa có tài khoản Telegram. Bắt đầu kết nối ở panel bên phải."
                action={
                  <button className="btn-primary" onClick={() => setStep('PHONE')}>
                    Kết nối ngay
                  </button>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-line-subtle">
              {sessions.data.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-canvas-subtle/60"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {session.username ? `@${session.username}` : session.phoneMasked}
                      </p>
                      <StatusBadge value={session.status} />
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      Đồng bộ gần nhất: {formatDate(session.lastSyncedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary h-9 gap-1.5 px-3 text-xs"
                      onClick={() => {
                        setActiveSession(session.id);
                        setStep('CHATS');
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Xem chats
                    </button>
                    <button
                      className="btn-secondary h-9 gap-1.5 px-3 text-xs text-danger"
                      aria-label="Ngắt kết nối"
                      onClick={async () => {
                        await apiFetch(`/telegram/sessions/${session.id}`, { method: 'DELETE' });
                        client.invalidateQueries({ queryKey: ['telegram-sessions'] });
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5" /> Ngắt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <aside className="panel p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-muted text-accent">
              <Link2 className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-semibold tracking-tight">Kết nối mới</h2>
              <p className="text-xs text-ink-muted">
                {fakeMode === null
                  ? 'Tự động dùng chế độ thật khi server có API ID/hash'
                  : fakeMode
                    ? 'Demo mode · OTP 12345'
                    : 'Telegram thật · OTP từ app Telegram'}
              </p>
            </div>
          </div>

          <StepIndicator steps={steps} current={step} />

          {step === 'PHONE' && (
            <div>
              <label className="block">
                <span className="label">Số điện thoại</span>
                <input
                  className="field"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+84..."
                />
              </label>
              <button
                className="btn-primary mt-4 w-full"
                onClick={connect}
                disabled={action.isPending}
              >
                {action.isPending ? 'Đang gửi...' : 'Gửi OTP'}
              </button>
            </div>
          )}
          {step === 'CODE' && (
            <div>
              <label className="block">
                <span className="label">Mã OTP</span>
                <input
                  className="field"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </label>
              <button
                className="btn-primary mt-4 w-full"
                onClick={verifyCode}
                disabled={action.isPending}
              >
                {action.isPending ? 'Đang xác nhận...' : 'Xác nhận OTP'}
              </button>
            </div>
          )}
          {step === 'PASSWORD' && (
            <div>
              <label className="block">
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
                {action.isPending ? 'Đang xác nhận...' : 'Xác nhận 2FA'}
              </button>
            </div>
          )}
          {step === 'CHATS' && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-ink">Private chats</span>
                <button className="text-sm font-medium text-accent" onClick={() => chats.refetch()}>
                  Làm mới
                </button>
              </div>
              {chats.isLoading ? (
                <SkeletonTable rows={4} cols={2} />
              ) : !chats.data?.length ? (
                <EmptyState text="Không tìm thấy private chat." />
              ) : (
                <StaggerGrid className="max-h-80 space-y-2 overflow-y-auto chat-scroll pr-1">
                  {chats.data.map((chat) => (
                    <StaggerItem
                      key={chat.telegramUserId}
                      className="flex items-center gap-3 rounded-xl border border-line p-3 transition-colors hover:bg-canvas-subtle/70"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-muted text-sm font-semibold text-accent">
                        {chat.name?.slice(0, 1)?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{chat.name}</p>
                        <p className="truncate text-xs text-ink-muted">
                          {chat.username ? `@${chat.username}` : chat.lastMessage}
                        </p>
                      </div>
                      <button
                        className="btn-primary h-8 shrink-0 px-2.5 text-xs"
                        disabled={action.isPending}
                        onClick={() =>
                          action.mutate({
                            path: `/telegram/sessions/${activeSession}/chats/${chat.telegramUserId}/track`,
                          })
                        }
                      >
                        <MessageCircleMore className="h-3.5 w-3.5" /> Thêm
                      </button>
                    </StaggerItem>
                  ))}
                </StaggerGrid>
              )}
              <Link href="/customers" className="btn-secondary mt-4 w-full">
                Mở danh sách khách hàng
              </Link>
            </div>
          )}
          {action.error && <p className="alert-danger mt-4">{action.error.message}</p>}
          {action.isSuccess && step === 'CHATS' && (
            <p className="alert-success mt-4">Đã thêm khách hàng vào hệ thống.</p>
          )}
        </aside>
      </div>
    </>
  );
}
