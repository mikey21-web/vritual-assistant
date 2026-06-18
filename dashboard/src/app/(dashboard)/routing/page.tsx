'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

export default function RoutingPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', conditions: '{}', action: '{}' });

  const fetch = () => api('/routing-rules').then((r: any) => setRules(r.data || r));
  useEffect(() => { fetch(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/routing-rules', { method: 'POST', body: JSON.stringify({ ...form, conditions: JSON.parse(form.conditions), action: JSON.parse(form.action) }) });
    setShowCreate(false); fetch();
  };

  const remove = async (id: string) => { await api(`/routing-rules/${id}`, { method: 'DELETE' }); fetch(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Routing Rules</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm"><Plus size={16} /> Add Rule</button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="bg-white border rounded-lg p-4 mb-4">
          <input placeholder="Rule name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded px-3 py-2 text-sm mb-2" required />
          <textarea placeholder='Conditions JSON e.g. {"segment":"HOT"}' value={form.conditions} onChange={e => setForm({...form, conditions: e.target.value})} className="w-full border rounded px-3 py-2 text-sm h-20 mb-2" />
          <textarea placeholder='Action JSON e.g. {"assignTo":"manager","notifyTeam":true}' value={form.action} onChange={e => setForm({...form, action: e.target.value})} className="w-full border rounded px-3 py-2 text-sm h-20 mb-2" />
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Save</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-1.5 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {rules.map(r => (
          <div key={r.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{r.name}</span>
              <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Conditions:</span> <pre className="inline text-xs">{JSON.stringify(r.conditions)}</pre></div>
              <div><span className="text-gray-400">Action:</span> <pre className="inline text-xs">{JSON.stringify(r.action)}</pre></div>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div className="text-center text-gray-400 py-8">No routing rules</div>}
      </div>
    </div>
  );
}
