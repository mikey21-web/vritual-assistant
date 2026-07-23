import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import {
  Users, Target, TrendingUp, BarChart3, Activity,
  Zap, AlertTriangle, AlertCircle, CheckCircle,
  DollarSign, Clock, Phone, MessageSquare, Calendar,
  ChevronRight, Loader2, ArrowUpRight, ArrowDownRight,
  CheckSquare, UserCheck, Building2, MapPin, Bot,
} from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DailyBrief {
  date: string;
  summary: {
    newLeadsYesterday: number;
    newLeadsToday: number;
    hotLeads: number;
    totalLeads: number;
    slowAgents: Array<{ id: string; name: string; hotLeadCount: number; responseTimeHours: number }>;
  };
  sources: Array<{
    name: string; leads7d: number; leadsYesterday: number;
    leadsPrevious7d: number; changePercent: number; alert: 'drop' | 'surge' | 'normal';
  }>;
  revenueAtRisk: { totalPaise: number; overdueCollectionsPaise: number; bookingsAtRisk: number; currency: string };
  readyForBooking: Array<{
    leadId: string; leadName: string; phone: string;
    interest: string; daysSinceLastContact: number; missingCostSheet: boolean;
  }>;
  channelConflicts: Array<{
    leadId: string; leadName: string; partners: string[]; projects: string[];
  }>;
  pendingApprovals: {
    count: number;
    items: Array<{ id: string; type: string; title: string; description: string; createdAt: string }>;
  };
  todayVisits: Array<{
    id: string; leadId: string; leadName: string; phone: string;
    startAt: string; projectName?: string; interest?: string;
    lastMessage?: string; budget?: string;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const formatINR = (paise: number) => {
  const amount = paise / 100;
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const daysAgo = (n: number) => {
  if (n === 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
};

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function PageFallback() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Conic-gradient progress ring, no chart library needed. */
function StatDonut({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="relative h-20 w-20 rounded-full shrink-0"
      style={{ background: `conic-gradient(${color} ${clamped * 3.6}deg, var(--muted) 0deg)` }}
    >
      <div className="absolute inset-1.5 rounded-full bg-[var(--card)] flex items-center justify-center">
        <span className="text-sm font-bold text-[var(--foreground)]">{clamped}%</span>
      </div>
    </div>
  );
}

function HeroStatCard({ label, value, sublabel }: { label: string; value: number | string; sublabel: string }) {
  return (
    <div className="rounded-xl p-6 flex items-center justify-between bg-[var(--primary)] text-white">
      <div>
        <p className="text-sm text-white/80">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        <p className="text-xs text-white/70 mt-2">{sublabel}</p>
      </div>
      <Building2 size={40} className="text-white/25 shrink-0" />
    </div>
  );
}

function HotLeadRatioCard({ hot, total }: { hot: number; total: number }) {
  const percent = total > 0 ? Math.round((hot / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-center gap-4">
      <StatDonut percent={percent} color="var(--chart-orange)" />
      <div>
        <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 inline-block px-2 py-0.5 rounded-full mb-1">
          {hot} hot
        </p>
        <p className="text-2xl font-bold text-[var(--foreground)]">{total}</p>
        <p className="text-xs text-[var(--muted-foreground)]">total active leads</p>
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: 'emerald' | 'red' | 'amber' | 'blue';
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${colors[color]}`}>
      <Icon size={14} />
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  );
}

function RevenueCard({ data }: { data: DailyBrief['revenueAtRisk'] | null }) {
  if (!data) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign size={16} className="text-red-500" />
        <h3 className="font-semibold text-sm text-[var(--foreground)]">Revenue at Risk</h3>
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[var(--foreground)]">{formatINR(data.totalPaise)}</span>
          <span className="text-xs text-[var(--muted-foreground)]">at risk</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <AlertCircle size={12} className="text-amber-500" />
          <span className="text-[var(--muted-foreground)]">
            <strong className="text-amber-600 dark:text-amber-400">{formatINR(data.overdueCollectionsPaise)}</strong> overdue collections
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={12} className="text-amber-500" />
          <span className="text-[var(--muted-foreground)]">
            <strong className="text-amber-600 dark:text-amber-400">{data.bookingsAtRisk}</strong> booking{data.bookingsAtRisk !== 1 ? 's' : ''} may slip
          </span>
        </div>
      </div>
      <a href="#/collections" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline">
        View Details <ChevronRight size={12} />
      </a>
    </div>
  );
}

function ApprovalsCard({ data }: { data: DailyBrief['pendingApprovals'] | null }) {
  if (!data) return null;
  const isEmpty = !data.items || data.items.length === 0;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-2 mb-1">
        <CheckSquare size={16} className="text-[var(--primary)]" />
        <h3 className="font-semibold text-sm text-[var(--foreground)]">Pending Approvals</h3>
        {!isEmpty && (
          <span className="ml-auto text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full">
            {data.count}
          </span>
        )}
      </div>
      {isEmpty ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle size={16} />
          <span>All caught up — no actions waiting</span>
        </div>
      ) : (
        <>
          <div className="mt-3 space-y-1">
            {data.items.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-start gap-2 py-1.5 border-b border-[var(--border)] last:border-0">
                <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-[var(--foreground)] truncate">{item.title}</div>
                  <div className="text-xs text-[var(--muted-foreground)] truncate">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <a href="#/approvals"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
              Approve All
            </a>
            <a href="#/approvals"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity">
              Review <ChevronRight size={12} className="ml-0.5" />
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function LeadPulseCard({ summary, sources }: {
  summary: DailyBrief['summary'] | null;
  sources: DailyBrief['sources'] | null;
}) {
  if (!summary) return null;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-2 mb-1">
        <Activity size={16} className="text-[var(--primary)]" />
        <h3 className="font-semibold text-sm text-[var(--foreground)]">Lead Pulse</h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-2 gap-x-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-500" />
          <span className="text-lg font-bold text-[var(--foreground)]">{summary.newLeadsYesterday}</span>
          <span className="text-xs text-[var(--muted-foreground)]">yesterday</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} className="text-blue-500" />
          <span className="text-lg font-bold text-[var(--foreground)]">{summary.newLeadsToday}</span>
          <span className="text-xs text-[var(--muted-foreground)]">today</span>
        </div>
        <div className="flex items-center gap-2">
          <Target size={14} className="text-orange-500" />
          <span className="text-lg font-bold text-[var(--foreground)]">{summary.hotLeads}</span>
          <span className="text-xs text-[var(--muted-foreground)]">hot</span>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-violet-500" />
          <span className="text-lg font-bold text-[var(--foreground)]">{summary.totalLeads}</span>
          <span className="text-xs text-[var(--muted-foreground)]">total active</span>
        </div>
      </div>

      {sources && sources.length > 0 && (
        <>
          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Source Health</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {sources.slice(0, 4).map(s => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="text-[var(--foreground)]">{s.name}</span>
                <div className="flex items-center gap-1.5">
                  {s.alert === 'drop' && <ArrowDownRight size={12} className="text-red-500" />}
                  {s.alert === 'surge' && <ArrowUpRight size={12} className="text-amber-500" />}
                  {s.alert === 'normal' && <span className="text-emerald-500 text-xs">●</span>}
                  <span className={`text-xs font-medium ${
                    s.alert === 'drop' ? 'text-red-500' : s.alert === 'surge' ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {s.changePercent > 0 ? '+' : ''}{s.changePercent}%
                  </span>
                  {s.alert === 'drop' && <AlertTriangle size={11} className="text-red-400" />}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AgentWatchCard({ agents }: { agents: DailyBrief['summary']['slowAgents'] | null }) {
  if (!agents || agents.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Users size={16} className="text-emerald-500" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Agent Watch</h3>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle size={16} />
          <span>All agents responding on time</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-2 mb-1">
        <Users size={16} className="text-amber-500" />
        <h3 className="font-semibold text-sm text-[var(--foreground)]">Agent Watch</h3>
        <span className="ml-auto text-xs font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
          {agents.length} slow
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {agents.map(a => (
          <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={12} className="text-amber-500 shrink-0" />
              <a href="#/manager-dashboard" className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
                {a.name}
              </a>
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{a.hotLeadCount}</span> hot · {a.responseTimeHours}h response
            </div>
          </div>
        ))}
      </div>
      <a href="#/queue" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline">
        View Agent Queue <ChevronRight size={12} />
      </a>
    </div>
  );
}

function ReadyForBookingCard({ items }: { items: DailyBrief['readyForBooking'] | null }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle size={16} className="text-emerald-500" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Ready for Booking</h3>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle size={16} />
          <span>No leads ready for booking right now</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-2 mb-1">
        <Target size={16} className="text-emerald-500" />
        <h3 className="font-semibold text-sm text-[var(--foreground)]">Ready for Booking</h3>
        <span className="ml-auto text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {items.slice(0, 4).map(lead => (
          <div key={lead.leadId} className="pb-3 border-b border-[var(--border)] last:border-0 last:pb-0">
            <div className="flex items-start justify-between">
              <div>
                <a href={`#/leads/${lead.leadId}`}
                  className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
                  {lead.leadName}
                </a>
                <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mt-0.5">
                  <Phone size={10} />
                  <span>{lead.phone}</span>
                </div>
              </div>
              {lead.missingCostSheet && (
                <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded shrink-0">
                  No cost sheet
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
              <span>{lead.interest}</span>
              <span>·</span>
              <span>Last contact: {daysAgo(lead.daysSinceLastContact)}</span>
            </div>
          </div>
        ))}
      </div>
      <a href="#/cost-sheets" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline">
        Send Cost Sheet <ChevronRight size={12} />
      </a>
    </div>
  );
}

function ChannelConflictsCard({ conflicts }: { conflicts: DailyBrief['channelConflicts'] | null }) {
  if (!conflicts || conflicts.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-emerald-500" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Channel Conflicts</h3>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle size={16} />
          <span>No channel partner conflicts detected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={16} className="text-amber-500" />
        <h3 className="font-semibold text-sm text-[var(--foreground)]">Channel Conflicts</h3>
        <span className="ml-auto text-xs font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
          {conflicts.length}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {conflicts.slice(0, 4).map(c => (
          <div key={c.leadId} className="pb-3 border-b border-[var(--border)] last:border-0 last:pb-0">
            <a href={`#/leads/${c.leadId}`}
              className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
              {c.leadName}
            </a>
            <div className="mt-1 space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <UserCheck size={11} className="shrink-0" />
                <span>{c.partners.join(' ↔ ')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Building2 size={11} className="shrink-0" />
                <span>{c.projects.join(', ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <a href="#/channel-partners" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline">
        Resolve <ChevronRight size={12} />
      </a>
    </div>
  );
}

function TodayVisitsCard({ visits }: { visits: DailyBrief['todayVisits'] | null }) {
  if (!visits || visits.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={16} className="text-[var(--muted-foreground)]" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Today's Site Visits</h3>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Calendar size={16} />
          <span>No visits scheduled today. A quiet day?</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-2 mb-1">
        <Calendar size={16} className="text-[var(--primary)]" />
        <h3 className="font-semibold text-sm text-[var(--foreground)]">Today's Site Visits</h3>
        <span className="ml-auto text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
          {visits.length}
        </span>
      </div>
      <div className="mt-3 space-y-4">
        {visits.map(v => (
          <div key={v.id} className="pb-4 border-b border-[var(--border)] last:border-0 last:pb-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--primary)] shrink-0" />
                <a href={`#/leads/${v.leadId}`}
                  className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors">
                  {v.leadName}
                </a>
                <span className="text-xs text-[var(--muted-foreground)]">{v.phone}</span>
              </div>
              <span className="text-xs font-medium bg-[var(--muted)] px-2 py-0.5 rounded text-[var(--foreground)]">
                {formatTime(v.startAt)}
              </span>
            </div>
            {v.interest && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{v.interest}</p>
            )}
            {v.lastMessage && (
              <div className="mt-1.5 flex items-start gap-1.5 text-xs text-[var(--muted-foreground)] bg-[var(--background)] rounded-lg p-2">
                <MessageSquare size={11} className="shrink-0 mt-0.5" />
                <span>&ldquo;{v.lastMessage}&rdquo;</span>
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
              {v.projectName && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} /> {v.projectName}
                </span>
              )}
              {v.budget && (
                <span className="flex items-center gap-1">
                  <DollarSign size={10} /> {v.budget}
                </span>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <a href={`#/leads/${v.leadId}`}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                View Brief <ChevronRight size={10} />
              </a>
              <a href={`#/site-visits`}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors">
                Mark Complete <CheckCircle size={10} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function OverviewPage() {
  const { user } = useAuth();
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api('/mikey/daily-brief')
      .then(data => { if (!cancelled) setBrief(data); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0];
  const s = brief?.summary;
  const rar = brief?.revenueAtRisk;
  const pa = brief?.pendingApprovals;

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return <PageFallback />;

  // ── Error (show partial, never blank) ─────────────────────────
  const headerContent = (
    <>
      {/* Greeting */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 tracking-wide">
            <Bot size={12} />
            Mikey
          </span>
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-[0.15em]">
            {todayLabel()}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {greeting()}, <span className="font-[family-name:var(--font-script)] text-3xl font-normal text-emerald-600">{firstName}</span>
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Mikey&rsquo;s been watching the business since 6 AM
        </p>
      </div>

      {/* KPI chips */}
      {(s || error) && (
        <div className="flex flex-wrap gap-2">
          {s && <StatChip icon={TrendingUp} label="yesterday" value={s.newLeadsYesterday} color="blue" />}
          {s && <StatChip icon={Target} label="hot now" value={s.hotLeads} color="amber" />}
          {s && <StatChip icon={Users} label="agents slow" value={s.slowAgents.length} color="red" />}
          {rar && <StatChip icon={DollarSign} label="at risk" value={formatINR(rar.totalPaise)} color="red" />}
          {pa && <StatChip icon={CheckSquare} label="pending approvals" value={pa.count} color="amber" />}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
          <AlertCircle size={12} />
          <span>Couldn&apos;t load full briefing: {error}</span>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="space-y-4">
        {headerContent}
      </div>

      {/* ── Row 1: Hero stat + Hot lead ratio ──────────────────── */}
      {brief && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HeroStatCard
            label="Total Active Leads"
            value={brief.summary.totalLeads}
            sublabel={`${brief.summary.newLeadsToday} new today, ${brief.summary.newLeadsYesterday} yesterday`}
          />
          <HotLeadRatioCard hot={brief.summary.hotLeads} total={brief.summary.totalLeads} />
        </div>
      )}

      {/* ── Row 2: Revenue + Approvals ────────────────────────── */}
      {brief && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueCard data={brief.revenueAtRisk} />
          <ApprovalsCard data={brief.pendingApprovals} />
        </div>
      )}

      {/* ── Row 2: Lead Pulse + Agent Watch ────────────────────── */}
      {brief && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeadPulseCard summary={brief.summary} sources={brief.sources} />
          <AgentWatchCard agents={brief.summary.slowAgents} />
        </div>
      )}

      {/* ── Row 3: Ready for Booking + Channel Conflicts ───────── */}
      {brief && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReadyForBookingCard items={brief.readyForBooking} />
          <ChannelConflictsCard conflicts={brief.channelConflicts} />
        </div>
      )}

      {/* ── Row 4: Today's Visits ──────────────────────────────── */}
      {brief && (
        <TodayVisitsCard visits={brief.todayVisits} />
      )}
    </div>
  );
}
