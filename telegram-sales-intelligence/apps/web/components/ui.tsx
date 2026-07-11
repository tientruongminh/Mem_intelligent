import { LoaderCircle } from 'lucide-react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-[#667085]">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="panel flex min-h-40 items-center justify-center text-sm text-[#667085]">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      Đang tải dữ liệu
    </div>
  );
}

export function EmptyState({ text = 'Chưa có dữ liệu.' }: { text?: string }) {
  return (
    <div className="panel flex min-h-40 items-center justify-center px-6 text-center text-sm text-[#667085]">
      {text}
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const style =
    value === 'OPEN' || value === 'CONNECTED' || value === 'PUBLISHED' || value === 'UPLOADED'
      ? 'border-[#9ed7c6] bg-[#e9f8f2] text-[#146c50]'
      : value === 'WON'
        ? 'border-[#8fc7d1] bg-[#e7f6f8] text-[#086b75]'
        : value === 'LOST' || value === 'ERROR'
          ? 'border-[#efb0a2] bg-[#fff0ec] text-[#a33b25]'
          : 'border-[#d6dce4] bg-[#f4f6f8] text-[#596579]';
  const labels: Record<string, string> = {
    OPEN: 'Đang tư vấn',
    WON: 'Chốt thành công',
    LOST: 'Không thành công',
    STOPPED: 'Ngừng tư vấn',
    CONNECTED: 'Đã kết nối',
    DISCONNECTED: 'Đã ngắt',
    PUBLISHED: 'Đã xuất bản',
    ACTIVE: 'Hoạt động',
  };
  return <span className={`badge ${style}`}>{labels[value] ?? value}</span>;
}
