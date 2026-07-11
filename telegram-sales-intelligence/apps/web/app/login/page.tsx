'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
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
    <main className="grid min-h-screen place-items-center bg-[#172033] px-4">
      <div
        className="w-full max-w-md border border-white/10 bg-white p-7 shadow-2xl"
        style={{ borderRadius: 8 }}
      >
        <div className="mb-7 flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center bg-teal text-white"
            style={{ borderRadius: 7 }}
          >
            <MessageSquareText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Sales Intelligence</h1>
            <p className="text-sm text-[#667085]">Đăng nhập không gian làm việc</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label>
            <span className="label">Email</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="label">Mật khẩu</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && (
            <p
              className="border border-[#efb0a2] bg-[#fff0ec] p-3 text-sm text-[#a33b25]"
              style={{ borderRadius: 6 }}
            >
              {error}
            </p>
          )}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-[#778195]">
          AI chỉ hỗ trợ phân tích. Sale quyết định và trực tiếp trả lời khách hàng.
        </p>
      </div>
    </main>
  );
}
