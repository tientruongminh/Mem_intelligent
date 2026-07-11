'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, MessageSquareText } from 'lucide-react';
import { apiFetch, formatDate } from '../../../lib/api';
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '../../../components/ui';

export default function ConversationsPage() {
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiFetch<any[]>('/conversations'),
  });
  return (
    <>
      <PageHeader
        title="Transactions"
        description="Theo dõi từng phiên tư vấn và kết quả do sale xác nhận."
      />
      {conversations.isLoading ? (
        <LoadingState />
      ) : !conversations.data?.length ? (
        <EmptyState />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Nhân viên</th>
                <th>Trạng thái</th>
                <th>Kết quả</th>
                <th>Tóm tắt</th>
                <th>Tin gần nhất</th>
                <th>Bắt đầu</th>
                <th>Workflow</th>
              </tr>
            </thead>
            <tbody>
              {conversations.data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link
                      className="font-semibold hover:text-teal"
                      href={`/conversations/${item.id}`}
                    >
                      {item.customer.fullName}
                    </Link>
                  </td>
                  <td>{item.employee.fullName}</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                  <td>
                    <StatusBadge value={item.outcome} />
                  </td>
                  <td className="max-w-64 truncate text-[#667085]">
                    {item.summaries?.[0]?.summaryText ?? 'Chưa có tóm tắt'}
                  </td>
                  <td className="max-w-56 truncate">{item.messages?.[0]?.textContent ?? '—'}</td>
                  <td className="whitespace-nowrap">{formatDate(item.startedAt)}</td>
                  <td>
                    <div className="flex gap-2">
                      <Link
                        className="btn-secondary h-8 w-8 px-0"
                        title="Xem transaction"
                        href={`/conversations/${item.id}`}
                      >
                        <MessageSquareText className="h-4 w-4" />
                      </Link>
                      <Link
                        className="btn-secondary h-8 w-8 px-0"
                        title="Mở workflow"
                        href={`/conversations/${item.id}/workflow`}
                      >
                        <GitBranch className="h-4 w-4" />
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
