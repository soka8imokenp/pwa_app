import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
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
  onOpenCalendar?: () => void;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDate,
  onSelectDate,
  onOpenCalendar,
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

  const handleCalendarClick = () => {
    playClickSound();
    if (onOpenCalendar) {
      onOpenCalendar();
    }
  };

  return (
    <div className="w-full neo-card p-3 sm:p-4 mb-4 select-none font-body">
      {/* Top row: Centered Date Switcher + Calendar Modal Trigger */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevDay}
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer shrink-0"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.25]" />
          </button>

          {/* Centered Date Badge (Click to open Calendar Planner) */}
          <button
            onClick={handleCalendarClick}
            className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#FFE873] border-[1.75px] border-[#18181B] rounded-xl flex items-center gap-2 shadow-[1px_1px_0px_#18181B] cursor-pointer transition-all active:translate-y-0.5"
            title="Open Calendar Planner"
          >
            <Calendar className="w-3.5 h-3.5 text-[#18181B] stroke-[2.5]" />
            <span className="text-xs sm:text-sm font-bold font-display text-[#18181B] tracking-tight">
              {formatDisplayDate(selectedDate)}
            </span>
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                isTodaySelected
                  ? 'bg-[#FFE873] text-[#18181B] border border-[#18181B]'
                  : 'text-slate-600 bg-slate-200/70'
              }`}
            >
              {getRelativeDayLabel(selectedDate)}
            </span>
          </button>

          <button
            onClick={handleNextDay}
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1px_1px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer shrink-0"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.25]" />
          </button>
        </div>

        {/* Right side: Today Jump Button */}
        {!isTodaySelected && (
          <button
            onClick={handleToday}
            className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider neo-btn bg-[#FAF7F2] hover:bg-[#FFE873] text-[#18181B] cursor-pointer shadow-[1px_1px_0px_#18181B]"
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
