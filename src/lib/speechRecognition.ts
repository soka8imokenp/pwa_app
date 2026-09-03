// Unified Speech-to-Text Voice Dictation Service for Daily Sumire
// Supports Native Android SpeechRecognizer Bridge & Web Speech API
// Features: Bilingual / Multi-language, Continuous Flow, Smart Punctuation & Task Splitting

export type VoiceLanguage = 'auto' | 'ru-RU' | 'en-US' | 'ja-JP';

export interface VoiceLanguageOption {
  id: VoiceLanguage;
  label: string;
  badge: string;
}

export const VOICE_LANGUAGES: VoiceLanguageOption[] = [
  { id: 'auto', label: 'Auto (RU / EN)', badge: 'AUTO' },
  { id: 'ru-RU', label: 'Русский (RU)', badge: 'RU' },
  { id: 'en-US', label: 'English (EN)', badge: 'EN' },
  { id: 'ja-JP', label: '日本語 (JA)', badge: 'JA' },
];

export function getVoiceLanguage(): VoiceLanguage {
  if (typeof window === 'undefined') return 'auto';
  const saved = localStorage.getItem('kairo_voice_lang');
  if (saved === 'ru-RU' || saved === 'en-US' || saved === 'ja-JP' || saved === 'auto') {
    return saved;
  }
  return 'auto';
}

export function setVoiceLanguage(lang: VoiceLanguage): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kairo_voice_lang', lang);
  window.dispatchEvent(new CustomEvent('kairo:voice-lang-changed', { detail: lang }));
}

/**
 * Smart voice cleanup: replaces spoken punctuation words with real symbols,
 * capitalizes sentence starts and normalizes spacing.
 */
export function cleanAndFormatVoiceTranscript(rawText: string, isFinal: boolean = true): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Spoken punctuation substitution (Russian & English)
  const replacements: [RegExp, string][] = [
    // Russian
    [/\s+(?:с новой строки|новая строка|перенос строки)\s*/gi, '\n'],
    [/\s+(?:вопросительный знак)\s*/gi, '? '],
    [/\s+(?:восклицательный знак)\s*/gi, '! '],
    [/\s+(?:двоеточие)\s*/gi, ': '],
    [/\s+(?:точка)\s*/gi, '. '],
    [/\s+(?:запятая)\s*/gi, ', '],
    [/\s+(?:тире|дефис)\s*/gi, ' - '],

    // English
    [/\s+(?:new line|newline)\s*/gi, '\n'],
    [/\s+(?:question mark)\s*/gi, '? '],
    [/\s+(?:exclamation mark|exclamation point)\s*/gi, '! '],
    [/\s+(?:colon)\s*/gi, ': '],
    [/\s+(?:period|full stop|dot)\s*/gi, '. '],
    [/\s+(?:comma)\s*/gi, ', '],
    [/\s+(?:dash|hyphen)\s*/gi, ' - '],
  ];

  for (const [regex, replacement] of replacements) {
    text = text.replace(regex, replacement);
  }

  // 2. Remove whitespace before punctuation: "слово , другое" -> "слово, другое"
  text = text.replace(/\s+([.,!?:;])/g, '$1');

  // 3. Ensure space after punctuation if followed by a letter: "слово.другое" -> "слово. другое"
  text = text.replace(/([.,!?:;])([A-Za-zА-Яа-яЁё0-9])/g, '$1 $2');

  // 4. Auto-capitalize sentences (start of string, or after [.!?\n])
  text = text.replace(/(^|[\n.!?]\s+)([a-zа-яё])/gu, (match, prefix, char) => {
    return prefix + char.toUpperCase();
  });

  return isFinal ? text.trim() : text;
}

/**
 * Intelligent task splitting: splits a single continuous voice stream into individual tasks
 * by newlines or by sequential transition words ("затем", "потом", "после этого", "and then", etc.)
 */
export function splitVoiceIntoTasks(transcript: string): string[] {
  if (!transcript || !transcript.trim()) return [];

  // Replace transition words with newline markers
  const normalized = transcript
    .replace(/\s*(?:\r\n|\r|\n)+\s*/g, '\n')
    .replace(/\s+(?:затем|потом|после этого|после чего|также|и еще|и потом|а также|and then|then next|next|also)\s+/gi, '\n');

  return normalized
    .split('\n')
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*•\d.)]+\s*/, '')) // Strip bullet or numeric markers if any
    .filter((line) => line.length > 1)
    .map((line) => cleanAndFormatVoiceTranscript(line, true));
}

