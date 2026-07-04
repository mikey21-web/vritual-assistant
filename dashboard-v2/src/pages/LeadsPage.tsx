import React, { useState, useEffect } from 'react';
import { fetchLeads, getLeadTimeline } from '../lib/data';
import { useApp } from '../context/AppContext';
import { Search, RefreshCw, Phone, Mail, Calendar, Users } from 'lucide-react';
import type { Lead } from '../lib/types';

const statusStyles: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONTACTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ENGAGED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  QUALIFYING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  QUALIFIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CONVERTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  COLD: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SPAM: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const segmentStyles: Record<string, string> = {
  HOT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  WARM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COLD: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  UNQUALIFIED: 'bg-gray-100 text-gray-400 dark:bg-gray-800',
};

export default function LeadsPage() {
  const { niche } = useApp();
  const [data, setData] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  const refresh = async (page = 1) => {
    setLoading(true);
    try {
      const filters: Record<string, string> = { search, status: statusFilter, segment: segmentFilter };
      const r = await fetchLeads(page, filters);
      setData(r.data);
      setMeta(r.meta);
    } catch (e: any) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [search, statusFilter, segmentFilter]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try { setTimeline(await getLeadTimeline(id)); } catch {}
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">{niche?.labels?.leads || 'Leads'}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{meta.total} total leads</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            placeholder={`Search ${niche?.labels?.lead?.toLowerCase() || 'lead'}s...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 focus:border-[var(--ring)] transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        >
          <option value="">All Status</option>
          {['NEW','CONTACTED','ENGAGED','QUALIFYING','QUALIFIED','CONVERTED','LOST','COLD','SPAM'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={segmentFilter}
          onChange={e => setSegmentFilter(e.target.value)}
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        >
          <option value="">All Segments</option>
          {['HOT','WARM','COLD','UNQUALIFIED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={() => refresh()}
          className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="hidden sm:block rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Segment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-[var(--muted)] rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] py-16 text-center text-[var(--muted-foreground)]">
          <div className="flex flex-col items-center gap-2">
            <Users size={28} className="text-[var(--muted-foreground)]/40" />
            <p className="text-sm">No leads found</p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Segment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(l => (
                    <React.Fragment key={l.id}>
                      <tr
                        onClick={() => handleExpand(l.id)}
                        className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--foreground)]">{l.contact?.name || 'Unknown'}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{l.contact?.phone || l.contact?.email || ''}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-[var(--muted-foreground)]">{l.source}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[l.status] || ''}`}>{l.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${segmentStyles[l.segment] || ''}`}>{l.segment}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-[var(--foreground)]">{l.score}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                          {new Date(l.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                      {expandedId === l.id && (
                        <tr key={`${l.id}-exp`}>
                          <td colSpan={6} className="px-4 py-4 bg-[var(--muted)] border-b border-[var(--border)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Lead Details</h4>
                                <div className="space-y-2.5 text-sm">
                                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    <Phone size={14} className="text-[var(--primary)]" /><span>{l.contact?.phone || '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                                    <Mail size={14} className="text-[var(--primary)]" /><span>{l.contact?.email || '-'}</span>
                                  </div>
                                  {l.interest && <div className="mt-2"><span className="text-[var(--foreground)] font-medium">Interest:</span> <span className="text-[var(--muted-foreground)]">{l.interest}</span></div>}
                                  {l.budget && <div><span className="text-[var(--foreground)] font-medium">Budget:</span> <span className="text-[var(--muted-foreground)]">{l.budget}</span></div>}
                                  {l.message && <div><span className="text-[var(--foreground)] font-medium">Message:</span> <span className="text-[var(--muted-foreground)]">{l.message}</span></div>}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Timeline</h4>
                                <div className="space-y-2">
                                  {timeline.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No activity yet</p>}
                                  {timeline.slice(0, 5).map((t: any) => (
                                    <div key={t.id} className="flex items-start gap-2.5 text-sm">
                                      <Calendar size={14} className="text-[var(--primary)] mt-0.5 shrink-0" />
                                      <div>
                                        <p className="text-[var(--foreground)]">{t.title}</p>
                                        <p className="text-xs text-[var(--muted-foreground)]">{new Date(t.createdAt).toLocaleString()}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="block sm:hidden space-y-3">
            {data.map(l => (
              <div
                key={l.id}
                onClick={() => handleExpand(l.id)}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 cursor-pointer active:bg-[var(--muted)]/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--foreground)]">{l.contact?.name || 'Unknown'}</div>
                    <div className="text-xs text-[var(--muted-foreground)] truncate">{l.contact?.phone || l.contact?.email || ''}</div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${segmentStyles[l.segment] || ''}`}>{l.segment}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[var(--muted-foreground)]">{l.source}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[l.status] || ''}`}>{l.status}</span>
                  <span className="ml-auto font-mono font-semibold text-[var(--foreground)]">Score: {l.score}</span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1.5">{new Date(l.createdAt).toLocaleDateString()}</div>

                {expandedId === l.id && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="space-y-2.5 text-sm">
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                        <Phone size={14} className="text-[var(--primary)]" /><span>{l.contact?.phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                        <Mail size={14} className="text-[var(--primary)]" /><span>{l.contact?.email || '-'}</span>
                      </div>
                      {l.interest && <div><span className="text-[var(--foreground)] font-medium">Interest:</span> <span className="text-[var(--muted-foreground)]">{l.interest}</span></div>}
                      {l.budget && <div><span className="text-[var(--foreground)] font-medium">Budget:</span> <span className="text-[var(--muted-foreground)]">{l.budget}</span></div>}
                      {l.message && <div><span className="text-[var(--foreground)] font-medium">Message:</span> <span className="text-[var(--muted-foreground)]">{l.message}</span></div>}
                    </div>
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Timeline</h4>
                      <div className="space-y-2">
                        {timeline.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No activity yet</p>}
                        {timeline.slice(0, 5).map((t: any) => (
                          <div key={t.id} className="flex items-start gap-2 text-sm">
                            <Calendar size={14} className="text-[var(--primary)] mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[var(--foreground)]">{t.title}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{new Date(t.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
