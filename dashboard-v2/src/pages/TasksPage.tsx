import React, { useState, useEffect } from 'react';
import { fetchTasks, createTask, updateTask } from '../lib/data';
import { Plus, CheckCircle, Circle, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TasksPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium', leadId: '', assigneeId: '' });

  const refresh = () => fetchTasks().then((r: any) => setData(r.data ? r : { data: r, meta: {} })).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => { e.preventDefault(); try { await createTask(form); setShowCreate(false); setForm({ title:'',priority:'medium',leadId:'',assigneeId:'' }); refresh(); toast.success('Task created'); } catch(e:any) { toast.error(e.message); } };
  const toggle = async (id: string, current: string) => { try { await updateTask(id, { status: current === 'done' ? 'pending' : 'done' }); refresh(); } catch(e:any) { toast.error(e.message); } };

  const items = Array.isArray(data.data) ? data.data : data;

  return (
    <div><div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Tasks</h2><button onClick={()=>setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14}/>New Task</button></div>
    {showCreate && <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-4 gap-3">
      <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="border rounded-lg px-3 py-2 text-sm col-span-2" required/>
      <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="border rounded-lg px-3 py-2 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
      <div className="flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm">Add</button><button type="button" onClick={()=>setShowCreate(false)} className="border px-3 py-1.5 rounded-lg text-sm"><X size={14}/></button></div>
    </form>}
    <div className="space-y-2">
      {Array.isArray(items) && items.map((t: any) => <div key={t.id} className="flex items-center gap-3 bg-white border rounded-xl p-3">
        <button onClick={()=>toggle(t.id, t.status)}>{t.status==='done'||t.status==='completed'?<CheckCircle size={18} className="text-green-500"/>:<Circle size={18} className="text-gray-300"/>}</button>
        <div className="flex-1"><div className={`text-sm ${t.status==='done'||t.status==='completed'?'line-through text-gray-400':''}`}>{t.title}</div><div className="text-xs text-gray-400">{t.lead?.contact?.name || t.leadId || ''}</div></div>
        <span className={`px-2 py-0.5 rounded text-xs ${t.priority==='high'?'bg-red-100 text-red-600':'bg-gray-100'}`}>{t.priority}</span>
      </div>)}
      {(!Array.isArray(items) || items.length===0) && <div className="text-center text-gray-400 py-8">No tasks</div>}
    </div></div>
  );
}
