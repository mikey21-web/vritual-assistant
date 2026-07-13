import React, { useState, useEffect } from 'react';
import { fetchQuotations, createQuotation, fetchContacts } from '../lib/data';
import { Plus, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

function money(n: number | undefined) { return `₹${(n || 0).toLocaleString('en-IN')}`; }
function sectionTotal(q: any) { return (q.sections || []).reduce((s: number, sec: any) => s + (sec.lineItems || []).reduce((ss: number, li: any) => ss + li.total, 0), 0); }

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ contactId: '', sectionTitle: 'Items', description: '', qty: '1', unitPrice: '', validUntil: '' });

  const refresh = () => fetchQuotations().then(r => setQuotations(r.data)).catch(() => {});
  useEffect(() => { refresh(); fetchContacts(1).then(r => setContacts(r.data || [])).catch(() => {}); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createQuotation({
        contactId: form.contactId || undefined,
        validUntil: form.validUntil || undefined,
        sections: [{ title: form.sectionTitle, lineItems: [{ description: form.description, qty: Number(form.qty), unitPrice: Number(form.unitPrice) }] }],
      });
      setShowCreate(false);
      setForm({ contactId: '', sectionTitle: 'Items', description: '', qty: '1', unitPrice: '', validUntil: '' });
      refresh();
      toast.success('Quotation created');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Quotations</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Build client-ready quotes from sections and line items.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={16} /> New quotation
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">Not selected</option>
              {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder="Section title" value={form.sectionTitle} onChange={e => setForm({ ...form, sectionTitle: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input placeholder="Line item description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="Qty" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="Unit price" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Create quotation</button>
            <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          </div>
        </form>
      )}

      {quotations.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          No quotations yet.
        </div>
      ) : (
        <div className="space-y-2">
          {quotations.map((q: any) => (
            <div key={q.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div>
                <div className="font-medium text-[var(--foreground)]">{q.quoteNumber} — {q.contact?.name || 'Not selected'}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{money(sectionTotal(q))}</div>
              </div>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--foreground)]">{q.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
