'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, GitMerge, MessageSquare, Save, AlertTriangle } from 'lucide-react';

export default function AdvancedPage() {
  const [activeTab, setActiveTab] = useState<'pipeline'|'blocklist'|'sla'|'merge'|'revenue'>('pipeline');
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [blocklist, setBlocklist] = useState<any[]>([]);
  const [sla, setSla] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any>({ data: [], meta: {} });
  const [newStage, setNewStage] = useState('');
  const [newBlock, setNewBlock] = useState({ type: 'email', value: '', reason: '' });
  const [merge, setMerge] = useState({ primaryId: '', secondaryId: '' });

  const refresh = (tab: string) => {
    if (tab === 'pipeline') api('/pipeline-stages').then(setPipeline);
    if (tab === 'blocklist') api('/blocklist').then(setBlocklist);
    if (tab === 'sla') api('/sla-rules').then(setSla);
    if (tab === 'revenue') api('/revenue').then((r: any) => setRevenue(r.data || r));
  };

  useEffect(() => { refresh(activeTab); }, [activeTab]);

  const addStage = async () => {
    if (!newStage) return;
    await api('/pipeline-stages', { method: 'POST', body: JSON.stringify({ name: newStage, order: pipeline.length + 1 }) });
    setNewStage(''); refresh('pipeline'); toast.success('Stage added');
  };

  const deleteStage = async (id: string) => { await api(`/pipeline-stages/${id}`, { method: 'DELETE' }); refresh('pipeline'); };

  const addBlock = async () => {
    await api('/blocklist', { method: 'POST', body: JSON.stringify(newBlock) });
    setNewBlock({ type: 'email', value: '', reason: '' }); refresh('blocklist'); toast.success('Blocked');
  };

  const deleteBlock = async (id: string) => { await api(`/blocklist/${id}`, { method: 'DELETE' }); refresh('blocklist'); };

  const handleMerge = async () => {
    await api('/contacts/merge', { method: 'POST', body: JSON.stringify(merge) });
    setMerge({ primaryId: '', secondaryId: '' }); toast.success('Contacts merged');
  };

  const tabs = [
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'blocklist', label: 'Blocklist' },
    { key: 'sla', label: 'SLA Rules' },
    { key: 'merge', label: 'Merge' },
    { key: 'revenue', label: 'Revenue' },
  ];

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Advanced Configuration</h2>
      <div className="flex gap-2 mb-6 border-b pb-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            className={`px-3 py-1.5 text-sm rounded-t ${activeTab === t.key ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'pipeline' && (
        <div>
          <div className="flex gap-2 mb-4">
            <input value={newStage} onChange={e => setNewStage(e.target.value)} placeholder="Stage name" className="border rounded px-3 py-2 text-sm flex-1" />
            <button onClick={addStage} className="bg-blue-600 text-white px-4 py-2 rounded text-sm"><Plus size={16} /> Add</button>
          </div>
          <div className="space-y-2">
            {pipeline.map((s: any, i: number) => (
              <div key={s.id} className="flex items-center justify-between bg-white border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm">{s.name}</span>
                  {s.isDefault && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Default</span>}
                  {s.isEnd && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded">End</span>}
                </div>
                <button onClick={() => deleteStage(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'blocklist' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
            <select value={newBlock.type} onChange={e => setNewBlock({...newBlock, type: e.target.value})} className="border rounded px-3 py-2 text-sm">
              <option value="email">Email</option><option value="phone">Phone</option>
            </select>
            <input value={newBlock.value} onChange={e => setNewBlock({...newBlock, value: e.target.value})} placeholder="Value" className="border rounded px-3 py-2 text-sm" />
            <input value={newBlock.reason} onChange={e => setNewBlock({...newBlock, reason: e.target.value})} placeholder="Reason" className="border rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={addBlock} className="bg-blue-600 text-white px-4 py-2 rounded text-sm mb-4">Block</button>
          <div className="space-y-2">
            {blocklist.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between bg-white border rounded-lg p-3">
                <div><span className="text-sm font-medium">{b.type}: {b.value}</span> {b.reason && <span className="text-xs text-gray-400 ml-2">({b.reason})</span>}</div>
                <button onClick={() => deleteBlock(b.id)} className="text-red-400"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sla' && (
        <div className="space-y-2">
          {sla.map((s: any) => (
            <div key={s.id} className="bg-white border rounded-lg p-4">
              <div className="font-medium text-sm">{s.name}</div>
              <div className="text-xs text-gray-500">Response: {s.responseTimeMinutes}min · Escalation after: {s.escalationAfterMinutes || 'N/A'}min</div>
            </div>
          ))}
          {sla.length === 0 && <div className="text-gray-400 text-sm">No SLA rules configured</div>}
        </div>
      )}

      {activeTab === 'merge' && (
        <div className="max-w-md">
          <div className="flex gap-2 mb-3">
            <input value={merge.primaryId} onChange={e => setMerge({...merge, primaryId: e.target.value})} placeholder="Primary Contact ID" className="border rounded px-3 py-2 text-sm flex-1" />
            <input value={merge.secondaryId} onChange={e => setMerge({...merge, secondaryId: e.target.value})} placeholder="Secondary Contact ID" className="border rounded px-3 py-2 text-sm flex-1" />
          </div>
          <button onClick={handleMerge} className="bg-orange-600 text-white px-4 py-2 rounded text-sm flex items-center gap-1"><GitMerge size={14} /> Merge Contacts</button>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div>
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th></tr></thead>
              <tbody>{revenue.data.map((r: any) => (<tr key={r.id} className="border-t"><td className="px-4 py-3 text-xs">{r.leadId}</td><td className="px-4 py-3">{r.currency} {r.amount}</td><td className="px-4 py-3">{r.type}</td><td className="px-4 py-3">{r.status}</td></tr>))}</tbody>
            </table>
            {revenue.data.length === 0 && <div className="p-8 text-center text-gray-400">No revenue records</div>}
          </div>
        </div>
      )}
    </div>
  );
}
