'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus } from 'lucide-react';

export default function BookingPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', provider: 'CALENDLY', config: '{}' });

  const fetch = () => api('/booking-settings').then((r: any) => setData(r.data || r));
  useEffect(() => { fetch(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/booking-settings', { method: 'POST', body: JSON.stringify({ ...form, config: JSON.parse(form.config) }) });
    setShowCreate(false); fetch();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Booking Settings</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm"><Plus size={16} /> Add</button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input placeholder="Setting name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
            <select value={form.provider} onChange={e => setForm({...form, provider: e.target.value})} className="border rounded px-3 py-2 text-sm">
              {['CALENDLY','GOOGLE_CALENDAR','CUSTOM'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <textarea placeholder='Config JSON' value={form.config} onChange={e => setForm({...form, config: e.target.value})} className="w-full border rounded px-3 py-2 text-sm h-20 mb-2" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Save</button>
        </form>
      )}

      <div className="space-y-3">
        {data.map(b => (
          <div key={b.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="font-medium text-sm">{b.name}</div>
            <div className="text-xs text-gray-400 mb-1">{b.provider}</div>
            <pre className="text-xs text-gray-500">{JSON.stringify(b.config, null, 2)}</pre>
          </div>
        ))}
        {data.length === 0 && <div className="text-center text-gray-400 py-8">No booking settings</div>}
      </div>
    </div>
  );
}
