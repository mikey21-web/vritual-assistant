import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api('/analytics/overview').then(setData).catch(()=>{}); }, []);
  if (!data) return <div className="text-gray-400 text-center py-20">Loading...</div>;
  const metrics = data.summary || data;
  const entries = Object.entries(metrics);
  return (
    <div><h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart3 size={20}/>Analytics Overview</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{entries.map(([k,v])=><div key={k} className="bg-white border rounded-xl p-4"><div className="text-2xl font-bold text-blue-600">{String(v)}</div><div className="text-xs text-gray-500 mt-1">{k.replace(/([A-Z])/g,' $1').trim()}</div></div>)}</div>
    <div className="bg-white border rounded-xl p-4"><div className="text-sm font-medium mb-2">Leads by Week</div><div className="flex items-end gap-1 h-32">{(data.leadsByWeek||[]).map((w:any,i:number)=>{
      const max = Math.max(...(data.leadsByWeek||[{count:1}]).map((x:any)=>x.count),1);
      return <div key={i} className="flex-1 flex flex-col items-center"><div className="w-full bg-blue-500 rounded-t" style={{height:`${(w.count/max)*100}%`}}></div><span className="text-[10px] text-gray-400 mt-1">{w.week?.slice(5)||''}</span></div>
    })}</div></div></div>
  );
}
