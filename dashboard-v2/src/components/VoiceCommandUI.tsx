import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Mic, MicOff, Sparkles, X } from 'lucide-react';
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
  integrations: '/integrations', 'ad-integrations': '/ad-integrations',
  'ai-campaign': '/ai-campaign', 'ai-agent': '/ai-agent',
  studio: '/studio', 'knowledge-base': '/knowledge-base',
  calendar: '/calendar', calls: '/calls', 'finance-reports': '/finance-reports',
  locations: '/locations', partners: '/partners',
  salaries: '/salaries', leaves: '/leaves',
  widgets: '/widgets', workspaces: '/workspace',
};

const FILTER_KEYWORDS: Record<string, Record<string, string>> = {
  hot: { segment: 'HOT' },
  warm: { segment: 'WARM' },
  cold: { segment: 'COLD' },
  new: { status: 'NEW' },
  open: { status: 'OPEN' },
  converted: { status: 'CONVERTED' },
  lost: { status: 'LOST' },
  qualified: { status: 'QUALIFIED' },
  urgent: { priority: 'URGENT' },
  high: { priority: 'HIGH' },
  medium: { priority: 'MEDIUM' },
  low: { priority: 'LOW' },
};

const PAGE_ALIASES: Record<string, string> = {
  'qr code': 'qr-codes', 'qr codes': 'qr-codes',
  'code': 'qr-codes', 'codes': 'qr-codes',
  'properties': 'properties', 'property': 'properties',
  'shipments': 'shipments', 'shipping': 'shipments',
  'invoices': 'invoices', 'invoice': 'invoices',
  'bookings': 'bookings', 'booking': 'bookings',
  'settings': 'settings', 'setting': 'settings',
  'integrations': 'integrations', 'integration': 'integrations',
  'events': 'events', 'event': 'events',
  'campaign': 'campaigns', 'ad campaign': 'campaigns',
  'ticket': 'tickets', 'support': 'tickets',
  'contact': 'contacts', 'people': 'contacts',
  'task': 'tasks', 'todo': 'tasks',
  'team': 'team', 'people': 'team',
  'reports': 'reports', 'report': 'reports',
  'dashboard': 'overview', 'home': 'overview',
  'inbox': 'inbox', 'messages': 'inbox', 'chats': 'inbox',
};

function navigateToPage(page: string, filterKw?: string) {
  const resolved = PAGE_ALIASES[page] || page;
  const path = PAGE_MAP[resolved];
  if (!path) return false;

  let filters: Record<string, string> | undefined;
  if (filterKw && FILTER_KEYWORDS[filterKw]) {
    filters = FILTER_KEYWORDS[filterKw];
  }

  setPendingFilter(resolved, { filters });
  window.location.hash = path;
  return true;
}

