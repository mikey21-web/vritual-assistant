import React, { useState, useEffect } from 'react';
import { fetchTimesheetEntries, createTimesheetEntry, fetchUsers, fetchEvents } from '../lib/data';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TimesheetPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ userId: '', eventId: '', role: '', date: '', hours: '' });

  const refresh = () => fetchTimesheetEntries().then(setEntries).catch(() => {});
  useEffect(() => {
    refresh();
    fetchUsers().then(setUsers).catch(() => {});
    fetchEvents(1).then(r => setEvents(r.data || [])).catch(() => {});
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTimesheetEntry({ ...form, hours: Number(form.hours) });
      setShowAdd(false);
      setForm({ userId: '', eventId: '', role: '', date: '', hours: '' });
      refresh();
      toast.success('Entry logged');
    } catch (err: any) { toast.error(err.message); }
  };

  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Timesheet</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Track hours per event and per employee.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Add entry
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[['Total hours', totalHours.toFixed(1)], ['Events tracked', new Set(entries.map(e => e.eventId)).size], ['Entries', entries.length]].map(([label, val]) => (
          <div key={label as string} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">{val}</div>
          </div>
        ))}
      </div>

      {showAdd && (
        <form onSubmit={add} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">Employee</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={form.eventId} onChange={e => setForm({ ...form, eventId: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">Event</option>
              {events.map((ev: any) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="Hours" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Add entry</button>
            <button type="button" onClick={() => setShowAdd(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-center py-12 text-sm text-[var(--muted-foreground)]">No timesheet entries yet. Log your first team member hours for an event.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
              <span className="text-[var(--foreground)]">{e.user?.name} — {e.event?.title}</span>
              <span className="text-[var(--muted-foreground)]">{e.hours}h</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
