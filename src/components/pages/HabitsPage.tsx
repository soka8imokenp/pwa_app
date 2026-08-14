import React from 'react';
import { Plus, Trash2, Flame, Check, Droplets, BookOpen, Activity, Moon, Sparkles, Zap, Target } from 'lucide-react';
import type { HabitWithStats } from '../../types';
import { playTaskCheckSound, playSuccessChime, playClickSound } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface HabitsPageProps {
  habits: HabitWithStats[];
  selectedDate: string;
  onToggleHabitLog: (habitId: number, dateStr: string, currentStatus: boolean) => void;
  onDeleteHabit: (habitId: number) => void;
  onOpenAddHabit: () => void;
  onQuickAddHabit?: (title: string, icon: string, color: string) => void;
}

const renderHabitLucideIcon = (iconKey?: string) => {
  switch (iconKey?.toLowerCase()) {
    case 'water':
    case '💧':
      return <Droplets className="w-5 h-5 text-sky-950 stroke-[2.25]" />;
    case 'book':
    case 'reading':
    case '📖':
    case '📚':
      return <BookOpen className="w-5 h-5 text-amber-950 stroke-[2.25]" />;
    case 'stretch':
    case 'posture':
    case '🧘':
    case '💪':
      return <Activity className="w-5 h-5 text-orange-950 stroke-[2.25]" />;
    case 'sleep':
    case 'night':
    case '🌙':
    case '🛌':
      return <Moon className="w-5 h-5 text-purple-950 stroke-[2.25]" />;
    case 'flame':
    case 'fire':
      return <Flame className="w-5 h-5 text-amber-600 fill-amber-400 stroke-[2.25]" />;
    case 'target':
    case '🎯':
      return <Target className="w-5 h-5 text-purple-950 stroke-[2.25]" />;
    case 'zap':
    case '⚡':
    default:
      return <Zap className="w-5 h-5 text-amber-950 stroke-[2.25]" />;
  }
};

const POPULAR_HABIT_STARTERS = [
  { title: 'Drink 2L Pure Water', iconKey: 'water', color: '#BAE6FD' },
  { title: '15m Daily Reading', iconKey: 'book', color: '#FEF08A' },
  { title: '10m Posture Stretch', iconKey: 'stretch', color: '#FED7AA' },
  { title: 'No Screen Before Bed', iconKey: 'sleep', color: '#E9D5FF' },
];

