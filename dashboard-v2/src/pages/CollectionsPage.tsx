import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import toast from "react-hot-toast";
import { Plus, Check, Undo2, Search } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Badge } from "../components/ui/badge";

const statusVariant: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  PENDING_RECONCILIATION: "warning",
  CONFIRMED: "success",
  REVERSED: "destructive",
  FAILED: "destructive",
};

function formatPaise(paise?: string | number) {
  if (paise == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(paise) / 100);
}

export default function CollectionsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecord, setShowRecord] = useState(false);
  const [ledgerLeadId, setLedgerLeadId] = useState("");
  const [ledger, setLedger] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api("/collections/receipts");
      setReceipts(res.data || res);
    } catch (e: any) {
      setError(e.message || "Failed to load receipts");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirm = async (id: string) => {
    try {
      await api(`/collections/receipts/${id}/confirm`, { method: "POST" });
      toast.success("Payment confirmed");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to confirm");
    }
  };

  const reverse = async (id: string) => {
    const reason = window.prompt("Reason for reversal?");
    if (!reason) return;
    try {
      await api(`/collections/receipts/${id}/reverse`, { method: "POST", body: JSON.stringify({ reason }) });
      toast.success("Payment reversed");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to reverse");
    }
  };

  const loadLedger = async () => {
    if (!ledgerLeadId) return;
    try {
      const res = await api(`/collections/ledger/${ledgerLeadId}`);
      setLedger(res);
    } catch (e: any) {
      toast.error(e.message || "Failed to load ledger");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Collections</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{receipts.length} receipts</p>
        </div>
        <button
          onClick={() => setShowRecord(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> Record payment
        </button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Received</TableHead>
            <TableHead>Buyer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={6} className="text-center text-[var(--muted-foreground)] py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                <span>Loading receipts...</span>
              </div>
            </TableCell></TableRow>
          ) : error ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-red-500">{error}</span>
                <button onClick={load} className="text-xs text-[var(--primary)] hover:underline">Try again</button>
              </div>
            </TableCell></TableRow>
          ) : receipts.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-[var(--muted-foreground)] py-8">
              No payments recorded yet.
            </TableCell></TableRow>
          ) : (
            receipts.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-[var(--foreground)] whitespace-nowrap">{new Date(r.receivedAt).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">{r.leadId}</TableCell>
                <TableCell className="text-sm font-medium text-[var(--foreground)]">{formatPaise(r.amountPaise)}</TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">{r.mode}</TableCell>
                <TableCell><Badge variant={statusVariant[r.status] || "secondary"}>{r.status.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.status === "PENDING_RECONCILIATION" && (
                      <button onClick={() => confirm(r.id)} className="text-xs px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 inline-flex items-center gap-1"><Check size={12} /> Confirm</button>
                    )}
                    {r.status === "CONFIRMED" && (
                      <button onClick={() => reverse(r.id)} className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1"><Undo2 size={12} /> Reverse</button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Buyer ledger lookup</h2>
        <div className="flex gap-2 mb-3">
          <input
            placeholder="Lead ID"
            value={ledgerLeadId}
            onChange={e => setLedgerLeadId(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
          />
          <button onClick={loadLedger} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--accent)] inline-flex items-center gap-1"><Search size={14} /> Look up</button>
        </div>
        {ledger && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Balance: {formatPaise(ledger.balancePaise)}</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Running balance</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.entries.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">{new Date(e.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs text-[var(--foreground)]">{e.type}</TableCell>
                    <TableCell className="text-xs text-[var(--foreground)]">{formatPaise(e.amountPaise)}</TableCell>
                    <TableCell className="text-xs text-[var(--foreground)]">{formatPaise(e.runningBalancePaise)}</TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">{e.description || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {showRecord && <RecordPaymentModal onClose={() => setShowRecord(false)} onDone={() => { setShowRecord(false); load(); }} />}
    </div>
  );
}

function RecordPaymentModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [leadId, setLeadId] = useState("");
  const [amountPaise, setAmountPaise] = useState("");
  const [mode, setMode] = useState("UPI");
  const [externalRef, setExternalRef] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!leadId || !amountPaise) { toast.error("Lead and amount are required"); return; }
    setSaving(true);
    try {
      await api("/collections/receipts", {
        method: "POST",
        body: JSON.stringify({ leadId, amountPaise: Number(amountPaise), mode, externalRef: externalRef || undefined }),
      });
      toast.success("Payment recorded — pending reconciliation");
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Failed to record payment");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-4">Record a payment</h2>
        <div className="space-y-3">
          <input placeholder="Lead ID" value={leadId} onChange={e => setLeadId(e.target.value)} className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          <input type="number" placeholder="Amount (paise)" value={amountPaise} onChange={e => setAmountPaise(e.target.value)} className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          <select value={mode} onChange={e => setMode(e.target.value)} className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
            {["UPI", "NEFT", "CHEQUE", "CARD", "CASH", "GATEWAY"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input placeholder="Reference (UTR/cheque no.) — optional" value={externalRef} onChange={e => setExternalRef(e.target.value)} className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)]">Cancel</button>
          <button onClick={submit} disabled={saving} className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Recording..." : "Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
