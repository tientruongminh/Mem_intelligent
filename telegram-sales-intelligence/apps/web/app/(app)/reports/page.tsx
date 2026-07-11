'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileCode2, FileText, RefreshCw } from 'lucide-react';
import { apiFetch, formatDate } from '../../../lib/api';
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '../../../components/ui';

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
        title="Business Reports"
        description="Báo cáo điều hành chuẩn doanh nghiệp, sinh đồng thời HTML và LaTeX từ cùng snapshot dữ liệu."
        actions={
          <button
            className="btn-primary"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
          >
            <RefreshCw className={`h-4 w-4 ${generate.isPending ? 'animate-spin' : ''}`} /> Tạo báo
            cáo
          </button>
        }
      />
      {reports.isLoading ? (
        <LoadingState />
      ) : !reports.data?.length ? (
        <EmptyState />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report title</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Format</th>
                <th>Generated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.data.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">{item.title}</td>
                  <td>{item.reportType}</td>
                  <td>{new Date(item.reportDate).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <StatusBadge value={item.status} />
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      {item.format === 'LATEX' ? (
                        <FileCode2 className="h-4 w-4 text-[#365f9d]" />
                      ) : (
                        <FileText className="h-4 w-4 text-teal" />
                      )}
                      {item.format}
                    </span>
                  </td>
                  <td>{formatDate(item.generatedAt)}</td>
                  <td>
                    <button className="btn-secondary h-8" onClick={() => download(item.id)}>
                      <Download className="h-4 w-4" />
                      {item.format === 'LATEX' ? 'Tải .tex' : 'Mở HTML'}
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
