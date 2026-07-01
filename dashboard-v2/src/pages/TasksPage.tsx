import React, { useState, useEffect } from 'react';
import { fetchTasks, createTask, updateTask } from '../lib/data';
import { Plus, CheckCircle, Circle, X, ListTodo } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TasksPage() {
  const [data, setData] = useState<any>({ data: [], meta: {} });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium', leadId: '', assigneeId: '' });

  const refresh = () => fetchTasks().then((r: any) => setData(r.data ? r : { data: r, meta: {} })).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask(form);
      setShowCreate(false);
      setForm({ title: '', priority: 'medium', leadId: '', assigneeId: '' });
      refresh();
      toast.success('Task created');
    } catch (e: any) { toast.error(e.message); }
  };

  const toggle = async (id: string, current: string) => {
    try {
      await updateTask(id, { status: current === 'done' ? 'pending' : 'done' });
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const items = Array.isArray(data.data) ? data.data : data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Tasks</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{Array.isArray(items) ? items.length : 0} tasks</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {showCreate && (
        <form onSubmit={create} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              placeholder="Task title"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="col-span-2 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              required
            />
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Add</button>
              <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {(!Array.isArray(items) || items.length === 0) ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">No tasks yet</div>
        ) : (
          Array.isArray(items) && items.map((t: any) => {
            const isDone = t.status === 'done' || t.status === 'completed';
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 hover:shadow-sm transition-shadow">
                <button
                  onClick={() => toggle(t.id, t.status)}
                  className="shrink-0 p-1 rounded-md hover:bg-[var(--accent)] transition-colors"
                >
                  {isDone
                    ? <CheckCircle size={20} className="text-emerald-500" />
                    : <Circle size={20} className="text-[var(--muted-foreground)]" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${isDone ? 'line-through text-[var(--muted-foreground)]' : 'text-[var(--foreground)] font-medium'}`}>
                    {t.title}
                  </div>
                  {t.lead?.contact?.name && (
                    <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{t.lead.contact.name}</div>
                  )}
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                  t.priority === 'high'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : t.priority === 'medium'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {t.priority}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
