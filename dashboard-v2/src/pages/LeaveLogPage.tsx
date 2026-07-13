import React, { useState, useEffect } from 'react';
import { fetchLeaveRequests, fetchLeaveStats, createLeaveRequest, updateLeaveRequest, fetchUsers } from '../lib/data';
import toast from 'react-hot-toast';

export default function LeaveLogPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ onLeaveToday: 0, pending: 0, approvedThisMonth: 0, totalTeam: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const [form, setForm] = useState({ userId: '', startDate: '', endDate: '' });

  const refresh = () => { fetchLeaveRequests().then(setRequests).catch(() => {}); fetchLeaveStats().then(setStats).catch(() => {}); };
  useEffect(() => { refresh(); fetchUsers().then(setUsers).catch(() => {}); }, []);

  const disabled = stats.totalTeam === 0;

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLeaveRequest(form);
      setShowRequest(false);
      setForm({ userId: '', startDate: '', endDate: '' });
      refresh();
      toast.success('Leave requested');
    } catch (err: any) { toast.error(err.message); }
  };

  const decide = async (id: string, status: string) => {
    try { await updateLeaveRequest(id, { status }); refresh(); } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Leave log</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Track and approve team leave requests.</p>
        </div>
        <div className="relative group">
          <button onClick={() => !disabled && setShowRequest(true)} disabled={disabled}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
            Request leave
          </button>
          {disabled && <div className="absolute right-0 mt-1 hidden group-hover:block text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--muted-foreground)] whitespace-nowrap z-10">Add a team member first to request leave</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['On leave today', stats.onLeaveToday], ['Pending requests', stats.pending], ['Approved this month', stats.approvedThisMonth], ['Total team members', stats.totalTeam]].map(([label, val]) => (
          <div key={label as string} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
            <div className="text-lg font-semibold text-[var(--foreground)]">{val}</div>
          </div>
        ))}
      </div>

      {showRequest && (
        <form onSubmit={request} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
              <option value="">Team member</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">Request</button>
            <button type="button" onClick={() => setShowRequest(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          </div>
        </form>
      )}

      {requests.length === 0 ? (
        <p className="text-center py-12 text-sm text-[var(--muted-foreground)]">No leave records yet.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
              <span className="text-[var(--foreground)]">{r.user?.name} — {new Date(r.startDate).toLocaleDateString()} to {new Date(r.endDate).toLocaleDateString()}</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--foreground)]">{r.status}</span>
                {r.status === 'PENDING' && (
                  <>
                    <button onClick={() => decide(r.id, 'APPROVED')} className="text-xs text-emerald-600 hover:underline">Approve</button>
                    <button onClick={() => decide(r.id, 'REJECTED')} className="text-xs text-red-600 hover:underline">Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
