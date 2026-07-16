import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, X, TrendingUp, IndianRupee, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  INACTIVE: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusOptions = Object.keys(statusColors);

export default function ChannelPartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [performanceFor, setPerformanceFor] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    name: "", company: "", phone: "", email: "", reraId: "", commissionRate: "", status: "ACTIVE", notes: "",
  });

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await api(`/channel-partners?${params}`);
      setPartners(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch { toast.error("Failed to load channel partners"); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const resetForm = () => setForm({ name: "", company: "", phone: "", email: "", reraId: "", commissionRate: "", status: "ACTIVE", notes: "" });

  const handleSave = async () => {
    try {
      const payload: any = {
        name: form.name,
        company: form.company || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        reraId: form.reraId || undefined,
        commissionRate: form.commissionRate ? Number(form.commissionRate) : undefined,
        status: form.status || "ACTIVE",
        notes: form.notes || undefined,
      };
      const headers = { "Content-Type": "application/json" };
      if (editing) {
        await api(`/channel-partners/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload), headers });
        toast.success("Channel partner updated");
      } else {
        await api("/channel-partners", { method: "POST", body: JSON.stringify(payload), headers });
        toast.success("Channel partner added");
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchPartners();
    } catch { toast.error("Failed to save channel partner"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this channel partner? Their leads will be kept but unlinked.")) return;
    try {
      await api(`/channel-partners/${id}`, { method: "DELETE" });
      toast.success("Channel partner removed");
      fetchPartners();
    } catch { toast.error("Failed to remove"); }
  };

  const editPartner = (p: any) => {
    setForm({
      name: p.name || "", company: p.company || "", phone: p.phone || "", email: p.email || "",
      reraId: p.reraId || "", commissionRate: p.commissionRate?.toString() || "", status: p.status || "ACTIVE",
      notes: p.notes || "",
    });
    setEditing(p);
    setShowForm(true);
  };

  const viewPerformance = async (id: string) => {
    setPerformanceFor(id);
    try {
      const res = await api(`/channel-partners/${id}/performance`);
      setPerformance(res);
    } catch { toast.error("Failed to load performance"); setPerformanceFor(null); }
  };

  const formatMoney = (n: number) => {
    if (!n) return "₹0";
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString()}`;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Channel Partners</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{total} brokers · leads sourced, converted, and commission owed</p>
        </div>
        <Button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Partner
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input placeholder="Search name, company, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
          <option value="">All Status</option>
          {statusOptions.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Company</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Commission</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Leads</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-[var(--muted-foreground)]">Loading...</td></tr>
            ) : partners.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-[var(--muted-foreground)]">No channel partners yet</td></tr>
            ) : partners.map((p: any) => (
              <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--foreground)]">{p.name}</td>
                <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{p.company || "-"}</td>
                <td className="px-4 py-3 text-sm">{p.phone || "-"}</td>
                <td className="px-4 py-3 text-sm">{p.commissionRate != null ? `${p.commissionRate}%` : "-"}</td>
                <td className="px-4 py-3 text-sm">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />{p._count?.leads ?? 0}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[p.status] || ""}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => viewPerformance(p.id)} title="View performance" className="p-1.5 hover:bg-[var(--accent)] rounded"><TrendingUp className="h-4 w-4" /></button>
                    <button onClick={() => editPartner(p)} className="p-1.5 hover:bg-[var(--accent)] rounded"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2 items-center">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-[var(--muted-foreground)]">Page {page} of {Math.ceil(total / 20)}</span>
          <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? "Edit Channel Partner" : "Add Channel Partner"}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Name *</label>
                <Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. Ramesh Kumar" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Brokerage / Company</label>
                <Input value={form.company} onChange={e => setForm((f: any) => ({ ...f, company: e.target.value }))} placeholder="e.g. Kumar Realty Associates" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Phone</label>
                <Input value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1"><IndianRupee className="h-3 w-3 inline" /> Commission (%)</label>
                <Input type="number" value={form.commissionRate} onChange={e => setForm((f: any) => ({ ...f, commissionRate: e.target.value }))} placeholder="e.g. 2" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
                  {statusOptions.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">RERA Agent ID</label>
                <Input value={form.reraId} onChange={e => setForm((f: any) => ({ ...f, reraId: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 min-h-[70px] text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name}>{editing ? "Update" : "Add"}</Button>
            </div>
          </div>
        </div>
      )}

      {performanceFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setPerformanceFor(null); setPerformance(null); }}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{performance?.name || "Performance"}</h2>
              <button onClick={() => { setPerformanceFor(null); setPerformance(null); }}><X className="h-5 w-5" /></button>
            </div>
            {!performance ? (
              <div className="text-sm text-[var(--muted-foreground)]">Loading...</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <div className="text-xs text-[var(--muted-foreground)] uppercase">Leads Sourced</div>
                  <div className="text-xl font-bold">{performance.totalLeads}</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <div className="text-xs text-[var(--muted-foreground)] uppercase">Converted</div>
                  <div className="text-xl font-bold">{performance.convertedLeads}</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <div className="text-xs text-[var(--muted-foreground)] uppercase">Conversion Rate</div>
                  <div className="text-xl font-bold">{(performance.conversionRate * 100).toFixed(1)}%</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <div className="text-xs text-[var(--muted-foreground)] uppercase">Deal Value</div>
                  <div className="text-xl font-bold">{formatMoney(performance.convertedValue)}</div>
                </div>
                <div className="col-span-2 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-3">
                  <div className="text-xs text-[var(--muted-foreground)] uppercase">Commission Owed ({performance.commissionRate}%)</div>
                  <div className="text-2xl font-bold text-[var(--primary)]">{formatMoney(performance.commissionOwed)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
