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
    voiceState.transcript = '';
    notify();
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
          voiceState.wakeWordDetected = true;
          notify();
        },
      });
    }

    try {
      await voiceInstance.start();
      voiceState.listening = true;
      voiceState.wakeWordDetected = false;
      voiceState.error = null;
      try {
        const info = voiceInstance.getEngineInfo();
        voiceState.engineMode = info?.name || 'jsvoice';
      } catch { voiceState.engineMode = 'jsvoice'; }
      notify();
    } catch (err: any) {
      voiceState.error = err.message || 'Failed to start voice';
      notify();
    }
  }, []);

  const stop = useCallback(() => {
    voiceInstance?.stop();
    voiceState.listening = false;
    voiceState.wakeWordDetected = false;
    notify();
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
