'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Shield } from 'lucide-react';

export default function AuditLogsPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  useEffect(() => { api('/audit-logs').then((r: any) => setData(r.data || r)); }, []);

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Audit Logs</h2>
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Time</th></tr></thead>
          <tbody>{data.data.map((l: any) => (<tr key={l.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3">{l.action}</td><td className="px-4 py-3">{l.entity} {l.entityId && <span className="text-gray-400 text-xs ml-1">{l.entityId.slice(0,8)}</span>}</td><td className="px-4 py-3 text-xs">{l.user?.name || '-'}</td><td className="px-4 py-3 text-xs">{new Date(l.createdAt).toLocaleString()}</td></tr>))}</tbody>
        </table>
        {data.data.length === 0 && <div className="p-8 text-center text-gray-400">No audit logs</div>}
      </div>
    </div>
  );
}
