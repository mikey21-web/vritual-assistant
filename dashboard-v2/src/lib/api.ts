import { getMockResponse } from './mock-data';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let token: string | null = localStorage.getItem('token');
let refreshToken: string | null = localStorage.getItem('refreshToken');

export function setToken(t: string) {
  token = t;
  localStorage.setItem('token', t);
}

export function getToken(): string | null {
  if (!token) token = localStorage.getItem('token');
  return token;
}

export function clearToken() {
  token = null;
  refreshToken = null;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function setRefreshToken(t: string) {
  refreshToken = t;
  localStorage.setItem('refreshToken', t);
}

async function tryRefresh(): Promise<boolean> {
  const rt = refreshToken || localStorage.getItem('refreshToken');
  if (!rt) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function api(path: string, options: RequestInit = {}): Promise<any> {
  const isAuth = path.startsWith('/auth/');
  if (isAuth) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
      const res = await fetch(`${API_URL}${path}`, { ...options, headers });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || res.statusText); }
      const data = await res.json();
      if (data.accessToken) setToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      return data;
    } catch (e) { throw e; }
  }

  const t = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (t) headers['Authorization'] = `Bearer ${t}`;

  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        const newToken = getToken();
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers });
        if (retryRes.ok) return retryRes.json();
      }
      clearToken();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = Array.isArray(body.message) ? body.message.join('; ') : body.message || res.statusText;
      throw new Error(msg);
    }
    return res.json();
  } catch (err: any) {
    if (import.meta.env.DEV && (err.message === 'Session expired' || err.message === 'Failed to fetch' || err.name === 'TypeError' || err.message?.includes('NetworkError') || err.message?.includes('network'))) {
      const mock = getMockResponse(path, options.method || 'GET', options.body ? JSON.parse(options.body as string) : undefined);
      if (mock !== null) return mock;
    }
    throw err;
  }
}

export async function apiUpload(path: string, formData: FormData): Promise<any> {
  const t = getToken();
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', body: formData, headers: t ? { Authorization: `Bearer ${t}` } : {} });
  if (res.status === 401) { clearToken(); window.location.href = '/login'; throw new Error('Session expired'); }
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
