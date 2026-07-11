'use client';

import { DocSection, SpecList } from './readable-text';

function humanizeKey(key: string) {
  return key.replaceAll('_', ' ');
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(3);
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

const STEP_HINTS = [
  'Giới hạn theo tổ chức và cửa sổ thời gian',
  'Chuẩn hóa đặc trưng trước khi so sánh',
  'Metric được tính bằng code, không qua LLM',
  'Kiểm tra cỡ mẫu và ngưỡng tin cậy',
  'LLM chỉ diễn đạt kết quả đã kiểm chứng',
];

export function AnalysisPipeline({ steps }: { steps: string[] }) {
  if (!steps?.length) return null;

  return (
    <ol className="step-list">
      {steps.map((label, index) => (
        <li key={`${index}-${label}`} className="step-row">
          <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{label}</p>
            <p className="mt-0.5 text-sm text-ink-muted">
              {STEP_HINTS[index] ?? 'Bước trong pipeline phân tích'}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AnalysisVisualization({
  points,
  metricLabel,
}: {
  points: { x: number; y: number }[];
  metricLabel?: string;
}) {
  if (!points?.length) return null;

  const values = points.map((p) => p.y);
  const max = Math.max(...values, 0.01);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 320;
  const height = 72;
  const padX = 8;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = points.map((point, index) => {
    const cx = padX + (index / Math.max(points.length - 1, 1)) * innerW;
    const cy = padY + innerH - ((point.y - min) / range) * innerH;
    return { cx, cy, label: point.x, value: point.y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.cx} ${c.cy}`).join(' ');

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Xu hướng {metricLabel ? `· ${metricLabel}` : ''}
        </p>
        <p className="text-xs tabular-nums text-ink-subtle">
          max {max.toFixed(2)}
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[72px] w-full text-accent" role="img">
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

type AnalysisJson = {
  question?: string;
  dataset?: Record<string, unknown>;
  features?: string[];
  algorithm?: string;
  steps?: string[];
  result?: Record<string, unknown>;
  visualization?: { x: number; y: number }[];
};

export function InsightAnalysisFlow({
  analysis,
  metricName,
}: {
  analysis: AnalysisJson | null | undefined;
  metricName?: string;
}) {
  if (!analysis || typeof analysis !== 'object') {
    return <p className="text-sm text-ink-muted">Chưa có dữ liệu phân tích kỹ thuật.</p>;
  }

  return (
    <div className="space-y-8">
      {analysis.question && (
        <DocSection label="Câu hỏi">
          <p className="readable-lead !mt-0">{analysis.question}</p>
        </DocSection>
      )}

      {analysis.algorithm && (
        <DocSection label="Thuật toán">
          <p className="font-mono text-sm text-ink">{analysis.algorithm}</p>
        </DocSection>
      )}

      {analysis.dataset && (
        <DocSection label="Dataset">
          <SpecList
            items={Object.entries(analysis.dataset).map(([key, value]) => ({
              label: humanizeKey(key),
              value: formatValue(value),
            }))}
          />
        </DocSection>
      )}

      {analysis.features && (
        <DocSection label="Đặc trưng">
          <p className="text-sm leading-7 text-ink-muted">
            {analysis.features.map(humanizeKey).join(' · ')}
          </p>
        </DocSection>
      )}

      {analysis.steps && (
        <DocSection label="Các bước tính">
          <AnalysisPipeline steps={analysis.steps} />
        </DocSection>
      )}

      {analysis.visualization && (
        <DocSection label="Xu hướng">
          <AnalysisVisualization points={analysis.visualization} metricLabel={metricName} />
        </DocSection>
      )}

      {analysis.result && (
        <DocSection label="Kết quả">
          <SpecList
            items={Object.entries(analysis.result).map(([key, value]) => ({
              label: humanizeKey(key),
              value:
                typeof value === 'object' && value !== null ? (
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-ink-muted">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  formatValue(value)
                ),
            }))}
          />
        </DocSection>
      )}
    </div>
  );
}
