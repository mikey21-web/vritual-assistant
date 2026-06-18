import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'SALES_AGENT' });

  const refresh = () => api('/users').then((r:any) => setUsers(Array.isArray(r) ? r : r.data || [])).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const invite = async (e: React.FormEvent) => { e.preventDefault(); try { await api('/users', { method:'POST', body: JSON.stringify(form) }); setShowInvite(false); setForm({email:'',name:'',role:'SALES_AGENT'}); refresh(); toast.success('Invited'); } catch(e:any) { toast.error(e.message); } };

  return (
    <div><div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Team</h2><button onClick={()=>setShowInvite(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"><UserPlus size={16}/>Invite</button></div>
    {showInvite && <form onSubmit={invite} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-3 gap-3 items-end">
      <div><label className="text-xs text-gray-500 block mb-1">Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-lg px-3 py-2 text-sm w-full" required/></div>
      <div><label className="text-xs text-gray-500 block mb-1">Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="border rounded-lg px-3 py-2 text-sm w-full" required/></div>
      <div className="flex gap-2"><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">{['SALES_AGENT','TEAM_LEAD','ADMIN','SUPER_ADMIN'].map(r=><option key={r} value={r}>{r}</option>)}</select>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Invite</button></div>
    </form>}
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
      <tbody>{users.map((u:any)=><tr key={u.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium text-xs">{u.name}</td><td className="px-4 py-3 text-xs">{u.email}</td><td className="px-4 py-3 text-xs">{u.role}</td><td className="px-4 py-3 text-xs">{u.status||'active'}</td><td className="px-4 py-3"><button onClick={()=>{api(`/users/${u.id}`,{method:'DELETE'}).then(refresh);toast.success('Removed');}} className="text-red-400"><Trash2 size={14}/></button></td></tr>)}</tbody></table>
    </div></div>
  );
}
