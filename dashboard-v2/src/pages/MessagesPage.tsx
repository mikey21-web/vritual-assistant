import React, { useState, useEffect } from 'react';
import { fetchMessages } from '../lib/data';

export default function MessagesPage() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => { fetchMessages().then((r: any) => setData(r.data || r)).catch(() => {}); }, []);
  return <div><h2 className="text-lg font-semibold mb-4">Messages</h2>
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Channel</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3">Message</th><th className="px-4 py-3">Time</th></tr></thead>
        <tbody>{data.slice(0, 30).map((m: any) => <tr key={m.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 text-xs">{m.channel}</td><td className="px-4 py-3 text-xs">{m.direction}</td><td className="px-4 py-3 text-xs max-w-md truncate">{m.text}</td><td className="px-4 py-3 text-xs">{new Date(m.createdAt).toLocaleString()}</td></tr>)}</tbody></table>
      {data.length === 0 && <div className="p-8 text-center text-gray-400">No messages</div>}
    </div></div>;
}
