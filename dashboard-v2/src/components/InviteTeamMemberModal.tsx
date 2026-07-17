import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { createTeamInvite, fetchPermissionPresets } from "../lib/data";
import { PERMISSION_MODULES, PERMISSION_LEVELS, PERMISSION_LEVEL_LABELS } from "../lib/permission-modules";
import { getPermissionModuleLabel } from "../lib/niche-config";

const ROLES = ['SALES_AGENT', 'SUPPORT_AGENT', 'MANAGER', 'ADMIN', 'VIEWER'];

/** Matches the reference "Invite team member" modal: name/email, then a
 * per-module access list (with an "Apply preset" bulk-fill), then send. The
 * invite carries these grants and applies them the moment the invitee
 * accepts — no separate follow-up step to set permissions after the fact. */
export default function InviteTeamMemberModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SALES_AGENT');
  const [grants, setGrants] = useState<Record<string, string>>(
    Object.fromEntries(PERMISSION_MODULES.map(m => [m, 'NO_ACCESS'])),
  );
  const [presets, setPresets] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchPermissionPresets().then(setPresets).catch(() => {}); }, []);

  const applyPreset = (presetName: string) => {
    const preset = presets.find(p => p.name === presetName);
    if (!preset) return;
    setGrants(prev => ({ ...prev, ...preset.grants }));
    toast.success(`Applied "${presetName}"`);
  };

  const setLevel = (module: string, level: string) => {
    setGrants(prev => ({ ...prev, [module]: level }));
  };

  const send = async () => {
    if (!name.trim()) return toast.error('Name is required');
    if (!email.trim()) return toast.error('Email is required');
    setSending(true);
    try {
      await createTeamInvite({ name: name.trim(), email: email.trim(), role, moduleGrants: grants });
      toast.success(`Invite sent to ${email.trim()}`);
      onInvited();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-[var(--card)] shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Invite team member</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              They'll receive an email with a link to set up their account and access your workspace.
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-1">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--foreground)] block mb-1">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@example.com" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--foreground)] block mb-1">Access level (system role)</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20">
            {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Workspace access</h3>
            <select onChange={e => e.target.value && applyPreset(e.target.value)} defaultValue=""
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20">
              <option value="" disabled className="flex items-center gap-1">Apply preset</option>
              {presets.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {PERMISSION_MODULES.map(module => (
              <div key={module} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{getPermissionModuleLabel(module)}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{PERMISSION_LEVEL_LABELS[grants[module]]}</div>
                </div>
                <div className="relative">
                  <select
                    value={grants[module]}
                    onChange={e => setLevel(module, e.target.value)}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] pl-3 pr-7 text-sm text-[var(--foreground)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  >
                    {PERMISSION_LEVELS.map(l => <option key={l} value={l}>{PERMISSION_LEVEL_LABELS[l]}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground)]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending}>{sending ? 'Sending...' : 'Send invite'}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
