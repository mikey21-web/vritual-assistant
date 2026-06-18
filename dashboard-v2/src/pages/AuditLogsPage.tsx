import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Shield, Search, Filter, Calendar } from 'lucide-react';

export default function AuditLogsPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const refresh = () => {
    const params = new URLSearchParams({ limit: '50', page: String(page) });
    if (search) params.set('q', search);
    if (actionFilter) params.set('action', actionFilter);
    api(`/audit-logs?${params}`).then((r:any) => setData(r.data ? r : { data: r })).catch(() => {});
  };
  useEffect(() => { refresh(); }, [page, actionFilter]);

  const items = data.data || data || [];
  const totalPages = Math.max(1, Math.ceil((data.meta?.total || items.length) / 50));

  const actions = [...new Set((Array.isArray(items) ? items : []).map((a:any) => a.action))];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield size={20}/>Audit Logs</h2>
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input placeholder="Search logs..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&refresh()} className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"/></div>
        <select value={actionFilter} onChange={e=>{setActionFilter(e.target.value);setPage(1);}} className="border rounded-lg px-3 py-2 text-sm"><option value="">All Actions</option>{actions.map(a=><option key={a} value={a}>{a}</option>)}</select>
      </div>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Details</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Time</th></tr></thead>
        <tbody>{Array.isArray(items) && items.map((a:any) => <tr key={a.id} className="border-t hover:bg-gray-50">
          <td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 rounded-full bg-gray-100 font-mono">{a.action}</span></td>
          <td className="px-4 py-3 text-xs">{a.entityType} #{a.entityId?.slice(0,8)}</td>
          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{JSON.stringify(a.metadata||a.details||'').slice(0,100)}</td>
          <td className="px-4 py-3 text-xs">{a.user?.email || a.user?.name || a.userId}</td>
          <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
        </tr>)}</tbody></table>
        {(!Array.isArray(items) || items.length===0) && <div className="p-8 text-center text-gray-400">No audit logs found</div>}
      </div>
      {totalPages > 1 && <div className="flex justify-center gap-2 mt-4">
        <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="border px-3 py-1.5 rounded-lg text-sm disabled:opacity-30">Prev</button>
        <span className="px-3 py-1.5 text-sm text-gray-500">Page {page} of {totalPages}</span>
        <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages} className="border px-3 py-1.5 rounded-lg text-sm disabled:opacity-30">Next</button>
      </div>}
    </div>
  );
}
