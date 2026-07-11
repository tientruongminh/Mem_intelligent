'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MessageSquareText, ShieldCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { apiFetch } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('Demo123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('tsi_token', result.accessToken);
      router.replace('/dashboard');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-text lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse at 20% 0%, rgba(29,78,216,0.35), transparent 55%), radial-gradient(ellipse at 90% 80%, rgba(29,78,216,0.12), transparent 45%)',
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-sidebar-muted">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-[11px] font-bold text-white">
              TS
            </span>
            Sales Intelligence
          </span>
        </div>
        <motion.div
          className="relative"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">CRM · Telegram</p>
          <h1 className="mt-3 max-w-md text-[2rem] font-semibold leading-tight tracking-tight text-white">
            Tư vấn bằng con người, quyết định bằng dữ liệu đã kiểm chứng
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-sidebar-muted">
            Theo dõi khách, hội thoại và insight bán hàng trong một không gian làm việc thống nhất.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-sidebar-text/85">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
              OTP và 2FA không được lưu trên hệ thống
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
              AI chỉ phân tích — sale trực tiếp trả lời khách
            </li>
          </ul>
        </motion.div>
        <p className="relative text-xs text-sidebar-muted">Demo Organization · Asia/Ho_Chi_Minh</p>
      </section>

      <section className="flex items-center justify-center bg-canvas px-4 py-10">
        <motion.div
          className="w-full max-w-[400px]"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="mb-8 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-white">
              <MessageSquareText className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Sales Intelligence</h1>
          </div>

          <div className="mb-7 hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Đăng nhập</h2>
            <p className="mt-1.5 text-sm text-ink-muted">Truy cập không gian làm việc của bạn</p>
          </div>

          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-panel">
            <label className="block">
              <span className="label">Email</span>
              <input
                className="field"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="label">Mật khẩu</span>
              <input
                className="field"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {error && (
              <p role="alert" className="alert-danger">
                {error}
              </p>
            )}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-relaxed text-ink-subtle lg:text-left">
            Demo: <span className="font-medium text-ink-muted">admin@demo.local</span> / Demo123!
          </p>
        </motion.div>
      </section>
    </main>
  );
}
