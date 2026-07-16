import { useState, useEffect } from "react";
import { Users, AlertTriangle, UserX, Calendar, Trophy } from "lucide-react";
import { api } from "../lib/api";

/** The owner's "run the team" home screen: agent performance + leads at risk. */
export default function OwnerCommandView() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api('/analytics/team-command').then(setData).catch(() => {});
  }, []);

  if (!data) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[1, 2].map(i => <div key={i} className="h-64 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />)}
    </div>
  );

  const topAgent = data.agentPerformance[0];

  return (
    <div className="space-y-6">
      {/* At-a-glance strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Overall Conversion</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{data.overallConversionRate}%</div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Visits Today</div>
          <div className="text-2xl font-bold text-[var(--foreground)] inline-flex items-center gap-1.5"><Calendar size={18} className="text-[var(--primary)]" />{data.todayVisitsCount}</div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Leads At Risk</div>
          <div className="text-2xl font-bold text-red-500 inline-flex items-center gap-1.5"><AlertTriangle size={18} />{data.staleHotLeads.length + data.unassignedHotLeads.length}</div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Overdue Tasks</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{data.overdueTasksCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agent performance */}
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Users size={15} className="text-[var(--primary)]" /> Team Performance
          </h3>
          <div className="space-y-2">
            {data.agentPerformance.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No agents yet</p>}
            {data.agentPerformance.map((a: any, i: number) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  {i === 0 && a.converted > 0 && <Trophy size={13} className="text-amber-500 shrink-0" />}
                  <span className="text-sm font-medium text-[var(--foreground)] truncate">{a.name}</span>
                  {a.hotLeads > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0">{a.hotLeads} hot</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] shrink-0">
                  <span>{a.activeLeads} active</span>
                  <span>{a.converted} won</span>
                  <span className="font-semibold text-[var(--foreground)]">{a.conversionRate}%</span>
                </div>
              </div>
            ))}
          </div>
          {topAgent && topAgent.converted > 0 && (
            <p className="text-xs text-[var(--muted-foreground)] mt-3">Top performer: <span className="font-medium text-[var(--foreground)]">{topAgent.name}</span> at {topAgent.conversionRate}% conversion.</p>
          )}
        </div>

        {/* Leads at risk */}
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" /> Leads Needing Attention
          </h3>
          <div className="space-y-3">
            {data.unassignedHotLeads.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><UserX size={11} /> Unassigned Hot Leads</div>
                {data.unassignedHotLeads.map((l: any) => (
                  <a key={l.id} href="#/leads" className="block text-sm text-[var(--foreground)] hover:text-[var(--primary)] py-0.5">{l.name}</a>
                ))}
              </div>
            )}
            {data.staleHotLeads.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5">Untouched 2+ Hours</div>
                {data.staleHotLeads.map((l: any) => (
                  <a key={l.id} href="#/leads" className="flex items-center justify-between text-sm text-[var(--foreground)] hover:text-[var(--primary)] py-0.5">
                    <span>{l.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{l.agent} · {l.hoursSinceUpdate}h</span>
                  </a>
                ))}
              </div>
            )}
            {data.unassignedHotLeads.length === 0 && data.staleHotLeads.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">Every hot lead is assigned and being worked. Nice.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
