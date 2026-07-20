import { useState, useEffect, useRef } from 'react';
import { fetchUnits } from '../lib/data';
import { Search, X, ChevronDown, Home } from 'lucide-react';

interface Unit {
  id: string; unitNumber: string; floor?: number; unitType?: string; status?: string; price?: number; areaSqft?: number;
  tower?: { id: string; name: string };
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'text-green-600', BOOKED: 'text-blue-600', SOLD: 'text-red-600', ON_HOLD: 'text-amber-600', BLOCKED: 'text-gray-400',
};

export default function UnitPicker({ value, onChange, projectId }: { value: string; onChange: (id: string, label: string) => void; projectId?: string }) {
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = units.find(u => u.id === value);

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    fetchUnits({ projectId, limit: '100', ...(search ? { search } : {}) })
      .then(r => setUnits(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, projectId, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fmtPrice = (p?: number) => p != null ? `₹${(p / 100000).toFixed(1)}L` : '';

  return (
    <div ref={ref} className="relative">
      <div onClick={projectId ? () => setOpen(!open) : undefined} className={`w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm flex items-center gap-2 cursor-pointer transition-colors ${projectId ? 'hover:border-[var(--ring)]/50' : 'opacity-50 cursor-not-allowed'}`}>
        {selected ? (
          <span className="flex-1 truncate text-[var(--foreground)]">{selected.unitNumber}{selected.tower?.name ? ` - ${selected.tower.name}` : ''}{selected.unitType ? ` (${selected.unitType})` : ''}</span>
        ) : (
          <span className="flex-1 text-[var(--muted-foreground)]">{projectId ? 'Select unit...' : 'Select a project first'}</span>
        )}
        {value && <button onClick={e => { e.stopPropagation(); onChange('', ''); setSearch(''); }} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={14} /></button>}
        <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
      </div>
      {open && projectId && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl max-h-60 overflow-hidden">
          <div className="p-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[var(--muted)]">
              <Search size={14} className="text-[var(--muted-foreground)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search units..." autoFocus
                className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none" />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {loading ? (
              <div className="p-3 text-sm text-[var(--muted-foreground)] text-center">Loading...</div>
            ) : units.length === 0 ? (
              <div className="p-3 text-sm text-[var(--muted-foreground)] text-center">No units found</div>
            ) : units.map(u => (
              <button key={u.id} onClick={() => { onChange(u.id, `${u.unitNumber}${u.tower?.name ? ` - ${u.tower.name}` : ''}`); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--accent)] transition-colors ${u.id === value ? 'bg-[var(--accent)] font-medium' : ''}`}>
                <Home size={14} className="shrink-0 text-[var(--primary)]" />
                <span className="flex-1 truncate">{u.unitNumber}{u.tower?.name ? <span className="text-[var(--muted-foreground)]"> - {u.tower.name}</span> : ''}</span>
                <span className="text-[11px] text-[var(--muted-foreground)]">{u.unitType || ''}{u.unitType && fmtPrice(u.price) ? ' · ' : ''}{fmtPrice(u.price)}</span>
                {u.status && <span className={`text-[10px] font-medium ${STATUS_COLORS[u.status] || 'text-gray-500'}`}>{u.status}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
