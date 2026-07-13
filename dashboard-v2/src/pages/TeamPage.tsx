import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { UserPlus, Trash2, Users, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchPermissionPresets, fetchUserPermissions, setUserPermission, applyPermissionPreset } from '../lib/data';

const PERMISSION_MODULES = ['DASHBOARD', 'EVENTS', 'CRM', 'VENDORS', 'TEAM', 'TIMESHEET', 'ACCOUNTING', 'INVENTORY', 'PROCUREMENT'];
const PERMISSION_LEVELS = ['NO_ACCESS', 'VIEW_ONLY', 'EDIT', 'FULL_ACCESS'];

function PermissionsPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [presets, setPresets] = useState<any[]>([]);
  const [perms, setPerms] = useState<Record<string, string>>({});

  const refresh = () => fetchUserPermissions(userId).then((rows: any[]) => {
    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.module] = r.level; });
    setPerms(map);
  }).catch(() => {});

  useEffect(() => { fetchPermissionPresets().then(setPresets).catch(() => {}); refresh(); }, [userId]);

  const setLevel = async (module: string, level: string) => {
    try { await setUserPermission(userId, module, level); setPerms({ ...perms, [module]: level }); } catch (e: any) { toast.error(e.message); }
  };

  const apply = async (preset: string) => {
    try { await applyPermissionPreset(userId, preset); refresh(); toast.success(`Applied "${preset}"`); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mt-2 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Workspace access</h4>
        <div className="flex items-center gap-2">
          <select onChange={e => e.target.value && apply(e.target.value)} defaultValue=""
            className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)]">
            <option value="" disabled>Apply preset</option>
            {presets.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <button onClick={onClose} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Close</button>
        </div>
      </div>
      <div className="space-y-2">
        {PERMISSION_MODULES.map(m => (
          <div key={m} className="flex items-center justify-between">
            <span className="text-sm text-[var(--foreground)]">{m.replace('_', ' ')}</span>
            <select value={perms[m] || 'NO_ACCESS'} onChange={e => setLevel(m, e.target.value)}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)]">
              {PERMISSION_LEVELS.map(l => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'SALES_AGENT' });
  const [permUserId, setPermUserId] = useState<string | null>(null);

  const refresh = () => api('/users').then((r: any) => setUsers(Array.isArray(r) ? r : r.data || [])).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/users', { method: 'POST', body: JSON.stringify(form) });
      setShowInvite(false);
      setForm({ email: '', name: '', role: 'SALES_AGENT' });
      refresh();
      toast.success('Team member invited');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Team</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{users.length} members</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm w-full sm:w-auto"
        >
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      {showInvite && (
        <form onSubmit={invite} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Name</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              >
                {['SALES_AGENT', 'TEAM_LEAD', 'ADMIN', 'SUPER_ADMIN'].map(r => (
                  <option key={r} value={r}>{r.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button type="submit" className="w-full sm:w-auto h-9 px-6 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90">
              Invite
            </button>
          </div>
        </form>
      )}

      <div className="hidden sm:block rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)]">No team members</td></tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs font-medium text-white shadow-sm">
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[var(--foreground)]">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'SUPER_ADMIN'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : u.role === 'ADMIN'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {u.role?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        (u.status || 'active') === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPermUserId(permUserId === u.id ? null : u.id)}
                          className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          title="Manage permissions"
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          onClick={() => { api(`/users/${u.id}`, { method: 'DELETE' }).then(refresh); toast.success('Removed'); }}
                          className="p-1.5 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {permUserId && <PermissionsPanel userId={permUserId} onClose={() => setPermUserId(null)} />}

      <div className="block sm:hidden space-y-3">
        {users.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-12 text-center text-[var(--muted-foreground)]">
            No team members
          </div>
        ) : (
          users.map((u: any) => (
            <div key={u.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-sm font-medium text-white shadow-sm shrink-0">
                    {(u.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-[var(--foreground)]">{u.name}</div>
                    <div className="text-sm text-[var(--muted-foreground)]">{u.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => { api(`/users/${u.id}`, { method: 'DELETE' }).then(refresh); toast.success('Removed'); }}
                  className="p-1.5 rounded-md hover:bg-[var(--accent)] text-red-400 hover:text-red-600 transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  u.role === 'SUPER_ADMIN'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    : u.role === 'ADMIN'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {u.role?.replace('_', ' ') || 'N/A'}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  (u.status || 'active') === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {u.status || 'active'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
