import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  UserPlus, Flame, Globe, CalendarClock, XCircle, FileText, Timer,
  DollarSign, AlertTriangle, Copy, ChevronRight, ChevronLeft, Loader2, Phone, MessageSquare
} from 'lucide-react';
import type { Lead } from '../lib/types';

const ICON_MAP: Record<string, any> = {
  UserPlus, Flame, Globe, CalendarClock, XCircle, FileText, Timer,
  DollarSign, AlertTriangle, Copy,
};

interface SmartList {
  id: number;
  name: string;
  description: string;
  icon: string;
  count: number;
  filters: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONTACTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ENGAGED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  QUALIFYING: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  QUALIFIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  LOST: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CONVERTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function SmartLists() {
  const [lists, setLists] = useState<SmartList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<SmartList | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  useEffect(() => {
    api('/smart-lists').then(res => {
      if (Array.isArray(res)) setLists(res);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedList) return;
    setLeadsLoading(true);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(selectedList.filters)) {
      params.set(k, v);
    }
    api(`/leads?${params.toString()}&limit=50`).then(res => {
      const data = res.data || res || [];
      setLeads(Array.isArray(data) ? data : []);
    }).catch(() => setLeads([])).finally(() => setLeadsLoading(false));
  }, [selectedList]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--muted-foreground)]">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading smart lists...
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {selectedList ? selectedList.name : 'Smart Lists'}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            {selectedList ? selectedList.description : 'Pre-built filtered views to help you focus on the right leads'}
          </p>
        </div>
        {selectedList && (
          <button onClick={() => { setSelectedList(null); setLeads([]); }}
            className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <ChevronLeft size={16} /> All lists
          </button>
        )}
      </div>

      {!selectedList && (
        <div className="grid gap-3">
          {lists.map(sl => {
            const Icon = ICON_MAP[sl.icon] || ChevronRight;
            return (
              <button
                key={sl.id}
                onClick={() => setSelectedList(sl)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)] hover:shadow-sm transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)]/20 transition-colors">
                  <Icon size={18} className="text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[var(--foreground)]">{sl.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{sl.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-7 min-w-[28px] px-2 rounded-full bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">{sl.count}</span>
                  <ChevronRight size={15} className="text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedList && leadsLoading && (
        <div className="flex items-center justify-center py-20 text-[var(--muted-foreground)]">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading leads...
        </div>
      )}

      {selectedList && !leadsLoading && leads.length === 0 && (
        <div className="text-center py-20 text-[var(--muted-foreground)]">
          No leads match this filter
        </div>
      )}

      {selectedList && !leadsLoading && leads.length > 0 && (
        <div className="grid gap-3">
          {leads.map(l => (
            <div
              key={l.id} onClick={() => window.location.hash = `#/leads/${l.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--accent)] hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="h-10 w-10 rounded-full bg-[var(--muted)] flex items-center justify-center shrink-0 text-sm font-semibold text-[var(--foreground)]">
                {(l.contact?.name || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-[var(--foreground)] truncate">{l.contact?.name || 'Unknown'}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-700'}`}>{l.status}</span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center gap-2">
                  <span>{l.contact?.phone || ''}</span>
                  {l.segment === 'HOT' && <span className="text-red-500 font-medium">● Hot</span>}
                  {l.interest && <span className="truncate">{l.interest}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {l.score > 0 && <span className="text-xs font-semibold text-[var(--primary)]">{l.score}</span>}
                <ChevronRight size={15} className="text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
