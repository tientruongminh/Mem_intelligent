'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { InsightAnalysisFlow } from '../../../../components/insight-analysis';
import { ReadableText, SpecList } from '../../../../components/readable-text';
import { BackLink, LoadingState, StatusBadge } from '../../../../components/ui';
import { apiFetch, formatDate, percent } from '../../../../lib/api';

const methodNames: Record<string, string> = {
  ANOMALY_DETECTION: 'Phát hiện bất thường',
  CLUSTERING: 'Phân cụm',
  CLASSIFICATION: 'Phân loại',
  ASSOCIATION_RULE: 'Luật kết hợp',
};

function referenceHref(reference: any): string | null {
  if (reference.referenceType === 'CONVERSATION') return `/conversations/${reference.referenceId}`;
  if (reference.referenceType === 'CUSTOMER') return `/customers/${reference.referenceId}`;
  if (reference.referenceType === 'EMPLOYEE') return `/employees/${reference.referenceId}`;
  if (reference.referenceType === 'WORKFLOW_NODE' && reference.target?.graph?.conversationId) {
    return `/conversations/${reference.target.graph.conversationId}/workflow?node=${reference.referenceId}`;
  }
  return null;
}

function formatMetric(value: number, metricName?: string) {
  if (metricName?.includes('rate') || metricName?.includes('share')) return percent(value);
  return value.toFixed(3);
}

export default function InsightDetailPage() {
  const id = String(useParams().id);
  const [selectedReference, setSelectedReference] = useState<any>(null);
  const insight = useQuery({
    queryKey: ['insight', id],
    queryFn: () => apiFetch<any>(`/insights/${id}`),
  });

  if (insight.isLoading) return <LoadingState text="Đang tải insight..." />;

  const item = insight.data;
  const metric = Number(item.metricValue ?? 0);
  const baseline = Number(item.baselineValue ?? 0);
  const delta = metric - baseline;
  const deltaPositive = delta >= 0;
  const analysis = item.analysisJson as Record<string, unknown> | null;

  return (
    <>
      <BackLink href="/insights" label="Quay lại danh sách" />

      <header className="mb-7 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span>{methodNames[item.method] ?? item.method}</span>
          <span aria-hidden>·</span>
          <span>
            {formatDate(item.timeWindowStart)} → {formatDate(item.timeWindowEnd)}
          </span>
          {item.severity && (
            <>
              <span aria-hidden>·</span>
              <span className={item.severity === 'HIGH' ? 'text-danger' : 'text-ink-muted'}>
                {item.severity}
              </span>
            </>
          )}
          <span className="ml-auto">
            <StatusBadge value={item.status} />
          </span>
        </div>
        <h1 className="mt-3 max-w-3xl text-[1.5rem] font-semibold leading-snug tracking-tight text-ink lg:text-[1.75rem]">
          {item.title}
        </h1>
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section className="callout-lead">
            <ReadableText text={item.explanationText ?? item.description} />
          </section>

          {item.description && item.explanationText && item.description !== item.explanationText && (
            <section>
              <h2 className="doc-label">Mô tả ngắn</h2>
              <ReadableText text={item.description} className="mt-3" />
            </section>
          )}

          <section>
            <h2 className="doc-label">Số liệu</h2>
            <SpecList
              items={[
                {
                  label: item.metricName ?? 'Metric',
                  value: formatMetric(metric, item.metricName),
                  hint: 'Giá trị đo được',
                },
                {
                  label: 'Baseline',
                  value: formatMetric(baseline, item.metricName),
                  hint: 'Mốc so sánh',
                },
                {
                  label: 'Chênh lệch',
                  value: (
                    <span className={deltaPositive ? 'text-success-foreground' : 'text-danger-foreground'}>
                      {deltaPositive ? '+' : ''}
                      {formatMetric(delta, item.metricName)}
                    </span>
                  ),
                },
                {
                  label: 'Độ tin cậy',
                  value: percent(item.confidenceScore),
                  hint: `${item.sampleSize} mẫu`,
                },
              ]}
            />
          </section>

          <section className="border-t border-line pt-8">
            <h2 className="doc-label">Phân tích kỹ thuật</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Dữ liệu thô và các bước tính — không phải văn bản marketing.
            </p>
            <div className="mt-6">
              <InsightAnalysisFlow analysis={analysis} metricName={item.metricName} />
            </div>
          </section>
        </div>

        <aside className="self-start xl:sticky xl:top-[4.5rem]">
          <h2 className="doc-label">
            Nguồn tham chiếu
            <span className="ml-2 font-normal tabular-nums text-ink-subtle">
              ({item.references?.length ?? 0})
            </span>
          </h2>

          <div className="mt-3 divide-y divide-line border-y border-line">
            {item.references?.length ? (
              item.references.map((reference: any) => {
                const active = selectedReference?.id === reference.id;
                return (
                  <button
                    key={reference.id}
                    type="button"
                    className={`w-full px-0 py-4 text-left transition-colors ${active ? 'bg-transparent' : 'hover:bg-canvas-subtle/60'}`}
                    onClick={() => setSelectedReference(active ? null : reference)}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs font-medium text-ink-subtle">
                        {reference.referenceType}
                      </span>
                      <span className="text-xs tabular-nums text-ink-muted">
                        {percent(reference.relevanceScore)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-ink">{reference.label}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">
                      {reference.excerpt}
                    </p>
                  </button>
                );
              })
            ) : (
              <p className="py-6 text-sm text-ink-muted">Chưa có nguồn.</p>
            )}
          </div>

          {selectedReference && (
            <div className="mt-4 border-l-2 border-accent pl-4">
              <p className="text-sm leading-7 text-ink">{selectedReference.excerpt}</p>
              {selectedReference.target && (
                <pre className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-ink-muted">
                  {JSON.stringify(selectedReference.target, null, 2)}
                </pre>
              )}
              {referenceHref(selectedReference) && (
                <Link
                  href={referenceHref(selectedReference)!}
                  className="btn-secondary mt-4 inline-flex h-9 gap-1.5 px-3 text-xs"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" /> Mở nguồn
                </Link>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
