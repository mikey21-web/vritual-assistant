'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Plus, Play, Trash2, Building2, Users, Layers, Clock, Search, Loader2,
  Mail, User, Key, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Tenant {
  id: string;
  key: string;
  name: string;
  industry: string;
  status: string;
  contactEmail?: string;
  contactName?: string;
  createdAt: string;
  _count: { users: number; leads: number; campaigns: number };
  installations: { template: { key: string; name: string; industry: string } }[];
}

interface Template {
  id: string;
  key: string;
  name: string;
  industry: string;
  version: number;
  status: string;
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [provisionId, setProvisionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ key: '', name: '', industry: '', contactEmail: '', contactName: '' });
  const [provisionForm, setProvisionForm] = useState({ templateId: '', adminEmail: '', adminPassword: '', adminName: '' });

  const fetchTenants = () => api('/tenants?limit=200').then((r: any) => setTenants(r.data || r)).catch(e => toast.error(e.message));
  const fetchTemplates = () => api('/niche-templates').then((t: Template[]) => setTemplates(t.filter(t => t.status === 'published'))).catch(() => {});

  useEffect(() => { fetchTenants(); fetchTemplates(); }, []);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await api('/tenants', { method: 'POST', body: JSON.stringify(form) });
      toast.success('Tenant created');
      setShowCreate(false);
      setForm({ key: '', name: '', industry: '', contactEmail: '', contactName: '' });
      fetchTenants();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client? This cannot be undone.')) return;
    setLoading(true);
    try {
      await api(`/tenants/${id}?purgeData=true`, { method: 'DELETE' });
      toast.success('Tenant and all data deleted');
      fetchTenants();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const handleProvision = async () => {
    if (!provisionId) return;
    setLoading(true);
    try {
      await api(`/tenants/${provisionId}/provision`, {
        method: 'POST',
        body: JSON.stringify(provisionForm),
      });
      toast.success('Client provisioned! Login credentials ready.');
      setProvisionId(null);
      setProvisionForm({ templateId: '', adminEmail: '', adminPassword: '', adminName: '' });
      fetchTenants();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.key.toLowerCase().includes(search.toLowerCase()) ||
    t.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Clients</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700">
          <Plus size={14} /> New Client
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-gray-400" />
          <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="border rounded px-3 py-1.5 text-sm w-64" />
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">Create New Client</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 flex items-center gap-1"><Key size={10} /> Client Key</label>
                <input value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} placeholder="acme-corp" className="border rounded px-3 py-1.5 text-sm w-full mt-0.5" />
              </div>
              <div>
                <label className="text-xs text-gray-500 flex items-center gap-1"><Building2 size={10} /> Business Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Acme Corporation" className="border rounded px-3 py-1.5 text-sm w-full mt-0.5" />
              </div>
              <div>
                <label className="text-xs text-gray-500 flex items-center gap-1"><Globe size={10} /> Industry</label>
                <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} className="border rounded px-3 py-1.5 text-sm w-full mt-0.5">
                  <option value="">Select...</option>
                  <option value="events">Events & Entertainment</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="education">Education</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="b2b">B2B Services</option>
                  <option value="finance">Finance & Insurance</option>
                  <option value="legal">Legal</option>
                  <option value="travel">Travel & Hospitality</option>
                  <option value="construction">Construction</option>
                  <option value="automotive">Automotive</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 flex items-center gap-1"><User size={10} /> Contact Name</label>
                <input value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} className="border rounded px-3 py-1.5 text-sm w-full mt-0.5" />
              </div>
              <div>
                <label className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} /> Contact Email</label>
                <input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} className="border rounded px-3 py-1.5 text-sm w-full mt-0.5" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="border rounded px-4 py-1.5 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={loading || !form.key || !form.name || !form.industry} className="bg-blue-600 text-white rounded px-4 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-40">
                {loading ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {provisionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setProvisionId(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold mb-4">Provision {tenants.find(t => t.id === provisionId)?.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Niche Template</label>
                <select value={provisionForm.templateId} onChange={e => setProvisionForm({ ...provisionForm, templateId: e.target.value })} className="border rounded px-3 py-1.5 text-sm w-full mt-0.5">
                  <option value="">Select template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.industry}) v{t.version}</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-gray-400 bg-gray-50 rounded p-2">
                This will create all custom fields, pipelines, campaigns, forms, templates, and rules for this client.
              </div>
              <hr />
              <p className="text-xs font-medium text-gray-600">Client Admin Account (auto-created)</p>
              <div>
                <label className="text-xs text-gray-500">Admin Name</label>
                <input value={provisionForm.adminName} onChange={e => setProvisionForm({ ...provisionForm, adminName: e.target.value })} className="border rounded px-3 py-1.5 text-sm w-full mt-0.5" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Admin Email</label>
                <input value={provisionForm.adminEmail} onChange={e => setProvisionForm({ ...provisionForm, adminEmail: e.target.value })} className="border rounded px-3 py-1.5 text-sm w-full mt-0.5" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Admin Password</label>
                <input type="password" value={provisionForm.adminPassword} onChange={e => setProvisionForm({ ...provisionForm, adminPassword: e.target.value })} className="border rounded px-3 py-1.5 text-sm w-full mt-0.5" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setProvisionId(null)} className="border rounded px-4 py-1.5 text-sm">Cancel</button>
              <button onClick={handleProvision} disabled={loading || !provisionForm.templateId || !provisionForm.adminEmail || !provisionForm.adminPassword} className="bg-green-600 text-white rounded px-4 py-1.5 text-sm hover:bg-green-700 disabled:opacity-40">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <><Play size={14} className="inline mr-1" /> Provision</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(tenant => (
          <div key={tenant.id} className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={16} className="text-gray-400" />
                  <span className="font-medium">{tenant.name}</span>
                  <span className={clsx('px-1.5 py-0.5 rounded text-xs', tenant.status === 'provisioned' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                    {tenant.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1"><Key size={10} /> {tenant.key}</span>
                  <span className="flex items-center gap-1"><Globe size={10} /> {tenant.industry}</span>
                  <span className="flex items-center gap-1"><Users size={10} /> {tenant._count.users} users</span>
                  <span className="flex items-center gap-1"><Layers size={10} /> {tenant._count.leads} leads</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {new Date(tenant.createdAt).toLocaleDateString()}</span>
                </div>
                {tenant.installations.length > 0 && (
                  <div className="mt-2">
                    {tenant.installations.map(inst => (
                      <span key={inst.template.key} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs mr-2">
                        <Layers size={10} /> {inst.template.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {tenant.status === 'pending' && (
                  <button onClick={() => { setProvisionId(tenant.id); setProvisionForm({ templateId: '', adminEmail: tenant.contactEmail || '', adminPassword: '', adminName: tenant.contactName || '' }); }}
                    className="flex items-center gap-1 bg-green-600 text-white rounded px-2.5 py-1 text-xs hover:bg-green-700">
                    <Play size={12} /> Provision
                  </button>
                )}
                <button onClick={() => handleDelete(tenant.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {tenants.length === 0 && <div className="text-center text-gray-400 py-12">No clients yet. Create one to get started.</div>}
        {tenants.length > 0 && filtered.length === 0 && <div className="text-center text-gray-400 py-12">No clients match &quot;{search}&quot;</div>}
      </div>
    </div>
  );
}
