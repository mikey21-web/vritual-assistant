import React, { useState, useEffect } from 'react';
import { fetchBusinessSettings, updateBusinessSettings } from '../lib/data';
import { Save, Settings as SettingsIcon } from 'lucide-react';
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
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchBusinessSettings().then(s => { setSettings(s); setForm(s); }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await updateBusinessSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Settings saved');
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Business Settings</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Configure your business preferences</p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
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
    </div>
  );
}
