import React, { useState, useEffect } from 'react';
import { fetchKnowledgeBase, createKnowledgeBaseEntry, updateKnowledgeBaseEntry, deleteKnowledgeBaseEntry } from '../lib/data';
import { Plus, X, HelpCircle, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { KnowledgeBaseEntry } from '../lib/types';

const emptyForm = { question: '', answer: '', category: '', keywords: '' };

export default function KnowledgeBasePage() {
  const [data, setData] = useState<KnowledgeBaseEntry[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = () => fetchKnowledgeBase().then(setData).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const resetForm = () => { setForm(emptyForm); setShowCreate(false); setEditingId(null); };

  const toPayload = () => ({
    question: form.question,
    answer: form.answer,
    category: form.category || undefined,
    keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createKnowledgeBaseEntry(toPayload());
      resetForm();
      refresh();
      toast.success('FAQ entry added');
    } catch (e: any) { toast.error(e.message); }
  };

  const startEdit = (entry: KnowledgeBaseEntry) => {
    setEditingId(entry.id);
    setShowCreate(false);
    setForm({ question: entry.question, answer: entry.answer, category: entry.category || '', keywords: (entry.keywords || []).join(', ') });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      await updateKnowledgeBaseEntry(editingId, toPayload());
      resetForm();
      refresh();
      toast.success('FAQ entry updated');
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleActive = async (entry: KnowledgeBaseEntry) => {
    try {
      await updateKnowledgeBaseEntry(entry.id, { active: !entry.active });
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this FAQ entry?')) return;
    try {
      await deleteKnowledgeBaseEntry(id);
      refresh();
      toast.success('FAQ entry deleted');
    } catch (e: any) { toast.error(e.message); }
  };

  const formFields = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          placeholder="Question (what the lead would ask)"
          value={form.question}
          onChange={e => setForm({ ...form, question: e.target.value })}
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          required
        />
        <input
          placeholder="Category (optional)"
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        />
        <textarea
          placeholder="Answer — this is what the AI will use to reply"
          value={form.answer}
          onChange={e => setForm({ ...form, answer: e.target.value })}
          className="col-span-1 sm:col-span-2 h-24 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          required
        />
        <input
          placeholder="Keywords, comma separated (helps the AI find this entry)"
          value={form.keywords}
          onChange={e => setForm({ ...form, keywords: e.target.value })}
          className="col-span-1 sm:col-span-2 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        />
      </div>
      <div className="flex gap-2 mt-3">
        <button type="submit" className="h-8 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">{submitLabel}</button>
        <button type="button" onClick={resetForm} className="h-8 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
          <X size={14} />
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Knowledge Base</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{data.length} FAQ entries · the AI searches these before escalating a question to a human</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); setForm(emptyForm); }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> Add FAQ
        </button>
      </div>

      {showCreate && formFields(create, 'Save')}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.length === 0 && !showCreate && (
          <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">No FAQ entries yet — add one so the AI can answer common questions on its own.</div>
        )}
        {data.map(entry => (
          editingId === entry.id ? (
            <div key={entry.id} className="lg:col-span-2">{formFields(saveEdit, 'Update')}</div>
          ) : (
            <div key={entry.id} className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 ${!entry.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[var(--muted)] flex items-center justify-center shrink-0">
                    <HelpCircle size={14} className="text-[var(--muted-foreground)]" />
                  </div>
                  <div className="font-medium text-sm text-[var(--foreground)]">{entry.question}</div>
                </div>
                {entry.category && <span className="text-[10px] font-mono text-[var(--muted-foreground)] shrink-0">{entry.category}</span>}
              </div>
              <p className="text-sm text-[var(--muted-foreground)] pl-10">{entry.answer}</p>
              {entry.keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pl-10">
                  {entry.keywords.map(k => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{k}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 mt-3 pl-10">
                <button onClick={() => startEdit(entry)} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors">
                  <Pencil size={12} /> Edit
                </button>
                <button onClick={() => toggleActive(entry)} className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                  {entry.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => remove(entry.id)} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
