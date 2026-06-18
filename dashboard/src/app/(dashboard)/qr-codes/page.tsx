'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, QrCode, Image } from 'lucide-react';

export default function QrCodesPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', destinationType: 'form_link', destination: '' });
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = () => api('/qr-codes').then(setData);
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/qr-codes', { method: 'POST', body: JSON.stringify(form) });
    setShowCreate(false); setForm({ name: '', destinationType: 'form_link', destination: '' }); refresh();
  };

  const viewQr = async (id: string) => {
    setSelectedId(id);
    const res = await api(`/qr-codes/${id}/image`);
    setQrImage(res.image);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">QR Codes</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm"><Plus size={16} /> Create</button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="bg-white border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input placeholder="QR Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
            <select value={form.destinationType} onChange={e => setForm({...form, destinationType: e.target.value})} className="border rounded px-3 py-2 text-sm">
              {['form_link','whatsapp_link','landing_page','booking_link','digital_download'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Destination URL" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className="border rounded px-3 py-2 text-sm" required />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Save</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-1.5 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map(q => (
          <div key={q.id} className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <QrCode size={18} className="text-gray-600" />
              <span className="font-medium text-sm">{q.name}</span>
              <span className={`ml-auto px-2 py-0.5 rounded text-xs ${q.active ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{q.active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="text-xs text-gray-500 mb-2">{q.destinationType}: {q.destination}</div>
            <div className="text-xs text-gray-400 mb-3">{q._count?.scans || 0} scans</div>
            <button onClick={() => viewQr(q.id)} className="flex items-center gap-1 text-blue-600 text-xs hover:underline"><Image size={12} /> View QR</button>
            {selectedId === q.id && qrImage && <img src={qrImage} alt="QR" className="mt-3 w-40 h-40" />}
          </div>
        ))}
        {data.length === 0 && <div className="col-span-full text-center text-gray-400 py-8">No QR codes</div>}
      </div>
    </div>
  );
}
