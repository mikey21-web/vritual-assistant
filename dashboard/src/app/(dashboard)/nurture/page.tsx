'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';

export default function NurturePage() {
  const [seqs, setSeqs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');

  const fetch = () => api('/nurture-sequences').then((r: any) => setSeqs(r.data || r));
  const loadSeq = (id: string) => api(`/nurture-sequences/${id}`).then(setSelected);
  useEffect(() => { fetch(); }, []);

  const create = async () => { await api('/nurture-sequences', { method: 'POST', body: JSON.stringify({ name }) }); setName(''); setShowCreate(false); fetch(); };

  const addStep = async (type: string) => {
    if (!selected) return;
    const displayOrder = (selected.steps?.length || 0) + 1;
    await api(`/nurture-sequences/${selected.id}/steps`, { method: 'POST', body: JSON.stringify({ type, displayOrder }) });
    loadSeq(selected.id);
  };

  const deleteStep = async (stepId: string) => { await api(`/nurture-sequences/${selected.id}/steps/${stepId}`, { method: 'DELETE' }); loadSeq(selected.id); };

  const stepTypes = ['SEND_WHATSAPP','SEND_EMAIL','WAIT','CHECK_CONDITION','UPDATE_LEAD_STATUS','PUSH_TO_CRM','SEND_BOOKING_LINK','CREATE_TASK'];

  return (
    <div className="flex gap-6">
      <div className="w-80 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Sequences</h2>
          <button onClick={() => setShowCreate(true)} className="text-blue-600"><Plus size={18} /></button>
        </div>
        {showCreate && (
          <div className="mb-3 flex gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Sequence name" className="flex-1 border rounded px-2 py-1.5 text-sm" />
            <button onClick={create} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm">Add</button>
          </div>
        )}
        {seqs.map(s => (
          <button key={s.id} onClick={() => loadSeq(s.id)}
            className={`w-full text-left px-3 py-2 rounded text-sm ${selected?.id === s.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>{s.name}</button>
        ))}
      </div>
      <div className="flex-1">
        {selected ? (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">{selected.name}</h3>
            <div className="space-y-2 mb-6">
              {selected.steps?.map((step: any, i: number) => (
                <div key={step.id} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                  <div><span className="text-gray-400 mr-2">#{i + 1}</span> {step.type}</div>
                  <button onClick={() => deleteStep(step.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {stepTypes.map(t => (
                <button key={t} onClick={() => addStep(t)} className="border rounded px-3 py-2 text-xs text-left hover:bg-gray-50">+ {t}</button>
              ))}
            </div>
          </div>
        ) : <div className="text-gray-400 text-center mt-20">Select or create a sequence</div>}
      </div>
    </div>
  );
}
