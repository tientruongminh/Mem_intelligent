const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function getToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('tsi_token');
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('tsi_token');
    window.location.href = '/login';
  }
  const payload = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new Error(payload?.error?.message ?? `Request failed (${response.status})`);
  return payload as T;
}

export const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—';
export const percent = (value?: number | null) => `${Math.round((value ?? 0) * 100)}%`;
