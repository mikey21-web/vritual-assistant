import React, { useState, useEffect } from 'react';
import { fetchMessages } from '../lib/data';
import { MessageSquare, ChevronDown, Phone, Mail } from 'lucide-react';

const channelIcons: Record<string, any> = {
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  SMS: Phone,
};

export default function MessagesPage() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages().then((r: any) => setData(r.data || r)).catch(() => {});
  }, []);

  const filtered = data.filter((m: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.text || m.body || '').toLowerCase().includes(q)
      || (m.channel || '').toLowerCase().includes(q)
      || (m.direction || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Conversations</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{filtered.length} messages</p>
        </div>
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-64 rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Direction</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)]">{search ? 'No messages match your search' : 'No messages yet'}</td></tr>
              ) : (
                filtered.slice(0, 50).map((m: any) => {
                  const Icon = channelIcons[m.channel] || MessageSquare;
                  const isExpanded = expandedId === m.id;
                  return (
                    <React.Fragment key={m.id}>
                      <tr
                        className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 cursor-pointer transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Icon size={14} className="text-[var(--muted-foreground)]" />
                            <span className="text-xs text-[var(--foreground)]">{m.channel}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.direction === 'INBOUND'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {m.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--foreground)] max-w-md truncate">
                          {m.text || m.body || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronDown size={14} className={`text-[var(--muted-foreground)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${m.id}-exp`}>
                          <td colSpan={5} className="px-4 py-4 bg-[var(--muted)] border-b border-[var(--border)]">
                            <div className="max-w-2xl">
                              <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Icon size={14} className="text-[var(--muted-foreground)]" />
                                  <span className="text-xs font-medium text-[var(--muted-foreground)]">
                                    {m.channel} · {m.direction} · {new Date(m.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                  {m.text || m.body || 'No content'}
                                </p>
                                {m.metadata && Object.keys(m.metadata).length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                                    <p className="text-xs text-[var(--muted-foreground)] font-medium mb-1">Metadata</p>
                                    <pre className="text-xs text-[var(--muted-foreground)]">{JSON.stringify(m.metadata, null, 2)}</pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
