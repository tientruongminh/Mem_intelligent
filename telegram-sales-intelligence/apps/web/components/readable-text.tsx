'use client';

import { Fragment } from 'react';

/** Tách câu đầu làm lead, highlight số/% để dễ quét — tránh wall-of-gray AI slop. */
function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.map((s) => s.trim()) ?? [trimmed];
}

function highlightInline(text: string) {
  const parts = text.split(/(\d[\d.,]*%?|\d+\s+(?:mẫu|conversation|trường hợp|bước|ngày|tin nhắn))/gi);
  return parts.map((part, index) => {
    if (/^\d/.test(part)) {
      return (
        <mark key={index} className="text-highlight">
          {part}
        </mark>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function ReadableText({
  text,
  className = '',
}: {
  text?: string | null;
  className?: string;
}) {
  if (!text?.trim()) return null;

  const sentences = splitSentences(text);
  const [lead, ...rest] = sentences;

  return (
    <div className={`readable ${className}`}>
      {lead && <p className="readable-lead">{highlightInline(lead)}</p>}
      {rest.map((sentence, index) => (
        <p key={index} className="readable-body">
          {highlightInline(sentence)}
        </p>
      ))}
    </div>
  );
}

export function DocSection({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`doc-section ${className}`}>
      <h3 className="doc-label">{label}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function SpecList({
  items,
}: {
  items: { label: string; value: React.ReactNode; hint?: string }[];
}) {
  return (
    <dl className="spec-list">
      {items.map((item) => (
        <div key={item.label} className="spec-row">
          <dt className="spec-label">{item.label}</dt>
          <dd className="spec-value">{item.value}</dd>
          {item.hint && <dd className="spec-hint">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
