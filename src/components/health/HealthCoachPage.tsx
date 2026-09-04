import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  Plus,
  Droplets,
  Scale,
  Dumbbell,
  CheckSquare,
} from 'lucide-react';
import {
  askSumireAI,
  AIChatMessage,
  logMealDirectly,
  EstimatedMealResult,
} from '../../lib/aiService';
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

const getMealCategoryLabel = (mealType?: string): string => {
  switch (mealType) {
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    case 'dinner':
      return 'Dinner';
    case 'snack':
      return 'Snacks & Drinks';
    default:
      return 'Meals';
  }
};

const FormattedMessageText: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 text-xs text-[#24201D] leading-relaxed break-words">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        const isBullet = /^[\*\-•]\s+/.test(trimmed);
        const textContent = isBullet ? trimmed.replace(/^[\*\-•]\s+/, '') : line;

        const renderFormattedParts = (text: string) => {
          const parts = text.split(/(\*\*[^*]+\*\*)/g);
          return parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-black text-[#24201D]">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          });
        };

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C25E40] shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0 leading-relaxed">
                {renderFormattedParts(textContent)}
              </div>
            </div>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {renderFormattedParts(line)}
          </p>
        );
      })}
    </div>
  );
};

export const HealthCoachPage: React.FC<HealthCoachPageProps> = ({
  profile,
  metrics,
  todaysWaterTotalMl = 0,
  todaysActiveCaloriesBurned = 0,
  todaysTotalKcal = 0,
  todaysProteinGrams = 0,
  onDataChanged,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<{
    base64Data: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(() => getVoiceLanguage());

  const getInitialGreeting = (): string => {
    const delta = Number((profile.currentWeight - profile.targetWeight).toFixed(1));
    const goalText =
      profile.goal === 'lose'
        ? `lose ${Math.max(0, delta)} kg`
        : profile.goal === 'gain'
        ? `gain ${Math.max(0, Math.abs(delta))} kg`
        : 'maintain optimal body composition';

    return `Hi! I am Sumire — your personal nutrition and health assistant. Your goal is to ${goalText}. Snap a meal photo, speak via voice dictation, or describe what you ate — I'll estimate macros and automatically log everything into your daily tracker!`;
  };

  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_health_companion_chat_history');
      if (saved) {
        try {
          const parsed: AIChatMessage[] = JSON.parse(saved);
          // If the initial welcome message is still old Russian text, replace it with English
          if (
            parsed.length === 1 &&
            parsed[0].id.includes('welcome') &&
            /[а-яё]/i.test(parsed[0].content)
          ) {
            return [
              {
                id: 'initial_welcome',
                role: 'assistant',
                content: getInitialGreeting(),
                timestamp: Date.now(),
              },
            ];
          }
          return parsed;
        } catch (e) {}
      }
    }
    return [
      {
        id: 'initial_welcome',
        role: 'assistant',
        content: getInitialGreeting(),
        timestamp: Date.now(),
      },
    ];
  });

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (instant = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth',
      });
    }
  };

  // Immediate scroll to bottom on mount so chat opens at the end
  useEffect(() => {
    scrollToBottom(true);
    const timer = setTimeout(() => scrollToBottom(true), 60);
    return () => clearTimeout(timer);
  }, []);

  // Persist messages
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('kairo_health_companion_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom whenever messages or loading state change
  useEffect(() => {
    scrollToBottom(false);
  }, [messages, isLoading]);

  const cycleVoiceLang = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playClickSound();
    const order: VoiceLanguage[] = ['auto', 'en-US', 'ru-RU', 'ja-JP'];
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

  const handleLogSuggestedMeal = async (meal: EstimatedMealResult, msgId: string) => {
    playClickSound();
    await logMealDirectly(meal);
    playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
    if (onDataChanged) {
      onDataChanged();
    }
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const catLabel = getMealCategoryLabel(meal.mealType);
          const actionDesc = `Logged to ${catLabel}: ${meal.name} (${meal.kcal} kcal, P:${meal.proteinGrams}g, F:${meal.fatGrams}g, C:${meal.carbsGrams}g)`;
          const existingActions = m.executedActions || [];
          return {
            ...m,
            suggestedMeal: undefined,
            executedActions: [
              ...existingActions,
              {
                type: 'log_meal' as const,
                description: actionDesc,
                details: meal,
              },
            ],
          };
        }
        return m;
      })
    );
  };

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if ((!text && !attachedImage) || isLoading) return;

    playClickSound();
    const currentAttachment = attachedImage;

    const userMsg: AIChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text || 'Analyze this meal:',
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
        suggestedMeal: response.suggestedMeal,
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
          content: `${err.message || 'Unable to connect to Sumire AI. Please check your Gemini API key in Settings.'}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Voice dictation is not supported in this browser or device.');
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
      {/* 1. Streamlined Sumire AI Assistant Header */}
      <div className="p-3.5 sm:p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Signature Sumire Avatar SVG */}
            <div className="w-10 h-10 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs overflow-hidden p-0.5 shrink-0">
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

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#24201D] truncate">
                  Sumire AI Assistant
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#DDE8DE] border border-[#2D503C]/20 text-[9px] font-black text-[#2D503C] uppercase tracking-wider font-display shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ready
                </span>
              </div>
              <p className="text-[10px] font-bold text-[#6B635B] truncate">
                Nutrition vision • Voice logging • Smart intake sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Clear History Button */}
            <button
              type="button"
              onClick={handleClearHistory}
              title="Clear chat history"
              className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border-[1.5px] border-[#24201D] text-[#24201D] shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.25]" />
            </button>

            {/* Language Switcher Pill */}
            <button
              type="button"
              onClick={cycleVoiceLang}
              title={`Voice input language: ${voiceLang.toUpperCase()}. Tap to toggle.`}
              className="px-2 py-1 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border-[1.5px] border-[#24201D] text-[10px] font-black font-mono-num text-[#24201D] shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
            >
              {getVoiceLanguageBadge(voiceLang)}
            </button>
          </div>
        </div>

        {/* Clean Context Telemetry Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none text-[10px] font-bold text-[#6B635B]">
          <div className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center gap-1.5 shrink-0 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[#24201D] font-mono-num font-black">{todaysTotalKcal}</span> / {metrics.targetDailyCalories} kcal
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center gap-1.5 shrink-0 shadow-2xs">
            <span>Protein:</span>
            <span className="text-[#24201D] font-mono-num font-black">{todaysProteinGrams}</span> / {metrics.targetProteinGrams}g
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center gap-1.5 shrink-0 shadow-2xs">
            <span>Water:</span>
            <span className="text-[#24201D] font-mono-num font-black">{(todaysWaterTotalMl / 1000).toFixed(1)}</span> / {(metrics.targetWaterMl / 1000).toFixed(1)}L
          </div>
          {todaysActiveCaloriesBurned > 0 && (
            <div className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center gap-1.5 shrink-0 shadow-2xs text-[#C25E40]">
              <span>+{todaysActiveCaloriesBurned} kcal burned</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Chat Container with Fixed Height and Internal Scroll */}
      <div className="h-[520px] sm:h-[580px] bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex flex-col overflow-hidden">
        {/* Scrollable Messages Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 pr-2 scrollbar-thin"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 items-start ${
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Assistant Avatar Icon */}
              {m.role === 'assistant' ? (
                <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0 overflow-hidden p-0.5 mt-0.5">
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
                  </svg>
                </div>
              ) : null}

              {/* Message Bubble */}
              <div
                className={`max-w-[94%] sm:max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed border-[1.75px] border-[#24201D] shadow-2xs ${
                  m.role === 'user'
                    ? 'bg-[#F0BB58] text-[#24201D] rounded-tr-xs font-bold whitespace-pre-wrap'
                    : 'bg-[#FAF8F5] text-[#24201D] rounded-tl-xs font-medium'
                }`}
              >
                {/* Photo attachment display */}
                {m.imagePreview && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-[#24201D] shadow-2xs max-w-[260px]">
                    <img
                      src={m.imagePreview}
                      alt="Uploaded meal"
                      className="w-full max-h-56 object-cover block"
                    />
                  </div>
                )}

                {/* Formatted Content */}
                {m.role === 'assistant' ? (
                  <FormattedMessageText content={m.content} />
                ) : (
                  <div>{m.content}</div>
                )}

                {/* Suggested Meal 1-Tap Save Card */}
                {m.suggestedMeal && (
                  <div className="mt-3 p-3.5 bg-[#FFFDF5] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
                    {/* Header: Name & Calorie Counter */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#FEF08A] border border-[#24201D]/30 text-[#24201D] font-display tracking-wider">
                            {getMealCategoryLabel(m.suggestedMeal.mealType)}
                          </span>
                          <span className="text-[10px] font-bold text-[#6B635B]">
                            Meal Analysis
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-[#24201D] leading-snug break-words">
                          {m.suggestedMeal.name}
                        </h4>
                      </div>

                      <div className="shrink-0 text-right bg-[#FAF8F5] px-2.5 py-1 rounded-xl border border-[#24201D]/30 shadow-2xs">
                        <span className="text-sm font-black font-mono-num text-[#C25E40] block leading-none">
                          {m.suggestedMeal.kcal}
                        </span>
                        <span className="text-[8px] font-black uppercase text-stone-500 font-display block mt-0.5">
                          kcal
                        </span>
                      </div>
                    </div>

                    {/* Macronutrient Pills Grid */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-300/60 shadow-2xs">
                        <span className="text-[9px] font-bold text-emerald-700 block uppercase font-display">PROTEIN</span>
                        <span className="text-xs font-black font-mono-num text-emerald-900 block leading-tight">{m.suggestedMeal.proteinGrams}g</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-300/60 shadow-2xs">
                        <span className="text-[9px] font-bold text-amber-700 block uppercase font-display">FAT</span>
                        <span className="text-xs font-black font-mono-num text-amber-900 block leading-tight">{m.suggestedMeal.fatGrams}g</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-sky-50 border border-sky-300/60 shadow-2xs">
                        <span className="text-[9px] font-bold text-sky-700 block uppercase font-display">CARBS</span>
                        <span className="text-xs font-black font-mono-num text-sky-900 block leading-tight">{m.suggestedMeal.carbsGrams}g</span>
                      </div>
                    </div>

                    {/* 1-Tap Save Button */}
                    <button
                      type="button"
                      onClick={() => handleLogSuggestedMeal(m.suggestedMeal!, m.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#24201D] hover:bg-stone-800 active:translate-y-0.5 text-white text-xs font-black tracking-wide flex items-center justify-center gap-1.5 shadow-[1.5px_1.5px_0px_#24201D] cursor-pointer transition-all font-display"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Log to Daily Meals</span>
                    </button>
                  </div>
                )}

                {/* Render executed tool actions */}
                {m.executedActions && m.executedActions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#24201D]/15 space-y-2">
                    {m.executedActions.map((action, idx) => {
                      if (action.type === 'log_meal' && action.details) {
                        return (
                          <div
                            key={idx}
                            className="p-3 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 font-display tracking-wider">
                                    ✓ Logged to {getMealCategoryLabel(action.details.mealType)}
                                  </span>
                                  {action.details.time && (
                                    <span className="text-[9px] font-bold text-stone-400 font-mono-num">
                                      {action.details.time}
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-xs font-black text-[#24201D] leading-snug break-words">
                                  {action.details.name}
                                </h5>
                              </div>
                              <div className="shrink-0 text-right bg-[#FAF8F5] px-2 py-1 rounded-xl border border-[#24201D]/20 shadow-2xs">
                                <span className="text-xs font-black font-mono-num text-[#C25E40] block leading-none">
                                  +{action.details.kcal}
                                </span>
                                <span className="text-[8px] font-bold text-stone-400 font-display block mt-0.5">kcal</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-center">
                              <div className="py-1 px-1.5 rounded-lg bg-[#FAF8F5] border border-stone-200">
                                <span className="text-[8px] font-bold text-stone-500 block uppercase">PROTEIN</span>
                                <span className="text-[11px] font-black font-mono-num text-[#24201D]">{action.details.proteinGrams}g</span>
                              </div>
                              <div className="py-1 px-1.5 rounded-lg bg-[#FAF8F5] border border-stone-200">
                                <span className="text-[8px] font-bold text-stone-500 block uppercase">FAT</span>
                                <span className="text-[11px] font-black font-mono-num text-[#24201D]">{action.details.fatGrams}g</span>
                              </div>
                              <div className="py-1 px-1.5 rounded-lg bg-[#FAF8F5] border border-stone-200">
                                <span className="text-[8px] font-bold text-stone-500 block uppercase">CARBS</span>
                                <span className="text-[11px] font-black font-mono-num text-[#24201D]">{action.details.carbsGrams}g</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (action.type === 'log_water') {
                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-[#E0F2FE] border border-[#0284C7]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#0369A1]"
                          >
                            <Droplets className="w-4 h-4 text-[#0284C7] shrink-0" />
                            <span className="break-words">{action.description}</span>
                          </div>
                        );
                      }

                      if (action.type === 'log_weight') {
                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-[#FEF3C7] border border-[#D97706]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#B45309]"
                          >
                            <Scale className="w-4 h-4 text-[#D97706] shrink-0" />
                            <span className="break-words">{action.description}</span>
                          </div>
                        );
                      }

                      if (action.type === 'log_workout') {
                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-[#FEE2E2] border border-[#DC2626]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#B91C1C]"
                          >
                            <Dumbbell className="w-4 h-4 text-[#DC2626] shrink-0" />
                            <span className="break-words">{action.description}</span>
                          </div>
                        );
                      }

                      if (action.type === 'create_task') {
                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-[#FEF9C3] border border-[#CA8A04]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#854D0E]"
                          >
                            <CheckSquare className="w-4 h-4 text-[#CA8A04] shrink-0" />
                            <span className="break-words">{action.description}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#DDE8DE] border border-[#24201D] text-[11px] font-bold text-[#2D503C]"
                        >
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5] shrink-0" />
                          <span className="break-words">{action.description}</span>
                        </div>
                      );
                    })}
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

        {/* 3. Pinned Input Bar with Photo & Mic */}
        <div className="p-3 bg-[#FFFDF5] border-t border-[#24201D]/15 shrink-0">
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
            {/* Photo Attachment Button */}
            <label
              title="Attach meal photo or food label"
              className={`w-10 h-10 rounded-xl border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0 ${
                attachedImage
                  ? 'bg-[#F0BB58] text-[#24201D]'
                  : 'bg-[#FAF8F5] hover:bg-stone-200 text-[#24201D]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <ImageIcon className="w-4 h-4 stroke-[2.25]" />
            </label>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isRecording ? 'Stop voice dictation' : 'Start voice dictation'}
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
              placeholder={attachedImage ? 'Add details or a question about this photo...' : 'Ask about nutrition, or say "log 2 slices of pizza for dinner"...'}
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
