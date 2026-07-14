import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Building2, MapPin, BedDouble, Bath, Maximize, IndianRupee, ToggleLeft, ToggleRight, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { api } from "../lib/api";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  SOLD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  UNDER_OFFER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ON_HOLD: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  RENTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const typeLabels: Record<string, string> = {
  APARTMENT: "Apartment", VILLA: "Villa", PLOT: "Plot", COMMERCIAL: "Commercial",
  PENTHOUSE: "Penthouse", DUPLEX: "Duplex", STUDIO: "Studio",
};

const statusOptions = Object.keys(statusColors);
const typeOptions = Object.entries(typeLabels);

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ propertyType: "", status: "", bedrooms: "" });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    title: "", description: "", propertyType: "APARTMENT", price: "", bedrooms: "", bathrooms: "",
    areaSqft: "", location: "", address: "", features: "", amenities: "", reraId: "", status: "AVAILABLE",
  });

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("location", search);
      if (filters.propertyType) params.set("propertyType", filters.propertyType);
      if (filters.status) params.set("status", filters.status);
      if (filters.bedrooms) params.set("bedrooms", filters.bedrooms);
      const res = await api(`/properties?${params}`);
      setProperties(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch { toast.error("Failed to load properties"); }
    finally { setLoading(false); }
  }, [page, search, filters]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleSave = async () => {
    try {
      const payload: any = {
        title: form.title,
        propertyType: form.propertyType || undefined,
        price: form.price ? Number(form.price) : undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        areaSqft: form.areaSqft ? Number(form.areaSqft) : undefined,
        location: form.location || undefined,
        address: form.address || undefined,
        description: form.description || undefined,
        features: form.features ? form.features.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        amenities: form.amenities ? form.amenities.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        reraId: form.reraId || undefined,
        status: form.status || "AVAILABLE",
      };
      const headers = { "Content-Type": "application/json" };
      if (editing) {
        await api(`/properties/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload), headers });
        toast.success("Property updated");
      } else {
        await api("/properties", { method: "POST", body: JSON.stringify(payload), headers });
        toast.success("Property created");
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      fetchProperties();
    } catch { toast.error("Failed to save property"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this property?")) return;
    try {
      await api(`/properties/${id}`, { method: "DELETE" });
      toast.success("Property deleted");
      fetchProperties();
    } catch { toast.error("Failed to delete"); }
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    try {
      await api(`/properties/${id}`, { method: "PATCH", body: JSON.stringify({ featured: !current }), headers: { "Content-Type": "application/json" } });
      fetchProperties();
    } catch { toast.error("Failed to update"); }
  };

  const editProperty = (p: any) => {
    setForm({
      title: p.title || "",
      description: p.description || "",
      propertyType: p.propertyType || "APARTMENT",
      price: p.price?.toString() || "",
      bedrooms: p.bedrooms?.toString() || "",
      bathrooms: p.bathrooms?.toString() || "",
      areaSqft: p.areaSqft?.toString() || "",
      location: p.location || "",
      address: p.address || "",
      features: (p.features || []).join(", "),
      amenities: (p.amenities || []).join(", "),
      reraId: p.reraId || "",
      status: p.status || "AVAILABLE",
    });
    setEditing(p);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      title: "", description: "", propertyType: "APARTMENT", price: "", bedrooms: "", bathrooms: "",
      areaSqft: "", location: "", address: "", features: "", amenities: "", reraId: "", status: "AVAILABLE",
    });
  };

  const formatPrice = (p: number) => {
    if (!p) return "-";
    if (p >= 10000000) return `\u20B9${(p / 10000000).toFixed(2)} Cr`;
    if (p >= 100000) return `\u20B9${(p / 100000).toFixed(2)} L`;
    return `\u20B9${p.toLocaleString()}`;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Properties</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{total} listings</p>
        </div>
        <Button onClick={() => { resetForm(); setEditing(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Property
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input placeholder="Search by location..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <select value={filters.propertyType} onChange={e => { setFilters(f => ({ ...f, propertyType: e.target.value })); setPage(1); }} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
          <option value="">All Types</option>
          {typeOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
          <option value="">All Status</option>
          {statusOptions.map(k => <option key={k} value={k}>{k.replace("_", " ")}</option>)}
        </select>
        <select value={filters.bedrooms} onChange={e => { setFilters(f => ({ ...f, bedrooms: e.target.value })); setPage(1); }} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
          <option value="">All BHK</option>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} BHK</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Price</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Beds</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Featured</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-[var(--muted-foreground)]">Loading...</td></tr>
            ) : properties.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-[var(--muted-foreground)]">No properties found</td></tr>
            ) : properties.map((p: any) => (
              <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.images?.[0] && (
                      <img src={p.images[0].url} alt="" className="h-10 w-10 rounded object-cover" />
                    )}
                    <span className="font-medium text-[var(--foreground)]">{p.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge variant="outline">{typeLabels[p.propertyType] || p.propertyType}</Badge></td>
                <td className="px-4 py-3 font-mono text-sm">{formatPrice(p.price)}</td>
                <td className="px-4 py-3 text-sm">{p.bedrooms ? `${p.bedrooms}BHK` : "-"}</td>
                <td className="px-4 py-3 text-sm max-w-[150px] truncate">{p.location || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[p.status] || ""}`}>
                    {p.status?.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleFeatured(p.id, p.featured)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                    {p.featured ? <ToggleRight className="h-5 w-5 text-green-500 inline" /> : <ToggleLeft className="h-5 w-5 inline" />}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => editProperty(p)} className="p-1.5 hover:bg-[var(--accent)] rounded"><Edit2 className="h-4 w-4" /></button>
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
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? "Edit Property" : "Add Property"}</h2>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Title *</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. 3BHK Premium Apartment" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Type</label>
                <select value={form.propertyType} onChange={e => setForm(f => ({ ...f, propertyType: e.target.value }))} className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
                  {typeOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
                  {statusOptions.map(k => <option key={k} value={k}>{k.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1"><IndianRupee className="h-3 w-3 inline" /> Price</label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="In INR" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1"><BedDouble className="h-3 w-3 inline" /> Bedrooms</label>
                <Input type="number" value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1"><Bath className="h-3 w-3 inline" /> Bathrooms</label>
                <Input type="number" value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1"><Maximize className="h-3 w-3 inline" /> Area (sqft)</label>
                <Input type="number" value={form.areaSqft} onChange={e => setForm(f => ({ ...f, areaSqft: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1"><MapPin className="h-3 w-3 inline" /> Location</label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. HSR Layout, Bangalore" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Address</label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Features (comma separated)</label>
                <Input value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} placeholder="Gated community, Power backup, Car parking" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Amenities (comma separated)</label>
                <Input value={form.amenities} onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))} placeholder="Swimming pool, Gym, Clubhouse" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">RERA ID</label>
                <Input value={form.reraId} onChange={e => setForm(f => ({ ...f, reraId: e.target.value }))} placeholder="PRM/KA/RERA/1251/446/AG/171104/001715" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 min-h-[80px] text-sm" placeholder="Property description..." />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.title}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
