import React, { useState } from 'react';
import { Sparkles, Flame } from 'lucide-react';
import { playClickSound } from '../../lib/sound';

export interface DayActivity {
  dayShort: string;
  dayNumber: string | number;
  dateStr: string;
  completionRate: number; // 0 to 100
  focusMinutes: number;
  isToday: boolean;
  isSelected: boolean;
}

interface WeeklyActivityChartProps {
  days: DayActivity[];
  onSelectDate: (dateStr: string) => void;
  weeklyStreak: number;
  totalFocusTime: number; // minutes
}

export const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({
  days,
  onSelectDate,
  totalFocusTime,
}) => {
  const [activeTooltipDay, setActiveTooltipDay] = useState<DayActivity | null>(null);

  const avgCompletion = Math.round(
    days.reduce((acc, d) => acc + d.completionRate, 0) / (days.length || 1)
  );

  return (
    <div className="bg-white/95 backdrop-blur-md border-[1.5px] border-[#18181B] rounded-[2rem] p-4 shadow-[2.5px_2.5px_0px_#18181B] space-y-3 font-body select-none">
      
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#E9D5FF] border border-[#18181B] flex items-center justify-center text-xs shadow-2xs">
            📊
          </div>
          <div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B] flex items-center gap-1">
              Weekly Momentum
              <Sparkles className="w-3 h-3 text-purple-700 fill-purple-300" />
            </h3>
            <p className="text-[10px] font-semibold text-slate-500">
              {avgCompletion}% average daily score
            </p>
          </div>
        </div>

        {/* Weekly Focus Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF08A] border border-[#18181B] rounded-full text-[10px] font-black text-[#18181B] shadow-2xs">
          <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          <span>{totalFocusTime}m focus</span>
        </div>
      </div>

      {/* Interactive Tooltip Card */}
      {activeTooltipDay ? (
        <div className="p-2.5 bg-[#FAF7F2] border border-[#18181B] rounded-2xl flex items-center justify-between text-xs animate-in fade-in zoom-in-95 duration-100 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C084FC] animate-ping" />
            <span className="font-black font-display text-[#18181B]">
              {activeTooltipDay.dayShort}, Day {activeTooltipDay.dayNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold font-mono-num text-purple-900">
            <span>🎯 {activeTooltipDay.completionRate}% Done</span>
            <span>⏱️ {activeTooltipDay.focusMinutes}m</span>
          </div>
        </div>
      ) : null}

      {/* 7-Day Animated Interactive Bar Graph */}
      <div className="grid grid-cols-7 gap-2 pt-1 items-end h-28 px-1">
        {days.map((day) => {
          const barHeight = Math.max(day.completionRate, 14);
          const isFull = day.completionRate >= 100;
          const isSelected = day.isSelected;

          return (
            <div
              key={day.dateStr}
              onClick={() => {
                playClickSound();
                onSelectDate(day.dateStr);
                setActiveTooltipDay(day);
              }}
              onMouseEnter={() => setActiveTooltipDay(day)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer h-full justify-end"
            >
              {/* Animated Graph Bar */}
              <div className="w-full max-w-[28px] h-20 bg-[#FAF7F2] rounded-full border border-slate-200 p-0.5 flex flex-col justify-end relative overflow-hidden group-hover:border-[#18181B] transition-colors">
                <div
                  style={{ height: `${barHeight}%` }}
                  className={`w-full rounded-full transition-all duration-500 ease-out border border-[#18181B] shadow-2xs ${
                    isFull
                      ? 'bg-[#BEF264]'
                      : day.completionRate > 0
                      ? 'bg-[#C084FC]'
                      : 'bg-slate-200'
                  }`}
                />
              </div>

              {/* Day Label */}
              <div className="flex flex-col items-center">
                <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-[#18181B] font-black' : 'text-slate-400'}`}>
                  {day.dayShort}
                </span>
                <span
                  className={`text-[10px] font-black font-mono-num rounded-full px-1 ${
                    day.isToday
                      ? 'bg-[#18181B] text-white'
                      : isSelected
                      ? 'bg-[#E9D5FF] text-[#18181B]'
                      : 'text-slate-700'
                  }`}
                >
                  {day.dayNumber}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
