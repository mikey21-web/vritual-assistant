'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Activity, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';

export default function HealthPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api('/health/deep');
      setReport(r);
    } catch (e: any) {
      setError(e.message || 'Access denied — admin only');
    }
    setLoading(false);
  };

  useEffect(() => { fetchHealth(); }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const statusColor = (status: string) => {
    if (status === 'ok') return 'bg-green-100 text-green-700';
    if (status === 'error') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  if (loading) return <div className="text-gray-400 p-8 text-center">Loading...</div>;
  if (error) return <div className="text-red-500 p-8 text-center">{error}</div>;
  if (!report) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-blue-600" />
          <h2 className="font-semibold text-lg">Health Dashboard</h2>
        </div>
        <button onClick={fetchHealth} className="flex items-center gap-1 border px-3 py-2 rounded text-sm hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6 p-4 bg-white border rounded-lg shadow-sm">
        <span className={`px-4 py-2 rounded-lg text-sm font-bold ${report.status === 'ok' ? 'bg-green-100 text-green-700' : report.status === 'degraded' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
          {report.status.toUpperCase()}
        </span>
        <div className="text-xs text-gray-500">
          <div>Uptime: {formatUptime(report.uptime || 0)}</div>
          <div>Version: {report.version || '1.0.0'}</div>
          <div>Checked: {new Date(report.timestamp).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {report.dependencies && Object.entries(report.dependencies).map(([name, dep]: [string, any]) => (
          <div key={name} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm capitalize">{name}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${statusColor(dep.status)}`}>{dep.status}</span>
            </div>
            {dep.latencyMs != null && <div className="text-xs text-gray-500">{dep.latencyMs}ms latency</div>}
            {dep.detail && <div className="text-xs text-gray-400 mt-1">{dep.detail}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
