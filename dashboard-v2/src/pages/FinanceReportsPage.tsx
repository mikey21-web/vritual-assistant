import React, { useState } from 'react';
import { fetchProfitAndLoss, fetchCashFlow, fetchBalanceSheet, fetchTaxReport, fetchVendorPaymentsReport, fetchEventProfitability } from '../lib/data';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';

function toCsv(obj: any): string {
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '';
    const keys = Object.keys(obj[0]);
    return [keys.join(','), ...obj.map((row: any) => keys.map(k => row[k]).join(','))].join('\n');
  }
  return Object.entries(obj).map(([k, v]) => `${k},${v}`).join('\n');
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.csv`; a.click();
  URL.revokeObjectURL(url);
}

const REPORTS = [
  { label: 'Profit & Loss', fetch: fetchProfitAndLoss },
  { label: 'Cash Flow', fetch: fetchCashFlow },
  { label: 'Balance Sheet', fetch: fetchBalanceSheet },
  { label: 'Tax Reports', fetch: fetchTaxReport },
  { label: 'Vendor Payments', fetch: fetchVendorPaymentsReport },
  { label: 'Event Profitability', fetch: fetchEventProfitability },
];

export default function FinanceReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<any>) => {
    setLoading(label);
    try {
      const data = await fn();
      download(label.toLowerCase().replace(/\s+/g, '-'), toCsv(data));
      toast.success(`${label} downloaded`);
    } catch (err: any) { toast.error(err.message); }
    setLoading(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Financial Reports</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Click to download CSV</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {REPORTS.map(r => (
          <button key={r.label} onClick={() => run(r.label, r.fetch)} disabled={loading === r.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col items-center gap-2 hover:shadow-sm transition-shadow disabled:opacity-50">
            <FileText size={24} className="text-[var(--primary)]" />
            <span className="text-sm font-medium text-[var(--foreground)]">{loading === r.label ? 'Loading…' : r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
