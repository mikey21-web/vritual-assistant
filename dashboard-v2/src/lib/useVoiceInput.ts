import { useEffect, useRef, useState, useCallback } from 'react';

interface VoiceInputState {
  supported: boolean;
  listening: boolean;
  wakeWordDetected: boolean;
  transcript: string;
  error: string | null;
}

let recognition: SpeechRecognition | null = null;
let listeners: Array<() => void> = [];
let voiceState: VoiceInputState = {
  supported: typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
  listening: false,
  wakeWordDetected: false,
  transcript: '',
  error: null,
};
let wakeWordPending = false;
const WAKE_WORD = 'okay mikey';

function notify() { listeners.forEach(l => l()); }

function updateState(partial: Partial<VoiceInputState>) {
  voiceState = { ...voiceState, ...partial };
  notify();
}

function getRecognition(): SpeechRecognition | null {
  if (recognition) return recognition;
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = true;
  r.interimResults = false;
  r.lang = 'en-US';
  r.onresult = (e: SpeechRecognitionEvent) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (!e.results[i].isFinal) continue;
      const text = e.results[i][0].transcript.toLowerCase().trim();
      if (!text) continue;

      if (!wakeWordPending) {
        if (text.includes(WAKE_WORD)) {
          wakeWordPending = true;
          updateState({ wakeWordDetected: true });
          const after = text.replace(WAKE_WORD, '').trim();
          if (after) {
            wakeWordPending = false;
            updateState({ transcript: after, wakeWordDetected: false });
          }
          return;
        }
        updateState({ transcript: text });
        return;
      }

      wakeWordPending = false;
      updateState({ wakeWordDetected: false });
      const after = text.replace(WAKE_WORD, '').trim();
      updateState({ transcript: after || text });
    }
  };
  r.onerror = (e: any) => {
    if (e.error === 'aborted' || e.error === 'no-speech') return;
    updateState({ error: e.error || 'Voice error' });
  };
  r.onend = () => {
    if (voiceState.listening) {
      // auto-restart if still should be listening
      try { r.start(); } catch {}
    }
  };
  recognition = r;
  return r;
}

export function useVoiceInput() {
  const [state, setState] = useState<VoiceInputState>(voiceState);

  useEffect(() => {
    const updater = () => setState({ ...voiceState });
    listeners.push(updater);
    return () => { listeners = listeners.filter(l => l !== updater); };
  }, []);

  const clearTranscript = useCallback(() => { updateState({ transcript: '' }); }, []);

  const start = useCallback(async () => {
    const r = getRecognition();
    if (!r) { updateState({ error: 'Speech recognition not supported' }); return; }
    try { r.start(); updateState({ listening: true, wakeWordDetected: false, error: null }); }
    catch (err: any) { updateState({ error: err.message || 'Failed to start' }); }
  }, []);

  const stop = useCallback(() => {
    try { recognition?.stop(); } catch {}
    wakeWordPending = false;
    updateState({ listening: false, wakeWordDetected: false });
  }, []);

  const toggle = useCallback(() => {
    if (voiceState.listening) stop();
    else start();
  }, [start, stop]);

  return {
    supported: state.supported,
    listening: state.listening,
    wakeWordDetected: state.wakeWordDetected,
    transcript: state.transcript,
    error: state.error,
    start, stop, toggle, clearTranscript,
  };
}
