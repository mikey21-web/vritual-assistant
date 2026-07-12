import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { fetchCampaigns, createCampaign, toggleCampaign, duplicateCampaign } from '../lib/data';
import { consumePendingFilter, PENDING_FILTER_APPLIED_EVENT } from '../lib/pendingSearch';
import { Plus, Pause, Play, Copy, X, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CampaignsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', sourceType: 'FORM', offer: '' });
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const filtered = items.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q)
      || (c.sourceType || '').toLowerCase().includes(q)
      || (c.offer || '').toLowerCase().includes(q);
  });

  const refresh = () => fetchCampaigns().then((r: any) => setItems(r.data || r)).catch(e => toast.error(e.message));
  useEffect(() => { refresh(); }, []);

  const applyPendingFilter = () => {
    const pending = consumePendingFilter('campaigns');
    if (!pending) return;
    setSearch(pending.filters?.search || '');
    setHighlightId(pending.highlightId || null);
  };

  useEffect(() => {
    applyPendingFilter();
    const onApplied = (e: Event) => {
      if ((e as CustomEvent<string>).detail === 'campaigns') applyPendingFilter();
    };
    window.addEventListener(PENDING_FILTER_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(PENDING_FILTER_APPLIED_EVENT, onApplied);
  }, []);

  useEffect(() => {
    if (!highlightId || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightId, items]);

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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Campaigns</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{filtered.length} campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-48 rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
          <button
            onClick={() => setShow(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={16} /> Create
          </button>
        </div>
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

      {filtered.length === 0 && !search ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-12 text-center text-[var(--muted-foreground)]">
          No campaigns yet
        </div>
      ) : filtered.length === 0 && search ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-12 text-center text-[var(--muted-foreground)]">
          No campaigns match your search
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
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
                  {filtered.map((c: any) => (
                    <motion.tr
                      key={c.id}
                      ref={highlightId === c.id ? highlightRef : undefined}
                      animate={highlightId === c.id ? { backgroundColor: ['rgba(99,102,241,0.25)', 'rgba(99,102,241,0)', 'rgba(99,102,241,0.25)', 'rgba(99,102,241,0)'] } : undefined}
                      transition={highlightId === c.id ? { duration: 2.4, times: [0, 0.33, 0.66, 1] } : undefined}
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
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
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="block sm:hidden space-y-3">
            {filtered.map((c: any) => (
              <div key={c.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Megaphone size={14} className="text-[var(--muted-foreground)] shrink-0" />
                      <span className="font-medium text-[var(--foreground)]">{c.name}</span>
                    </div>
                    {c.offer && <div className="text-xs text-[var(--muted-foreground)] ml-6 mt-0.5">{c.offer}</div>}
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${
                    c.active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {c.active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">{c.sourceType}</span>
                  <span className="font-semibold text-[var(--foreground)]">{c._count?.leads || 0} leads</span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                  <button
                    onClick={() => toggleCampaign(c.id, c.active).then(refresh)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                  >
                    {c.active ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Activate</>}
                  </button>
                  <button
                    onClick={() => duplicateCampaign(c.id).then(refresh)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                  >
                    <Copy size={14} /> Duplicate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
