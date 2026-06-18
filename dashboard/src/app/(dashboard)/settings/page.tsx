'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { api('/business-settings').then(s => { setSettings(s); setForm(s || {}); }); }, []);

  const handleSave = async () => {
    await api('/business-settings', { method: 'PATCH', body: JSON.stringify(form) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) return <div className="text-gray-400">Loading...</div>;

  const fields = [
    { key: 'businessName', label: 'Business Name' },
    { key: 'timezone', label: 'Timezone' },
    { key: 'defaultCurrency', label: 'Default Currency' },
    { key: 'defaultWhatsAppNumber', label: 'Default WhatsApp' },
    { key: 'defaultEmail', label: 'Default Email' },
    { key: 'defaultCrm', label: 'Default CRM' },
    { key: 'defaultBookingTool', label: 'Default Booking Tool' },
    { key: 'workingHoursStart', label: 'Working Hours Start' },
    { key: 'workingHoursEnd', label: 'Working Hours End' },
    { key: 'notificationEmail', label: 'Notification Email' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Business Settings</h2>
        <button onClick={handleSave} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"><Save size={16} /> {saved ? 'Saved!' : 'Save'}</button>
      </div>
      <div className="bg-white border rounded-lg p-6 shadow-sm max-w-xl">
        <div className="grid gap-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
              <input value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
