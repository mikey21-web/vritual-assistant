'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, Clock } from 'lucide-react';

export default function LeadsPage() {
  const [data, setData] = useState<any>({ data: [], meta: { total: 0, page: 1, limit: 20 } });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [segment, setSegment] = useState('');

  const refresh = (page = 1) => {
    const params = new URLSearchParams({ page: String(page), limit: '20', search, status, segment });
    api(`/leads?${params}`).then(setData).catch(e => toast.error(e.message));
  };

  useEffect(() => { refresh(); }, [search, status, segment]);

  const segments = ['HOT', 'WARM', 'COLD', 'UNQUALIFIED'];
  const statuses = ['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'CONVERTED', 'LOST'];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded text-sm" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="">All Status</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={segment} onChange={e => setSegment(e.target.value)} className="border rounded px-3 py-2 text-sm">
          <option value="">All Segments</option>
          {segments.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Contact</th><th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Segment</th>
              <th className="px-4 py-3 font-medium">Score</th><th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((l: any) => (
              <tr key={l.id} className="border-t hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-3"><div className="font-medium">{l.contact?.name || 'Unknown'}</div><div className="text-xs text-gray-500">{l.contact?.phone || l.contact?.email}</div></td>
                <td className="px-4 py-3">{l.source}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${l.status === 'NEW' ? 'bg-blue-100 text-blue-700' : l.status === 'CONVERTED' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{l.status}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${l.segment === 'HOT' ? 'bg-red-100 text-red-700' : l.segment === 'WARM' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'}`}>{l.segment}</span></td>
                <td className="px-4 py-3">{l.score}</td>
                <td className="px-4 py-3 text-xs">{l.assignedAgent?.name || '-'}</td>
                <td className="px-4 py-3 text-xs">{new Date(l.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/leads/${l.id}/timeline`} className="text-gray-400 hover:text-blue-600 p-1 inline-flex" title="Timeline"><Clock size={14} /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.data.length === 0 && <div className="p-8 text-center text-gray-400">No leads found</div>}
      </div>
    </div>
  );
}
