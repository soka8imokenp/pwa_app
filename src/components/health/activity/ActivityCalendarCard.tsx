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
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Footprints,
  Flame,
  MapPin,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { DayStepItem } from '../../../hooks/useStepTracker';
import { playClickSound } from '../../../lib/sound';
import { useTranslation, formatDateDirect, formatMonthYearDirect } from '../../../i18n/LanguageContext';

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
}) => {
  const { language, t } = useTranslation();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [inspectedDateStr, setInspectedDateStr] = useState<string>(selectedDate);

  const inspectedDayItem =
    monthStats.days.find((d) => d.dateStr === inspectedDateStr) ||
    weekStats.days.find((d) => d.dateStr === inspectedDateStr) ||
    weekStats.days[0] ||
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

  const WEEK_DAYS_HEADER = t.date.weekdaysShort;

  // Current period subtitle for header
  const weekRangeLabel =
    weekStats.days.length >= 7
      ? `${formatDateDirect(weekStats.days[0].dateStr, language)} – ${formatDateDirect(
          weekStats.days[6].dateStr,
          language
        )}`
      : t.healthActivity.viewWeek;

  return (
    <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-4 font-body select-none">
      {/* 1. Header: Elegant Japanese Minimalist Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#24201D]/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
            <Footprints className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
                {t.healthActivity.movementHistory}
              </span>
              <span className="text-[10px] font-bold text-[#3D6B52] bg-[#DDE8DE] px-1.5 py-0.2 rounded-full leading-none">
                {viewMode === 'week' ? weekRangeLabel : formatMonthYearDirect(parseISO(selectedDate), language)}
              </span>
            </div>
            <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
              {t.healthActivity.activityTrends}
            </h2>
          </div>
        </div>

        {/* View Toggle + Date Steppers */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Segmented Pill: Week / Month */}
          <div className="flex items-center p-0.5 bg-[#FAF8F5] border border-[#24201D]/25 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setViewMode('week');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer font-display ${
                viewMode === 'week'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              {t.healthActivity.viewWeek}
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setViewMode('month');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer font-display ${
                viewMode === 'month'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              {t.healthActivity.viewMonth}
            </button>
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              title="Previous period"
              className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 flex items-center justify-center text-[#24201D] active:translate-y-0.5 shadow-2xs cursor-pointer transition-all"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.25]" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              title="Jump to today"
              className="px-2 py-1 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 text-[11px] font-bold text-[#24201D] active:translate-y-0.5 shadow-2xs cursor-pointer font-display transition-all"
            >
              {t.common.today}
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Next period"
              className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 flex items-center justify-center text-[#24201D] active:translate-y-0.5 shadow-2xs cursor-pointer transition-all"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.25]" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. WEEK VIEW: Architectural 7-Day Interactive Visualizer */}
      {viewMode === 'week' && (
        <div className="space-y-3.5">
          {/* 7-Day Vertical Strip */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-0.5">
            {weekStats.days.map((day) => {
              const isSelected = day.dateStr === inspectedDateStr;
              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleDayClick(day.dateStr)}
                  className={`p-2 rounded-xl flex flex-col items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[2px] border-[#24201D] shadow-[2px_2px_0px_#24201D] -translate-y-0.5 ring-2 ring-[#3D6B52]/20'
                      : day.isToday
                      ? 'bg-[#FAF8F5] border-[1.5px] border-[#3D6B52]/60 hover:border-[#24201D] shadow-2xs'
                      : 'bg-[#FAF8F5]/80 hover:bg-[#FAF8F5] border border-[#24201D]/20 hover:border-[#24201D] shadow-2xs'
                  }`}
                >
                  {/* Day Name & Date Number */}
                  <div className="text-center leading-none space-y-0.5">
                    <span className="text-[9px] font-bold uppercase text-[#6B635B] block font-display">
                      {day.dayName}
                    </span>
                    <div className="flex items-center justify-center gap-0.5">
                      <span
                        className={`text-xs font-black font-mono-num ${
                          day.isToday ? 'text-[#3D6B52]' : 'text-[#24201D]'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                    </div>
                  </div>

                  {/* Proportional Slim Progress Pill */}
                  <div className="w-2.5 sm:w-3 h-14 bg-[#EAE5DC] rounded-full p-0.5 flex flex-col justify-end overflow-hidden border border-[#24201D]/15 shadow-inner">
                    <div
                      className={`w-full rounded-full transition-all duration-500 ease-out ${
                        day.isGoalMet
                          ? 'bg-[#10B981]'
                          : day.steps > 0
                          ? 'bg-[#3D6B52]'
                          : 'bg-transparent'
                      }`}
                      style={{
                        height: `${Math.min(
                          100,
                          Math.max(day.steps > 0 ? 10 : 0, day.percent)
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Clean Formatted Steps */}
                  <div className="text-center w-full min-h-[16px]">
                    <span className="text-[10px] font-black font-mono-num text-[#24201D] block leading-none truncate">
                      {day.steps >= 1000
                        ? `${(day.steps / 1000).toFixed(1)}k`
                        : day.steps > 0
                        ? day.steps
                        : '—'}
                    </span>
                  </div>

                  {/* Goal Met Indicator */}
                  <div className="h-2.5 flex items-center justify-center">
                    {day.isGoalMet ? (
                      <Sparkles className="w-2.5 h-2.5 text-[#F59E0B]" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-transparent" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4-Stat Period Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                {t.healthActivity.totalSteps}
              </span>
              <span className="text-base font-black font-mono-num text-[#24201D] block leading-tight">
                {weekStats.totalSteps.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                {t.healthActivity.dailyAvg}
              </span>
              <span className="text-base font-black font-mono-num text-[#3D6B52] block leading-tight">
                {weekStats.averageSteps.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                {t.healthActivity.totalBurn}
              </span>
              <span className="text-base font-black font-mono-num text-[#DC2626] block leading-tight">
                +{weekStats.totalCalories} kkal
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                {t.healthActivity.distanceStat}
              </span>
              <span className="text-base font-black font-mono-num text-[#2563EB] block leading-tight">
                {weekStats.totalDistanceKm} km
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. MONTH VIEW: Clean Matrix Calendar */}
      {viewMode === 'month' && (
        <div className="space-y-3.5">
          {/* Month Header Banner */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black font-display text-[#24201D]">
              {formatMonthYearDirect(parseISO(selectedDate), language)}
            </span>
            <span className="text-[11px] font-bold text-[#3D6B52] bg-[#DDE8DE] px-2 py-0.5 rounded-full font-mono-num">
              {t.healthActivity.goalHitDays
                .replace('{total}', String(monthStats.daysInMonthCount))
                .replace('{hit}', String(monthStats.goalStreakDays))}
            </span>
          </div>

          {/* Weekday Titles */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK_DAYS_HEADER.map((w) => (
              <span
                key={w}
                className="text-[10px] font-black uppercase text-[#6B635B] font-display py-0.5"
              >
                {w}
              </span>
            ))}
          </div>

          {/* Month Matrix */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {Array.from({ length: monthStats.paddingDaysCount }).map((_, idx) => (
              <div
                key={`pad-${idx}`}
                className="h-12 rounded-xl bg-stone-50/40 border border-dashed border-stone-200"
              />
            ))}

            {monthStats.days.map((day) => {
              const isSelected = day.dateStr === inspectedDateStr;
              return (
                <div
                  key={day.dateStr}
                  onClick={() => handleDayClick(day.dateStr)}
                  className={`h-12 p-1 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[2px] border-[#24201D] shadow-[2px_2px_0px_#24201D] -translate-y-0.5'
                      : day.isToday
                      ? 'bg-[#FAF8F5] border-[1.5px] border-[#3D6B52]/60 shadow-2xs'
                      : 'bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] border border-[#24201D]/15 hover:border-[#24201D] shadow-2xs'
                  }`}
                >
                  <div className="w-full flex items-center justify-between px-1">
                    <span
                      className={`text-[10px] font-black font-mono-num leading-none ${
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
                    <div className="text-center w-full px-0.5">
                      <span className="text-[9px] font-black font-mono-num text-[#24201D] block leading-none truncate">
                        {day.steps >= 1000
                          ? `${(day.steps / 1000).toFixed(1)}k`
                          : day.steps}
                      </span>
                      <div className="w-full h-1 rounded-full bg-[#EAE5DC] overflow-hidden mt-0.5">
                        <div
                          className={`h-full rounded-full ${
                            day.isGoalMet ? 'bg-[#10B981]' : 'bg-[#3D6B52]'
                          }`}
                          style={{ width: `${Math.min(100, day.percent)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[9px] text-stone-300 font-mono-num leading-none">
                      —
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Month Summary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                {t.healthActivity.totalSteps}
              </span>
              <span className="text-base font-black font-mono-num text-[#24201D] block leading-tight">
                {monthStats.totalSteps.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                {t.healthActivity.dailyAvg}
              </span>
              <span className="text-base font-black font-mono-num text-[#3D6B52] block leading-tight">
                {monthStats.averageSteps.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                {t.healthActivity.totalBurn}
              </span>
              <span className="text-base font-black font-mono-num text-[#DC2626] block leading-tight">
                +{monthStats.totalCalories} kkal
              </span>
            </div>

            <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                {t.healthActivity.goalMetBadge}
              </span>
              <span className="text-base font-black font-mono-num text-[#10B981] block leading-tight">
                {t.common.daysCount.replace('{count}', String(monthStats.goalStreakDays))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Selected Day Bento Spotlight (Clean, Noisy-Free) */}
      {inspectedDayItem && (
        <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/25 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#24201D] flex flex-col items-center justify-center shadow-2xs shrink-0">
              <span className="text-[8px] font-black uppercase text-[#6B635B] font-display leading-none">
                {inspectedDayItem.dayName}
              </span>
              <span className="text-xs font-black font-mono-num text-[#24201D] mt-0.5 leading-none">
                {inspectedDayItem.dayNumber}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-[#24201D] font-display">
                  {formatDateDirect(inspectedDayItem.dateStr, language)}
                </span>
                {inspectedDayItem.isToday && (
                  <span className="text-[9px] font-bold text-[#3D6B52] bg-[#DDE8DE] px-1.5 py-0.2 rounded-full font-display">
                    {t.common.today}
                  </span>
                )}
                {inspectedDayItem.isGoalMet && (
                  <span className="text-[9px] font-black uppercase text-[#10B981] bg-emerald-50 px-1.5 py-0.2 rounded border border-[#10B981]/30 flex items-center gap-0.5 font-display">
                    <Trophy className="w-2.5 h-2.5" />
                    {t.healthActivity.goalMetBadge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono-num text-[#6B635B] mt-0.5">
                <span>
                  <strong className="text-[#24201D] font-black">
                    {inspectedDayItem.steps.toLocaleString()}
                  </strong>{' '}
                  / {t.healthActivity.stepCountFormatted.replace('{count}', inspectedDayItem.goal.toLocaleString())}
                </span>
                <span>({inspectedDayItem.percent}%)</span>
              </div>
            </div>
          </div>

          {/* Metrics Capsule */}
          <div className="flex items-center gap-3 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#24201D]/10">
            <div className="flex items-center gap-1 text-[11px] font-black font-mono-num text-[#DC2626]">
              <Flame className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>+{inspectedDayItem.caloriesBurned} kkal</span>
            </div>
            <span className="text-stone-300">•</span>
            <div className="flex items-center gap-1 text-[11px] font-black font-mono-num text-[#2563EB]">
              <MapPin className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>{inspectedDayItem.distanceKm} km</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
