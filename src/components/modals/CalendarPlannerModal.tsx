import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Check,
  Star,
  Clock,
  Code,
  Palette,
  BookOpen,
  Activity,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';
import { addMonths, subMonths, parseISO } from 'date-fns';
import {
  formatDisplayDate,
  formatMonthYear,
  getMonthCalendarGrid,
  getTodayString,
  getRelativeDayLabel,
} from '../../lib/dateUtils';
import type { Task } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';

interface CalendarPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  allTasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleTask: (task: Task) => void;
  onDeleteTask: (id: number) => void;
}

export const CalendarPlannerModal: React.FC<CalendarPlannerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  allTasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    try {
      return parseISO(selectedDate);
    } catch {
      return new Date();
    }
  });

  const [activeDate, setActiveDate] = useState<string>(selectedDate);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<Task['category']>('code');
  const [newEventEstimate, setNewEventEstimate] = useState<number>(30);
  const [newEventPriority, setNewEventPriority] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveDate(selectedDate);
      try {
        setCurrentMonthDate(parseISO(selectedDate));
      } catch {
        setCurrentMonthDate(new Date());
      }
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const todayStr = getTodayString();
  const calendarDays = getMonthCalendarGrid(currentMonthDate, activeDate);

  // Group tasks by date for fast indicator badges
  const taskCountByDate = allTasks.reduce((acc, t) => {
    if (t.date) {
      acc[t.date] = (acc[t.date] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Tasks for the currently active day in the modal
  const activeDayTasks = allTasks.filter((t) => t.date === activeDate);

  const handlePrevMonth = () => {
    playClickSound();
    setCurrentMonthDate((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    playClickSound();
    setCurrentMonthDate((prev) => addMonths(prev, 1));
  };

  const handleJumpToday = () => {
    playClickSound();
    const today = new Date();
    setCurrentMonthDate(today);
    setActiveDate(todayStr);
    onSelectDate(todayStr);
  };

  const handleSelectDay = (dateStr: string) => {
    playClickSound();
    setActiveDate(dateStr);
    onSelectDate(dateStr);
  };

  const handleQuickAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    playSuccessChime();
    onAddTask({
      title: newEventTitle.trim(),
      date: activeDate,
      category: newEventCategory,
      estimatedMinutes: newEventEstimate,
      isPriority: newEventPriority,
      isCompleted: false,
    });

    setNewEventTitle('');
  };

  const categories = [
    { id: 'code' as const, label: 'Code', icon: <Code className="w-3 h-3 stroke-[2.25]" /> },
    { id: 'design' as const, label: 'Design', icon: <Palette className="w-3 h-3 stroke-[2.25]" /> },
    { id: 'learn' as const, label: 'Learn', icon: <BookOpen className="w-3 h-3 stroke-[2.25]" /> },
    { id: 'health' as const, label: 'Health', icon: <Activity className="w-3 h-3 stroke-[2.25]" /> },
    { id: 'general' as const, label: 'General', icon: <Layers className="w-3 h-3 stroke-[2.25]" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#18181B]/40 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-lg bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#18181B]/15 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5 text-[#18181B] stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#18181B]">
                Calendar & Planner
              </h3>
              <p className="text-[10px] font-bold text-slate-400">
                Plan days & schedule multiple events
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-slate-500 hover:text-[#18181B] shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Month Selector Bar */}
        <div className="flex items-center justify-between p-2 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl shadow-2xs">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE873] border border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs active:scale-95 cursor-pointer transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <span className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
            {formatMonthYear(currentMonthDate)}
          </span>

          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE873] border border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs active:scale-95 cursor-pointer transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Month Calendar Grid */}
        <div className="space-y-1">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day} className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const taskCount = taskCountByDate[day.dateStr] || 0;
              const isCurrentDay = day.dateStr === activeDate;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => handleSelectDay(day.dateStr)}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center min-h-[44px] transition-all cursor-pointer relative ${
                    isCurrentDay
                      ? 'bg-[#18181B] text-white border-[#18181B] shadow-[2px_2px_0px_#18181B] ring-1 ring-[#18181B]'
                      : day.isToday
                      ? 'bg-[#FFE873] text-[#18181B] border-[#18181B] shadow-2xs font-black'
                      : day.isCurrentMonth
                      ? 'bg-[#FAF7F2] text-[#18181B] border-[#18181B]/20 hover:border-[#18181B] hover:bg-white'
                      : 'bg-white/40 text-slate-300 border-transparent hover:border-slate-300'
                  }`}
                >
                  <span className={`text-xs font-bold font-mono-num ${isCurrentDay ? 'text-white' : ''}`}>
                    {day.dayNumber}
                  </span>

                  {/* Task Indicator Dot / Count Badge */}
                  {taskCount > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCurrentDay
                            ? 'bg-[#FFE873]'
                            : day.isToday
                            ? 'bg-[#18181B]'
                            : 'bg-purple-600'
                        }`}
                      />
                      {taskCount > 1 && (
                        <span
                          className={`text-[8px] font-black font-mono-num leading-none ${
                            isCurrentDay ? 'text-[#FFE873]' : 'text-purple-800'
                          }`}
                        >
                          {taskCount}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Schedule & Multi-Event Planner */}
        <div className="p-3.5 bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl space-y-3 shadow-2xs">
          
          {/* Day Title & Count + Right-aligned Today Badge */}
          <div className="flex items-center justify-between pb-2 border-b border-[#18181B]/15">
            <div>
              <h4 className="text-xs font-black font-display text-[#18181B] uppercase tracking-wider">
                {formatDisplayDate(activeDate)}
              </h4>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                {activeDayTasks.length} {activeDayTasks.length === 1 ? 'event scheduled' : 'events scheduled'}
              </p>
            </div>

            <span className="text-[9px] font-black uppercase px-2.5 py-1 bg-[#FFE873] border-[1.5px] border-[#18181B] rounded-xl shadow-2xs text-[#18181B]">
              {getRelativeDayLabel(activeDate)}
            </span>
          </div>

          {/* Quick Add Multiple Events Form */}
          <form onSubmit={handleQuickAddEvent} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder={`Add event for ${formatDisplayDate(activeDate)}...`}
                className="flex-1 px-3 py-2 bg-white text-xs font-bold rounded-xl border-[1.5px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-2xs"
              />
              <button
                type="submit"
                disabled={!newEventTitle.trim()}
                className="py-2 px-3 bg-[#FFE873] hover:bg-[#FED7AA] border-[1.5px] border-[#18181B] rounded-xl text-xs font-black text-[#18181B] flex items-center gap-1 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add</span>
              </button>
            </div>

            {/* Quick Presets (Category & Duration Chips & Priority Star) */}
            <div className="space-y-2 pt-1">
              {/* Row 1: Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setNewEventCategory(c.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl border-[1.75px] text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      newEventCategory === c.id
                        ? 'bg-[#E8DCFF] border-[#18181B] text-[#18181B] shadow-2xs font-extrabold ring-1 ring-[#18181B]'
                        : 'bg-white border-[#18181B]/25 text-slate-600 hover:border-[#18181B] hover:bg-slate-50'
                    }`}
                  >
                    {c.icon}
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>

              {/* Row 2: Clock (Left) + Duration Chips (Middle) + Star Icon (Right) */}
              <div className="flex items-center gap-1.5 py-1 px-1">
                {/* Clock Icon (Left) */}
                <div className="w-8 h-8 rounded-xl bg-white border-[1.5px] border-[#18181B]/30 flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
                  <Clock className="w-4 h-4 stroke-[2.25]" />
                </div>

                {/* Middle Duration Chips */}
                <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 px-0.5">
                  {[
                    { val: 15, label: '15m' },
                    { val: 25, label: '25m' },
                    { val: 30, label: '30m' },
                    { val: 45, label: '45m' },
                    { val: 60, label: '1h' },
                    { val: 120, label: '2h' },
                  ].map((dur) => (
                    <button
                      key={dur.val}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setNewEventEstimate(dur.val);
                      }}
                      className={`px-3 py-1.5 rounded-xl border-[1.75px] text-[10px] font-mono-num font-black transition-all cursor-pointer shrink-0 ${
                        newEventEstimate === dur.val
                          ? 'bg-[#FFE873] border-[#18181B] text-[#18181B] shadow-2xs font-extrabold ring-1 ring-[#18181B]'
                          : 'bg-white border-[#18181B]/25 text-slate-600 hover:border-[#18181B] hover:bg-slate-50'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>

                {/* Star Icon (Right) */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setNewEventPriority(!newEventPriority);
                  }}
                  className={`w-8 h-8 rounded-xl border-[1.5px] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 ${
                    newEventPriority
                      ? 'bg-[#FEF08A] border-[#18181B] text-amber-900 ring-1 ring-[#18181B]'
                      : 'bg-white border-[#18181B]/30 text-slate-400 hover:border-[#18181B] hover:text-slate-600'
                  }`}
                  title={newEventPriority ? 'Priority active' : 'Mark as priority'}
                >
                  <Star className={`w-4 h-4 ${newEventPriority ? 'text-amber-700 fill-amber-400' : 'text-slate-400'}`} />
                </button>
              </div>
            </div>
          </form>

          {/* Scheduled Events List for Selected Day */}
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {activeDayTasks.length === 0 ? (
              <div className="p-3 bg-white border border-dashed border-[#18181B]/25 rounded-xl text-center">
                <p className="text-[11px] font-bold text-slate-400">
                  No events scheduled for this day yet. Type above to add!
                </p>
              </div>
            ) : (
              activeDayTasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-2.5 bg-white border-[1.5px] border-[#18181B] rounded-xl flex items-center justify-between gap-2 shadow-2xs transition-all ${
                    t.isCompleted ? 'opacity-60 bg-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onToggleTask(t);
                      }}
                      className={`w-5 h-5 rounded-md border-[1.5px] border-[#18181B] flex items-center justify-center shrink-0 cursor-pointer ${
                        t.isCompleted ? 'bg-[#18181B] text-white' : 'bg-white'
                      }`}
                    >
                      {t.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            t.isCompleted ? 'line-through text-slate-400' : 'text-[#18181B]'
                          }`}
                        >
                          {t.title}
                        </span>
                        {t.isPriority && (
                          <Star className="w-3 h-3 text-amber-600 fill-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 mt-0.5">
                        <span className="uppercase">{t.category}</span>
                        {t.estimatedMinutes && (
                          <>
                            <span>•</span>
                            <span className="font-mono-num">{t.estimatedMinutes}m</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      if (t.id) onDeleteTask(t.id);
                    }}
                    className="w-6 h-6 rounded-lg hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center text-slate-400 cursor-pointer shrink-0 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
