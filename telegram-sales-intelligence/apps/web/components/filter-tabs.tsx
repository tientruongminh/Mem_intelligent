'use client';

import { motion, useReducedMotion } from 'motion/react';

export function FilterTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="mb-5 flex max-w-full gap-1 overflow-x-auto border-b border-line pb-px">
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            className={`relative h-10 shrink-0 px-3.5 text-sm font-medium transition-colors ${active ? 'text-accent' : 'text-ink-muted hover:text-ink'}`}
            onClick={() => onChange(item.value)}
          >
            {item.label}
            {active &&
              (reduce ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
              ) : (
                <motion.span
                  layoutId="filter-tab"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ))}
          </button>
        );
      })}
    </div>
  );
}
