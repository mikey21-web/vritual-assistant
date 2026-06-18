import React, { useState, useEffect } from 'react';
import { fetchContacts } from '../lib/data';
import { Search } from 'lucide-react';
import type { Contact } from '../lib/types';

export default function ContactsPage() {
  const [data, setData] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { fetchContacts(1, debounced).then((r: any) => setData(r.data || r)).catch(() => {}); }, [debounced]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Contacts</h2>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" /></div>
      </div>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Leads</th></tr></thead>
          <tbody>{data.map(c => <tr key={c.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium text-xs">{c.name || '-'}</td><td className="px-4 py-3 text-xs">{c.email || '-'}</td><td className="px-4 py-3 text-xs">{c.phone || '-'}</td><td className="px-4 py-3 text-xs">{c.company || '-'}</td><td className="px-4 py-3 text-xs">{c._count?.leads || 0}</td></tr>)}</tbody>
        </table>
        {data.length === 0 && <div className="p-8 text-center text-gray-400">No contacts</div>}
      </div>
    </div>
  );
}
