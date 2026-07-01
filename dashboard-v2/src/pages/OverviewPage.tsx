import React, { useState, useEffect } from 'react';
import { fetchAnalytics, fetchHealth, fetchFailures } from '../lib/data';
import { useApp } from '../context/AppContext';
import { Users, Target, TrendingUp, BarChart3, Activity, AlertTriangle, ArrowUpRight } from 'lucide-react';

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

  if (!stats) return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-28 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
        ))}
      </div>
    </div>
  );

  const leadLabel = niche?.labels?.lead || 'Lead';

  const cards = [
    { label: `Total ${leadLabel}s`, value: stats.total, icon: Users, change: '+12%', color: 'from-blue-500 to-blue-600' },
    { label: 'Hot Leads', value: stats.hot, icon: Target, change: '+5%', color: 'from-red-500 to-red-600' },
    { label: 'Converted', value: stats.converted, icon: TrendingUp, change: '+8%', color: 'from-emerald-500 to-emerald-600' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: BarChart3, change: '+2.3%', color: 'from-violet-500 to-violet-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{niche?.display_name || 'Dashboard'} Overview</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {niche ? `${niche.industry} · ${niche.conversion_goals?.join(', ') || 'No goals configured'}` : 'Loading configuration...'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="group relative rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center shadow-sm`}>
                <c.icon size={20} className="text-white" />
              </div>
              {c.change && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={12} />
                  {c.change}
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{c.value}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Activity size={16} className="text-[var(--primary)]" />
            System Status
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Backend', status: health?.status === 'ok' ? 'Operational' : 'Degraded', ok: health?.status === 'ok' },
              { label: 'Database', status: health?.checks?.database === 'connected' ? 'Connected' : 'Disconnected', ok: health?.checks?.database === 'connected' },
              ...(isSuperAdmin ? [{ label: 'Open Failures', status: `${failures} pending`, ok: failures === 0 }] : []),
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm text-[var(--foreground)]">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${item.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {item.status}
                  </span>
                  <div className={`h-2 w-2 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-red-500'} ${item.ok ? '' : 'animate-pulse'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Target size={16} className="text-[var(--primary)]" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'View Leads', href: '/leads', color: 'from-blue-500 to-blue-600', desc: 'Manage your leads' },
              { label: 'Campaigns', href: '/campaigns', color: 'from-emerald-500 to-emerald-600', desc: 'View campaigns' },
              { label: 'Tasks', href: '/tasks', color: 'from-violet-500 to-violet-600', desc: 'Pending tasks' },
              { label: 'Analytics', href: '/analytics', color: 'from-amber-500 to-amber-600', desc: 'View reports' },
            ].map(action => (
              <a
                key={action.label}
                href={action.href}
                className="group relative overflow-hidden rounded-lg bg-gradient-to-br ${action.color} p-4 text-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="relative z-10">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-white/70 mt-0.5">{action.desc}</div>
                </div>
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
