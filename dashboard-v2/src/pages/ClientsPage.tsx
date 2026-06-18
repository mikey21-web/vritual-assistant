import React, { useState, useEffect } from 'react';
import { fetchTenants, createTenant, deleteTenant, provisionTenant, fetchNicheTemplates } from '../lib/data';
import { Plus, Trash2, Building2, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Tenant } from '../lib/types';

export default function ClientsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [provisionId, setProvisionId] = useState<string | null>(null);
  const [form, setForm] = useState({ key: '', name: '', industry: '', contactEmail: '', contactName: '' });
  const [provForm, setProvForm] = useState({ templateId: '', adminEmail: '', adminPassword: '', adminName: '' });

  const refresh = () => fetchTenants().then((r: any) => setTenants(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); fetchNicheTemplates().then((t: any) => setTemplates(Array.isArray(t) ? t.filter((x:any) => x.status === 'published') : [])).catch(() => {}); }, []);

  const handleCreate = async () => {
    try { await createTenant(form); setShowCreate(false); setForm({ key:'', name:'', industry:'', contactEmail:'', contactName:'' }); refresh(); toast.success('Tenant created'); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleProvision = async () => {
    if (!provisionId) return;
    try { await provisionTenant(provisionId, provForm); setProvisionId(null); refresh(); toast.success('Provisioned!'); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Clients</h2><button onClick={()=>setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14}/> New Client</button></div>
      {showCreate && <div className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
        <input placeholder="Key" value={form.key} onChange={e=>setForm({...form,key:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
        <select value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Industry</option>{['events','real_estate','education','healthcare','b2b','finance','legal','travel','construction','automotive'].map(i=><option key={i} value={i}>{i}</option>)}
        </select>
        <input placeholder="Contact Name" value={form.contactName} onChange={e=>setForm({...form,contactName:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Contact Email" value={form.contactEmail} onChange={e=>setForm({...form,contactEmail:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2"><button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Create</button><button onClick={()=>setShowCreate(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button></div>
      </div>}
      {provisionId && <div className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
        <select value={provForm.templateId} onChange={e=>setProvForm({...provForm,templateId:e.target.value})} className="border rounded-lg px-3 py-2 text-sm"><option value="">Select template...</option>{templates.map(t=><option key={t.id} value={t.id}>{t.name} v{t.version}</option>)}</select>
        <input placeholder="Admin Name" value={provForm.adminName} onChange={e=>setProvForm({...provForm,adminName:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Admin Email" value={provForm.adminEmail} onChange={e=>setProvForm({...provForm,adminEmail:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
        <input type="password" placeholder="Admin Password" value={provForm.adminPassword} onChange={e=>setProvForm({...provForm,adminPassword:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2"><button onClick={handleProvision} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1"><Play size={12}/>Provision</button><button onClick={()=>setProvisionId(null)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button></div>
      </div>}
      <div className="space-y-3">{tenants.map(t=><div key={t.id} className="bg-white border rounded-xl p-4"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><Building2 size={16} className="text-gray-400"/><span className="font-medium">{t.name}</span><span className={`px-2 py-0.5 rounded text-xs ${t.status==='provisioned'?'bg-green-100 text-green-700':'bg-yellow-100'}`}>{t.status}</span></div><div className="text-xs text-gray-400 mt-1">Key: {t.key} · {t.industry} · {t._count.users} users · {t._count.leads} leads</div></div>
        <div className="flex gap-2">
          {t.status==='pending' && <button onClick={()=>{setProvisionId(t.id);setProvForm({templateId:'',adminEmail:t.contactEmail||'',adminPassword:'',adminName:t.contactName||''});}} className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded text-xs"><Play size={10}/>Provision</button>}
          <button onClick={()=>deleteTenant(t.id).then(refresh)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
        </div></div></div>)}</div>
    </div>
  );
}
