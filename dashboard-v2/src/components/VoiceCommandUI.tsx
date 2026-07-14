import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Sparkles, ArrowRight, Target, BarChart3, Table2, LayoutGrid, Keyboard } from 'lucide-react';
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
  leads: '/leads', contacts: '/contacts', tickets: '/tickets',
  campaigns: '/campaigns', analytics: '/analytics', mikey: '/mikey',
  pipeline: '/pipeline', overview: '/', crm: '/crm',
};

const ZOOM_ICONS: Record<string, React.ReactNode> = {
  data: <Table2 size={24} />, metric: <BarChart3 size={24} />,
  chart: <BarChart3 size={24} />, card: <LayoutGrid size={24} />,
};

function WaveformBars({ count = 5, listening }: { count?: number; listening: boolean }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-2 rounded-full bg-[var(--primary)] transition-all duration-150"
          style={{
            height: listening ? `${Math.max(20, 60 + Math.sin(Date.now() / 200 + i * 1.5) * 40)}%` : '20%',
            animation: listening ? `waveform ${0.3 + i * 0.08}s ease-in-out infinite` : 'none',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

function ListeningOverlay({ voice, onStop, engineMode }: { voice: any; onStop: () => void; engineMode: string }) {
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let anim: number;
    if (barsRef.current) {
      const bars = barsRef.current.children;
      const tick = () => {
        for (let i = 0; i < bars.length; i++) {
          const bar = bars[i] as HTMLElement;
          const h = 20 + Math.random() * 60;
          bar.style.height = `${h}%`;
        }
        anim = requestAnimationFrame(tick);
      };
      anim = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(anim);
    }
  }, []);

  // Stop on Escape or same shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.key === 'h' && e.ctrlKey)) onStop();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onStop]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-6">
        {/* Waveform */}
        <div ref={barsRef} className="flex items-end gap-1.5 h-20">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="w-2.5 rounded-full bg-[var(--primary)] transition-all duration-75" style={{ height: '30%' }} />
          ))}
        </div>

        {/* Status */}
        <div className="text-center">
          {voice.wakeWordDetected ? (
            <>
              <p className="text-lg font-bold text-white mb-1">I'm listening...</p>
              <p className="text-sm text-white/60">Speak your command</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-white mb-1">Say <span className="text-[var(--primary)]">"Okay Mikey"</span></p>
              <p className="text-sm text-white/60">then your command</p>
            </>
          )}
        </div>

        {/* Engine badge */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-white/70 font-mono">
            {engineMode === 'jsvoice' ? 'JSVoice' : engineMode}
          </span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </div>

        {/* Stop button */}
        <button
          onClick={onStop}
          className="mt-4 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all hover:scale-105 group"
        >
          <MicOff size={22} className="text-white/80 group-hover:text-white" />
        </button>

        <p className="text-xs text-white/40">
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white/60">Ctrl+H</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white/60">Esc</kbd> to stop
        </p>
      </div>
    </div>
  );
}

export default function VoiceCommandUI() {
  const voice = useVoiceInput();
  const tts = useVoiceOutput();
  const [processing, setProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [fullScreenResult, setFullScreenResult] = useState<{ text: string; nav: NavigationAction | null } | null>(null);
  const [listeningOpen, setListeningOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const executeActions = useCallback((actions: any[]) => {
    for (const action of actions) {
      if (action.tool === 'navigate_ui' && action.status !== 'error') {
        return {
          page: action.args.page,
          filters: action.args.filters,
          highlightId: action.args.highlightId,
          zoom: action.args.zoom,
          summary: action.args.summary,
        } as NavigationAction;
      }
    }
    return null;
  }, []);

  // Transcript → copilot
  useEffect(() => {
    if (!voice.transcript || processing) return;
    const cmd = voice.transcript.trim();
    if (!cmd) return;

    setProcessing(true);
    setLastResponse(null);
    setListeningOpen(false);
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

  // Navigate after result
  useEffect(() => {
    if (!fullScreenResult?.nav) return;
    const path = PAGE_MAP[fullScreenResult.nav.page] || `/${fullScreenResult.nav.page}`;
    const timer = setTimeout(() => {
      window.location.hash = path;
    }, tts.speaking ? 500 : 100);
    return () => clearTimeout(timer);
  }, [fullScreenResult?.nav?.page]);

  // Ctrl+H toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'h' && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        if (fullScreenResult) {
          setFullScreenResult(null);
          return;
        }
        if (voice.listening || listeningOpen) {
          voice.stop();
          setListeningOpen(false);
        } else {
          voice.start();
          setListeningOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [voice, fullScreenResult, listeningOpen]);

  // Sync listening state
  useEffect(() => {
    if (voice.listening) setListeningOpen(true);
    else setListeningOpen(false);
  }, [voice.listening]);

  // Auto-dismiss result after TTS
  useEffect(() => {
    if (fullScreenResult && !tts.speaking) {
      const timer = setTimeout(() => setFullScreenResult(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [fullScreenResult, tts.speaking]);

  // Full-screen result
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
            {zoomIcon && <div className="ml-auto text-[var(--primary)]">{zoomIcon}</div>}
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)] leading-relaxed">{lastResponse}</p>
          {fullScreenResult.nav?.summary && (
            <div className="mt-4 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/30 p-4">
              <p className="text-lg font-semibold text-[var(--primary)]">{fullScreenResult.nav.summary}</p>
            </div>
          )}
          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-1 rounded-full bg-[var(--accent)] overflow-hidden">
              {tts.speaking && <div className="h-full bg-[var(--primary)] rounded-full animate-pulse" style={{ width: '60%' }} />}
            </div>
            <span className="text-xs text-[var(--muted-foreground)]">
              {tts.speaking ? 'Speaking...' : fullScreenResult.nav ? 'Navigating...' : 'Tap to dismiss'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Whisper-style listening overlay
  if (listeningOpen || voice.listening || voice.wakeWordDetected) {
    return (
      <>
        <ListeningOverlay voice={voice} onStop={() => { voice.stop(); setListeningOpen(false); }} engineMode={voice.engineMode} />
        {processing && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm shadow-lg flex items-center gap-2 animate-fade-in">
            <div className="w-4 h-4 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
            Mikey is thinking...
          </div>
        )}
      </>
    );
  }

  // Idle: small mic button
  return (
    <>
      <button
        onClick={() => { voice.start(); setListeningOpen(true); }}
        className="fixed bottom-24 right-6 z-[999] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--accent)] hover:scale-105"
        title="Activate Mikey Voice (Ctrl+H)"
      >
        <Mic size={20} />
      </button>
      <div className="fixed bottom-40 right-6 z-[999] text-[10px] text-[var(--muted-foreground)] opacity-50 text-right">
        <Keyboard size={10} className="inline mr-1" />
        <kbd className="px-1 py-0.5 rounded bg-[var(--accent)] font-mono">Ctrl+H</kbd> voice
      </div>
    </>
  );
}
