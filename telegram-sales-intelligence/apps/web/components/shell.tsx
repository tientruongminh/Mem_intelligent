'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  FileText,
  LogOut,
  Menu,
  MessageSquareText,
  Users,
  X,
} from 'lucide-react';
import { getToken } from '../lib/api';

const links = [
  { href: '/customers', label: 'Manage Customer', icon: Users },
  { href: '/conversations', label: 'Transactions', icon: MessageSquareText },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/employees', label: 'Employee Profiles', icon: BriefcaseBusiness },
];

const utilityLinks = [
  { href: '/integrations/telegram', label: 'Telegram Setup', icon: Bot },
  { href: '/reports', label: 'Daily Reports', icon: FileText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  const logout = () => {
    localStorage.removeItem('tsi_token');
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-canvas">
      {open && (
        <button
          aria-label="Đóng menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#253043] bg-[#172033] text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link href="/customers" className="flex items-center gap-3">
            <span
              className="grid h-8 w-8 place-items-center bg-[#18a4ad] font-bold"
              style={{ borderRadius: 6 }}
            >
              TS
            </span>
            <span className="text-sm font-bold leading-tight">Sales Intelligence</span>
          </Link>
          <button className="p-1 lg:hidden" aria-label="Đóng menu" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex h-10 items-center gap-3 px-3 text-sm transition ${active ? 'bg-white/12 text-white' : 'text-[#b8c2d1] hover:bg-white/7 hover:text-white'}`}
                style={{ borderRadius: 6 }}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-3 py-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase text-[#7f8ca0]">Tiện ích</p>
          {utilityLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex h-10 items-center gap-3 px-3 text-sm ${active ? 'bg-white/12 text-white' : 'text-[#b8c2d1] hover:bg-white/7 hover:text-white'}`}
                style={{ borderRadius: 6 }}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            className="flex h-10 w-full items-center gap-3 px-3 text-sm text-[#b8c2d1] hover:bg-white/7 hover:text-white"
            style={{ borderRadius: 6 }}
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:px-8">
          <button
            className="btn-secondary h-9 w-9 px-0 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Mở menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold">Demo Organization</p>
            <p className="text-xs text-[#778195]">Asia/Ho_Chi_Minh</p>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
