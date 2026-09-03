import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, User, RotateCcw, Image as ImageIcon, X } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import type { HealthProfile, CalculatedHealthMetrics, WeightLog, MealLog, WorkoutLog } from '../../types/health';
import { getHealthCoachAdviceWithAI, type HealthTelemetryContext } from '../../lib/aiHealthService';

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
}

interface CoachMessage {
  id: string;
  sender: 'user' | 'sumire';
  text: string;
  imagePreview?: string;
  timestamp: number;
}

export const HealthCoachPage: React.FC<HealthCoachPageProps> = ({
  profile,
  metrics,
  weightLogs = [],
  todaysMeals = [],
  todaysWaterTotalMl = 0,
  todaysWorkouts = [],
  todaysActiveCaloriesBurned = 0,
  todaysTotalKcal = 0,
  todaysProteinGrams = 0,
  todaysCarbsGrams = 0,
  todaysFatGrams = 0,
}) => {
  const getLiveInitialMessage = (): string => {
    const name = profile.name?.trim() || '';
    const greeting = name ? `Привет, ${name}.` : 'Привет.';
    const diffKg = Math.abs(Number((profile.currentWeight - profile.targetWeight).toFixed(1)));
    const direction = profile.currentWeight > profile.targetWeight ? 'сбросить' : 'набрать';

    return `${greeting} Я твой персональный клинический ассистент и нутрициолог Sumire Health AI.
Я анализирую твои биометрические данные и динамику в реальном времени:
• Текущий вес: ${profile.currentWeight} кг (Цель: ${profile.targetWeight} кг, осталось ${direction} ${diffKg} кг)
• BMI: ${metrics.bmi} (${metrics.bmiCategoryLabel})
• Метаболизм: BMR ${metrics.bmr} ккал • TDEE ${metrics.tdee} ккал
• Целевой суточный рацион: ${metrics.targetDailyCalories} ккал (${metrics.targetProteinGrams}г белка)
• Статус за сегодня: ${todaysTotalKcal} ккал съедено, ${todaysWaterTotalMl} мл воды, +${todaysActiveCaloriesBurned} ккал активности

Ты можешь присылать мне фотографии своей еды (тарелки, перекусы, этикетки) с описанием, задавать любые вопросы о гибкой диете, продуктах, лакомствах, смене целевого веса или тренировках. Я проанализирую состав и дам персональный фидбек!`;
  };

  const [messages, setMessages] = useState<CoachMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_health_coach_chat_history');
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
        id: 'init-1',
        sender: 'sumire',
        text: getLiveInitialMessage(),
        timestamp: Date.now(),
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{
    base64Data: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save conversation history to local storage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('kairo_health_coach_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Context bundle for RAG prompt
  const telemetryContext: HealthTelemetryContext = useMemo(
    () => ({
      todaysMeals,
      todaysWaterTotalMl,
      todaysWorkouts,
      todaysActiveCaloriesBurned,
      todaysTotalKcal,
      todaysProteinGrams,
      todaysCarbsGrams,
      todaysFatGrams,
      weightLogs,
    }),
    [
      todaysMeals,
      todaysWaterTotalMl,
      todaysWorkouts,
      todaysActiveCaloriesBurned,
      todaysTotalKcal,
      todaysProteinGrams,
      todaysCarbsGrams,
      todaysFatGrams,
      weightLogs,
    ]
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setAttachedImage({
        base64Data,
        mimeType: file.type || 'image/jpeg',
        previewUrl: result,
      });
      playClickSound();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = async () => {
    const textToSend = inputQuery.trim();
    if ((!textToSend && !attachedImage) || isLoading) return;

    playClickSound();
    const currentAttachment = attachedImage;

    const userMsg: CoachMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend || 'Оцени это блюдо / фото:',
      imagePreview: currentAttachment?.previewUrl,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const responseText = await getHealthCoachAdviceWithAI(
        profile,
        metrics,
        textToSend || 'Оцени это блюдо на прикрепленной фотографии: определи ингредиенты, оцени примерную калорийность, баланс БЖУ и как это вписывается в мой дневной рацион.',
        telemetryContext,
        currentAttachment
          ? { base64Data: currentAttachment.base64Data, mimeType: currentAttachment.mimeType }
          : undefined,
        messages
      );

      const botMsg: CoachMessage = {
        id: `s-${Date.now()}`,
        sender: 'sumire',
        text: responseText,
        timestamp: Date.now(),
      };

      playSuccessChime();
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Health Coach AI Error:', err);
      const errorMsg: CoachMessage = {
        id: `s-err-${Date.now()}`,
        sender: 'sumire',
        text: err?.message || 'Не удалось связаться с сервисом Gemini. Пожалуйста, проверьте API-ключ в настройках или интернет-соединение.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    playClickSound();
    const initialMsg: CoachMessage = {
      id: `init-${Date.now()}`,
      sender: 'sumire',
      text: getLiveInitialMessage(),
      timestamp: Date.now(),
    };
    setMessages([initialMsg]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_health_coach_chat_history', JSON.stringify([initialMsg]));
    }
  };

  return (
    <div className="w-full space-y-3 pb-3 font-body select-none">
      
      {/* 1. Sumire Coach Header Banner */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DDE8DE] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
              <Bot className="w-5 h-5 text-[#2D503C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black font-display uppercase tracking-tight text-[#24201D]">
                  Sumire Health AI
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-[#FBECCF] border border-[#24201D] text-[9px] font-black uppercase text-[#854D0E] shadow-2xs">
                  Clinical Coach
                </span>
              </div>
              <p className="text-[10px] font-bold text-[#6B635B] mt-0.5">
                Powered by Gemini • Diet, photo food feedback & body analytics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetChat}
            title="Start new consultation"
            className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] text-[#6B635B] hover:text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Real-time telemetry status chips */}
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
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'sumire' && (
                <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#2D503C]" />
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl border-[1.5px] max-w-[88%] text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#F0BB58] border-[#24201D] text-[#24201D] shadow-2xs font-bold rounded-tr-none'
                    : 'bg-[#FAF8F5] border-[#24201D]/25 text-[#24201D] shadow-2xs whitespace-pre-line rounded-tl-none font-medium'
                }`}
              >
                {m.imagePreview && (
                  <div className="mb-2 rounded-xl overflow-hidden border border-[#24201D] shadow-2xs max-w-[220px]">
                    <img
                      src={m.imagePreview}
                      alt="Uploaded food"
                      className="w-full max-h-48 object-cover block"
                    />
                  </div>
                )}
                <div>{m.text}</div>
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-[#24201D] border border-[#24201D] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
                <Bot className="w-3.5 h-3.5 text-[#2D503C] animate-pulse" />
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-[#FAF8F5] border border-[#24201D]/20 text-xs font-bold text-[#6B635B] animate-pulse">
                Sumire is analyzing your request...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Photo Support */}
        <div className="pt-2 border-t border-[#24201D]/15">
          {/* Attached Image Preview */}
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
              handleSend();
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
              title="Attach photo of food / meal"
              className={`w-10 h-10 rounded-xl border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0 ${
                attachedImage
                  ? 'bg-[#F0BB58] text-[#24201D]'
                  : 'bg-[#FAF8F5] hover:bg-stone-200 text-[#24201D]'
              }`}
            >
              <ImageIcon className="w-4 h-4 stroke-[2.25]" />
            </button>

            {/* Query Text Input */}
            <input
              type="text"
              placeholder={attachedImage ? 'Add a note about this food (optional)...' : 'Ask about meals, ice cream, target weight, diet...'}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!inputQuery.trim() && !attachedImage) || isLoading}
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
