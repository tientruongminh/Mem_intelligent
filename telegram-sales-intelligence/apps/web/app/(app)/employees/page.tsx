'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { apiFetch, percent } from '../../../lib/api';
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '../../../components/ui';

export default function EmployeesPage() {
  const employees = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiFetch<any[]>('/employees'),
  });
  return (
    <>
      <PageHeader
        title="Employee Profiles"
        description="Hiệu suất và playbook bán hàng được tổng hợp từ workflow của từng nhân viên."
      />
      {employees.isLoading ? (
        <LoadingState />
      ) : !employees.data?.length ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {employees.data.map((item) => {
            const metric = item.dailyMetrics?.[0];
            return (
              <Link
                href={`/employees/${item.id}`}
                key={item.id}
                className="panel group p-5 hover:border-[#a8cfd3] hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center bg-[#edf2f8] text-[#365f9d]"
                    style={{ borderRadius: 7 }}
                  >
                    <BriefcaseBusiness className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold group-hover:text-teal">{item.fullName}</p>
                    <p className="truncate text-sm text-[#667085]">
                      {item.employeeCode} · {item.email}
                    </p>
                  </div>
                  <StatusBadge value={item.role} />
                </div>
                <div className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
                  <div>
                    <p className="text-lg font-bold">{item._count?.customers ?? 0}</p>
                    <p className="text-xs text-[#778195]">Khách hàng</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{item._count?.conversations ?? 0}</p>
                    <p className="text-xs text-[#778195]">Transaction</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-teal">{percent(metric?.conversionRate)}</p>
                    <p className="text-xs text-[#778195]">Chốt deal</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-[#667085]">
                  <span>{item.experiences?.length ?? 0} playbook kinh nghiệm</span>
                  <ArrowRight className="h-4 w-4 group-hover:text-teal" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
