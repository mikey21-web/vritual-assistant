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
const WAKE_WORD = 'okay mikey';

function notify() { listeners.forEach(l => l()); }

function updateState(partial: Partial<VoiceInputState>) {
  voiceState = { ...voiceState, ...partial };
  notify();
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
        onResult: (transcript: string, isFinal: boolean) => {
          if (!isFinal || !transcript) return;
          const text = transcript.toLowerCase().trim();
          if (!text) return;

          if (!wakeWordPending) {
            if (text.includes(WAKE_WORD)) {
              wakeWordPending = true;
              updateState({ wakeWordDetected: true });
              const afterWake = text.replace(WAKE_WORD, '').trim();
              if (afterWake) {
                wakeWordPending = false;
                updateState({ transcript: afterWake, wakeWordDetected: false });
              }
              return;
            }
            return;
          }

          wakeWordPending = false;
          updateState({ wakeWordDetected: false });
          const clean = text.replace(WAKE_WORD, '').trim();
          updateState({ transcript: clean || text });
        },
        onError: (err: any) => {
          updateState({ error: err.message || 'Voice error' });
        },
        onEngineSelected: (info: any) => {
          updateState({ engineMode: info?.name || 'jsvoice' });
        },
      });
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