export const HabitsPage: React.FC<HabitsPageProps> = ({
  habits,
  selectedDate,
  onToggleHabitLog,
  onDeleteHabit,
  onOpenAddHabit,
  onQuickAddHabit,
}) => {
  const completedTodayCount = habits.filter((h) => h.completedToday).length;
  const bestStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.currentStreak), 0) : 0;

  const handleToggle = (habitId: number, dateStr: string, currentStatus: boolean) => {
    playTaskCheckSound();
    onToggleHabitLog(habitId, dateStr, currentStatus);

    if (!currentStatus) {
      if (completedTodayCount + 1 === habits.length && habits.length > 0) {
        setTimeout(() => {
          playSuccessChime();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#BEF264', '#C084FC', '#FED7AA', '#38BDF8'],
          });
        }, 120);
      }
    }
  };

  const handleQuickStarterAdd = (starter: typeof POPULAR_HABIT_STARTERS[0]) => {
    if (onQuickAddHabit) {
      playSuccessChime();
      onQuickAddHabit(starter.title, starter.iconKey, starter.color);
    } else {
      onOpenAddHabit();
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-28 font-body select-none">
      
      {/* 1. Hero Habit Energy & Streak Capsule */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2rem] p-4 shadow-[2.5px_2.5px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FEF08A] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
              <Flame className="w-6 h-6 text-amber-600 fill-amber-400 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                  Habit Momentum
                </span>
                <span className="text-[10px] font-black text-amber-900 bg-[#FEF08A] px-2 py-0.5 rounded-full border border-[#18181B]/20 font-mono-num">
                  {bestStreak}d best streak
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {completedTodayCount} of {habits.length} daily habits checked in
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onOpenAddHabit();
            }}
            className="w-10 h-10 rounded-full bg-[#C084FC] hover:bg-[#B366FA] text-[#18181B] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-xs active:translate-y-0.5 cursor-pointer shrink-0 transition-all"
            title="Create Custom Habit"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        {/* 3-Part Progress Gauge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500">
            <span>Daily Completion</span>
            <span className="text-purple-800 font-mono-num">
              {habits.length > 0 ? Math.round((completedTodayCount / habits.length) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#FAF7F2] rounded-full border border-slate-200 overflow-hidden p-0.5">
            <div
              style={{
                width: `${habits.length > 0 ? (completedTodayCount / habits.length) * 100 : 0}%`,
              }}
              className="h-full rounded-full bg-[#BEF264] border border-[#18181B] transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* 2. Quick Starter Presets with Lucide Icons */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 px-2">
          <Sparkles className="w-3.5 h-3.5 text-purple-700 stroke-[2.25]" />
          <span className="text-[10px] font-black font-display uppercase tracking-wider text-slate-500">
            Atomic Routine Starters
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {POPULAR_HABIT_STARTERS.map((starter, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickStarterAdd(starter)}
              className="p-2.5 bg-white/90 hover:bg-white border border-[#18181B]/15 hover:border-[#18181B] rounded-2xl flex items-center justify-between text-left shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center border border-[#18181B]/20 shrink-0"
                  style={{ backgroundColor: starter.color }}
                >
                  {renderHabitLucideIcon(starter.iconKey)}
                </div>
                <span className="text-[10px] font-extrabold text-[#18181B] truncate">
                  {starter.title}
                </span>
              </div>
              <span className="w-5 h-5 rounded-full bg-slate-50 group-hover:bg-[#E9D5FF] border border-[#18181B]/20 flex items-center justify-center text-[10px] font-black shrink-0 ml-1">
                +
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. List of Active Habit Capsules with Lucide Icons */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black font-display uppercase tracking-wider text-slate-500">
            Active Habits ({habits.length})
          </h3>
          <span className="text-[10px] font-bold text-slate-400">
            7-Day Consistency Matrix
          </span>
        </div>

        {habits.length === 0 ? (
          <div className="bg-white/90 border-[1.5px] border-dashed border-slate-300 rounded-[2rem] p-6 text-center shadow-xs space-y-1.5">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-slate-200 flex items-center justify-center mx-auto text-base">
              <Flame className="w-6 h-6 text-amber-500 stroke-[2.25]" />
            </div>
            <h4 className="text-xs font-black font-display text-[#18181B]">
              No habits created yet
            </h4>
            <p className="text-[11px] font-medium text-slate-500 max-w-xs mx-auto">
              Tap any routine starter above or use the + button to start building your streak.
            </p>
          </div>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2rem] p-3.5 shadow-[2px_2px_0px_#18181B] space-y-3 transition-all hover:-translate-y-0.5"
            >
              {/* Top Row: Avatar + Title + Checkbox */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-11 h-11 rounded-full border-[1.75px] border-[#18181B] flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: habit.color || '#E9D5FF' }}
                  >
                    {renderHabitLucideIcon(habit.icon)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black font-display text-[#18181B] truncate">
                      {habit.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-amber-600 font-mono-num flex items-center gap-0.5">
                        <Flame className="w-3.5 h-3.5 fill-current text-amber-500" />
                        {habit.currentStreak}d streak
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono-num">
                        {habit.completionRate}% rate
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Today's Big 1-Tap Check Button & Delete */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(habit.id!, selectedDate, habit.completedToday)}
                    className={`h-9 px-3.5 rounded-full border-[1.75px] border-[#18181B] text-xs font-black flex items-center gap-1.5 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer ${
                      habit.completedToday
                        ? 'bg-[#BEF264] text-[#18181B]'
                        : 'bg-[#FAF7F2] hover:bg-purple-100 text-slate-600'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{habit.completedToday ? 'Done' : 'Check'}</span>
                  </button>

                  {habit.id && (
                    <button
                      onClick={() => {
                        playClickSound();
                        onDeleteHabit(habit.id!);
                      }}
                      title="Delete habit"
                      className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-rose-50 border border-slate-200 hover:border-rose-400 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.25]" />
                    </button>
                  )}
                </div>
              </div>

              {/* 7-Day Consistency Bubble Row */}
              <div className="flex items-center justify-between bg-[#FAF7F2] p-1.5 rounded-full border border-[#18181B]/15">
                {habit.recentLogs.map((log) => {
                  const isSelected = log.date === selectedDate;
                  const dateObj = new Date(log.date);
                  const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dateObj.getDay()];

                  return (
                    <button
                      key={log.date}
                      onClick={() => handleToggle(habit.id!, log.date, log.completed)}
                      title={`${log.date}: ${log.completed ? 'Done' : 'Not done'}`}
                      className={`w-7 h-7 rounded-full border-[1.25px] flex items-center justify-center transition-all cursor-pointer select-none text-[9px] font-black ${
                        log.completed
                          ? 'bg-[#BEF264] text-[#18181B] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                          : 'bg-white text-slate-400 border-slate-200 hover:border-[#18181B]'
                      } ${isSelected ? 'ring-2 ring-purple-500 scale-105' : ''}`}
                    >
                      {log.completed ? '✓' : dayLetter}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
