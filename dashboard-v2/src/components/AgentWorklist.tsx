import { useState, useEffect } from "react";
import { Flame, Calendar, AlertTriangle, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import PreVisitBrief from "./PreVisitBrief";

/** The agent's "my day" home screen: hot leads, today's visits, overdue follow-ups. */
export default function AgentWorklist() {
  const [data, setData] = useState<any>(null);
  const [briefLeadId, setBriefLeadId] = useState<string | null>(null);

  useEffect(() => {
    api('/leads/worklist/mine').then(setData).catch(() => {});
  }, []);

  if (!data) return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hot leads */}
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Flame size={15} className="text-red-500" /> My Hot Leads
            <span className="ml-auto text-xs font-normal text-[var(--muted-foreground)]">{data.hotLeads.length}</span>
          </h3>
          <div className="space-y-2.5">
            {data.hotLeads.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No hot leads right now</p>}
            {data.hotLeads.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-[var(--foreground)] truncate">{l.contact?.name || 'Unknown'}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Score {l.score}</div>
                </div>
                <button onClick={() => setBriefLeadId(l.id)} className="shrink-0 p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--primary)]" title="Pre-visit brief">
                  <Sparkles size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Today's visits */}
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Calendar size={15} className="text-[var(--primary)]" /> Today's Site Visits
            <span className="ml-auto text-xs font-normal text-[var(--muted-foreground)]">{data.todayVisits.length}</span>
          </h3>
          <div className="space-y-2.5">
            {data.todayVisits.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No visits scheduled today</p>}
            {data.todayVisits.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-[var(--foreground)] truncate">{v.lead?.contact?.name || 'Unknown'}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {new Date(v.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    {v.property ? ` · ${v.property.title}` : ''}
                  </div>
                </div>
                <button onClick={() => setBriefLeadId(v.leadId)} className="shrink-0 p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--primary)]" title="Pre-visit brief">
                  <Sparkles size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue follow-ups */}
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" /> Overdue Follow-ups
            <span className="ml-auto text-xs font-normal text-[var(--muted-foreground)]">{data.overdueTasks.length}</span>
          </h3>
          <div className="space-y-2.5">
            {data.overdueTasks.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">Nothing overdue — nice work</p>}
            {data.overdueTasks.map((t: any) => (
              <div key={t.id} className="text-sm">
                <div className="font-medium text-[var(--foreground)] truncate">{t.title}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{t.lead?.contact?.name ? `${t.lead.contact.name} · ` : ''}Due {new Date(t.dueAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {briefLeadId && <PreVisitBrief leadId={briefLeadId} onClose={() => setBriefLeadId(null)} />}
    </div>
  );
}
