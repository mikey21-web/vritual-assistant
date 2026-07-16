import { useState, useEffect, useCallback } from "react";
import { Plus, X, MapPin, TrendingUp, Building2, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import toast from "react-hot-toast";

function getProjectId(): string {
  const hash = window.location.hash.replace('#', '');
  return hash.split('/')[2] || '';
}

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
  BLOCKED: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  BOOKED: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
  SOLD: "bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600",
  ON_HOLD: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
};

const statusOptions = Object.keys(statusColors);

export default function ProjectDetailPage() {
  const projectId = getProjectId();
  const [project, setProject] = useState<any>(null);
  const [grid, setGrid] = useState<any>(null);
  const [velocity, setVelocity] = useState<any>(null);
  const [showTowerForm, setShowTowerForm] = useState(false);
  const [towerForm, setTowerForm] = useState({ name: "", totalFloors: "" });
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitForm, setUnitForm] = useState<any>({ towerId: "", unitNumber: "", floor: "", unitType: "", areaSqft: "", price: "" });
  const [editingUnit, setEditingUnit] = useState<any>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, g, v] = await Promise.all([
        api(`/projects/${projectId}`),
        api(`/projects/${projectId}/grid`),
        api(`/projects/${projectId}/velocity`),
      ]);
      setProject(p);
      setGrid(g);
      setVelocity(v);
    } catch { toast.error("Failed to load project"); }
  }, [projectId]);

  useEffect(() => { if (projectId) refresh(); }, [projectId, refresh]);

  const addTower = async () => {
    try {
      await api(`/projects/${projectId}/towers`, {
        method: "POST",
        body: JSON.stringify({ name: towerForm.name, totalFloors: towerForm.totalFloors ? Number(towerForm.totalFloors) : undefined }),
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Tower added");
      setShowTowerForm(false);
      setTowerForm({ name: "", totalFloors: "" });
      refresh();
    } catch { toast.error("Failed to add tower"); }
  };

  const addUnit = async () => {
    try {
      await api(`/projects/${projectId}/units`, {
        method: "POST",
        body: JSON.stringify({
          towerId: unitForm.towerId || undefined,
          unitNumber: unitForm.unitNumber,
          floor: unitForm.floor ? Number(unitForm.floor) : undefined,
          unitType: unitForm.unitType || undefined,
          areaSqft: unitForm.areaSqft ? Number(unitForm.areaSqft) : undefined,
          price: unitForm.price ? Number(unitForm.price) : undefined,
        }),
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Unit added");
      setShowUnitForm(false);
      setUnitForm({ towerId: "", unitNumber: "", floor: "", unitType: "", areaSqft: "", price: "" });
      refresh();
    } catch { toast.error("Failed to add unit — check the unit number isn't already used in this project"); }
  };

  const updateUnitStatus = async (unitId: string, status: string) => {
    try {
      await api(`/units/${unitId}`, { method: "PATCH", body: JSON.stringify({ status }), headers: { "Content-Type": "application/json" } });
      toast.success(`Marked ${status.toLowerCase()}`);
      setEditingUnit(null);
      refresh();
    } catch { toast.error("Failed to update unit"); }
  };

  const formatMoney = (n: number) => {
    if (!n) return "-";
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${n.toLocaleString()}`;
  };

  if (!project || !grid || !velocity) {
    return <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading project...</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <a href="#/projects" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={14} /> All Projects
      </a>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{project.name}</h1>
          {project.location && <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] mt-1"><MapPin size={13} /> {project.location}</div>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTowerForm(true)}><Plus className="h-4 w-4 mr-1" /> Tower</Button>
          <Button onClick={() => setShowUnitForm(true)}><Plus className="h-4 w-4 mr-1" /> Unit</Button>
        </div>
      </div>

      {/* Velocity stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Total Units</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{velocity.totalUnits}</div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">% Sold</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">{velocity.percentSold}%</div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">% Sold or Booked</div>
          <div className="text-2xl font-bold text-[var(--primary)] inline-flex items-center gap-1"><TrendingUp size={16} />{velocity.percentMoving}%</div>
        </div>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Available</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{velocity.statusBreakdown.AVAILABLE}</div>
        </div>
      </div>

      {/* Monthly velocity trend */}
      {velocity.monthly.length > 0 && (
        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-5">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-3">Sales Velocity (last 12 months)</h3>
          <div className="flex items-end gap-2 h-24">
            {velocity.monthly.map((m: any) => {
              const max = Math.max(...velocity.monthly.map((x: any) => x.booked + x.sold), 1);
              const height = ((m.booked + m.sold) / max) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div className="text-[10px] text-[var(--muted-foreground)]">{m.booked + m.sold}</div>
                  <div className="w-full bg-[var(--primary)] rounded-t" style={{ height: `${Math.max(height, 4)}%` }} />
                  <div className="text-[10px] text-[var(--muted-foreground)]">{m.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Availability grid */}
      <div>
        <div className="flex items-center gap-4 mb-3 text-xs">
          {statusOptions.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded border ${statusColors[s]}`} /> {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        {grid.towers.map((tower: any) => (
          <div key={tower.towerId || "no-tower"} className="mb-6">
            <h3 className="font-semibold text-sm text-[var(--foreground)] mb-2 flex items-center gap-1.5">
              <Building2 size={14} /> {tower.towerName || "Units"}
            </h3>
            <div className="space-y-1.5">
              {tower.floors.map((f: any) => (
                <div key={f.floor} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)] w-14 shrink-0">{f.floor >= 0 ? `Floor ${f.floor}` : "—"}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {f.units.map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => setEditingUnit(u)}
                        title={`${u.unitNumber} · ${u.unitType || ""} · ${formatMoney(u.price)}${u.buyerName ? ` · ${u.buyerName}` : ''}`}
                        className={`h-9 min-w-[3.5rem] px-2 rounded border text-xs font-medium transition-transform hover:scale-105 ${statusColors[u.status] || ""}`}
                      >
                        {u.unitNumber}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tower form */}
      {showTowerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowTowerForm(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Add Tower</h2>
              <button onClick={() => setShowTowerForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <Input value={towerForm.name} onChange={e => setTowerForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tower A" />
            <Input type="number" value={towerForm.totalFloors} onChange={e => setTowerForm(f => ({ ...f, totalFloors: e.target.value }))} placeholder="Total floors (optional)" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTowerForm(false)}>Cancel</Button>
              <Button onClick={addTower} disabled={!towerForm.name}>Add</Button>
            </div>
          </div>
        </div>
      )}

      {/* Unit form */}
      {showUnitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowUnitForm(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Add Unit</h2>
              <button onClick={() => setShowUnitForm(false)}><X className="h-5 w-5" /></button>
            </div>
            {grid.towers.length > 0 && grid.towers[0].towerId && (
              <select value={unitForm.towerId} onChange={e => setUnitForm((f: any) => ({ ...f, towerId: e.target.value }))} className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
                <option value="">No tower</option>
                {grid.towers.map((t: any) => t.towerId && <option key={t.towerId} value={t.towerId}>{t.towerName}</option>)}
              </select>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input value={unitForm.unitNumber} onChange={e => setUnitForm((f: any) => ({ ...f, unitNumber: e.target.value }))} placeholder="Unit no. e.g. 502" />
              <Input type="number" value={unitForm.floor} onChange={e => setUnitForm((f: any) => ({ ...f, floor: e.target.value }))} placeholder="Floor" />
              <Input value={unitForm.unitType} onChange={e => setUnitForm((f: any) => ({ ...f, unitType: e.target.value }))} placeholder="e.g. 3BHK" />
              <Input type="number" value={unitForm.areaSqft} onChange={e => setUnitForm((f: any) => ({ ...f, areaSqft: e.target.value }))} placeholder="Area (sqft)" />
              <Input type="number" value={unitForm.price} onChange={e => setUnitForm((f: any) => ({ ...f, price: e.target.value }))} placeholder="Price (₹)" className="col-span-2" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowUnitForm(false)}>Cancel</Button>
              <Button onClick={addUnit} disabled={!unitForm.unitNumber}>Add</Button>
            </div>
          </div>
        </div>
      )}

      {/* Unit status editor */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingUnit(null)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Unit {editingUnit.unitNumber}</h2>
              <button onClick={() => setEditingUnit(null)}><X className="h-5 w-5" /></button>
            </div>
            <div className="text-sm text-[var(--muted-foreground)] space-y-1">
              <div>{editingUnit.unitType} · {formatMoney(editingUnit.price)}</div>
              {editingUnit.buyerName && <div>Buyer: {editingUnit.buyerName}</div>}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {statusOptions.map(s => (
                <button key={s} onClick={() => updateUnitStatus(editingUnit.id, s)}
                  className={`h-9 rounded-lg border text-xs font-medium ${statusColors[s]} ${editingUnit.status === s ? 'ring-2 ring-[var(--primary)]' : ''}`}>
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
