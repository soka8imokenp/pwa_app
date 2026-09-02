import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { LottiePlayer } from './LottiePlayer';
import rabbitAnimation from '../../assets/rabbit-hi.json';

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onFinish,
  minDurationMs = 1500,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [statusText, setStatusText] = useState('Initializing sanctuary...');

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawPct = (elapsed / minDurationMs) * 100;
      const pct = Math.min(100, Math.round(rawPct));
      setProgress(pct);

      if (pct < 35) {
        setStatusText('Calibrating daily rhythm...');
      } else if (pct < 75) {
        setStatusText('Harmonizing habits & focus...');
      } else {
        setStatusText('Welcome back');
      }

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinish) {
              onFinish();
            }
          }, 450);
        }, 200);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [minDurationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-8 bg-[#F4F0EA] font-body select-none transition-all duration-500 ease-out ${
        isFadingOut
          ? 'opacity-0 scale-[1.03] pointer-events-none filter blur-xs'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Architectural Texture */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #24201D 1px, transparent 1px),
            linear-gradient(to bottom, #24201D 1px, transparent 1px)
          `,
          backgroundSize: '28px 28px',
        }}
      />

      {/* Ambient Breathing Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#3D6B52]/12 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-[#E09F3E]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Subtle Status Pill */}
      <div className="relative z-10 pt-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/80 backdrop-blur-md border-[1.5px] border-[#24201D] rounded-full shadow-[1.5px_1.5px_0px_#24201D]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3D6B52] animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#24201D] font-display">
            Daily Planner • v1.6
          </span>
        </div>
      </div>

      {/* Center Emblem & Typography */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-xs w-full my-auto animate-in fade-in zoom-in-95 duration-500">
        
        {/* Luxury Mascot & Seal Container */}
        <div className="relative">
          <div className="w-32 h-32 rounded-[2.5rem] bg-white border-[2px] border-[#24201D] shadow-[4px_4px_0px_#24201D] flex items-center justify-center p-3 relative transition-transform">
            <div className="w-full h-full rounded-[2rem] bg-gradient-to-b from-[#F4EFEA] to-[#E8E0D2] border-[1.5px] border-[#24201D]/20 flex items-center justify-center overflow-hidden relative shadow-inner">
              <LottiePlayer
                animationData={rabbitAnimation}
                loop={true}
                autoplay={true}
                className="w-full h-full object-contain scale-110"
              />
            </div>
          </div>
        </div>

        {/* Brand Headline & Editorial Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black font-display tracking-wider text-[#24201D] uppercase">
            Daily Planner
          </h1>
          <p className="text-xs font-bold text-[#6B635B] tracking-wide">
            Mindful Rhythm • Focus • Habits
          </p>
        </div>

        {/* Minimalist Satin Progress Bar */}
        <div className="w-full space-y-2.5 pt-4">
          <div className="w-full h-2 bg-stone-200/90 border-[1.5px] border-[#24201D] rounded-full overflow-hidden p-[1px] shadow-[1.5px_1.5px_0px_#24201D]">
            <div
              className="h-full bg-gradient-to-r from-[#3D6B52] to-[#529974] rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-[#6B635B] px-1 font-mono-num">
            <span className="truncate">{statusText}</span>
            <span className="font-extrabold text-[#24201D]">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Privacy & Encryption Guarantee */}
      <div className="relative z-10 pb-2 text-center animate-in fade-in duration-700">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#6B635B]">
          <Shield className="w-3.5 h-3.5 text-[#3D6B52]" />
          <span>Local Encrypted Vault • 100% Private</span>
        </div>
      </div>
    </div>
  );
};
