import React, { useState, useEffect } from 'react';
import { fetchBusinessSettings, updateBusinessSettings } from '../lib/data';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchBusinessSettings().then(s => { setSettings(s); setForm(s); }).catch(() => {}); }, []);

  const handleSave = async () => { try { await updateBusinessSettings(form); setSaved(true); setTimeout(()=>setSaved(false), 2000); toast.success('Settings saved'); } catch(e:any) { toast.error(e.message); } };

  const fields = ['businessName','timezone','defaultCurrency','defaultWhatsAppNumber','defaultEmail','defaultCrm','defaultBookingTool','workingHoursStart','workingHoursEnd','notificationEmail'];

  if (!settings) return <div className="text-gray-400 text-center py-20">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Business Settings</h2><button onClick={handleSave} className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"><Save size={16}/>{saved?'Saved!':'Save'}</button></div>
      <div className="bg-white border rounded-xl p-6 max-w-xl grid gap-4">
        {fields.map(f => <div key={f}><label className="block text-xs text-gray-500 mb-1">{f}</label><input value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm"/></div>)}
      </div>
    </div>
  );
}
