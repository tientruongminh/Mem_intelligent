'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, MessageCircleMore, Plus, X } from 'lucide-react';
import { apiFetch, formatDate } from '../../../lib/api';
import { StaggerGrid, StaggerItem, SlideOver } from '../../../components/motion';
import { EmptyState, PageHeader, SearchField, SkeletonTable } from '../../../components/ui';

export default function CustomersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const customers = useQuery({
    queryKey: ['customers', search],
    queryFn: () => apiFetch<any[]>(`/customers?${new URLSearchParams(search ? { search } : {})}`),
  });
  const sessions = useQuery({
    queryKey: ['telegram-sessions'],
    queryFn: () => apiFetch<any[]>('/telegram/sessions'),
    enabled: open,
  });
  const openClawAccounts = useQuery({
    queryKey: ['telegram-openclaw-accounts'],
    queryFn: () => apiFetch<any[]>('/telegram/openclaw/accounts'),
    enabled: open,
  });
  const managedCustomers = useQuery({
    queryKey: ['customers', 'telegram-identities'],
    queryFn: () => apiFetch<any[]>('/customers'),
    enabled: open,
  });
  const sourceOptions = useMemo(
    () => [
      ...(sessions.data ?? [])
        .filter((session) => session.status === 'CONNECTED' && session.hasStoredSession)
        .map((session) => ({
          key: `session:${session.id}`,
          id: session.id as string,
          type: 'session' as const,
          employeeId: session.employeeId as string,
          connected: true,
          label: `${session.username ? `@${session.username}` : session.phoneMasked} · Personal Telegram`,
          chatCount: undefined,
        })),
      ...(openClawAccounts.data ?? []).map((account) => ({
        key: `openclaw:${account.accountId}`,
        id: account.accountId as string,
        type: 'openclaw' as const,
        employeeId: account.employeeId as string | null,
        connected: Boolean(account.personalSessionConnected),
        label: `${account.saleName ?? account.displayName} · Sale Telegram${
          account.personalSessionConnected ? '' : ' (needs connection)'
        }`,
        chatCount: undefined,
        helper: account.personalSessionConnected
          ? `${account.assistantCount ?? account.assistantBots?.length ?? 0} assistant bots connected`
          : "The sales rep's personal Telegram session must be connected",
      })),
    ],
    [openClawAccounts.data, sessions.data],
  );
  const activeSource = sourceOptions.find((source) => source.key === selectedSource);
  useEffect(() => {
    if (open && !activeSource && sourceOptions[0]) setSelectedSource(sourceOptions[0].key);
  }, [activeSource, open, sourceOptions]);
  const chats = useQuery({
    queryKey: ['telegram-chats', selectedSource],
    queryFn: () =>
      apiFetch<any[]>(
        activeSource?.type === 'openclaw'
          ? `/telegram/openclaw/accounts/${activeSource.id}/chats`
          : `/telegram/sessions/${activeSource?.id}/chats`,
      ),
    enabled: open && Boolean(activeSource?.connected),
  });
  const track = useMutation({
    mutationFn: (telegramUserId: string) => {
      if (!activeSource?.connected) throw new Error('No connected Telegram account was selected.');
      return apiFetch(
        activeSource?.type === 'openclaw'
          ? `/telegram/openclaw/accounts/${activeSource.id}/chats/${telegramUserId}/track`
          : `/telegram/sessions/${activeSource?.id}/chats/${telegramUserId}/track`,
        { method: 'POST' },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['telegram-chats', selectedSource] });
    },
  });
  const trackedCustomerKeys = new Set(
    managedCustomers.data?.map(
      (customer) =>
        `${customer.ownerEmployee?.id ?? customer.ownerEmployeeId}:${customer.telegramUserId}`,
    ) ?? [],
  );
  const visibleChats = (chats.data ?? []).filter((chat) => {
    const needle = chatSearch.trim().toLocaleLowerCase('en');
    return (
      !needle ||
      String(chat.name ?? '')
        .toLocaleLowerCase('en')
        .includes(needle) ||
      String(chat.username ?? '')
        .toLocaleLowerCase('en')
        .includes(needle)
    );
  });
  const closeDrawer = () => {
    setOpen(false);
    setChatSearch('');
    track.reset();
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description="Telegram customers tracked and consulted by the team."
        meta={customers.data ? `${customers.data.length} customers` : undefined}
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <SearchField
              className="min-w-56 flex-1"
              value={search}
              onChange={setSearch}
              placeholder="Search by name or @username"
            />
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add customer
            </button>
          </div>
        }
      />

      {customers.isLoading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : !customers.data?.length ? (
        <EmptyState
          text="No customers yet. Connect Telegram and select a chat to start tracking."
          action={
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add customer
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Full name</th>
                <th>Telegram</th>
                <th className="col-hide-sm">Owner</th>
                <th className="col-hide-lg">Customer type</th>
                <th className="col-hide-lg">Product</th>
                <th className="col-hide-sm">Consulting</th>
                <th className="col-hide-sm">Last interaction</th>
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
                    {item.telegramUsername ? `@${item.telegramUsername}` : 'None'}
                  </td>
                  <td className="col-hide-sm">{item.ownerEmployee.fullName}</td>
                  <td className="col-hide-lg">{item.customerType ?? 'Unclassified'}</td>
                  <td className="col-hide-lg">{item.productInterest ?? 'None'}</td>
                  <td className="col-hide-sm tabular-nums">{item.conversations.length}</td>
                  <td className="col-hide-sm whitespace-nowrap text-ink-muted">
                    {formatDate(item.lastContactAt)}
                  </td>
                  <td>
                    <span className="font-semibold tabular-nums text-accent">
                      {item.leadScore ?? 'None'}
                    </span>
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <Link
                      className="btn-secondary h-8 gap-1.5 px-2.5 text-xs"
                      aria-label={`View ${item.fullName}`}
                      href={`/customers/${item.id}`}
                    >
                      Details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SlideOver open={open} onClose={closeDrawer}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-line bg-surface/95 px-5 py-4 backdrop-blur-md">
          <div>
            <h2 className="font-semibold tracking-tight">Add customer from Telegram</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Choose an account, then select the private chat to track.
            </p>
          </div>
          <button
            className="btn-secondary h-8 w-8 p-0"
            onClick={closeDrawer}
            aria-label="Close"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          {sessions.isLoading || openClawAccounts.isLoading ? (
            <SkeletonTable rows={3} cols={3} />
          ) : sourceOptions.length === 0 ? (
            <EmptyState
              text="No personal Telegram session or real OpenClaw private chat is connected."
              action={
                <Link href="/integrations/telegram" className="btn-primary">
                  Connect Telegram
                </Link>
              }
            />
          ) : (
            <>
              <label className="block">
                <span className="label">Telegram account</span>
                <select
                  className="field"
                  value={selectedSource}
                  onChange={(event) => {
                    setSelectedSource(event.target.value);
                    setChatSearch('');
                    track.reset();
                  }}
                >
                  <option value="">Choose account</option>
                  {sourceOptions.map((source) => (
                    <option key={source.key} value={source.key}>
                      {source.label}
                      {source.chatCount === undefined ? '' : ` (${source.chatCount} chat)`}
                    </option>
                  ))}
                </select>
              </label>
              {activeSource && (
                <div className="mt-6">
                  {!activeSource.connected && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-medium">
                        This sales account has no personal Telegram session yet.
                      </p>
                      <p className="mt-1">
                        OpenClaw currently only has assistant bots for this sales rep. Connect the
                        rep's personal Telegram session in Telegram Setup, then the list of people
                        they chatted with will appear here.
                      </p>
                      <Link href="/integrations/telegram" className="btn-secondary mt-3 h-9 px-3">
                        Connect Telegram
                      </Link>
                    </div>
                  )}
                  <div className="mb-3 flex items-end gap-3">
                    <SearchField
                      className="min-w-0 flex-1"
                      value={chatSearch}
                      onChange={setChatSearch}
                      placeholder="Search name or @username"
                      disabled={!activeSource.connected}
                    />
                    <button
                      className="text-sm font-medium text-accent"
                      disabled={!activeSource.connected}
                      onClick={() => chats.refetch()}
                    >
                      Refresh
                    </button>
                  </div>
                  {!activeSource.connected ? null : chats.isLoading ? (
                    <SkeletonTable rows={4} cols={2} />
                  ) : !visibleChats.length ? (
                    <EmptyState text="No chatted users were found in this sales account." />
                  ) : (
                    <StaggerGrid className="space-y-2">
                      {visibleChats.map((chat) => {
                        const ownerKey = activeSource.employeeId ?? '';
                        const isTracked = trackedCustomerKeys.has(
                          `${ownerKey}:${chat.telegramUserId}`,
                        );
                        return (
                          <StaggerItem
                            key={chat.telegramUserId}
                            className="flex items-center gap-3 rounded-lg border border-line p-3 transition-colors hover:bg-canvas-subtle/70"
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
                              className={
                                isTracked
                                  ? 'btn-secondary h-9 shrink-0 px-3 text-xs'
                                  : 'btn-primary h-9 shrink-0 px-3 text-xs'
                              }
                              disabled={track.isPending || isTracked}
                              onClick={() => track.mutate(chat.telegramUserId)}
                            >
                              {isTracked ? (
                                <>
                                  <Check className="h-3.5 w-3.5" /> Tracked
                                </>
                              ) : (
                                <>
                                  <MessageCircleMore className="h-3.5 w-3.5" /> Track
                                </>
                              )}
                            </button>
                          </StaggerItem>
                        );
                      })}
                    </StaggerGrid>
                  )}
                </div>
              )}
              {track.isSuccess && (
                <p className="alert-success mt-4">
                  {activeSource?.type === 'openclaw'
                    ? 'Added the real private chat to the customer list.'
                    : 'Added the customer and started syncing messages.'}
                </p>
              )}
              {track.error && <p className="alert-danger mt-4">{track.error.message}</p>}
            </>
          )}
        </div>
      </SlideOver>
    </>
  );
}
