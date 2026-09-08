import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Footprints,
  Trophy,
  Star,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Clock,
  Plus,
} from 'lucide-react';
import {
  format,
  parseISO,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DayStepItem } from '../../../hooks/useStepTracker';
import { playClickSound } from '../../../lib/sound';

interface ActivityCalendarCardProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  weekStats: {
    days: DayStepItem[];
    totalSteps: number;
    averageSteps: number;
    totalCalories: number;
    totalDistanceKm: number;
    bestDaySteps: number;
    bestDayDate: string;
  };
  monthStats: {
    days: DayStepItem[];
    paddingDaysCount: number;
    monthName: string;
    totalSteps: number;
    averageSteps: number;
    totalCalories: number;
    totalDistanceKm: number;
    goalStreakDays: number;
    daysInMonthCount: number;
    maxDaySteps: number;
  };
  onAddStepsToDate?: (delta: number, dateStr: string) => Promise<any>;
}

export const ActivityCalendarCard: React.FC<ActivityCalendarCardProps> = ({
  selectedDate,
  onSelectDate,
  weekStats,
  monthStats,
  onAddStepsToDate,
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Currently inspected day in month view (defaults to selectedDate or first day with steps)
  const [inspectedDateStr, setInspectedDateStr] = useState<string>(selectedDate);

  const inspectedDayItem = monthStats.days.find((d) => d.dateStr === inspectedDateStr) ||
    weekStats.days.find((d) => d.dateStr === inspectedDateStr) ||
    monthStats.days[0];

  const handlePrev = () => {
    playClickSound();
    const curr = parseISO(selectedDate);
    const prev = viewMode === 'week' ? subWeeks(curr, 1) : subMonths(curr, 1);
    const newDateStr = format(prev, 'yyyy-MM-dd');
    onSelectDate(newDateStr);
    setInspectedDateStr(newDateStr);
  };

  const handleNext = () => {
    playClickSound();
    const curr = parseISO(selectedDate);
    const next = viewMode === 'week' ? addWeeks(curr, 1) : addMonths(curr, 1);
    const newDateStr = format(next, 'yyyy-MM-dd');
    onSelectDate(newDateStr);
    setInspectedDateStr(newDateStr);
  };

  const handleToday = () => {
    playClickSound();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    onSelectDate(todayStr);
    setInspectedDateStr(todayStr);
  };

  const handleDayClick = (dateStr: string) => {
    playClickSound();
    onSelectDate(dateStr);
    setInspectedDateStr(dateStr);
  };

  const WEEK_DAYS_HEADER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-4 font-body select-none">
      
      {/* 1. Header with Mode Toggle and Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-[#24201D]/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border border-[#24201D] flex items-center justify-center shadow-2xs">
            <CalendarIcon className="w-4 h-4 text-[#854D0E] stroke-[2.25]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
              Movement Calendar
            </span>
            <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
              Календарь активности
            </h2>
          </div>
        </div>

        {/* View Switcher & Date Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Week / Month Tab */}
          <div className="flex items-center p-0.5 bg-[#FAF8F5] border border-[#24201D]/25 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setViewMode('week');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer font-display ${
                viewMode === 'week'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              Неделя
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setViewMode('month');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer font-display ${
                viewMode === 'month'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              Месяц
            </button>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 flex items-center justify-center text-[#24201D] shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2 py-1 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 text-[11px] font-bold text-[#24201D] shadow-2xs cursor-pointer font-display"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 flex items-center justify-center text-[#24201D] shadow-2xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. WEEK VIEW MODE */}
      {viewMode === 'week' && (
        <div className="space-y-3.5">
          {/* 7-Day Vertical Strip */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
            {weekStats.days.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleDayClick(day.dateStr)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-between gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-[#FAF8F5] border-[#24201D] ring-2 ring-[#3D6B52] shadow-xs'
                      : day.isToday
                      ? 'bg-[#FAF8F5] border-[#3D6B52]/50'
                      : 'bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] border-[#24201D]/15 hover:border-[#24201D]'
                  }`}
                >
                  {/* Day Header */}
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-[#6B635B] block font-display">
                      {day.dayName}
                    </span>
                    <span
                      className={`text-xs font-black font-mono-num block ${
                        day.isToday ? 'text-[#3D6B52] font-black' : 'text-[#24201D]'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  {/* Vertical Progress Bar */}
                  <div className="w-full max-w-[28px] h-20 bg-white border border-[#24201D]/20 rounded-lg p-0.5 flex flex-col justify-end overflow-hidden shadow-2xs">
                    <div
                      className={`w-full rounded transition-all duration-500 ${
                        day.isGoalMet ? 'bg-[#10B981]' : day.steps > 0 ? 'bg-[#3D6B52]' : 'bg-transparent'
                      }`}
                      style={{ height: `${Math.min(100, Math.max(day.steps > 0 ? 8 : 0, day.percent))}%` }}
                    />
                  </div>

                  {/* Steps Badge */}
                  <div className="text-center w-full">
                    <span className="text-[10px] font-black font-mono-num text-[#24201D] block truncate">
                      {day.steps >= 1000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps}
                    </span>

                    {day.caloriesBurned > 0 ? (
                      <span className="text-[8px] font-bold font-mono-num text-[#DC2626] block">
                        +{day.caloriesBurned}
                      </span>
                    ) : (
                      <span className="text-[8px] text-stone-400 block">-</span>
                    )}
                  </div>

                  {/* Achievement Star */}
                  <div className="h-3 flex items-center justify-center">
                    {day.isGoalMet && (
                      <Trophy className="w-3 h-3 text-[#F59E0B] stroke-[2.5]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Всего за неделю
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-mono-num text-[#24201D]">
                  {weekStats.totalSteps.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-[#6B635B]">шагов</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Среднее в день
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-mono-num text-[#3D6B52]">
                  {weekStats.averageSteps.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-[#6B635B]">шаг/день</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Сожжено за неделю
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-mono-num text-[#DC2626]">
                  +{weekStats.totalCalories}
                </span>
                <span className="text-[10px] font-bold text-[#6B635B]">ккал</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Дистанция
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-mono-num text-[#2563EB]">
                  {weekStats.totalDistanceKm}
                </span>
                <span className="text-[10px] font-bold text-[#6B635B]">км</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONTH VIEW MODE */}
      {viewMode === 'month' && (
        <div className="space-y-3.5">
          {/* Month Title */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-black font-display text-[#24201D] capitalize">
              {format(parseISO(selectedDate), 'LLLL yyyy', { locale: ru })}
            </span>
            <span className="text-[11px] font-bold text-[#6B635B]">
              Цель достигнута {monthStats.goalStreakDays} из {monthStats.daysInMonthCount} дней
            </span>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK_DAYS_HEADER.map((w) => (
              <span key={w} className="text-[10px] font-black uppercase text-[#6B635B] font-display py-0.5">
                {w}
              </span>
            ))}
          </div>

          {/* Month Calendar Matrix */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Empty padding cells */}
            {Array.from({ length: monthStats.paddingDaysCount }).map((_, idx) => (
              <div key={`pad-${idx}`} className="h-14 rounded-xl bg-[#FAF8F5]/30 border border-dashed border-[#24201D]/10" />
            ))}

            {/* Actual Month Days */}
            {monthStats.days.map((day) => {
              const isSelected = day.dateStr === inspectedDateStr;
              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleDayClick(day.dateStr)}
                  className={`h-14 p-1 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer shadow-2xs ${
                    isSelected
                      ? 'bg-[#FAF8F5] border-[#24201D] ring-2 ring-[#3D6B52]'
                      : day.isToday
                      ? 'bg-[#FAF8F5] border-[#3D6B52]/50'
                      : 'bg-white hover:bg-[#FAF8F5] border-[#24201D]/15 hover:border-[#24201D]'
                  }`}
                >
                  <div className="w-full flex items-center justify-between px-0.5">
                    <span
                      className={`text-[11px] font-black font-mono-num ${
                        day.isToday ? 'text-[#3D6B52]' : 'text-[#24201D]'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {day.isGoalMet && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    )}
                  </div>

                  {/* Step / Calorie Snippet */}
                  {day.steps > 0 ? (
                    <div className="text-center">
                      <span className="text-[9px] font-black font-mono-num text-[#24201D] block leading-none">
                        {day.steps >= 1000 ? `${(day.steps / 1000).toFixed(1)}k` : day.steps}
                      </span>
                      <div className="w-5 h-1 rounded-full bg-stone-200 overflow-hidden mx-auto mt-0.5">
                        <div
                          className={`h-full ${day.isGoalMet ? 'bg-[#10B981]' : 'bg-[#3D6B52]'}`}
                          style={{ width: `${Math.min(100, day.percent)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[9px] text-stone-300 font-mono-num">-</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Month Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Всего за месяц
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-mono-num text-[#24201D]">
                  {monthStats.totalSteps.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-[#6B635B]">шагов</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Дистанция
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-mono-num text-[#2563EB]">
                  {monthStats.totalDistanceKm}
                </span>
                <span className="text-[10px] font-bold text-[#6B635B]">км</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Расход калорий
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-mono-num text-[#DC2626]">
                  +{monthStats.totalCalories}
                </span>
                <span className="text-[10px] font-bold text-[#6B635B]">ккал</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Выполнение цели
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-mono-num text-[#10B981]">
                  {monthStats.goalStreakDays}
                </span>
                <span className="text-[10px] font-bold text-[#6B635B]">дней</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Day Inspection Card (for inspected/selected date) */}
      {inspectedDayItem && (
        <div className="p-3 bg-[#FAF8F5] border border-[#24201D] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#24201D] flex flex-col items-center justify-center shadow-2xs">
              <span className="text-[9px] font-black uppercase text-[#6B635B] font-display leading-none">
                {inspectedDayItem.dayName}
              </span>
              <span className="text-sm font-black font-mono-num text-[#24201D] mt-0.5 leading-none">
                {inspectedDayItem.dayNumber}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#24201D]">
                  {format(parseISO(inspectedDayItem.dateStr), 'd MMMM yyyy', { locale: ru })}
                </span>
                {inspectedDayItem.isGoalMet && (
                  <span className="text-[9px] font-black uppercase text-[#10B981] bg-[#DDE8DE] px-1.5 py-0.5 rounded border border-[#10B981]/30">
                    Цель достигнута
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-0.5 text-[11px] font-bold font-mono-num text-[#6B635B]">
                <span>
                  <strong className="text-[#24201D]">{inspectedDayItem.steps.toLocaleString()}</strong> / {inspectedDayItem.goal.toLocaleString()} шагов ({inspectedDayItem.percent}%)
                </span>
                <span>•</span>
                <span className="text-[#DC2626] font-black">+{inspectedDayItem.caloriesBurned} ккал</span>
                <span>•</span>
                <span className="text-[#2563EB]">{inspectedDayItem.distanceKm} км</span>
              </div>
            </div>
          </div>

          {onAddStepsToDate && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAddStepsToDate(1000, inspectedDayItem.dateStr)}
                className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-[#24201D]/25 hover:border-[#24201D] rounded-lg text-xs font-black text-[#24201D] shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-[#3D6B52]" />
                <span>+1k шагов</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
