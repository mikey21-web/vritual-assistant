import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FailuresPage() {
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const refresh = () => api('/failures').then((r: any) => setData(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const retry = async (id: string) => {
    setLoading(l => ({ ...l, [id]: true }));
    try { await api(`/failures/${id}/retry`, { method: 'POST' }); refresh(); toast.success('Retrying...'); } catch (e: any) { toast.error(e.message); }
    finally { setLoading(l => ({ ...l, [id]: false })); }
  };

  const resolve = async (id: string) => {
    try { await api(`/failures/${id}/resolve`, { method: 'POST' }); refresh(); toast.success('Resolved'); } catch (e: any) { toast.error(e.message); }
  };

  const filtered = filter === 'all' ? data : data.filter(f => f.status === filter);
  const openCount = data.filter(f => f.status === 'OPEN').length;
  const retryingCount = data.filter(f => f.status === 'RETRYING').length;
  const resolvedCount = data.filter(f => f.status === 'RESOLVED').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Failure Inbox</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{data.length} total failures</p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: data.length, filter: 'all', color: 'text-[var(--foreground)]', bg: 'bg-[var(--card)]' },
          { label: 'Open', count: openCount, filter: 'OPEN', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
          { label: 'Retrying', count: retryingCount, filter: 'RETRYING', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
          { label: 'Resolved', count: resolvedCount, filter: 'RESOLVED', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => setFilter(item.filter)}
            className={`rounded-xl border p-4 text-left transition-all ${
              filter === item.filter
                ? `${item.bg} ring-2 ring-[var(--ring)]`
                : 'bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]'
            }`}
          >
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{item.label}</div>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[var(--muted-foreground)] bg-[var(--card)] rounded-xl border border-[var(--border)]">
            No failures {filter !== 'all' ? `with status "${filter}"` : ''}
          </div>
        )}
        {filtered.map((f: any) => {
          const isOpen = f.status === 'OPEN';
          const isRetrying = f.status === 'RETRYING';
          const isResolved = f.status === 'RESOLVED';
          return (
            <div
              key={f.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                isOpen
                  ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                  : isRetrying
                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
                    : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
              }`}
            >
              <div className={`h-1 ${
                isOpen ? 'bg-red-500' : isRetrying ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {isOpen && <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />}
                    {isRetrying && <Clock size={18} className="text-amber-500 mt-0.5 shrink-0" />}
                    {isResolved && <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-[var(--foreground)]">
                        {f.type || f.eventType || 'Unknown Failure'}
                        <span className={`ml-2 text-xs font-normal ${
                          isOpen ? 'text-red-600' : isRetrying ? 'text-amber-600' : 'text-emerald-600'
                        }`}>{f.status}</span>
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1 break-all">{f.error || f.message}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {!isResolved && (
                      <>
                        <button
                          onClick={() => retry(f.id)}
                          disabled={loading[f.id]}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-[var(--card)] text-xs text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={loading[f.id] ? 'animate-spin' : ''} />
                          Retry
                        </button>
                        <button
                          onClick={() => resolve(f.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                        >
                          <CheckCircle size={12} />
                          Resolve
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)] mt-3">
                  <span>{new Date(f.createdAt).toLocaleString()}</span>
                  <span>{f.retryCount || 0} retries</span>
                  {f.nextRetryAt && <span>Next: {new Date(f.nextRetryAt).toLocaleString()}</span>}
                  {f.entityId && <span className="font-mono">ID: {f.entityId.slice(0, 12)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
