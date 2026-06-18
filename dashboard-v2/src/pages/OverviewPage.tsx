import React, { useState, useEffect } from 'react';
import { fetchAnalytics, fetchSources, fetchAgents, fetchHealth, fetchDeepHealth, fetchFailures } from '../lib/data';
import { useApp } from '../context/AppContext';
import { Users, Target, TrendingUp, BarChart3, Activity, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OverviewPage() {
  const { niche, isSuperAdmin } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [failures, setFailures] = useState(0);

  useEffect(() => {
    fetchAnalytics().then(setStats).catch(() => {});
    fetchHealth().then(setHealth).catch(() => {});
    if (isSuperAdmin) fetchFailures('open').then((d: any[]) => setFailures(d.length)).catch(() => {});
  }, []);

  if (!stats) return <div className="text-center text-gray-400 py-20">Loading...</div>;

  const cards = [
    { label: niche?.labels?.lead ? `Total ${niche.labels.lead}s` : 'Total Leads', value: stats.total, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Hot', value: stats.hot, icon: Target, color: 'text-red-600 bg-red-50' },
    { label: 'Converted', value: stats.converted, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: BarChart3, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{niche?.display_name || 'Dashboard'} Overview</h2>
        <p className="text-xs text-gray-400 mt-1">
          {niche ? `${niche.industry} · ${niche.conversion_goals?.join(', ') || 'No goals configured'}` : 'Loading niche configuration...'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200/50 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color} mb-3`}><c.icon size={20} /></div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200/50 p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-3">System Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Backend</span><span className={health?.status === 'ok' ? 'text-green-600' : 'text-yellow-600'}>{health?.status || 'Unknown'}</span></div>
            <div className="flex justify-between"><span>Database</span><span className={health?.checks?.database === 'connected' ? 'text-green-600' : 'text-red-600'}>{health?.checks?.database || 'Unknown'}</span></div>
            {isSuperAdmin && <div className="flex justify-between"><span>Open Failures</span><span className={failures > 0 ? 'text-red-600' : 'text-green-600'}>{failures}</span></div>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/50 p-5 shadow-sm">
          <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <a href="/leads" className="p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-center">View Leads</a>
            <a href="/campaigns" className="p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-center">Campaigns</a>
            <a href="/tasks" className="p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-center">Tasks</a>
            <a href="/analytics" className="p-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 text-center">Analytics</a>
          </div>
        </div>
      </div>
    </div>
  );
}
