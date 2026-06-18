import { useState, useEffect } from 'react';
import { setToken, clearToken, getToken, api } from './api';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  name?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cached = sessionStorage.getItem('user');
    if (cached) setUser(JSON.parse(cached));
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    const { accessToken, user: u } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(accessToken);
    setUser(u);
    sessionStorage.setItem('user', JSON.stringify(u));
    setLoading(false);
    return u;
  }

  async function fetchProfile() {
    if (!getToken()) return null;
    try {
      const u = await api('/auth/me');
      setUser(u);
      sessionStorage.setItem('user', JSON.stringify(u));
      return u;
    } catch { clearToken(); return null; }
  }

  function logout() {
    clearToken();
    sessionStorage.removeItem('user');
    setUser(null);
  }

  return { user, login, logout, fetchProfile, loading, isLoggedIn: !!user };
}
