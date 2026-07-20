import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import {
  Clock, AlertTriangle, Calendar, TrendingUp, Users,
  Target, BarChart3, Shield, Activity, Phone, RefreshCw,
} from 'lucide-react';

type TabKey = 'response' | 'overdue' | 'visit' | 'source' | 'broker';

interface AgentResponse {
  agentId: string; name: string;
  avgFirstResponseMinutes: number; medianFirstResponseMinutes: number;
  leadsAssigned: number; leadsResponded: number;
  responseRate: number; untouchedLeadCount: number;
}

interface AgentOverdue {
  agentId: string; name: string;
  overdueTaskCount: number; leadsStaleCount: number;
  overdueSiteVisits: number; totalOverdue: number;
}

interface AgentVisitConv {
  agentId: string; name: string;
  siteVisitsScheduled: number; siteVisitsCompleted: number;
  noShowCount: number; bookingsAfterVisit: number;
  visitToBookRate: number; showRate: number;
}

interface SourceRoi {
  source: string; totalLeads: number; convertedLeads: number;
  conversionRate: number; totalSpend: number;
  costPerLead: number; revenue: number; roi: number;
}

interface BrokerRank {
  brokerId: string; brokerName: string;
  totalLeads: number; convertedLeads: number;
  conversionRate: number; totalDealValue: number;
  commissionRate: number; commissionOwed: number;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />)}
      </div>
      <div className="h-64 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />
    </div>
  );
}

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-8 text-center">
      <AlertTriangle size={36} className="mx-auto mb-3 text-red-400" />
      <p className="text-red-600 dark:text-red-400 font-medium">Failed to load</p>
      <p className="text-sm text-red-500 dark:text-red-400 mt-1">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; message: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
      <Icon size={40} className="mx-auto mb-3 text-[var(--muted-foreground)]" />
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
    </div>
  );
}

