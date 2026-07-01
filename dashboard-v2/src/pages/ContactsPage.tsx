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
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Contacts</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{data.length} contacts</p>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors"
        />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
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
              {data.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)]">No contacts found</td></tr>
              ) : (
                data.map(c => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
