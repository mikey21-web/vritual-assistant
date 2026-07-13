import React, { useState, useEffect } from 'react';
import { fetchBusinessSettings, updateBusinessSettings } from '../lib/data';
import { api } from '../lib/api';
import { Save, Settings as SettingsIcon, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [retentionSaved, setRetentionSaved] = useState(false);

  useEffect(() => {
    fetchBusinessSettings().then(s => { setSettings(s); setForm(s); }).catch(() => {});
    api('/call-tracking/recording-retention').then(r => setRetentionDays(r.days)).catch(() => {});
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
      await api('/call-tracking/recording-retention', {
        method: 'PUT',
        body: JSON.stringify({ days: retentionDays }),
      });
      setRetentionSaved(true);
      setTimeout(() => setRetentionSaved(false), 2000);
      toast.success('Retention saved');
    } catch (e: any) { toast.error(e.message); }
  };

  if (!settings) return (
    <div className="space-y-6 animate-fade-in">
      <div className="max-w-xl">
        {[1,2,3,4].map(i => <div key={i} className="h-16 mb-3 rounded-xl bg-[var(--card)] border border-[var(--border)] animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Settings</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Configure your business preferences and data management</p>
        </div>
      </div>

      <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Business Settings</h2>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Changes'}
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
          <button
            onClick={handleRetentionSave}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Save size={16} />
            {retentionSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Auto-delete recordings after (days)</label>
            <input
              type="number"
              min={1}
              placeholder="Leave empty to keep forever"
              value={retentionDays ?? ''}
              onChange={e => setRetentionDays(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {retentionDays
                ? `Recordings older than ${retentionDays} days will be deleted automatically at midnight`
                : 'Recordings are kept forever. Set a value to enable auto-cleanup.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
