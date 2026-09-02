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
    <BrutalCard variant="lime" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#24201D]/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#FBECCF] border-[1.75px] border-[#24201D] rounded-xl shadow-[1.5px_1.5px_0px_#24201D]">
            <Flame className="w-5 h-5 text-[#D97706] fill-[#F59E0B] animate-flame" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#24201D] tracking-tight flex items-center gap-2">
              Habit Streaks Matrix
            </h3>
            <p className="text-xs font-bold text-[#6B635B]">
              Quantifiable consistency • {completedTodayCount}/{habits.length} completed today
            </p>
          </div>
        </div>

        <BrutalButton
          variant="primary"
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
          <div className="p-8 text-center bg-white/70 border-2 border-dashed border-[#24201D]/25 rounded-2xl">
            <Target className="w-8 h-8 text-[#3D6B52] mx-auto mb-2" />
            <p className="text-sm font-black text-[#24201D]">
              No habits created yet!
            </p>
            <p className="text-xs font-semibold text-[#6B635B] mt-1 mb-3">
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
              className="bg-white border-[1.75px] border-[#24201D] rounded-2xl p-3.5 shadow-[2.5px_2.5px_0px_#24201D] transition-all hover:-translate-y-0.5"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl border-[1.75px] border-[#24201D] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#24201D]"
                    style={{ backgroundColor: habit.color || '#DDE8DE' }}
                  >
                    <Zap className="w-5 h-5 text-[#24201D] stroke-[2.25]" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-[#24201D] truncate">
                      {habit.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#D97706] font-mono-num">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        {habit.currentStreak}d Streak
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="text-[11px] font-bold text-[#6B635B] font-mono-num">
                        Best: {habit.longestStreak}d
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: 7-day mini pill matrix */}
                <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1.5 rounded-xl border border-[#24201D]/20">
                    {habit.recentLogs.map((log) => {
                      const isSelected = log.date === selectedDate;
                      const dateObj = new Date(log.date);
                      const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dateObj.getDay()];

                      return (
                        <button
                          key={log.date}
                          onClick={() => handleToggle(habit.id!, log.date, log.completed)}
                          title={`${log.date}: ${log.completed ? 'Done' : 'Not Done'}`}
                          className={`w-7 h-8 rounded-lg border-[1.5px] flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                            log.completed
                              ? 'bg-[#3D6B52] text-white border-[#24201D] shadow-[1px_1px_0px_#24201D] font-black'
                              : 'bg-white text-stone-400 border-[#24201D]/20 hover:border-[#24201D]'
                          } ${isSelected ? 'ring-2 ring-[#3D6B52] -translate-y-0.5' : ''}`}
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
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
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
