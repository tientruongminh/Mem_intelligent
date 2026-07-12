'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { apiFetch, percent } from '../../../lib/api';
import { StaggerGrid, StaggerItem } from '../../../components/motion';
import { EmptyState, PageHeader, SkeletonTable, StatusBadge } from '../../../components/ui';

export default function EmployeesPage() {
  const employees = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiFetch<any[]>('/employees'),
  });

  return (
    <>
      <PageHeader
        title="Employees"
        description="Performance and sales playbooks synthesized from each employee's workflows."
      />
      {employees.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonTable rows={3} cols={1} />
          <SkeletonTable rows={3} cols={1} />
          <SkeletonTable rows={3} cols={1} />
        </div>
      ) : !employees.data?.length ? (
        <EmptyState text="No employee profiles in the system yet." />
      ) : (
        <StaggerGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {employees.data.map((item) => {
            const metric = item.dailyMetrics?.[0];
            return (
              <StaggerItem key={item.id}>
                <Link href={`/employees/${item.id}`} className="metric-card group block p-5">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent-muted text-accent">
                      <BriefcaseBusiness className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold group-hover:text-accent">
                        {item.fullName}
                      </p>
                      <p className="truncate text-sm text-ink-muted">
                        {item.employeeCode} · {item.email}
                      </p>
                    </div>
                    <StatusBadge value={item.role} />
                  </div>
                  <div className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
                    <div>
                      <p className="text-lg font-semibold tabular-nums">
                        {item._count?.customers ?? 0}
                      </p>
                      <p className="text-xs text-ink-subtle">Customers</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold tabular-nums">
                        {item._count?.conversations ?? 0}
                      </p>
                      <p className="text-xs text-ink-subtle">Transactions</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold tabular-nums text-accent">
                        {percent(metric?.conversionRate)}
                      </p>
                      <p className="text-xs text-ink-subtle">Won deals</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
                    <span>{item.experiences?.length ?? 0} experience playbooks</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
      )}
    </>
  );
}
