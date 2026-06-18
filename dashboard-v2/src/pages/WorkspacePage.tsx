import React, { useState, useEffect } from 'react';
import { fetchMyNiche } from '../lib/data';
import { Building2, Layers, CheckCircle, Globe } from 'lucide-react';

export default function WorkspacePage() {
  const [niche, setNiche] = useState<any>(null);

  useEffect(() => { fetchMyNiche().then(setNiche).catch(() => {}); }, []);

  if (!niche) return <div className="text-center text-gray-400 py-20">Loading...</div>;
  if (!niche.locked) return <div className="max-w-lg mx-auto text-center py-16"><Building2 size={48} className="mx-auto text-amber-400 mb-4"/><h2 className="font-semibold text-lg mb-2">No Workspace</h2><p className="text-gray-500 text-sm">{niche.reason || 'Not assigned to a client workspace.'}</p></div>;

  return (
    <div>
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 size={24} className="text-blue-700"/><div><h2 className="font-semibold text-lg">{niche.tenant?.name}</h2><div className="text-xs text-gray-400"><Globe size={10} className="inline"/>{niche.tenant?.industry} · Provisioned {niche.installedAt ? new Date(niche.installedAt).toLocaleDateString() : '-'}</div></div>
          <span className="ml-auto bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs flex items-center gap-1"><CheckCircle size={10}/>Active</span>
        </div>
        {niche.template && <div className="bg-blue-50 rounded-lg p-4"><div className="flex items-center gap-2 mb-2"><Layers size={14} className="text-blue-600"/><span className="font-medium text-sm text-blue-800">Template: {niche.template.name}</span></div>
        <div className="text-xs text-blue-600">Industry: {niche.template.industry} · Version: {niche.installedVersion} · Key: {niche.template.key}</div></div>}
      </div>
      <div className="bg-white rounded-xl border p-6"><h3 className="font-medium text-sm mb-3">Included in Your Workspace</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">{['Custom Fields','Pipeline Stages','Campaigns','Lead Forms','Message Templates','Scoring Rules','Routing Rules','Automation Rules','Nurture Sequences','Booking Settings','CRM Mappings','Reports'].map(item=><div key={item} className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1.5"><CheckCircle size={12} className="text-green-500"/>{item}</div>)}</div>
      </div>
    </div>
  );
}
