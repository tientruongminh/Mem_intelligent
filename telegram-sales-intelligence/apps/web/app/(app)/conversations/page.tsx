'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, MessageSquareText } from 'lucide-react';
import { apiFetch, formatDate } from '../../../lib/api';
import { EmptyState, PageHeader, SkeletonTable, StatusBadge } from '../../../components/ui';

export default function ConversationsPage() {
  const router = useRouter();
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<any[]>('/conversations'),
  });

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Track each consultation session and the outcome confirmed by sales."
        meta={conversations.data ? `${conversations.data.length} transactions` : undefined}
      />
      {conversations.isLoading ? (
        <SkeletonTable rows={7} cols={6} />
      ) : !conversations.data?.length ? (
        <EmptyState text="No transactions yet. Add a Telegram customer to start consulting." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customers</th>
                <th>Employees</th>
                <th>Status</th>
                <th>Outcome</th>
                <th>Summary</th>
                <th>Latest message</th>
                <th>Started</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {conversations.data.map((item) => (
                <tr
                  key={item.id}
                  className="row-link"
                  onClick={() => router.push(`/conversations/${item.id}`)}
                >
                  <td className="font-medium">{item.customer.fullName}</td>
                  <td>{item.employee.fullName}</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                  <td>
                    <StatusBadge value={item.outcome} />
                  </td>
                  <td className="max-w-64 truncate text-ink-muted">
                    {item.summaries?.[0]?.summaryText ?? 'No summary yet'}
                  </td>
                  <td className="max-w-56 truncate text-ink-muted">
                    {item.messages?.[0]?.textContent ?? 'None'}
                  </td>
                  <td className="whitespace-nowrap text-ink-muted">{formatDate(item.startedAt)}</td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <div className="flex gap-2">
                      <Link
                        className="btn-secondary h-8 gap-1 px-2.5 text-xs"
                        href={`/conversations/${item.id}`}
                      >
                        <MessageSquareText className="h-3.5 w-3.5" />
                        Xem
                      </Link>
                      <Link
                        className="btn-secondary h-8 gap-1 px-2.5 text-xs"
                        href={`/conversations/${item.id}/workflow`}
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        Workflow
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
