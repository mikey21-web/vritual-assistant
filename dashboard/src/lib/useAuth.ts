'use client';

import { useState } from 'react';
import { setToken, clearToken, getToken, api } from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string) {
    setLoading(true);
    const { accessToken, user: u } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(accessToken);
    setUser(u);
    setLoading(false);
    return u;
  }

  async function register(data: any) {
    setLoading(true);
    const result = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(result.accessToken);
    setUser(result.user);
    setLoading(false);
    return result.user;
  }

  async function fetchProfile() {
    if (!getToken()) return null;
    try {
      const u = await api('/auth/me');
      setUser(u);
      return u;
    } catch {
      clearToken();
      return null;
    }
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return { user, login, register, logout, fetchProfile, loading, isLoggedIn: !!user };
}
