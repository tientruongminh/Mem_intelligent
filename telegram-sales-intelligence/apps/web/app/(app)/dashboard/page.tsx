'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BarChart3, Bot, MessageSquareText, Plus, Trophy, Users } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { StaggerGrid, StaggerItem } from '../../../components/motion';
import { PageHeader, SkeletonTable, StatusBadge } from '../../../components/ui';

export default function DashboardPage() {
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<any>('/dashboard'),
  });
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<any[]>('/conversations'),
  });

  if (dashboard.isLoading) {
    return (
      <>
        <PageHeader title="Dashboard" description="Overview of Telegram sales activity" />
        <SkeletonTable rows={1} cols={4} />
        <div className="mt-6">
          <SkeletonTable rows={5} cols={3} />
        </div>
      </>
    );
  }

  const metrics = [
    {
      label: 'Managed customers',
      value: dashboard.data?.customers ?? 0,
      icon: Users,
      href: '/customers',
    },
    {
      label: 'Open transactions',
      value: dashboard.data?.openConversations ?? 0,
      icon: MessageSquareText,
      href: '/conversations',
    },
    {
      label: 'Won deals',
      value: dashboard.data?.wonDeals ?? 0,
      icon: Trophy,
      href: '/conversations',
    },
    {
      label: 'Published insights',
      value: dashboard.data?.publishedInsights ?? 0,
      icon: BarChart3,
      href: '/insights',
    },
  ];

  const quickLinks = [
    { href: '/customers', label: 'Add customer', icon: Plus },
    { href: '/integrations/telegram', label: 'Connect Telegram', icon: Bot },
    { href: '/reports', label: 'Generate report', icon: BarChart3 },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of Telegram sales activity" />

      <StaggerGrid className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, href }) => (
          <StaggerItem key={label}>
            <Link href={href} className="metric-card group block">
              <div className="flex items-start justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-canvas-subtle text-ink-muted transition-colors group-hover:bg-accent-muted group-hover:text-accent">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <ArrowUpRight className="h-4 w-4 text-ink-subtle transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
              </div>
              <p className="mt-4 text-[1.75rem] font-semibold tracking-tight tabular-nums text-ink">
                {value}
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">{label}</p>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="quick-link">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-canvas-subtle text-ink-muted">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            {label}
          </Link>
        ))}
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="section-head">
          <div>
            <h2 className="text-sm font-semibold text-ink">Needs attention</h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              Conversations with new customer messages
            </p>
          </div>
          <Link
            href="/conversations"
            className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-line-subtle">
          {(conversations.data ?? []).slice(0, 5).map((item) => (
            <Link
              href={`/conversations/${item.id}`}
              key={item.id}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-150 hover:bg-canvas-subtle/70"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{item.customer.fullName}</p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {item.messages?.[0]?.textContent ??
                    item.summaries?.[0]?.summaryText ??
                    'No content yet'}
                </p>
              </div>
              <StatusBadge value={item.status} />
            </Link>
          ))}
          {!conversations.data?.length && (
            <p className="px-5 py-12 text-center text-sm text-ink-muted">
              No transactions need attention.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
