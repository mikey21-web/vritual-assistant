import React, { useState, useEffect } from 'react';
import { fetchNicheTemplates, fetchInstallations, publishTemplate, applyTemplate, dryRunTemplate } from '../lib/data';
import { Play, Eye, CheckCircle, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NicheTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);

  useEffect(() => {
    fetchNicheTemplates().then((t: any) => setTemplates(Array.isArray(t) ? t : [])).catch(() => {});
    fetchInstallations().then(setInstallations).catch(() => {});
  }, []);

  const handlePublish = async (id: string) => { await publishTemplate(id); toast.success('Published'); };
  const handleApply = async (id: string) => { await applyTemplate(id); toast.success('Applied'); fetchInstallations(); };
  const handlePreview = async (id: string) => {
    const r = await dryRunTemplate(id);
    toast.success(`${r.totalRecords} records across ${r.packs} packs`);
  };

  const grouped: Record<string, any[]> = {};
  templates.forEach(t => { if (!grouped[t.industry]) grouped[t.industry] = []; grouped[t.industry].push(t); });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Niche Templates</h2>
      {Object.entries(grouped).map(([industry, items]) => (
        <div key={industry} className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">{industry.replace(/_/g,' ')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(t => (
              <div key={t.id} className="bg-white border rounded-xl p-4">
                <div className="flex justify-between mb-2"><span className="font-medium text-sm">{t.name}</span><span className={`px-2 py-0.5 rounded text-xs ${t.status==='published'?'bg-green-100 text-green-700':'bg-yellow-100'}`}>{t.status}</span></div>
                <div className="text-xs text-gray-400 mb-3"><Layers size={12} className="inline mr-1"/>{t._count.packs} packs · v{t.version}</div>
                <div className="flex gap-1">
                  <button onClick={()=>handlePreview(t.id)} disabled={t.status!=='published'} className="flex items-center gap-1 border rounded px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"><Eye size={12}/>Preview</button>
                  <button onClick={()=>handleApply(t.id)} disabled={t.status!=='published'} className="flex items-center gap-1 bg-blue-600 text-white rounded px-2 py-1 text-xs hover:bg-blue-700 disabled:opacity-40"><Play size={12}/>Apply</button>
                  {t.status!=='published' && <button onClick={()=>handlePublish(t.id)} className="flex items-center gap-1 bg-green-600 text-white rounded px-2 py-1 text-xs"><CheckCircle size={12}/>Publish</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
