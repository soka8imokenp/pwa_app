import React from 'react';
import { Volume2, VolumeX, Flame, Settings, StickyNote } from 'lucide-react';
import { isSoundMuted, setSoundMuted, playClickSound } from '../../lib/sound';

interface HeaderProps {
  streakCount: number;
  userName?: string;
  onOpenSettings: () => void;
  onOpenScratchpad?: () => void;
  completedTasksCount?: number;
  totalTasksCount?: number;
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
    <header className="w-full bg-transparent pt-3 pb-2 px-1 select-none font-body">
      <div className="flex items-center justify-between gap-2">
        {/* Left: User Avatar & Greeting */}
        <div className="flex items-center gap-2.5">
          <div
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full bg-[#FFDE59] border-2 border-black flex items-center justify-center text-lg shadow-[2px_2px_0px_#000000] shrink-0 cursor-pointer active:translate-y-0.5 active:shadow-none transition-all"
            title="Settings"
          >
            ⚡
          </div>

          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              Good day
            </span>
            <h1 className="text-sm font-black font-display text-black tracking-tight leading-tight">
              Hey, {firstName} ✨
            </h1>
          </div>
        </div>

        {/* Right: Streak & Controls */}
        <div className="flex items-center gap-1.5">
          {/* Scratchpad Button */}
          {onOpenScratchpad && (
            <button
              onClick={() => {
                playClickSound();
                onOpenScratchpad();
              }}
              title="Quick Scratchpad"
              className="w-8 h-8 rounded-full bg-white hover:bg-[#FAF6EE] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_#000000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5 stroke-[2.25]" />
            </button>
          )}

          {/* Flame Streak in Neo Cyber Yellow */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#FFDE59] border-2 border-black rounded-full shadow-[2px_2px_0px_#000000]">
            <Flame className="w-3.5 h-3.5 text-amber-900 fill-amber-500 stroke-[2.25]" />
            <span className="text-xs font-black font-display text-black font-mono-num">
              {streakCount}d
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={muted ? 'Unmute' : 'Mute'}
            className="w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-400 stroke-[2.25]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-purple-800 stroke-[2.25]" />
            )}
          </button>

          {/* Settings Button in Neo Violet */}
          <button
            onClick={() => {
              playClickSound();
              onOpenSettings();
            }}
            title="Settings"
            className="w-8 h-8 rounded-full bg-[#C084FC] hover:bg-[#B366FA] border-2 border-black flex items-center justify-center text-black shadow-[2px_2px_0px_#000000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-black stroke-[2.25]" />
          </button>
        </div>
      </div>
    </header>
  );
};
