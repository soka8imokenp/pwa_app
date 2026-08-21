import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Flame,
  Check,
  Droplets,
  BookOpen,
  Activity,
  Moon,
  Zap,
  Target,
  Sparkles,
  Heart,
  Coffee,
  RotateCcw,
  Calendar,
  Layers,
} from 'lucide-react';
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

export const renderHabitLucideIcon = (iconKey?: string) => {
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
    case 'activity':
    case 'gym':
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
    case 'heart':
    case '❤️':
      return <Heart className="w-4 h-4 text-rose-600" />;
    case 'coffee':
    case '☕':
      return <Coffee className="w-4 h-4 text-amber-800" />;
    case 'sparkles':
    case '✨':
      return <Sparkles className="w-4 h-4 text-amber-500" />;
    case 'zap':
    case 'energy':
    case '⚡':
    default:
      return <Zap className="w-4 h-4 text-amber-700" />;
  }
};

const STARTER_TEMPLATES = [
  { title: 'Hydrate 2.5L Water', icon: 'water', color: '#BAE6FD' },
  { title: 'Read 20 Pages', icon: 'book', color: '#FEF08A' },
  { title: 'Morning Workout & Stretch', icon: 'stretch', color: '#FED7AA' },
  { title: 'Code Deep Work (2h)', icon: 'zap', color: '#E8DCFF' },
  { title: 'Sleep Before 11:30 PM', icon: 'sleep', color: '#D1FBE4' },
];

