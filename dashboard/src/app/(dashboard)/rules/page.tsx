'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Zap, Plus, Play, Check, X, Edit, Trash2 } from 'lucide-react';

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', description: '', category: 'scoring', eventType: '',
    priority: 100, active: true, conditions: '[]', actions: '[]'
  });
  const [testLead, setTestLead] = useState('{}');
  const [testResult, setTestResult] = useState<any>(null);

  const refresh = () => api('/rules').then((r: any) => setRules(Array.isArray(r) ? r : r.data || [])).catch(e => toast.error(e.message));
  useEffect(() => { refresh(); }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', category: 'scoring', eventType: '', priority: 100, active: true, conditions: '[]', actions: '[]' });
    setEditing(null);
    setShowForm(false);
    setTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let conditions: any[], actions: any[];
    try { conditions = JSON.parse(form.conditions); actions = JSON.parse(form.actions); }
    catch { toast.error('Invalid JSON in conditions or actions'); return; }

    const payload = { ...form, conditions, actions };
    try {
      if (editing) {
        await api(`/rules/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('Rule updated');
      } else {
        await api('/rules', { method: 'POST', body: JSON.stringify(payload) });
        toast.success('Rule created');
      }
      resetForm();
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    try { await api(`/rules/${id}`, { method: 'DELETE' }); refresh(); toast.success('Deleted'); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = (rule: any) => {
    setEditing(rule);
    setForm({
      name: rule.name, description: rule.description || '', category: rule.category,
      eventType: rule.eventType || '', priority: rule.priority, active: rule.active,
      conditions: JSON.stringify(rule.conditions, null, 2), actions: JSON.stringify(rule.actions, null, 2)
    });
    setShowForm(true);
  };

  const handleTest = async () => {
    let conditions: any[], lead: any;
    try { conditions = JSON.parse(form.conditions); lead = JSON.parse(testLead); }
    catch { toast.error('Invalid JSON'); return; }
    try {
      const result = await api('/rules/test', { method: 'POST', body: JSON.stringify({ conditions, testLead: lead }) });
      setTestResult(result);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Automation Rules</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
          <Plus size={16} /> New Rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
            <input placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="border rounded px-3 py-2 text-sm" />
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border rounded px-3 py-2 text-sm">
              <option value="scoring">scoring</option><option value="routing">routing</option><option value="segment">segment</option><option value="nurture">nurture</option><option value="notification">notification</option><option value="crm">crm</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Event Type (e.g. lead.created)" value={form.eventType} onChange={e => setForm({...form, eventType: e.target.value})} className="border rounded px-3 py-2 text-sm" />
            <input type="number" placeholder="Priority" value={form.priority} onChange={e => setForm({...form, priority: Number(e.target.value)})} className="border rounded px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} /> Active</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div><label className="text-xs text-gray-500">Conditions (JSON array)</label>
              <textarea value={form.conditions} onChange={e => setForm({...form, conditions: e.target.value})} className="w-full border rounded px-3 py-2 text-sm font-mono h-24" placeholder='[{"field":"score","operator":"greater_than","value":50}]' />
            </div>
            <div><label className="text-xs text-gray-500">Actions (JSON array)</label>
              <textarea value={form.actions} onChange={e => setForm({...form, actions: e.target.value})} className="w-full border rounded px-3 py-2 text-sm font-mono h-24" placeholder='[{"type":"set_segment","segment":"HOT"}]' />
            </div>
          </div>

          <div className="border-t pt-3 mb-3">
            <h3 className="text-sm font-semibold mb-2">Test Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500">Test Lead JSON</label>
                <textarea value={testLead} onChange={e => setTestLead(e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-mono h-16" placeholder='{"score":60,"segment":"WARM"}' />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <button type="button" onClick={handleTest} className="flex items-center gap-1 bg-violet-600 text-white px-3 py-2 rounded text-sm hover:bg-violet-700 w-fit">
                  <Play size={14} /> Test Conditions
                </button>
                {testResult && (
                  <div className={`text-xs ${testResult.matched ? 'text-green-600' : 'text-red-600'} font-medium`}>
                    Overall: {testResult.matched ? 'MATCHED' : 'NOT MATCHED'}
                  </div>
                )}
              </div>
            </div>
            {testResult?.results && (
              <div className="mt-2 space-y-1">
                {testResult.results.map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.passed ? <Check size={14} className="text-green-500" /> : <X size={14} className="text-red-500" />}
                    <span className="font-mono">{r.field} {r.operator} {JSON.stringify(r.expected)}</span>
                    <span className="text-gray-400">→ actual: {JSON.stringify(r.actual)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">{editing ? 'Update' : 'Create'} Rule</button>
            <button type="button" onClick={resetForm} className="border px-4 py-1.5 rounded text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Event Type</th><th className="px-4 py-3 font-medium">Priority</th><th className="px-4 py-3 font-medium">Active</th><th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{r.category}</span></td>
                <td className="px-4 py-3 text-xs">{r.eventType || '-'}</td>
                <td className="px-4 py-3 text-xs">{r.priority}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{r.active ? 'Yes' : 'No'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(r)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 && <div className="p-8 text-center text-gray-400">No rules found</div>}
      </div>
    </div>
  );
}
