import React, { useState, useEffect } from 'react';
import { fetchIntegrations, createIntegration, deleteIntegration, testIntegration } from '../lib/data';
import { Plus, Trash2, TestTube2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function IntegrationsPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: '', name: '', config: '{}' });
  const types = ['n8n','WHATSAPP_CLOUD_API','TWILIO','HUBSPOT','SALESFORCE','ZOHO','GOOGLE_CALENDAR','CALENDLY','STRIPE','SMTP'];

  const refresh = () => fetchIntegrations().then((r:any) => setData(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => { e.preventDefault(); try { await createIntegration({...form, config: JSON.parse(form.config)}); setShowCreate(false); setForm({type:'',name:'',config:'{}'}); refresh(); toast.success('Created'); } catch(e:any) { toast.error(e.message); } };
  const test = async (id: string) => { try { const r = await testIntegration(id); toast.success(r.status+': '+r.message); refresh(); } catch(e:any) { toast.error(e.message); } };

  return (
    <div><div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Integrations</h2><button onClick={()=>setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14}/>Add</button></div>
    {showCreate && <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
      <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required><option value="">Select type</option>{types.map(t=><option key={t} value={t}>{t}</option>)}</select>
      <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" required/>
      <textarea placeholder='Config JSON' value={form.config} onChange={e=>setForm({...form,config:e.target.value})} className="col-span-2 border rounded-lg px-3 py-2 text-sm h-20"/>
      <div className="flex gap-2 col-span-2"><button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm">Save</button><button type="button" onClick={()=>setShowCreate(false)} className="border px-3 py-1.5 rounded-lg text-sm"><X size={14}/></button></div>
    </form>}
    <div className="space-y-3">{data.map((i:any)=><div key={i.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
      <div><div className="font-medium text-sm">{i.name}</div><div className="text-xs text-gray-400">{i.type} · <span className={i.status==='connected'?'text-green-600':'text-gray-400'}>{i.status}</span></div></div>
      <div className="flex gap-2"><button onClick={()=>test(i.id)} className="flex items-center gap-1 border px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50"><TestTube2 size={12}/>Test</button><button onClick={()=>{deleteIntegration(i.id);refresh();toast.success('Deleted');}} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div>
    </div>)}</div></div>
  );
}
