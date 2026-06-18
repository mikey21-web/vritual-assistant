'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { Upload, Trash2, Download, Paperclip } from 'lucide-react';

export default function MediaPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => api('/media').then(setData);
  useEffect(() => { refresh(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const formData = new FormData(); formData.append('file', file);
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/media/upload`, {
      method: 'POST', body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });
    setUploading(false); refresh();
  };

  const handleDelete = async (id: string) => { await api(`/media/${id}`, { method: 'DELETE' }); refresh(); };

  const getDownloadUrl = async (id: string) => {
    const res = await api(`/media/${id}/download-url`);
    window.open(res.url, '_blank');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Media Library</h2>
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm">
          <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {data.data.map((m: any) => (
          <div key={m.id} className="bg-white border rounded-lg p-3 shadow-sm">
            <div className="text-xs font-medium truncate mb-1">{m.originalName}</div>
            <div className="text-xs text-gray-400 mb-2">{m.fileType.toUpperCase()} · {(m.fileSize / 1024).toFixed(0)}KB</div>
            <div className="flex gap-1">
              <button onClick={() => getDownloadUrl(m.id)} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Download size={14} /></button>
              <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-gray-100 rounded text-red-500"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {data.data.length === 0 && <div className="col-span-full text-center text-gray-400 py-8">No files</div>}
      </div>
    </div>
  );
}
