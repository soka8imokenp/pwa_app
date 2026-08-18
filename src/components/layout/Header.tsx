import React from 'react';
import { Volume2, VolumeX, Flame, Settings, StickyNote } from 'lucide-react';
import { isSoundMuted, setSoundMuted, playClickSound } from '../../lib/sound';

interface HeaderProps {
  streakCount: number;
  userName?: string;
  onOpenSettings: () => void;
  onOpenScratchpad?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  streakCount,
  userName = 'Alex',
  onOpenSettings,
  onOpenScratchpad,
}) => {
  const [muted, setMuted] = React.useState(isSoundMuted());

  const handleToggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
    if (!next) {
      playClickSound();
    }
  };

  const firstName = userName.split(' ')[0] || 'Friend';

  return (
    <header className="w-full bg-transparent pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-2 px-1 select-none font-body">
      <div className="flex items-center justify-between gap-3">
        {/* Left: User Profile & Greeting */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-xl bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center font-bold text-sm shadow-[1.5px_1.5px_0px_#18181B] shrink-0 cursor-pointer active:translate-y-0.5 active:shadow-none transition-all overflow-hidden p-0.5"
            title="Settings & Profile"
          >
            <img src="/icon-192x192.png" alt="Sumire" className="w-full h-full object-cover rounded-[9px]" />
          </button>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block leading-none">
              Daily Sumire
            </span>
            <h1 className="text-sm font-bold font-display text-[#18181B] tracking-tight leading-tight mt-0.5">
              Hey, {firstName}
            </h1>
          </div>
        </div>

        {/* Right: Streak & Clean Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Scratchpad */}
          {onOpenScratchpad && (
            <button
              onClick={() => {
                playClickSound();
                onOpenScratchpad();
              }}
              title="Quick Notes"
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          )}

          {/* Flame Streak Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#FFE873] border-[1.75px] border-[#18181B] rounded-full shadow-[1.5px_1.5px_0px_#18181B]">
            <Flame className="w-3.5 h-3.5 text-amber-700 fill-amber-500 stroke-[2]" />
            <span className="text-xs font-bold font-display text-[#18181B] font-mono-num">
              {streakCount}d
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={muted ? 'Unmute' : 'Mute'}
            className="w-8 h-8 rounded-lg bg-white border-[1.75px] border-[#18181B] flex items-center justify-center shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-400 stroke-[2]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#18181B] stroke-[2]" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => {
              playClickSound();
              onOpenSettings();
            }}
            title="Settings"
            className="w-8 h-8 rounded-lg bg-[#E8DCFF] hover:bg-[#D8C4FF] border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#18181B] stroke-[2]" />
          </button>
        </div>
      </div>
    </header>
  );
};
