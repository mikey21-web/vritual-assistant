import React, { useState, useEffect } from 'react';
import { fetchContracts, createContract, fetchQuotations } from '../lib/data';
import { Plus, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

function money(n: number | undefined) { return `₹${(n || 0).toLocaleString('en-IN')}`; }

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ quotationId: '', amount: '' });

  const refresh = () => fetchContracts().then(r => setContracts(r.data)).catch(() => {});
  useEffect(() => { refresh(); fetchQuotations().then(r => setQuotations(r.data || [])).catch(() => {}); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createContract({ quotationId: form.quotationId || undefined, amount: form.amount ? Number(form.amount) : undefined });
      setShowCreate(false);
      setForm({ quotationId: '', amount: '' });
      refresh();
      toast.success('Contract created');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Contracts</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Convert accepted quotes into contracts, or create one directly. Invoices are generated from Event → Payment Milestones.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
          <Plus size={16} /> New contract
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.quotationId} onChange={e => setForm({ ...form, quotationId: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">No linked quotation</option>
              {quotations.map((q: any) => <option key={q.id} value={q.id}>{q.quoteNumber}</option>)}
            </select>
            <input type="number" placeholder="Amount (optional if linked to quotation)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Create contract</button>
            <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          </div>
        </form>
      )}

      {contracts.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          No contracts yet.
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="font-medium text-[var(--foreground)]">{c.contractNumber}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--muted-foreground)]">{money(c.amount)}</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--foreground)]">{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
