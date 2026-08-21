import React, { useState, useEffect } from 'react';
import { LottiePlayer } from './LottiePlayer';
import rabbitAnimation from '../../assets/rabbit-hi.json';
import { Zap, Sparkles, Flame, Check } from 'lucide-react';

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onFinish,
  minDurationMs = 1400,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [statusText, setStatusText] = useState('Initializing Archive...');

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));
      setProgress(pct);

      if (pct < 40) {
        setStatusText('Loading Daily Tasks...');
      } else if (pct < 80) {
        setStatusText('Syncing Habits & Streaks...');
      } else {
        setStatusText('Ready!');
      }

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinish) {
              onFinish();
            }
          }, 400);
        }, 150);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [minDurationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-100 flex flex-col items-center justify-center p-6 bg-[#FAF7F2] font-body select-none transition-all duration-400 ease-out ${
        isFadingOut
          ? 'opacity-0 scale-105 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Dots Accent */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(#18181B 1.25px, transparent 1.25px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
        {/* Animated Mascot Card */}
        <div className="relative">
          <div className="w-32 h-32 rounded-[2.5rem] bg-white border-[2.25px] border-[#18181B] shadow-[4px_4px_0px_#18181B] flex items-center justify-center p-3 relative overflow-hidden">
            {/* Pastel Inner Circle */}
            <div className="absolute inset-2 rounded-[2rem] bg-[#E8DCFF] border border-[#18181B]/15 flex items-center justify-center overflow-hidden">
              <LottiePlayer
                animationData={rabbitAnimation}
                loop={true}
                autoplay={true}
                className="w-full h-full object-contain scale-110"
              />
            </div>
          </div>

          {/* Floating Flame Badge */}
          <div className="absolute -bottom-2 -right-2 px-2.5 py-1 bg-[#FFE873] border-[1.75px] border-[#18181B] rounded-xl shadow-[2px_2px_0px_#18181B] flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-400 animate-bounce" />
            <span className="text-[10px] font-black text-[#18181B] font-mono-num uppercase">
              100% Offline
            </span>
          </div>
        </div>

        {/* Brand Titles */}
        <div className="space-y-1">
          <h1 className="text-xl font-black font-display tracking-wider uppercase text-[#18181B]">
            Daily Sumire
          </h1>
          <p className="text-xs font-bold text-slate-500">
            Focus & Habits Vault
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="w-full space-y-2 pt-2">
          <div className="w-full h-3 bg-white border-[1.75px] border-[#18181B] rounded-full overflow-hidden p-0.5 shadow-[2px_2px_0px_#18181B]">
            <div
              className="h-full bg-[#BEF264] rounded-full border-r border-[#18181B] transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 px-1 font-mono-num">
            <span>{statusText}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
