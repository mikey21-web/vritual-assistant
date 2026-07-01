import React, { useState, useEffect } from 'react';
import { fetchForms, createForm, addFormField, deleteFormField } from '../lib/data';
import { Plus, Trash2, FormInput, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const refresh = () => fetchForms().then(setForms);
  useEffect(() => { refresh(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    await createForm({ name });
    setName('');
    setShowCreate(false);
    refresh();
    toast.success('Form created');
  };

  const addField = async (label: string, type: string) => {
    if (!selected) return;
    const fieldKey = label.toLowerCase().replace(/\s+/g, '_');
    await addFormField(selected.id, { label, fieldKey, type });
    refresh().then(() => setSelected(forms.find(f => f.id === selected.id)));
  };

  const removeField = async (fieldId: string) => {
    if (!selected) return;
    await deleteFormField(selected.id, fieldId);
    refresh().then(() => setSelected(forms.find(f => f.id === selected.id)));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Forms</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{forms.length} forms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-[var(--foreground)]">All Forms</h3>
              <button onClick={() => setShowCreate(true)} className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--primary)] transition-colors">
                <Plus size={16} />
              </button>
            </div>
            {showCreate && (
              <div className="mb-3 flex gap-2 animate-fade-in">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Form name"
                  className="flex-1 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  onKeyDown={e => e.key === 'Enter' && create()}
                />
                <button onClick={create} className="h-8 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90">Add</button>
              </div>
            )}
            <div className="space-y-1">
              {forms.length === 0 && <p className="text-xs text-[var(--muted-foreground)] text-center py-4">No forms yet</p>}
              {forms.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSelected(f); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selected?.id === f.id
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                      : 'text-[var(--foreground)] hover:bg-[var(--accent)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FormInput size={14} />
                    {f.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-9">
          {selected ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">{selected.name}</h3>
              <p className="text-xs text-[var(--muted-foreground)] mb-6">{selected.fields?.length || 0} fields</p>

              <div className="space-y-2 mb-6">
                <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Fields</h4>
                {(!selected.fields || selected.fields.length === 0) && (
                  <p className="text-sm text-[var(--muted-foreground)]">No fields yet. Add one below.</p>
                )}
                {selected.fields?.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-2.5 bg-[var(--background)]">
                    <div>
                      <span className="font-medium text-sm text-[var(--foreground)]">{f.label}</span>
                      <span className="text-xs text-[var(--muted-foreground)] ml-2">({f.type})</span>
                    </div>
                    <button
                      onClick={() => removeField(f.id)}
                      className="p-1 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Add Field</h4>
                <div className="flex flex-wrap gap-2">
                  {['text', 'email', 'phone', 'number', 'textarea', 'date', 'select', 'checkbox'].map(t => (
                    <button
                      key={t}
                      onClick={() => addField(t.charAt(0).toUpperCase() + t.slice(1), t)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all capitalize"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <FormInput size={40} className="mx-auto text-[var(--muted-foreground)] mb-3" />
              <p className="text-[var(--muted-foreground)]">Select a form to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
