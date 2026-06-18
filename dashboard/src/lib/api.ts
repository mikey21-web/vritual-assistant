const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let token: string | null = null;

export function setToken(t: string) {
  token = t;
  if (typeof window !== 'undefined') localStorage.setItem('token', t);
}

export function getToken(): string | null {
  if (token) return token;
  if (typeof window !== 'undefined') token = localStorage.getItem('token');
  return token;
}

export function clearToken() {
  token = null;
  if (typeof window !== 'undefined') localStorage.removeItem('token');
}

export async function api(path: string, options: RequestInit = {}) {
  const t = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401 && !options.headers?.['x-retry-auth']) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || res.statusText);
  }
  return res.json();
}