export const HabitsPage: React.FC<HabitsPageProps> = ({
  habits,
  selectedDate,
  onToggleHabitLog,
  onDeleteHabit,
  onOpenAddHabit,
  onQuickAddHabit,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickIcon, setQuickIcon] = useState('zap');
  const [quickColor, setQuickColor] = useState('#FFE873');
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  const completedTodayCount = habits.filter((h) => h.completedToday).length;
  const totalHabits = habits.length;
  const bestStreak = totalHabits > 0 ? Math.max(...habits.map((h) => h.currentStreak), 0) : 0;
  const habitScore = totalHabits > 0 ? Math.round((completedTodayCount / totalHabits) * 100) : 0;
  const isAllDone = totalHabits > 0 && completedTodayCount === totalHabits;

  const handleToggle = (habitId: number, dateStr: string, currentStatus: boolean) => {
    playTaskCheckSound();
    onToggleHabitLog(habitId, dateStr, currentStatus);

    if (!currentStatus) {
      if (completedTodayCount + 1 === totalHabits && totalHabits > 0) {
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

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !onQuickAddHabit) return;
    playClickSound();
    onQuickAddHabit(quickTitle.trim(), quickIcon, quickColor);
    setQuickTitle('');
    setIsQuickAdding(false);
  };

  const handleApplyTemplate = (tmpl: typeof STARTER_TEMPLATES[0]) => {
    if (!onQuickAddHabit) return;
    playSuccessChime();
    onQuickAddHabit(tmpl.title, tmpl.icon, tmpl.color);
    confetti({
      particleCount: 30,
      spread: 45,
      origin: { y: 0.7 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
  };

  return (
    <div className="w-full space-y-4 pb-24 font-body select-none">
      
      {/* 1. Habit Progress & Streaks Card */}
      <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Habit Streaks & Consistency
            </span>
            <h2 className="text-sm font-black font-display uppercase tracking-tight text-[#18181B] mt-0.5">
              {totalHabits === 0
                ? 'No Active Habits'
                : `${completedTodayCount} of ${totalHabits} Completed Today`}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-[#FEF08A] border-[1.5px] border-[#18181B] rounded-xl shadow-2xs">
              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
              <span className="text-[11px] font-black text-[#18181B] font-mono-num">
                {bestStreak}d best
              </span>
            </div>

            <span
              className={`text-[11px] font-black font-mono-num px-2.5 py-1 rounded-xl border border-[#18181B] shadow-2xs ${
                isAllDone ? 'bg-[#D1FBE4] text-emerald-900' : 'bg-[#FAF7F2] text-[#18181B]'
              }`}
            >
              {habitScore}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {totalHabits > 0 && (
          <div className="w-full h-2.5 bg-[#FAF7F2] border-[1.25px] border-[#18181B] rounded-full overflow-hidden shadow-2xs">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${habitScore}%`,
                backgroundColor: isAllDone ? '#4ADE80' : '#FFE873',
              }}
            />
          </div>
        )}
      </div>

      {/* 2. Habits Header & Add Button */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-slate-700" />
          <span className="text-xs font-black font-display text-slate-700 uppercase tracking-wider">
            Daily Habits ({totalHabits})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsQuickAdding(!isQuickAdding);
            }}
            className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-white border-[1.5px] border-[#18181B] rounded-xl text-[10px] font-black text-[#18181B] shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Quick</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenAddHabit();
            }}
            className="px-3 py-1 bg-[#FFE873] hover:bg-[#FED7AA] border-[1.5px] border-[#18181B] rounded-xl text-[10px] font-black text-[#18181B] shadow-2xs active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* Inline Quick Add Form */}
      {isQuickAdding && (
        <form
          onSubmit={handleQuickAddSubmit}
          className="p-3 bg-[#FEFCE8] border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-2.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-900">
              Fast Add Habit
            </span>
            <button
              type="button"
              onClick={() => setIsQuickAdding(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              autoFocus
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="e.g. Read 15 mins or Meditate"
              className="flex-1 px-3 py-2 bg-white border-[1.5px] border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] placeholder:text-slate-400 outline-none shadow-2xs"
            />
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="px-3.5 py-2 bg-[#18181B] text-white disabled:opacity-40 rounded-xl text-xs font-black shadow-2xs active:scale-95 cursor-pointer"
            >
              Create
            </button>
          </div>

          {/* Quick Icons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {['zap', 'water', 'book', 'stretch', 'sleep', 'target', 'coffee'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  playClickSound();
                  setQuickIcon(k);
                }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${
                  quickIcon === k
                    ? 'bg-[#FFE873] border-[#18181B] shadow-2xs scale-105 ring-1 ring-[#18181B]'
                    : 'bg-white border-[#18181B]/20'
                }`}
              >
                {renderHabitLucideIcon(k)}
              </button>
            ))}
          </div>
        </form>
      )}

      {/* 3. Habits List */}
      <div className="space-y-3">
        {totalHabits === 0 ? (
          <div className="p-6 bg-white border-[1.75px] border-dashed border-[#18181B]/30 rounded-2xl text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE873] border-[1.5px] border-[#18181B] flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-5 h-5 text-[#18181B]" />
            </div>
            <div>
              <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                No Habits Tracked Yet
              </h4>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                Pick a starter template below or create your own custom daily streak!
              </p>
            </div>

            {/* Quick Template Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {STARTER_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.title}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-2 bg-[#FAF7F2] hover:bg-[#FFE873]/30 border-[1.5px] border-[#18181B] rounded-xl flex items-center justify-between text-left shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg border border-[#18181B] flex items-center justify-center shrink-0"
                      style={{ backgroundColor: tmpl.color }}
                    >
                      {renderHabitLucideIcon(tmpl.icon)}
                    </div>
                    <span className="text-xs font-bold text-[#18181B] truncate">
                      {tmpl.title}
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-500 stroke-[3] shrink-0" />
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenAddHabit}
                className="px-5 py-2.5 bg-[#FFE873] hover:bg-[#FED7AA] border-[1.75px] border-[#18181B] rounded-xl text-xs font-black text-[#18181B] shadow-2xs active:translate-y-0.5 cursor-pointer"
              >
                + Create Custom Habit
              </button>
            </div>
          </div>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className={`p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] flex flex-col gap-3 transition-all ${
                habit.completedToday ? 'bg-[#FAFDF9]' : ''
              }`}
            >
              {/* Top Row: Icon + Title + Streaks + Checkbox + Delete */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl border-[1.5px] border-[#18181B] flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: habit.color || '#FFE873' }}
                  >
                    {renderHabitLucideIcon(habit.icon)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black text-[#18181B] truncate">
                      {habit.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 font-mono-num">
                        <Flame className="w-3 h-3 text-amber-600 fill-amber-400" />
                        {habit.currentStreak}d streak
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono-num">
                        best: {habit.longestStreak}d
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Huge Satisfying Check Button */}
                  <button
                    type="button"
                    onClick={() => habit.id && handleToggle(habit.id, selectedDate, habit.completedToday)}
                    title={habit.completedToday ? 'Mark incomplete' : 'Complete today'}
                    className={`w-10 h-10 rounded-xl border-[1.75px] border-[#18181B] flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-2xs ${
                      habit.completedToday
                        ? 'bg-[#BEF264] text-[#18181B]'
                        : 'bg-[#FAF7F2] hover:bg-white text-slate-300'
                    }`}
                  >
                    {habit.completedToday ? (
                      <Check className="w-5 h-5 stroke-[3]" />
                    ) : (
                      <div className="w-3 h-3 rounded-md border border-[#18181B]/30" />
                    )}
                  </button>

                  {/* Delete Habit */}
                  <button
                    type="button"
                    onClick={() => {
                      if (habit.id) {
                        playClickSound();
                        onDeleteHabit(habit.id);
                      }
                    }}
                    title="Delete habit"
                    className="w-7 h-7 rounded-lg bg-[#FAF7F2] hover:bg-rose-50 border border-[#18181B]/20 hover:border-rose-400 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer shadow-2xs active:scale-95 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: 7-Day History Interactive Tracker Pills */}
              <div className="flex items-center justify-between pt-2 border-t border-[#18181B]/15">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Past 7 Days
                </span>

                <div className="flex items-center gap-1.5">
                  {habit.recentLogs.map((log) => {
                    const isSelected = log.date === selectedDate;
                    const dateObj = new Date(log.date);
                    const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                    const dayLetter = dayLetters[dateObj.getDay()];

                    return (
                      <button
                        key={log.date}
                        type="button"
                        onClick={() => habit.id && handleToggle(habit.id, log.date, log.completed)}
                        className={`w-7 h-8 rounded-lg border text-[9px] font-black flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                          log.completed
                            ? 'bg-[#18181B] text-white border-[#18181B] shadow-2xs'
                            : isSelected
                            ? 'bg-[#FFE873] text-[#18181B] border-[#18181B] shadow-2xs'
                            : 'bg-[#FAF7F2] text-slate-400 border-[#18181B]/20 hover:border-[#18181B]'
                        } ${isSelected ? 'ring-1 ring-[#18181B]' : ''}`}
                        title={`${log.date}: ${log.completed ? 'Completed' : 'Not completed'}`}
                      >
                        <span className="text-[8px] font-bold opacity-75">{dayLetter}</span>
                        <span className="text-[10px] leading-none font-mono-num">
                          {log.completed ? (
                            <Check className="w-2.5 h-2.5 stroke-[3] inline" />
                          ) : (
                            log.date.split('-')[2]
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
