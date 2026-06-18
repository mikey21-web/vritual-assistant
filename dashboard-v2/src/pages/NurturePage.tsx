import React, { useState, useEffect } from 'react';
import { fetchNurtureSequences, createNurtureSequence, addNurtureStep, deleteNurtureStep, deleteNurtureSequence } from '../lib/data';
import { Plus, Trash2, X, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';

const stepTypes = ['SEND_WHATSAPP','SEND_EMAIL','WAIT','CHECK_CONDITION','UPDATE_LEAD_STATUS','PUSH_TO_CRM','SEND_BOOKING_LINK','CREATE_TASK'];

export default function NurturePage() {
  const [sequences, setSequences] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', leadList: 'all' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stepForm, setStepForm] = useState({ sequenceId: '', type: 'SEND_WHATSAPP', config: '{}', order: 0 });

  const refresh = () => fetchNurtureSequences().then((r: any) => setSequences(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => { e.preventDefault(); try { await createNurtureSequence(form); setShowCreate(false); setForm({name:'',leadList:'all'}); refresh(); toast.success('Created'); } catch(e:any) { toast.error(e.message); } };

  const addStep = async (e: React.FormEvent) => { e.preventDefault(); try { await addNurtureStep(stepForm.sequenceId, { ...stepForm, config: JSON.parse(stepForm.config) }); setStepForm({sequenceId:'',type:'SEND_WHATSAPP',config:'{}',order:0}); refresh(); toast.success('Step added'); } catch(e:any) { toast.error(e.message); } };

  const toggle = (id: string) => { setExpanded(expanded === id ? null : id); setStepForm({sequenceId:id,type:'SEND_WHATSAPP',config:'{}',order:(sequences.find(s=>s.id===id)?.steps?.length||0)+1}); };

  return (
    <div><div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Nurture Sequences</h2><button onClick={()=>setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14}/>New Sequence</button></div>
    {showCreate && <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 flex gap-3 items-end">
      <div><label className="text-xs text-gray-500 block mb-1">Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required/></div>
      <div><label className="text-xs text-gray-500 block mb-1">Lead List</label><select value={form.leadList} onChange={e=>setForm({...form,leadList:e.target.value})} className="border rounded-lg px-3 py-2 text-sm"><option value="all">All Leads</option><option value="hot">Hot Leads</option><option value="cold">Cold Leads</option></select></div>
      <div className="flex gap-2"><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Create</button><button type="button" onClick={()=>setShowCreate(false)} className="border px-3 py-2 rounded-lg text-sm"><X size={14}/></button></div>
    </form>}
    <div className="space-y-3">
      {sequences.map((s:any) => (<div key={s.id} className="bg-white border rounded-xl">
        <div className="p-4 flex justify-between items-center cursor-pointer" onClick={()=>toggle(s.id)}>
          <div><div className="font-medium text-sm">{s.name}</div><div className="text-xs text-gray-400">{s.steps?.length || 0} steps · {s.status || 'active'}</div></div>
          <div className="flex gap-2"><button onClick={(e)=>{e.stopPropagation();toggle(s.id);}} className="text-xs text-blue-600">{expanded===s.id?'Close':'Manage'}</button><button onClick={(e)=>{e.stopPropagation();deleteNurtureSequence(s.id);refresh();toast.success('Deleted');}} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div>
        </div>
        {expanded===s.id && <div className="border-t p-4">
          <div className="space-y-2 mb-4">{(s.steps||[]).map((st:any,i:number) => <div key={st.id||i} className="flex items-center justify-between bg-gray-50 rounded-lg p-2"><div className="text-xs">{i+1}. {st.type} {st.config && <span className="text-gray-400">— {JSON.stringify(st.config).slice(0,60)}</span>}</div><button onClick={()=>{deleteNurtureStep(s.id, st.id);refresh();}} className="text-red-400"><Trash2 size={12}/></button></div>)}</div>
          <form onSubmit={addStep} className="flex gap-2 items-end">
            <input type="number" placeholder="Order" value={stepForm.order||''} onChange={e=>setStepForm({...stepForm,order:parseInt(e.target.value)||0})} className="border rounded-lg px-2 py-1.5 text-xs w-16"/>
            <select value={stepForm.type} onChange={e=>setStepForm({...stepForm,type:e.target.value})} className="border rounded-lg px-2 py-1.5 text-xs">{stepTypes.map(t=><option key={t} value={t}>{t}</option>)}</select>
            <input placeholder='Config JSON' value={stepForm.config} onChange={e=>setStepForm({...stepForm,config:e.target.value})} className="border rounded-lg px-2 py-1.5 text-xs flex-1"/>
            <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs">Add Step</button>
          </form>
        </div>}
      </div>))}
    </div></div>
  );
}
