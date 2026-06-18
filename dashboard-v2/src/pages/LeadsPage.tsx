import React, { useState, useEffect } from 'react';
import { fetchLeads, fetchLead, createLead, updateLead, scoreLead, assignLead, markSpam, getLeadTimeline } from '../lib/data';
import { useApp } from '../context/AppContext';
import { Search, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Lead, LeadStatus, LeadSegment } from '../lib/types';

export default function LeadsPage() {
  const { niche } = useApp();
  const [data, setData] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  const refresh = async (page = 1) => {
    setLoading(true);
    try {
      const filters: Record<string,string> = { search, status: statusFilter, segment: segmentFilter };
      const r = await fetchLeads(page, filters);
      setData(r.data); setMeta(r.meta);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [search, statusFilter, segmentFilter]);

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try { setTimeline(await getLeadTimeline(id)); } catch {}
  };

  const statusBadge = (s: LeadStatus) => {
    const m: Record<string,string> = { NEW: 'bg-blue-100 text-blue-700', CONTACTED: 'bg-amber-100 text-amber-700', ENGAGED: 'bg-indigo-100 text-indigo-700', QUALIFYING: 'bg-purple-100 text-purple-700', QUALIFIED: 'bg-emerald-100 text-emerald-700', CONVERTED: 'bg-green-100 text-green-700', LOST: 'bg-red-100 text-red-700', COLD: 'bg-gray-100 text-gray-600', SPAM: 'bg-rose-100 text-rose-700' };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m[s] || 'bg-gray-100'}`}>{s}</span>;
  };

  const segBadge = (s: LeadSegment) => {
    const m: Record<string,string> = { HOT: 'bg-red-100 text-red-700', WARM: 'bg-yellow-100 text-yellow-700', COLD: 'bg-gray-100 text-gray-600', UNQUALIFIED: 'bg-gray-100 text-gray-400' };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${m[s] || 'bg-gray-100'}`}>{s}</span>;
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{niche?.labels?.leads || 'Leads'} ({meta.total})</h2>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder={`Search ${niche?.labels?.lead?.toLowerCase() || 'lead'}s...`} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="">All Status</option>{['NEW','CONTACTED','ENGAGED','QUALIFYING','QUALIFIED','CONVERTED','LOST','COLD','SPAM'].map(s => <option key={s} value={s}>{s}</option>)}</select>
        <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="">All Segments</option>{['HOT','WARM','COLD','UNQUALIFIED'].map(s => <option key={s} value={s}>{s}</option>)}</select>
        <button onClick={() => refresh()} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Segment</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Agent</th><th className="px-4 py-3">Created</th></tr></thead>
          <tbody>
            {data.map(l => (
              <React.Fragment key={l.id}>
                <tr onClick={() => handleExpand(l.id)} className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3"><div className="font-medium text-xs">{l.contact?.name || 'Unknown'}</div><div className="text-xs text-gray-400">{l.contact?.phone || l.contact?.email}</div></td>
                  <td className="px-4 py-3 text-xs">{l.source}</td>
                  <td className="px-4 py-3">{statusBadge(l.status)}</td>
                  <td className="px-4 py-3">{segBadge(l.segment)}</td>
                  <td className="px-4 py-3 text-xs font-mono">{l.score}</td>
                  <td className="px-4 py-3 text-xs">{l.assignedAgent?.name || '-'}</td>
                  <td className="px-4 py-3 text-xs">{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
                {expandedId === l.id && (
                  <tr key={`${l.id}-exp`}><td colSpan={7} className="px-4 py-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="font-semibold mb-1">Details</div>
                        <p>Interest: {l.interest || '-'}</p>
                        <p>Budget: {l.budget || '-'}</p>
                        <p>Message: {l.message || '-'}</p>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Timeline ({timeline.length} events)</div>
                        {timeline.slice(0,5).map((t:any) => <p key={t.id} className="text-gray-500">{t.title} — {new Date(t.createdAt).toLocaleString()}</p>)}
                      </div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <div className="p-8 text-center text-gray-400">No {niche?.labels?.leads?.toLowerCase() || 'leads'} found</div>}
      </div>
    </div>
  );
}
