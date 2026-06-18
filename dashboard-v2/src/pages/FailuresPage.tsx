import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { RefreshCw, CheckCircle, XCircle, Filter, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const statusStyles: Record<string,string> = { OPEN: 'bg-red-50 border-red-200', RETRYING: 'bg-yellow-50 border-yellow-200', RESOLVED: 'bg-green-50 border-green-200' };
const statusIcons: Record<string,React.ReactNode> = { OPEN: <AlertTriangle size={16} className="text-red-500"/>, RETRYING: <Clock size={16} className="text-yellow-500"/>, RESOLVED: <CheckCircle size={16} className="text-green-500"/> };

export default function FailuresPage() {
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState<Record<string,boolean>>({});

  const refresh = () => api('/failures').then((r:any) => setData(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const retry = async (id: string) => { setLoading(l=>({...l,[id]:true})); try { await api(`/failures/${id}/retry`, { method:'POST' }); refresh(); toast.success('Retrying...'); } catch(e:any) { toast.error(e.message); } finally { setLoading(l=>({...l,[id]:false})); } };
  const resolve = async (id: string) => { try { await api(`/failures/${id}/resolve`, { method:'POST' }); refresh(); toast.success('Resolved'); } catch(e:any) { toast.error(e.message); } };

  const filtered = filter==='all' ? data : data.filter(f=>f.status===filter);
  const openCount = data.filter(f=>f.status==='OPEN').length;
  const retryingCount = data.filter(f=>f.status==='RETRYING').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle size={20}/>Failure Inbox</h2>
        <button onClick={refresh} className="flex items-center gap-1 border px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"><RefreshCw size={14}/>Refresh</button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <button onClick={()=>setFilter('all')} className={`rounded-xl p-3 border text-left ${filter==='all'?'ring-2 ring-blue-400':''}`}><div className="text-2xl font-bold">{data.length}</div><div className="text-xs text-gray-500">Total</div></button>
        <button onClick={()=>setFilter('OPEN')} className={`rounded-xl p-3 border text-left bg-red-50 ${filter==='OPEN'?'ring-2 ring-red-400':''}`}><div className="text-2xl font-bold text-red-600">{openCount}</div><div className="text-xs text-gray-500">Open</div></button>
        <button onClick={()=>setFilter('RETRYING')} className={`rounded-xl p-3 border text-left bg-yellow-50 ${filter==='RETRYING'?'ring-2 ring-yellow-400':''}`}><div className="text-2xl font-bold text-yellow-600">{retryingCount}</div><div className="text-xs text-gray-500">Retrying</div></button>
        <button onClick={()=>setFilter('RESOLVED')} className={`rounded-xl p-3 border text-left bg-green-50 ${filter==='RESOLVED'?'ring-2 ring-green-400':''}`}><div className="text-2xl font-bold text-green-600">{data.filter(f=>f.status==='RESOLVED').length}</div><div className="text-xs text-gray-500">Resolved</div></button>
      </div>

      <div className="space-y-3">
        {filtered.map((f:any) => (
          <div key={f.id} className={`${statusStyles[f.status] || 'bg-white'} border rounded-xl p-4 ${f.status==='OPEN'?'border-l-4 border-l-red-500':f.status==='RETRYING'?'border-l-4 border-l-yellow-500':''}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-start gap-3">
                {statusIcons[f.status]}
                <div><div className="font-medium text-sm">{f.type || f.eventType || 'Unknown Failure'} <span className="text-xs text-gray-400 ml-2">{f.status}</span></div>
                <div className="text-xs text-red-600 mt-1 max-w-lg break-all">{f.error || f.message}</div></div>
              </div>
              <div className="flex gap-2">
                {(f.status==='OPEN'||f.status==='RETRYING') && <button onClick={()=>retry(f.id)} disabled={loading[f.id]} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border hover:bg-white transition-colors ${loading[f.id]?'opacity-50':''}`}><RefreshCw size={12} className={loading[f.id]?'animate-spin':''}/>Retry</button>}
                {f.status!=='RESOLVED' && <button onClick={()=>resolve(f.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-green-700 border border-green-200 hover:bg-green-100 transition-colors"><CheckCircle size={12}/>Resolve</button>}
              </div>
            </div>
            <div className="flex gap-4 text-xs text-gray-400 mt-2">
              <span>{new Date(f.createdAt).toLocaleString()}</span>
              <span>{f.retryCount || 0} retries</span>
              {f.nextRetryAt && <span>Next: {new Date(f.nextRetryAt).toLocaleString()}</span>}
              {f.entityId && <span className="font-mono">ID: {f.entityId.slice(0,12)}</span>}
            </div>
          </div>
        ))}
        {filtered.length===0 && <div className="text-center text-gray-400 py-12 bg-white border rounded-xl">No failures {filter!=='all'?`with status "${filter}"`:''}</div>}
      </div>
    </div>
  );
}
