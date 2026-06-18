'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Search } from 'lucide-react';

export default function ConversationsPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [search, setSearch] = useState('');
  useEffect(() => { api(`/conversations?${new URLSearchParams({ limit: '50' })}`).then(setData); }, []);

  return (
    <div>
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Lead</th><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3">Message</th><th className="px-4 py-3">Time</th></tr></thead>
          <tbody>{data.data.map((m: any) => (<tr key={m.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 text-xs">{m.leadId?.slice(0,8)}</td><td className="px-4 py-3">{m.channel}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${m.direction === 'INBOUND' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>{m.direction}</span></td><td className="px-4 py-3 max-w-xs truncate">{m.text}</td><td className="px-4 py-3 text-xs">{new Date(m.createdAt).toLocaleString()}</td></tr>))}</tbody>
        </table>
        {data.data.length === 0 && <div className="p-8 text-center text-gray-400">No messages</div>}
      </div>
    </div>
  );
}
