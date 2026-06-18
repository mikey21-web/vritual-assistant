'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { BarChart3, Users, Target, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    api('/analytics/overview').then(setOverview);
    api('/analytics/sources').then(setSources);
    api('/analytics/agents').then(setAgents);
  }, []);

  if (!overview) return <div className="text-gray-400">Loading...</div>;

  const cards = [
    { label: 'Total Leads', value: overview.total, icon: Users, color: 'text-blue-600', bgl: 'bg-blue-50' },
    { label: 'Hot Leads', value: overview.hot, icon: Target, color: 'text-red-600', bgl: 'bg-red-50' },
    { label: 'Converted', value: overview.converted, icon: TrendingUp, color: 'text-green-600', bgl: 'bg-green-50' },
    { label: 'Rate', value: `${overview.conversionRate}%`, icon: BarChart3, color: 'text-purple-600', bgl: 'bg-purple-50' },
  ];

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Analytics</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white border rounded-lg p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bgl} ${c.color} mb-3`}><c.icon size={20} /></div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold mb-3">Leads by Source</h3>
          {sources.map((s: any) => (
            <div key={s.source} className="flex justify-between text-sm py-2 border-b last:border-0">
              <span>{s.source}</span>
              <span className="font-medium">{s.count}</span>
            </div>
          ))}
        </div>
        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold mb-3">Agent Performance</h3>
          {agents.map((a: any) => (
            <div key={a.id} className="flex justify-between text-sm py-2 border-b last:border-0">
              <span>{a.name}</span>
              <span className="font-medium">{a.converted}/{a.assignedLeads}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
