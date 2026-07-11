'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeDollarSign,
  Boxes,
  Building2,
  CalendarClock,
  ContactRound,
  Gauge,
  MessageSquareText,
  MessagesSquare,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { apiFetch, formatDate, percent } from '../../../../lib/api';
import { BackLink, LoadingState, PageHeader, StatusBadge } from '../../../../components/ui';

const sections = [
  { key: 'identity', title: '1. Thông tin định danh', icon: ContactRound },
  { key: 'businessContext', title: '2. Doanh nghiệp và bối cảnh khách hàng', icon: Building2 },
  { key: 'needs', title: '3. Nhu cầu của khách hàng', icon: Target },
  { key: 'interestedSolutions', title: '4. Sản phẩm và giải pháp quan tâm', icon: Boxes },
  { key: 'budgetAndPurchase', title: '5. Ngân sách và khả năng mua', icon: BadgeDollarSign },
  { key: 'concernsAndBarriers', title: '6. Lo ngại và rào cản', icon: ShieldAlert },
  {
    key: 'communicationBehavior',
    title: '7. Hành vi và phong cách giao tiếp',
    icon: MessagesSquare,
  },
  { key: 'engagementAndClosing', title: '8. Mức độ quan tâm và khả năng chốt', icon: Gauge },
  { key: 'decisionProcess', title: '9. Tiến trình ra quyết định', icon: CalendarClock },
] as const;

const labels: Record<string, string> = {
  fullName: 'Họ tên',
  preferredName: 'Tên thường gọi',
  role: 'Vai trò',
  phone: 'Số điện thoại',
  telegram: 'Telegram',
  location: 'Khu vực',
  preferredChannel: 'Kênh liên hệ',
  companyName: 'Doanh nghiệp',
  industry: 'Ngành',
  segment: 'Phân khúc',
  employeeCount: 'Quy mô nhân sự',
  salesTeamSize: 'Quy mô đội sales',
  currentSystem: 'Hệ thống hiện tại',
  operatingMarket: 'Thị trường',
  primaryGoal: 'Mục tiêu chính',
  painPoints: 'Vấn đề cần giải quyết',
  successCriteria: 'Tiêu chí thành công',
  urgency: 'Mức độ cấp thiết',
  primaryProduct: 'Sản phẩm chính',
  relatedProducts: 'Sản phẩm liên quan',
  priorityFeatures: 'Tính năng ưu tiên',
  alternativesConsidered: 'Giải pháp đang so sánh',
  estimatedBudget: 'Ngân sách dự kiến',
  budgetStatus: 'Trạng thái ngân sách',
  purchaseAuthority: 'Thẩm quyền mua',
  paymentPreference: 'Hình thức mua',
  purchaseProbability: 'Xác suất mua',
  primaryConcern: 'Lo ngại chính',
  objections: 'Các phản đối',
  blockers: 'Điểm nghẽn',
  riskLevel: 'Mức rủi ro',
  style: 'Phong cách giao tiếp',
  preferredContactTime: 'Thời gian liên hệ',
  averageResponseMinutes: 'Phản hồi trung bình',
  sentiment: 'Sắc thái',
  leadScore: 'Lead score',
  temperature: 'Mức độ nóng',
  intentSignals: 'Tín hiệu quan tâm',
  nextBestAction: 'Hành động tiếp theo',
  currentStage: 'Giai đoạn hiện tại',
  decisionMaker: 'Người quyết định',
  stakeholders: 'Các bên liên quan',
  expectedDecisionDate: 'Ngày dự kiến quyết định',
  requiredSteps: 'Các bước còn lại',
};

function FieldValue({ name, value }: { name: string; value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="border border-line bg-canvas-subtle px-2 py-1 text-xs"
            style={{ borderRadius: 5 }}
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof value === 'number' && name.toLowerCase().includes('probability'))
    return <span className="font-semibold text-accent">{percent(value)}</span>;
  if (name === 'averageResponseMinutes') return <span>{String(value)} phút</span>;
  return (
    <span>
      {value === null || value === undefined || value === '' ? 'Chưa xác định' : String(value)}
    </span>
  );
}

