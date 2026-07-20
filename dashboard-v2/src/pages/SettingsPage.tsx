import React, { useState, useEffect, useCallback } from 'react';
import { fetchBusinessSettings, updateBusinessSettings, fetchTeamInvites, revokeTeamInvite, resendTeamInvite } from '../lib/data';
import { api } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import { Save, HardDrive, Search, UserPlus, Trash2, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import InviteTeamMemberModal from '../components/InviteTeamMemberModal';

const fields = [
  { key: 'businessName', label: 'Business Name', type: 'text' },
  { key: 'timezone', label: 'Timezone', type: 'text' },
  { key: 'defaultCurrency', label: 'Default Currency', type: 'text' },
  { key: 'defaultWhatsAppNumber', label: 'WhatsApp Number', type: 'text' },
  { key: 'defaultEmail', label: 'Default Email', type: 'email' },
  { key: 'defaultCrm', label: 'Default CRM', type: 'text' },
  { key: 'defaultBookingTool', label: 'Booking Tool', type: 'text' },
  { key: 'workingHoursStart', label: 'Working Hours Start', type: 'time' },
  { key: 'workingHoursEnd', label: 'Working Hours End', type: 'time' },
  { key: 'notificationEmail', label: 'Notification Email', type: 'email' },
  { key: 'notificationPhone', label: 'Notification Phone (for alerts)', type: 'text' },
];

const TABS = ['Profile', 'Workspace', 'Public profile', 'Members & access', 'Automation', 'Billing', 'Support'] as const;
type Tab = (typeof TABS)[number];

const roleLabel = (r: string) => r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Members & access');
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage your profile, workspace, and team.</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? 'border-[var(--primary)] text-[var(--foreground)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && <ProfileTab />}
      {tab === 'Workspace' && <WorkspaceTab />}
      {tab === 'Public profile' && <PublicProfileTab />}
      {tab === 'Members & access' && <MembersAccessTab />}
      {tab === 'Automation' && <AutomationTab />}
      {tab === 'Billing' && <BillingTab />}
      {tab === 'Support' && <SupportTab />}
    </div>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  return (
    <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Your profile</h2>
      <div className="space-y-3">
        <div>
          <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Name</div>
          <div className="text-sm text-[var(--foreground)]">{user?.name || '—'}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Email</div>
          <div className="text-sm text-[var(--foreground)]">{user?.email || '—'}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Role</div>
          <div className="text-sm text-[var(--foreground)]">{user?.role ? roleLabel(user.role) : '—'}</div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceTab() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [retentionSaved, setRetentionSaved] = useState(false);

  useEffect(() => {
    fetchBusinessSettings().then(s => { setSettings(s); setForm(s); }).catch(() => {});
    api('/call-tracking/recording-retention').then((r: any) => setRetentionDays(r.days)).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await updateBusinessSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Settings saved');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRetentionSave = async () => {
    try {
      await api('/call-tracking/recording-retention', { method: 'PUT', body: JSON.stringify({ days: retentionDays }) });
      setRetentionSaved(true);
      setTimeout(() => setRetentionSaved(false), 2000);
      toast.success('Retention saved');
    } catch (e: any) { toast.error(e.message); }
  };

  if (!settings) return (
    <div className="max-w-xl space-y-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Business Settings</h2>
          <button onClick={handleSave} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
            <Save size={16} /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
        <div className="grid gap-5">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key] || ''}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-[var(--muted-foreground)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Recording Storage</h2>
          </div>
          <button onClick={handleRetentionSave} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
            <Save size={16} /> {retentionSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Auto-delete recordings after (days)</label>
          <input
            type="number" min={1} placeholder="Leave empty to keep forever"
            value={retentionDays ?? ''}
            onChange={e => setRetentionDays(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {retentionDays ? `Recordings older than ${retentionDays} days will be deleted automatically at midnight` : 'Recordings are kept forever. Set a value to enable auto-cleanup.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function PublicProfileTab() {
  return (
    <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-3">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Public profile</h2>
      <p className="text-sm text-[var(--muted-foreground)]">
        Your public microsite (shown to buyers/leads) is managed on its own page.
      </p>
      <a href="#/public-profile" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline">
        Open public profile settings <ExternalLink size={13} />
      </a>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-2">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Billing</h2>
      <p className="text-sm text-[var(--muted-foreground)]">Billing management isn't set up yet for this workspace.</p>
    </div>
  );
}

function SupportTab() {
  return (
    <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-2">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Support</h2>
      <p className="text-sm text-[var(--muted-foreground)]">Need help? Reach out to your workspace administrator.</p>
    </div>
  );
}

function MembersAccessTab() {
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [users, pendingInvites] = await Promise.all([
        api('/users').then((r: any) => Array.isArray(r) ? r : r.data || []).catch(() => []),
        fetchTeamInvites().catch(() => []),
      ]);
      setMembers(users);
      setInvites(pendingInvites);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const revoke = async (id: string) => {
    if (!confirm('Revoke this invite?')) return;
    try {
      await revokeTeamInvite(id);
      toast.success('Invite revoked');
      refresh();
    } catch (e: any) { toast.error(e.message || 'Failed to revoke'); }
  };

  const resend = async (id: string) => {
    try {
      await resendTeamInvite(id);
      toast.success('Invite resent');
      refresh();
    } catch (e: any) { toast.error(e.message || 'Failed to resend'); }
  };

  const q = search.trim().toLowerCase();
  const filteredMembers = members.filter((m: any) => !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
  const filteredInvites = invites.filter((i: any) => !q || i.name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-[var(--primary)]" />
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Workspace access</h2>
          <p className="text-xs text-[var(--muted-foreground)]">Invite teammates and control what they can see.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..."
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="ml-auto inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <UserPlus size={15} /> Invite team member
        </button>
      </div>

      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Access</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Joined / Invited</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">Loading...</td></tr>
              ) : filteredMembers.length === 0 && filteredInvites.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No members found</td></tr>
              ) : (
                <>
                  {filteredMembers.map((m: any) => (
                    <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3 text-[var(--foreground)] font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{m.email}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{roleLabel(m.role)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${m.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {m.active ? 'Working' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))}
                  {filteredInvites.map((i: any) => (
                    <tr key={i.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3 text-[var(--foreground)] font-medium">{i.name}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{i.email}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{roleLabel(i.role)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Invited
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{new Date(i.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => resend(i.id)} title="Resend invite" className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)]"><RefreshCw size={13} /></button>
                          <button onClick={() => revoke(i.id)} title="Revoke invite" className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900 text-red-500"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && <InviteTeamMemberModal onClose={() => setShowInvite(false)} onInvited={refresh} />}
    </div>
  );
}

function AutomationTab() {
  const [faqs, setFaqs] = useState<{ keywords: string; answer: string }[]>([]);
  const [qualQs, setQualQs] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    api('/tenants/me').then((t: any) => {
      setTenantId(t.id);
      const s = t.settings as any || {};
      const existing = s.faqs;
      setFaqs(existing ? Object.entries(existing).map(([k, v]) => ({ keywords: k, answer: v as string })) : [{ keywords: '', answer: '' }]);
      setQualQs(s.qualificationQuestions || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    const map: Record<string, string> = {};
    for (const f of faqs) {
      if (f.keywords.trim() && f.answer.trim()) map[f.keywords.trim()] = f.answer.trim();
    }
    try {
      await api('/tenants/' + tenantId, { method: 'PATCH', body: JSON.stringify({ settings: { faqs: map, qualificationQuestions: qualQs } }) });
      toast.success('Saved');
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  if (loading) return <div className="py-10 text-center text-[var(--muted-foreground)]">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">WhatsApp Ad Qualification</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">When someone clicks your Facebook/Google ad and messages on WhatsApp for the first time, Mikey sends this to qualify them.</p>
        <textarea value={qualQs} onChange={e => setQualQs(e.target.value)}
          placeholder="Thanks for your interest! 🏡 To help you find the perfect home, please tell me:&#10;1. Which project interests you?&#10;2. 2BHK or 3BHK?&#10;3. Your budget range?&#10;4. When do you plan to buy?"
          rows={6}
          className="w-full mt-2 px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--primary)] resize-none"
        />
      </div>

      <hr className="border-[var(--border)]" />

      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">FAQ Auto-Replies</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">When an inbound WhatsApp message contains any keyword, Mikey auto-replies with the answer.</p>
      </div>

      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <div className="flex-1 space-y-2">
              <input
                placeholder="Keywords (comma-separated): price, cost, rate"
                value={f.keywords} onChange={e => { const n = [...faqs]; n[i].keywords = e.target.value; setFaqs(n); }}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--primary)]"
              />
              <textarea
                placeholder="Auto-reply message: Our 2BHK starts at ₹75 lakhs..."
                value={f.answer} onChange={e => { const n = [...faqs]; n[i].answer = e.target.value; setFaqs(n); }}
                rows={2}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none focus:border-[var(--primary)] resize-none"
              />
            </div>
            <button onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
              className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900 text-red-500 mt-1 shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={() => setFaqs([...faqs, { keywords: '', answer: '' }])}
        className="text-sm text-[var(--primary)] hover:underline">
        + Add FAQ
      </button>

      <div className="flex gap-2 pt-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          <Save size={15} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
