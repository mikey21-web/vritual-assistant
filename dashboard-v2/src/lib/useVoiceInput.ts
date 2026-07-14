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
        wakeWord: 'okay mikey',
        onWakeWordDetected: () => {
          updateState({ wakeWordDetected: true });
        },
        onResult: (transcript: string, isFinal: boolean) => {
          if (isFinal && transcript) {
            updateState({ transcript: transcript.toLowerCase() });
          }
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
