import { useEffect, useRef, useState, useCallback } from 'react';
import { createVoice, JSVoice } from 'jsvoice';

interface VoiceInputState {
  supported: boolean;
  listening: boolean;
  wakeWordDetected: boolean;
  transcript: string;
  error: string | null;
  engineMode: string;
}

let voiceInstance: JSVoice | null = null;
let listeners: Array<() => void> = [];
let voiceState: VoiceInputState = {
  supported: typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
  listening: false,
  wakeWordDetected: false,
  transcript: '',
  error: null,
  engineMode: 'idle',
};
let wakeWordPending = false;
let unsubSnapshot: (() => void) | null = null;
const WAKE_WORD = 'okay mikey';

function notify() { listeners.forEach(l => l()); }

function updateState(partial: Partial<VoiceInputState>) {
  voiceState = { ...voiceState, ...partial };
  notify();
}

/* 
 * jsvoice's dist bundle never calls the user's onResult option through the
 * engine pipeline. Results arrive only via onCommandRecognized / onCommandNotRecognized
 * events through the subscribe() API. We subscribe to those instead.
 */
function handleTranscript(text: string) {
  if (!text) return;
  const t = text.toLowerCase().trim();
  if (!t) return;

  if (!wakeWordPending) {
    if (t.includes(WAKE_WORD)) {
      wakeWordPending = true;
      updateState({ wakeWordDetected: true });
      const after = t.replace(WAKE_WORD, '').trim();
      if (after) {
        wakeWordPending = false;
        updateState({ transcript: after, wakeWordDetected: false });
      }
      return;
    }
    return;
  }

  wakeWordPending = false;
  updateState({ wakeWordDetected: false });
  const after = t.replace(WAKE_WORD, '').trim();
  updateState({ transcript: after || t });
}

function subscribeVoice(voice: JSVoice) {
  unsubSnapshot = voice.subscribe((_snap: any, event: any) => {
    if (!event) return;
    if (event.type === 'onCommandNotRecognized' || event.type === 'onCommandRecognized') {
      const raw = Array.isArray(event.payload) ? event.payload[0] : '';
      if (raw) handleTranscript(raw);
    }
  });
}

export function useVoiceInput() {
  const [state, setState] = useState<VoiceInputState>(voiceState);

  useEffect(() => {
    const updater = () => setState({ ...voiceState });
    listeners.push(updater);
    return () => {
      listeners = listeners.filter(l => l !== updater);
    };
  }, []);

  const clearTranscript = useCallback(() => {
    updateState({ transcript: '' });
  }, []);

  const start = useCallback(async () => {
    if (!voiceInstance) {
      voiceInstance = createVoice({
        continuous: true,
        interimResults: false,
        lang: 'en-US',
        autoRestart: true,
        restartDelay: 1000,
        wakeWord: null,
        onError: (err: any) => {
          updateState({ error: err.message || 'Voice error' });
        },
        onEngineSelected: (info: any) => {
          updateState({ engineMode: info?.name || 'jsvoice' });
        },
      });
      subscribeVoice(voiceInstance);
    }

    try {
      await voiceInstance.start();
      updateState({ listening: true, wakeWordDetected: false, error: null });
      try {
        const info = voiceInstance.getEngineInfo();
        updateState({ engineMode: info?.name || 'jsvoice' });
      } catch { updateState({ engineMode: 'jsvoice' }); }
    } catch (err: any) {
      updateState({ error: err.message || 'Failed to start voice' });
    }
  }, []);

  const stop = useCallback(() => {
    voiceInstance?.stop();
    wakeWordPending = false;
    updateState({ listening: false, wakeWordDetected: false });
  }, []);

  const toggle = useCallback(() => {
    if (voiceState.listening) stop();
    else start();
  }, [start, stop]);

  useEffect(() => {
    return () => { if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; } };
  }, []);

  return {
    supported: state.supported,
    listening: state.listening,
    wakeWordDetected: state.wakeWordDetected,
    transcript: state.transcript,
    error: state.error,
    engineMode: state.engineMode,
    start,
    stop,
    toggle,
    clearTranscript,
  };
}
