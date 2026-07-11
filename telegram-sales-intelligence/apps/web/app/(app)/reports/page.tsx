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
        title="Báo cáo"
        description="Báo cáo điều hành sinh đồng thời HTML và LaTeX từ cùng snapshot dữ liệu."
        actions={
          <button
            className="btn-primary"
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
          >
            <RefreshCw className={`h-4 w-4 ${generate.isPending ? 'animate-spin' : ''}`} />
            Tạo báo cáo
          </button>
        }
      />
      {reports.isLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : !reports.data?.length ? (
        <EmptyState
          text="Chưa có báo cáo nào. Nhấn Tạo báo cáo để sinh snapshot mới từ dữ liệu hiện tại."
          action={
            <button className="btn-primary" disabled={generate.isPending} onClick={() => generate.mutate()}>
              <RefreshCw className={`h-4 w-4 ${generate.isPending ? 'animate-spin' : ''}`} />
              Tạo báo cáo đầu tiên
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Loại</th>
                <th>Ngày</th>
                <th>Trạng thái</th>
                <th>Định dạng</th>
                <th>Thời gian tạo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {reports.data.map((item) => (
                <tr key={item.id} className="hover:bg-canvas-subtle/70">
                  <td className="font-medium">{item.title}</td>
                  <td>{item.reportType}</td>
                  <td>{new Date(item.reportDate).toLocaleDateString('vi-VN')}</td>
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
                    <button className="btn-secondary h-8 gap-1.5 px-2.5 text-xs" onClick={() => download(item.id)}>
                      <Download className="h-3.5 w-3.5" />
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
