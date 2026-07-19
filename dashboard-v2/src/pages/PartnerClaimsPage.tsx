import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Badge } from "../components/ui/badge";

const claimStatusVariant: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  REGISTERED: "success",
  ALREADY_REGISTERED: "default",
  NEEDS_REVIEW: "warning",
  REJECTED: "destructive",
};

const accrualStatusVariant: Record<string, "default" | "success" | "secondary" | "destructive" | "warning"> = {
  PENDING: "warning",
  APPROVED: "success",
  PAID: "default",
  CLAWED_BACK: "destructive",
};

function formatPaise(paise?: string | number) {
  if (paise == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(paise) / 100);
}

export default function PartnerClaimsPage() {
  const [tab, setTab] = useState<"claims" | "commissions" | "leaderboard">("claims");
  const [claims, setClaims] = useState<any[]>([]);
  const [accruals, setAccruals] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a, l] = await Promise.all([api("/partner-lead-claims"), api("/commission-accruals"), api("/channel-partners/performance")]);
      setClaims(c.data || c);
      setAccruals(a.data || a);
      setLeaderboard(l);
    } catch (e: any) {
      toast.error(e.message || "Failed to load partner data");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, decision: "REGISTERED" | "REJECTED") => {
    const reason = window.prompt(`Reason for marking ${decision}?`) || undefined;
    try {
      await api(`/partner-lead-claims/${id}/resolve`, { method: "POST", body: JSON.stringify({ decision, reason }) });
      toast.success("Claim resolved");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to resolve");
    }
  };

  const approveAccrual = async (id: string) => {
    try {
      await api(`/commission-accruals/${id}/approve`, { method: "POST" });
      toast.success("Accrual approved");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    }
  };

  const needsReview = claims.filter(c => c.status === "NEEDS_REVIEW");

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Channel Partner Claims &amp; Commissions</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {needsReview.length > 0 ? `${needsReview.length} claim(s) need review` : "No disputes pending"}
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => setTab("claims")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "claims" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
        >Lead claims</button>
        <button
          onClick={() => setTab("commissions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "commissions" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
        >Commissions</button>
        <button
          onClick={() => setTab("leaderboard")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "leaderboard" ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
        >Leaderboard</button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
          <span className="text-sm text-[var(--muted-foreground)]">Loading...</span>
        </div>
      ) : tab === "claims" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[var(--muted-foreground)] py-8">No partner lead claims yet.</TableCell></TableRow>
            ) : claims.map(c => (
              <TableRow key={c.id}>
                <TableCell className="text-xs text-[var(--foreground)]">{c.phone}</TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">{c.channelPartnerId}</TableCell>
                <TableCell><Badge variant={claimStatusVariant[c.status] || "secondary"}>{c.status.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {c.status === "NEEDS_REVIEW" && (
                    <div className="flex gap-1">
                      <button onClick={() => resolve(c.id, "REGISTERED")} className="text-xs px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 inline-flex items-center gap-1"><Check size={12} /> Uphold</button>
                      <button onClick={() => resolve(c.id, "REJECTED")} className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1"><X size={12} /> Reject</button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : tab === "commissions" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>Booking</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accruals.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-[var(--muted-foreground)] py-8">No commission accruals yet.</TableCell></TableRow>
            ) : accruals.map(a => (
              <TableRow key={a.id}>
                <TableCell className="text-xs text-[var(--foreground)]">{a.channelPartnerId}</TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">{a.bookingId || "—"}</TableCell>
                <TableCell className="text-sm font-medium text-[var(--foreground)]">{formatPaise(a.amountPaise)}</TableCell>
                <TableCell><Badge variant={accrualStatusVariant[a.status] || "secondary"}>{a.status.replace(/_/g, " ")}</Badge></TableCell>
                <TableCell>
                  {a.status === "PENDING" && (
                    <button onClick={() => approveAccrual(a.id)} className="text-xs px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 inline-flex items-center gap-1"><Check size={12} /> Approve</button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partner</TableHead>
              <TableHead>Leads registered</TableHead>
              <TableHead>Disputed</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>Earned</TableHead>
              <TableHead>Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-[var(--muted-foreground)] py-8">No partner activity yet.</TableCell></TableRow>
            ) : leaderboard.map(p => (
              <TableRow key={p.channelPartnerId}>
                <TableCell className="text-sm font-medium text-[var(--foreground)]">{p.name}</TableCell>
                <TableCell className="text-xs text-[var(--foreground)]">{p.leadsRegistered}</TableCell>
                <TableCell className="text-xs text-[var(--foreground)]">{p.disputedClaims}</TableCell>
                <TableCell className="text-xs text-[var(--foreground)]">{p.bookingsWithCommission}</TableCell>
                <TableCell className="text-sm font-medium text-[var(--foreground)]">{formatPaise(p.commissionEarnedPaise)}</TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">{formatPaise(p.commissionPaidPaise)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
