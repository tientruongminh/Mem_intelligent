'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Binary, Database, Search, Timer } from 'lucide-react';
import { apiFetch, formatDate, percent } from '../../../lib/api';
import { EmptyState, LoadingState, PageHeader } from '../../../components/ui';

const methods = [
  { value: '', label: 'Tất cả' },
  { value: 'ANOMALY_DETECTION', label: 'Bất thường' },
  { value: 'CLUSTERING', label: 'Phân cụm' },
  { value: 'CLASSIFICATION', label: 'Phân loại' },
  { value: 'ASSOCIATION_RULE', label: 'Luật kết hợp' },
];

const methodLabel = (value: string) =>
  methods.find((method) => method.value === value)?.label ?? value;

export default function InsightsPage() {
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const insights = useQuery({
    queryKey: ['insights', method, search],
    queryFn: () =>
      apiFetch<any[]>(
        `/insights?${new URLSearchParams({ ...(method ? { method } : {}), ...(search ? { search } : {}) })}`,
      ),
  });

  return (
    <>
      <PageHeader
        title="Insight Collection"
        description="Số liệu được tính bằng thuật toán; AI chỉ diễn đạt kết luận từ dữ liệu đã kiểm chứng."
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[#8a95a5]" />
            <input
              className="field pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm trong insight"
            />
          </div>
        }
      />

      <div className="mb-5 flex max-w-full gap-1 overflow-x-auto border-b border-line">
        {methods.map((item) => (
          <button
            key={item.value}
            className={`h-10 shrink-0 border-b-2 px-3 text-sm font-semibold ${method === item.value ? 'border-teal text-teal' : 'border-transparent text-[#667085] hover:text-ink'}`}
            onClick={() => setMethod(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {insights.isLoading ? (
        <LoadingState />
      ) : !insights.data?.length ? (
        <EmptyState text="Không có insight phù hợp với bộ lọc." />
      ) : (
        <div className="divide-y divide-line border-y border-line bg-white">
          {insights.data.map((item) => (
            <Link
              href={`/insights/${item.id}`}
              key={item.id}
              className="group grid gap-4 px-4 py-5 hover:bg-[#f8fafc] md:grid-cols-[minmax(0,1fr)_150px_110px_36px] md:items-center lg:px-5"
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="badge border-[#b8d9dd] bg-[#edf8f9] text-[#086b75]">
                    {methodLabel(item.method)}
                  </span>
                  {item.severity && (
                    <span className="text-xs font-semibold text-[#667085]">{item.severity}</span>
                  )}
                </div>
                <h2 className="font-semibold text-ink group-hover:text-teal">{item.title}</h2>
                <p className="mt-1 text-xs font-semibold uppercase text-[#778195]">
                  Cách hệ thống tìm ra insight
                </p>
                <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#465469]">
                  {item.explanationText ?? item.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#778195]">
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5" /> {item.referenceCount} reference
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" /> {formatDate(item.timeWindowEnd)}
                  </span>
                  <span className="font-semibold text-teal">Mở phân tích chi tiết</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#778195]">{item.metricName}</p>
                <p className="mt-1 text-xl font-bold text-ink">
                  {item.metricName?.includes('rate') || item.metricName?.includes('share')
                    ? percent(item.metricValue)
                    : Number(item.metricValue ?? 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#778195]">Cỡ mẫu</p>
                <p className="mt-1 flex items-center gap-1.5 font-bold">
                  <Binary className="h-4 w-4 text-teal" /> {item.sampleSize}
                </p>
              </div>
              <span
                className="grid h-9 w-9 place-items-center border border-line bg-white text-[#667085] group-hover:border-teal group-hover:text-teal"
                style={{ borderRadius: 6 }}
              >
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