function AgentResponseTable() {
  const [data, setData] = useState<AgentResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setData(null); setError(null);
    try { setData(await api('/analytics/agent-response-times')); }
    catch (e: any) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorRetry message={error} onRetry={load} />;
  if (!data) return <LoadingSkeleton />;
  if (data.length === 0) return <EmptyState icon={Clock} title="No agent data" message="No sales agents found for this tenant." />;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <Clock size={14} className="text-[var(--primary)]" />
        Agent Response Times (sorted by response rate ascending)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-2 text-[var(--muted-foreground)] font-medium">Agent</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Avg Resp (min)</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Median (min)</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Assigned</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Responded</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Rate</th>
              <th className="text-right py-2 pl-2 text-[var(--muted-foreground)] font-medium">Untouched</th>
            </tr>
          </thead>
          <tbody>
            {data.map(a => (
              <tr key={a.agentId} className="border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/50 transition-colors">
                <td className="py-2.5 pr-2 text-[var(--foreground)] font-medium">{a.name}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{a.avgFirstResponseMinutes}</td>
                <td className="py-2.5 px-2 text-right text-[var(--muted-foreground)] tabular-nums">{a.medianFirstResponseMinutes}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)]">{a.leadsAssigned}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)]">{a.leadsResponded}</td>
                <td className="py-2.5 px-2 text-right">
                  <span className={`tabular-nums font-medium ${a.responseRate < 50 ? 'text-red-500' : a.responseRate < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {a.responseRate}%
                  </span>
                </td>
                <td className="py-2.5 pl-2 text-right">
                  <span className={`tabular-nums font-medium ${a.untouchedLeadCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {a.untouchedLeadCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverdueFollowupsTable() {
  const [data, setData] = useState<AgentOverdue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setData(null); setError(null);
    try { setData(await api('/analytics/agent-overdue-followups')); }
    catch (e: any) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorRetry message={error} onRetry={load} />;
  if (!data) return <LoadingSkeleton />;
  if (data.length === 0) return <EmptyState icon={AlertTriangle} title="No overdue data" message="No sales agents found." />;

  const maxTotal = Math.max(...data.map(a => a.totalOverdue), 1);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <AlertTriangle size={14} className="text-[var(--primary)]" />
        Overdue Follow-ups (sorted by total descending)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-2 text-[var(--muted-foreground)] font-medium">Agent</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Overdue Tasks</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Stale Hot Leads</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Overdue Site Visits</th>
              <th className="text-right py-2 pl-2 text-[var(--muted-foreground)] font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map(a => (
              <tr key={a.agentId} className="border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/50 transition-colors">
                <td className="py-2.5 pr-2 text-[var(--foreground)] font-medium">{a.name}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{a.overdueTaskCount}</td>
                <td className="py-2.5 px-2 text-right">
                  <span className={`tabular-nums font-medium ${a.leadsStaleCount > 0 ? 'text-red-500' : 'text-[var(--foreground)]'}`}>{a.leadsStaleCount}</span>
                </td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{a.overdueSiteVisits}</td>
                <td className="py-2.5 pl-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`tabular-nums font-bold ${a.totalOverdue > 5 ? 'text-red-500' : a.totalOverdue > 2 ? 'text-amber-500' : 'text-[var(--foreground)]'}`}>{a.totalOverdue}</span>
                    <div className="w-16 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-amber-400 rounded-full" style={{ width: `${(a.totalOverdue / maxTotal) * 100}%` }} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VisitConversionTable() {
  const [data, setData] = useState<AgentVisitConv[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setData(null); setError(null);
    try { setData(await api('/analytics/agent-visit-conversion')); }
    catch (e: any) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorRetry message={error} onRetry={load} />;
  if (!data) return <LoadingSkeleton />;
  if (data.length === 0) return <EmptyState icon={TrendingUp} title="No visit data" message="No sales agents with visits found." />;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <TrendingUp size={14} className="text-[var(--primary)]" />
        Visit-to-Booking Conversion (sorted by rate descending)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-2 text-[var(--muted-foreground)] font-medium">Agent</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Scheduled</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Completed</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">No-Show</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Show Rate</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Bookings</th>
              <th className="text-right py-2 pl-2 text-[var(--muted-foreground)] font-medium">Visit→Book</th>
            </tr>
          </thead>
          <tbody>
            {data.map(a => (
              <tr key={a.agentId} className="border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/50 transition-colors">
                <td className="py-2.5 pr-2 text-[var(--foreground)] font-medium">{a.name}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{a.siteVisitsScheduled}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{a.siteVisitsCompleted}</td>
                <td className="py-2.5 px-2 text-right">
                  <span className={`tabular-nums font-medium ${a.noShowCount > 0 ? 'text-amber-500' : 'text-[var(--foreground)]'}`}>{a.noShowCount}</span>
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums font-medium">{a.showRate}%</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{a.bookingsAfterVisit}</td>
                <td className="py-2.5 pl-2 text-right">
                  <span className={`tabular-nums font-medium ${a.visitToBookRate >= 50 ? 'text-emerald-500' : a.visitToBookRate >= 25 ? 'text-amber-500' : 'text-red-500'}`}>
                    {a.visitToBookRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SourceRoiTable() {
  const [data, setData] = useState<SourceRoi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setData(null); setError(null);
    try { setData(await api('/analytics/source-roi')); }
    catch (e: any) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorRetry message={error} onRetry={load} />;
  if (!data) return <LoadingSkeleton />;
  if (data.length === 0) return <EmptyState icon={BarChart3} title="No source data" message="No lead source data available." />;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <BarChart3 size={14} className="text-[var(--primary)]" />
        Source ROI Breakdown (sorted by conversion rate descending)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-2 text-[var(--muted-foreground)] font-medium">Source</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Total Leads</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Converted</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Conv Rate</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Spend</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">CPL</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Revenue</th>
              <th className="text-right py-2 pl-2 text-[var(--muted-foreground)] font-medium">ROI</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => (
              <tr key={s.source} className="border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/50 transition-colors">
                <td className="py-2.5 pr-2 text-[var(--foreground)] font-medium">{s.source}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{s.totalLeads}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{s.convertedLeads}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-medium">{s.conversionRate}%</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">${s.totalSpend.toLocaleString()}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">${s.costPerLead.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">${s.revenue.toLocaleString()}</td>
                <td className="py-2.5 pl-2 text-right">
                  <span className={`tabular-nums font-medium ${s.roi > 0 ? 'text-emerald-500' : s.roi < 0 ? 'text-red-500' : 'text-[var(--muted-foreground)]'}`}>
                    {s.roi}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BrokerRankingsTable() {
  const [data, setData] = useState<BrokerRank[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setData(null); setError(null);
    try { setData(await api('/analytics/broker-rankings')); }
    catch (e: any) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  if (error) return <ErrorRetry message={error} onRetry={load} />;
  if (!data) return <LoadingSkeleton />;
  if (data.length === 0) return <EmptyState icon={Users} title="No broker data" message="No active channel partners found." />;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
        <Users size={14} className="text-[var(--primary)]" />
        Broker Rankings (sorted by conversion rate descending)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-2 text-[var(--muted-foreground)] font-medium">Broker</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Leads</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Converted</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Conv Rate</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Deal Value</th>
              <th className="text-right py-2 px-2 text-[var(--muted-foreground)] font-medium">Comm Rate</th>
              <th className="text-right py-2 pl-2 text-[var(--muted-foreground)] font-medium">Commission Owed</th>
            </tr>
          </thead>
          <tbody>
            {data.map(b => (
              <tr key={b.brokerId} className="border-b border-[var(--border)]/50 hover:bg-[var(--accent)]/50 transition-colors">
                <td className="py-2.5 pr-2 text-[var(--foreground)] font-medium">{b.brokerName}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{b.totalLeads}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{b.convertedLeads}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-medium">{b.conversionRate}%</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">${b.totalDealValue.toLocaleString()}</td>
                <td className="py-2.5 px-2 text-right text-[var(--foreground)] tabular-nums">{b.commissionRate}%</td>
                <td className="py-2.5 pl-2 text-right text-[var(--foreground)] font-medium tabular-nums">${b.commissionOwed.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'response', label: 'Agent Response', icon: Clock },
  { key: 'overdue', label: 'Overdue Follow-ups', icon: AlertTriangle },
  { key: 'visit', label: 'Visit Conversion', icon: TrendingUp },
  { key: 'source', label: 'Source ROI', icon: BarChart3 },
  { key: 'broker', label: 'Broker Rankings', icon: Users },
];

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('response');

  const allowedRoles = ['OWNER', 'ADMIN', 'MANAGER'];
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Manager Dashboard</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Accountability metrics and team performance</p>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--muted)]" role="tablist">
          {tabs.map(t => (
            <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
              <span className="flex items-center gap-1.5">
                <t.icon size={13} />
                {t.label}
              </span>
            </TabButton>
          ))}
        </div>
      </div>

      {tab === 'response' && <AgentResponseTable />}
      {tab === 'overdue' && <OverdueFollowupsTable />}
      {tab === 'visit' && <VisitConversionTable />}
      {tab === 'source' && <SourceRoiTable />}
      {tab === 'broker' && <BrokerRankingsTable />}
    </div>
  );
}
