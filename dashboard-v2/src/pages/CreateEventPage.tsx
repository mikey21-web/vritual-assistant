import React, { useState, useEffect } from 'react';
import { createEvent, fetchContacts } from '../lib/data';
import { CheckCircle2, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Create new event</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Start with the essentials. Add optional setup only if you need it.</p>
      </div>

      <form id="create-event-form" onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event essentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Event title *"
                placeholder="e.g. Sharma-Kapoor wedding"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
              <Select label="Event type *" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <Select label="CRM customer" value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })}>
              <option value="">No customer linked</option>
              {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Event date *"
                type="date"
                value={form.eventDate}
                onChange={e => setForm({ ...form, eventDate: e.target.value })}
                required
              />
              <Input
                label="Venue"
                placeholder="Venue name & city"
                value={form.venue}
                onChange={e => setForm({ ...form, venue: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Expected guests"
                type="number"
                value={form.expectedGuests}
                onChange={e => setForm({ ...form, expectedGuests: e.target.value })}
              />
              <Input
                label="Budget (₹)"
                type="number"
                value={form.budget}
                onChange={e => setForm({ ...form, budget: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                className="w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3.5 py-2 text-sm text-[var(--foreground)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 focus:border-[var(--ring)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event setup summary</CardTitle>
            <CardDescription>A quick view of what is ready before you create.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5">
              {checklist.map(c => (
                <li key={c.label} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  {c.done ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-[var(--muted-foreground)]" />}
                  {c.label}
                </li>
              ))}
            </ul>
            <div className="space-y-2 pt-2">
              <Button type="submit" className="w-full">Create event</Button>
              <a href="#/events" className="block">
                <Button type="button" variant="outline" className="w-full">Cancel</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
