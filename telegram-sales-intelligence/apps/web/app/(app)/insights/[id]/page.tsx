'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, ChevronDown, ChevronUp, Database, GitBranch } from 'lucide-react';
import { apiFetch, formatDate, percent } from '../../../../lib/api';
import { LoadingState, PageHeader } from '../../../../components/ui';

const methodNames: Record<string, string> = {
  ANOMALY_DETECTION: 'Anomaly Detection',
  CLUSTERING: 'Clustering',
  CLASSIFICATION: 'Classification',
  ASSOCIATION_RULE: 'Association Rule Mining',
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

function AnalysisValues({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object') return null;
  return (
    <dl className="divide-y divide-line border-y border-line">
      {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
        <div key={key} className="grid gap-2 py-3 sm:grid-cols-[190px_1fr]">
          <dt className="text-xs font-semibold uppercase text-[#667085]">
            {key.replaceAll('_', ' ')}
          </dt>
          <dd className="min-w-0 text-sm leading-6 text-ink">
            {typeof item === 'object' ? (
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-[#465469]">
                {JSON.stringify(item, null, 2)}
              </pre>
            ) : (
              String(item)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function InsightDetailPage() {
  const id = String(useParams().id);
  const [selectedReference, setSelectedReference] = useState<any>(null);
  const [showTechnicalAnalysis, setShowTechnicalAnalysis] = useState(false);
  const insight = useQuery({
    queryKey: ['insight', id],
    queryFn: () => apiFetch<any>(`/insights/${id}`),
  });
  if (insight.isLoading) return <LoadingState />;
  const item = insight.data;
  const metric = Number(item.metricValue ?? 0);
  const baseline = Number(item.baselineValue ?? 0);
  const max = Math.max(Math.abs(metric), Math.abs(baseline), 0.01);

  return (
    <>
      <Link
        href="/insights"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-teal"
      >
        <ArrowLeft className="h-4 w-4" /> Insight Collection
      </Link>
      <PageHeader
        title={item.title}
        description={`${methodNames[item.method] ?? item.method} · ${formatDate(item.timeWindowStart)} đến ${formatDate(item.timeWindowEnd)}`}
        actions={
          <span className="badge border-[#b8d9dd] bg-[#edf8f9] text-[#086b75]">{item.status}</span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <section className="border-y border-line bg-white p-5 lg:p-6">
            <p className="text-xs font-semibold uppercase text-teal">
              Giải thích bằng ngôn ngữ tự nhiên
            </p>
            <h2 className="mt-2 text-lg font-semibold">Insight này được tìm ra như thế nào?</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#354154]">
              {item.explanationText ?? item.description}
            </p>
          </section>
          <section className="panel p-5 lg:p-6">
            <p className="max-w-4xl text-sm leading-7 text-[#465469]">{item.description}</p>
            <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-[#778195]">Metric</p>
                <p className="mt-1 text-2xl font-bold">{metric.toFixed(3)}</p>
                <p className="text-xs text-[#667085]">{item.metricName}</p>
              </div>
              <div>
                <p className="text-xs text-[#778195]">Baseline</p>
                <p className="mt-1 text-2xl font-bold">{baseline.toFixed(3)}</p>
                <p className="text-xs text-[#667085]">Mốc so sánh</p>
              </div>
              <div>
                <p className="text-xs text-[#778195]">Độ tin cậy</p>
                <p className="mt-1 text-2xl font-bold text-teal">{percent(item.confidenceScore)}</p>
                <p className="text-xs text-[#667085]">{item.sampleSize} mẫu</p>
              </div>
            </div>
            <div className="mt-6 space-y-3" aria-label="So sánh metric và baseline">
              <div className="grid grid-cols-[80px_1fr_55px] items-center gap-3 text-xs">
                <span>Metric</span>
                <div className="h-3 bg-[#e9edf2]">
                  <div
                    className="h-full bg-teal"
                    style={{ width: `${Math.max(3, Math.abs(metric / max) * 100)}%` }}
                  />
                </div>
                <b>{metric.toFixed(2)}</b>
              </div>
              <div className="grid grid-cols-[80px_1fr_55px] items-center gap-3 text-xs">
                <span>Baseline</span>
                <div className="h-3 bg-[#e9edf2]">
                  <div
                    className="h-full bg-coral"
                    style={{ width: `${Math.max(3, Math.abs(baseline / max) * 100)}%` }}
                  />
                </div>
                <b>{baseline.toFixed(2)}</b>
              </div>
            </div>
          </section>

          <section className="border-y border-line bg-white p-5 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-teal" />
                <div>
                  <h2 className="font-semibold">Luồng phân tích kỹ thuật</h2>
                  <p className="text-xs text-[#667085]">
                    Dataset, đặc trưng, thuật toán, các bước tính và kết quả chi tiết.
                  </p>
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={() => setShowTechnicalAnalysis((value) => !value)}
              >
                {showTechnicalAnalysis ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {showTechnicalAnalysis ? 'Ẩn chi tiết' : 'Xem phân tích chi tiết'}
              </button>
            </div>
            {showTechnicalAnalysis && (
              <div className="mt-5">
                <AnalysisValues value={item.analysisJson} />
              </div>
            )}
          </section>
        </div>

        <aside className="panel self-start overflow-hidden xl:sticky xl:top-20">
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Database className="h-4 w-4 text-teal" /> References ({item.references?.length ?? 0})
            </h2>
          </div>
          <div className="max-h-[68vh] divide-y divide-line overflow-y-auto">
            {item.references?.map((reference: any) => (
              <button
                key={reference.id}
                className={`w-full px-5 py-4 text-left hover:bg-[#f8fafc] ${selectedReference?.id === reference.id ? 'bg-[#edf8f9]' : ''}`}
                onClick={() => setSelectedReference(reference)}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="badge border-line bg-white text-[#596579]">
                    {reference.referenceType}
                  </span>
                  <span className="text-xs font-semibold text-teal">
                    {percent(reference.relevanceScore)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold">{reference.label}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085]">
                  {reference.excerpt}
                </p>
              </button>
            ))}
          </div>
          {selectedReference && (
            <div className="border-t-2 border-teal bg-[#f8fafc] p-5">
              <p className="text-xs font-semibold uppercase text-[#667085]">Dữ liệu nguồn</p>
              <p className="mt-2 text-sm leading-6">{selectedReference.excerpt}</p>
              {selectedReference.target && (
                <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap border border-line bg-white p-3 text-xs leading-5">
                  {JSON.stringify(selectedReference.target, null, 2)}
                </pre>
              )}
              {referenceHref(selectedReference) && (
                <Link href={referenceHref(selectedReference)!} className="btn-primary mt-4 w-full">
                  <ArrowUpRight className="h-4 w-4" /> Mở reference
                </Link>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
