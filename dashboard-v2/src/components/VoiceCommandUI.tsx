import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Sparkles, ArrowRight, Target, BarChart3, Table2, LayoutGrid, Keyboard, X } from 'lucide-react';
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

export default function VoiceCommandUI() {
  const voice = useVoiceInput();
  const tts = useVoiceOutput();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ text: string; nav: NavigationAction | null } | null>(null);
  const [active, setActive] = useState(false);
  const barsRef = useRef<HTMLDivElement>(null);

  const executeActions = useCallback((actions: any[]) => {
    for (const action of actions) {
      if (action.tool === 'navigate_ui' && action.status !== 'error') {
        return { page: action.args.page, filters: action.args.filters, highlightId: action.args.highlightId, zoom: action.args.zoom, summary: action.args.summary } as NavigationAction;
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
    setResult(null);
    setActive(false);
    voice.clearTranscript();

    api('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message: cmd }),
    }).then((res: CopilotResponse) => {
      const reply = res.reply || 'Done';
      const nav = executeActions(res.actions || []);
      setResult({ text: reply, nav });
      if (nav) setPendingFilter(nav.page, { filters: nav.filters, highlightId: nav.highlightId, zoom: nav.zoom, summary: nav.summary });
      tts.speak(reply);
    }).catch((err) => {
      setResult({ text: err.message || 'Something went wrong', nav: null });
      tts.speak(err.message || 'Something went wrong');
    }).finally(() => setProcessing(false));
  }, [voice.transcript]);

  // Navigate after result
  useEffect(() => {
    if (!result?.nav) return;
    const path = PAGE_MAP[result.nav.page] || `/${result.nav.page}`;
    const timer = setTimeout(() => window.location.hash = path, tts.speaking ? 500 : 100);
    return () => clearTimeout(timer);
  }, [result?.nav?.page]);

  // Animate waveform bars while listening
  useEffect(() => {
    if (!active || !barsRef.current) return;
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
  }, [active]);

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

  // Result toast
  if (result) {
    return (
      <>
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-full mx-4 animate-fade-up">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 shadow-2xl flex items-start gap-3">
            <Sparkles size={18} className="text-[var(--primary)] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider">Mikey</span>
                {tts.speaking && <Volume2 size={12} className="text-emerald-500 animate-pulse" />}
              </div>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">{result.text}</p>
            </div>
            <button onClick={() => setResult(null)} className="p-1 rounded-md hover:bg-[var(--accent)] shrink-0 mt-0.5">
              <X size={14} className="text-[var(--muted-foreground)]" />
            </button>
          </div>
        </div>
        {voice.listening && <ListeningPill voice={voice} onStop={stop} processing={processing} />}
      </>
    );
  }

  if (active || voice.listening || voice.wakeWordDetected) {
    return <ListeningPill voice={voice} onStop={stop} processing={processing} />;
  }

  // Idle mic button
  return (
    <>
      <button
        onClick={() => { voice.start(); setActive(true); }}
        className="fixed bottom-6 right-6 z-[999] w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--accent)] hover:scale-105 transition-all duration-200 [body.overlay-open_&]:hidden"
        title="Activate Mikey Voice (Ctrl+H)"
      >
        <Mic size={18} />
      </button>
      <div className="fixed bottom-20 right-6 z-[999] text-[10px] text-[var(--muted-foreground)] opacity-50 text-right [body.overlay-open_&]:hidden">
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
        {/* Waveform */}
        <div ref={barsRef} className="flex items-end gap-0.5 h-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-1 rounded-full bg-[var(--primary)]" style={{ height: '30%' }} />
          ))}
        </div>

        {/* Status */}
        <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
          {processing ? 'Thinking...' : voice.wakeWordDetected ? 'Listening...' : 'Say "Okay Mikey"'}
        </span>

        {/* Engine dot */}
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />

        {/* Stop */}
        <button
          onClick={onStop}
          className="p-1 rounded-full hover:bg-[var(--accent)] transition-colors"
        >
          <MicOff size={14} className="text-[var(--muted-foreground)]" />
        </button>
      </div>
    </div>
  );
}
