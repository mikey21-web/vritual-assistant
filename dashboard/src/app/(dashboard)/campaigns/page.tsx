'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pause, Play, Copy } from 'lucide-react';

export default function CampaignsPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', sourceType: 'FORM', offer: '' });

  const refresh = () => api('/campaigns').then((r: any) => setData({ data: r.data || r, meta: r.meta || {} })).catch(e => toast.error(e.message));
  useEffect(() => { refresh(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api('/campaigns', { method: 'POST', body: JSON.stringify(form) }); setShowCreate(false); setForm({ name: '', sourceType: 'FORM', offer: '' }); refresh(); toast.success('Campaign created'); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggle = (id: string, active: boolean) => api(`/campaigns/${id}/${active ? 'pause' : 'activate'}`, { method: 'POST' }).then(refresh).catch(e => toast.error(e.message));
  const duplicate = (id: string) => api(`/campaigns/${id}/duplicate`, { method: 'POST' }).then(refresh).catch(e => toast.error(e.message));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Campaigns</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"><Plus size={16} /> Create</button>
      </div>
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input placeholder="Campaign Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
            <select value={form.sourceType} onChange={e => setForm({...form, sourceType: e.target.value})} className="border rounded px-3 py-2 text-sm">{['CAMPAIGN','FORM','QR_CODE','WHATSAPP','SOCIAL_MEDIA','PHONE_CALL'].map(s => <option key={s} value={s}>{s}</option>)}</select>
            <input placeholder="Offer" value={form.offer} onChange={e => setForm({...form, offer: e.target.value})} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 mt-3"><button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Save</button><button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-1.5 rounded text-sm">Cancel</button></div>
        </form>
      )}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Leads</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody>{data.data.map((c: any) => (<tr key={c.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium">{c.name}</td><td className="px-4 py-3">{c.sourceType}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{c.active ? 'Active' : 'Paused'}</span></td><td className="px-4 py-3">{c._count?.leads || 0}</td><td className="px-4 py-3 flex gap-2"><button onClick={() => toggle(c.id, c.active)} className="p-1 hover:bg-gray-100 rounded">{c.active ? <Pause size={14} /> : <Play size={14} />}</button><button onClick={() => duplicate(c.id)} className="p-1 hover:bg-gray-100 rounded"><Copy size={14} /></button></td></tr>))}</tbody>
        </table>
        {data.data.length === 0 && <div className="p-8 text-center text-gray-400">No campaigns</div>}
      </div>
    </div>
  );
}
