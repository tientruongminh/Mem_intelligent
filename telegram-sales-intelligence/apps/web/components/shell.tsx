'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Users,
  X,
} from 'lucide-react';
import { getToken } from '../lib/api';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Khách hàng', icon: Users },
  { href: '/conversations', label: 'Giao dịch', icon: MessageSquareText },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/employees', label: 'Nhân viên', icon: BriefcaseBusiness },
];

const utilityLinks = [
  { href: '/integrations/telegram', label: 'Telegram', icon: Bot },
  { href: '/reports', label: 'Báo cáo', icon: FileText },
];

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Khách hàng',
  conversations: 'Giao dịch',
  insights: 'Insights',
  employees: 'Nhân viên',
  integrations: 'Tích hợp',
  telegram: 'Telegram',
  reports: 'Báo cáo',
  workflow: 'Workflow',
};

function breadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let href = '';
  for (const part of parts) {
    href += `/${part}`;
    crumbs.push({ href, label: routeLabels[part] ?? part });
  }
  return crumbs;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const crumbs = breadcrumbs(pathname);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const pageTitle = crumbs.at(-1)?.label ?? 'Dashboard';

  const logout = () => {
    localStorage.removeItem('tsi_token');
    router.replace('/login');
  };

  return (
    <div className="min-h-dvh bg-canvas">
      {open && (
        <button
          aria-label="Đóng menu"
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar text-sidebar-text transition-transform duration-300 ease-smooth lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-[60px] items-center justify-between border-b border-sidebar-border px-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-[11px] font-bold tracking-wide text-white">
              TS
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold tracking-tight text-white">Sales Intel</p>
              <p className="truncate text-[10px] text-sidebar-muted">Telegram CRM</p>
            </div>
          </Link>
          <button
            className="grid h-8 w-8 place-items-center rounded-lg text-sidebar-muted hover:bg-sidebar-active hover:text-white lg:hidden"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 pt-4 pb-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted/80">
            Làm việc
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={active ? 'nav-item-active' : 'nav-item-inactive'}>
                {!reduce && active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-[10px] bg-sidebar-active"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                {reduce && active && (
                  <span className="absolute inset-0 rounded-[10px] bg-sidebar-active" />
                )}
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent" />
                )}
                <Icon
                  className={`relative h-4 w-4 shrink-0 ${active ? 'text-accent' : ''}`}
                  strokeWidth={active ? 2 : 1.75}
                />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pt-2 pb-1">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-muted/80">
            Hệ thống
          </p>
        </div>

        <div className="space-y-0.5 px-3 pb-2">
          {utilityLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={active ? 'nav-item-active' : 'nav-item-inactive'}>
                {active && (
                  <>
                    <span className="absolute inset-0 rounded-[10px] bg-sidebar-active" />
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent" />
                  </>
                )}
                <Icon
                  className={`relative h-4 w-4 shrink-0 ${active ? 'text-accent' : ''}`}
                  strokeWidth={active ? 2 : 1.75}
                />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={logout}
            className="nav-item-inactive w-full"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur-md">
          <div className="flex h-[60px] items-center justify-between gap-4 px-4 lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="btn-secondary h-9 w-9 shrink-0 px-0 lg:hidden"
                onClick={() => setOpen(true)}
                aria-label="Mở menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              {crumbs.length > 0 && (
                <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
                  {crumbs.map((crumb, index) => (
                    <span key={crumb.href} className="flex min-w-0 items-center gap-1">
                      {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle" />}
                      {index === crumbs.length - 1 ? (
                        <span className="truncate font-semibold text-ink">{crumb.label}</span>
                      ) : (
                        <Link href={crumb.href} className="truncate text-ink-muted hover:text-accent">
                          {crumb.label}
                        </Link>
                      )}
                    </span>
                  ))}
                </nav>
              )}
              <p className="truncate text-sm font-semibold text-ink md:hidden">{pageTitle}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-ink">Demo Org</p>
                <p className="text-[11px] text-ink-subtle">Asia/Ho_Chi_Minh</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">
                DO
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
