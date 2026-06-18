'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, TestTube2 } from 'lucide-react';

export default function CrmMappingsPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', crmType: 'HUBSPOT', fieldMappings: '{}' });

  const fetch = () => api('/crm-mappings').then((r: any) => setData(r.data || r));
  useEffect(() => { fetch(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/crm-mappings', { method: 'POST', body: JSON.stringify({ ...form, fieldMappings: JSON.parse(form.fieldMappings) }) });
    setShowCreate(false); fetch();
  };

  const test = (id: string) => api(`/crm-mappings/${id}/test`, { method: 'POST' }).then(fetch);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">CRM Mappings</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm"><Plus size={16} /> Add</button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input placeholder="Mapping name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
            <select value={form.crmType} onChange={e => setForm({...form, crmType: e.target.value})} className="border rounded px-3 py-2 text-sm">
              {['HUBSPOT','ZOHO','SALESFORCE'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <textarea placeholder='{"leadName":"firstname","email":"email","phone":"phone"}' value={form.fieldMappings} onChange={e => setForm({...form, fieldMappings: e.target.value})} className="w-full border rounded px-3 py-2 text-sm h-20 mb-2" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Save</button>
        </form>
      )}

      <div className="space-y-3">
        {data.map(m => (
          <div key={m.id} className="bg-white border rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{m.name}</div>
              <div className="text-xs text-gray-400">{m.crmType}</div>
              <pre className="text-xs text-gray-500 mt-1">{JSON.stringify(m.fieldMappings, null, 2)}</pre>
            </div>
            <button onClick={() => test(m.id)} className="flex items-center gap-1 border px-3 py-1.5 rounded text-xs"><TestTube2 size={12} /> Test</button>
          </div>
        ))}
        {data.length === 0 && <div className="text-center text-gray-400 py-8">No CRM mappings</div>}
      </div>
    </div>
  );
}
