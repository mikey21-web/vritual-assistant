import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, X, Shuffle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RoutingPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', conditions: '{}', action: '{}' });

  const refresh = () => api('/routing-rules').then((r: any) => setData(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/routing-rules', {
        method: 'POST',
        body: JSON.stringify({ ...form, conditions: JSON.parse(form.conditions), action: JSON.parse(form.action) }),
      });
      setShowCreate(false);
      setForm({ name: '', conditions: '{}', action: '{}' });
      refresh();
      toast.success('Rule created');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Routing Rules</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{data.length} rules</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> Add Rule
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in">
          <div className="grid grid-cols-1 gap-3">
            <input
              placeholder="Rule name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            />
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Conditions (JSON)</label>
              <textarea
                value={form.conditions}
                onChange={e => setForm({ ...form, conditions: e.target.value })}
                className="w-full h-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Action (JSON)</label>
              <textarea
                value={form.action}
                onChange={e => setForm({ ...form, action: e.target.value })}
                className="w-full h-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 font-mono"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="h-8 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Save</button>
            <button type="button" onClick={() => setShowCreate(false)} className="h-8 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {data.length === 0 && (
          <div className="text-center py-12 text-[var(--muted-foreground)]">No routing rules yet</div>
        )}
        {data.map((r: any) => (
          <div key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mt-0.5">
                <Shuffle size={16} className="text-[var(--primary)]" />
              </div>
              <div>
                <div className="font-medium text-sm text-[var(--foreground)]">{r.name}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                    r.active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {r.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="font-mono">{JSON.stringify(r.conditions).slice(0, 80)}{JSON.stringify(r.conditions).length > 80 ? '...' : ''}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { api(`/routing-rules/${r.id}`, { method: 'DELETE' }).then(refresh); toast.success('Deleted'); }}
              className="p-1.5 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
