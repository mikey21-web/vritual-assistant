'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Users, PhoneCall, ArrowUpRight, Target, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function OverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api('/analytics/overview').then(setStats).catch(() => {});
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/health`).then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  if (!stats) return <div className="text-gray-400">Loading...</div>;

  const cards = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Hot Leads', value: stats.hot, icon: Target, color: 'text-red-600 bg-red-50' },
    { label: 'Converted', value: stats.converted, icon: ArrowUpRight, color: 'text-green-600 bg-green-50' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: BarChart3, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-lg p-5 shadow-sm border">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color} mb-3`}><c.icon size={20} /></div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-sm text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-5 shadow-sm border">
          <h2 className="font-semibold mb-2">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/leads" className="p-3 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">View Leads</Link>
            <Link href="/campaigns" className="p-3 bg-green-50 text-green-700 rounded hover:bg-green-100">Create Campaign</Link>
            <Link href="/forms" className="p-3 bg-purple-50 text-purple-700 rounded hover:bg-purple-100">Build Form</Link>
            <Link href="/qr-codes" className="p-3 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">Generate QR</Link>
          </div>
        </div>
        <div className="bg-white rounded-lg p-5 shadow-sm border">
          <h2 className="font-semibold mb-2">System Status</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex justify-between"><span>Backend</span><span className={health?.status === 'ok' ? 'text-green-600' : 'text-yellow-600'}>{health?.status === 'ok' ? 'Active' : health?.status || 'Unknown'}</span></div>
            <div className="flex justify-between"><span>Database</span><span className={health?.checks?.database === 'connected' ? 'text-green-600' : 'text-red-600'}>{health?.checks?.database || 'Unknown'}</span></div>
            <div className="flex justify-between"><span>Webhook Endpoints</span><span className="text-green-600">Ready</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
