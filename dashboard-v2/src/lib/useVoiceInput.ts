import { useState, useRef, useCallback, useEffect } from 'react';

const WAKE_WORD = 'okay mikey';

export interface VoiceInputState {
  listening: boolean;
  transcript: string;
  wakeWordDetected: boolean;
  error: string | null;
}

export function useVoiceInput() {
  const [state, setState] = useState<VoiceInputState>({
    listening: false,
    transcript: '',
    wakeWordDetected: false,
    error: null,
  });
  const recognitionRef = useRef<any>(null);
  const wakePendingRef = useRef(false);

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const createRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    return recognition;
  }, [SpeechRecognition]);

  const start = useCallback(() => {
    const recognition = createRecognition();
    if (!recognition) {
      setState(s => ({ ...s, error: 'Speech recognition not supported in this browser' }));
      return;
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.toLowerCase();
        if (event.results[i].isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      const fullText = finalTranscript || interimTranscript;

      // Wake word detection
      if (fullText.includes(WAKE_WORD)) {
        wakePendingRef.current = true;
        setState(s => ({ ...s, wakeWordDetected: true, transcript: '' }));
        // Clear wake word flag after 3s
        setTimeout(() => {
          wakePendingRef.current = false;
          setState(s => ({ ...s, wakeWordDetected: false }));
        }, 3000);
        return;
      }

      // If wake word was recently detected, grab the next phrase as the command
      if (wakePendingRef.current && finalTranscript) {
        wakePendingRef.current = false;
        setState(s => ({ ...s, wakeWordDetected: false, transcript: finalTranscript }));
        return;
      }

      if (finalTranscript) {
        setState(s => ({ ...s, transcript: finalTranscript }));
      }
    };

    recognition.onerror = (event: any) => {
      setState(s => ({ ...s, error: `Recognition error: ${event.error}` }));
    };

    recognition.onend = () => {
      setState(s => ({ ...s, listening: false }));
    };

    recognition.start();
    recognitionRef.current = recognition;
    setState(s => ({ ...s, listening: true, error: null }));
  }, [createRecognition]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState(s => ({ ...s, listening: false }));
  }, []);

  const clearTranscript = useCallback(() => {
    setState(s => ({ ...s, transcript: '' }));
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { ...state, start, stop, clearTranscript, supported: !!SpeechRecognition };
}
