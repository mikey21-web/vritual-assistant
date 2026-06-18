'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Edit, Eye } from 'lucide-react';

export default function TemplatesPage() {
  const [data, setData] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'WELCOME', channel: 'WHATSAPP', body: '', variables: '["contact.name","business.name"]' });
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);

  const fetch = () => api('/message-templates').then(setData);
  useEffect(() => { fetch(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/message-templates', { method: 'POST', body: JSON.stringify({ ...form, variables: JSON.parse(form.variables) }) });
    setShowCreate(false); fetch();
  };

  const showPreview = async (id: string) => {
    const res = await api(`/message-templates/${id}/preview`, { method: 'POST', body: JSON.stringify(previewVars) });
    setPreview(res.rendered);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Message Templates</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm"><Plus size={16} /> Create</button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input placeholder="Template Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="border rounded px-3 py-2 text-sm">
              {['WELCOME','FOLLOW_UP','QUALIFICATION_QUESTION','RECONNECT','APPOINTMENT_LINK','THANK_YOU'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.channel} onChange={e => setForm({...form, channel: e.target.value})} className="border rounded px-3 py-2 text-sm">
              {['WHATSAPP','EMAIL','SMS'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder='Variables (JSON array)' value={form.variables} onChange={e => setForm({...form, variables: e.target.value})} className="border rounded px-3 py-2 text-sm" />
          </div>
          <textarea placeholder="Message body with {{variables}}" value={form.body} onChange={e => setForm({...form, body: e.target.value})} className="w-full border rounded px-3 py-2 text-sm h-24" required />
          <button type="submit" className="mt-2 bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Save</button>
        </form>
      )}

      <div className="space-y-3">
        {data.map(t => (
          <div key={t.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div><span className="font-medium">{t.name}</span> <span className="text-xs text-gray-400 ml-2">{t.type} · {t.channel}</span></div>
              <button onClick={() => { setSelected(t); api(`/message-templates/${t.id}`).then(setSelected); }} className="text-blue-600 text-xs"><Eye size={14} /></button>
            </div>
            <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-wrap">{t.body}</pre>
            {selected?.id === t.id && (
              <div className="mt-3 border-t pt-3">
                <div className="text-xs font-medium mb-2">Preview</div>
                {JSON.parse(t.variables || '[]').map((v: string) => (
                  <input key={v} placeholder={v} value={previewVars[v] || ''} onChange={e => setPreviewVars({...previewVars, [v]: e.target.value})} className="border rounded px-2 py-1 text-xs mr-2 mb-2" />
                ))}
                <button onClick={() => showPreview(t.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Preview</button>
                {preview && <div className="mt-2 text-sm bg-green-50 p-2 rounded">{preview}</div>}
              </div>
            )}
          </div>
        ))}
        {data.length === 0 && <div className="text-center text-gray-400 py-8">No templates</div>}
      </div>
    </div>
  );
}
