'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Target,
  Users,
} from 'lucide-react';
import { apiFetch, formatDate, percent } from '../../../../lib/api';
import { LoadingState, PageHeader, StatusBadge } from '../../../../components/ui';

function Experience({ item }: { item: any }) {
  const playbook = item.playbookJson ?? {};
  const evidenceIds: string[] = item.evidenceJson?.conversationIds ?? [];
  const steps: string[] = playbook.recommendedFlow ?? playbook.steps ?? [];
  const blueprint: any[] = playbook.workflowBlueprint ?? [];
  const metrics = playbook.observedMetrics ?? {};
  const segmentSignals = playbook.segmentSignals;
  return (
    <article className="border-b border-line py-5 first:pt-0 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.title}</p>
          {item.customerSegment && (
            <p className="mt-1 text-xs font-semibold uppercase text-teal">{item.customerSegment}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{percent(item.confidenceScore)}</p>
          <p className="text-xs text-[#778195]">{item.sampleSize} workflow</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#465469]">{item.summary}</p>
      {Object.keys(metrics).length > 0 && (
        <div className="mt-4 grid gap-3 border-y border-line py-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(metrics).map(([name, value]) => (
            <div key={name}>
              <p className="text-xs font-semibold uppercase text-[#778195]">
                {name.replaceAll(/([A-Z])/g, ' $1').replaceAll('_', ' ')}
              </p>
              <p className="mt-1 text-sm font-bold text-ink">
                {typeof value === 'number' && name.toLowerCase().includes('rate')
                  ? percent(value)
                  : String(value)}
              </p>
            </div>
          ))}
        </div>
      )}
      {segmentSignals && (
        <dl className="mt-4 grid gap-4 bg-[#f8fafc] p-4 text-sm md:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase text-[#778195]">Buying trigger</dt>
            <dd className="mt-1 leading-6">{segmentSignals.buyingTrigger}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[#778195]">Cách ra quyết định</dt>
            <dd className="mt-1 leading-6">{segmentSignals.decisionPattern}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-[#778195]">Rủi ro chính</dt>
            <dd className="mt-1 leading-6">{segmentSignals.mainRisk}</dd>
          </div>
        </dl>
      )}
      {blueprint.length > 0 ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal" />
            <p className="text-xs font-semibold uppercase text-[#667085]">
              Workflow playbook quan sát được
            </p>
          </div>
          <ol>
            {blueprint.map((stage, index) => (
              <li key={`${stage.stage}-${index}`} className="relative pb-4 pl-10 last:pb-0">
                {index < blueprint.length - 1 && (
                  <span className="absolute bottom-0 left-[15px] top-8 w-px bg-[#b8d9dd]" />
                )}
                <span
                  className="absolute left-0 top-0 grid h-8 w-8 place-items-center border border-[#9ecbd0] bg-[#edf8f9] text-xs font-bold text-teal"
                  style={{ borderRadius: 6 }}
                >
                  {index + 1}
                </span>
                <div className="border border-line p-4" style={{ borderRadius: 6 }}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{stage.stage}</h3>
                    {index < blueprint.length - 1 && (
                      <ArrowDown className="h-4 w-4 text-[#8a95a5]" />
                    )}
                  </div>
                  <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-[#778195]">
                        Tín hiệu từ khách
                      </p>
                      <p className="mt-1 leading-6 text-[#465469]">
                        {stage.customerSignal ?? stage.observedBehavior}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-[#778195]">
                        Hành động của sale
                      </p>
                      <p className="mt-1 leading-6 text-[#465469]">{stage.employeeAction}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-[#778195]">
                        Cách phản hồi nên dùng
                      </p>
                      <p className="mt-1 leading-6 text-[#465469]">{stage.recommendedResponse}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 text-xs font-semibold uppercase text-[#146c50]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Điều kiện chuyển bước
                      </p>
                      <p className="mt-1 leading-6 text-[#465469]">{stage.exitCriteria}</p>
                    </div>
                  </div>
                  {stage.commonFailure && (
                    <p className="mt-3 flex gap-2 border-t border-line pt-3 text-xs leading-5 text-[#a33b25]">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{' '}
                      {stage.commonFailure}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        steps.length > 0 && (
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {steps.map((step, index) => (
              <li
                key={`${step}-${index}`}
                className="flex gap-3 border border-line bg-[#f8fafc] p-3 text-sm"
                style={{ borderRadius: 6 }}
              >
                <span className="font-bold text-teal">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        )
      )}
      {evidenceIds.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {evidenceIds.slice(0, 6).map((id) => (
            <Link key={id} href={`/conversations/${id}`} className="btn-secondary h-8">
              <ArrowUpRight className="h-3.5 w-3.5" /> Transaction
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

export default function EmployeeDetailPage() {
  const id = String(useParams().id);
  const [tab, setTab] = useState<'OVERALL' | 'CUSTOMER_SEGMENT'>('OVERALL');
  const employee = useQuery({
    queryKey: ['employee', id],
    queryFn: () => apiFetch<any>(`/employees/${id}`),
  });
  if (employee.isLoading) return <LoadingState />;
  const item = employee.data;
  const metric = item.dailyMetrics?.[0];
  const experiences = item.experiences?.filter((experience: any) => experience.type === tab) ?? [];
  const cards = [
    {
      label: 'Khách hàng phụ trách',
      value: metric?.assignedCustomers ?? item._count?.customers ?? 0,
      icon: Users,
    },
    { label: 'Transaction đang tư vấn', value: metric?.activeConversations ?? 0, icon: Target },
    { label: 'Tỷ lệ chốt deal', value: percent(metric?.conversionRate), icon: Target },
    {
      label: 'Thời gian chốt trung bình',
      value: metric?.averageCloseSeconds
        ? `${Math.round(metric.averageCloseSeconds / 3600)} giờ`
        : '—',
      icon: Clock3,
    },
  ];
  return (
    <>
      <Link
        href="/employees"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-teal"
      >
        <ArrowLeft className="h-4 w-4" /> Employee Profiles
      </Link>
      <PageHeader
        title={item.fullName}
        description={`${item.employeeCode} · ${item.email} · Cập nhật ${formatDate(metric?.metricDate)}`}
        actions={<StatusBadge value={item.status} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div className="panel p-5" key={label}>
            <Icon className="h-5 w-5 text-teal" />
            <p className="mt-5 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-[#667085]">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="panel self-start p-5">
          <h2 className="font-semibold">Kết quả gần nhất</h2>
          <dl className="mt-4 divide-y divide-line">
            {[
              ['Chốt thành công', metric?.wonCount ?? 0, 'text-teal'],
              ['Không thành công', metric?.lostCount ?? 0, 'text-coral'],
              ['Ngừng tư vấn', metric?.stoppedCount ?? 0, 'text-[#596579]'],
              ['Đã đóng', metric?.closedConversations ?? 0, 'text-ink'],
            ].map(([label, value, color]) => (
              <div className="flex items-center justify-between py-3" key={String(label)}>
                <dt className="text-sm text-[#667085]">{label}</dt>
                <dd className={`text-lg font-bold ${color}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <section className="panel p-5 lg:p-6">
          <div className="flex items-center gap-3">
            <BookOpenCheck className="h-5 w-5 text-teal" />
            <div>
              <h2 className="font-semibold">Kinh nghiệm từ workflow</h2>
              <p className="text-xs text-[#667085]">
                Tổng hợp theo các transaction thuộc sở hữu của nhân viên.
              </p>
            </div>
          </div>
          <div className="mt-5 flex gap-1 border-b border-line">
            <button
              className={`h-10 border-b-2 px-3 text-sm font-semibold ${tab === 'OVERALL' ? 'border-teal text-teal' : 'border-transparent text-[#667085]'}`}
              onClick={() => setTab('OVERALL')}
            >
              Kinh nghiệm tổng thể
            </button>
            <button
              className={`h-10 border-b-2 px-3 text-sm font-semibold ${tab === 'CUSTOMER_SEGMENT' ? 'border-teal text-teal' : 'border-transparent text-[#667085]'}`}
              onClick={() => setTab('CUSTOMER_SEGMENT')}
            >
              Theo nhóm khách hàng
            </button>
          </div>
          <div className="mt-5">
            {experiences.length ? (
              experiences.map((experience: any) => (
                <Experience key={experience.id} item={experience} />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-[#667085]">
                Chưa đủ workflow để tổng hợp kinh nghiệm.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
