import React, { useState, useEffect } from 'react';
import { Flame, Settings } from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import { getAvatarById } from '../../data/avatars';

interface HeaderProps {
  streakCount: number;
  userName?: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  streakCount,
  userName = 'Alex',
  onOpenSettings,
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
    <header className="w-full bg-transparent pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-2 px-1 select-none font-body">
      <div className="flex items-center justify-between gap-3">
        {/* Left: User Profile & Greeting */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-2xl border-[1.75px] border-[#18181B] flex items-center justify-center shadow-[1.5px_1.5px_0px_#18181B] shrink-0 cursor-pointer active:translate-y-0.5 active:shadow-none transition-all p-0.5"
            style={{ backgroundColor: activeAvatar.bg }}
            title="Settings & Profile"
          >
            {activeAvatar.renderSvg('w-full h-full')}
          </button>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-none">
              Daily Planner
            </span>
            <h1 className="text-sm font-bold font-display text-[#18181B] tracking-tight leading-tight mt-0.5">
              Hey, {firstName}
            </h1>
          </div>
        </div>

        {/* Right: Streak & Settings */}
        <div className="flex items-center gap-2">
          {/* Flame Streak Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFE873] border-[1.75px] border-[#18181B] rounded-full shadow-[1.5px_1.5px_0px_#18181B]">
            <Flame className="w-3.5 h-3.5 text-amber-700 fill-amber-500 stroke-[2]" />
            <span className="text-xs font-bold font-display text-[#18181B] font-mono-num">
              {streakCount}d
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => {
              playClickSound();
              onOpenSettings();
            }}
            title="Settings"
            className="w-8 h-8 rounded-xl bg-[#E8DCFF] hover:bg-[#D8C4FF] border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[#18181B] stroke-[2]" />
          </button>
        </div>
      </div>
    </header>
  );
};
