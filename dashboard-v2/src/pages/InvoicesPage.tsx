import React, { useState, useEffect } from 'react';
import { fetchInvoices, createInvoice, updateInvoice, fetchContacts, getInvoicePdf, sendInvoice } from '../lib/data';
import { Plus, FileText, Download, Send } from 'lucide-react';
import toast from 'react-hot-toast';

function money(n: number | undefined) { return `₹${(n || 0).toLocaleString('en-IN')}`; }

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ contactId: '', gstPercent: '18', description: '', qty: '1', unitPrice: '' });

  const refresh = () => fetchInvoices().then(r => setInvoices(r.data)).catch(() => {});
  useEffect(() => { refresh(); fetchContacts(1).then(r => setContacts(r.data || [])).catch(() => {}); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInvoice({
        contactId: form.contactId || undefined,
        gstPercent: Number(form.gstPercent),
        lineItems: [{ description: form.description, qty: Number(form.qty), unitPrice: Number(form.unitPrice) }],
      });
      setShowCreate(false);
      setForm({ contactId: '', gstPercent: '18', description: '', qty: '1', unitPrice: '' });
      refresh();
      toast.success('Invoice created');
    } catch (err: any) { toast.error(err.message); }
  };

  const markPaid = async (id: string) => {
    try { await updateInvoice(id, { status: 'PAID' }); refresh(); toast.success('Marked as paid'); }
    catch (err: any) { toast.error(err.message); }
  };

  const [busyId, setBusyId] = useState<string | null>(null);

  const downloadPdf = async (id: string) => {
    setBusyId(id);
    try {
      const { publicUrl } = await getInvoicePdf(id);
      window.open(publicUrl, '_blank');
    } catch (err: any) { toast.error(err.message || 'Could not generate PDF'); }
    finally { setBusyId(null); }
  };

  const send = async (id: string) => {
    setBusyId(id);
    try {
      const res = await sendInvoice(id, { channels: ['email', 'whatsapp'] });
      if (res.delivered) {
        const ok = Object.entries(res.results).filter(([, r]) => r.success).map(([c]) => c);
        const failed = Object.entries(res.results).filter(([, r]) => !r.success).map(([c, r]) => `${c}: ${r.error}`);
        toast.success(`Sent via ${ok.join(', ')}`);
        if (failed.length) toast.error(failed.join('  •  '));
        refresh();
      } else {
        const errs = Object.entries(res.results).map(([c, r]) => `${c}: ${r.error}`).join('  •  ');
        toast.error(`Nothing sent — ${errs}`);
      }
    } catch (err: any) { toast.error(err.message || 'Send failed'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Invoices</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Invoice value, receivables, and actual income are tracked separately — an invoice only becomes income when marked paid.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Create invoice
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">No customer linked</option>
              {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder="Line item description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="Unit price" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="Qty" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="number" placeholder="GST %" value={form.gstPercent} onChange={e => setForm({ ...form, gstPercent: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Create invoice</button>
            <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          </div>
        </form>
      )}

      {invoices.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          No invoices yet. Create your first invoice to get paid.
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div>
                <div className="font-medium text-[var(--foreground)]">{i.invoiceNumber} — {i.contact?.name || 'No customer linked'}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{money(i.grandTotal)}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[i.status] || STATUS_STYLES.DRAFT}`}>{i.status}</span>
                <button onClick={() => downloadPdf(i.id)} disabled={busyId === i.id} title="Download PDF"
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-[var(--border)] text-xs text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50">
                  <Download size={13} /> PDF
                </button>
                <button onClick={() => send(i.id)} disabled={busyId === i.id} title="Send to client via WhatsApp + email"
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50">
                  <Send size={13} /> {busyId === i.id ? 'Sending…' : 'Send'}
                </button>
                {i.status !== 'PAID' && <button onClick={() => markPaid(i.id)} className="text-xs text-[var(--primary)] hover:underline">Mark paid</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
