import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import {
  BarChart3, TrendingUp, Users, DollarSign, RefreshCw, Calendar, Activity,
  Phone, PhoneIncoming, PhoneOutgoing, BarChart, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

/* ───────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────── */

interface CallAnalyticsData {
  totalCalls: number;
  totalDurationSec: number;
  avgDurationSec: number;
  missedCalls: number;
  answeredCalls: number;
  answeredRate: number;
  bySource: Record<string, number>;
  byDirection: Record<string, number>;
  overTime: Array<{ date: string; count: number; missed: number; avgDuration: number }>;
  byAgent: Array<{ userId: string; name: string; count: number; avgDuration: number; totalDuration: number }>;
  byContact: Array<{ contactId: string; name: string; company: string | null; count: number; totalDuration: number }>;
}

/* ───────────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────────── */

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/* ───────────────────────────────────────────────
   Tab button shared style
   ─────────────────────────────────────────────── */

function TabButton({
  active, onClick, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
          : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]'
      }`}
    >
      {children}
    </button>
  );
}

/* ───────────────────────────────────────────────
   Lead Analytics (existing content)
   ─────────────────────────────────────────────── */

function LeadAnalytics({ range }: { range: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData(null);
    api(`/analytics/overview?range=${range}`).then(setData).catch(() => {});
  }, [range]);

  if (!data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Total Leads', value: data.summary?.totalLeads || 0, icon: Users, color: 'from-[var(--primary)] to-[var(--primary)]/70' },
    { label: 'Conversion Rate', value: (data.summary?.conversionRate || 0) + '%', icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Revenue', value: '$' + (data.summary?.revenue || 0).toLocaleString(), icon: DollarSign, color: 'from-amber-500 to-amber-600' },
    { label: 'Active Campaigns', value: data.summary?.activeCampaigns || 0, icon: BarChart3, color: 'from-amber-500 to-amber-600' },
  ];

  const leadByWeek = data.leadsByWeek || [];
  const maxLeads = Math.max(...leadByWeek.map((w: any) => w.count || 0), 1);
  const sourceData = data.leadsBySource || [];
  const sourceMax = Math.max(...sourceData.map((s: any) => s.count || 0), 1);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </>
  );
}

/* ───────────────────────────────────────────────
   Call Analytics (new section)
   ─────────────────────────────────────────────── */

function CallAnalytics({ range }: { range: string }) {
  const [data, setData] = useState<CallAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setData(null);
    setError(null);
    try {
      const result: CallAnalyticsData = await api(`/call-tracking/analytics?range=${range}`);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load call analytics');
    }
  };

  useEffect(() => { refresh(); }, [range]);

  /* ── Loading ── */
  if (!data && !error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-8 text-center">
          <XCircle size={36} className="mx-auto mb-3 text-red-400" />
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load call analytics</p>
          <p className="text-sm text-red-500 dark:text-red-400 mt-1">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  /* ── Empty ── */
  if (!data || data.totalCalls === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <Phone size={40} className="mx-auto mb-3 text-[var(--muted-foreground)]" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">No calls yet</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Call data will appear here once calls are synced from a paired device.
          </p>
        </div>
      </div>
    );
  }

  const answeredRate = data.answeredRate ?? (data.totalCalls > 0 ? data.answeredCalls / data.totalCalls : 0);

  /* ── Summary metrics ── */
  const summaryMetrics = [
    { label: 'Total Calls', value: data.totalCalls.toLocaleString(), icon: Phone, color: 'from-[var(--primary)] to-[var(--primary)]/70' },
    { label: 'Total Hours', value: formatDuration(data.totalDurationSec), icon: Clock, color: 'from-blue-500 to-blue-600' },
    { label: 'Avg Duration', value: formatDuration(data.avgDurationSec), icon: BarChart, color: 'from-amber-500 to-amber-600' },
    { label: 'Answered Rate', value: formatPercent(answeredRate), icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
  ];

  /* ── Memoized transformations ── */
  const sourceEntries = useMemo(
    () => Object.entries(data.bySource || {}).map(([name, value]) => ({ name, value })),
    [data.bySource],
  );

  const directionEntries = useMemo(
    () => Object.entries(data.byDirection || {}).map(([name, value]) => ({ name, value })),
    [data.byDirection],
  );

  const sourceMax = useMemo(
    () => Math.max(...sourceEntries.map(e => e.value), 1),
    [sourceEntries],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryMetrics.map(m => (
          <div key={m.label} className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center mb-3`}>
              <m.icon size={18} className="text-white" />
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{m.value}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* ── Call Volume & Source Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Chart – stacked bar answered / missed */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <BarChart size={14} className="text-[var(--primary)]" />
            Call Volume
          </h3>
          {data.overTime.length === 0 ? (
            <div className="text-center text-[var(--muted-foreground)] text-sm py-10">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ReBarChart data={data.overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                />
                <Bar dataKey="count" name="Answered" fill="#0f766e" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="missed" name="Missed" fill="#ef4444" radius={[2, 2, 0, 0]} stackId="a" />
              </ReBarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Source Distribution – horizontal bars */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Activity size={14} className="text-[var(--primary)]" />
            Source Distribution
          </h3>
          {sourceEntries.length === 0 ? (
            <div className="text-center text-[var(--muted-foreground)] text-sm py-10">No source data</div>
          ) : (
            <div className="space-y-4">
              {sourceEntries.map(s => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[var(--foreground)]">{s.name}</span>
                    <span className="text-[var(--muted-foreground)]">{s.value}</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/60 rounded-full transition-all"
                      style={{ width: `${(s.value / sourceMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Direction Breakdown & By Agent ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Direction Breakdown – bar chart */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <PhoneIncoming size={14} className="text-[var(--primary)]" />
            Direction Breakdown
          </h3>
          {directionEntries.length === 0 ? (
            <div className="text-center text-[var(--muted-foreground)] text-sm py-10">No direction data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ReBarChart data={directionEntries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                />
                <Bar dataKey="value" name="Calls" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By Agent – table */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Users size={14} className="text-[var(--primary)]" />
            By Agent
          </h3>
          {data.byAgent.length === 0 ? (
            <div className="text-center text-[var(--muted-foreground)] text-sm py-10">No agent data</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 pr-2 text-[var(--muted-foreground)] font-medium">Agent</th>
                    <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Calls</th>
                    <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Avg Dur</th>
                    <th className="text-right py-2 pl-2 text-[var(--muted-foreground)] font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byAgent.map(a => (
                    <tr
                      key={a.userId}
                      className="border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/50 transition-colors"
                    >
                      <td className="py-2.5 pr-2 text-[var(--foreground)]">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/60 text-white text-[10px] flex items-center justify-center font-medium shrink-0">
                            {a.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          {a.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-[var(--foreground)]">{a.count}</td>
                      <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{formatDuration(a.avgDuration)}</td>
                      <td className="py-2.5 pl-2 text-right text-[var(--foreground)] font-medium tabular-nums">{formatDuration(a.totalDuration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── By Contact ── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <PhoneOutgoing size={14} className="text-[var(--primary)]" />
          Most Called Contacts
        </h3>
        {data.byContact.length === 0 ? (
          <div className="text-center text-[var(--muted-foreground)] text-sm py-10">No contact data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 pr-2 text-[var(--muted-foreground)] font-medium">Contact</th>
                  <th className="text-left py-2 px-2 text-[var(--muted-foreground)] font-medium">Company</th>
                  <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Calls</th>
                  <th className="text-right py-2 pl-2 text-[var(--muted-foreground)] font-medium">Total Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.byContact.map(c => (
                  <tr
                    key={c.contactId}
                    className="border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/50 transition-colors"
                  >
                    <td className="py-2.5 pr-2 text-[var(--foreground)] font-medium">{c.name}</td>
                    <td className="py-2.5 px-2 text-[var(--muted-foreground)]">{c.company || '—'}</td>
                    <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{c.count}</td>
                    <td className="py-2.5 pl-2 text-right text-[var(--foreground)] font-medium tabular-nums">{formatDuration(c.totalDuration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   Page component
   ─────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'leads' | 'calls'>('leads');
  const [range, setRange] = useState('30d');

  const refresh = () => {
    // Force re-render by toggling a key – both sub-components refetch via their own effects
    setRange(r => r);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Analytics</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Performance overview</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--muted)]" role="tablist">
            <TabButton active={tab === 'leads'} onClick={() => setTab('leads')}>
              Leads
            </TabButton>
            <TabButton active={tab === 'calls'} onClick={() => setTab('calls')}>
              <span className="flex items-center gap-1.5">
                <Phone size={13} />
                Calls
              </span>
            </TabButton>
          </div>

          {/* Range select & refresh */}
          <select
            value={range}
            onChange={e => setRange(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={refresh}
            className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Tab content ── */}
      {tab === 'leads' ? (
        <LeadAnalytics key={`leads-${range}`} range={range} />
      ) : (
        <CallAnalytics key={`calls-${range}`} range={range} />
      )}
    </div>
  );
}
