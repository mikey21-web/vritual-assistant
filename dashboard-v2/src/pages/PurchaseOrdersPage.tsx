import React, { useState, useEffect } from 'react';
import { fetchPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, fetchPartners } from '../lib/data';
import { Plus, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { Drawer } from '../components/ui/drawer';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';

function money(n: number | undefined) { return `₹${(n || 0).toLocaleString('en-IN')}`; }
const STATUSES = ['DRAFT', 'SUBMITTED', 'PARTIAL', 'RECEIVED', 'CANCELLED'];

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ partnerId: '', description: '', qty: '1', unitCost: '' });

  const refresh = () => fetchPurchaseOrders(statusFilter ? { status: statusFilter } : {}).then(r => setPos(r.data)).catch(() => {});
  useEffect(() => { refresh(); }, [statusFilter]);
  useEffect(() => { fetchPartners({ type: 'SUPPLIER' }).then(r => setPartners(r.data || [])).catch(() => {}); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPurchaseOrder({ partnerId: form.partnerId, lineItems: [{ description: form.description, qty: Number(form.qty), unitCost: Number(form.unitCost) }] });
      setShowCreate(false);
      setForm({ partnerId: '', description: '', qty: '1', unitCost: '' });
      refresh();
      toast.success('Purchase order created');
    } catch (err: any) { toast.error(err.message); }
  };

  const markReceived = async (id: string) => {
    try { await updatePurchaseOrder(id, { status: 'RECEIVED' }); refresh(); } catch (err: any) { toast.error(err.message); }
  };

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: pos.filter(p => p.status === s).length }), {} as Record<string, number>);
  const openValue = pos.filter(p => p.status !== 'RECEIVED' && p.status !== 'CANCELLED').reduce((s, p) => s + (p.totalValue || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Purchase Orders</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Order inventory and materials from your suppliers.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New PO
        </Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {STATUSES.map(s => (
          <div key={s} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-xs text-[var(--muted-foreground)]">{s}</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">{counts[s] || 0}</div>
          </div>
        ))}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="text-xs text-[var(--muted-foreground)]">Open value</div>
          <div className="text-lg font-semibold text-[var(--foreground)]">{money(openValue)}</div>
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)]">Purchase orders are for suppliers. To book vendors for event services, use Vendor Bookings from the event Vendors tab.</p>

      <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="max-w-xs">
        <option value="">All statuses</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </Select>

      <Drawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New purchase order"
        description="Order inventory or materials from a supplier."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" form="create-po-form">Create PO</Button>
          </>
        }
      >
        <form id="create-po-form" onSubmit={create} className="space-y-4">
          <Select label="Supplier" value={form.partnerId} onChange={e => setForm({ ...form, partnerId: e.target.value })} required>
            <option value="">Select supplier</option>
            {partners.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Item / description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Qty" type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} />
            <Input label="Unit cost" type="number" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} required />
          </div>
        </form>
      </Drawer>

      {pos.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <Package size={32} className="mx-auto mb-2 opacity-50" />
          No purchase orders yet. Create purchase orders to track inventory and material orders from suppliers.
        </div>
      ) : (
        <div className="space-y-2">
          {pos.map((po: any) => (
            <div key={po.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div>
                <div className="font-medium text-[var(--foreground)]">{po.partner?.name}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{money(po.totalValue)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--foreground)]">{po.status}</span>
                {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && <button onClick={() => markReceived(po.id)} className="text-xs text-[var(--primary)] hover:underline">Mark received</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
