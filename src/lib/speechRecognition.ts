// Web Speech API Voice-to-Text Recognition Helper

export interface SpeechRecognitionResultHandler {
  onTranscript: (text: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

let activeRecognition: any = null;

export function startVoiceDictation(handlers: SpeechRecognitionResultHandler) {
  if (!isSpeechRecognitionSupported()) {
    handlers.onError?.('Speech recognition is not supported in this browser.');
    return null;
  }

  stopVoiceDictation();

  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognitionClass();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'ru-RU,en-US';

  recognition.onresult = (event: any) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    handlers.onTranscript(transcript);
  };

  recognition.onerror = (event: any) => {
    handlers.onError?.(event.error);
  };

  recognition.onend = () => {
    handlers.onEnd?.();
    activeRecognition = null;
  };

  try {
    recognition.start();
    activeRecognition = recognition;
    return recognition;
  } catch (err) {
    handlers.onError?.('Could not access microphone');
    return null;
  }
}

export function stopVoiceDictation() {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {
      // ignore
    }
    activeRecognition = null;
  }
}
