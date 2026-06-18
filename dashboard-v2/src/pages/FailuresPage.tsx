import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FailuresPage() {
  const [data, setData] = useState<any[]>([]);
  const refresh = () => api('/failures').then((r:any) => setData(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);
  const retry = async (id: string) => { try { await api(`/failures/${id}/retry`, { method:'POST' }); refresh(); toast.success('Retrying...'); } catch(e:any) { toast.error(e.message); } };
  const resolve = async (id: string) => { try { await api(`/failures/${id}/resolve`, { method:'POST' }); refresh(); toast.success('Resolved'); } catch(e:any) { toast.error(e.message); } };
  return (
    <div><h2 className="text-lg font-semibold mb-4">Failure Inbox</h2>
    <div className="space-y-3">{data.map((f:any)=><div key={f.id} className={`bg-white border rounded-xl p-4 ${f.status==='OPEN'?'border-l-4 border-l-red-500':''}`}>
      <div className="flex justify-between items-start mb-2"><div><div className="font-medium text-sm">{f.type || 'Failure'} · <span className="text-xs text-gray-400">{f.eventType}</span></div><div className="text-xs text-red-500 mt-1">{f.error}</div></div>
        <div className="flex gap-2"><button onClick={()=>retry(f.id)} className="flex items-center gap-1 border px-2 py-1 rounded text-xs hover:bg-gray-50"><RefreshCw size={12}/>Retry</button><button onClick={()=>resolve(f.id)} className="flex items-center gap-1 border px-2 py-1 rounded text-xs hover:bg-gray-50 text-green-600"><CheckCircle size={12}/>Resolve</button></div></div>
      <div className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleString()} · {f.retryCount || 0} retries</div>
    </div>)}</div></div>
  );
}
