import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { askSumireAI, AIChatMessage } from '../../lib/aiService';
import { compressImageFile } from '../../lib/imageCompression';
import {
  startVoiceDictation,
  stopVoiceDictation,
  isSpeechRecognitionSupported,
  getVoiceLanguage,
  setVoiceLanguage,
  getVoiceLanguageBadge,
  VoiceLanguage,
} from '../../lib/speechRecognition';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';
import type { HealthProfile, CalculatedHealthMetrics, WeightLog, MealLog, WorkoutLog } from '../../types/health';

interface HealthCoachPageProps {
  profile: HealthProfile;
  metrics: CalculatedHealthMetrics;
  weightLogs?: WeightLog[];
  todaysMeals?: MealLog[];
  todaysWaterTotalMl?: number;
  todaysWorkouts?: WorkoutLog[];
  todaysActiveCaloriesBurned?: number;
  todaysTotalKcal?: number;
  todaysProteinGrams?: number;
  todaysCarbsGrams?: number;
  todaysFatGrams?: number;
  onDataChanged?: () => void;
}

export const HealthCoachPage: React.FC<HealthCoachPageProps> = ({
  profile,
  metrics,
  todaysMeals = [],
  todaysWaterTotalMl = 0,
  todaysWorkouts = [],
  todaysActiveCaloriesBurned = 0,
  todaysTotalKcal = 0,
  todaysProteinGrams = 0,
  onDataChanged,
}) => {
  const getInitialGreeting = (): string => {
    return `Hi! I'm Sumire, your personal companion for productivity, habits, and health.
How can I assist you today? You can ask me about your schedule, habits, diet, or send a photo of your meal for feedback.`;
  };

  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_health_companion_chat_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // fallback
        }
      }
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: getInitialGreeting(),
        timestamp: Date.now(),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(() => getVoiceLanguage());
  const [attachedImage, setAttachedImage] = useState<{
    base64Data: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist messages
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('kairo_health_companion_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const cycleVoiceLang = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playClickSound();
    const order: VoiceLanguage[] = ['auto', 'ru-RU', 'en-US', 'ja-JP'];
    const nextIdx = (order.indexOf(voiceLang) + 1) % order.length;
    const nextLang = order[nextIdx];
    setVoiceLang(nextLang);
    setVoiceLanguage(nextLang);
  };

  const handleClearHistory = () => {
    playClickSound();
    const initialMsg: AIChatMessage = {
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      content: getInitialGreeting(),
      timestamp: Date.now(),
    };
    setMessages([initialMsg]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_health_companion_chat_history', JSON.stringify([initialMsg]));
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1024, 0.8);
      setAttachedImage(compressed);
      playClickSound();
    } catch (err) {
      console.error('Image compression failed:', err);
    }
    e.target.value = '';
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if ((!text && !attachedImage) || isLoading) return;

    playClickSound();
    const currentAttachment = attachedImage;

    const userMsg: AIChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text || 'Оцени это фото/блюдо:',
      imagePreview: currentAttachment?.previewUrl,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const response = await askSumireAI(
        text,
        messages,
        currentAttachment
          ? { base64Data: currentAttachment.base64Data, mimeType: currentAttachment.mimeType }
          : undefined
      );

      const assistantMsg: AIChatMessage = {
        id: `sumire_${Date.now()}`,
        role: 'assistant',
        content: response.replyText,
        timestamp: Date.now(),
        executedActions: response.executedActions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      playSuccessChime();

      if (response.executedActions && response.executedActions.length > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
        });
        if (onDataChanged) {
          onDataChanged();
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `${err.message || 'Не удалось связаться с Sumire. Проверьте API-ключ в настройках.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Голосовой ввод не поддерживается данным браузером или устройством.');
      return;
    }

    if (isRecording) {
      stopVoiceDictation();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      startVoiceDictation(
        {
          onTranscript: (transcript: string) => {
            setInputText(transcript);
          },
          onError: (err: string) => {
            console.error(err);
            setIsRecording(false);
          },
          onEnd: () => {
            setIsRecording(false);
          },
        },
        {
          lang: voiceLang,
          continuous: true,
          autoPunctuate: true,
        }
      );
    }
  };

  return (
    <div className="w-full space-y-3 pb-3 font-body select-none">
      
      {/* 1. Sumire Companion Top Header */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Signature Sumire Avatar SVG */}
            <div className="w-10 h-10 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-xs overflow-hidden p-0.5 shrink-0">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="50" cy="50" r="46" fill="#DDE8DE" stroke="#24201D" strokeWidth="4" />
                <ellipse cx="38" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#24201D" strokeWidth="3" />
                <ellipse cx="38" cy="26" rx="3.5" ry="11" fill="#FCA5A5" />
                <ellipse cx="62" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#24201D" strokeWidth="3" />
                <ellipse cx="62" cy="26" rx="3.5" ry="11" fill="#FCA5A5" />
                <circle cx="50" cy="56" r="28" fill="#FFFFFF" stroke="#24201D" strokeWidth="3" />
                <ellipse cx="40" cy="52" rx="4" ry="5" fill="#24201D" />
                <circle cx="39" cy="50" r="1.5" fill="#FFFFFF" />
                <ellipse cx="60" cy="52" rx="4" ry="5" fill="#24201D" />
                <circle cx="59" cy="50" r="1.5" fill="#FFFFFF" />
                <ellipse cx="50" cy="59" rx="2.5" ry="1.8" fill="#C25E40" />
                <path d="M47 62 Q50 65 53 62" stroke="#24201D" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="34" cy="58" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.8" />
                <ellipse cx="66" cy="58" rx="4" ry="2.5" fill="#FCA5A5" opacity="0.8" />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black font-display uppercase tracking-tight text-[#24201D]">
                  Sumire Companion
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-[#FBECCF] border border-[#24201D] text-[9px] font-black uppercase text-[#854D0E] shadow-2xs">
                  Scout & Health
                </span>
              </div>
              <p className="text-[10px] font-bold text-[#6B635B] mt-0.5">
                Food photo feedback • Nutrition • Habits • Productivity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Switcher Badge */}
            <button
              onClick={cycleVoiceLang}
              title="Voice language (Click to switch)"
              className="px-2 py-1 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] text-[10px] font-black uppercase text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              {getVoiceLanguageBadge(voiceLang)}
            </button>

            {/* Clear History */}
            <button
              onClick={handleClearHistory}
              title="Clear conversation history"
              className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-rose-50 border border-[#24201D] text-stone-600 hover:text-rose-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live biometrics status capsule */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <div className="p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center">
            <span className="text-[8px] font-bold text-[#6B635B] uppercase block">BMI</span>
            <span className="text-xs font-black font-mono-num text-[#24201D]">{metrics.bmi}</span>
          </div>
          <div className="p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center">
            <span className="text-[8px] font-bold text-[#6B635B] uppercase block">Intake</span>
            <span className="text-xs font-black font-mono-num text-[#24201D]">
              {todaysTotalKcal} <span className="text-[9px] text-stone-400">k</span>
            </span>
          </div>
          <div className="p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center">
            <span className="text-[8px] font-bold text-[#6B635B] uppercase block">Protein</span>
            <span className="text-xs font-black font-mono-num text-[#24201D]">
              {todaysProteinGrams} <span className="text-[9px] text-stone-400">g</span>
            </span>
          </div>
          <div className="p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center">
            <span className="text-[8px] font-bold text-[#6B635B] uppercase block">Burn</span>
            <span className="text-xs font-black font-mono-num text-[#DC2626]">
              +{todaysActiveCaloriesBurned}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Messages Stream */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shrink-0 shadow-2xs mt-0.5 overflow-hidden p-0.5">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <circle cx="50" cy="50" r="46" fill="#DDE8DE" stroke="#24201D" strokeWidth="5" />
                    <ellipse cx="38" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#24201D" strokeWidth="4" />
                    <ellipse cx="62" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#24201D" strokeWidth="4" />
                    <circle cx="50" cy="56" r="28" fill="#FFFFFF" stroke="#24201D" strokeWidth="4" />
                    <ellipse cx="40" cy="52" rx="4" ry="5" fill="#24201D" />
                    <ellipse cx="60" cy="52" rx="4" ry="5" fill="#24201D" />
                    <ellipse cx="50" cy="59" rx="2.5" ry="1.8" fill="#C25E40" />
                  </svg>
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl border-[1.5px] max-w-[88%] text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#F0BB58] border-[#24201D] text-[#24201D] shadow-2xs font-bold rounded-tr-none'
                    : 'bg-[#FAF8F5] border-[#24201D]/25 text-[#24201D] shadow-2xs whitespace-pre-line rounded-tl-none font-medium'
                }`}
              >
                {/* Photo attachment display */}
                {m.imagePreview && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-[#24201D] shadow-2xs max-w-[240px]">
                    <img
                      src={m.imagePreview}
                      alt="Uploaded meal"
                      className="w-full max-h-52 object-cover block"
                    />
                  </div>
                )}

                <div>{m.content}</div>

                {/* Render executed tool actions */}
                {m.executedActions && m.executedActions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#24201D]/15 space-y-1">
                    {m.executedActions.map((action, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#DDE8DE] border border-[#24201D] text-[10px] font-bold text-[#2D503C]"
                      >
                        <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                        <span>{action.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs animate-pulse overflow-hidden p-0.5">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <circle cx="50" cy="50" r="46" fill="#DDE8DE" stroke="#24201D" strokeWidth="5" />
                  <ellipse cx="38" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#24201D" strokeWidth="4" />
                  <ellipse cx="62" cy="26" rx="7" ry="18" fill="#FFFFFF" stroke="#24201D" strokeWidth="4" />
                  <circle cx="50" cy="56" r="28" fill="#FFFFFF" stroke="#24201D" strokeWidth="4" />
                </svg>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-[#FAF8F5] border border-[#24201D]/20 text-xs font-bold text-[#6B635B] animate-pulse">
                Sumire is analyzing...
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar with Photo & Mic */}
        <div className="pt-2 border-t border-[#24201D]/15">
          {/* Attached Image Thumbnail Preview */}
          {attachedImage && (
            <div className="relative inline-block mb-2">
              <img
                src={attachedImage.previewUrl}
                alt="Attached preview"
                className="w-16 h-16 object-cover rounded-xl border-[1.75px] border-[#24201D] shadow-2xs block"
              />
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setAttachedImage(null);
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#24201D] text-white flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <X className="w-3 h-3 stroke-[3]" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Photo Attachment Button */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                fileInputRef.current?.click();
              }}
              title="Attach photo of food or meal"
              className={`w-10 h-10 rounded-xl border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0 ${
                attachedImage
                  ? 'bg-[#F0BB58] text-[#24201D]'
                  : 'bg-[#FAF8F5] hover:bg-stone-200 text-[#24201D]'
              }`}
            >
              <ImageIcon className="w-4 h-4 stroke-[2.25]" />
            </button>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isRecording ? 'Stop voice recording' : 'Start voice dictation'}
              className={`w-10 h-10 rounded-xl border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0 ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-[#FAF8F5] hover:bg-stone-200 text-[#24201D]'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4 stroke-[2.25]" />
              ) : (
                <Mic className="w-4 h-4 stroke-[2.25]" />
              )}
            </button>

            {/* Query Text Input */}
            <input
              type="text"
              placeholder={attachedImage ? 'Add a question about this food (optional)...' : 'Ask about meals, ice cream, target weight, tasks...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && !attachedImage) || isLoading}
              className="w-10 h-10 rounded-xl bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-40 text-white border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};
