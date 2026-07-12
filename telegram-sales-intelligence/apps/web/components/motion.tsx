'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const ease = [0.4, 0, 0.2, 1] as const;

export function PageEnter({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.28, ease } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function SlideOver({
  open,
  onClose,
  children,
  side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
}) {
  const reduce = useReducedMotion();
  if (!open) return null;

  const x = side === 'right' ? '100%' : '-100%';

  return (
    <>
      <motion.button
        aria-label="Close"
        className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        onClick={onClose}
      />
      <motion.aside
        className={`fixed inset-y-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto border-line bg-surface shadow-elevated ${side === 'right' ? 'right-0 border-l' : 'left-0 border-r'}`}
        initial={{ x: reduce ? 0 : x }}
        animate={{ x: 0 }}
        transition={{ duration: reduce ? 0 : 0.28, ease }}
      >
        {children}
      </motion.aside>
    </>
  );
}

export function SlidePanel({
  open,
  onClose,
  children,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close panel"
            className="absolute inset-0 z-[9] cursor-default bg-ink/10 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            onClick={onClose}
          />
          <motion.aside
            className={`absolute inset-y-0 right-0 z-10 flex w-full max-w-md flex-col overflow-hidden border-l border-line bg-surface shadow-elevated ${className}`}
            initial={{ x: reduce ? 0 : '100%', opacity: reduce ? 1 : 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduce ? 0 : '100%', opacity: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
