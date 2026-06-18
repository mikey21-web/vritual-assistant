import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, X, TestTube2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CRMPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', crmType: 'HUBSPOT', fieldMappings: '{}' });

  const refresh = () => api('/crm-mappings').then((r:any) => setData(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => { e.preventDefault(); try { await api('/crm-mappings', { method:'POST', body: JSON.stringify({...form, fieldMappings: JSON.parse(form.fieldMappings)}) }); setShowCreate(false); setForm({name:'',crmType:'HUBSPOT',fieldMappings:'{}'}); refresh(); toast.success('Created'); } catch(e:any) { toast.error(e.message); } };

  const test = async (id: string) => { const r = await api(`/crm-mappings/${id}/test`, { method:'POST' }); toast.success(r.status + ': ' + r.message); };

  return (
    <div><div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">CRM Mappings</h2><button onClick={()=>setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14}/>Add</button></div>
    {showCreate && <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required/>
      <select value={form.crmType} onChange={e=>setForm({...form,crmType:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">{['HUBSPOT','SALESFORCE','ZOHO'].map(c=><option key={c} value={c}>{c}</option>)}</select>
      <textarea placeholder='Field mappings JSON' value={form.fieldMappings} onChange={e=>setForm({...form,fieldMappings:e.target.value})} className="col-span-2 border rounded-lg px-3 py-2 text-sm h-16"/>
      <div className="flex gap-2 col-span-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Save</button><button type="button" onClick={()=>setShowCreate(false)} className="border px-3 py-2 rounded-lg text-sm"><X size={14}/></button></div>
    </form>}
    <div className="space-y-3">{data.map((m:any) => <div key={m.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
      <div><div className="font-medium text-sm">{m.name}</div><div className="text-xs text-gray-400">{m.crmType} · {m.status || 'active'}</div></div>
      <div className="flex gap-2"><button onClick={()=>test(m.id)} className="flex items-center gap-1 border px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50"><TestTube2 size={12}/>Test</button><button onClick={()=>{api(`/crm-mappings/${m.id}`,{method:'DELETE'}).then(refresh);toast.success('Deleted');}} className="text-red-400"><Trash2 size={14}/></button></div>
    </div>)}</div></div>
  );
}
