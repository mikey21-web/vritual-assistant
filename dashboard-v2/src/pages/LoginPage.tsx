import React, { useState, useEffect } from 'react';
import { Link, LogIn } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await login(email, password); window.location.reload(); }
    catch (err: any) { setError(err.message || 'Login failed'); }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <form onSubmit={handle} className="bg-white p-8 rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-md bg-blue-600 flex items-center justify-center font-bold text-white text-sm">L</div>
          <h1 className="text-xl font-bold text-gray-900">Lead Auto</h1>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 mb-3 text-sm bg-gray-50 focus:bg-white" required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 mb-4 text-sm bg-gray-50 focus:bg-white" required />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          <LogIn className="w-4 h-4" /> {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
