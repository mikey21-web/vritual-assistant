import React, { useState, useEffect } from 'react';
import { fetchIntegrations, createIntegration, deleteIntegration, testIntegration } from '../lib/data';
import { Plus, Trash2, TestTube, X, Link } from 'lucide-react';
import toast from 'react-hot-toast';

const types = ['n8n', 'WHATSAPP_CLOUD_API', 'TWILIO', 'HUBSPOT', 'SALESFORCE', 'ZOHO', 'GOOGLE_CALENDAR', 'CALENDLY', 'STRIPE', 'SMTP'];

const typeIcons: Record<string, string> = { n8n: '⚡', WHATSAPP_CLOUD_API: '💬', TWILIO: '📞', HUBSPOT: '🔵', SALESFORCE: '☁️', ZOHO: '🟢', GOOGLE_CALENDAR: '📅', CALENDLY: '📆', STRIPE: '💳', SMTP: '📧' };

export default function IntegrationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: '', name: '', config: '{}' });

  const refresh = () => fetchIntegrations().then((r: any) => setData(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createIntegration({ ...form, config: JSON.parse(form.config) });
      setShowCreate(false);
      setForm({ type: '', name: '', config: '{}' });
      refresh();
      toast.success('Integration created');
    } catch (e: any) { toast.error(e.message); }
  };

  const test = async (id: string) => {
    try { const r = await testIntegration(id); toast.success(r.status + ': ' + r.message); refresh(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Integrations</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{data.length} connections</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> Add Integration
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            >
              <option value="">Select type</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              placeholder="Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            />
            <textarea
              placeholder='Config JSON'
              value={form.config}
              onChange={e => setForm({ ...form, config: e.target.value })}
              className="col-span-2 h-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="h-8 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Save</button>
            <button type="button" onClick={() => setShowCreate(false)} className="h-8 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.length === 0 && (
          <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">No integrations yet</div>
        )}
        {data.map((i: any) => (
          <div key={i.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-[var(--muted)] flex items-center justify-center text-lg">
                  {typeIcons[i.type] || '🔌'}
                </div>
                <div>
                  <div className="font-medium text-sm text-[var(--foreground)]">{i.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{i.type}</div>
                </div>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                i.status === 'connected'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : i.status === 'error'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {i.status}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => test(i.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
              >
                <TestTube size={12} /> Test
              </button>
              <button
                onClick={() => { deleteIntegration(i.id); refresh(); toast.success('Deleted'); }}
                className="p-1.5 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
