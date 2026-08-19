import React, { useEffect } from 'react';
import { Trophy, CheckCircle2, Flame, Clock, Target, ArrowRight, X, Heart } from 'lucide-react';
import type { Task, HabitWithStats, FocusSession } from '../../types';
import { playSuccessChime, playClickSound } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface EveningReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  priorityTasks: Task[];
  habits: HabitWithStats[];
  todaysSessions: FocusSession[];
  selectedDate: string;
}

export const EveningReviewModal: React.FC<EveningReviewModalProps> = ({
  isOpen,
  onClose,
  priorityTasks,
  habits,
  todaysSessions,
  selectedDate,
}) => {
  useEffect(() => {
    if (isOpen) {
      playSuccessChime();
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#BEF264', '#C084FC', '#FED7AA', '#38BDF8', '#FEF08A'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completedPriorities = priorityTasks.filter((t) => t.isCompleted).length;
  const completedHabits = habits.filter((h) => h.completedToday).length;
  const totalFocusMins = todaysSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const score = Math.min(
    100,
    Math.round(
      (priorityTasks.length > 0 ? (completedPriorities / priorityTasks.length) * 50 : 30) +
      (habits.length > 0 ? (completedHabits / habits.length) * 30 : 20) +
      Math.min(totalFocusMins / 3, 20)
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 text-center">
        
        {/* Close */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#18181B]/20 flex items-center justify-center text-slate-500 hover:text-[#18181B] cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Celebration Trophy Icon */}
        <div className="w-16 h-16 rounded-full bg-[#FEF08A] border-[2px] border-[#18181B] flex items-center justify-center mx-auto shadow-[2px_2px_0px_#18181B]">
          <Trophy className="w-8 h-8 text-amber-900 stroke-[2.25]" />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-[#E9D5FF] px-3 py-1 rounded-full border border-[#18181B]">
            Daily Wrap-Up • {selectedDate}
          </span>
          <h2 className="text-xl font-black font-display text-[#18181B] mt-2">
            Fantastic Effort Today!
          </h2>
          <p className="text-xs font-semibold text-slate-500 max-w-xs mx-auto mt-1">
            You've built strong momentum towards your long-term goals.
          </p>
        </div>

        {/* 3 Metric Badges */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-[#FAF7F2] border border-[#18181B]/20 rounded-2xl">
            <Target className="w-4 h-4 text-purple-800 mx-auto stroke-[2.25]" />
            <p className="text-base font-black font-mono-num text-[#18181B] mt-1">
              {completedPriorities}/{priorityTasks.length}
            </p>
            <p className="text-[9px] font-extrabold uppercase text-slate-400">
              Priorities
            </p>
          </div>

          <div className="p-3 bg-[#FAF7F2] border border-[#18181B]/20 rounded-2xl">
            <Flame className="w-4 h-4 text-amber-600 mx-auto stroke-[2.25]" />
            <p className="text-base font-black font-mono-num text-[#18181B] mt-1">
              {completedHabits}/{habits.length}
            </p>
            <p className="text-[9px] font-extrabold uppercase text-slate-400">
              Habits
            </p>
          </div>

          <div className="p-3 bg-[#FAF7F2] border border-[#18181B]/20 rounded-2xl">
            <Clock className="w-4 h-4 text-lime-800 mx-auto stroke-[2.25]" />
            <p className="text-base font-black font-mono-num text-[#18181B] mt-1">
              {totalFocusMins}m
            </p>
            <p className="text-[9px] font-extrabold uppercase text-slate-400">
              Deep Flow
            </p>
          </div>
        </div>

        {/* Daily Grade Banner */}
        <div className="p-3.5 bg-[#BEF264] border-[1.75px] border-[#18181B] rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="text-left">
            <span className="text-[9px] font-extrabold uppercase text-lime-950 block">
              Day Score
            </span>
            <span className="text-sm font-black text-lime-950 font-display">
              Grade A+ Efficiency
            </span>
          </div>
          <span className="text-2xl font-black font-mono-num text-lime-950">
            {score}%
          </span>
        </div>

        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full py-3 rounded-full bg-[#C084FC] hover:bg-[#B366FA] text-[#18181B] border-[1.75px] border-[#18181B] text-xs font-black shadow-xs active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
        >
          <span>Ready for Tomorrow</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

      </div>
    </div>
  );
};
