import React, { useState, useEffect } from 'react';
import { fetchAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule, testRuleConditions } from '../lib/data';
import { Plus, Trash2, X, TestTube, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';

const operators = ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'between', 'exists', 'not_exists', 'in_list', 'not_in_list', 'date_before', 'date_after'];
const categories = ['scoring', 'routing', 'segment', 'automation', 'notification'];
const systemFields = ['status', 'segment', 'source', 'score', 'priority', 'budget', 'interest', 'name', 'email', 'phone', 'company', 'location', 'message', 'campaignId', 'assignedAgentId', 'createdAt', 'customFields'];

const operatorLabels: Record<string, string> = {
  equals: '=', not_equals: '≠', contains: 'contains', not_contains: 'not contains',
  greater_than: '>', less_than: '<', between: 'between', exists: 'exists',
  not_exists: 'not exists', in_list: 'in list', not_in_list: 'not in list',
  date_before: 'before', date_after: 'after',
};

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLead, setTestLead] = useState('{}');
  const [form, setForm] = useState({
    name: '', category: 'automation', description: '', priority: 0, active: true,
    conditions: [{ field: '', operator: 'equals', value: '' }],
    actions: [{ type: 'update_status', value: '' }],
  });

  const refresh = () => fetchAutomationRules().then(setRules).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const resetForm = () => {
    setForm({ name: '', category: 'automation', description: '', priority: 0, active: true, conditions: [{ field: '', operator: 'equals', value: '' }], actions: [{ type: 'update_status', value: '' }] });
    setTestResult(null);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, conditions: form.conditions.filter(c => c.field), actions: form.actions.filter(a => a.type) };
      if (editingId) {
        await updateAutomationRule(editingId, payload);
        toast.success('Rule updated');
      } else {
        await createAutomationRule(payload);
        toast.success('Rule created');
      }
      setShowCreate(false);
      resetForm();
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEdit = (rule: any) => {
    setForm({
      name: rule.name || '',
      category: rule.category || 'automation',
      description: rule.description || '',
      priority: rule.priority || 0,
      active: rule.active !== false,
      conditions: Array.isArray(rule.conditions) && rule.conditions.length ? rule.conditions : [{ field: '', operator: 'equals', value: '' }],
      actions: Array.isArray(rule.actions) && rule.actions.length ? rule.actions : [{ type: 'update_status', value: '' }],
    });
    setEditingId(rule.id);
    setShowCreate(true);
  };

  const toggleActive = async (rule: any) => {
    try { await updateAutomationRule(rule.id, { active: !rule.active }); refresh(); } catch (e: any) { toast.error(e.message); }
  };

  const handleTest = async () => {
    try {
      const r = await testRuleConditions(form.conditions.filter(c => c.field), JSON.parse(testLead));
      setTestResult(r);
    } catch (e: any) { toast.error(e.message); }
  };

  const addCondition = () => setForm({ ...form, conditions: [...form.conditions, { field: '', operator: 'equals', value: '' }] });
  const removeCondition = (i: number) => setForm({ ...form, conditions: form.conditions.filter((_, idx) => idx !== i) });
  const updateCondition = (i: number, key: string, val: string) => {
    const c = [...form.conditions];
    c[i] = { ...c[i], [key]: val };
    setForm({ ...form, conditions: c });
  };

  const addAction = () => setForm({ ...form, actions: [...form.actions, { type: 'update_status', value: '' }] });
  const removeAction = (i: number) => setForm({ ...form, actions: form.actions.filter((_, idx) => idx !== i) });
  const updateAction = (i: number, key: string, val: string) => {
    const a = [...form.actions];
    a[i] = { ...a[i], [key]: val };
    setForm({ ...form, actions: a });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Automation Rules</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{rules.length} rules configured</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> Add Rule
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Rule name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            />
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              placeholder="Priority"
              value={form.priority}
              onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            />
          </div>
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Conditions (ALL must match)</h3>
              <button type="button" onClick={addCondition} className="text-xs text-[var(--primary)] hover:underline">+ Add condition</button>
            </div>
            <div className="space-y-2">
              {form.conditions.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={c.field}
                    onChange={e => updateCondition(i, 'field', e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  >
                    <option value="">Select field</option>
                    {systemFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select
                    value={c.operator}
                    onChange={e => updateCondition(i, 'operator', e.target.value)}
                    className="w-28 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  >
                    {operators.map(o => <option key={o} value={o}>{operatorLabels[o]}</option>)}
                  </select>
                  <input
                    placeholder="Value"
                    value={c.value}
                    onChange={e => updateCondition(i, 'value', e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  />
                  {form.conditions.length > 1 && (
                    <button type="button" onClick={() => removeCondition(i)} className="p-1.5 rounded-md hover:bg-[var(--accent)] text-red-400"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Actions (when matched)</h3>
              <button type="button" onClick={addAction} className="text-xs text-[var(--primary)] hover:underline">+ Add action</button>
            </div>
            <div className="space-y-2">
              {form.actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={a.type}
                    onChange={e => updateAction(i, 'type', e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  >
                    <option value="update_status">Update Status</option>
                    <option value="set_segment">Set Segment</option>
                    <option value="assign_agent">Assign Agent</option>
                    <option value="send_email">Send Email</option>
                    <option value="send_whatsapp">Send WhatsApp</option>
                    <option value="trigger_webhook">Trigger Webhook</option>
                    <option value="create_task">Create Task</option>
                    <option value="notify_slack">Notify Slack</option>
                  </select>
                  <input
                    placeholder="Value (e.g. QUALIFIED, HOT)"
                    value={a.value}
                    onChange={e => updateAction(i, 'value', e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  />
                  {form.actions.length > 1 && (
                    <button type="button" onClick={() => removeAction(i)} className="p-1.5 rounded-md hover:bg-[var(--accent)] text-red-400"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Test with lead data</h3>
            <div className="flex gap-2">
              <textarea
                placeholder='{"status": "NEW", "score": 85, "interest": "premium"}'
                value={testLead}
                onChange={e => setTestLead(e.target.value)}
                className="flex-1 h-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              />
              <button type="button" onClick={handleTest} className="h-9 px-3 rounded-lg border border-[var(--border)] text-xs text-[var(--foreground)] hover:bg-[var(--accent)] flex items-center gap-1">
                <TestTube size={12} /> Test
              </button>
            </div>
            {testResult && (
              <pre className="text-xs bg-[var(--muted)] text-[var(--foreground)] p-3 rounded-lg border border-[var(--border)] overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" className="h-8 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
              {editingId ? 'Update' : 'Save'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); resetForm(); }} className="h-8 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)]">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Conditions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Actions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--muted-foreground)]">No rules configured. Create your first automation rule.</td></tr>
              ) : (
                rules.map((r: any) => (
                  <tr key={r.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{r.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">{r.category}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] font-mono">
                      {Array.isArray(r.conditions) ? r.conditions.map((c: any) => `${c.field} ${c.operator} ${c.value}`).join(', ') : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                      {Array.isArray(r.actions) ? r.actions.map((a: any) => `${a.type}: ${a.value}`).join(', ') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{r.priority ?? 0}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(r)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          r.active !== false
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {r.active !== false ? <Play size={10} /> : <Pause size={10} />}
                        {r.active !== false ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(r)} className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-xs">Edit</button>
                        <button onClick={() => { deleteAutomationRule(r.id); refresh(); toast.success('Deleted'); }} className="p-1.5 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
