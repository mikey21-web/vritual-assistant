import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Sparkles, Keyboard, X } from 'lucide-react';
import { useVoiceInput } from '../lib/useVoiceInput';
import { setPendingFilter } from '../lib/pendingSearch';
import { api } from '../lib/api';

interface NavigationAction {
  page: string;
  filters?: Record<string, string>;
  highlightId?: string;
  zoom?: string;
  summary?: string;
}

const PAGE_MAP: Record<string, string> = {
  leads: '/leads', contacts: '/contacts', tickets: '/tickets',
  campaigns: '/campaigns', analytics: '/analytics', mikey: '/mikey',
  pipeline: '/pipeline', overview: '/', crm: '/crm', inbox: '/messages',
  'qr-codes': '/qr-codes', qr: '/qr-codes', qrcodes: '/qr-codes',
  settings: '/settings', events: '/events', bookings: '/bookings',
  conversions: '/conversions', reports: '/reports', tasks: '/tasks',
  properties: '/properties', shipments: '/shipments',
  invoices: '/invoices', quotations: '/quotations', contracts: '/contracts',
  team: '/team', timesheet: '/timesheet', inventory: '/inventory',
  'purchase-orders': '/purchase-orders', 'vendor-bookings': '/vendor-bookings',
  media: '/media', templates: '/templates', nurture: '/nurture',
  scoring: '/scoring', routing: '/routing', webhooks: '/webhooks',
  forms: '/forms', 'sync-logs': '/sync-logs', 'audit-logs': '/audit-logs',
  health: '/health', import: '/import', advanced: '/advanced',
  integrations: '/integrations', 'ad-integrations': '/ad-integrations',
  'ai-campaign': '/ai-campaign', 'ai-agent': '/ai-agent',
  studio: '/studio', 'knowledge-base': '/knowledge-base',
  'website-crawler': '/website-crawler', 'public-profile': '/public-profile',
  calendar: '/calendar', calls: '/calls', 'finance-reports': '/finance-reports',
  'stock-movements': '/stock-movements', locations: '/locations',
  partners: '/partners', procurements: '/purchase-orders',
  salaries: '/salaries', leaves: '/leaves', 's-m-s': '/sms-settings',
  widgets: '/widgets', workspaces: '/workspace',
};

function VoiceDiagnostics({ voice }: { voice: any }) {
  if (!voice.debug && !voice.error) return null;
  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] animate-fade-up pointer-events-none">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]/90 backdrop-blur px-4 py-2 shadow-xl">
        {voice.error && <p className="text-xs text-red-400">{voice.error}</p>}
        {voice.debug && !voice.error && <p className="text-xs text-[var(--muted-foreground)]">{voice.debug}</p>}
      </div>
    </div>
  );
}

export default function VoiceCommandUI() {
  const voice = useVoiceInput();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  // Ref mirror of `processing` so the transcript effect (which only depends on
  // voice.transcript) never reads a stale value and drop/duplicate a command.
  const processingRef = useRef(false);

  // Transcript → copilot
  useEffect(() => {
    if (!voice.transcript || processingRef.current) return;
    const cmd = voice.transcript.trim();
    if (!cmd) return;

    processingRef.current = true;
    setProcessing(true);
    setResult(null);
    setActive(false);
    voice.clearTranscript();

    api('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message: cmd }),
    }).then((res: any) => {
      const actions = res.actions || [];
      const nav = actions.find((a: any) => a.tool === 'navigate_ui' && a.status !== 'error');

      if (nav) {
        setPendingFilter(nav.args.page, {
          filters: nav.args.filters,
          highlightId: nav.args.highlightId,
          zoom: nav.args.zoom,
          summary: nav.args.summary,
        });
        const path = PAGE_MAP[nav.args.page] || `/${nav.args.page}`;
        window.location.hash = path;
        setResult(nav.args.summary || null);
      } else {
        const reply = res.reply || 'Done';
        setResult(reply);
      }
    }).catch((err) => {
      console.error('[MikeyVoice] copilot request failed:', err);
      setResult(err.message || 'Something went wrong');
    }).finally(() => {
      processingRef.current = false;
      setProcessing(false);
    });
  }, [voice.transcript]);

  // Ctrl+H toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'h' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (result) { setResult(null); return; }
        if (voice.listening || active) { voice.stop(); setActive(false); }
        else { voice.start(); setActive(true); }
      }
      if (e.key === 'Escape') { setResult(null); if (voice.listening) { voice.stop(); setActive(false); } }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [voice, result, active]);

  // Sync active with voice.listening
  useEffect(() => {
    if (voice.listening) setActive(true);
    else setActive(false);
  }, [voice.listening]);

  const stop = useCallback(() => { voice.stop(); setActive(false); }, [voice]);

  // Result toast — auto-dismiss after 3s
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => setResult(null), 3000);
    return () => clearTimeout(t);
  }, [result]);

  if (result) {
    return (
      <>
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-full mx-4 animate-fade-up pointer-events-none">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-2xl flex items-start gap-3">
            <Sparkles size={18} className="text-[var(--primary)] mt-0.5 shrink-0" />
            <p className="text-sm text-[var(--foreground)] leading-relaxed flex-1">{result}</p>
          </div>
        </div>
        {voice.listening && <ListeningPill voice={voice} onStop={stop} processing={processing} />}
      </>
    );
  }

  if (active || voice.listening || voice.wakeWordDetected) {
    return <ListeningPill voice={voice} onStop={stop} processing={processing} />;
  }

  return (
    <>
      <button
        onClick={() => { voice.start(); setActive(true); }}
        className="fixed bottom-20 right-6 z-[9999] w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--accent)] hover:scale-105 transition-all duration-200 [body.overlay-open_&]:hidden"
        title="Activate Mikey Voice (Ctrl+H)"
      >
        <Mic size={18} />
      </button>
      <div className="fixed bottom-[5.5rem] right-6 z-[9999] text-[10px] text-[var(--muted-foreground)] opacity-50 text-right [body.overlay-open_&]:hidden">
        <kbd className="px-1 py-0.5 rounded bg-[var(--accent)] font-mono">Ctrl+H</kbd>
      </div>
    </>
  );
}

function ListeningPill({ voice, onStop, processing }: { voice: any; onStop: () => void; processing: boolean }) {
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barsRef.current) return;
    const bars = barsRef.current.children;
    let anim: number;
    const tick = () => {
      for (let i = 0; i < bars.length; i++) {
        (bars[i] as HTMLElement).style.height = `${20 + Math.random() * 60}%`;
      }
      anim = requestAnimationFrame(tick);
    };
    anim = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(anim);
  }, []);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-up">
      <div className="rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 shadow-2xl flex items-center gap-3">
        <div ref={barsRef} className="flex items-end gap-0.5 h-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-1 rounded-full bg-[var(--primary)]" style={{ height: '30%' }} />
          ))}
        </div>
        <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
          {processing ? 'Working...' : voice.wakeWordDetected ? 'Listening...' : 'Say "Okay Mikey"'}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <button onClick={onStop} className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors">
          <MicOff size={14} className="text-[var(--muted-foreground)]" />
        </button>
      </div>
    </div>
  );
}
