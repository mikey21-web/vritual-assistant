import { useState, useEffect, useCallback } from 'react';

let speechListeners: Array<() => void> = [];
let speechState = { speaking: false };

function notifySpeech() {
  speechListeners.forEach(l => l());
}

export function useVoiceOutput() {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const updater = () => setSpeaking(speechState.speaking);
    speechListeners.push(updater);
    return () => {
      speechListeners = speechListeners.filter(l => l !== updater);
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!text) return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => { speechState.speaking = true; notifySpeech(); };
    utterance.onend = () => { speechState.speaking = false; notifySpeech(); };
    utterance.onerror = () => { speechState.speaking = false; notifySpeech(); };

    synth.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    speechState.speaking = false;
    notifySpeech();
  }, []);

  return { speaking, speak, stop };
}
