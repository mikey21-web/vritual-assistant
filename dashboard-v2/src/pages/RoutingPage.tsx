import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, X, Shuffle, Pencil, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const OPERATORS = ['equals', 'contains', 'not_equals', 'starts_with', 'exists', 'gt', 'gte', 'lt', 'lte'] as const;
const ACTION_TYPES = ['forward', 'assign', 'notify', 'webhook', 'tag', 'score'] as const;
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  target: string;
  priority: string;
}

function conditionsToArray(conditions: any): Condition[] {
  if (Array.isArray(conditions)) return conditions.map((c: any) => ({ field: c.field || '', operator: c.operator || 'equals', value: c.value ?? '' }));
  if (conditions && typeof conditions === 'object') {
    const keys = Object.keys(conditions);
    if (keys.length === 0) return [{ field: '', operator: 'equals', value: '' }];
    return keys.map(k => ({ field: k, operator: 'equals', value: String(conditions[k] ?? '') }));
  }
  return [{ field: '', operator: 'equals', value: '' }];
}

function actionToForm(action: any): Action {
  if (!action || typeof action !== 'object') return { type: 'forward', target: '', priority: 'medium' };
  return {
    type: action.type || 'forward',
    target: action.target || action.to || action.agentId || '',
    priority: action.priority || 'medium',
  };
}

function conditionsFromArray(arr: Condition[]): Record<string, any> | any[] {
  const valid = arr.filter(c => c.field.trim());
  if (valid.length === 0) return {};
  if (valid.length === 1) return { [valid[0].field]: { operator: valid[0].operator, value: valid[0].value } };
  return valid.map(c => ({ field: c.field, operator: c.operator, value: c.value }));
}

function actionFromForm(a: Action): Record<string, any> {
  const result: Record<string, any> = { type: a.type };
  if (a.target) result.target = a.target;
  if (a.priority) result.priority = a.priority;
  return result;
}

export default function RoutingPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [conditions, setConditions] = useState<Condition[]>([{ field: '', operator: 'equals', value: '' }]);
  const [action, setAction] = useState<Action>({ type: 'forward', target: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    return api('/routing-rules')
      .then((r: any) => setData(r.data || r))
      .catch(() => setError('Failed to load routing rules'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { refresh(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setConditions([{ field: '', operator: 'equals', value: '' }]);
    setAction({ type: 'forward', target: '', priority: 'medium' });
    setError(null);
    setShowCreate(true);
  };

  const openEdit = (rule: any) => {
    setEditingId(rule.id);
    setName(rule.name);
    setConditions(conditionsToArray(rule.conditions));
    setAction(actionToForm(rule.action));
    setError(null);
    setShowCreate(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = JSON.stringify({
        name,
        conditions: conditionsFromArray(conditions),
        action: actionFromForm(action),
      });
      if (editingId) {
        await api(`/routing-rules/${editingId}`, { method: 'PATCH', body });
        toast.success('Rule updated');
      } else {
        await api('/routing-rules', { method: 'POST', body });
        toast.success('Rule created');
      }
      setShowCreate(false);
      setEditingId(null);
      refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to save rule');
      toast.error(e.message || 'Failed to save rule');
    } finally {
      setSubmitting(false);
    }
  };

  const addCondition = () => setConditions([...conditions, { field: '', operator: 'equals', value: '' }]);
  const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));
  const updateCondition = (i: number, key: keyof Condition, val: string) => {
    const next = [...conditions];
    next[i] = { ...next[i], [key]: val };
    setConditions(next);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Routing Rules</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{data.length} rules</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={16} /> Add Rule
          </button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showCreate && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{editingId ? 'Edit Rule' : 'New Rule'}</h3>
            {editingId && <span className="text-xs text-[var(--muted-foreground)]">Editing: {name}</span>}
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Rule Name */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Rule Name</label>
            <input
              placeholder="e.g. High-value website leads"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            />
          </div>

          {/* Conditions Builder */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Conditions</label>
              <button type="button" onClick={addCondition}
                className="text-xs text-[var(--primary)] hover:underline flex items-center gap-0.5">
                <Plus size={12} /> Add condition
              </button>
            </div>
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      placeholder="Field"
                      value={c.field}
                      onChange={e => updateCondition(i, 'field', e.target.value)}
                      className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                    />
                    <select
                      value={c.operator}
                      onChange={e => updateCondition(i, 'operator', e.target.value)}
                      className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                    >
                      {OPERATORS.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                    </select>
                    <input
                      placeholder="Value"
                      value={c.value}
                      onChange={e => updateCondition(i, 'value', e.target.value)}
                      className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                    />
                  </div>
                  {conditions.length > 1 && (
                    <button type="button" onClick={() => removeCondition(i)}
                      className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-red-500 hover:border-red-300 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Builder */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Action</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={action.type}
                onChange={e => setAction({ ...action, type: e.target.value })}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              >
                {ACTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
              <input
                placeholder="Target (e.g. agent-id, webhook-url)"
                value={action.target}
                onChange={e => setAction({ ...action, target: e.target.value })}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              />
              <select
                value={action.priority}
                onChange={e => setAction({ ...action, priority: e.target.value })}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting}
              className="h-8 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setEditingId(null); setError(null); }}
              className="h-8 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Shuffle size={18} className="animate-pulse" /> Loading routing rules...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center justify-center py-12 rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="text-sm text-red-500">{error}</div>
        </div>
      )}

      {/* Rules List */}
      {!loading && !error && (
        <div className="space-y-3">
          {data.length === 0 && (
            <div className="text-center py-12 text-[var(--muted-foreground)]">No routing rules yet</div>
          )}
          {data.map((r: any) => {
            const condStr = JSON.stringify(r.conditions);
            const actionStr = r.action ? `${r.action.type || 'forward'}${r.action.target ? ' → ' + r.action.target : ''}` : '';
            return (
              <div key={r.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center mt-0.5 shrink-0">
                    <Shuffle size={16} className="text-[var(--primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-[var(--foreground)]">{r.name}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1 space-x-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="font-mono text-[11px]">{condStr.slice(0, 60)}{condStr.length > 60 ? '…' : ''}</span>
                      <span className="text-[var(--muted-foreground)]">→</span>
                      <span className="font-medium">{actionStr}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button onClick={() => openEdit(r)}
                    className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                    title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { api(`/routing-rules/${r.id}`, { method: 'DELETE' }).then(() => { refresh(); toast.success('Deleted'); }); }}
                    className="p-1.5 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
