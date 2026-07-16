import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { setPendingFilter } from '../lib/pendingSearch';
import { api } from '../lib/api';

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
};

const PAGE_ALIASES: Record<string, string> = {
  'qr code': 'qr-codes', 'qr codes': 'qr-codes',
  settings: 'settings', 'setting': 'settings',
  integrations: 'integrations', events: 'events', event: 'events',
  campaign: 'campaigns', ticket: 'tickets', support: 'tickets',
  contact: 'contacts', task: 'tasks', team: 'team',
  reports: 'reports', report: 'reports',
  dashboard: 'overview', home: 'overview', inbox: 'inbox',
};

function navigateTo(page: string) {
  const resolved = PAGE_ALIASES[page] || page;
  const path = PAGE_MAP[resolved];
  if (!path) return false;
  setPendingFilter(resolved, {});
  window.location.hash = path;
  return true;
}

function matchCommand(text: string): { page: string; filter?: string } | null {
  const t = text.toLowerCase().trim().replace(/^show me |^go to |^open |^navigate to |^navigate |^take me to /, '');
  const words = t.split(/\s+/);

  // Check for "show me [filter] [page]" pattern
  const filters = ['hot', 'warm', 'cold', 'new', 'open', 'converted', 'lost', 'qualified', 'urgent', 'high', 'medium', 'low'];
  if (words.length >= 2 && filters.includes(words[0])) {
    const page = words.slice(1).join(' ');
    const resolved = PAGE_ALIASES[page] || page;
    if (PAGE_MAP[resolved]) return { page: resolved, filter: words[0] };
  }

  // Direct page match
  const resolved = PAGE_ALIASES[t] || t;
  if (PAGE_MAP[resolved]) return { page: resolved };

  return null;
}

export default function VoiceCommandUI() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'listening' | 'copilot'>('idle');
  const recognitionRef = useRef<any>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  useEffect(() => {
    if (!result) return;
    resultTimer.current = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(resultTimer.current);
  }, [result]);

  const startListening = useCallback(() => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) { setResult('Speech recognition not supported'); return; }

    const r = new Ctor();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';

    r.onstart = () => { setListening(true); setMode('listening'); };

    r.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript;
      setMode('copilot');

      const cmd = matchCommand(text);
      if (cmd) {
        const filters: Record<string, string> = {};
        const filterMap: Record<string, string> = {
          hot: 'HOT', warm: 'WARM', cold: 'COLD', new: 'NEW',
          open: 'OPEN', converted: 'CONVERTED', lost: 'LOST',
          urgent: 'URGENT', high: 'HIGH',
        };
        if (cmd.filter && filterMap[cmd.filter]) {
          filters.segment = filterMap[cmd.filter];
        }
        setPendingFilter(cmd.page, { filters: Object.keys(filters).length ? filters : undefined });
        window.location.hash = PAGE_MAP[cmd.page];
        setResult(`Showing ${cmd.page}${cmd.filter ? ' (' + cmd.filter + ')' : ''}`);
        return;
      }

      // Fallback to copilot
      api('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      }).then((res: any) => {
        const nav = (res.actions || []).find((a: any) => a.tool === 'navigate_ui' && a.status !== 'error');
        if (nav) {
          setPendingFilter(nav.args.page, { filters: nav.args.filters, highlightId: nav.args.highlightId, zoom: nav.args.zoom, summary: nav.args.summary });
          window.location.hash = PAGE_MAP[nav.args.page] || '/' + nav.args.page;
          setResult(nav.args.summary || `Navigated to ${nav.args.page}`);
        } else {
          setResult(res.reply || 'Done');
        }
      }).catch(() => {
        setResult("I didn't understand that. Try 'show me leads' or 'go to qr'.");
      });
    };

    r.onerror = () => { setResult('Microphone error. Check permissions.'); };
    r.onend = () => { setListening(false); setMode('idle'); };

    recognitionRef.current = r;
    try { r.start(); } catch { setResult('Failed to start microphone.'); }
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setListening(false);
    setMode('idle');
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'h' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (result) { setResult(null); return; }
        if (listening) stopListening(); else startListening();
      }
      if (e.key === 'Escape') { setResult(null); stopListening(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [listening, result, startListening, stopListening]);

  if (!supported) return null;

  if (result) {
    return (
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-full mx-4 animate-fade-up pointer-events-none">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-2xl flex items-start gap-3">
          <Sparkles size={18} className="text-[var(--primary)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--foreground)] leading-relaxed flex-1">{result}</p>
        </div>
      </div>
    );
  }

  if (listening) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-up pointer-events-none">
        <div className="rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 shadow-2xl flex items-center gap-3">
          <div className="flex items-end gap-0.5 h-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-1 rounded-full bg-[var(--primary)] animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
            ))}
          </div>
          <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
            {mode === 'copilot' ? 'Thinking...' : 'Listening...'}
          </span>
          {mode === 'listening' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
          <button onClick={stopListening} className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors">
            <MicOff size={14} className="text-[var(--muted-foreground)]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={startListening}
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
