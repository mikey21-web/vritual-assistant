import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle, Save } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useBranding } from '../lib/useBranding';

export default function WorkspacePage() {
  const [branding, setBranding] = useState<any>(null);
  const [form, setForm] = useState({ businessName: '', logoUrl: '', primaryColor: '#0B5', labels: '{}' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/branding').then(setBranding).catch(() => setBranding(null));
  }, []);

  useEffect(() => {
    if (branding) {
      setForm({
        businessName: branding.businessName || '',
        logoUrl: branding.logoUrl || '',
        primaryColor: branding.primaryColor || '#0B5',
        labels: JSON.stringify(branding.labels || {}, null, 2),
      });
    }
  }, [branding]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let labels: any = {};
      try { labels = JSON.parse(form.labels); } catch { labels = {}; }
      await api('/business-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          businessName: form.businessName,
          logoUrl: form.logoUrl || null,
          primaryColor: form.primaryColor,
          labels,
        }),
      });
      toast.success('Branding saved');
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    setSaving(false);
  };

  if (!branding) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-6 w-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Workspace</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Branding & workspace settings</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Branding</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Business Name</label>
            <input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Logo URL</label>
            <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://example.com/logo.png" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
            {form.logoUrl && <img src={form.logoUrl} alt="Preview" className="h-10 mt-2 rounded" />}
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="h-9 w-9 rounded cursor-pointer border border-[var(--border)]" />
              <input value={form.primaryColor} onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))} className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Labels (JSON)</label>
            <textarea value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} rows={4} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
            <Save size={15} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
            <CheckCircle size={20} className="text-[var(--primary-foreground)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Current branding preview</h3>
            <p className="text-xs text-[var(--muted-foreground)]">This is how your brand appears</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-[var(--muted)] p-4">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="h-8 rounded" />
          ) : (
            <div className="h-8 w-8 rounded bg-[var(--primary)] flex items-center justify-center text-xs font-bold text-[var(--primary-foreground)]">
              {(branding.businessName || 'LA').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">{branding.businessName || 'Unnamed'}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Primary: {branding.primaryColor}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
