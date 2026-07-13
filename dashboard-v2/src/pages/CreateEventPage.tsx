import React, { useState, useEffect } from 'react';
import { createEvent, fetchContacts } from '../lib/data';
import { CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';

const EVENT_TYPES = ['Wedding', 'Reception', 'Birthday', 'Corporate', 'Personal'];

function getQueryParam(name: string) {
  const hash = window.location.hash.replace('#', '');
  const q = hash.split('?')[1] || '';
  return new URLSearchParams(q).get(name) || '';
}

export default function CreateEventPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '', type: 'Wedding', eventDate: '', venue: '', expectedGuests: '', budget: '',
    description: '', status: 'PLANNING', contactId: getQueryParam('contactId'), leadId: getQueryParam('leadId'),
  });

  useEffect(() => { fetchContacts(1).then(r => setContacts(r.data || [])).catch(() => {}); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ev: any = await createEvent({
        ...form,
        expectedGuests: form.expectedGuests ? Number(form.expectedGuests) : undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        contactId: form.contactId || undefined,
        leadId: form.leadId || undefined,
      });
      toast.success('Event created');
      window.location.hash = `/events/${ev.id}`;
    } catch (err: any) { toast.error(err.message); }
  };

  const checklist = [
    { label: 'Customer linked', done: !!form.contactId || !!form.leadId },
    { label: 'Event date set', done: !!form.eventDate },
    { label: 'Venue set', done: !!form.venue },
    { label: 'Budget set', done: !!form.budget },
  ];

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Create new event</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Start with the essentials. You can add more from the event detail page later.</p>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Event title *</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
            className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Event type *</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20">
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">CRM customer</label>
            <select value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })}
              className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20">
              <option value="">No customer linked</option>
              {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Event date *</label>
            <input type="date" value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })} required
              className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Venue</label>
            <input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
              className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Expected guests</label>
            <input type="number" value={form.expectedGuests} onChange={e => setForm({ ...form, expectedGuests: e.target.value })}
              className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--muted-foreground)]">Budget (₹)</label>
            <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
              className="mt-1 w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)]">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
        </div>

        <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--muted)]">
          <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Event setup summary</h4>
          <ul className="space-y-1">
            {checklist.map(c => (
              <li key={c.label} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                {c.done ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-[var(--muted-foreground)]" />}
                {c.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Create event</button>
          <a href="#/events" className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors inline-flex items-center">Cancel</a>
        </div>
      </form>
    </div>
  );
}
