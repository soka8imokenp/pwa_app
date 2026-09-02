import React from 'react';
import {
  CheckSquare,
  Zap,
  Timer,
  LayoutGrid,
  MessageSquareText,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';

export type TabView = 'priorities' | 'backlog' | 'habits' | 'focus' | 'stats' | 'links';

interface BottomNavProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  onOpenSumire: () => void;
  onOpenMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenSumire,
  onOpenMenu,
}) => {
  const handleTabClick = (tab: TabView) => {
    playClickSound();
    onChangeTab(tab);
  };

  const isSecondaryActive = activeTab === 'backlog' || activeTab === 'stats' || activeTab === 'links';

  return (
    <>
      {/* Telegram-style Smooth Blur + Gradient Backdrop */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none h-28 select-none"
        style={{
          background: 'linear-gradient(to top, var(--bg-canvas) 0%, rgba(244, 240, 234, 0) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage: 'linear-gradient(to top, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0) 100%)',
        }}
      />

      {/* Floating Symmetrical 5-Item Japanese Neo-Brutalist Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)+14px)] px-3 select-none">
        <nav className="w-full max-w-md bg-white/95 dark:bg-[#1E1B18]/95 backdrop-blur-md border-[1.75px] border-[#24201D] dark:border-[#3E3730] rounded-2xl shadow-[0_10px_25px_rgba(36,32,29,0.06),2px_2px_0px_#24201D] dark:shadow-[0_10px_25px_rgba(0,0,0,0.4),2px_2px_0px_#3E3730] p-1 flex items-center justify-between pointer-events-auto font-body gap-1">
          
          {/* 1. Today Priorities */}
          <button
            onClick={() => handleTabClick('priorities')}
            className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'priorities'
                ? 'bg-[#F0BB58] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                : 'hover:bg-[#F4F0EA] border-[1.5px] border-transparent text-[#78716C]'
            }`}
          >
            <CheckSquare
              className={`w-4 h-4 stroke-[2] ${
                activeTab === 'priorities' ? 'text-[#24201D]' : 'text-[#78716C]'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'priorities' ? 'font-bold text-[#24201D]' : 'font-medium text-[#78716C]'
              }`}
            >
              Today
            </span>
          </button>

          {/* 2. Habits */}
          <button
            onClick={() => handleTabClick('habits')}
            className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'habits'
                ? 'bg-[#DDE8DE] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                : 'hover:bg-[#F4F0EA] border-[1.5px] border-transparent text-[#78716C]'
            }`}
          >
            <Zap
              className={`w-4 h-4 stroke-[2] ${
                activeTab === 'habits' ? 'text-[#24201D]' : 'text-[#78716C]'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'habits' ? 'font-bold text-[#24201D]' : 'font-medium text-[#78716C]'
              }`}
            >
              Habits
            </span>
          </button>

          {/* 3. Sumire Companion (Opens Sumire Modal) */}
          <button
            onClick={() => {
              playClickSound();
              onOpenSumire();
            }}
            className="flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer hover:bg-[#F4F0EA] border-[1.5px] border-transparent text-[#78716C] active:scale-95"
            title="Sumire Companion"
          >
            <MessageSquareText className="w-4 h-4 stroke-[2] text-[#78716C]" />
            <span className="text-[10px] mt-0.5 tracking-tight leading-none font-medium text-[#78716C]">
              Sumire
            </span>
          </button>

          {/* 4. Focus Timer */}
          <button
            onClick={() => handleTabClick('focus')}
            className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'focus'
                ? 'bg-[#F7E3DC] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                : 'hover:bg-[#F4F0EA] border-[1.5px] border-transparent text-[#78716C]'
            }`}
          >
            <Timer
              className={`w-4 h-4 stroke-[2] ${
                activeTab === 'focus' ? 'text-[#24201D]' : 'text-[#78716C]'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'focus' ? 'font-bold text-[#24201D]' : 'font-medium text-[#78716C]'
              }`}
            >
              Focus
            </span>
          </button>

          {/* 5. Menu Modal Toggle */}
          <button
            onClick={() => {
              playClickSound();
              onOpenMenu();
            }}
            className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              isSecondaryActive
                ? 'bg-[#DEE8EF] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                : 'hover:bg-[#F4F0EA] border-[1.5px] border-transparent text-[#78716C]'
            }`}
          >
            <LayoutGrid
              className={`w-4 h-4 stroke-[2] ${
                isSecondaryActive ? 'text-[#24201D]' : 'text-[#78716C]'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                isSecondaryActive ? 'font-bold text-[#24201D]' : 'font-medium text-[#78716C]'
              }`}
            >
              {activeTab === 'backlog' ? 'Backlog' : activeTab === 'stats' ? 'Stats' : activeTab === 'links' ? 'Hub' : 'Menu'}
            </span>
          </button>

        </nav>
      </div>
    </>
  );
};
