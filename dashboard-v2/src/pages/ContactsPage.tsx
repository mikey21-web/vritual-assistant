import React, { useState, useEffect } from 'react';
import { fetchContacts } from '../lib/data';
import { Search, Users } from 'lucide-react';
import type { Contact } from '../lib/types';

export default function ContactsPage() {
  const [data, setData] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { fetchContacts(1, debounced).then((r: any) => setData(r.data || r)).catch(() => {}); }, [debounced]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Contacts</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{data.length} contacts</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors"
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="hidden sm:block rounded-xl border border-[var(--border)] bg-[var(--card)] py-16 text-center text-[var(--muted-foreground)]">
          <Users size={28} className="mx-auto mb-2 text-[var(--muted-foreground)]/40" />
          <p className="text-sm">No contacts found</p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(c => (
                    <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-[var(--primary)]">
                              {(c.name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-[var(--foreground)]">{c.name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{c.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{c.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{c.company || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-sm text-[var(--foreground)]">{c._count?.leads || 0}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="block sm:hidden space-y-3">
            {data.map(c => (
              <div key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-[var(--primary)]">
                        {(c.name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-[var(--foreground)] truncate">{c.name || '-'}</div>
                      <div className="text-xs text-[var(--muted-foreground)] truncate">{c.email || '-'}</div>
                    </div>
                  </div>
                  <span className="font-semibold text-sm text-[var(--foreground)] shrink-0 ml-2">{c._count?.leads || 0} leads</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <span className="w-16 text-xs font-medium text-[var(--foreground)]">Email</span>
                    <span className="truncate">{c.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <span className="w-16 text-xs font-medium text-[var(--foreground)]">Phone</span>
                    <span>{c.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                    <span className="w-16 text-xs font-medium text-[var(--foreground)]">Company</span>
                    <span className="truncate">{c.company || '-'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
