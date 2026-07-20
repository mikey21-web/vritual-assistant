import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  UserPlus, Flame, Globe, CalendarClock, XCircle, FileText, Timer,
  DollarSign, AlertTriangle, Copy, ChevronRight, Loader2
} from 'lucide-react';

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

export default function SmartLists() {
  const [lists, setLists] = useState<SmartList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/smart-lists').then(res => {
      if (Array.isArray(res)) setLists(res);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const navigateToList = (sl: SmartList) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sl.filters)) {
      params.set(k, v);
    }
    window.location.hash = `#/leads?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--muted-foreground)]">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading smart lists...
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Smart Lists</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Pre-built filtered views to help you focus on the right leads</p>
      </div>
      <div className="grid gap-3">
        {lists.map(sl => {
          const Icon = ICON_MAP[sl.icon] || ChevronRight;
          return (
            <button
              key={sl.id}
              onClick={() => navigateToList(sl)}
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
    </div>
  );
}
