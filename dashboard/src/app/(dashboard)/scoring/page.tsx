'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, Play } from 'lucide-react';

export default function ScoringPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', field: '', operator: 'contains', value: '', points: 0 });
  const [testResult, setTestResult] = useState<any>(null);

  const fetch = () => api('/scoring-rules').then((r: any) => setRules(r.data || r));
  useEffect(() => { fetch(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/scoring-rules', { method: 'POST', body: JSON.stringify({ ...form, points: Number(form.points) }) });
    setShowCreate(false); fetch();
  };

  const remove = async (id: string) => { await api(`/scoring-rules/${id}`, { method: 'DELETE' }); fetch(); };

  const test = async () => {
    const res = await api('/scoring-rules/test', { method: 'POST', body: JSON.stringify({ ...form, points: Number(form.points), testValues: [{ [form.field]: form.value }] }) });
    setTestResult(res);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Scoring Rules</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm"><Plus size={16} /> Add Rule</button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            <input placeholder="Rule name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
            <input placeholder="Field (e.g. message)" value={form.field} onChange={e => setForm({...form, field: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
            <select value={form.operator} onChange={e => setForm({...form, operator: e.target.value})} className="border rounded px-3 py-2 text-sm">
              {['equals','contains','starts_with','exists','gt','gte','lt','lte'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input placeholder="Value" value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="border rounded px-3 py-2 text-sm" />
            <input type="number" placeholder="Points" value={form.points || ''} onChange={e => setForm({...form, points: parseInt(e.target.value) || 0})} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Save</button>
            <button type="button" onClick={test} className="border px-4 py-1.5 rounded text-sm flex items-center gap-1"><Play size={12} /> Test</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-1.5 rounded text-sm">Cancel</button>
          </div>
          {testResult && <pre className="mt-3 text-xs bg-gray-50 p-2 rounded">{JSON.stringify(testResult, null, 2)}</pre>}
        </form>
      )}

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Field</th><th className="px-4 py-3">Operator</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Points</th><th className="px-4 py-3"></th></tr></thead>
          <tbody>{rules.map(r => (<tr key={r.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium">{r.name}</td><td className="px-4 py-3">{r.field}</td><td className="px-4 py-3">{r.operator}</td><td className="px-4 py-3">{r.value}</td><td className="px-4 py-3">{r.points}</td><td className="px-4 py-3"><button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td></tr>))}</tbody>
        </table>
        {rules.length === 0 && <div className="p-8 text-center text-gray-400">No rules</div>}
      </div>
    </div>
  );
}
