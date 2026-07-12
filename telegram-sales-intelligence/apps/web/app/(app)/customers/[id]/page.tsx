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
  { key: 'identity', title: '1. Identity information', icon: ContactRound },
  { key: 'businessContext', title: '2. Business and customer context', icon: Building2 },
  { key: 'needs', title: '3. Customer needs', icon: Target },
  { key: 'interestedSolutions', title: '4. Products and solutions of interest', icon: Boxes },
  { key: 'budgetAndPurchase', title: '5. Budget and buying ability', icon: BadgeDollarSign },
  { key: 'concernsAndBarriers', title: '6. Concerns and barriers', icon: ShieldAlert },
  {
    key: 'communicationBehavior',
    title: '7. Communication behavior and style',
    icon: MessagesSquare,
  },
  { key: 'engagementAndClosing', title: '8. Engagement and closing likelihood', icon: Gauge },
  { key: 'decisionProcess', title: '9. Decision process', icon: CalendarClock },
] as const;

const labels: Record<string, string> = {
  fullName: 'Full name',
  preferredName: 'Preferred name',
  role: 'Role',
  phone: 'Phone',
  telegram: 'Telegram',
  location: 'Location',
  preferredChannel: 'Contact channel',
  companyName: 'Company',
  industry: 'Industry',
  segment: 'Segment',
  employeeCount: 'Company size',
  salesTeamSize: 'Sales team size',
  currentSystem: 'Current system',
  operatingMarket: 'Market',
  primaryGoal: 'Primary goal',
  painPoints: 'Pain points',
  successCriteria: 'Success criteria',
  urgency: 'Urgency',
  primaryProduct: 'Primary product',
  relatedProducts: 'Related products',
  priorityFeatures: 'Priority features',
  alternativesConsidered: 'Alternatives considered',
  estimatedBudget: 'Estimated budget',
  budgetStatus: 'Budget status',
  purchaseAuthority: 'Purchase authority',
  paymentPreference: 'Purchase model',
  purchaseProbability: 'Purchase probability',
  primaryConcern: 'Primary concern',
  objections: 'Objections',
  blockers: 'Blockers',
  riskLevel: 'Risk level',
  style: 'Communication style',
  preferredContactTime: 'Contact time',
  averageResponseMinutes: 'Average response',
  sentiment: 'Sentiment',
  leadScore: 'Lead score',
  temperature: 'Temperature',
  intentSignals: 'Intent signals',
  nextBestAction: 'Next best action',
  currentStage: 'Current stage',
  decisionMaker: 'Decision maker',
  stakeholders: 'Stakeholders',
  expectedDecisionDate: 'Expected decision date',
  requiredSteps: 'Remaining steps',
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
  if (name === 'averageResponseMinutes') return <span>{String(value)} minutes</span>;
  return (
    <span>
      {value === null || value === undefined || value === '' ? 'Not determined' : String(value)}
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
      <BackLink href="/customers" label="Back to customers" />
      <PageHeader
        title={item.fullName}
        description={`${profile.businessContext?.companyName ?? item.customerType ?? 'Customers'} · ${item.telegramUsername ? `@${item.telegramUsername}` : item.telegramUserId}`}
        actions={
          <span className="badge border-accent/20 bg-accent-muted text-accent-foreground">
            Lead score {item.leadScore ?? '—'}
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="self-start border-y border-line bg-white px-5 py-5 xl:sticky xl:top-20">
          <p className="text-xs font-medium text-ink-muted">Profile completeness</p>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-3xl font-bold text-accent">{percent(completeness)}</span>
            <span className="text-xs text-ink-muted">AI + workflow</span>
          </div>
          <div className="mt-3 h-2 bg-[#e9edf2]">
            <div className="h-full bg-accent" style={{ width: `${completeness * 100}%` }} />
          </div>
          <dl className="mt-6 divide-y divide-line text-sm">
            <div className="py-3">
              <dt className="text-xs text-ink-subtle">Owner</dt>
              <dd className="mt-1 font-semibold">{item.ownerEmployee.fullName}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-ink-subtle">Segment</dt>
              <dd className="mt-1">{item.customerType ?? 'Unclassified'}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-ink-subtle">Primary product</dt>
              <dd className="mt-1">{item.productInterest ?? 'Not determined'}</dd>
            </div>
            <div className="py-3">
              <dt className="text-xs text-ink-subtle">Last contact</dt>
              <dd className="mt-1">{formatDate(item.lastContactAt)}</dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-5 text-ink-muted">
            Source: {profile.profileMeta?.source ?? 'Basic information and conversations'}
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
                    Not enough data to determine this information group.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <section className="mt-7 border-y border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold">Transaction history</h2>
          <span className="text-xs text-ink-muted">
            {conversations.data?.length ?? 0} consultation sessions
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
