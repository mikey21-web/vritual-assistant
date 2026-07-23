import { useState, useEffect } from "react";
import { ArrowLeft, IndianRupee, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import toast from "react-hot-toast";

const statusOptions = ["ACTIVE", "INACTIVE", "SUSPENDED"];

function getRouteInfo() {
  const hash = window.location.hash.replace("#", "");
  const parts = hash.split("/").filter(Boolean); // ["channel-partners", id?, "edit"?]
  const isEdit = parts[2] === "edit";
  return { id: isEdit ? parts[1] : null, isEdit };
}

export default function AgentFormPage() {
  const { id, isEdit } = getRouteInfo();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", company: "", phone: "", email: "",
    reraId: "", commissionRate: "", status: "ACTIVE", notes: "",
  });

  useEffect(() => {
    if (!isEdit || !id) return;
    api(`/channel-partners/${id}`)
      .then((p: any) => setForm({
        name: p.name || "", company: p.company || "", phone: p.phone || "", email: p.email || "",
        reraId: p.reraId || "", commissionRate: p.commissionRate?.toString() || "",
        status: p.status || "ACTIVE", notes: p.notes || "",
      }))
      .catch(() => toast.error("Failed to load agent"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        company: form.company || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        reraId: form.reraId || undefined,
        commissionRate: form.commissionRate ? Number(form.commissionRate) : undefined,
        status: form.status,
        notes: form.notes || undefined,
      };
      const headers = { "Content-Type": "application/json" };
      if (isEdit && id) {
        await api(`/channel-partners/${id}`, { method: "PATCH", body: JSON.stringify(payload), headers });
        toast.success("Agent updated");
        window.location.hash = `/channel-partners/${id}`;
      } else {
        const created = await api("/channel-partners", { method: "POST", body: JSON.stringify(payload), headers });
        toast.success("Agent added");
        window.location.hash = `/channel-partners/${created.id}`;
      }
    } catch {
      toast.error("Failed to save agent");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in max-w-3xl">
      <div>
        <a href="#/channel-partners" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Agents
        </a>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <span>Dashboard</span> <span>/</span> <span>Real Estate</span> <span>/</span> <span>Agents</span> <span>/</span>
          <span className="text-[var(--foreground)] font-medium">{isEdit ? "Edit Agent" : "Add Agent"}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">{isEdit ? "Edit Agent" : "Add Agent"}</h1>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Agent Name *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter agent name" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Agency</label>
            <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Enter agency name" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Phone Number</label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Enter phone number" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Email Address</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Enter email address" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">RERA License ID</label>
            <Input value={form.reraId} onChange={e => setForm(f => ({ ...f, reraId: e.target.value }))} placeholder="Enter license number" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1"><IndianRupee className="h-3 w-3 inline" /> Commission (%)</label>
            <Input type="number" value={form.commissionRate} onChange={e => setForm(f => ({ ...f, commissionRate: e.target.value }))} placeholder="e.g. 2" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium block mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
              {statusOptions.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium block mb-1">Additional Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 min-h-[90px] text-sm"
              placeholder="Any additional notes about this agent..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-2 border-t border-[var(--border)]">
          <Button variant="outline" onClick={() => { window.location.hash = "/channel-partners"; }}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? "Saving..." : isEdit ? "Update Agent" : "Add Agent"}
          </Button>
        </div>
      </div>
    </div>
  );
}
