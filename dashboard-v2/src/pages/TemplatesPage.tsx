import React, { useState, useEffect } from 'react';
import { fetchTemplates, createTemplate, previewTemplate } from '../lib/data';
import { Plus, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TemplatesPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name:'', type:'WELCOME', channel:'WHATSAPP', body:'', variables:'["contact.name","business.name"]' });
  const [selected, setSelected] = useState<any>(null);
  const [previewVars, setPreviewVars] = useState<Record<string,string>>({});
  const [preview, setPreview] = useState('');

  const refresh = () => fetchTemplates().then(setData).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e:React.FormEvent) => { e.preventDefault(); try { await createTemplate({...form, variables: JSON.parse(form.variables)}); setShowCreate(false); refresh(); toast.success('Created'); } catch(e:any) { toast.error(e.message); } };
  const showPreview = async (id:string) => { try { const r = await previewTemplate(id, previewVars); setPreview(r.data?.rendered || r.rendered); } catch(e:any) { toast.error(e.message); } };

  return (
    <div><div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Message Templates</h2><button onClick={()=>setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14}/>Create</button></div>
    {showCreate && <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required/>
      <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">{['WELCOME','FOLLOW_UP','QUALIFICATION_QUESTION','RECONNECT','APPOINTMENT_LINK','THANK_YOU'].map(t=><option key={t} value={t}>{t}</option>)}</select>
      <select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">{['WHATSAPP','EMAIL','SMS'].map(c=><option key={c} value={c}>{c}</option>)}</select>
      <input placeholder='Variables (JSON array)' value={form.variables} onChange={e=>setForm({...form,variables:e.target.value})} className="border rounded-lg px-3 py-2 text-sm"/>
      <textarea placeholder="Message body with {{variables}}" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} className="col-span-2 border rounded-lg px-3 py-2 text-sm h-24" required/>
      <div className="flex gap-2 col-span-2"><button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm">Save</button><button type="button" onClick={()=>setShowCreate(false)} className="border px-3 py-1.5 rounded-lg text-sm"><X size={14}/></button></div>
    </form>}
    <div className="space-y-3">{data.map(t=><div key={t.id} className="bg-white border rounded-xl p-4">
      <div className="flex justify-between mb-2"><span className="font-medium text-sm">{t.name}</span><span className="text-xs text-gray-400">{t.type} · {t.channel} · v{t.version}</span>
        <button onClick={()=>{setSelected(t.id===selected?.id?null:t); setPreviewVars({}); setPreview('');}} className="text-blue-600 text-xs"><Eye size={14}/></button></div>
      <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{t.body}</pre>
      {selected?.id===t.id && <div className="mt-3 pt-3 border-t">
        {JSON.parse(t.variables||'[]').map((v:string)=><input key={v} placeholder={v} value={previewVars[v]||''} onChange={e=>setPreviewVars({...previewVars,[v]:e.target.value})} className="border rounded px-2 py-1 text-xs mr-2 mb-2"/>)}
        <button onClick={()=>showPreview(t.id)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Preview</button>
        {preview && <div className="mt-2 text-sm bg-green-50 p-2 rounded">{preview}</div>}
      </div>}
    </div>)}</div></div>
  );
}
