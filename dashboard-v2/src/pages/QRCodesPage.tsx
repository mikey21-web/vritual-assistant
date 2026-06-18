import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { fetchQRCodes, createQRCode } from '../lib/data';
import { Plus, QrCode, Image } from 'lucide-react';

export default function QRCodesPage() {
  const [data, setData] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', destinationType: 'form_link', destination: '' });
  const [qrImage, setQrImage] = useState<string | null>(null);

  const refresh = () => fetchQRCodes().then(setData);
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => { e.preventDefault(); await createQRCode(form); setShowCreate(false); setForm({ name:'', destinationType:'form_link', destination:'' }); refresh(); };
  const viewQr = async (id: string) => { const r = await api(`/qr-codes/${id}/image`); setQrImage(r.image); };

  return (
    <div><h2 className="text-lg font-semibold mb-4">QR Codes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((q: any) => (
          <div key={q.id} className="bg-white border rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><QrCode size={18} /><span className="font-medium text-sm">{q.name}</span></div>
            <div className="text-xs text-gray-500 mb-2">{q.destinationType}: {q.destination}</div>
            <button onClick={() => viewQr(q.id)} className="flex items-center gap-1 text-blue-600 text-xs"><Image size={12} /> View</button>
            {qrImage && <img src={qrImage} alt="QR" className="mt-2 w-32 h-32" />}
          </div>
        ))}
      </div>
    </div>
  );
}
