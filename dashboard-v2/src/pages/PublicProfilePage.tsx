import React, { useState, useEffect } from 'react';
import { fetchMyPublicProfile, updateMyPublicProfile } from '../lib/data';
import toast from 'react-hot-toast';

export default function PublicProfilePage() {
  const [form, setForm] = useState<any>({ companyName: '', slug: '', tagline: '', city: '', address: '', servicesOffered: [], published: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPublicProfile().then((p: any) => { if (p) setForm({ ...form, ...p }); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    try { await updateMyPublicProfile(form); toast.success('Saved'); } catch (err: any) { toast.error(err.message); }
  };

  const publish = async () => {
    try { await updateMyPublicProfile({ ...form, published: true }); setForm({ ...form, published: true }); toast.success('Published'); } catch (err: any) { toast.error(err.message); }
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/org/${form.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  if (loading) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading…</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Public profile</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">The core details shown on your public profile.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Save changes</button>
          <button onClick={publish} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Publish</button>
          <button onClick={copyLink} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Copy public link</button>
          <a href={form.slug ? `#/org/${form.slug}` : undefined} target="_blank" rel="noreferrer" className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] inline-flex items-center">Preview</a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Company name *</label>
              <input value={form.companyName || ''} onChange={e => setForm({ ...form, companyName: e.target.value })}
                className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Public URL slug *</label>
              <input value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">yoursite.com/org/{form.slug || 'your-slug'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Tagline</label>
              <input value={form.tagline || ''} onChange={e => setForm({ ...form, tagline: e.target.value })}
                className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)]">City</label>
              <input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })}
                className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">About</label>
            <textarea value={form.about || ''} onChange={e => setForm({ ...form, about: e.target.value })} rows={4}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]" />
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--foreground)]">{form.published ? 'Published' : 'Draft'}</span>
          <div className="h-32 rounded-lg bg-[var(--muted)] mt-3 flex items-center justify-center text-xs text-[var(--muted-foreground)]">Cover preview</div>
          <h3 className="font-semibold text-[var(--foreground)] mt-3">{form.companyName || 'Your company name'}</h3>
          <div className="flex gap-4 mt-2 text-center text-xs text-[var(--muted-foreground)]">
            <div><div className="font-semibold text-[var(--foreground)]">{form.yearsExperience || '—'}</div>Years</div>
            <div><div className="font-semibold text-[var(--foreground)]">{form.eventsExecuted || '—'}</div>Events</div>
            <div><div className="font-semibold text-[var(--foreground)]">{(form.servicesOffered || []).length}</div>Services</div>
          </div>
        </div>
      </div>
    </div>
  );
}
