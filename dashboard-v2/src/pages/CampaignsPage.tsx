import React, { useState, useEffect } from 'react';
import { fetchCampaigns, createCampaign, toggleCampaign, duplicateCampaign } from '../lib/data';
import { Plus, Pause, Play, Copy, X, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CampaignsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', sourceType: 'FORM', offer: '' });

  const refresh = () => fetchCampaigns().then((r: any) => setItems(r.data || r)).catch(e => toast.error(e.message));
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCampaign(form);
      setShow(false);
      setForm({ name: '', sourceType: 'FORM', offer: '' });
      refresh();
      toast.success('Campaign created');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Campaigns</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{items.length} campaigns</p>
        </div>
        <button
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {show && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Campaign name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            />
            <select
              value={form.sourceType}
              onChange={e => setForm({ ...form, sourceType: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            >
              {['CAMPAIGN', 'FORM', 'QR_CODE', 'WHATSAPP', 'SOCIAL_MEDIA'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              placeholder="Offer"
              value={form.offer}
              onChange={e => setForm({ ...form, offer: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="h-8 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">Save</button>
            <button type="button" onClick={() => setShow(false)} className="h-8 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Leads</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)]">No campaigns yet</td></tr>
              ) : (
                items.map((c: any) => (
                  <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Megaphone size={14} className="text-[var(--muted-foreground)]" />
                        <span className="font-medium text-[var(--foreground)]">{c.name}</span>
                      </div>
                      {c.offer && <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{c.offer}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{c.sourceType}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {c.active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{c._count?.leads || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleCampaign(c.id, c.active).then(refresh)}
                          className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          title={c.active ? 'Pause' : 'Activate'}
                        >
                          {c.active ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          onClick={() => duplicateCampaign(c.id).then(refresh)}
                          className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
