import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock, Database, Server, RefreshCw } from 'lucide-react';

const iconMap: Record<string,React.ReactNode> = { ok: <CheckCircle size={16} className="text-green-500"/>, degraded: <AlertTriangle size={16} className="text-yellow-500"/>, down: <XCircle size={16} className="text-red-500"/>, error: <XCircle size={16} className="text-red-500"/> };
const bgMap: Record<string,string> = { ok: 'bg-green-50 border-green-200', degraded: 'bg-yellow-50 border-yellow-200', down: 'bg-red-50 border-red-200', error: 'bg-red-50 border-red-200', unknown: 'bg-gray-50 border-gray-200' };

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async () => { setRefreshing(true); try { const r = await api('/health/deep'); setHealth(r); } catch(e) {} finally { setRefreshing(false); } }, []);
  useEffect(() => { fetchHealth(); const t = setInterval(fetchHealth, 30000); return () => clearInterval(t); }, [fetchHealth]);

  if (!health) return <div className="text-gray-400 text-center py-20">Loading health data...</div>;

  const deps = health.dependencies || {};
  const depEntries = Object.entries(deps as Record<string,any>);
  const okCount = depEntries.filter(([_,v])=>v.status==='ok').length;
  const degradedCount = depEntries.filter(([_,v])=>v.status==='degraded').length;
  const downCount = depEntries.filter(([_,v])=>v.status==='down'||v.status==='error').length;

  const overallColor = health.status==='ok'?'text-green-600':health.status==='degraded'?'text-yellow-600':'text-red-600';
  const overallBg = health.status==='ok'?'bg-green-50 border-green-200':health.status==='degraded'?'bg-yellow-50 border-yellow-200':'bg-red-50 border-red-200';

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Activity size={20}/>Health Dashboard</h2>
        <button onClick={fetchHealth} disabled={refreshing} className="flex items-center gap-1 border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"><RefreshCw size={14} className={refreshing?'animate-spin':''}/>Refresh</button>
      </div>

      <div className={`${overallBg} border rounded-xl p-4 mb-6 flex items-center justify-between`}>
        <div><div className="text-xs text-gray-500">Overall Status</div><div className={`text-lg font-bold ${overallColor}`}>{health.status?.toUpperCase()}</div></div>
        <div className="text-xs text-gray-500">Last checked: {new Date(health.timestamp || Date.now()).toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-green-600">{okCount}</div><div className="text-xs text-gray-500">Healthy</div></div>
        <div className="bg-white border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-yellow-600">{degradedCount}</div><div className="text-xs text-gray-500">Degraded</div></div>
        <div className="bg-white border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-red-600">{downCount}</div><div className="text-xs text-gray-500">Down</div></div>
        <div className="bg-white border rounded-xl p-3 text-center"><div className="text-2xl font-bold text-gray-600">{depEntries.length}</div><div className="text-xs text-gray-500">Total</div></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {depEntries.map(([key,val] : [string, any]) => (
          <div key={key} className={`${bgMap[val.status] || bgMap.unknown} border rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm capitalize">{key.replace(/([A-Z])/g,' $1').trim()}</span>
                {iconMap[val.status] || iconMap.unknown}
              </div>
              {val.latencyMs !== undefined && <span className="text-xs text-gray-400">{val.latencyMs}ms</span>}
            </div>
            <div className="text-xs text-gray-500">{val.message || val.status}</div>
            {val.error && <div className="text-xs text-red-500 mt-1 truncate">{val.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
