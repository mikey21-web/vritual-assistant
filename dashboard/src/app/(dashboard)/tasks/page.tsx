'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, CheckCircle, Circle } from 'lucide-react';

export default function TasksPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium' });

  const fetch = () => api('/tasks').then((r: any) => setData(r.data || r));
  useEffect(() => { fetch(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/tasks', { method: 'POST', body: JSON.stringify(form) });
    setShowCreate(false); setForm({ title: '', priority: 'medium' }); fetch();
  };

  const toggle = async (id: string, currentStatus: string) => {
    await api(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status: currentStatus === 'completed' ? 'pending' : 'completed' }) });
    fetch();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Tasks</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded text-sm"><Plus size={16} /> New Task</button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="bg-white border rounded-lg p-4 mb-4 flex gap-3">
          <input placeholder="Task title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="flex-1 border rounded px-3 py-2 text-sm" required />
          <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="border rounded px-3 py-2 text-sm">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Add</button>
        </form>
      )}

      <div className="space-y-2">
        {data.data.map((t: any) => (
          <div key={t.id} className="flex items-center gap-3 bg-white border rounded-lg p-3 shadow-sm">
            <button onClick={() => toggle(t.id, t.status)}>{t.status === 'completed' ? <CheckCircle size={18} className="text-green-500" /> : <Circle size={18} className="text-gray-300" />}</button>
            <div className="flex-1">
              <div className={`text-sm ${t.status === 'completed' ? 'line-through text-gray-400' : ''}`}>{t.title}</div>
              <div className="text-xs text-gray-400">{t.lead?.contact?.name || ''}</div>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs ${t.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-gray-100'}`}>{t.priority}</span>
          </div>
        ))}
        {data.data.length === 0 && <div className="text-center text-gray-400 py-8">No tasks</div>}
      </div>
    </div>
  );
}
