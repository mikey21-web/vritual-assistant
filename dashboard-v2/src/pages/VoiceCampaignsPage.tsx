import React, { useState, useEffect } from 'react';
import { fetchLeads, fetchVoiceCampaigns, createVoiceCampaign, pauseVoiceCampaign, resumeVoiceCampaign, VoiceCampaign } from '../lib/data';
import type { Lead } from '../lib/types';
import { Megaphone, Plus, Pause, Play, RefreshCw, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
];

export default function VoiceCampaignsPage() {
  const [campaigns, setCampaigns] = useState<VoiceCampaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    Promise.all([fetchVoiceCampaigns(), fetchLeads(1, { hasPhone: 'true' })])
      .then(([c, l]) => {
        setCampaigns(c.campaigns || []);
        setLeads(l.data || []);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleLead = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Name the campaign'); return; }
    if (selected.size === 0) { toast.error('Select at least one lead'); return; }
    setCreating(true);
    try {
      const res = await createVoiceCampaign(name.trim(), Array.from(selected), lang);
      toast.success(`Campaign launched — calling ${res.leadCount} leads`);
      setName('');
      setSelected(new Set());
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handlePauseResume = async (c: VoiceCampaign) => {
    setBusyId(c.id);
    try {
      if (c.state === 'paused') {
        await resumeVoiceCampaign(c.id);
        toast.success('Campaign resumed');
      } else {
        await pauseVoiceCampaign(c.id);
        toast.success('Campaign paused');
      }
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-48 rounded-lg bg-[var(--card)] animate-pulse" />
      <div className="h-64 rounded-lg bg-[var(--card)] border border-[var(--border)] animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Megaphone size={13} className="text-[var(--primary)]" />
          <span className="text-[11px] font-medium text-[var(--primary)] uppercase tracking-wider">Outreach</span>
        </div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Voice Campaigns</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Call many leads at once with the AI voice agent</p>
      </div>

      <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)] space-y-4">
        <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
          <Plus size={15} className="text-[var(--primary)]" />
          New Campaign
        </h3>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name, e.g. Weekend Site Visit Push"
            className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)]"
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Select leads to call ({selected.size} selected)</p>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            {leads.length === 0 && (
              <div className="p-4 text-xs text-[var(--muted-foreground)] text-center">No leads with a phone number found</div>
            )}
            {leads.map((lead) => (
              <label key={lead.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--accent)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(lead.id)}
                  onChange={() => toggleLead(lead.id)}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/30"
                />
                <span className="text-[var(--foreground)] flex-1">{lead.contact?.name || 'Unnamed'}</span>
                <span className="text-[var(--muted-foreground)] text-xs">{lead.contact?.phone}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
        >
          {creating ? <RefreshCw size={14} className="animate-spin" /> : <Phone size={14} />}
          {creating ? 'Launching...' : 'Launch Campaign'}
        </button>
      </div>

      <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
        <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4">Campaigns</h3>
        {campaigns.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">No campaigns yet</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{c.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {c.processed_rows}/{c.total_rows} called
                    {c.failed_rows > 0 && ` · ${c.failed_rows} failed`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.state === 'running' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                    c.state === 'paused' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                    'bg-gray-100 dark:bg-gray-800 text-[var(--muted-foreground)]'
                  }`}>
                    {c.state}
                  </span>
                  {(c.state === 'running' || c.state === 'paused') && (
                    <button
                      onClick={() => handlePauseResume(c)}
                      disabled={busyId === c.id}
                      className="h-7 px-2 rounded-md border border-[var(--border)] text-xs text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors flex items-center gap-1"
                    >
                      {c.state === 'paused' ? <Play size={11} /> : <Pause size={11} />}
                      {c.state === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
