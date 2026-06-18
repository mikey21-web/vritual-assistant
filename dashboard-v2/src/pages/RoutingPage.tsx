import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RoutingPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', conditions: '{}', action: '{}' });

  const refresh = () => api('/routing-rules').then((r:any) => setData(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => { e.preventDefault(); try { await api('/routing-rules', { method:'POST', body: JSON.stringify({...form, conditions: JSON.parse(form.conditions), action: JSON.parse(form.action)}) }); setShowCreate(false); setForm({name:'',conditions:'{}',action:'{}'}); refresh(); toast.success('Created'); } catch(e:any) { toast.error(e.message); } };

  return (
    <div><div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Routing Rules</h2><button onClick={()=>setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14}/>Add</button></div>
    {showCreate && <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 gap-3">
      <input placeholder="Rule Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required/>
      <div><label className="text-xs text-gray-500 block mb-1">Conditions (JSON)</label><textarea value={form.conditions} onChange={e=>setForm({...form,conditions:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm h-16"/></div>
      <div><label className="text-xs text-gray-500 block mb-1">Action (JSON)</label><textarea value={form.action} onChange={e=>setForm({...form,action:e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm h-16"/></div>
      <div className="flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Save</button><button type="button" onClick={()=>setShowCreate(false)} className="border px-3 py-2 rounded-lg text-sm"><X size={14}/></button></div>
    </form>}
    <div className="space-y-3">{data.map((r:any) => <div key={r.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
      <div><div className="font-medium text-sm">{r.name}</div><div className="text-xs text-gray-400">{r.active ? 'Active' : 'Inactive'} · {JSON.stringify(r.conditions).slice(0,80)}</div></div>
      <button onClick={()=>{api(`/routing-rules/${r.id}`,{method:'DELETE'}).then(refresh);toast.success('Deleted');}} className="text-red-400"><Trash2 size={14}/></button>
    </div>)}</div></div>
  );
}