function VoiceCommandUIInner() {
  const [annyangRef, setAnnyangRef] = useState<any>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'listening' | 'copilot'>('idle');
  const [initError, setInitError] = useState<string | null>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try {
      import('annyang').then(mod => {
        const a = mod.default || mod;
        const hasSupport = typeof a === 'function' ? true : (a && a.isSupported ? a.isSupported() : false);
        setSupported(hasSupport);
        setAnnyangRef(a);
      }).catch(() => {
        setSupported(false);
      });
    } catch {
      setSupported(false);
    }
  }, []);

  if (initError) return null;
  if (annyangRef === null) return null; // still loading
  if (!supported) return null;

  // Auto-dismiss result
  useEffect(() => {
    if (!result) return;
    resultTimer.current = setTimeout(() => setResult(null), 4000);
    return () => clearTimeout(resultTimer.current);
  }, [result]);

  const startListening = useCallback(() => {
    const a = annyangRef;
    if (!a) return;

    // Clear previous commands
    if (a.removeCommands) a.removeCommands();

    // Direct navigation commands — no LLM needed
    const commands: Record<string, (...args: string[]) => void> = {};

    // Dynamic page navigation: "show me leads", "go to qr", "navigate settings", "open tickets"
    for (const [name, path] of Object.entries(PAGE_MAP)) {
      const display = name.replace(/-/g, ' ');
      commands[`show me ${display}`] = () => {
        if (navigateToPage(name)) setResult(`Navigated to ${display}`);
      };
      commands[`go to ${display}`] = () => {
        if (navigateToPage(name)) setResult(`Navigated to ${display}`);
      };
      commands[`open ${display}`] = () => {
        if (navigateToPage(name)) setResult(`Opened ${display}`);
      };
      commands[`navigate to ${display}`] = () => {
        if (navigateToPage(name)) setResult(`Navigated to ${display}`);
      };
      commands[`take me to ${display}`] = () => {
        if (navigateToPage(name)) setResult(`Going to ${display}`);
      };
    }

    // Filter commands: "show me hot leads", "show me open tickets"
    for (const [kw, filter] of Object.entries(FILTER_KEYWORDS)) {
      for (const [name] of Object.entries(PAGE_MAP)) {
        const display = name.replace(/-/g, ' ');
        commands[`show me ${kw} ${display}`] = () => {
          if (navigateToPage(name, kw)) setResult(`Showing ${kw} ${display}`);
        };
      }
    }

    // Universal: "show me X" where X is any alias
    commands['show me *page'] = (page: string) => {
      const p = page.toLowerCase().trim();
      if (navigateToPage(p)) setResult(`Showing ${p}`);
      else askCopilot(`show me ${p}`);
    };
    commands['go to *page'] = (page: string) => {
      const p = page.toLowerCase().trim();
      if (navigateToPage(p)) setResult(`Going to ${p}`);
      else askCopilot(`go to ${p}`);
    };
    commands['open *page'] = (page: string) => {
      const p = page.toLowerCase().trim();
      if (navigateToPage(p)) setResult(`Opened ${p}`);
      else askCopilot(`open ${p}`);
    };
    commands['navigate *page'] = (page: string) => {
      const p = page.toLowerCase().trim();
      if (navigateToPage(p)) setResult(`Navigated to ${p}`);
      else askCopilot(`navigate to ${p}`);
    };

    // General questions go to copilot
    commands['*query'] = (query: string) => {
      askCopilot(query);
    };

    if (a.addCommands) a.addCommands(commands);
    if (a.setLanguage) a.setLanguage('en-US');
    if (a.debug) a.debug();

    if (a.addCallback) {
      a.addCallback('resultMatch', () => {
        setMode('idle');
      });
      a.addCallback('resultNoMatch', () => {
        setResult("Sorry, I didn't catch that. Try 'show me leads' or 'go to qr'.");
      });
      a.addCallback('error', (err: any) => {
        if (err?.error === 'not-allowed') {
          setResult('Microphone access denied. Allow mic in browser settings.');
          setListening(false);
        } else if (err?.error) {
          setResult('Mic error: ' + err.error);
        }
      });
    }

    try { a.start({ autoRestart: true, continuous: false }); } catch (e) {
      setResult('Failed to start voice. Check mic permissions.');
    }
    setListening(true);
    setMode('listening');
  }, []);

  const stopListening = useCallback(() => {
    const a = annyangRef;
    if (a) {
      try { if (a.abort) a.abort(); } catch {}
      try { if (a.removeCommands) a.removeCommands(); } catch {}
    }
    setListening(false);
    setMode('idle');
  }, [annyangRef]);

  const askCopilot = async (query: string) => {
    setMode('copilot');
    stopListening();
    try {
      const res = await api('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify({ message: query }),
      });
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
        setResult(nav.args.summary || `Navigated to ${nav.args.page}`);
      } else {
        setResult(res.reply || 'Done');
      }
    } catch (err: any) {
      setResult(err.message || 'Something went wrong');
    }
    setMode('idle');
  };

  // Keyboard: Ctrl+H to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'h' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (result) { setResult(null); return; }
        if (listening) stopListening();
        else startListening();
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
              <div key={i} className="w-1 rounded-full bg-[var(--primary)] animate-pulse" style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.1}s` }} />
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

export default function VoiceCommandUI() {
  const [errored, setErrored] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (errored || !mounted) return null;

  try {
    return <VoiceCommandUIInner />;
  } catch {
    return null;
  }
}
