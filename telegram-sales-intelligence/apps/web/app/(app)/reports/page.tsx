'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileCode2, FileText, RefreshCw } from 'lucide-react';
import { apiFetch, formatDate } from '../../../lib/api';
import { EmptyState, PageHeader, SkeletonTable, StatusBadge } from '../../../components/ui';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const reports = useQuery({ queryKey: ['reports'], queryFn: () => apiFetch<any[]>('/reports') });
  const generate = useMutation({
    mutationFn: () => apiFetch('/reports/generate', { method: 'POST', body: '{}' }),
    onSuccess: () => {
      window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ['reports'] }), 2500);
    },
  });
  const download = async (id: string) => {
    const result = await apiFetch<{ url: string }>(`/reports/${id}/download-url`, {
      method: 'POST',
    });
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Executive reports generated as both HTML and LaTeX from the same data snapshot."
        actions={
          <button
            className="btn-primary"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
          >
            <RefreshCw className={`h-4 w-4 ${generate.isPending ? 'animate-spin' : ''}`} />
            Generate report
          </button>
        }
      />
      {reports.isLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : !reports.data?.length ? (
        <EmptyState
          text="No reports yet. Select Generate report to create a new snapshot from current data."
          action={
            <button
              className="btn-primary"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
            >
              <RefreshCw className={`h-4 w-4 ${generate.isPending ? 'animate-spin' : ''}`} />
              Generate first report
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Format</th>
                <th>Generated at</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.data.map((item) => (
                <tr key={item.id} className="hover:bg-canvas-subtle/70">
                  <td className="font-medium">{item.title}</td>
                  <td>{item.reportType}</td>
                  <td>{new Date(item.reportDate).toLocaleDateString('en-US')}</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      {item.format === 'LATEX' ? (
                        <FileCode2 className="h-4 w-4 text-accent" />
                      ) : (
                        <FileText className="h-4 w-4 text-accent" />
                      )}
                      {item.format}
                    </span>
                  </td>
                  <td className="text-ink-muted">{formatDate(item.generatedAt)}</td>
                  <td>
                    <button
                      className="btn-secondary h-8 gap-1.5 px-2.5 text-xs"
                      onClick={() => download(item.id)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {item.format === 'LATEX' ? 'Download .tex' : 'Open HTML'}
                    </button>
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
