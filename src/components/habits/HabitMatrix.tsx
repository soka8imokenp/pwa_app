import React from 'react';
import { Flame, Plus, Trash2, Target, Zap, Check } from 'lucide-react';
import type { HabitWithStats } from '../../types';
import { BrutalCard } from '../common/BrutalCard';
import { BrutalButton } from '../common/BrutalButton';
import { playTaskCheckSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface HabitMatrixProps {
  habits: HabitWithStats[];
  selectedDate: string;
  onToggleHabitLog: (habitId: number, dateStr: string, currentStatus: boolean) => void;
  onDeleteHabit: (habitId: number) => void;
  onOpenAddHabit: () => void;
}

export const HabitMatrix: React.FC<HabitMatrixProps> = ({
  habits,
  selectedDate,
  onToggleHabitLog,
  onDeleteHabit,
  onOpenAddHabit,
}) => {
  const completedTodayCount = habits.filter((h) => h.completedToday).length;

  const handleToggle = (habitId: number, dateStr: string, currentStatus: boolean) => {
    playTaskCheckSound();
    onToggleHabitLog(habitId, dateStr, currentStatus);

    if (!currentStatus) {
      // If user marks a habit completed, celebrate with subtle pop
      if (completedTodayCount + 1 === habits.length && habits.length > 0) {
        setTimeout(() => {
          playSuccessChime();
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#BEF264', '#C084FC', '#FED7AA'],
          });
        }, 150);
      }
    }
  };

  return (
    <BrutalCard variant="lavender" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#1E1B4B]/15 dark:border-purple-300/20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#FEF08A] dark:bg-[#3E3410] border-2 border-[#1E1B4B] dark:border-yellow-400 rounded-xl shadow-[2px_2px_0px_#1E1B4B]">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-flame" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-purple-50 tracking-tight flex items-center gap-2">
              Habit Streaks Matrix
            </h3>
            <p className="text-xs font-bold text-purple-900/70 dark:text-purple-300">
              Quantifiable consistency • {completedTodayCount}/{habits.length} completed today
            </p>
          </div>
        </div>

        <BrutalButton
          variant="lime"
          size="sm"
          onClick={onOpenAddHabit}
          className="flex items-center gap-1 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </BrutalButton>
      </div>

      {/* Habit List */}
      <div className="space-y-3">
        {habits.length === 0 ? (
          <div className="p-8 text-center bg-white/60 dark:bg-[#1A172B]/60 border-2 border-dashed border-[#1E1B4B]/30 rounded-2xl">
            <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-sm font-black text-slate-800 dark:text-purple-100">
              No habits created yet!
            </p>
            <p className="text-xs font-semibold text-slate-600 dark:text-purple-300 mt-1 mb-3">
              Add your first micro-habit to start building your streak fire.
            </p>
            <BrutalButton variant="primary" size="sm" onClick={onOpenAddHabit}>
              Create First Habit
            </BrutalButton>
          </div>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className="bg-white dark:bg-[#1A162B] border-2 border-[#1E1B4B] dark:border-purple-300 rounded-2xl p-3.5 shadow-[3px_3px_0px_#1E1B4B] dark:shadow-[3px_3px_0px_#8B5CF6] transition-all hover:-translate-y-0.5"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl border-2 border-[#1E1B4B] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1E1B4B]"
                    style={{ backgroundColor: habit.color || '#E9D5FF' }}
                  >
                    <Zap className="w-5 h-5 text-[#18181B] stroke-[2.25]" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900 dark:text-purple-50 truncate">
                      {habit.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600 dark:text-yellow-400 font-mono-num">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        {habit.currentStreak}d Streak
                      </span>
                      <span className="text-slate-300 dark:text-purple-700">•</span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-purple-300 font-mono-num">
                        Best: {habit.longestStreak}d
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: 7-day mini pill matrix */}
                <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-[#FAF5FF] dark:bg-[#231B3A] p-1.5 rounded-xl border border-[#1E1B4B]/20 dark:border-purple-400/30">
                    {habit.recentLogs.map((log) => {
                      const isSelected = log.date === selectedDate;
                      const dateObj = new Date(log.date);
                      const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dateObj.getDay()];

                      return (
                        <button
                          key={log.date}
                          onClick={() => handleToggle(habit.id!, log.date, log.completed)}
                          title={`${log.date}: ${log.completed ? 'Done' : 'Not Done'}`}
                          className={`w-7 h-8 rounded-lg border-2 flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                            log.completed
                              ? 'bg-[#A3E635] text-slate-950 border-[#1E1B4B] shadow-[1.5px_1.5px_0px_#1E1B4B] font-black'
                              : 'bg-white dark:bg-[#2D234A] text-slate-400 dark:text-purple-300 border-[#1E1B4B]/30 hover:border-[#1E1B4B]'
                          } ${isSelected ? 'ring-2 ring-purple-600 -translate-y-0.5' : ''}`}
                        >
                          <span className="text-[8px] font-extrabold uppercase">{dayLetter}</span>
                          <span className="text-[10px] leading-none">
                            {log.completed ? (
                              <Check className="w-2.5 h-2.5 stroke-[3] inline" />
                            ) : (
                              '•'
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Delete Button */}
                  {habit.id && (
                    <button
                      onClick={() => onDeleteHabit(habit.id!)}
                      title="Delete habit"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </BrutalCard>
  );
};
