import React, { useState, useEffect } from 'react';
import { Flame, Settings, CheckSquare, Apple } from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import { getAvatarById } from '../../data/avatars';

interface HeaderProps {
  streakCount: number;
  userName?: string;
  appMode?: 'planner' | 'health';
  onChangeAppMode?: (mode: 'planner' | 'health') => void;
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
  onOpenStreak?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  streakCount,
  userName = 'Alex',
  appMode = 'planner',
  onChangeAppMode,
  onOpenSettings,
  onOpenProfile,
  onOpenStreak,
}) => {
  const [avatarId, setAvatarId] = useState<string>('sumire-scout');

  useEffect(() => {
    const updateAvatar = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('kairo_selected_avatar');
        if (saved) setAvatarId(saved);
      }
    };
    updateAvatar();
    window.addEventListener('storage', updateAvatar);
    return () => window.removeEventListener('storage', updateAvatar);
  }, []);

  const activeAvatar = getAvatarById(avatarId);
  const firstName = userName.split(' ')[0] || 'Friend';

  return (
    <header className="w-full bg-transparent pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-1 px-1 select-none font-body space-y-2">
      <div className="flex items-center justify-between gap-3">
        {/* Left: User Profile & Greeting */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              playClickSound();
              if (onOpenProfile) {
                onOpenProfile();
              } else {
                onOpenSettings();
              }
            }}
            className="w-10 h-10 rounded-2xl border-[1.75px] border-[#24201D] flex items-center justify-center shadow-[1.5px_1.5px_0px_#24201D] shrink-0 cursor-pointer active:translate-y-0.5 active:shadow-none transition-all p-0.5"
            style={{ backgroundColor: activeAvatar.bg }}
            title="User Profile & Identity"
          >
            {activeAvatar.renderSvg('w-full h-full')}
          </button>

          <div>
            <span className="text-[10px] font-bold text-[#6B635B] uppercase tracking-wider block leading-none font-display">
              {appMode === 'health' ? 'Health & Body OS' : 'Daily Planner'}
            </span>
            <h1 className="text-sm font-bold font-display text-[#24201D] tracking-tight leading-tight mt-0.5">
              Hey, {firstName}
            </h1>
          </div>
        </div>

        {/* Right: Streak & Settings */}
        <div className="flex items-center gap-2">
          {/* Flame Streak Pill */}
          <button
            onClick={() => {
              playClickSound();
              if (onOpenStreak) onOpenStreak();
            }}
            title={streakCount > 0 ? `${streakCount} Day Streak!` : 'Start your streak today'}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-[1.75px] border-[#24201D] rounded-full shadow-[1.5px_1.5px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all ${
              streakCount > 0
                ? 'bg-[#F0BB58] hover:bg-[#E5A943]'
                : 'bg-[#F4F0EA] hover:bg-stone-200'
            }`}
          >
            <Flame
              className={`w-3.5 h-3.5 stroke-[2] ${
                streakCount > 0
                  ? 'text-[#8A4B12] fill-[#D97706]'
                  : 'text-stone-400 fill-stone-300'
              }`}
            />
            <span className="text-xs font-bold font-display text-[#24201D] font-mono-num">
              {streakCount}d
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              playClickSound();
              onOpenSettings();
            }}
            title="Settings"
            className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 border-[1.75px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-[1.5px_1.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[#24201D] stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Mode Switcher Pill */}
      {onChangeAppMode && (
        <div className="flex items-center justify-center pt-0.5">
          <div className="p-1 bg-white/90 backdrop-blur-sm border-[1.75px] border-[#24201D] rounded-2xl shadow-[1.5px_1.5px_0px_#24201D] flex items-center gap-1 w-full max-w-sm">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onChangeAppMode('planner');
              }}
              className={`flex-1 py-1 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer font-display uppercase tracking-wider ${
                appMode === 'planner'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Planner</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                onChangeAppMode('health');
              }}
              className={`flex-1 py-1 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer font-display uppercase tracking-wider ${
                appMode === 'health'
                  ? 'bg-[#3D6B52] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>Health & Body</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
