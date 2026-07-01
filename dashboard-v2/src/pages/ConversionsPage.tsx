import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ArrowLeftRight, TrendingUp, DollarSign, Activity, Filter } from 'lucide-react';

const stageColors: Record<string, string> = {
  'New': 'bg-blue-500',
  'Qualified': 'bg-yellow-500',
  'Interested': 'bg-purple-500',
  'Proposal Sent': 'bg-orange-500',
  'Negotiation': 'bg-indigo-500',
  'Won': 'bg-emerald-500',
  'Lost': 'bg-red-500',
};

export default function ConversionsPage() {
  const [data, setData] = useState<any>({ data: [], summary: {} });
  const [stageFilter, setStageFilter] = useState('');

  const refresh = () => api(`/conversions${stageFilter ? `?stage=${stageFilter}` : ''}`).then((r: any) => setData(r.data ? r : { data: r, summary: {} })).catch(() => {});
  useEffect(() => { refresh(); }, [stageFilter]);

  const items = data.data || data || [];
  const rate = data.summary?.rate ?? '--';
  const total = data.summary?.total || (Array.isArray(items) ? items.length : 0);
  const revenue = data.summary?.revenue || 0;

  const stages = [...new Set(Array.isArray(items) ? items.map((c: any) => c.stage) : [])] as string[];
  const stageCounts: Record<string, number> = {};
  if (Array.isArray(items)) items.forEach((c: any) => { stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1; });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Conversions</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Pipeline overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Conversions', value: total, icon: Activity, color: 'from-blue-500 to-blue-600' },
          { label: 'Win Rate', value: `${rate}${typeof rate === 'number' ? '%' : ''}`, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Pipeline Value', value: `$${revenue.toLocaleString()}`, icon: DollarSign, color: 'from-violet-500 to-violet-600' },
        ].map(m => (
          <div key={m.label} className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center mb-3`}>
              <m.icon size={18} className="text-white" />
            </div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{m.value}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {Object.keys(stageCounts).length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Pipeline Stages</h3>
          <div className="flex h-8 rounded-full overflow-hidden bg-[var(--muted)]">
            {Object.entries(stageCounts).map(([stage, count]) => {
              const pct = (count / total) * 100;
              return (
                <div
                  key={stage}
                  className={`${stageColors[stage] || 'bg-gray-500'} flex items-center justify-center text-[10px] text-white font-medium transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${stage}: ${count}`}
                >
                  {pct > 12 ? count : ''}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 flex-wrap">
            {Object.entries(stageCounts).map(([stage, count]) => (
              <div key={stage} className="flex items-center gap-1.5 text-xs text-[var(--foreground)]">
                <div className={`w-2.5 h-2.5 rounded-full ${stageColors[stage] || 'bg-gray-500'}`} />
                {stage} <span className="text-[var(--muted-foreground)]">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStageFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !stageFilter
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)]'
          }`}
        >
          All
        </button>
        {stages.map(s => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              stageFilter === s
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Stage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {(!Array.isArray(items) || items.length === 0) ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-[var(--muted-foreground)]">No conversions</td></tr>
              ) : (
                Array.isArray(items) && items.map((c: any) => (
                  <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{c.lead?.contact?.name || c.leadId}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                        {c.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">${c.value?.toLocaleString() || '--'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
