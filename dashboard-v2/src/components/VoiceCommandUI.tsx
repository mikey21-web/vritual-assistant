import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Sparkles, ArrowRight, Target, BarChart3, Table2, LayoutGrid } from 'lucide-react';
import { useVoiceInput } from '../lib/useVoiceInput';
import { useVoiceOutput } from '../lib/useVoiceOutput';
import { setPendingFilter } from '../lib/pendingSearch';
import { api } from '../lib/api';

interface CopilotResponse {
  reply: string;
  actions: any[];
  conversationId: string;
}

interface NavigationAction {
  page: string;
  filters?: Record<string, string>;
  highlightId?: string;
  zoom?: string;
  summary?: string;
}

const PAGE_MAP: Record<string, string> = {
  leads: '/leads',
  contacts: '/contacts',
  tickets: '/tickets',
  campaigns: '/campaigns',
  analytics: '/analytics',
  mikey: '/mikey',
  pipeline: '/pipeline',
  overview: '/',
  crm: '/crm',
};

const ZOOM_ICONS: Record<string, React.ReactNode> = {
  data: <Table2 size={24} />,
  metric: <BarChart3 size={24} />,
  chart: <BarChart3 size={24} />,
  card: <LayoutGrid size={24} />,
};

const ZOOM_CLASSES: Record<string, string> = {
  data: 'ring-2 ring-[var(--primary)] shadow-[var(--primary)]/30',
  metric: 'scale-105 ring-2 ring-[var(--primary)] shadow-lg shadow-[var(--primary)]/30',
  chart: 'ring-2 ring-[var(--primary)] shadow-lg',
  card: 'ring-2 ring-[var(--primary)] shadow-xl scale-[1.02]',
};

export default function VoiceCommandUI() {
  const voice = useVoiceInput();
  const tts = useVoiceOutput();
  const [processing, setProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [fullScreenResult, setFullScreenResult] = useState<{ text: string; nav: NavigationAction | null } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const executeActions = useCallback((actions: any[]) => {
    for (const action of actions) {
      if (action.tool === 'navigate_ui' && action.status !== 'error') {
        const nav: NavigationAction = {
          page: action.args.page,
          filters: action.args.filters,
          highlightId: action.args.highlightId,
          zoom: action.args.zoom,
          summary: action.args.summary,
        };
        return nav;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!voice.transcript || processing) return;
    const cmd = voice.transcript.trim();
    if (!cmd) return;

    setProcessing(true);
    setLastResponse(null);
    voice.clearTranscript();

    api('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message: cmd }),
    }).then((res: CopilotResponse) => {
      const reply = res.reply || 'Done';
      setLastResponse(reply);
      const nav = executeActions(res.actions || []);
      setFullScreenResult({ text: reply, nav });

      if (nav) {
        setPendingFilter(nav.page, {
          filters: nav.filters,
          highlightId: nav.highlightId,
          zoom: nav.zoom,
          summary: nav.summary,
        });
      }

      tts.speak(reply);
    }).catch((err) => {
      const msg = err.message || 'Something went wrong';
      setLastResponse(msg);
      setFullScreenResult({ text: msg, nav: null });
      tts.speak(msg);
    }).finally(() => {
      setProcessing(false);
    });
  }, [voice.transcript]);

  // Navigate to the page after setting pending filter
  useEffect(() => {
    if (!fullScreenResult?.nav) return;
    const nav = fullScreenResult.nav;
    const path = PAGE_MAP[nav.page] || `/${nav.page}`;
    const timer = setTimeout(() => {
      window.location.hash = path;
    }, tts.speaking ? 500 : 100);
    return () => clearTimeout(timer);
  }, [fullScreenResult?.nav?.page]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        voice.listening ? voice.stop() : voice.start();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [voice]);

  // Auto-dismiss
  useEffect(() => {
    if (fullScreenResult && !tts.speaking) {
      const timer = setTimeout(() => setFullScreenResult(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [fullScreenResult, tts.speaking]);

  // Full-screen result overlay
  if (fullScreenResult) {
    const zoomIcon = fullScreenResult.nav?.zoom ? ZOOM_ICONS[fullScreenResult.nav.zoom] : null;
    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setFullScreenResult(null)}
      >
        <div className="max-w-2xl w-full mx-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-[var(--primary)]" />
            <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-wider">Mikey</span>
            {tts.speaking && <Volume2 size={14} className="text-emerald-500 animate-pulse ml-2" />}
            {fullScreenResult.nav?.zoom && (
              <div className="ml-auto text-[var(--primary)]">{zoomIcon}</div>
            )}
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] leading-relaxed">
            {lastResponse}
          </p>
          {fullScreenResult.nav?.summary && (
            <div className="mt-4 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/30 p-4">
              <p className="text-lg font-semibold text-[var(--primary)]">{fullScreenResult.nav.summary}</p>
            </div>
          )}
          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-1 rounded-full bg-[var(--accent)] overflow-hidden">
              {tts.speaking && (
                <div className="h-full bg-[var(--primary)] rounded-full animate-pulse" style={{ width: '60%' }} />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              {fullScreenResult.nav && <ArrowRight size={12} />}
              <span>
                {tts.speaking ? 'Speaking...' : fullScreenResult.nav ? 'Navigating...' : 'Tap to dismiss'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => voice.listening ? voice.stop() : voice.start()}
        className={`fixed bottom-24 right-6 z-[999] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          voice.listening
            ? 'bg-red-500 text-white scale-110 shadow-red-500/50 animate-pulse'
            : voice.wakeWordDetected
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] scale-110'
              : 'bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--accent)] hover:scale-105'
        }`}
        title={voice.supported ? (voice.listening ? 'Listening...' : 'Activate Mikey Voice') : 'Voice not supported'}
      >
        {voice.listening ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      {(voice.listening || voice.wakeWordDetected || processing) && !fullScreenResult && (
        <div className="fixed bottom-40 right-6 z-[999] flex flex-col items-end gap-2">
          {voice.wakeWordDetected && (
            <div className="px-3 py-1.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold animate-bounce shadow-lg">
              I'm listening...
            </div>
          )}
          {voice.listening && !voice.wakeWordDetected && !processing && (
            <div className="px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-xs text-[var(--muted-foreground)] shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Say "Okay Mikey" then your command
            </div>
          )}
          {processing && (
            <div className="px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)] shadow-lg flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
              Processing...
            </div>
          )}
        </div>
      )}

      {!voice.listening && !fullScreenResult && (
        <div className="fixed bottom-40 right-6 z-[999] text-[10px] text-[var(--muted-foreground)] opacity-50 text-right">
          Press <kbd className="px-1 py-0.5 rounded bg-[var(--accent)] font-mono">M</kbd> for voice
        </div>
      )}
    </>
  );
}
