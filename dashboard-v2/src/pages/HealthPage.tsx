import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, Server, Database } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  ok: <CheckCircle size={16} className="text-emerald-500" />,
  degraded: <AlertTriangle size={16} className="text-amber-500" />,
  down: <XCircle size={16} className="text-red-500" />,
  error: <XCircle size={16} className="text-red-500" />,
};
const bgMap: Record<string, string> = {
  ok: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  degraded: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  down: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  unknown: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
};

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async () => {
    setRefreshing(true);
    try { const r = await api('/health/deep'); setHealth(r); } catch (e) {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchHealth(); const t = setInterval(fetchHealth, 30000); return () => clearInterval(t); }, [fetchHealth]);

  if (!health) return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />)}
      </div>
    </div>
  );

  const deps = health.dependencies || {};
  const depEntries = Object.entries(deps as Record<string, any>);
  const okCount = depEntries.filter(([_, v]) => v.status === 'ok').length;
  const degradedCount = depEntries.filter(([_, v]) => v.status === 'degraded').length;
  const downCount = depEntries.filter(([_, v]) => v.status === 'down' || v.status === 'error').length;

  const overallColor = health.status === 'ok' ? 'text-emerald-600 dark:text-emerald-400'
    : health.status === 'degraded' ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';
  const overallBg = health.status === 'ok' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    : health.status === 'degraded' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Health Dashboard</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">System monitoring</p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={refreshing}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className={`${overallBg} border rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <div className="text-xs text-[var(--muted-foreground)]">Overall Status</div>
          <div className={`text-lg font-bold ${overallColor}`}>{health.status?.toUpperCase()}</div>
        </div>
        <div className="text-xs text-[var(--muted-foreground)]">
          Last checked: {new Date(health.timestamp || Date.now()).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Healthy', count: okCount, color: 'text-emerald-600' },
          { label: 'Degraded', count: degradedCount, color: 'text-amber-600' },
          { label: 'Down', count: downCount, color: 'text-red-600' },
          { label: 'Total', count: depEntries.length, color: 'text-[var(--foreground)]' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-center">
            <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {depEntries.length === 0 && (
          <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">No dependencies</div>
        )}
        {depEntries.map(([key, val]: [string, any]) => (
          <div key={key} className={`${bgMap[val.status] || bgMap.unknown} border rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {val.status === 'ok' ? <Database size={14} className="text-emerald-500" /> : <Server size={14} className="text-[var(--muted-foreground)]" />}
                <span className="font-medium text-sm text-[var(--foreground)] capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {iconMap[val.status] || iconMap.unknown}
              </div>
              {val.latencyMs !== undefined && (
                <span className="text-xs text-[var(--muted-foreground)] font-mono">{val.latencyMs}ms</span>
              )}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">{val.message || val.status}</div>
            {val.error && <div className="text-xs text-red-500 mt-1 truncate">{val.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
