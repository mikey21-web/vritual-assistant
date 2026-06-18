'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';

export default function FormsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const fetch = () => api('/forms').then(setForms);
  useEffect(() => { fetch(); }, []);

  const create = async () => { await api('/forms', { method: 'POST', body: JSON.stringify({ name }) }); setName(''); setShowCreate(false); fetch(); };

  const addField = async (label: string, type: string) => {
    if (!selected) return;
    const fieldKey = label.toLowerCase().replace(/\s+/g, '_');
    await api(`/forms/${selected.id}/fields`, { method: 'POST', body: JSON.stringify({ label, fieldKey, type }) });
    api(`/forms/${selected.id}`).then(setSelected);
  };

  const removeField = async (fieldId: string) => {
    if (!selected) return;
    await api(`/forms/${selected.id}/fields/${fieldId}`, { method: 'DELETE' });
    api(`/forms/${selected.id}`).then(setSelected);
  };

  return (
    <div className="flex gap-6">
      <div className="w-80 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Forms</h2>
          <button onClick={() => setShowCreate(true)} className="text-blue-600 hover:text-blue-700"><Plus size={18} /></button>
        </div>
        {showCreate && (
          <div className="mb-3 flex gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Form name" className="flex-1 border rounded px-2 py-1.5 text-sm" />
            <button onClick={create} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">Add</button>
          </div>
        )}
        <div className="space-y-1">
          {forms.map(f => (
            <button key={f.id} onClick={() => { setSelected(f); api(`/forms/${f.id}`).then(setSelected); }}
              className={`w-full text-left px-3 py-2 rounded text-sm ${selected?.id === f.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>
              {f.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1">
        {selected ? (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">{selected.name}</h3>
            <div className="space-y-2 mb-6">
              {selected.fields?.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                  <div><span className="font-medium">{f.label}</span> <span className="text-gray-400 ml-2">({f.type})</span> {f.required && <span className="text-red-500 ml-1">*</span>}</div>
                  <button onClick={() => removeField(f.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['text','email','phone','number','textarea','date','dropdown','checkbox'].map(t => (
                <button key={t} onClick={() => addField(t.charAt(0).toUpperCase() + t.slice(1), t)}
                  className="border rounded px-3 py-2 text-sm text-left hover:bg-gray-50 capitalize">+ {t}</button>
              ))}
            </div>
          </div>
        ) : <div className="text-gray-400 text-center mt-20">Select or create a form</div>}
      </div>
    </div>
  );
}
