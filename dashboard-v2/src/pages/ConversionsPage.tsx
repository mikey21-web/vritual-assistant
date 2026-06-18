import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ArrowLeftRight, TrendingUp, DollarSign, Activity } from 'lucide-react';

export default function ConversionsPage() {
  const [data, setData] = useState<any>({ data: [], summary: {} });
  const [stageFilter, setStageFilter] = useState('');

  const refresh = () => api(`/conversions${stageFilter ? `?stage=${stageFilter}` : ''}`).then((r:any) => setData(r.data ? r : { data: r, summary: {} })).catch(() => {});
  useEffect(() => { refresh(); }, [stageFilter]);

  const items = data.data || data || [];
  const rate = data.summary?.rate ?? '--';
  const total = data.summary?.total || (Array.isArray(items) ? items.length : 0);
  const revenue = data.summary?.revenue || 0;

  const stages = [...new Set(Array.isArray(items) ? items.map((c:any) => c.stage) : [])];
  const stageCounts: Record<string,number> = {};
  if (Array.isArray(items)) items.forEach((c:any) => { stageCounts[c.stage] = (stageCounts[c.stage]||0)+1; });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><ArrowLeftRight size={20}/>Conversions</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4"><Activity size={20} className="text-blue-600"/><div className="text-3xl font-bold text-blue-600 mt-1">{total}</div><div className="text-xs text-gray-500">Total Conversions</div></div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4"><TrendingUp size={20} className="text-green-600"/><div className="text-3xl font-bold text-green-600 mt-1">{rate}{typeof rate==='number'?'%':''}</div><div className="text-xs text-gray-500">Win Rate</div></div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4"><DollarSign size={20} className="text-purple-600"/><div className="text-3xl font-bold text-purple-600 mt-1">${revenue.toLocaleString()}</div><div className="text-xs text-gray-500">Pipeline Value</div></div>
      </div>

      {Object.keys(stageCounts).length > 0 && <div className="mb-6">
        <h3 className="text-sm font-medium mb-3">By Stage</h3>
        <div className="flex h-8 rounded-full overflow-hidden bg-gray-100">
          {Object.entries(stageCounts).map(([stage,count]) => {
            const pct = (count / total) * 100;
            const colors: Record<string,string> = { 'New': 'bg-blue-500', 'Qualified': 'bg-yellow-500', 'Proposal Sent': 'bg-orange-500', 'Won': 'bg-green-500', 'Lost': 'bg-red-500' };
            return <div key={stage} className={`${colors[stage] || 'bg-gray-500'} flex items-center justify-center text-[10px] text-white font-medium`} style={{width:`${pct}%`}} title={`${stage}: ${count}`}>{pct>10?count:''}</div>;
          })}
        </div>
        <div className="flex gap-4 mt-2 flex-wrap">{Object.keys(stageCounts).map(s=><div key={s} className="flex items-center gap-1 text-xs"><div className={`w-2 h-2 rounded-full ${({New:'bg-blue-500',Qualified:'bg-yellow-500','Proposal Sent':'bg-orange-500',Won:'bg-green-500',Lost:'bg-red-500'} as any)[s]||'bg-gray-500'}`}></div>{s} ({stageCounts[s]})</div>)}</div>
      </div>}

      <div className="flex gap-2 mb-4">
        <button onClick={()=>setStageFilter('')} className={`px-3 py-1.5 rounded-lg text-xs border ${!stageFilter?'bg-blue-600 text-white border-blue-600':'hover:bg-gray-50'}`}>All</button>
        {stages.map(s=><button key={s} onClick={()=>setStageFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs border ${stageFilter===s?'bg-blue-600 text-white border-blue-600':'hover:bg-gray-50'}`}>{s}</button>)}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Date</th></tr></thead>
        <tbody>{Array.isArray(items) && items.map((c:any) => <tr key={c.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 text-xs">{c.lead?.contact?.name || c.leadId}</td><td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[11px]">{c.stage}</span></td><td className="px-4 py-3 text-xs">${c.value?.toLocaleString() || '--'}</td><td className="px-4 py-3 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>
        {(!Array.isArray(items) || items.length===0) && <div className="p-8 text-center text-gray-400">No conversions</div>}
      </div>
    </div>
  );
}
