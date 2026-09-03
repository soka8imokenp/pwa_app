import React from 'react';
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
  Heart,
  Coffee,
  Sparkles,
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
      return <Droplets className="w-4 h-4 text-[#476C85]" />;
    case 'book':
    case 'reading':
      return <BookOpen className="w-4 h-4 text-[#854D0E]" />;
    case 'stretch':
    case 'activity':
    case 'gym':
      return <Activity className="w-4 h-4 text-[#2D503C]" />;
    case 'sleep':
    case 'night':
      return <Moon className="w-4 h-4 text-[#574B3E]" />;
    case 'flame':
    case 'fire':
      return <Flame className="w-4 h-4 text-[#C25E40] fill-[#E09F3E]" />;
    case 'target':
      return <Target className="w-4 h-4 text-[#C25E40]" />;
    case 'heart':
      return <Heart className="w-4 h-4 text-[#C25E40]" />;
    case 'coffee':
      return <Coffee className="w-4 h-4 text-[#854D0E]" />;
    case 'zap':
    case 'energy':
    default:
      return <Zap className="w-4 h-4 text-[#3D6B52]" />;
  }
};

const STARTER_TEMPLATES = [
  { title: 'Hydrate 2.5L Water', icon: 'water', color: '#DEE8EF', desc: 'Daily hydration & vitality' },
  { title: 'Read 20 Pages', icon: 'book', color: '#FBECCF', desc: 'Mind expansion & learning' },
  { title: 'Morning Movement & Stretch', icon: 'stretch', color: '#DDE8DE', desc: 'Energy flow & posture' },
  { title: 'Deep Work Focus Block', icon: 'zap', color: '#F7E3DC', desc: 'Distraction-free output' },
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
            colors: ['#3D6B52', '#E09F3E', '#FBECCF'],
          });
        }, 120);
      }
    }
  };

  const handleApplyTemplate = (tmpl: typeof STARTER_TEMPLATES[0]) => {
    if (!onQuickAddHabit) return;
    playSuccessChime();
    onQuickAddHabit(tmpl.title, tmpl.icon, tmpl.color);
    confetti({
      particleCount: 35,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#3D6B52', '#E09F3E', '#DEE8EF'],
    });
  };

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      
      {/* 1. Habit Progress & Streaks Card */}
      <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block font-display">
              Habit Consistency
            </span>
            <h2 className="text-sm font-bold font-display text-[#24201D] mt-0.5">
              {totalHabits === 0
                ? 'No Active Habits'
                : `${completedTodayCount} of ${totalHabits} Completed Today`}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FBECCF] border border-[#24201D] rounded-xl shadow-2xs">
              <Flame className="w-3.5 h-3.5 text-[#C25E40] fill-[#E09F3E]" />
              <span className="text-[11px] font-black text-[#24201D] font-mono-num">
                {bestStreak}d best
              </span>
            </div>

            <span
              className={`text-[11px] font-black font-mono-num px-2.5 py-1 rounded-xl border border-[#24201D] shadow-2xs ${
                isAllDone ? 'bg-[#3D6B52] text-white' : 'bg-[#F4F0EA] text-[#24201D]'
              }`}
            >
              {habitScore}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {totalHabits > 0 && (
          <div className="w-full h-2.5 bg-[#F4F0EA] border border-[#24201D] rounded-full overflow-hidden p-[1px] shadow-2xs">
            <div
              className="h-full transition-all duration-300 rounded-full bg-[#3D6B52]"
              style={{ width: `${habitScore}%` }}
            />
          </div>
        )}
      </div>

      {/* 2. Habits Section Header & Clean New Habit Button */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-black font-display text-[#24201D] uppercase tracking-wider">
          Daily Habits
        </h3>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenAddHabit();
          }}
          className="px-3.5 py-1.5 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.5px] border-[#24201D] rounded-xl text-xs font-black shadow-[1.5px_1.5px_0px_#24201D] active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Habit</span>
        </button>
      </div>

      {/* 3. Habits List or Refined Create Habit Streak Card */}
      <div className="space-y-2.5">
        {totalHabits === 0 ? (
          <div className="p-5 sm:p-6 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] text-center space-y-4">
            
            {/* Minimalist Top Flame Capsule */}
            <div className="w-12 h-12 rounded-2xl bg-[#FBECCF] border-[1.75px] border-[#24201D] flex items-center justify-center mx-auto shadow-2xs">
              <Flame className="w-6 h-6 text-[#C25E40] fill-[#E09F3E]" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-black font-display text-[#24201D]">
                Build Your Daily Streaks
              </h4>
              <p className="text-xs text-[#6B635B] font-medium max-w-xs mx-auto leading-relaxed">
                Start small with daily routines that compound over time into unbreakable habits.
              </p>
            </div>

            {/* Quick Starter Cards */}
            <div className="space-y-2 pt-1 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block px-1">
                Popular Daily Routines
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STARTER_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.title}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="p-3 bg-[#F4F0EA] hover:bg-[#E8EFE9] border-[1.5px] border-[#24201D] rounded-xl flex items-center justify-between text-left shadow-2xs active:translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl border border-[#24201D] flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: tmpl.color }}
                      >
                        {renderHabitLucideIcon(tmpl.icon)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#24201D] block truncate">
                          {tmpl.title}
                        </span>
                        <span className="text-[10px] text-[#6B635B] block truncate">
                          {tmpl.desc}
                        </span>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-[#2D503C] stroke-[2.5] shrink-0 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

            {/* Main Create CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenAddHabit();
                }}
                className="w-full py-3 px-4 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create Custom Habit</span>
              </button>
            </div>

          </div>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className={`p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex flex-col gap-2.5 transition-all ${
                habit.completedToday ? 'bg-stone-50/80' : ''
              }`}
            >
              {/* Top Row: Icon + Title + Streaks + Checkbox + Delete */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 rounded-xl border border-[#24201D] flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: habit.color || '#DDE8DE' }}
                  >
                    {renderHabitLucideIcon(habit.icon)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className={`text-xs font-bold text-[#24201D] truncate ${habit.completedToday ? 'line-through text-[#6B635B]' : ''}`}>
                      {habit.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#854D0E] font-mono-num">
                        <Flame className="w-3 h-3 text-[#C25E40] fill-[#E09F3E]" />
                        {habit.currentStreak}d streak
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="text-[10px] font-bold text-[#6B635B] font-mono-num">
                        best: {habit.longestStreak}d
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Satisfying Check Button */}
                  <button
                    type="button"
                    onClick={() => habit.id && handleToggle(habit.id, selectedDate, habit.completedToday)}
                    title={habit.completedToday ? 'Mark incomplete' : 'Complete today'}
                    className={`w-9 h-9 rounded-xl border-[1.75px] border-[#24201D] flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-2xs ${
                      habit.completedToday
                        ? 'bg-[#3D6B52] text-white shadow-[1px_1px_0px_#24201D]'
                        : 'bg-[#F4F0EA] hover:bg-stone-200 text-stone-300'
                    }`}
                  >
                    {habit.completedToday ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <div className="w-3 h-3 rounded-md border border-[#24201D]/25" />
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
                    className="w-7 h-7 rounded-lg bg-[#F4F0EA] hover:bg-rose-50 border border-[#24201D]/20 hover:border-rose-400 flex items-center justify-center text-[#6B635B] hover:text-rose-600 cursor-pointer shadow-2xs active:scale-95 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Row: 7-Day History Interactive Tracker Pills */}
              <div className="flex items-center justify-between pt-2 border-t border-[#24201D]/10">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#6B635B]">
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
                            ? 'bg-[#3D6B52] text-white border-[#24201D] shadow-2xs'
                            : isSelected
                            ? 'bg-[#F0BB58] text-[#24201D] border-[#24201D] shadow-2xs'
                            : 'bg-[#F4F0EA] text-[#6B635B] border-[#24201D]/20 hover:border-[#24201D]'
                        }`}
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
