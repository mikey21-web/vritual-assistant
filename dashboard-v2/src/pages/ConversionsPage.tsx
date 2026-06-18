import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ArrowLeftRight } from 'lucide-react';

export default function ConversionsPage() {
  const [data, setData] = useState<any>({ data: [], summary: {} });
  useEffect(() => { api('/conversions').then((r:any) => setData(r.data ? r : { data: r, summary: {} })).catch(() => {}); }, []);
  const items = data.data || data;
  const rate = data.summary?.rate || '--';
  const total = data.summary?.total || (Array.isArray(items) ? items.length : 0);
  return (
    <div><h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><ArrowLeftRight size={20}/>Conversions</h2>
    <div className="grid grid-cols-3 gap-4 mb-6"><div className="bg-white border rounded-xl p-4 text-center"><div className="text-3xl font-bold text-blue-600">{total}</div><div className="text-xs text-gray-500">Total</div></div>
    <div className="bg-white border rounded-xl p-4 text-center"><div className="text-3xl font-bold text-green-600">{rate}{typeof rate==='number'?'%':''}</div><div className="text-xs text-gray-500">Rate</div></div>
    <div className="bg-white border rounded-xl p-4 text-center"><div className="text-3xl font-bold text-purple-600">{data.summary?.revenue ? '$'+data.summary.revenue : '--'}</div><div className="text-xs text-gray-500">Revenue</div></div></div>
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Date</th></tr></thead>
      <tbody>{Array.isArray(items) && items.map((c:any)=><tr key={c.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 text-xs">{c.lead?.contact?.name || c.leadId}</td><td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{c.stage}</span></td><td className="px-4 py-3 text-xs">{c.value ? '$'+c.value : '--'}</td><td className="px-4 py-3 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>
    </div></div>
  );
}
