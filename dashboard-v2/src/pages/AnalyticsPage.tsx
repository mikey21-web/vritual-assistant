import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { BarChart3, TrendingUp, Users, DollarSign, RefreshCw, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('30d');

  const refresh = () => { setData(null); api(`/analytics/overview?range=${range}`).then(setData).catch(()=>{}); };
  useEffect(() => { refresh(); }, [range]);

  if (!data) return <div className="text-gray-400 text-center py-20">Loading...</div>;

  const metrics = [
    { label: 'Total Leads', value: data.summary?.totalLeads || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Conversion Rate', value: (data.summary?.conversionRate || 0) + '%', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Revenue', value: '$' + (data.summary?.revenue || 0).toLocaleString(), icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Active Campaigns', value: data.summary?.activeCampaigns || 0, icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const leadByWeek = data.leadsByWeek || [];
  const maxLeads = Math.max(...leadByWeek.map((w:any) => w.count || 0), 1);
  const sourceData = data.leadsBySource || [];
  const sourceMax = Math.max(...sourceData.map((s:any) => s.count || 0), 1);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 size={20}/>Analytics</h2>
        <div className="flex gap-2 items-center">
          <select value={range} onChange={e=>setRange(e.target.value)} className="border rounded-lg px-3 py-1.5 text-xs bg-white">
            <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
          </select>
          <button onClick={refresh} className="p-1.5 border rounded-lg hover:bg-gray-50"><RefreshCw size={14}/></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map(m => <div key={m.label} className={`${m.bg} rounded-xl p-4`}><m.icon size={20} className={m.color}/><div className={`text-2xl font-bold ${m.color} mt-1`}>{m.value}</div><div className="text-xs text-gray-500">{m.label}</div></div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><Calendar size={14}/>Leads by Week</h3>
          <div className="flex items-end gap-1 h-40">
            {leadByWeek.map((w:any,i:number) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
                <div className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-colors" style={{height: `${(w.count/maxLeads)*100}%`, minHeight: w.count > 0 ? '4px' : '0'}} title={`${w.count} leads`}></div>
                <span className="text-[10px] text-gray-400 mt-1 rotate-45 origin-top-left whitespace-nowrap">{w.week?.slice(5) || ''}</span>
              </div>
            ))}
            {leadByWeek.length === 0 && <div className="w-full text-center text-gray-400 text-sm py-10">No data</div>}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-sm font-medium mb-4">Leads by Source</h3>
          <div className="space-y-3">
            {sourceData.map((s:any) => (
              <div key={s.source}><div className="flex justify-between text-xs mb-1"><span>{s.source}</span><span className="text-gray-400">{s.count}</span></div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width: `${(s.count/sourceMax)*100}%`}}></div></div></div>
            ))}
            {sourceData.length === 0 && <div className="text-center text-gray-400 py-6 text-sm">No source data</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
