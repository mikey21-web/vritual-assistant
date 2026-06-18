'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function ConversionsPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  useEffect(() => { api('/conversions').then((r: any) => setData(r.data || r)); }, []);

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Conversions</h2>
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Destination</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Created</th></tr></thead>
          <tbody>{data.data.map((c: any) => (<tr key={c.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3">{c.destination}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${c.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : c.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span></td><td className="px-4 py-3 text-xs">{c.lead?.contact?.name || c.leadId}</td><td className="px-4 py-3 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td></tr>))}</tbody>
        </table>
        {data.data.length === 0 && <div className="p-8 text-center text-gray-400">No conversions</div>}
      </div>
    </div>
  );
}
