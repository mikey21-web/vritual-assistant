import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Shield, Search, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

export default function AuditLogsPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const refresh = () => {
    const params = new URLSearchParams({ limit: '50', page: String(page) });
    if (search) params.set('q', search);
    if (actionFilter) params.set('action', actionFilter);
    api(`/audit-logs?${params}`).then((r: any) => setData(r.data ? r : { data: r })).catch(() => {});
  };
  useEffect(() => { refresh(); }, [page, actionFilter]);

  const items = data.data || data || [];
  const totalPages = Math.max(1, Math.ceil((data.meta?.total || items.length) / 50));
  const actions = [...new Set((Array.isArray(items) ? items : []).map((a: any) => a.action))] as string[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Audit Logs</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">System activity trail</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && refresh()}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        >
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {!Array.isArray(items) || items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)]">No audit logs found</td></tr>
              ) : (
                Array.isArray(items) && items.map((a: any) => (
                  <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--muted)] text-xs font-mono text-[var(--foreground)]">
                        {a.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      {a.entityType} <span className="font-mono">#{a.entityId?.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] max-w-xs truncate font-mono">
                      {JSON.stringify(a.metadata || a.details || '').slice(0, 100)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{a.user?.email || a.user?.name || a.userId}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-sm text-[var(--muted-foreground)]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
