import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { fetchQRCodes, createQRCode } from '../lib/data';
import { Plus, QrCode, Image, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QRCodesPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', destinationType: 'form_link', destination: '' });
  const [qrImage, setQrImage] = useState<string | null>(null);

  const refresh = () => fetchQRCodes().then(setData);
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createQRCode(form);
      setShowCreate(false);
      setForm({ name: '', destinationType: 'form_link', destination: '' });
      refresh();
      toast.success('QR Code created');
    } catch (e: any) { toast.error(e.message); }
  };

  const viewQr = async (id: string) => {
    try {
      const r = await api(`/qr-codes/${id}/image`);
      setQrImage(r.image);
    } catch (e: any) { toast.error(e?.message || 'Failed to load QR image'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">QR Codes</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{data.length} QR codes</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> Generate QR
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            />
            <select
              value={form.destinationType}
              onChange={e => setForm({ ...form, destinationType: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            >
              <option value="form_link">Form Link</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">Website</option>
            </select>
            <input
              placeholder="Destination URL"
              value={form.destination}
              onChange={e => setForm({ ...form, destination: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="h-8 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Generate</button>
            <button type="button" onClick={() => setShowCreate(false)} className="h-8 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.length === 0 && (
          <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">No QR codes yet</div>
        )}
        {data.map((q: any) => (
          <div key={q.id} className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                  <QrCode size={16} className="text-[var(--primary)]" />
                </div>
                <span className="font-medium text-sm text-[var(--foreground)]">{q.name}</span>
              </div>
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mb-3">
              {q.destinationType}: <span className="truncate block">{q.destination}</span>
            </div>
            <button
              onClick={() => viewQr(q.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
            >
              <Image size={12} /> View QR Code
            </button>
            {qrImage && (
              <div className="mt-3 pt-3 border-t border-[var(--border)] animate-fade-in">
                <img src={qrImage} alt={q.name} className="w-32 h-32 mx-auto" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
