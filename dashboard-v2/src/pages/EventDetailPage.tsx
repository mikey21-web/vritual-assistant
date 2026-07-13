import React, { useState, useEffect } from 'react';
import {
  fetchEvent, fetchEventFinancials, fetchEventFunctions, createEventFunction,
  fetchEventMoodboard, createEventMoodboardIdea, fetchEventTeam, assignEventTeamMember,
  fetchEventVendors, assignEventVendor, fetchEventFiles, createEventFile,
  fetchEventExpenses, createEventExpense, fetchEventMilestones, createEventMilestone,
  fetchEventRunSheet, createEventRunSheetItem,
} from '../lib/data';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['Overview', 'Functions', 'Moodboard', 'Tasks', 'Vendors', 'Team', 'Files', 'Expenses', 'Financials', 'Run Sheet', 'Payment milestones', 'Shared'];

function getEventId() {
  const hash = window.location.hash.replace('#', '');
  return hash.split('/')[2] || '';
}

function money(n: number | undefined) { return `₹${(n || 0).toLocaleString('en-IN')}`; }

function EmptyState({ label }: { label: string }) {
  return <div className="text-center py-10 text-sm text-[var(--muted-foreground)]">{label}</div>;
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (val: string) => Promise<void> }) {
  const [val, setVal] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim()) return;
    try { await onAdd(val); setVal(''); } catch (err: any) { toast.error(err.message); }
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input value={val} onChange={e => setVal(e.target.value)} placeholder={placeholder}
        className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
      <button type="submit" className="h-9 px-3 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 inline-flex items-center gap-1">
        <Plus size={14} /> Add
      </button>
    </form>
  );
}

