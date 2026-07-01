import { useState, useEffect } from 'react';
import { setToken, clearToken, getToken, api, setRefreshToken } from './api';

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
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    const u = data.user;
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
    } catch (err: any) {
      // Only clear session on 401 (Unauthorized), not on transient 5xx
      if (err.message === 'Session expired') {
        clearToken();
        sessionStorage.removeItem('user');
        setUser(null);
      }
      return null;
    }
  }

  function logout() {
    // Attempt server-side logout (token revocation)
    api('/auth/logout', { method: 'POST' }).catch(() => {});
    clearToken();
    sessionStorage.removeItem('user');
    setUser(null);
  }

  return { user, login, logout, fetchProfile, loading, isLoggedIn: !!user };
}
