import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fetchLeads } from '../lib/data';
import { Phone, PhoneOff, Clock, Loader2, ChevronRight, Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
];

export default function VoiceAgentPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState<string | null>(null);
  const [callLang, setCallLang] = useState('en');

  useEffect(() => {
    Promise.all([
      fetchLeads(1, { hasPhone: 'true', limit: '10' }).then(r => setLeads(r.data || [])).catch(() => {}),
      api('/voice-agent/history').then(setHistory).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const call = async (leadId: string) => {
    setCalling(leadId);
    try {
      const r = await api('/voice-agent/call/' + leadId + '?lang=' + callLang, { method: 'POST' });
      if (r.success) alert('Call initiated — Mikey will speak ' + (LANGUAGES.find(l => l.code === callLang)?.label || callLang));
      else alert('Call failed: ' + (r.message || r.error));
    } catch (e: any) { alert('Error: ' + e.message); }
    setCalling(null);
  };

  if (loading) return <div className="p-6 text-center text-[var(--muted-foreground)]"><Loader2 size={20} className="animate-spin inline mr-2" />Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Voice Agent</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Call leads with Mikey's AI voice — he talks, listens, and qualifies.</p>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Ready to call</h2>
          <div className="flex items-center gap-1.5 ml-auto">
            <Globe size={14} className="text-[var(--muted-foreground)]" />
            <select value={callLang} onChange={e => setCallLang(e.target.value)}
              className="text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[var(--foreground)] outline-none">
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-3">
          {leads.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No leads ready for voice outreach.</p>}
          {leads.map((l: any) => (
            <div key={l.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
              <div className="h-10 w-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm font-semibold">{(l.contact?.name || '?')[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-[var(--foreground)] truncate">{l.contact?.name || 'Unknown'}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{l.contact?.phone || ''} • {l.interest || ''}</div>
              </div>
              <button onClick={() => call(l.id)} disabled={calling === l.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50">
                {calling === l.id ? <Loader2 size={13} className="animate-spin" /> : <Phone size={13} />}
                {calling === l.id ? 'Calling...' : 'Call'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">Call History</h2>
        <div className="space-y-2">
          {history.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No calls yet.</p>}
          {history.map((h: any) => (
            <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <Phone size={14} className="text-[var(--muted-foreground)] shrink-0" />
              <div className="flex-1 min-w-0 text-sm">
                <span className="font-medium text-[var(--foreground)]">{h.lead?.contact?.name || 'Unknown'}</span>
                <span className="text-[var(--muted-foreground)] ml-2">{h.toNumber}</span>
              </div>
              <span className="text-xs text-[var(--muted-foreground)]">{new Date(h.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${h.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{h.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
