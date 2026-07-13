import React, { useState, useEffect } from 'react';
import { fetchInventoryItems, fetchInventoryStats, createInventoryItem, fetchInventoryLocations } from '../lib/data';
import { Plus, Box } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['audio', 'catering', 'decoration', 'furniture', 'lighting', 'mandap', 'other', 'shamiana', 'tents', 'visual'];

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
  const [locations, setLocations] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'other', sku: '', quantity: '', minStock: '', unit: '', locationId: '' });

  const refresh = () => { fetchInventoryItems().then(r => setItems(r.data)).catch(() => {}); fetchInventoryStats().then(setStats).catch(() => {}); };
  useEffect(() => { refresh(); fetchInventoryLocations().then(setLocations).catch(() => {}); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInventoryItem({ ...form, quantity: Number(form.quantity) || 0, minStock: Number(form.minStock) || 0, locationId: form.locationId || undefined });
      setShowCreate(false);
      setForm({ name: '', category: 'other', sku: '', quantity: '', minStock: '', unit: '', locationId: '' });
      refresh();
      toast.success('Item added');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Inventory items</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Your asset catalogue — quantities, minimums, and supplier details.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['Total items', stats.totalItems], ['Low stock', stats.lowStock], ['Out of stock', stats.outOfStock], ['Total value', `₹${(stats.totalValue || 0).toLocaleString('en-IN')}`]].map(([label, val]) => (
          <div key={label as string} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">{val}</div>
          </div>
        ))}
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="Min stock" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input placeholder="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <select value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">No location</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Create item</button>
            <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <Box size={32} className="mx-auto mb-2 opacity-50" />
          No inventory yet. Add your first item to track stock levels.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div>
                <div className="font-medium text-[var(--foreground)]">{i.name}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{i.category} · SKU {i.sku || '—'}</div>
              </div>
              <span className={`text-sm font-medium ${i.quantity <= i.minStock ? 'text-red-600' : 'text-[var(--foreground)]'}`}>{i.quantity} {i.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
