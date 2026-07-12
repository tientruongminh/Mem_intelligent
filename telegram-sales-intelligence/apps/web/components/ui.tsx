import Link from 'next/link';
import { ArrowLeft, Inbox, LoaderCircle, Search } from 'lucide-react';

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[1.375rem] font-semibold tracking-tight text-ink lg:text-[1.625rem]">
            {title}
          </h1>
          {meta && (
            <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-muted">
              {meta}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-accent"
    >
      <ArrowLeft
        className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
        strokeWidth={1.75}
      />
      {label}
    </Link>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
        strokeWidth={1.75}
      />
      <input
        className="field pl-10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel overflow-hidden ${className}`}>
      <div className="section-head">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-ink-subtle">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StepIndicator({
  steps,
  current,
}: {
  steps: { key: string; label: string }[];
  current: string;
}) {
  const currentIndex = steps.findIndex((step) => step.key === current);

  return (
    <ol className="mb-6 flex items-center gap-2">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = step.key === current;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors ${
                active
                  ? 'bg-accent text-white'
                  : done
                    ? 'bg-accent-muted text-accent-foreground'
                    : 'bg-canvas-subtle text-ink-subtle'
              }`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span
              className={`hidden truncate text-xs font-medium sm:block ${active ? 'text-ink' : 'text-ink-subtle'}`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span
                className={`mx-1 hidden h-px flex-1 sm:block ${done ? 'bg-accent/40' : 'bg-line'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function LoadingState({ text = 'Loading data' }: { text?: string }) {
  return (
    <div className="panel flex min-h-44 items-center justify-center text-sm text-ink-muted">
      <LoaderCircle className="mr-2.5 h-4 w-4 animate-spin text-accent" />
      {text}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="panel overflow-hidden p-0">
      <div className="border-b border-line bg-canvas-subtle px-5 py-3.5">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, index) => (
            <div key={index} className="skeleton h-3 flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 border-b border-line-subtle px-5 py-4 last:border-0">
          {Array.from({ length: cols }).map((_, col) => (
            <div key={col} className="skeleton h-4 flex-1" style={{ opacity: 1 - col * 0.08 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  text = 'No data yet.',
  action,
}: {
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel flex min-h-52 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-canvas-subtle text-ink-subtle">
        <Inbox className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="max-w-sm text-sm leading-relaxed text-ink-muted">{text}</p>
      {action}
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const style =
    value === 'OPEN' || value === 'CONNECTED' || value === 'PUBLISHED' || value === 'UPLOADED'
      ? 'border-success/20 bg-success-muted text-success-foreground'
      : value === 'WON'
        ? 'border-accent/20 bg-accent-muted text-accent-foreground'
        : value === 'LOST' || value === 'ERROR'
          ? 'border-danger/20 bg-danger-muted text-danger-foreground'
          : 'border-line bg-canvas-subtle text-ink-muted';
  const labels: Record<string, string> = {
    OPEN: 'Consulting',
    WON: 'Won',
    LOST: 'Lost',
    STOPPED: 'Stopped',
    CONNECTED: 'Connected',
    DISCONNECTED: 'Disconnected',
    PUBLISHED: 'Published',
    ACTIVE: 'Active',
  };
  return <span className={`badge ${style}`}>{labels[value] ?? value}</span>;
}
