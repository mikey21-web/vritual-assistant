import React, { useState, useEffect } from 'react';
import { fetchEvents, createEvent, fetchContacts } from '../lib/data';
import { Plus, X, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, string> = {
  PLANNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  UPCOMING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const EVENT_TYPES = ['Wedding', 'Reception', 'Birthday', 'Corporate', 'Personal'];

export default function EventsPage() {
  const [data, setData] = useState<{ data: any[]; meta: any }>({ data: [], meta: {} });
  const [contacts, setContacts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ title: '', type: 'Wedding', eventDate: '', venue: '', expectedGuests: '', budget: '', contactId: '' });

  const refresh = () => fetchEvents(1, statusFilter ? { status: statusFilter } : {}).then(setData).catch(() => {});
  useEffect(() => { refresh(); }, [statusFilter]);
  useEffect(() => { fetchContacts(1).then(r => setContacts(r.data || [])).catch(() => {}); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEvent({
        ...form,
        expectedGuests: form.expectedGuests ? Number(form.expectedGuests) : undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        contactId: form.contactId || undefined,
      });
      setShowCreate(false);
      setForm({ title: '', type: 'Wedding', eventDate: '', venue: '', expectedGuests: '', budget: '', contactId: '' });
      refresh();
      toast.success('Event created');
    } catch (err: any) { toast.error(err.message); }
  };

  const items = data.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Events</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage and track all your events</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          >
            <option value="">All statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={16} /> Create event
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Event title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" required />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20">
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20">
              <option value="">No customer linked</option>
              {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" required />
            <input placeholder="Venue" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
            <input type="number" placeholder="Expected guests" value={form.expectedGuests} onChange={e => setForm({ ...form, expectedGuests: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
            <input type="number" placeholder="Budget" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Create event</button>
            <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
              <X size={14} />
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-50" />
            No events yet. Get started by creating your first event.
          </div>
        ) : (
          items.map((ev: any) => (
            <a key={ev.id} href={`#/events/${ev.id}`} className="block rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-[var(--foreground)]">{ev.title}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {ev.type} · {ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : 'No date'} · {ev.venue || 'No venue'} · {ev.contact?.name || 'No customer linked'}
                  </div>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ev.status] || STATUS_STYLES.PLANNING}`}>
                  {ev.status}
                </span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
