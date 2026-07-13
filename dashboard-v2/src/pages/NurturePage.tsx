import React, { useState, useEffect } from 'react';
import { fetchNurtureSequences, createNurtureSequence, addNurtureStep, deleteNurtureStep, deleteNurtureSequence } from '../lib/data';
import { Plus, Trash2, X, Route, ChevronDown, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

const stepTypes = ['SEND_WHATSAPP', 'SEND_EMAIL', 'WAIT', 'CHECK_CONDITION', 'UPDATE_LEAD_STATUS', 'PUSH_TO_CRM', 'SEND_BOOKING_LINK', 'CREATE_TASK'];

const stepColors: Record<string, string> = {
  SEND_WHATSAPP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SEND_EMAIL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  WAIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CHECK_CONDITION: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  UPDATE_LEAD_STATUS: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PUSH_TO_CRM: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  SEND_BOOKING_LINK: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  CREATE_TASK: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function NurturePage() {
  const [sequences, setSequences] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', leadList: 'all' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stepForm, setStepForm] = useState({ sequenceId: '', type: 'SEND_WHATSAPP', config: '{}', order: 0 });

  const refresh = () => fetchNurtureSequences().then((r: any) => setSequences(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNurtureSequence(form);
      setShowCreate(false);
      setForm({ name: '', leadList: 'all' });
      refresh();
      toast.success('Sequence created');
    } catch (e: any) { toast.error(e.message); }
  };

  const addStep = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addNurtureStep(stepForm.sequenceId, { ...stepForm, config: JSON.parse(stepForm.config) });
      setStepForm({ sequenceId: '', type: 'SEND_WHATSAPP', config: '{}', order: 0 });
      refresh();
      toast.success('Step added');
    } catch (e: any) { toast.error(e.message); }
  };

  const toggle = (id: string) => {
    setExpanded(expanded === id ? null : id);
    setStepForm({
      sequenceId: id,
      type: 'SEND_WHATSAPP',
      config: '{}',
      order: (sequences.find(s => s.id === id)?.steps?.length || 0) + 1,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Nurture Sequences</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{sequences.length} sequences</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> New Sequence
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Target List</label>
              <select
                value={form.leadList}
                onChange={e => setForm({ ...form, leadList: e.target.value })}
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              >
                <option value="all">All Leads</option>
                <option value="hot">Hot Leads</option>
                <option value="cold">Cold Leads</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {sequences.length === 0 && (
          <div className="text-center py-12 text-[var(--muted-foreground)]">No nurture sequences yet</div>
        )}
        {sequences.map((s: any) => (
          <div key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
              onClick={() => toggle(s.id)}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <Route size={16} className="text-[var(--primary)]" />
                </div>
                <div>
                  <div className="font-medium text-sm text-[var(--foreground)]">{s.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{s.steps?.length || 0} steps · {s.status || 'active'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNurtureSequence(s.id); refresh(); toast.success('Deleted'); }}
                  className="p-1.5 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronDown size={16} className={`text-[var(--muted-foreground)] transition-transform ${expanded === s.id ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {expanded === s.id && (
              <div className="border-t border-[var(--border)] p-4 bg-[var(--muted)]/30 animate-fade-in">
                <div className="space-y-2 mb-4">
                  <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Steps</h4>
                  {(s.steps || []).length === 0 && (
                    <p className="text-sm text-[var(--muted-foreground)]">No steps yet. Add one below.</p>
                  )}
                  {(s.steps || []).map((st: any, i: number) => (
                    <div key={st.id || i} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--muted-foreground)] font-mono">#{st.order || i + 1}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stepColors[st.type] || ''}`}>
                          {st.type}
                        </span>
                        {st.config && Object.keys(st.config).length > 0 && (
                          <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[200px]">
                            {JSON.stringify(st.config).slice(0, 60)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => { deleteNurtureStep(s.id, st.id); refresh(); }}
                        className="p-1 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={addStep} className="flex flex-wrap gap-2 items-end border-t border-[var(--border)] pt-4">
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1">Order</label>
                    <input
                      type="number"
                      placeholder="Order"
                      value={stepForm.order || ''}
                      onChange={e => setStepForm({ ...stepForm, order: parseInt(e.target.value) || 0 })}
                      className="h-8 w-16 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1">Type</label>
                    <select
                      value={stepForm.type}
                      onChange={e => setStepForm({ ...stepForm, type: e.target.value })}
                      className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                    >
                      {stepTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1">Config (JSON)</label>
                    <input
                      placeholder='Config JSON'
                      value={stepForm.config}
                      onChange={e => setStepForm({ ...stepForm, config: e.target.value })}
                      className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                    />
                  </div>
                  <button type="submit" className="h-8 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity">
                    Add Step
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
