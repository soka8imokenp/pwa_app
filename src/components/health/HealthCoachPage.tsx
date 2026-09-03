import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, Send, User, RotateCcw, Flame, Droplets, Zap, Dumbbell, Apple } from 'lucide-react';
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

    return `${greeting} Я твой персональный клинический ассистент Sumire Health AI.
Я анализирую твои биометрические данные в реальном времени:
• Текущий вес: ${profile.currentWeight} кг (Цель: ${profile.targetWeight} кг, осталось ${direction} ${diffKg} кг)
• BMI: ${metrics.bmi} (${metrics.bmiCategoryLabel})
• Метаболизм: BMR ${metrics.bmr} ккал • TDEE ${metrics.tdee} ккал
• Целевой суточный рацион: ${metrics.targetDailyCalories} ккал (${metrics.targetProteinGrams}г белка)
• Статус за сегодня: ${todaysTotalKcal} ккал съедено, ${todaysWaterTotalMl} мл воды, +${todaysActiveCaloriesBurned} ккал активности

Я специализируюсь исключительно на вопросах BMI, состава тела, правильного питания, калорий и тренировок. Какой вопрос разберем?`;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    playClickSound();

    const userMsg: CoachMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const responseText = await getHealthCoachAdviceWithAI(
        profile,
        metrics,
        textToSend.trim(),
        telemetryContext
      );

      const botMsg: CoachMessage = {
        id: `s-${Date.now()}`,
        sender: 'sumire',
        text: responseText,
        timestamp: Date.now(),
      };

      playSuccessChime();
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
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

  const quickPrompts = [
    'Оцени мой текущий BMI и темп к цели',
    'Оцени мой рацион и калории за сегодня',
    'Сколько калорий и белка мне нужно сегодня?',
    'Что съесть для быстрого восстановления после тренировки?',
    'Как ускорить метаболизм без вреда для здоровья?',
  ];

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      
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
                Specialized in BMI, nutrition, calories & recovery
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

      {/* 2. Quick Topic Inquiries */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block px-1 font-display">
          Quick Health Inquiries:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#24201D] text-[11px] font-bold text-[#24201D] shadow-2xs hover:bg-[#FAF8F5] active:translate-y-0.5 cursor-pointer whitespace-nowrap shrink-0 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Messages Stream */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 min-h-[340px] flex flex-col justify-between">
        <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
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
                {m.text}
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
                Sumire is analyzing your health telemetry...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="pt-2 border-t border-[#24201D]/15 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask about BMI, diet, calories, workouts..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-40 text-white border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs cursor-pointer active:translate-y-0.5 transition-all shrink-0"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>

    </div>
  );
};
