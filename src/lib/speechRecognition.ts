// Unified Speech-to-Text Voice Dictation Service for Daily Sumire
// Works with Native Android SpeechRecognizer Bridge & Web Speech API

export interface SpeechRecognitionResultHandler {
  onTranscript: (text: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof (window as any).AndroidSpeechRecognizer !== 'undefined' ||
    'SpeechRecognition' in window ||
    'webkitSpeechRecognition' in window
  );
}

let activeRecognition: any = null;
let isNativeDictating = false;

export function startVoiceDictation(handlers: SpeechRecognitionResultHandler) {
  if (typeof window === 'undefined') return null;

  stopVoiceDictation();

  // 1. Android Native SpeechRecognizer Bridge (Highest accuracy & reliability on Android)
  if (typeof (window as any).AndroidSpeechRecognizer !== 'undefined') {
    try {
      isNativeDictating = true;

      (window as any).onAndroidSpeechReady = () => {
        // Microphone opened and ready
      };

      (window as any).onAndroidSpeechResult = (text: string, isFinal: boolean) => {
        if (text) {
          handlers.onTranscript(text);
        }
      };

      (window as any).onAndroidSpeechEnd = () => {
        isNativeDictating = false;
        handlers.onEnd?.();
      };

      (window as any).onAndroidSpeechError = (errMsg: string) => {
        isNativeDictating = false;
        console.warn('Native speech error:', errMsg);
        handlers.onError?.(errMsg);
      };

      (window as any).AndroidSpeechRecognizer.startDictation('ru-RU');
      return { type: 'native' };
    } catch (e: any) {
      console.warn('Failed to start Native Android Speech Recognizer:', e);
    }
  }

  // 2. Browser Web Speech API Fallback (for Chrome/Edge/Safari on desktop or web)
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    handlers.onError?.('Speech recognition is not supported in this browser.');
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'ru-RU,en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript) {
        handlers.onTranscript(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Web speech error:', event.error);
      handlers.onError?.(event.error || 'Speech recognition error');
    };

    recognition.onend = () => {
      activeRecognition = null;
      handlers.onEnd?.();
    };

    // Pre-request microphone permission to prevent instant abortion on WebViews
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Release test stream
          stream.getTracks().forEach((track) => track.stop());
          recognition.start();
          activeRecognition = recognition;
        })
        .catch(() => {
          recognition.start();
          activeRecognition = recognition;
        });
    } else {
      recognition.start();
      activeRecognition = recognition;
    }

    return recognition;
  } catch (err: any) {
    console.warn('Could not start web speech recognition:', err);
    handlers.onError?.(err?.message || 'Could not access microphone');
    return null;
  }
}

export function stopVoiceDictation() {
  if (typeof window === 'undefined') return;

  if (isNativeDictating && typeof (window as any).AndroidSpeechRecognizer !== 'undefined') {
    try {
      (window as any).AndroidSpeechRecognizer.stopDictation();
    } catch (ignored) {}
    isNativeDictating = false;
  }

  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch (ignored) {}
    activeRecognition = null;
  }
}