export default function EventDetailPage() {
  const id = getEventId();
  const [event, setEvent] = useState<any>(null);
  const [tab, setTab] = useState('Overview');
  const [subData, setSubData] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchEvent(id).then(setEvent).catch(() => {}).finally(() => setLoading(false)); }, [id]);

  const loadTab = async (t: string) => {
    setTab(t);
    try {
      if (t === 'Functions') setSubData(await fetchEventFunctions(id));
      else if (t === 'Moodboard') setSubData(await fetchEventMoodboard(id));
      else if (t === 'Vendors') setSubData(await fetchEventVendors(id));
      else if (t === 'Team') setSubData(await fetchEventTeam(id));
      else if (t === 'Files') setSubData(await fetchEventFiles(id, 'INTERNAL'));
      else if (t === 'Shared') setSubData(await fetchEventFiles(id, 'SHARED'));
      else if (t === 'Expenses') setSubData(await fetchEventExpenses(id));
      else if (t === 'Payment milestones') setSubData(await fetchEventMilestones(id));
      else if (t === 'Run Sheet') setSubData(await fetchEventRunSheet(id));
      else if (t === 'Financials') setFinancials(await fetchEventFinancials(id));
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading…</div>;
  if (!event) return <div className="p-6 text-sm text-[var(--muted-foreground)]">Event not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <a href="#/events" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">← Back to events</a>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{event.title}</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--foreground)]">{event.type}</span>
        </div>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'No date'} · {event.venue || 'No venue'} · {event.expectedGuests || 0} guests · {money(event.budget)}
        </p>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
        {TABS.map(t => (
          <button key={t} role="tab" onClick={() => loadTab(t)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-[var(--primary)] text-[var(--foreground)] font-medium' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        {tab === 'Overview' && (
          <div className="text-sm text-[var(--muted-foreground)]">
            {event.contact?.name ? `Linked customer: ${event.contact.name}` : 'No customer linked'}
            {event.description && <p className="mt-2">{event.description}</p>}
          </div>
        )}

        {tab === 'Functions' && (
          <div className="space-y-4">
            <AddRow placeholder="Function name (e.g. Sangeet, Reception)" onAdd={async (name) => { await createEventFunction(id, { name }); loadTab('Functions'); }} />
            {subData.length === 0 ? <EmptyState label="No functions yet. Break this event into sessions or ceremonies." /> : (
              <ul className="space-y-2">{subData.map((f: any) => <li key={f.id} className="text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2">{f.name}</li>)}</ul>
            )}
          </div>
        )}

        {tab === 'Moodboard' && (
          <div className="space-y-4">
            <AddRow placeholder="Idea title" onAdd={async (title) => { await createEventMoodboardIdea(id, { title }); loadTab('Moodboard'); }} />
            {subData.length === 0 ? <EmptyState label="No moodboard ideas yet." /> : (
              <ul className="space-y-2">{subData.map((m: any) => <li key={m.id} className="text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2">{m.title} <span className="text-xs text-[var(--muted-foreground)]">({m.status})</span></li>)}</ul>
            )}
          </div>
        )}

        {tab === 'Tasks' && <EmptyState label="Event-scoped tasks appear here (create from the Tasks page with this event linked)." />}

        {tab === 'Vendors' && (
          <div className="space-y-4">
            <AddRow placeholder="Partner ID to assign" onAdd={async (partnerId) => { await assignEventVendor(id, { partnerId }); loadTab('Vendors'); }} />
            {subData.length === 0 ? <EmptyState label="No vendors assigned to this event yet." /> : (
              <ul className="space-y-2">{subData.map((v: any) => <li key={v.id} className="text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2">{v.partner?.name || v.partnerId} {v.roleOnEvent ? `— ${v.roleOnEvent}` : ''}</li>)}</ul>
            )}
          </div>
        )}

        {tab === 'Team' && (
          <div className="space-y-4">
            <AddRow placeholder="User ID to assign" onAdd={async (userId) => { await assignEventTeamMember(id, { userId }); loadTab('Team'); }} />
            {subData.length === 0 ? <EmptyState label="No team assigned yet." /> : (
              <ul className="space-y-2">{subData.map((t: any) => <li key={t.id} className="text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2">{t.user?.name || t.userId} {t.role ? `— ${t.role}` : ''}</li>)}</ul>
            )}
          </div>
        )}

        {(tab === 'Files' || tab === 'Shared') && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)]">{tab === 'Shared' ? 'Files uploaded here are visible to the linked client.' : 'Internal documents — not visible to clients.'}</p>
            {subData.length === 0 ? <EmptyState label="No files yet." /> : (
              <ul className="space-y-2">{subData.map((f: any) => <li key={f.id} className="text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2">{f.name}</li>)}</ul>
            )}
          </div>
        )}

        {tab === 'Expenses' && (
          <div className="space-y-4">
            <AddRow placeholder="Expense description" onAdd={async (description) => { await createEventExpense(id, { description, amount: 0 }); loadTab('Expenses'); }} />
            {subData.length === 0 ? <EmptyState label="No expenses logged yet." /> : (
              <ul className="space-y-2">{subData.map((e: any) => <li key={e.id} className="flex justify-between text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2"><span>{e.description}</span><span>{money(e.amount)}</span></li>)}</ul>
            )}
          </div>
        )}

        {tab === 'Financials' && financials && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['Budget', financials.budget], ['Invoiced', financials.invoiced], ['Collected', financials.collected],
              ['Pending receivables', financials.pendingReceivables], ['Expenses', financials.expenses],
              ['Projected profit', financials.projectedProfit], ['Actual profit', financials.actualProfit],
            ].map(([label, val]) => (
              <div key={label as string} className="rounded-lg border border-[var(--border)] p-3">
                <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
                <div className="text-lg font-semibold text-[var(--foreground)]">{money(val as number)}</div>
              </div>
            ))}
            <div className="rounded-lg border border-[var(--border)] p-3">
              <div className="text-xs text-[var(--muted-foreground)]">Margin</div>
              <div className="text-lg font-semibold text-[var(--foreground)]">{(financials.margin || 0).toFixed(1)}%</div>
              {financials.risk && <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Risk</span>}
            </div>
          </div>
        )}

        {tab === 'Run Sheet' && (
          <div className="space-y-4">
            <AddRow placeholder="Run sheet item title" onAdd={async (title) => { await createEventRunSheetItem(id, { title }); loadTab('Run Sheet'); }} />
            {subData.length === 0 ? <EmptyState label="No run sheet items yet." /> : (
              <ul className="space-y-2">{subData.map((r: any) => <li key={r.id} className="text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2">{r.title}</li>)}</ul>
            )}
          </div>
        )}

        {tab === 'Payment milestones' && (
          <div className="space-y-4">
            <AddRow placeholder="Milestone label" onAdd={async (label) => { await createEventMilestone(id, { label, amount: 0 }); loadTab('Payment milestones'); }} />
            {subData.length === 0 ? <EmptyState label="No payment milestones yet." /> : (
              <ul className="space-y-2">{subData.map((m: any) => <li key={m.id} className="flex justify-between text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2"><span>{m.label}</span><span>{money(m.amount)}</span></li>)}</ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
