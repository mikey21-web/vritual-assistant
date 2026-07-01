import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { BarChart3, TrendingUp, Users, DollarSign, RefreshCw, Calendar, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('30d');

  const refresh = () => { setData(null); api(`/analytics/overview?range=${range}`).then(setData).catch(() => {}); };
  useEffect(() => { refresh(); }, [range]);

  if (!data) return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />)}
      </div>
    </div>
  );

  const metrics = [
    { label: 'Total Leads', value: data.summary?.totalLeads || 0, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Conversion Rate', value: (data.summary?.conversionRate || 0) + '%', icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Revenue', value: '$' + (data.summary?.revenue || 0).toLocaleString(), icon: DollarSign, color: 'from-violet-500 to-violet-600' },
    { label: 'Active Campaigns', value: data.summary?.activeCampaigns || 0, icon: BarChart3, color: 'from-amber-500 to-amber-600' },
  ];

  const leadByWeek = data.leadsByWeek || [];
  const maxLeads = Math.max(...leadByWeek.map((w: any) => w.count || 0), 1);
  const sourceData = data.leadsBySource || [];
  const sourceMax = Math.max(...sourceData.map((s: any) => s.count || 0), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Analytics</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Performance overview</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={range}
            onChange={e => setRange(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={refresh} className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center mb-3`}>
              <m.icon size={18} className="text-white" />
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{m.value}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Calendar size={14} className="text-[var(--primary)]" />
            Leads by Week
          </h3>
          <div className="flex items-end gap-1.5 h-44">
            {leadByWeek.length === 0 ? (
              <div className="w-full text-center text-[var(--muted-foreground)] text-sm py-10">No data</div>
            ) : (
              leadByWeek.map((w: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-[var(--primary)] to-[var(--primary)]/60 hover:opacity-80 transition-opacity min-h-[4px]"
                    style={{ height: `${(w.count / maxLeads) * 100}%` }}
                    title={`${w.count} leads`}
                  />
                  <span className="text-[10px] text-[var(--muted-foreground)] mt-1.5 truncate w-full text-center">
                    {w.week?.slice(5) || ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Activity size={14} className="text-[var(--primary)]" />
            Leads by Source
          </h3>
          <div className="space-y-4">
            {sourceData.length === 0 ? (
              <div className="text-center text-[var(--muted-foreground)] text-sm py-10">No source data</div>
            ) : (
              sourceData.map((s: any) => (
                <div key={s.source}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[var(--foreground)]">{s.source}</span>
                    <span className="text-[var(--muted-foreground)]">{s.count}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/60 rounded-full transition-all"
                      style={{ width: `${(s.count / sourceMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
