'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BarChart3, MessageSquareText, Trophy, Users } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { LoadingState, PageHeader } from '../../../components/ui';

export default function DashboardPage() {
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<any>('/dashboard'),
  });
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<any[]>('/conversations'),
  });
  if (dashboard.isLoading) return <LoadingState />;
  const metrics = [
    {
      label: 'Khách hàng quản lý',
      value: dashboard.data?.customers ?? 0,
      icon: Users,
      color: 'text-teal',
      href: '/customers',
    },
    {
      label: 'Conversation đang mở',
      value: dashboard.data?.openConversations ?? 0,
      icon: MessageSquareText,
      color: 'text-[#365f9d]',
      href: '/conversations',
    },
    {
      label: 'Deal WON',
      value: dashboard.data?.wonDeals ?? 0,
      icon: Trophy,
      color: 'text-[#bf6c17]',
      href: '/conversations',
    },
    {
      label: 'Insight đã công bố',
      value: dashboard.data?.publishedInsights ?? 0,
      icon: BarChart3,
      color: 'text-coral',
      href: '/insights',
    },
  ];
  return (
    <>
      <PageHeader title="Dashboard" description="Tổng quan hoạt động tư vấn qua Telegram" />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, color, href }) => (
          <Link
            href={href}
            key={label}
            className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <Icon className={`h-5 w-5 ${color}`} />
              <ArrowUpRight className="h-4 w-4 text-[#9aa4b2]" />
            </div>
            <p className="mt-6 text-3xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-[#667085]">{label}</p>
          </Link>
        ))}
      </section>
      <section className="mt-7 panel">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-semibold">Conversation cần chú ý</h2>
            <p className="text-xs text-[#778195]">Ưu tiên hội thoại có tin mới từ khách</p>
          </div>
          <Link href="/conversations" className="text-sm font-semibold text-teal">
            Xem tất cả
          </Link>
        </div>
        <div className="divide-y divide-[#edf0f3]">
          {(conversations.data ?? []).slice(0, 5).map((item) => (
            <Link
              href={`/conversations/${item.id}`}
              key={item.id}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#f8fafc]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.customer.fullName}</p>
                <p className="truncate text-xs text-[#667085]">
                  {item.messages?.[0]?.textContent ??
                    item.summaries?.[0]?.summaryText ??
                    'Chưa có nội dung'}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-teal">{item.status}</span>
            </Link>
          ))}
          {!conversations.data?.length && (
            <p className="px-5 py-10 text-center text-sm text-[#667085]">Chưa có conversation.</p>
          )}
        </div>
      </section>
    </>
  );
}
