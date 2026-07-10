import React, { useState, useEffect } from 'react';
import { fetchAnalytics, fetchHealth, fetchFailures } from '../lib/data';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { Users, Target, TrendingUp, BarChart3, Activity, ArrowUpRight, Zap, AlertTriangle, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function OverviewPage() {
  const { niche, isSuperAdmin } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [failures, setFailures] = useState(0);
  const [dataHealth, setDataHealth] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics().then(setStats).catch(() => {});
    fetchHealth().then(setHealth).catch(() => {});
    api('/analytics/data-health').then(setDataHealth).catch(() => {});
    if (isSuperAdmin) fetchFailures('open').then((d: any[]) => setFailures(d.length)).catch(() => {});
  }, []);

  if (!stats) return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-lg bg-[var(--card)] border border-[var(--border)] animate-pulse shadow-[var(--shadow-sm)]" />
        ))}
      </div>
    </div>
  );

  const leadLabel = niche?.labels?.lead || 'Lead';

  const cards = [
    { label: `Total ${leadLabel}s`, value: stats.total, icon: Users, change: '+12%', color: 'text-[var(--primary)]', bg: 'bg-[var(--primary-light)]' },
    { label: 'Hot Leads', value: stats.hot, icon: Target, change: '+5%', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Converted', value: stats.converted, icon: TrendingUp, change: '+8%', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: BarChart3, change: '+2.3%', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-up">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Zap size={13} className="text-[var(--primary)]" />
          <span className="text-[11px] font-medium text-[var(--primary)] uppercase tracking-wider">Dashboard</span>
        </div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{niche?.display_name || 'Dashboard'} Overview</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {niche ? `${niche.industry} · ${niche.conversion_goals?.join(', ') || 'No goals configured'}` : 'Loading configuration...'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={c.label}
            className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
            style={{ animation: 'fadeUp 0.4s ease-out forwards', animationDelay: `${i * 0.08}s`, opacity: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <div className={`h-9 w-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon size={18} className={c.color} />
              </div>
              {c.change && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                  <ArrowUpRight size={10} />
                  {c.change}
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-[var(--foreground)]">{c.value}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {dataHealth && dataHealth.insights?.length > 0 && (
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]"
          style={{ animation: 'fadeUp 0.4s ease-out forwards', animationDelay: '0.32s', opacity: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              Data Health
            </h3>
            <span className="text-xs text-[var(--muted-foreground)]">
              {dataHealth.dataQuality.complete}% complete · {dataHealth.dataQuality.duplicates} duplicates
            </span>
          </div>
          <div className="space-y-2">
            {dataHealth.insights.map((insight: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2.5">
                  {insight.type === 'error' ? <AlertCircle size={14} className="text-red-500 shrink-0" /> :
                   insight.type === 'warning' ? <AlertTriangle size={14} className="text-amber-500 shrink-0" /> :
                   <CheckCircle size={14} className="text-emerald-500 shrink-0" />}
                  <span className="text-sm text-[var(--foreground)]">{insight.message}</span>
                </div>
                <a href="#/leads" className="text-xs text-[var(--primary)] hover:underline shrink-0 ml-3">{insight.action}</a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]"
          style={{ animation: 'fadeUp 0.4s ease-out forwards', animationDelay: '0.4s', opacity: 0 }}>
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Activity size={15} className="text-[var(--primary)]" />
            System Status
          </h3>
          <div className="space-y-1">
            {[
              { label: 'Backend', status: health?.status === 'ok' ? 'Operational' : 'Degraded', ok: health?.status === 'ok' },
              { label: 'Database', status: health?.checks?.database === 'connected' ? 'Connected' : 'Disconnected', ok: health?.checks?.database === 'connected' },
              ...(isSuperAdmin ? [{ label: 'Open Failures', status: `${failures} pending`, ok: failures === 0 }] : []),
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                <span className="text-sm text-[var(--foreground)]">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${item.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {item.status}
                  </span>
                  <div className={`h-2 w-2 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-red-500'} ${item.ok ? '' : 'animate-pulse'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]"
          style={{ animation: 'fadeUp 0.4s ease-out forwards', animationDelay: '0.48s', opacity: 0 }}>
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Target size={15} className="text-[var(--primary)]" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
            { label: 'View Leads', href: '#/leads', desc: 'Manage your leads', color: 'var(--primary)' },
            { label: 'Campaigns', href: '#/campaigns', desc: 'View campaigns', color: '#059669' },
            { label: 'Tasks', href: '#/tasks', desc: 'Pending tasks', color: '#d97706' },
            { label: 'Analytics', href: '#/analytics', desc: 'View reports', color: '#0f766e' },
            ].map((action, i) => (
              <a
                key={action.label}
                href={action.href}
                className="group relative overflow-hidden rounded-lg p-4 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: action.color, animation: 'fadeUp 0.4s ease-out forwards', animationDelay: `${0.5 + i * 0.06}s`, opacity: 0 }}>
                <div className="relative z-10">
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-white/70 mt-0.5">{action.desc}</div>
                </div>
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
