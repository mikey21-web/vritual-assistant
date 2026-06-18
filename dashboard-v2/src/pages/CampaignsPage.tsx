import React, { useState, useEffect } from 'react';
import { fetchCampaigns, createCampaign, toggleCampaign, duplicateCampaign } from '../lib/data';
import { Plus, Pause, Play, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CampaignsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', sourceType: 'FORM', offer: '' });

  const refresh = () => fetchCampaigns().then((r: any) => setItems(r.data || r)).catch(e => toast.error(e.message));
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => { e.preventDefault(); try { await createCampaign(form); setShow(false); setForm({ name:'',sourceType:'FORM',offer:'' }); refresh(); toast.success('Created'); } catch(e:any) { toast.error(e.message); } };

  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Campaigns</h2><button onClick={()=>setShow(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14} /> Create</button></div>
      {show && (
        <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4"><div className="grid grid-cols-3 gap-3">
          <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required />
          <select value={form.sourceType} onChange={e=>setForm({...form,sourceType:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">{['CAMPAIGN','FORM','QR_CODE','WHATSAPP','SOCIAL_MEDIA'].map(s=><option key={s} value={s}>{s}</option>)}</select>
          <input placeholder="Offer" value={form.offer} onChange={e=>setForm({...form,offer:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
        </div><div className="flex gap-2 mt-3"><button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm">Save</button><button type="button" onClick={()=>setShow(false)} className="border px-4 py-1.5 rounded-lg text-sm">Cancel</button></div></form>
      )}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Leads</th><th className="px-4 py-3">Actions</th></tr></thead>
        <tbody>{items.map((c:any) => <tr key={c.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium text-xs">{c.name}</td><td className="px-4 py-3 text-xs">{c.sourceType}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${c.active?'bg-green-100 text-green-700':'bg-gray-100'}`}>{c.active?'Active':'Paused'}</span></td><td className="px-4 py-3 text-xs">{c._count?.leads||0}</td><td className="px-4 py-3 flex gap-1"><button onClick={()=>toggleCampaign(c.id,c.active).then(refresh)} className="p-1 hover:bg-gray-100 rounded">{c.active?<Pause size={14}/>:<Play size={14}/>}</button><button onClick={()=>duplicateCampaign(c.id).then(refresh)} className="p-1 hover:bg-gray-100 rounded"><Copy size={14}/></button></td></tr>)}</tbody></table>
        {items.length===0 && <div className="p-8 text-center text-gray-400">No campaigns</div>}
      </div>
    </div>
  );
}
