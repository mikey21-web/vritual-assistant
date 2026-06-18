'use client';

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
  const [user, setUser] = useState<AuthUser | null>(() => {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string) {
    setLoading(true);
    const { accessToken, user: u } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(accessToken);
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
    setLoading(false);
    return u;
  }

  async function fetchProfile() {
    if (!getToken()) return null;
    try {
      const u = await api('/auth/me');
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
      return u;
    } catch { clearToken(); return null; }
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return { user, login, logout, fetchProfile, loading, isLoggedIn: !!user };
}
