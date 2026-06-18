import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Shield } from 'lucide-react';

export default function AuditLogsPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  useEffect(() => { api('/audit-logs?limit=100').then((r:any) => setData(r.data ? r : { data: r })).catch(() => {}); }, []);
  const items = data.data || data;
  return (
    <div><h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield size={20}/>Audit Logs</h2>
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Time</th></tr></thead>
      <tbody>{Array.isArray(items) && items.map((a:any)=><tr key={a.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 text-xs font-mono">{a.action}</td><td className="px-4 py-3 text-xs">{a.entityType} #{a.entityId?.slice(0,8)}</td><td className="px-4 py-3 text-xs">{a.user?.email || a.userId}</td><td className="px-4 py-3 text-xs">{new Date(a.createdAt).toLocaleString()}</td></tr>)}</tbody></table>
      {(!Array.isArray(items) || items.length===0) && <div className="p-8 text-center text-gray-400">No audit logs</div>}
    </div></div>
  );
}
