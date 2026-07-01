import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';

interface LogEntry {
  level: string;
  message: string;
  context?: string;
  timestamp: string;
}

export default function SystemLogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [level, setLevel] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [level]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const data = await api('/admin/logs?level=' + level);
      setLogs(data.entries || []);
    } catch {
      // Fall back to audit logs if system logs endpoint doesn't exist
      try {
        const audit = await api('/audit-logs');
        setLogs((audit.data || []).map((a: any) => ({
          level: 'info',
          message: `${a.action} on ${a.entity}`,
          context: a.changes ? JSON.stringify(a.changes) : '',
          timestamp: a.createdAt,
        })));
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  const filtered = logs.filter(l =>
    !filter || l.message.toLowerCase().includes(filter.toLowerCase())
  );

  const levelColors: Record<string, string> = {
    error: 'text-red-600 dark:text-red-400',
    warn: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
    debug: 'text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="space-y-4">
      <PageHeader title="System Logs" description="Recent application log entries" />

      <div className="flex gap-2">
        <input
          type="search"
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg bg-[var(--background)]"
        />
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="px-3 py-2 border rounded-lg bg-[var(--background)]">
          <option value="all">All levels</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">No logs found.</div>
        ) : (
          <div className="divide-y">
            {filtered.map((log, i) => (
              <div key={i} className="p-3 hover:bg-[var(--muted)]/30">
                <div className="flex items-start gap-3">
                  <span className={`text-xs font-mono uppercase ${levelColors[log.level] || ''}`}>{log.level}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-sm font-mono break-all">{log.message}</div>
                {log.context && <div className="mt-1 text-xs text-[var(--muted-foreground)] font-mono">{log.context}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
