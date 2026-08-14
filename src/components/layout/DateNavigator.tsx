import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatDisplayDate,
  getRelativeDayLabel,
  shiftDate,
  getTodayString,
  getWeekDaysForDate,
} from '../../lib/dateUtils';
import { DayOverviewStats } from '../../types';
import { playClickSound } from '../../lib/sound';

interface DateNavigatorProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  stats: DayOverviewStats;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDate,
  onSelectDate,
}) => {
  const isTodaySelected = selectedDate === getTodayString();
  const weekDays = getWeekDaysForDate(selectedDate);

  const handlePrevDay = () => {
    playClickSound();
    onSelectDate(shiftDate(selectedDate, -1));
  };
  const handleNextDay = () => {
    playClickSound();
    onSelectDate(shiftDate(selectedDate, 1));
  };
  const handleToday = () => {
    playClickSound();
    onSelectDate(getTodayString());
  };

  return (
    <div className="w-full neo-card p-3 sm:p-4 mb-4">
      {/* Top row: Date Switcher & Jump to Today */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevDay}
            className="w-8 h-8 rounded-lg bg-[#FAF7F2] hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.25]" />
          </button>

          <div className="px-3 py-1 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-xl flex items-center gap-2 shadow-[1px_1px_0px_#18181B]">
            <span className="text-xs sm:text-sm font-bold font-display text-[#18181B]">
              {formatDisplayDate(selectedDate)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              • {getRelativeDayLabel(selectedDate)}
            </span>
          </div>

          <button
            onClick={handleNextDay}
            className="w-8 h-8 rounded-lg bg-[#FAF7F2] hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.25]" />
          </button>
        </div>

        {!isTodaySelected && (
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-bold neo-btn bg-[#FFE873] text-[#18181B] cursor-pointer"
          >
            Today
          </button>
        )}
      </div>

      {/* Week Days Strip */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {weekDays.map((day) => (
          <button
            key={day.dateStr}
            onClick={() => {
              playClickSound();
              onSelectDate(day.dateStr);
            }}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl border-[1.5px] transition-all cursor-pointer select-none ${
              day.isSelected
                ? 'bg-[#18181B] text-white border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] -translate-y-0.5'
                : day.isToday
                ? 'bg-[#FFE873] text-[#18181B] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                : 'bg-[#FAF7F2] text-[#18181B] border-slate-200 hover:border-[#18181B]'
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{day.dayShort}</span>
            <span className="text-xs sm:text-sm font-bold font-mono-num leading-tight mt-0.5">{day.dayNumber}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
