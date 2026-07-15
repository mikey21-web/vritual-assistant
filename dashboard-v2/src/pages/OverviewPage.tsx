import React, { useState, useEffect } from 'react';
import { fetchAnalytics, fetchHealth, fetchFailures } from '../lib/data';
import { api } from '../lib/api';
import { setPendingFilter } from '../lib/pendingSearch';
import { isInsightDismissed, dismissInsight } from '../lib/dismissedInsights';
import { startExplainFlow } from '../lib/explainMode';
import { useApp } from '../context/AppContext';
import { useAuth } from '../lib/useAuth';
import { Users, Target, TrendingUp, BarChart3, Activity, ArrowUpRight, Zap, AlertTriangle, AlertCircle, CheckCircle, X, Play, DollarSign } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function InsightIcon({ type }: { type: string }) {
  if (type === 'error') return <AlertCircle size={14} className="text-[var(--destructive)] shrink-0" />;
  if (type === 'warning') return <AlertTriangle size={14} className="text-amber-500 shrink-0" />;
  return <CheckCircle size={14} className="text-emerald-500 shrink-0" />;
}

export default function OverviewPage() {
  const { niche, isSuperAdmin } = useApp();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [failures, setFailures] = useState(0);
  const [dataHealth, setDataHealth] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [dismissTick, setDismissTick] = useState(0);

  useEffect(() => {
    fetchAnalytics().then(setStats).catch(() => {});
    fetchHealth().then(setHealth).catch(() => {});
    api('/analytics/data-health').then(setDataHealth).catch(() => {});
    api('/analytics/forecast').then(setForecast).catch(() => {});
    if (isSuperAdmin) fetchFailures('open').then((d: any[]) => setFailures(d.length)).catch(() => {});
  }, []);

  const showInsight = (insight: any) => {
    setPendingFilter(insight.page, { filters: insight.filters });
    window.location.hash = '/' + insight.page;
  };

  const ignoreInsight = (id: string) => {
    dismissInsight(id);
    setDismissTick(t => t + 1);
  };

  const walkThroughInsights = (insights: any[]) => {
    startExplainFlow(insights.map(insight => ({
      page: insight.page,
      filters: insight.filters,
      narration: insight.message,
    })));
  };

  if (!stats) return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
        ))}
      </div>
    </div>
  );

  const leadLabel = niche?.labels?.lead || 'Lead';
  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0];

  const cards = [
    { label: `Total ${leadLabel}s`, value: stats.total, icon: Users, change: '+12%', accent: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Hot Leads', value: stats.hot, icon: Target, change: '+5%', accent: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10' },
    { label: 'Converted', value: stats.converted, icon: TrendingUp, change: '+8%', accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: BarChart3, change: '+2.3%', accent: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10' },
    ...(forecast ? [{
      label: 'Weighted Forecast', value: currencyFormatter.format(forecast.totalWeightedForecast), icon: DollarSign, change: null as any, accent: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10',
    }] : []),
  ];

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
          <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.15em]">{niche?.display_name || 'Dashboard'}</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {firstName ? `${greeting()}, ${firstName}` : `${niche?.display_name || 'Dashboard'} Overview`}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {niche ? `${niche.industry} · ${niche.conversion_goals?.join(', ') || 'No goals configured'}` : "Here's what's happening today."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={c.label}
            className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] transition-all duration-200 cursor-default animate-fade-up delay-${Math.min(i + 1, 8)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center justify-center h-7 w-7 rounded-lg ${c.accent}`}>
                <c.icon size={14} />
              </div>
              {c.change && (
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={10} />
                  {c.change}
                </span>
              )}
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)] tracking-tight">{c.value}</div>
            <div className="text-xs font-medium text-[var(--muted-foreground)] mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {dataHealth && dataHealth.insights?.length > 0 && (() => {
        void dismissTick;
        const visible = dataHealth.insights.filter((insight: any) => !isInsightDismissed(`${insight.type}:${insight.message}`));
        if (visible.length === 0) return null;
        return (
          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)] animate-fade-up delay-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                Today's Attention Items
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {dataHealth.dataQuality.complete}% complete · {dataHealth.dataQuality.duplicates} duplicates
                </span>
                <button onClick={() => walkThroughInsights(visible)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
                  <Play size={11} /> Walk me through
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {visible.map((insight: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <InsightIcon type={insight.type} />
                    <span className="text-sm text-[var(--foreground)] truncate">{insight.message}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <button onClick={() => showInsight(insight)} className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">{insight.action}</button>
                    <button onClick={() => ignoreInsight(`${insight.type}:${insight.message}`)} title="Ignore" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)] animate-fade-up delay-5">
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
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-medium ${item.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--destructive)]'}`}>
                    {item.status}
                  </span>
                  <div className={`h-1.5 w-1.5 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-[var(--destructive)]'} ${item.ok ? '' : 'animate-pulse'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)] animate-fade-up delay-6">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Zap size={15} className="text-[var(--primary)]" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'View Leads', href: '#/leads', desc: 'Manage your leads', icon: Users },
              { label: 'Campaigns', href: '#/campaigns', desc: 'View campaigns', icon: BarChart3 },
              { label: 'Tasks', href: '#/tasks', desc: 'Pending tasks', icon: Target },
              { label: 'Analytics', href: '#/analytics', desc: 'View reports', icon: Activity },
            ].map((action, i) => (
              <a
                key={action.label}
                href={action.href}
                className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 transition-colors duration-150 hover:border-[var(--ring)]"
              >
                <action.icon size={15} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors shrink-0" />
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{action.label}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{action.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
