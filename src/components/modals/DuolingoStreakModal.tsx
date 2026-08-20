import React, { useEffect } from 'react';
import { Share2, X, Flame, Sparkles, Target } from 'lucide-react';
import fireAnimation from '../../assets/fire.json';
import { LottiePlayer } from '../common/LottiePlayer';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import type { OverallActivityStats } from '../../lib/streaks';
import confetti from 'canvas-confetti';

interface DuolingoStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
  activityStats?: OverallActivityStats;
}

export const DuolingoStreakModal: React.FC<DuolingoStreakModalProps> = ({
  isOpen,
  onClose,
  streakCount,
  activityStats,
}) => {
  useEffect(() => {
    if (isOpen) {
      playSuccessChime();
      if (streakCount > 0) {
        confetti({
          particleCount: 40,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#FFE873', '#FED7AA', '#E8DCFF', '#BEF264', '#18181B'],
        });
      }
    }
  }, [isOpen, streakCount]);

  if (!isOpen) return null;

  const today = new Date();
  const currentDayIndex = today.getDay(); // 0 is Sunday
  const defaultWeekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Current week number in the year
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  const isActiveToday = activityStats ? activityStats.isActiveToday : false;
  const weeklyDays = activityStats?.weeklyActivity || defaultWeekDays.map((d, i) => ({
    date: '',
    dayLabel: d,
    active: i < currentDayIndex && streakCount > 0,
    isToday: i === currentDayIndex,
  }));

  // Calculate progress percentage for the week
  const completedDaysThisWeek = weeklyDays.filter((d) => d.active).length;
  const progressPercent = Math.min(100, Math.max(streakCount > 0 ? 14 : 0, (completedDaysThisWeek / 7) * 100));

  const handleShare = async () => {
    playClickSound();
    const shareText = streakCount > 0
      ? `I'm on a ${streakCount} day streak on Daily Sumire! 🔥 Keep the momentum going!`
      : `Starting my productivity streak on Daily Sumire! ✨`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Daily Sumire - ${streakCount > 0 ? `${streakCount} Day Streak!` : 'Daily Planner'}`,
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // Fallback
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
      } catch {
        // Fallback
      }
    }
  };

  const handleConfirm = () => {
    playClickSound();
    if (streakCount > 0) {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#FFE873', '#FED7AA', '#18181B'],
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-[#18181B]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-sm bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
        
        {/* Close Button Top Right */}
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-slate-500 hover:text-[#18181B] shadow-2xs active:scale-95 transition-all cursor-pointer z-20"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* 1. Animated Lottie Flame (Clean floating flame) */}
        <div className="w-36 h-36 flex items-center justify-center my-2 relative">
          <LottiePlayer
            animationData={fireAnimation}
            loop={true}
            autoplay={true}
            className={`w-full h-full object-contain ${streakCount === 0 ? 'opacity-70 grayscale-[30%]' : ''}`}
          />
        </div>

        {/* 2. Streak Title in Our Style */}
        <div className="space-y-1 mb-4">
          <h2 className="text-2xl sm:text-3xl font-black font-display text-[#18181B] uppercase tracking-tight leading-none">
            {streakCount > 0 ? `${streakCount} Day Streak!` : 'Start Your Streak!'}
          </h2>
          <span className="inline-block px-3 py-0.5 rounded-full bg-[#E8DCFF] border border-[#18181B] text-[10px] font-black uppercase tracking-wider text-[#18181B] shadow-2xs">
            {streakCount > 0
              ? isActiveToday
                ? 'Streak Secured for Today! 🔥'
                : 'Complete an activity today'
              : 'Complete 1 activity to ignite'}
          </span>
        </div>

        {/* 3. Weekly Progress Card (Our Signature Neo-Brutalist Card) */}
        <div className="w-full bg-[#FAF7F2] border-[1.75px] border-[#18181B] rounded-2xl p-4 mb-5 space-y-3 text-left shadow-2xs">
          
          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weeklyDays.map((day) => {
              return (
                <div
                  key={day.dayLabel}
                  className={`py-1 rounded-lg border text-[10px] font-black uppercase transition-all ${
                    day.active
                      ? 'bg-[#FFE873] text-[#18181B] border-[#18181B] shadow-2xs'
                      : day.isToday
                      ? 'bg-[#18181B] text-white border-[#18181B] shadow-2xs -translate-y-0.5'
                      : 'bg-white text-slate-400 border-[#18181B]/20'
                  }`}
                >
                  {day.dayLabel}
                </div>
              );
            })}
          </div>

          {/* Progress Bar with Signature Gradient Fill */}
          <div className="relative w-full h-4 bg-white border-[1.75px] border-[#18181B] rounded-full p-0.5 shadow-inner overflow-hidden flex items-center">
            <div
              className="h-full bg-gradient-to-r from-[#FFE873] via-[#FED7AA] to-[#FDBA74] border-r border-[#18181B] rounded-full relative flex items-center justify-end pr-1 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            >
              {progressPercent > 0 && <div className="w-1.5 h-1.5 bg-[#18181B] rounded-full shadow-2xs" />}
            </div>
          </div>

          {/* Week Counter Label */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Weekly Goal
            </span>
            <span className="px-2 py-0.5 bg-white border border-[#18181B] rounded-md text-[9px] font-black font-mono-num uppercase tracking-wider text-[#18181B] shadow-2xs">
              WEEK {weekNumber}
            </span>
          </div>

          {/* Divider & Motivational Subtext */}
          <div className="pt-2 border-t border-[#18181B]/15">
            <p className="text-xs font-bold text-slate-600 text-center leading-snug">
              {streakCount > 0
                ? isActiveToday
                  ? "Great job! You've kept your flame burning today."
                  : "Complete 1 task, habit, or focus session today to protect your streak!"
                : "Complete any task, habit, or focus session today to ignite your 1-day streak!"}
            </p>
          </div>

        </div>

        {/* 4. Bottom Action Bar */}
        <div className="w-full flex items-center gap-2.5">
          {/* Share Button */}
          <button
            onClick={handleShare}
            title="Share Streak"
            className="w-12 h-12 rounded-2xl bg-[#FAF7F2] hover:bg-slate-100 border-[2px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer active:translate-y-0.5 active:shadow-none transition-all shrink-0"
          >
            <Share2 className="w-4 h-4 stroke-[2.25]" />
          </button>

          {/* Signature Action Button */}
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-[#FFE873] hover:bg-[#FED7AA] border-[2px] border-[#18181B] text-[#18181B] font-black font-display text-xs uppercase tracking-wider shadow-[3px_3px_0px_#18181B] active:translate-y-0.5 active:shadow-none cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <Flame className="w-4 h-4 stroke-[2.5] text-amber-800 fill-amber-500" />
            <span>{streakCount > 0 ? 'I CAN DO IT!' : "LET'S GO!"}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
