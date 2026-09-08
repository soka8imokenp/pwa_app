import React, { useState } from 'react';
import {
  format,
  parseISO,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  Calendar as LucideCalendar,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  Trophy as LucideTrophy,
  Plus as LucidePlus,
} from 'lucide-react';
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
  const [inspectedDateStr, setInspectedDateStr] = useState<string>(selectedDate);

  const inspectedDayItem =
    monthStats.days.find((d) => d.dateStr === inspectedDateStr) ||
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

  const WEEK_DAYS_HEADER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3.5 font-body select-none">
      
      {/* 1. Header with View Toggle & Date Navigation */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#24201D]/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border border-[#24201D] flex items-center justify-center shadow-2xs">
            <LucideCalendar className="w-4 h-4 text-[#854D0E] stroke-[2.25]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
              Movement History
            </span>
            <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
              Activity Calendar
            </h2>
          </div>
        </div>

        {/* View Switcher & Date Controls */}
        <div className="flex items-center gap-1.5">
          {/* Week / Month Toggle */}
          <div className="flex items-center p-0.5 bg-[#FAF8F5] border border-[#24201D]/25 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setViewMode('week');
              }}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer font-display ${
                viewMode === 'week'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setViewMode('month');
              }}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer font-display ${
                viewMode === 'month'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              Month
            </button>
          </div>

          {/* Steppers */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 flex items-center justify-center text-[#24201D] shadow-2xs cursor-pointer"
            >
              <LucideChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2 py-1 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 text-[11px] font-bold text-[#24201D] shadow-2xs cursor-pointer font-display"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 flex items-center justify-center text-[#24201D] shadow-2xs cursor-pointer"
            >
              <LucideChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="space-y-3">
          {/* 7-Day Vertical Strip */}
          <div className="grid grid-cols-7 gap-1.5 pt-0.5">
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
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase text-[#6B635B] block font-display">
                      {day.dayName}
                    </span>
                    <span
                      className={`text-xs font-black font-mono-num block ${
                        day.isToday ? 'text-[#3D6B52]' : 'text-[#24201D]'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </div>

                  {/* Vertical Progress Bar */}
                  <div className="w-full max-w-[26px] h-20 bg-white border border-[#24201D]/20 rounded-lg p-0.5 flex flex-col justify-end overflow-hidden shadow-2xs">
                    <div
                      className={`w-full rounded transition-all duration-500 ${
                        day.isGoalMet ? 'bg-[#10B981]' : day.steps > 0 ? 'bg-[#3D6B52]' : 'bg-transparent'
                      }`}
                      style={{ height: `${Math.min(100, Math.max(day.steps > 0 ? 8 : 0, day.percent))}%` }}
                    />
                  </div>

                  {/* Steps & Burn */}
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

                  {/* Goal Met Icon */}
                  <div className="h-3 flex items-center justify-center">
                    {day.isGoalMet && (
                      <LucideTrophy className="w-3 h-3 text-[#F59E0B] stroke-[2.5]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week Summary Stats Grid */}
          <div className="grid grid-cols-4 gap-2 pt-0.5">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Total Steps
              </span>
              <span className="text-base font-black font-mono-num text-[#24201D] block">
                {weekStats.totalSteps.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Daily Avg
              </span>
              <span className="text-base font-black font-mono-num text-[#3D6B52] block">
                {weekStats.averageSteps.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Total Burn
              </span>
              <span className="text-base font-black font-mono-num text-[#DC2626] block">
                +{weekStats.totalCalories} kcal
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Distance
              </span>
              <span className="text-base font-black font-mono-num text-[#2563EB] block">
                {weekStats.totalDistanceKm} km
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="space-y-3">
          {/* Month Header Banner */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-black font-display text-[#24201D]">
              {format(parseISO(selectedDate), 'MMMM yyyy')}
            </span>
            <span className="text-[11px] font-bold text-[#6B635B] font-mono-num">
              Goal hit {monthStats.goalStreakDays} of {monthStats.daysInMonthCount} days
            </span>
          </div>

          {/* Weekday Titles */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK_DAYS_HEADER.map((w) => (
              <span key={w} className="text-[10px] font-black uppercase text-[#6B635B] font-display py-0.5">
                {w}
              </span>
            ))}
          </div>

          {/* Month Matrix */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {Array.from({ length: monthStats.paddingDaysCount }).map((_, idx) => (
              <div key={`pad-${idx}`} className="h-13 rounded-xl bg-[#FAF8F5]/30 border border-dashed border-[#24201D]/10" />
            ))}

            {monthStats.days.map((day) => {
              const isSelected = day.dateStr === inspectedDateStr;
              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleDayClick(day.dateStr)}
                  className={`h-13 p-1 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer shadow-2xs ${
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

          {/* Month Summary Stats Grid */}
          <div className="grid grid-cols-4 gap-2 pt-0.5">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Total Steps
              </span>
              <span className="text-base font-black font-mono-num text-[#24201D] block">
                {monthStats.totalSteps.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Daily Avg
              </span>
              <span className="text-base font-black font-mono-num text-[#3D6B52] block">
                {monthStats.averageSteps.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Total Burn
              </span>
              <span className="text-base font-black font-mono-num text-[#DC2626] block">
                +{monthStats.totalCalories} kcal
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Goal Hit
              </span>
              <span className="text-base font-black font-mono-num text-[#10B981] block">
                {monthStats.goalStreakDays} days
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Sleek Day Inspector Strip */}
      {inspectedDayItem && (
        <div className="p-2.5 sm:p-3 bg-[#FAF8F5] border border-[#24201D]/25 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#24201D] flex flex-col items-center justify-center shadow-2xs">
              <span className="text-[8px] font-black uppercase text-[#6B635B] font-display leading-none">
                {inspectedDayItem.dayName}
              </span>
              <span className="text-xs font-black font-mono-num text-[#24201D] mt-0.5 leading-none">
                {inspectedDayItem.dayNumber}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#24201D]">
                  {format(parseISO(inspectedDayItem.dateStr), 'EEEE, MMM d')}
                </span>
                {inspectedDayItem.isGoalMet && (
                  <span className="text-[9px] font-black uppercase text-[#10B981] bg-[#DDE8DE] px-1.5 py-0.5 rounded border border-[#10B981]/30 font-display">
                    Goal Met
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold font-mono-num text-[#6B635B]">
                <span>
                  <strong className="text-[#24201D]">{inspectedDayItem.steps.toLocaleString()}</strong> / {inspectedDayItem.goal.toLocaleString()} steps
                </span>
                <span>•</span>
                <span className="text-[#DC2626] font-black">+{inspectedDayItem.caloriesBurned} kcal</span>
                <span>•</span>
                <span className="text-[#2563EB]">{inspectedDayItem.distanceKm} km</span>
              </div>
            </div>
          </div>

          {onAddStepsToDate && (
            <button
              type="button"
              onClick={() => onAddStepsToDate(1000, inspectedDayItem.dateStr)}
              className="px-2.5 py-1 bg-white hover:bg-stone-50 active:translate-y-0.5 border border-[#24201D]/25 hover:border-[#24201D] rounded-lg text-xs font-black text-[#24201D] shadow-2xs transition-all cursor-pointer flex items-center gap-1 font-display"
            >
              <LucidePlus className="w-3 h-3 text-[#3D6B52]" />
              <span>+1k</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
