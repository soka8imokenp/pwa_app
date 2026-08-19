import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Zap, Check } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface MiniFocusRingProps {
  onSessionComplete?: (durationMinutes: number) => void;
}

export const MiniFocusRing: React.FC<MiniFocusRingProps> = ({
  onSessionComplete,
}) => {
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isRunning) {
      setIsRunning(false);
      playSuccessChime();
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#BEF264', '#C084FC', '#FED7AA', '#38BDF8'],
      });
      if (onSessionComplete) {
        onSessionComplete(targetMinutes);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining, targetMinutes, onSessionComplete]);

  const toggleTimer = () => {
    playClickSound();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    playClickSound();
    setIsRunning(false);
    setSecondsRemaining(targetMinutes * 60);
  };

  const selectPreset = (mins: number) => {
    playClickSound();
    setIsRunning(false);
    setTargetMinutes(mins);
    setSecondsRemaining(mins * 60);
  };

  const totalSeconds = targetMinutes * 60;
  const progressPercent = ((totalSeconds - secondsRemaining) / totalSeconds) * 100;
  
  // Format MM:SS
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // SVG Circular Math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="bg-white/95 backdrop-blur-md border-[1.5px] border-[#18181B] rounded-[2rem] p-4 shadow-[2.5px_2.5px_0px_#18181B] space-y-3 font-body select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#BEF264] border border-[#18181B] flex items-center justify-center text-xs shadow-2xs">
            <Zap className="w-4 h-4 text-[#18181B] stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
              Focus Engine
            </h3>
            <p className="text-[10px] font-semibold text-slate-500">
              {isRunning ? 'Deep work in progress...' : 'Ready for high focus'}
            </p>
          </div>
        </div>

        {/* Preset Selector Chips */}
        <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-full border border-slate-200">
          {[15, 25, 45].map((m) => (
            <button
              key={m}
              onClick={() => selectPreset(m)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                targetMinutes === m
                  ? 'bg-[#C084FC] text-[#18181B] border border-[#18181B] shadow-2xs'
                  : 'text-slate-500 hover:text-[#18181B]'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Circular Timer Row */}
      <div className="flex items-center justify-between gap-4 pt-1">
        {/* SVG Circular Progress Ring */}
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background Track Ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-slate-100 fill-none"
              strokeWidth="8"
            />
            {/* Active Glowing Progress Ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-[#C084FC] fill-none transition-all duration-300 ease-linear"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Centered Digital Countdown */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-black font-mono-num tracking-tight text-[#18181B]">
              {formattedTime}
            </span>
            <span className="text-[8px] font-extrabold uppercase text-slate-400">
              {isRunning ? 'active' : 'idle'}
            </span>
          </div>
        </div>

        {/* Controls and Stats */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTimer}
              className={`flex-1 py-2.5 px-3 rounded-full border-[1.5px] border-[#18181B] font-extrabold font-display text-xs uppercase tracking-wider shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                isRunning
                  ? 'bg-[#FEF08A] hover:bg-[#FDE047] text-[#18181B]'
                  : 'bg-[#BEF264] hover:bg-[#A3E635] text-[#18181B]'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Flow</span>
                </>
              )}
            </button>

            <button
              onClick={resetTimer}
              title="Reset Timer"
              className="w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-slate-600 hover:text-[#18181B] shadow-2xs active:scale-95 transition-transform cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          <p className="text-[10px] font-medium text-slate-500 leading-tight">
            Scientific Pomodoro cycle to maintain peak creative momentum without burnout.
          </p>
        </div>
      </div>

    </div>
  );
};