export interface SpeechRecognitionResultHandler {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
  onRmsChanged?: (rmsdB: number) => void;
}

export interface SpeechRecognitionOptions {
  lang?: VoiceLanguage;
  continuous?: boolean;
  autoPunctuate?: boolean;
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
let accumulatedFinalTranscript = '';

export function startVoiceDictation(
  handlers: SpeechRecognitionResultHandler,
  options?: SpeechRecognitionOptions
) {
  if (typeof window === 'undefined') return null;

  stopVoiceDictation();
  accumulatedFinalTranscript = '';

  const selectedLang = options?.lang || getVoiceLanguage();
  const isContinuous = options?.continuous !== false; // Continuous by default
  const shouldAutoPunctuate = options?.autoPunctuate !== false;

  // Resolve target language code for engines
  let targetLangCode = 'ru-RU';
  if (selectedLang === 'en-US') {
    targetLangCode = 'en-US';
  } else if (selectedLang === 'ja-JP') {
    targetLangCode = 'ja-JP';
  } else if (selectedLang === 'ru-RU') {
    targetLangCode = 'ru-RU';
  } else {
    // 'auto' mode: pick device language, default to ru-RU
    targetLangCode = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'ru-RU';
  }

  // 1. Android Native SpeechRecognizer Bridge (with Multi-language & Continuous options)
  if (typeof (window as any).AndroidSpeechRecognizer !== 'undefined') {
    try {
      isNativeDictating = true;

      (window as any).onAndroidSpeechReady = () => {
        // Microphone opened and listening
      };

      (window as any).onAndroidSpeechResult = (text: string, isFinal: boolean) => {
        if (!text) return;

        let fullText = text;
        if (isFinal) {
          accumulatedFinalTranscript = accumulatedFinalTranscript
            ? `${accumulatedFinalTranscript} ${text}`.trim()
            : text.trim();
          fullText = accumulatedFinalTranscript;
        } else {
          fullText = accumulatedFinalTranscript
            ? `${accumulatedFinalTranscript} ${text}`.trim()
            : text.trim();
        }

        const formatted = shouldAutoPunctuate
          ? cleanAndFormatVoiceTranscript(fullText, isFinal)
          : fullText;

        handlers.onTranscript(formatted, isFinal);
      };

      (window as any).onAndroidSpeechEnd = () => {
        if (!isContinuous) {
          isNativeDictating = false;
          handlers.onEnd?.();
        }
      };

      (window as any).onAndroidSpeechError = (errMsg: string) => {
        isNativeDictating = false;
        console.warn('Native speech error:', errMsg);
        handlers.onError?.(errMsg);
      };

      // Call native bridge: passes target language or 'auto' (which signals multi-lang to Java)
      (window as any).AndroidSpeechRecognizer.startDictation(
        selectedLang === 'auto' ? 'auto' : targetLangCode,
        isContinuous
      );
      return { type: 'native' };
    } catch (e: any) {
      console.warn('Failed to start Native Android Speech Recognizer:', e);
    }
  }

  // 2. Browser Web Speech API Fallback (Chrome / Edge / Safari / WebView)
  const SpeechRecognitionClass =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    handlers.onError?.('Speech recognition is not supported in this browser.');
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = isContinuous;
    recognition.interimResults = true;
    recognition.lang = targetLangCode;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulatedFinalTranscript = accumulatedFinalTranscript
            ? `${accumulatedFinalTranscript} ${transcriptChunk}`.trim()
            : transcriptChunk.trim();
        } else {
          interimTranscript += transcriptChunk;
        }
      }

      const combinedRaw = interimTranscript
        ? (accumulatedFinalTranscript ? `${accumulatedFinalTranscript} ${interimTranscript}` : interimTranscript)
        : accumulatedFinalTranscript;

      const isFinal = !interimTranscript;
      const formatted = shouldAutoPunctuate
        ? cleanAndFormatVoiceTranscript(combinedRaw, isFinal)
        : combinedRaw;

      handlers.onTranscript(formatted, isFinal);
    };

    recognition.onerror = (event: any) => {
      // Don't kill continuous flow on 'no-speech' transient pauses
      if (event.error === 'no-speech' && isContinuous) {
        return;
      }
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

  accumulatedFinalTranscript = '';
}
