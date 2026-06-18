'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function UsersPage() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => { api('/users').then(setData); }, []);

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Team Users</h2>
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th></tr></thead>
          <tbody>{data.map(u => (<tr key={u.id} className="border-t hover:bg-gray-50"><td className="px-4 py-3 font-medium">{u.name}</td><td className="px-4 py-3">{u.email}</td><td className="px-4 py-3">{u.role}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.active ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td></tr>))}</tbody>
        </table>
        {data.length === 0 && <div className="p-8 text-center text-gray-400">No users</div>}
      </div>
    </div>
  );
}
