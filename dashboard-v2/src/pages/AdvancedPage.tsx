import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdvancedPage() {
  const [stages, setStages] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', order: 0 });

  const refresh = () => api('/pipeline-stages').then((r:any) => setStages(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => { e.preventDefault(); try { await api('/pipeline-stages', { method:'POST', body: JSON.stringify({...form, order: Number(form.order)}) }); setShowCreate(false); setForm({name:'',order:0}); refresh(); toast.success('Created'); } catch(e:any) { toast.error(e.message); } };

  return (
    <div><div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Pipeline Stages</h2><button onClick={()=>setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14}/>Add Stage</button></div>
    {showCreate && <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 flex gap-3 items-end">
      <div><label className="text-xs text-gray-500 block mb-1">Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required/></div>
      <div><label className="text-xs text-gray-500 block mb-1">Order</label><input type="number" value={form.order||''} onChange={e=>setForm({...form,order:parseInt(e.target.value)||0})} className="border rounded-lg px-3 py-2 text-sm w-20"/></div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Add</button>
    </form>}
    <div className="space-y-2">{stages.map((s:any)=><div key={s.id} className="bg-white border rounded-xl p-3 flex justify-between items-center"><div><span className="text-xs text-gray-400 mr-2">#{s.order}</span><span className="font-medium text-sm">{s.name}</span></div><button onClick={()=>{api(`/pipeline-stages/${s.id}`,{method:'DELETE'}).then(refresh);toast.success('Deleted');}} className="text-red-400"><Trash2 size={14}/></button></div>)}</div></div>
  );
}
