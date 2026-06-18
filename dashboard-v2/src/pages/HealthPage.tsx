import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Activity, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => { api('/health/deep').then(setHealth).catch(()=>{}); }, []);
  if (!health) return <div className="text-gray-400 text-center py-20">Loading...</div>;
  const statusIcon = (s: string) => s==='ok' ? <CheckCircle size={16} className="text-green-500"/> : s==='degraded' ? <AlertTriangle size={16} className="text-yellow-500"/> : <XCircle size={16} className="text-red-500"/>;
  const deps = health.dependencies || {};
  return (
    <div><h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Activity size={20}/>Health Dashboard</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Object.entries(deps as Record<string,any>).map(([k,v]:[string,any])=><div key={k} className="bg-white border rounded-xl p-4 flex items-center justify-between">
      <div><div className="text-sm font-medium">{k}</div><div className="text-xs text-gray-400">{v.message||v.status}</div></div>
      {v.latencyMs && <span className="text-xs text-gray-400">{v.latencyMs}ms</span>}
      {statusIcon(v.status)}
    </div>)}</div>
    <div className="mt-4 bg-white border rounded-xl p-4"><span className="text-sm font-medium">Overall: </span><span className={`font-bold ${health.status==='ok'?'text-green-600':health.status==='degraded'?'text-yellow-600':'text-red-600'}`}>{health.status?.toUpperCase()}</span></div></div>
  );
}
