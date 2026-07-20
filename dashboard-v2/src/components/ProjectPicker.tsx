import { useState, useEffect, useRef } from 'react';
import { fetchProjects } from '../lib/data';
import { Search, X, ChevronDown, Building2 } from 'lucide-react';

interface Project {
  id: string; name: string; location?: string; unitSummary?: Record<string, number>;
}

export default function ProjectPicker({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = projects.find(p => p.id === value);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchProjects({ limit: '50', ...(search ? { search } : {}) })
      .then(r => setProjects(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalUnits = (s: Record<string, number> | undefined) => s ? Object.values(s).reduce((a, b) => a + b, 0) : 0;

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)} className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm flex items-center gap-2 cursor-pointer hover:border-[var(--ring)]/50 transition-colors">
        {selected ? (
          <span className="flex-1 truncate text-[var(--foreground)]">{selected.name}</span>
        ) : (
          <span className="flex-1 text-[var(--muted-foreground)]">Select project...</span>
        )}
        {value && <button onClick={e => { e.stopPropagation(); onChange('', ''); setSearch(''); }} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={14} /></button>}
        <ChevronDown size={14} className="text-[var(--muted-foreground)]" />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl max-h-60 overflow-hidden">
          <div className="p-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[var(--muted)]">
              <Search size={14} className="text-[var(--muted-foreground)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." autoFocus
                className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none" />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {loading ? (
              <div className="p-3 text-sm text-[var(--muted-foreground)] text-center">Loading...</div>
            ) : projects.length === 0 ? (
              <div className="p-3 text-sm text-[var(--muted-foreground)] text-center">No projects found</div>
            ) : projects.map(p => (
              <button key={p.id} onClick={() => { onChange(p.id, p.name); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--accent)] transition-colors ${p.id === value ? 'bg-[var(--accent)] font-medium' : ''}`}>
                <Building2 size={14} className="shrink-0 text-[var(--primary)]" />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-[11px] text-[var(--muted-foreground)]">{p.location || ''}{p.location && totalUnits(p.unitSummary) > 0 ? ' · ' : ''}{totalUnits(p.unitSummary) > 0 ? `${totalUnits(p.unitSummary)} units` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
