'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

export default function ContactsPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api(`/contacts?search=${debounced}`).then(setData).catch(e => toast.error(e.message));
  }, [debounced]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded text-sm" />
        </div>
      </div>
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Leads</th></tr></thead>
          <tbody>{data.data.map((c: any) => (<tr key={c.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium">{c.name || '-'}</td><td className="px-4 py-3">{c.email || '-'}</td><td className="px-4 py-3">{c.phone || '-'}</td><td className="px-4 py-3">{c.company || '-'}</td><td className="px-4 py-3">{c._count?.leads || 0}</td></tr>))}</tbody>
        </table>
        {data.data.length === 0 && <div className="p-8 text-center text-gray-400">No contacts found</div>}
      </div>
    </div>
  );
}
