import React, { useEffect } from 'react';
import { Share2, X, Sparkles, Flame } from 'lucide-react';
import fireAnimation from '../../assets/fire.json';
import { LottiePlayer } from '../common/LottiePlayer';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface DuolingoStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
}

export const DuolingoStreakModal: React.FC<DuolingoStreakModalProps> = ({
  isOpen,
  onClose,
  streakCount,
}) => {
  useEffect(() => {
    if (isOpen) {
      playSuccessChime();
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF9600', '#FFC800', '#FF4B4B', '#2CE68D', '#1CB0F6'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate current weekday index (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0 is Sunday
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Current week number in the year
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  // Calculate progress percentage for the week bar up to today
  const progressPercent = Math.min(100, Math.max(14, ((currentDayIndex + 0.5) / 7) * 100));

  const handleShare = async () => {
    playClickSound();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Daily Sumire - ${streakCount} Day Streak!`,
          text: `I'm on a ${streakCount} day streak on Daily Sumire! 🔥 Keep the momentum going!`,
          url: window.location.href,
        });
      } catch {
        // Fallback
      }
    } else {
      try {
        await navigator.clipboard.writeText(`I'm on a ${streakCount} day streak on Daily Sumire! 🔥`);
      } catch {
        // Fallback
      }
    }
  };

  const handleConfirm = () => {
    playClickSound();
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#FF9600', '#FFC800', '#1CB0F6'],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-[#131F24]/90 backdrop-blur-md animate-in fade-in duration-200 font-body select-none">
      <div className="w-full max-w-sm bg-[#131F24] border-[2px] border-[#2B3840] rounded-[2.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
        
        {/* Close Button Top Right */}
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1F2C33] hover:bg-[#2B3840] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer active:scale-95 transition-all z-20"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Ambient Glow behind Flame */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Giant Lottie Animated Fire */}
        <div className="w-44 h-44 flex items-center justify-center my-2 relative z-10">
          <LottiePlayer
            animationData={fireAnimation}
            loop={true}
            autoplay={true}
            className="w-full h-full object-contain filter drop-shadow-[0_0_16px_rgba(255,150,0,0.4)]"
          />
        </div>

        {/* 2. Streak Title */}
        <div className="space-y-1 mb-5 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black font-display text-[#FF9600] tracking-tight leading-none drop-shadow-[0_2px_8px_rgba(255,150,0,0.3)]">
            {streakCount} day streak!
          </h2>
        </div>

        {/* 3. Week Progress Card */}
        <div className="w-full bg-[#18262D] border border-[#2B3840] rounded-2xl p-4 mb-6 space-y-3 text-left relative z-10 shadow-inner">
          
          {/* Weekday Row */}
          <div className="grid grid-cols-7 text-center">
            {weekDays.map((day, idx) => {
              const isToday = idx === currentDayIndex;
              const isPassed = idx <= currentDayIndex;

              return (
                <div key={day} className="flex flex-col items-center">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider ${
                      isToday
                        ? 'text-[#FF9600] scale-110 font-extrabold'
                        : isPassed
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar with Glowing Capsule */}
          <div className="relative w-full h-5 bg-[#2B3840] rounded-full overflow-visible flex items-center px-1">
            {/* Active streak track */}
            <div
              className="h-3.5 bg-gradient-to-r from-[#FFC800] to-[#FF9600] rounded-full relative flex items-center justify-end pr-1 shadow-[0_0_12px_rgba(255,150,0,0.6)] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Sparkling star on current day */}
              <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_6px_#FFFFFF] animate-ping opacity-75 absolute right-1" />
              <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_4px_#FFFFFF] relative z-10" />
            </div>

            {/* Droplet placeholder at end of week */}
            <div className="absolute right-2 opacity-30 text-slate-400">
              <Flame className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>

          {/* Week Counter Label */}
          <div className="flex justify-end pr-1">
            <span className="text-[9px] font-black font-mono-num uppercase tracking-wider text-slate-400">
              WEEK {weekNumber}
            </span>
          </div>

          {/* Divider & Motivational Subtext */}
          <div className="pt-2.5 border-t border-[#2B3840]/80">
            <p className="text-xs font-semibold text-slate-300 text-center leading-relaxed">
              Complete your focus & habits today to keep your <span className="text-[#FF9600] font-black">Perfect Streak</span>!
            </p>
          </div>

        </div>

        {/* 4. Bottom Action Bar */}
        <div className="w-full flex items-center gap-3 relative z-10">
          {/* Share Button */}
          <button
            onClick={handleShare}
            title="Share Streak"
            className="w-13 h-13 rounded-2xl bg-[#18262D] hover:bg-[#1F2C33] border-[2px] border-[#2B3840] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer active:scale-95 transition-all shadow-md shrink-0"
          >
            <Share2 className="w-5 h-5 stroke-[2.25]" />
          </button>

          {/* Duolingo Bright Cyan/Blue Button */}
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-[#1CB0F6] hover:bg-[#1899D6] active:translate-y-1 text-white font-black font-display text-sm uppercase tracking-wider border-b-[4px] border-[#1899D6] active:border-b-0 shadow-[0_4px_16px_rgba(28,176,246,0.35)] cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <span>I CAN DO IT!</span>
          </button>
        </div>

      </div>
    </div>
  );
};
