import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Flame, Apple, Dumbbell, Droplets } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import type { HealthProfile, CalculatedHealthMetrics } from '../../types/health';
import { getHealthCoachAdviceWithAI } from '../../lib/aiHealthService';

interface HealthCoachPageProps {
  profile: HealthProfile;
  metrics: CalculatedHealthMetrics;
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
}) => {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'init-1',
      sender: 'sumire',
      text: `Привет, ${profile.name || 'Alex'}. Я проанализировала твои параметры:
• Текущий вес: ${profile.currentWeight} кг (Цель: ${profile.targetWeight} кг)
• BMI: ${metrics.bmi} (${metrics.bmiCategoryLabel})
• Базовый обмен веществ (BMR): ${metrics.bmr} ккал
• Рекомендуемая суточная норма для цели (${profile.goal}): ${metrics.targetDailyCalories} ккал
• Норма белка: ${metrics.targetProteinGrams}г | Вода: ${(metrics.targetWaterMl / 1000).toFixed(1)}л

Какой вопрос по питанию, весу или тренировкам разберем сегодня?`,
      timestamp: Date.now(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
      const responseText = await getHealthCoachAdviceWithAI(profile, metrics, textToSend.trim());

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

  const quickPrompts = [
    'Оцени мой текущий BMI и темп к цели',
    'Составь пример здорового меню на день',
    'Сколько белка съедать и из каких продуктов?',
    'Что лучше съесть после силовой тренировки?',
  ];

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      
      {/* 1. Sumire Coach Header Banner */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
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
            <p className="text-[11px] font-bold text-[#6B635B] mt-0.5">
              Evidence-based nutrition, metabolic analytics & recovery
            </p>
          </div>
        </div>

        {/* Quick health summary chips */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <div className="p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase block">BMI Index</span>
            <span className="text-xs font-black font-mono-num text-[#24201D]">{metrics.bmi}</span>
          </div>
          <div className="p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Daily Cal</span>
            <span className="text-xs font-black font-mono-num text-[#24201D]">{metrics.targetDailyCalories}</span>
          </div>
          <div className="p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Target Protein</span>
            <span className="text-xs font-black font-mono-num text-[#24201D]">{metrics.targetProteinGrams}g</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Topic Chips */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-[#6B635B] uppercase tracking-wider block px-1">
          Quick Inquiries
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
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 min-h-[300px] flex flex-col justify-between">
        <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
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
                className={`p-3 rounded-2xl border-[1.5px] max-w-[85%] text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#F0BB58] border-[#24201D] text-[#24201D] shadow-2xs font-bold rounded-tr-none'
                    : 'bg-[#FAF8F5] border-[#24201D]/25 text-[#24201D] shadow-2xs whitespace-pre-line rounded-tl-none'
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
                Sumire is analyzing your health data...
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
            placeholder="Ask anything about diet, weight, workout..."
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
