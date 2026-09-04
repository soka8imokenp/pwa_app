import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  Utensils,
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
        ? `сбросить ещё ${Math.max(0, delta)} кг`
        : profile.goal === 'gain'
        ? `набрать ${Math.max(0, Math.abs(delta))} кг`
        : 'поддерживать форму';

    return `Привет! Я Сумирэ — твой персональный наставник по питанию и здоровью. Твоя цель: ${goalText}. Сфотографируй блюдо, опиши свой рацион или спроси совет — я рассчитаю калории, БЖУ и сразу внесу всё в твой дневник питания!`;
  };

  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_health_companion_chat_history');
      if (saved) {
        try {
          return JSON.parse(saved);
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
          const actionDesc = `Внесено в рацион (${meal.mealType}): ${meal.name} (${meal.kcal} ккал, Б:${meal.proteinGrams}г, Ж:${meal.fatGrams}г, У:${meal.carbsGrams}г)`;
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
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#24201D]">
                  Sumire AI Coach
                </h3>
                <span className="px-1.5 py-0.2 rounded-md bg-[#DDE8DE] border border-[#24201D]/20 text-[9px] font-black text-[#2D503C] uppercase tracking-wider font-display">
                  Live
                </span>
              </div>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Анализ фото блюд • Дневник питания • Управление трекерами
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Clear History Button */}
            <button
              type="button"
              onClick={handleClearHistory}
              title="Очистить историю чата"
              className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border-[1.5px] border-[#24201D] text-[#24201D] shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.25]" />
            </button>

            {/* Language Switcher Pill */}
            <button
              type="button"
              onClick={cycleVoiceLang}
              title={`Язык распознавания речи: ${voiceLang.toUpperCase()}. Нажмите для переключения.`}
              className="px-2 py-1 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border-[1.5px] border-[#24201D] text-[10px] font-black font-mono-num text-[#24201D] shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
            >
              {getVoiceLanguageBadge(voiceLang)}
            </button>
          </div>
        </div>

        {/* Live Context Telemetry Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none text-[10px] font-bold text-[#6B635B]">
          <div className="px-2 py-1 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center gap-1.5 shrink-0 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[#24201D] font-mono-num font-black">{todaysTotalKcal}</span> / {metrics.targetDailyCalories} ккал
          </div>
          <div className="px-2 py-1 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center gap-1.5 shrink-0 shadow-2xs">
            <span>Белки:</span>
            <span className="text-[#24201D] font-mono-num font-black">{todaysProteinGrams}</span> / {metrics.targetProteinGrams}г
          </div>
          <div className="px-2 py-1 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center gap-1.5 shrink-0 shadow-2xs">
            <span>Вода:</span>
            <span className="text-[#24201D] font-mono-num font-black">{todaysWaterTotalMl}</span> / {metrics.targetWaterMl} мл
          </div>
          {todaysActiveCaloriesBurned > 0 && (
            <div className="px-2 py-1 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center gap-1.5 shrink-0 shadow-2xs text-[#C25E40]">
              <span>+{todaysActiveCaloriesBurned} ккал сожжено</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Interactive Chat Feed Container */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="min-h-[300px] max-h-[500px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 items-start ${
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar Icon */}
              {m.role === 'assistant' ? (
                <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0 overflow-hidden p-0.5">
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
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed border-[1.75px] border-[#24201D] shadow-2xs whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#F0BB58] text-[#24201D] rounded-tr-xs font-bold'
                    : 'bg-[#FAF8F5] text-[#24201D] rounded-tl-xs font-medium'
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

                {/* Suggested Meal 1-Tap Save Card */}
                {m.suggestedMeal && (
                  <div className="mt-2.5 p-3 bg-[#FFF9E6] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-[#24201D]">
                        <Utensils className="w-3.5 h-3.5 text-amber-700" />
                        <span>Оценка блюда: {m.suggestedMeal.name}</span>
                      </div>
                      <span className="text-xs font-black font-mono-num text-[#24201D] bg-[#FEF08A] px-2 py-0.5 rounded-lg border border-[#24201D]/20">
                        {m.suggestedMeal.kcal} ккал
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold font-mono-num text-[#6B635B]">
                      <span className="bg-white/90 px-1.5 py-0.5 rounded border border-black/10">Б: {m.suggestedMeal.proteinGrams}г</span>
                      <span className="bg-white/90 px-1.5 py-0.5 rounded border border-black/10">Ж: {m.suggestedMeal.fatGrams}г</span>
                      <span className="bg-white/90 px-1.5 py-0.5 rounded border border-black/10">У: {m.suggestedMeal.carbsGrams}г</span>
                      <span className="ml-auto text-[9px] font-black uppercase text-stone-500">
                        {m.suggestedMeal.mealType === 'breakfast' ? 'Завтрак' : m.suggestedMeal.mealType === 'lunch' ? 'Обед' : m.suggestedMeal.mealType === 'dinner' ? 'Ужин' : 'Перекус'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLogSuggestedMeal(m.suggestedMeal!, m.id)}
                      className="w-full py-2 px-3 rounded-xl bg-[#2D503C] hover:bg-[#233f2f] text-white text-xs font-black tracking-wide flex items-center justify-center gap-1.5 shadow-2xs active:translate-y-0.5 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Записать в дневник питания</span>
                    </button>
                  </div>
                )}

                {/* Render executed tool actions */}
                {m.executedActions && m.executedActions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#24201D]/15 space-y-2">
                    {m.executedActions.map((action, idx) => {
                      if (action.type === 'log_meal' && action.details) {
                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-[#24201D]/30 rounded-xl shadow-2xs space-y-1 text-[#24201D]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-black text-xs">
                                <Utensils className="w-3.5 h-3.5 text-[#C25E40]" />
                                <span>{action.details.name}</span>
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FEF08A] border border-[#24201D]/20">
                                  {action.details.mealType === 'breakfast'
                                    ? 'Завтрак'
                                    : action.details.mealType === 'lunch'
                                    ? 'Обед'
                                    : action.details.mealType === 'dinner'
                                    ? 'Ужин'
                                    : 'Перекус'}
                                </span>
                              </div>
                              <span className="text-xs font-black font-mono-num text-[#C25E40]">
                                +{action.details.kcal} ккал
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold font-mono-num text-[#6B635B]">
                              <span>Б: {action.details.proteinGrams}г</span>
                              <span>•</span>
                              <span>Ж: {action.details.fatGrams}г</span>
                              <span>•</span>
                              <span>У: {action.details.carbsGrams}г</span>
                              {action.details.time && (
                                <>
                                  <span>•</span>
                                  <span>{action.details.time}</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (action.type === 'log_water') {
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-[#E0F2FE] border border-[#0284C7]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#0369A1]"
                          >
                            <Droplets className="w-3.5 h-3.5 text-[#0284C7]" />
                            <span>{action.description}</span>
                          </div>
                        );
                      }

                      if (action.type === 'log_weight') {
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-[#FEF3C7] border border-[#D97706]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#B45309]"
                          >
                            <Scale className="w-3.5 h-3.5 text-[#D97706]" />
                            <span>{action.description}</span>
                          </div>
                        );
                      }

                      if (action.type === 'log_workout') {
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-[#FEE2E2] border border-[#DC2626]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#B91C1C]"
                          >
                            <Dumbbell className="w-3.5 h-3.5 text-[#DC2626]" />
                            <span>{action.description}</span>
                          </div>
                        );
                      }

                      if (action.type === 'create_task') {
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-[#FEF9C3] border border-[#CA8A04]/40 rounded-xl flex items-center gap-2 text-[11px] font-bold text-[#854D0E]"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-[#CA8A04]" />
                            <span>{action.description}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#DDE8DE] border border-[#24201D] text-[10px] font-bold text-[#2D503C]"
                        >
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          <span>{action.description}</span>
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
                Сумирэ анализирует...
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
            {/* Photo Attachment Button */}
            <label
              title="Прикрепить фото блюда или этикетки"
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
              title={isRecording ? 'Остановить голосовой ввод' : 'Начать голосовой ввод'}
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
              placeholder={attachedImage ? 'Добавьте комментарий или вопрос к фото (опционально)...' : 'Спросите про рацион, скажите «запиши пиццу на ужин», задачу...'}
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
