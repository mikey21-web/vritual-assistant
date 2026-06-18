const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let token: string | null = localStorage.getItem('token');

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
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export async function api(path: string, options: RequestInit = {}): Promise<any> {
  const t = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) { clearToken(); window.location.href = '/login'; throw new Error('Session expired'); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join('; ') : body.message || res.statusText;
    throw new Error(msg);
  }
  return res.json();
}

export async function apiUpload(path: string, formData: FormData): Promise<any> {
  const t = getToken();
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', body: formData, headers: t ? { Authorization: `Bearer ${t}` } : {} });
  if (res.status === 401) { clearToken(); window.location.href = '/login'; throw new Error('Session expired'); }
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
