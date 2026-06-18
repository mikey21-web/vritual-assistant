'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const router = useRouter();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await login(email, password); router.push('/'); }
    catch (err: any) { setError(err.message); }
  };

  return (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <form onSubmit={handle} className="bg-white p-8 rounded-lg w-full max-w-sm shadow-xl">
        <h1 className="text-xl font-bold mb-6">Lead Automation</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border rounded p-2.5 mb-3 text-sm" required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full border rounded p-2.5 mb-4 text-sm" required />
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white rounded p-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
