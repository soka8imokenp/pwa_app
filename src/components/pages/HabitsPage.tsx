import React from 'react';
import { Plus, Trash2, Flame, Check, Droplets, BookOpen, Activity, Moon, Zap, Target } from 'lucide-react';
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
      return <Droplets className="w-4 h-4 text-sky-700" />;
    case 'book':
    case 'reading':
    case '📖':
    case '📚':
      return <BookOpen className="w-4 h-4 text-amber-700" />;
    case 'stretch':
    case 'posture':
    case '🧘':
    case '💪':
      return <Activity className="w-4 h-4 text-emerald-700" />;
    case 'sleep':
    case 'night':
    case '🌙':
    case '🛌':
      return <Moon className="w-4 h-4 text-purple-700" />;
    case 'flame':
    case 'fire':
      return <Flame className="w-4 h-4 text-amber-600 fill-amber-400" />;
    case 'target':
    case '🎯':
      return <Target className="w-4 h-4 text-rose-700" />;
    case 'zap':
    case '⚡':
    default:
      return <Zap className="w-4 h-4 text-amber-700" />;
  }
};

export const HabitsPage: React.FC<HabitsPageProps> = ({
  habits,
  selectedDate,
  onToggleHabitLog,
  onDeleteHabit,
  onOpenAddHabit,
}) => {
  const completedTodayCount = habits.filter((h) => h.completedToday).length;
  const bestStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.currentStreak), 0) : 0;
  const habitScore = habits.length > 0 ? Math.round((completedTodayCount / habits.length) * 100) : 0;

  const handleToggle = (habitId: number, dateStr: string, currentStatus: boolean) => {
    playTaskCheckSound();
    onToggleHabitLog(habitId, dateStr, currentStatus);

    if (!currentStatus) {
      if (completedTodayCount + 1 === habits.length && habits.length > 0) {
        setTimeout(() => {
          playSuccessChime();
          confetti({
            particleCount: 75,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D1FBE4', '#FFE873', '#E8DCFF'],
          });
        }, 120);
      }
    }
  };

  return (
    <div className="w-full space-y-4 pb-20 font-body select-none">
      {/* 1. Habit Progress & Streaks Card */}
      <div className="neo-card p-4 bg-white flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Habit Consistency
          </span>
          <h2 className="text-base font-bold font-display text-[#18181B] mt-0.5">
            {completedTodayCount} of {habits.length} Habits Done
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#D1FBE4] border-[1.5px] border-[#18181B] rounded-full shadow-[1px_1px_0px_#18181B]">
            <Flame className="w-3.5 h-3.5 text-emerald-800 fill-emerald-500" />
            <span className="text-xs font-bold text-[#18181B] font-mono-num">
              {bestStreak}d best
            </span>
          </div>

          <span className="text-xs font-bold text-[#18181B] font-mono-num bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
            {habitScore}%
          </span>
        </div>
      </div>

      {/* 2. Habits List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold font-display text-slate-500 uppercase tracking-wider">
            Daily Habits
          </span>
          <button
            onClick={() => {
              playClickSound();
              onOpenAddAddHabit: onOpenAddHabit();
            }}
            className="text-xs font-bold text-[#18181B] flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Habit
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="neo-card p-8 text-center bg-white border-dashed space-y-2">
            <Zap className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold font-display text-slate-500">
              No habits created yet
            </h4>
            <button
              onClick={onOpenAddHabit}
              className="px-4 py-2 bg-[#D1FBE4] neo-btn text-xs text-[#18181B] cursor-pointer"
            >
              + Create First Habit
            </button>
          </div>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className="neo-card p-4 bg-white flex flex-col gap-3 transition-all hover:-translate-y-0.5"
            >
              {/* Top Row: Icon + Title + Streak + Check */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl border-[1.5px] border-[#18181B] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#18181B]"
                    style={{ backgroundColor: habit.color || '#D1FBE4' }}
                  >
                    {renderHabitLucideIcon(habit.icon)}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#18181B] truncate">
                      {habit.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <Flame className="w-3 h-3 text-amber-600 fill-amber-400" />
                      <span className="font-bold font-mono-num">{habit.currentStreak} day streak</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => habit.id && handleToggle(habit.id, selectedDate, habit.completedToday)}
                    className={`w-9 h-9 rounded-xl border-[1.75px] border-[#18181B] flex items-center justify-center transition-all cursor-pointer ${
                      habit.completedToday
                        ? 'bg-[#D1FBE4] text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]'
                        : 'bg-white hover:bg-slate-50 shadow-[1.5px_1.5px_0px_#18181B]'
                    }`}
                  >
                    {habit.completedToday ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (habit.id) {
                        playClickSound();
                        onDeleteHabit(habit.id);
                      }
                    }}
                    title="Delete habit"
                    className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: 7-Day History Mini Circles */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Past 7 Days
                </span>

                <div className="flex items-center gap-1.5">
                  {habit.recentLogs.map((log) => (
                    <button
                      key={log.date}
                      onClick={() => habit.id && handleToggle(habit.id, log.date, log.completed)}
                      className={`w-6 h-6 rounded-lg text-[9px] font-bold font-mono-num flex items-center justify-center border transition-all cursor-pointer ${
                        log.completed
                          ? 'bg-[#18181B] text-white border-[#18181B]'
                          : log.date === selectedDate
                          ? 'bg-[#FFE873] text-[#18181B] border-[#18181B]'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-[#18181B]'
                      }`}
                      title={`${log.date}: ${log.completed ? 'Done' : 'Not done'}`}
                    >
                      {log.completed ? <Check className="w-3 h-3 stroke-[3]" /> : log.date.split('-')[2]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
