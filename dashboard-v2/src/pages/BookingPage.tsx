import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BookingPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', provider: 'CALENDLY', config: '{"calendarLink":"https://calendly.com/you/30min"}' });

  const refresh = () => api('/booking-settings').then((r: any) => setData(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/booking-settings', { method: 'POST', body: JSON.stringify({ ...form, config: JSON.parse(form.config) }) });
      setShowCreate(false);
      setForm({ name: '', provider: 'CALENDLY', config: '{}' });
      refresh();
      toast.success('Booking setting created');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Booking Settings</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{data.length} configurations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> Add Booking
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            />
            <select
              value={form.provider}
              onChange={e => setForm({ ...form, provider: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            >
              {['CALENDLY', 'GOOGLE_CALENDAR'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <textarea
              placeholder='Config JSON'
              value={form.config}
              onChange={e => setForm({ ...form, config: e.target.value })}
              className="col-span-2 h-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 font-mono"
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
          <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">No booking settings</div>
        )}
        {data.map((b: any) => (
          <div key={b.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <Calendar size={16} className="text-[var(--primary)]" />
                </div>
                <div>
                  <div className="font-medium text-sm text-[var(--foreground)]">{b.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{b.provider}</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mb-3">
              {b.config && Object.keys(b.config).join(', ') || 'No config'}
            </div>
            <button
              onClick={() => { api(`/booking-settings/${b.id}`, { method: 'DELETE' }).then(refresh); toast.success('Deleted'); }}
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
