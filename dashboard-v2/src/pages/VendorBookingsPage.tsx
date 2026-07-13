import React, { useState, useEffect } from 'react';
import { fetchVendorBookings, createVendorBooking, updateVendorBooking, fetchPartners, fetchEvents } from '../lib/data';
import { Plus, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

function money(n: number | undefined) { return `₹${(n || 0).toLocaleString('en-IN')}`; }
const STATUSES = ['DRAFT', 'SENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function VendorBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ partnerId: '', eventId: '', title: '', agreedFee: '', advanceAmount: '' });

  const refresh = () => fetchVendorBookings(statusFilter ? { status: statusFilter } : {}).then(r => setBookings(r.data)).catch(() => {});
  useEffect(() => { refresh(); }, [statusFilter]);
  useEffect(() => {
    fetchPartners().then(r => setPartners(r.data || [])).catch(() => {});
    fetchEvents(1).then(r => setEvents(r.data || [])).catch(() => {});
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVendorBooking({ ...form, agreedFee: Number(form.agreedFee) || 0, advanceAmount: Number(form.advanceAmount) || 0 });
      setShowCreate(false);
      setForm({ partnerId: '', eventId: '', title: '', agreedFee: '', advanceAmount: '' });
      refresh();
      toast.success('Vendor booking created');
    } catch (err: any) { toast.error(err.message); }
  };

  const advance = async (id: string, current: string) => {
    const idx = STATUSES.indexOf(current);
    const next = STATUSES[Math.min(idx + 1, STATUSES.length - 2)];
    try { await updateVendorBooking(id, { status: next }); refresh(); } catch (err: any) { toast.error(err.message); }
  };

  const counts = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    awaiting: bookings.filter(b => b.status === 'SENT').length,
    committed: bookings.reduce((s, b) => s + (b.agreedFee || 0), 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Vendor Bookings</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Booking orders sent to your event vendors.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={16} /> New Booking
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['Total bookings', counts.total], ['Confirmed', counts.confirmed], ['Awaiting confirmation', counts.awaiting], ['Total committed', money(counts.committed)]].map(([label, val]) => (
          <div key={label as string} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">{val}</div>
          </div>
        ))}
      </div>

      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)]">
        <option value="">All</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={form.partnerId} onChange={e => setForm({ ...form, partnerId: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">Select vendor</option>
              {partners.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">Link to event</option>
              {events.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="Agreed fee" value={form.agreedFee} onChange={e => setForm({ ...form, agreedFee: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="Advance amount" value={form.advanceAmount} onChange={e => setForm({ ...form, advanceAmount: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Create booking</button>
            <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          </div>
        </form>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <ClipboardList size={32} className="mx-auto mb-2 opacity-50" />
          No vendor booking orders yet. Create booking orders to document your vendor commitments.
        </div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b: any) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div>
                <div className="font-medium text-[var(--foreground)]">{b.title} — {b.partner?.name}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{money(b.agreedFee)} · Advance {money(b.advanceAmount)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--foreground)]">{b.status}</span>
                {b.status !== 'COMPLETED' && b.status !== 'CANCELLED' && <button onClick={() => advance(b.id, b.status)} className="text-xs text-[var(--primary)] hover:underline">Advance</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
