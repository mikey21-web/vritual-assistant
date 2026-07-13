import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { useSocket } from "../hooks";
import toast from "react-hot-toast";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Smartphone, Plus, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { Badge } from "../components/ui/badge";

const sourceVariant: Record<string, "default" | "success" | "secondary"> = {
  SIM: "default",
  WHATSAPP: "success",
  TWILIO: "secondary",
};

const missedStatuses = new Set(["NO_ANSWER", "BUSY", "FAILED", "MISSED"]);

function formatDuration(sec?: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [stats, setStats] = useState<{ callsToday: number; missedToday: number; avgDurationSec: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPair, setShowPair] = useState(false);
  const { lastEvent } = useSocket();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [callsRes, statsRes] = await Promise.all([
        api("/call-tracking/calls"),
        api("/call-tracking/stats"),
      ]);
      setCalls(callsRes.data || callsRes);
      setStats(statsRes);
    } catch { /* mock fallback already handled in api() */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === "call.synced") {
      load();
    } else if (lastEvent.type === "call.summarized") {
      const p = lastEvent.payload as any;
      setCalls(prev => prev.map(c => c.id === p.callLogId ? { ...c, summary: p.summary, transcript: p.transcript, summaryStatus: "DONE" } : c));
    }
  }, [lastEvent, load]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Calls</h1>
        <button onClick={() => setShowPair(true)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 transition-colors">
          <Smartphone size={16} /> Pair a device
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-[var(--muted-foreground)]">Calls today</CardTitle>
            <Phone size={16} className="text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-[var(--foreground)]">{stats?.callsToday ?? "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-[var(--muted-foreground)]">Missed / no-answer today</CardTitle>
            <PhoneMissed size={16} className="text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-[var(--foreground)]">{stats?.missedToday ?? "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-[var(--muted-foreground)]">Avg. duration today</CardTitle>
            <Phone size={16} className="text-[var(--muted-foreground)]" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-[var(--foreground)]">{formatDuration(stats?.avgDurationSec)}</div></CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Number</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recording</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={9} className="text-center text-[var(--muted-foreground)] py-8">Loading...</TableCell></TableRow>
          ) : calls.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center text-[var(--muted-foreground)] py-8">No calls synced yet. Pair a device to get started.</TableCell></TableRow>
          ) : (
            calls.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">{new Date(c.createdAt).toLocaleString()}</TableCell>
                <TableCell className="font-medium text-[var(--foreground)]">
                  {c.contact?.name || (c.source === "WHATSAPP" ? c.fromNumber : "Unknown")}
                  {c.summary && <div className="text-xs text-[var(--muted-foreground)] font-normal mt-0.5 max-w-[220px] truncate" title={c.summary}>{c.summary}</div>}
                  {c.summaryStatus === "PENDING" && c.recordingUrl && <div className="text-xs text-[var(--muted-foreground)] font-normal mt-0.5 italic">Transcribing...</div>}
                </TableCell>
                <TableCell className="text-xs text-[var(--muted-foreground)]">{c.fromNumber}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--foreground)]">
                    {c.direction === "INBOUND" ? <PhoneIncoming size={13} /> : <PhoneOutgoing size={13} />}
                    {c.direction === "INBOUND" ? "Inbound" : "Outbound"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-[var(--foreground)]">{formatDuration(c.durationSec)}</TableCell>
                <TableCell><Badge variant={sourceVariant[c.source] || "secondary"}>{c.source}</Badge></TableCell>
                <TableCell>
                  {missedStatuses.has(c.status) ? (
                    <Badge variant="destructive">{c.status.replace(/_/g, " ")}</Badge>
                  ) : (
                    <Badge variant="success">{c.status.replace(/_/g, " ")}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {c.recordingUrl ? (
                    <audio controls className="h-8 w-48" preload="metadata">
                      <source src={c.recordingUrl} type="audio/mpeg" />
                    </audio>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">—</span>
                  )}
                </TableCell>
                <NotesCell call={c} onUpdate={(id, notes) => {
                  setCalls(prev => prev.map(call => call.id === id ? { ...call, notes } : call));
                }} />
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showPair && <PairDeviceModal onClose={() => setShowPair(false)} />}
    </div>
  );
}

function NotesCell({ call, onUpdate }: { call: any; onUpdate: (id: string, notes: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(call.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const handleSave = async () => {
    if (saving) return;
    const trimmed = value.trim();
    // If user cleared the note, delete it instead of saving empty string
    if (!trimmed && !call.notes) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await api(`/call-tracking/calls/${call.id}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: trimmed }),
      });
      setSaved(true);
      onUpdate(call.id, trimmed);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  // Show "+ Add note" when empty and not editing
  if (!call.notes && !editing) {
    return (
      <TableCell>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-[var(--primary)] hover:underline"
        >
          + Add note
        </button>
      </TableCell>
    );
  }

  // Show textarea when editing
  if (editing) {
    return (
      <TableCell>
        <div className="flex items-start gap-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
            className="w-40 h-16 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50"
          />
          {saved && <Check size={14} className="text-emerald-500 shrink-0 mt-1" />}
        </div>
      </TableCell>
    );
  }

  // Show notes text with edit button on hover
  return (
    <TableCell>
      <div className="flex items-center gap-1 group">
        <span className="text-xs text-[var(--foreground)] max-w-[150px] truncate block" title={call.notes}>
          {call.notes}
        </span>
        <button
          onClick={() => { setEditing(true); setValue(call.notes || ''); }}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title="Edit note"
        >
          ✏️
        </button>
      </div>
    </TableCell>
  );
}

function PairDeviceModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [pairing, setPairing] = useState<{ pairingCode: string; expiresAt: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api("/call-tracking/devices/pair-code", { method: "POST", body: JSON.stringify({ name: name || undefined }) });
      setPairing(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate pairing code");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!pairing) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((new Date(pairing.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pairing]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-[var(--foreground)] mb-1">Pair a device</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">Generate a code, then enter it in the mobile app to start syncing calls.</p>

        {!pairing ? (
          <div className="space-y-4">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Device label (e.g. Sarah's phone)"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
            />
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">Cancel</button>
              <button onClick={generate} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
                <Plus size={16} /> Generate code
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="rounded-lg bg-[var(--muted)] py-6">
              <div className="text-4xl font-bold tracking-[0.3em] text-[var(--foreground)]">{pairing.pairingCode}</div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {secondsLeft > 0 ? `Expires in ${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, "0")}` : "Code expired — generate a new one"}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPairing(null)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">New code</button>
              <button onClick={onClose} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 transition-colors">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
