import React, { useState, useEffect } from 'react';
import { fetchStockMovements, createStockMovement, fetchInventoryItems, fetchInventoryLocations } from '../lib/data';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPES = ['RECEIVED', 'SHIPPED', 'TRANSFER', 'ADJUSTMENT'];

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ itemId: '', type: 'RECEIVED', qty: '', fromLocationId: '', toLocationId: '', refNotes: '' });

  const refresh = () => fetchStockMovements().then(r => setMovements(r.data)).catch(() => {});
  useEffect(() => {
    refresh();
    fetchInventoryItems().then(r => setItems(r.data || [])).catch(() => {});
    fetchInventoryLocations().then(setLocations).catch(() => {});
  }, []);

  const log = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStockMovement({ ...form, qty: Number(form.qty), fromLocationId: form.fromLocationId || undefined, toLocationId: form.toLocationId || undefined });
      setShowLog(false);
      setForm({ itemId: '', type: 'RECEIVED', qty: '', fromLocationId: '', toLocationId: '', refNotes: '' });
      refresh();
      toast.success('Movement logged');
    } catch (err: any) { toast.error(err.message); }
  };

  const counts = TYPES.reduce((acc, t) => ({ ...acc, [t]: movements.filter(m => m.type === t).length }), {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Stock movements</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Audit trail of every receipt, dispatch, transfer and adjustment.</p>
        </div>
        <button onClick={() => setShowLog(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Log movement
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {TYPES.map(t => (
          <div key={t} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-xs text-[var(--muted-foreground)]">{t}</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">{counts[t] || 0}</div>
          </div>
        ))}
      </div>

      {showLog && (
        <form onSubmit={log} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={form.itemId} onChange={e => setForm({ ...form, itemId: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">Item</option>
              {items.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" placeholder="Qty" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <select value={form.toLocationId} onChange={e => setForm({ ...form, toLocationId: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">To location</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Log movement</button>
            <button type="button" onClick={() => setShowLog(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          </div>
        </form>
      )}

      {movements.length === 0 ? (
        <p className="text-center py-12 text-sm text-[var(--muted-foreground)]">No movements yet. Use "Log movement" to record stock activity.</p>
      ) : (
        <div className="space-y-2">
          {movements.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
              <span className="text-[var(--foreground)]">{m.item?.name} — {m.type}</span>
              <span className="text-[var(--muted-foreground)]">{m.qty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
