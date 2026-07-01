import React, { useState, useEffect, useRef } from 'react';
import { api, apiUpload } from '../lib/api';
import { fetchMedia, deleteMedia } from '../lib/data';
import { Upload, Trash2, Download, Image, FileText, Video, Music } from 'lucide-react';
import toast from 'react-hot-toast';

const typeIcons: Record<string, any> = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
};

export default function MediaPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => fetchMedia().then(setData).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await apiUpload('/media/upload', fd);
      refresh();
      toast.success('Uploaded');
    } catch (e: any) { toast.error(e.message); }
    setUploading(false);
  };

  const items = data.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Media Library</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{items.length} files</p>
        </div>
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.length === 0 && (
          <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">No files uploaded yet</div>
        )}
        {items.map((m: any) => {
          const fileType = m.fileType?.split('/')[0] || 'document';
          const Icon = typeIcons[fileType] || FileText;
          return (
            <div key={m.id} className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="aspect-square rounded-lg bg-[var(--muted)] flex items-center justify-center mb-3 overflow-hidden">
                {fileType === 'image' ? (
                  <img src={m.url || `/api/media/${m.id}/download-url`} alt={m.originalName} className="w-full h-full object-cover" />
                ) : (
                  <Icon size={32} className="text-[var(--muted-foreground)]" />
                )}
              </div>
              <div className="text-xs font-medium text-[var(--foreground)] truncate mb-1" title={m.originalName}>
                {m.originalName}
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)] mb-2">
                {m.fileType?.split('/')[1]?.toUpperCase() || m.fileType} · {(m.fileSize / 1024).toFixed(0)} KB
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={async () => { const r = await api('/media/' + m.id + '/download-url'); window.open(r.url, '_blank'); }}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors"
                >
                  <Download size={12} /> Download
                </button>
                <button
                  onClick={() => { deleteMedia(m.id); refresh(); toast.success('Deleted'); }}
                  className="p-1 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
