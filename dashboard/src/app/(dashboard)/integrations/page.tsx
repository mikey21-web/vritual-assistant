'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, TestTube2, Trash2 } from 'lucide-react';

export default function IntegrationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: '', name: '', config: '{}' });

  const fetch = () => api('/integrations').then((r: any) => setData(r.data || r));
  useEffect(() => { fetch(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/integrations', { method: 'POST', body: JSON.stringify({ ...form, config: JSON.parse(form.config) }) });
    setShowCreate(false); fetch();
  };

  const test = async (id: string) => { await api(`/integrations/${id}/test`, { method: 'POST' }); fetch(); };
  const remove = async (id: string) => { await api(`/integrations/${id}`, { method: 'DELETE' }); fetch(); };

  const types = ['n8n','WHATSAPP_CLOUD_API','TWILIO','HUBSPOT','ZOHO','SALESFORCE','GOOGLE_CALENDAR','CALENDLY','STRIPE','SMTP'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Integrations</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm"><Plus size={16} /> Add</button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="border rounded px-3 py-2 text-sm" required>
              <option value="">Select type</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Integration name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
          </div>
          <textarea placeholder='Config JSON e.g. {"apiKey":"..."}' value={form.config} onChange={e => setForm({...form, config: e.target.value})} className="w-full border rounded px-3 py-2 text-sm h-20 mb-2" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Save</button>
        </form>
      )}

      <div className="space-y-3">
        {data.map(i => (
          <div key={i.id} className="bg-white border rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{i.name}</div>
              <div className="text-xs text-gray-400">{i.type} · <span className={i.status === 'connected' ? 'text-green-600' : 'text-gray-400'}>{i.status}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => test(i.id)} className="flex items-center gap-1 border px-3 py-1.5 rounded text-xs hover:bg-gray-50"><TestTube2 size={12} /> Test</button>
              <button onClick={() => remove(i.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {data.length === 0 && <div className="text-center text-gray-400 py-8">No integrations</div>}
      </div>
    </div>
  );
}
