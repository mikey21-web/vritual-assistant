import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useFeatureFlag } from '../lib/useFeatureFlag';
import PageHeader from '../components/PageHeader';
import { toast } from 'sonner';

export default function AdminPanel() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const showAdmin = useFeatureFlag('admin-panel');

  useEffect(() => {
    api('/tenants').then(setTenants).catch(() => {});
    api('/health/deep').then(setHealthStatus).catch(() => {});
  }, []);

  if (!showAdmin) {
    return <div className="p-8 text-center text-[var(--muted-foreground)]">Admin panel is disabled.</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Admin Panel" description="System administration and monitoring" />

      <div className="flex gap-2 border-b mb-4">
        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</Tab>
        <Tab active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')}>Tenants</Tab>
        <Tab active={activeTab === 'health'} onClick={() => setActiveTab('health')}>Health</Tab>
        <Tab active={activeTab === 'features'} onClick={() => setActiveTab('features')}>Feature Flags</Tab>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Tenants" value={tenants.length} />
          <StatCard title="System Health" value={healthStatus?.status || 'unknown'} />
          <StatCard title="Uptime" value={`${Math.floor(healthStatus?.uptime || 0)}s`} />
        </div>
      )}

      {activeTab === 'tenants' && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Plan</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-[var(--muted)]/30">
                  <td className="p-3">{t.name}</td>
                  <td className="p-3 font-mono text-xs">{t.slug}</td>
                  <td className="p-3">{t.plan}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded ${t.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                      {t.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'health' && healthStatus && (
        <div className="space-y-2">
          {Object.entries(healthStatus.dependencies || {}).map(([name, dep]: [string, any]) => (
            <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium capitalize">{name}</span>
              <span className={`px-2 py-1 text-xs rounded ${
                dep.status === 'ok' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                dep.status === 'unconfigured' ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>{dep.status}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'features' && <FeatureFlagsPanel />}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: any }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
    >
      {children}
    </button>
  );
}

function StatCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-sm text-[var(--muted-foreground)]">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<any[]>([]);

  useEffect(() => {
    api('/feature-flags').then(setFlags).catch(() => {});
  }, []);

  async function toggle(key: string, enabled: boolean) {
    try {
      await api(enabled ? `/feature-flags/${key}/disable` : `/feature-flags/${key}/enable`, { method: 'POST' });
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !enabled } : f));
      toast.success(`${key} ${enabled ? 'disabled' : 'enabled'}`);
    } catch {}
  }

  return (
    <div className="space-y-2">
      {flags.map(f => (
        <div key={f.key} className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <div className="font-medium">{f.key}</div>
            {f.description && <div className="text-xs text-[var(--muted-foreground)]">{f.description}</div>}
          </div>
          <button
            onClick={() => toggle(f.key, f.enabled)}
            className={`w-12 h-6 rounded-full transition-colors ${f.enabled ? 'bg-[var(--primary)]' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${f.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      ))}
    </div>
  );
}
