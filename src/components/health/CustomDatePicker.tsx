import React, { useState } from 'react';
import {
  format,
  parseISO,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import { getTodayString, getRelativeDayLabel, shiftDate } from '../../lib/dateUtils';

interface CustomDatePickerProps {
  selectedDate: string;
  onChangeDate: (date: string) => void;
  label?: string;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  selectedDate,
  onChangeDate,
  label = 'Weigh-In Date',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const parsedDate = React.useMemo(() => {
    try {
      return parseISO(selectedDate);
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  const [viewMonth, setViewMonth] = useState<Date>(parsedDate);

  const todayStr = getTodayString();
  const yesterdayStr = shiftDate(todayStr, -1);
  const twoDaysAgoStr = shiftDate(todayStr, -2);

  const handlePrevMonth = () => {
    playClickSound();
    setViewMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    playClickSound();
    setViewMonth((prev) => addMonths(prev, 1));
  };

  const handleSelectDay = (day: Date) => {
    playClickSound();
    const iso = format(day, 'yyyy-MM-dd');
    onChangeDate(iso);
    setIsOpen(false);
  };

  // Generate 6-week or 5-week month grid
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekHeaders = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className="w-full space-y-1.5 font-body select-none">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] flex items-center gap-1 font-display">
          <Calendar className="w-3 h-3 text-[#3D6B52]" /> {label}
        </label>
        
        {/* Quick Day Chips */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onChangeDate(todayStr);
            }}
            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
              selectedDate === todayStr
                ? 'bg-[#24201D] text-white'
                : 'bg-[#FAF8F5] text-[#6B635B] border border-[#24201D]/20 hover:border-[#24201D]'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onChangeDate(yesterdayStr);
            }}
            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
              selectedDate === yesterdayStr
                ? 'bg-[#24201D] text-white'
                : 'bg-[#FAF8F5] text-[#6B635B] border border-[#24201D]/20 hover:border-[#24201D]'
            }`}
          >
            Yesterday
          </button>
        </div>
      </div>

      {/* Main Trigger Capsule */}
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setIsOpen(!isOpen);
        }}
        className="w-full p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border-[1.5px] border-[#24201D] rounded-xl flex items-center justify-between shadow-2xs transition-all cursor-pointer active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white border border-[#24201D]/30 flex items-center justify-center text-[#24201D] shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-[#3D6B52]" />
          </div>
          <span className="text-xs font-black font-display text-[#24201D]">
            {format(parsedDate, 'EEEE, MMM d, yyyy')}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white border border-[#24201D]/20 text-[#6B635B] font-mono-num">
            {getRelativeDayLabel(selectedDate)}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[#6B635B]">
          <span className="text-[10px] font-bold">Calendar</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
        </div>
      </button>

      {/* Collapsible Neo-Brutalist Calendar Dropdown */}
      {isOpen && (
        <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[#24201D]/15">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] text-[#24201D] shadow-2xs cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
              {format(viewMonth, 'MMMM yyyy')}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] text-[#24201D] shadow-2xs cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekHeaders.map((day) => (
              <span key={day} className="text-[9px] font-black uppercase text-[#6B635B] font-display">
                {day}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((d, idx) => {
              const isCurrentMonth = isSameMonth(d, viewMonth);
              const isSelected = isSameDay(d, parsedDate);
              const isCurrentDay = isToday(d);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={`h-7 rounded-lg text-xs font-black font-mono-num flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#24201D] text-white shadow-2xs'
                      : isCurrentDay
                      ? 'bg-[#FBECCF] border border-[#24201D] text-[#24201D]'
                      : isCurrentMonth
                      ? 'bg-[#FAF8F5] hover:bg-stone-100 text-[#24201D] border border-transparent hover:border-[#24201D]/20'
                      : 'text-stone-300 pointer-events-none'
                  }`}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          {/* Bottom Fast Selector Chips */}
          <div className="flex items-center justify-between pt-1 border-t border-[#24201D]/10">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onChangeDate(twoDaysAgoStr);
                setIsOpen(false);
              }}
              className="text-[9px] font-bold text-[#6B635B] hover:text-[#24201D] cursor-pointer"
            >
              -2 Days ago
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onChangeDate(todayStr);
                setIsOpen(false);
              }}
              className="text-[9px] font-bold text-[#3D6B52] hover:underline cursor-pointer"
            >
              Jump to Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
