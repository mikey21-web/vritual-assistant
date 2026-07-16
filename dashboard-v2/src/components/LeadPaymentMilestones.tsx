import { useState, useEffect, useCallback } from "react";
import { IndianRupee, Plus, CheckCircle2, Clock, AlertTriangle, Ban } from "lucide-react";
import { api } from "../lib/api";
import toast from "react-hot-toast";
import { isFeatureEnabled } from "../lib/niche-config";

const statusMeta: Record<string, { color: string; icon: any }> = {
  PENDING: { color: "text-blue-600 dark:text-blue-400", icon: Clock },
  PAID: { color: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
  OVERDUE: { color: "text-red-600 dark:text-red-400", icon: AlertTriangle },
  WAIVED: { color: "text-gray-500", icon: Ban },
};

/** Compact payment-milestone list + quick-add, embedded in a lead's expanded row. */
export default function LeadPaymentMilestones({ leadId }: { leadId: string }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ label: "", amount: "", dueDate: "" });

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await api(`/payment-schedules?leadId=${leadId}`);
      setSchedules(Array.isArray(res) ? res : res.data || []);
    } catch { /* silent — this is a supplementary panel */ }
  }, [leadId]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  if (!isFeatureEnabled("paymentSchedules")) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/payment-schedules", {
        method: "POST",
        body: JSON.stringify({
          leadId,
          label: form.label,
          amount: Number(form.amount),
          dueDate: form.dueDate || undefined,
        }),
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Milestone added — reminders scheduled");
      setForm({ label: "", amount: "", dueDate: "" });
      setShowAdd(false);
      fetchSchedules();
    } catch { toast.error("Failed to add milestone"); }
  };

  const markPaid = async (id: string) => {
    try {
      await api(`/payment-schedules/${id}/mark-paid`, { method: "POST" });
      fetchSchedules();
    } catch { toast.error("Failed to update"); }
  };

  const formatMoney = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString()}`;
  };

  return (
    <div onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Payments</h4>
        <button onClick={() => setShowAdd(s => !s)} className="text-[11px] font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1">
          <Plus size={11} /> Add milestone
        </button>
      </div>

      {schedules.length === 0 && !showAdd && (
        <p className="text-sm text-[var(--muted-foreground)]">No payment milestones</p>
      )}

      <div className="space-y-1.5">
        {schedules.map((s: any) => {
          const meta = statusMeta[s.status] || statusMeta.PENDING;
          const Icon = meta.icon;
          return (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className={`inline-flex items-center gap-1.5 ${meta.color}`}>
                <Icon size={13} /> {s.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--foreground)]">{formatMoney(s.amount)}</span>
                {s.status === "PENDING" && (
                  <button onClick={() => markPaid(s.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:opacity-80">
                    Mark paid
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="mt-2 space-y-1.5">
          <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="e.g. Booking Amount"
            className="w-full h-7 rounded border border-[var(--border)] bg-[var(--background)] px-2 text-xs" />
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <IndianRupee size={11} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input required type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Amount"
                className="w-full h-7 rounded border border-[var(--border)] bg-[var(--background)] pl-5 pr-2 text-xs" />
            </div>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="h-7 rounded border border-[var(--border)] bg-[var(--background)] px-2 text-xs" />
          </div>
          <button type="submit" className="w-full h-7 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium">Create</button>
        </form>
      )}
    </div>
  );
}
