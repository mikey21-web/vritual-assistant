import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { fetchLeads } from "../lib/data";

interface Props {
  value: { id: string; label: string } | null;
  onChange: (lead: { id: string; label: string } | null) => void;
  placeholder?: string;
}

/** Type-ahead search over leads/buyers by name, email, or phone. */
export default function LeadPicker({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetchLeads(1, { search: query, limit: "8" } as any);
        if (!cancelled) setResults(res.data || []);
      } catch { if (!cancelled) setResults([]); }
      if (!cancelled) setLoading(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
        <span className="text-[var(--foreground)]">{value.label}</span>
        <button type="button" onClick={() => onChange(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || "Search by name, email, or phone..."}
          className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm"
        />
      </div>
      {open && query.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg">
          {loading ? (
            <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">No matches</div>
          ) : results.map((l: any) => (
            <button
              type="button"
              key={l.id}
              onClick={() => {
                onChange({ id: l.id, label: `${l.contact?.name || "Unknown"} — ${l.contact?.phone || l.contact?.email || ""}` });
                setQuery("");
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--muted)] transition-colors"
            >
              <div className="font-medium text-[var(--foreground)]">{l.contact?.name || "Unknown"}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{l.contact?.phone || l.contact?.email || ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