export default function CustomerDetailPage() {
  const id = String(useParams().id);
  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => apiFetch<any>(`/customers/${id}`),
  });
  const conversations = useQuery({
    queryKey: ['customer-conversations', id],
    queryFn: () => apiFetch<any[]>(`/customers/${id}/conversations`),
  });
  if (customer.isLoading) return <LoadingState />;
  const item = customer.data;
  const profile = item.profileJson ?? {};
  const completeness = Number(profile.profileMeta?.completeness ?? 0.25);

  return (
    <>
      <BackLink href="/customers" label="Quay lại danh sách khách hàng" />
      <PageHeader
        title={item.fullName}
        description={`${profile.businessContext?.companyName ?? item.customerType ?? 'Khách hàng'} · ${item.telegramUsername ? `@${item.telegramUsername}` : item.telegramUserId}`}
        actions={
          <span className="badge border-accent/20 bg-accent-muted text-accent-foreground">
            Lead score {item.leadScore ?? '—'}
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="self-start border-y border-line bg-white px-5 py-5 xl:sticky xl:top-20">
          <p className="text-xs font-medium text-ink-muted">Độ đầy đủ hồ sơ</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-bold text-accent">{percent(completeness)}</span>
            <span className="text-xs text-ink-muted">AI + workflow</span>
          </div>
          <div className="mt-3 h-2 bg-[#e9edf2]">
            <div className="h-full bg-accent" style={{ width: `${completeness * 100}%` }} />
          </div>
          <dl className="mt-6 divide-y divide-line text-sm">
            <div className="py-3">
              <dt className="text-xs text-ink-subtle">Sale phụ trách</dt>
              <dd className="mt-1 font-semibold">{item.ownerEmployee.fullName}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-ink-subtle">Phân khúc</dt>
              <dd className="mt-1">{item.customerType ?? 'Chưa phân loại'}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-ink-subtle">Sản phẩm chính</dt>
              <dd className="mt-1">{item.productInterest ?? 'Chưa xác định'}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-ink-subtle">Liên hệ gần nhất</dt>
              <dd className="mt-1">{formatDate(item.lastContactAt)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-5 text-ink-muted">
            Nguồn: {profile.profileMeta?.source ?? 'Thông tin cơ bản và conversation'}
          </p>
        </aside>

        <div className="border-y border-line bg-white">
          {sections.map(({ key, title, icon: Icon }) => {
            const data = profile[key] ?? {};
            return (
              <section key={key} className="border-b border-line px-5 py-6 last:border-0 lg:px-7">
                <div className="mb-5 flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 place-items-center bg-accent-muted text-accent"
                    style={{ borderRadius: 6 }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <h2 className="font-semibold">{title}</h2>
                </div>
                {Object.keys(data).length ? (
                  <dl className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                    {Object.entries(data).map(([name, value]) => (
                      <div key={name} className={Array.isArray(value) ? 'md:col-span-2' : ''}>
                        <dt className="mb-1.5 text-xs font-medium text-ink-subtle">
                          {labels[name] ?? name}
                        </dt>
                        <dd className="text-sm leading-6 text-[#354154]">
                          <FieldValue name={name} value={value} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-ink-muted">
                    Chưa đủ dữ liệu để xác định nhóm thông tin này.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <section className="mt-7 border-y border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold">Lịch sử transaction</h2>
          <span className="text-xs text-ink-muted">
            {conversations.data?.length ?? 0} phiên tư vấn
          </span>
        </div>
        <div className="divide-y divide-line">
          {conversations.data?.map((conversation) => (
            <Link
              href={`/conversations/${conversation.id}`}
              key={conversation.id}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-canvas-subtle"
            >
              <div>
                <p className="font-semibold">{formatDate(conversation.startedAt)}</p>
                <div className="mt-2 flex gap-2">
                  <StatusBadge value={conversation.status} />
                  <StatusBadge value={conversation.outcome} />
                </div>
              </div>
              <MessageSquareText className="h-4 w-4 text-accent" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
