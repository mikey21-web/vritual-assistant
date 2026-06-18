'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

export default function FailuresPage() {
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  const refresh = () => {
    const endpoint = filter === 'all' ? '/failures' : `/failures/open`;
    api(endpoint).then((r) => setData(Array.isArray(r) ? r : r.data || [])).catch(e => toast.error(e.message));
  };

  useEffect(() => { refresh(); }, [filter]);

  const handleRetry = async (id: string) => {
    try { await api(`/failures/${id}/retry`, { method: 'POST' }); refresh(); toast.success('Retrying...'); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleResolve = async (id: string) => {
    try { await api(`/failures/${id}/resolve`, { method: 'POST' }); refresh(); toast.success('Resolved'); }
    catch (e: any) { toast.error(e.message); }
  };

  const statusBadge = (status: string) => {
    const cls = status === 'open' ? 'bg-red-100 text-red-700' : status === 'retrying' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
    return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{status}</span>;
  };

  const severityBadge = (severity: string) => {
    const cls = severity === 'critical' ? 'bg-red-100 text-red-800' : severity === 'high' ? 'bg-orange-100 text-orange-700' : severity === 'low' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700';
    return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{severity || 'medium'}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-500" />
          <span className="font-semibold text-lg">Failure Inbox</span>
          <span className="text-xs text-gray-400 ml-1">({data.length})</span>
        </div>
        <div className="flex gap-1">
          {['all', 'open', 'retrying', 'resolved'].map(f => (
            <button key={f} onClick={() => setFilter(f !== 'all' ? f : 'all')} className={`px-3 py-1.5 rounded text-xs border ${filter === f || (f === 'all' && filter === 'all') ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Message</th>
              <th className="px-4 py-3 font-medium">Lead ID</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Operation</th>
              <th className="px-4 py-3 font-medium">Attempts</th>
              <th className="px-4 py-3 font-medium">Created At</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((f: any) => (
              <tr key={f.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-xs">{f.type}</td>
                <td className="px-4 py-3">{statusBadge(f.status)}</td>
                <td className="px-4 py-3">{severityBadge(f.severity)}</td>
                <td className="px-4 py-3 text-xs max-w-[200px] truncate" title={f.message}>{f.message}</td>
                <td className="px-4 py-3 text-xs font-mono">{f.leadId?.slice(0,8) || '-'}</td>
                <td className="px-4 py-3 text-xs">{f.provider || '-'}</td>
                <td className="px-4 py-3 text-xs">{f.operation || '-'}</td>
                <td className="px-4 py-3 text-xs">{f.attempts}/{f.maxAttempts}</td>
                <td className="px-4 py-3 text-xs">{new Date(f.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {f.status !== 'resolved' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleRetry(f.id)} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs"><RefreshCw size={12} /> Retry</button>
                      <button onClick={() => handleResolve(f.id)} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-xs"><CheckCircle size={12} /> Resolve</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <div className="p-8 text-center text-gray-400">No failures found</div>}
      </div>
    </div>
  );
}
