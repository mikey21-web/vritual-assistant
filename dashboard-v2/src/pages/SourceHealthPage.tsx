import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Badge } from "../components/ui/badge";

const statusVariant: Record<string, "success" | "warning" | "secondary"> = {
  ACTIVE: "success",
  STALE: "warning",
  NEVER_CONNECTED: "secondary",
};

const providerLabels: Record<string, string> = {
  indiamart: "IndiaMART",
  "99acres": "99acres",
  justdial: "JustDial",
  magicbricks: "MagicBricks",
  housing: "Housing.com",
  tradeindia: "TradeIndia",
};

export default function SourceHealthPage() {
  const [health, setHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api("/portal-integrations/health");
      setHealth(res);
    } catch (e: any) {
      setError(e.message || "Failed to load connector health");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Lead Sources / Integration Health</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Portal webhook connectors and when they last sent a lead</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last lead received</TableHead>
            <TableHead>7-day volume</TableHead>
            <TableHead>Created / Duplicate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={5} className="text-center text-[var(--muted-foreground)] py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                <span>Loading connector health...</span>
              </div>
            </TableCell></TableRow>
          ) : error ? (
            <TableRow><TableCell colSpan={5} className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-red-500">{error}</span>
                <button onClick={load} className="text-xs text-[var(--primary)] hover:underline">Try again</button>
              </div>
            </TableCell></TableRow>
          ) : (
            health.map(h => (
              <TableRow key={h.provider}>
                <TableCell className="font-medium text-[var(--foreground)]">{providerLabels[h.provider] || h.provider}</TableCell>
                <TableCell><Badge variant={statusVariant[h.status] || "secondary"}>{h.status.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">{h.lastEventAt ? new Date(h.lastEventAt).toLocaleString() : "Never"}</TableCell>
                <TableCell className="text-sm text-[var(--foreground)]">{h.last7DaysCount}</TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">{h.createdCount7d} / {h.duplicateCount7d}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
