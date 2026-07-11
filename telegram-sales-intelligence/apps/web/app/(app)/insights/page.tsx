'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { apiFetch, formatDate, percent } from '../../../lib/api';
import { FilterTabs } from '../../../components/filter-tabs';
import { EmptyState, PageHeader, SearchField, SkeletonTable } from '../../../components/ui';

const methods = [
  { value: '', label: 'Tất cả' },
  { value: 'ANOMALY_DETECTION', label: 'Bất thường' },
  { value: 'CLUSTERING', label: 'Phân cụm' },
  { value: 'CLASSIFICATION', label: 'Phân loại' },
  { value: 'ASSOCIATION_RULE', label: 'Luật kết hợp' },
] as const;

const methodLabel = (value: string) =>
  methods.find((method) => method.value === value)?.label ?? value;

function leadSentence(text?: string | null) {
  if (!text) return '';
  const match = text.trim().match(/^[^.!?…]+[.!?…]?/);
  return match?.[0]?.trim() ?? text.slice(0, 120);
}

export default function InsightsPage() {
  const [method, setMethod] = useState<(typeof methods)[number]['value']>('');
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
        title="Insights"
        description="Kết luận từ số liệu đã kiểm chứng. Văn bản giải thích chỉ diễn đạt, không thay phép tính."
        meta={insights.data ? `${insights.data.length} kết quả` : undefined}
        actions={
          <SearchField
            className="w-full sm:w-72"
            value={search}
            onChange={setSearch}
            placeholder="Tìm trong insight"
          />
        }
      />

      <FilterTabs items={methods} value={method} onChange={setMethod} />

      {insights.isLoading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : !insights.data?.length ? (
        <EmptyState text="Không có insight phù hợp với bộ lọc hiện tại." />
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {insights.data.map((item) => {
            const lead = leadSentence(item.explanationText ?? item.description);
            const metric =
              item.metricName?.includes('rate') || item.metricName?.includes('share')
                ? percent(item.metricValue)
                : Number(item.metricValue ?? 0).toFixed(2);

            return (
              <Link
                key={item.id}
                href={`/insights/${item.id}`}
                className="group grid gap-4 py-5 transition-colors hover:bg-canvas-subtle/50 md:grid-cols-[minmax(0,1fr)_120px_100px_28px] md:items-start lg:px-1"
              >
                <div className="min-w-0">
                  <p className="text-xs text-ink-subtle">
                    {methodLabel(item.method)}
                    {item.severity ? ` · ${item.severity}` : ''}
                  </p>
                  <h2 className="mt-1 font-semibold tracking-tight text-ink group-hover:text-accent">
                    {item.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6">
                    <span className="font-medium text-ink">{lead}</span>
                    {(item.explanationText ?? item.description)?.length > lead.length && (
                      <span className="text-ink-muted">
                        {' '}
                        {(item.explanationText ?? item.description).slice(lead.length).trim()}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-xs text-ink-subtle">
                    {item.referenceCount} nguồn · {formatDate(item.timeWindowEnd)} · {item.sampleSize}{' '}
                    mẫu
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-xs text-ink-subtle">{item.metricName}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{metric}</p>
                </div>
                <div className="md:text-right">
                  <p className="text-xs text-ink-subtle">Tin cậy</p>
                  <p className="mt-0.5 font-semibold tabular-nums text-ink">
                    {percent(item.confidenceScore)}
                  </p>
                </div>
                <span className="hidden text-ink-subtle transition-colors group-hover:text-accent md:grid md:place-items-center md:pt-1">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
