import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';
import { BrutalButton } from '../common/BrutalButton';
import { BrutalBadge } from '../common/BrutalBadge';
import {
  formatDisplayDate,
  getRelativeDayLabel,
  shiftDate,
  getTodayString,
  getWeekDaysForDate,
} from '../../lib/dateUtils';
import { DayOverviewStats } from '../../types';

interface DateNavigatorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  stats: DayOverviewStats;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDate,
  onSelectDate,
  stats,
}) => {
  const isTodaySelected = selectedDate === getTodayString();
  const weekDays = getWeekDaysForDate(selectedDate);

  const handlePrevDay = () => onSelectDate(shiftDate(selectedDate, -1));
  const handleNextDay = () => onSelectDate(shiftDate(selectedDate, 1));
  const handleToday = () => onSelectDate(getTodayString());

  return (
    <div className="bg-white dark:bg-[#161424] border-[2.5px] border-[#1E1B4B] dark:border-purple-300 rounded-3xl p-4 sm:p-5 shadow-[5px_5px_0px_#1E1B4B] dark:shadow-[5px_5px_0px_#A855F7] mb-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Date Selector & Jump to Today */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-1.5">
            <BrutalButton
              variant="secondary"
              size="icon"
              onClick={handlePrevDay}
              aria-label="Previous day"
              className="w-9 h-9"
            >
              <ChevronLeft className="w-4 h-4" />
            </BrutalButton>

            <div className="px-4 py-2 bg-[#FAF5FF] dark:bg-[#281A45] border-2 border-[#1E1B4B] dark:border-purple-300 rounded-2xl flex items-center gap-2.5 min-w-[210px] justify-center shadow-[2px_2px_0px_#1E1B4B] dark:shadow-[2px_2px_0px_#A855F7]">
              <Calendar className="w-4 h-4 text-purple-700 dark:text-purple-300 shrink-0" />
              <div className="text-center">
                <span className="text-sm font-black text-slate-900 dark:text-purple-100 block">
                  {formatDisplayDate(selectedDate)}
                </span>
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-widest">
                  {getRelativeDayLabel(selectedDate)}
                </span>
              </div>
            </div>

            <BrutalButton
              variant="secondary"
              size="icon"
              onClick={handleNextDay}
              aria-label="Next day"
              className="w-9 h-9"
            >
              <ChevronRight className="w-4 h-4" />
            </BrutalButton>
          </div>

          {!isTodaySelected && (
            <BrutalButton
              variant="primary"
              size="sm"
              onClick={handleToday}
              className="text-xs shrink-0"
            >
              Jump to Today
            </BrutalButton>
          )}
        </div>

        {/* Center: Week Pill Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 justify-center">
          {weekDays.map((day) => (
            <button
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer select-none ${
                day.isSelected
                  ? 'bg-[#C084FC] text-slate-950 border-[#1E1B4B] shadow-[2.5px_2.5px_0px_#1E1B4B] dark:bg-[#A855F7] dark:text-white dark:border-purple-200 -translate-y-0.5'
                  : day.isToday
                  ? 'bg-[#FEF08A] text-slate-950 border-[#1E1B4B] dark:bg-[#3E3410] dark:text-yellow-200 dark:border-yellow-400'
                  : 'bg-white dark:bg-[#201A33] text-slate-700 dark:text-purple-200 border-[#1E1B4B]/30 dark:border-purple-400/30 hover:border-[#1E1B4B]'
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase">{day.dayShort}</span>
              <span className="text-sm font-black font-mono-num">{day.dayNumber}</span>
            </button>
          ))}
        </div>

        {/* Right: Daily Score & Focus Pill */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-[#ECFCCB] dark:bg-[#1E3314] border-2 border-[#1E1B4B] dark:border-lime-400 rounded-2xl shadow-[2.5px_2.5px_0px_#1E1B4B] dark:shadow-[2.5px_2.5px_0px_#84CC16]">
            <CheckCircle2 className="w-4 h-4 text-lime-700 dark:text-lime-300" />
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-lime-100 font-mono-num">
                {stats.completedPriority}/{stats.totalPriority} Top-3 Done
              </span>
              <span className="block text-[9px] font-bold text-lime-900 dark:text-lime-300 uppercase tracking-wider">
                {stats.dailyScore}% Productivity
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 bg-[#FAF5FF] dark:bg-[#281845] border-2 border-[#1E1B4B] dark:border-purple-300 rounded-2xl shadow-[2.5px_2.5px_0px_#1E1B4B] dark:shadow-[2.5px_2.5px_0px_#C084FC]">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-300" />
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-purple-100 font-mono-num">
                {stats.focusMinutesToday} min
              </span>
              <span className="block text-[9px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                Focus Logged
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
