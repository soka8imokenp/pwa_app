import React from 'react';
import {
  CheckSquare,
  Zap,
  Timer,
  LayoutGrid,
  Scale,
  Utensils,
  Activity,
  Bot,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';

export type TabView = 'priorities' | 'backlog' | 'habits' | 'focus' | 'stats' | 'links';
export type HealthTab = 'body' | 'intake' | 'activity' | 'coach';

interface BottomNavProps {
  appMode?: 'planner' | 'health';
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  activeHealthTab?: HealthTab;
  onChangeHealthTab?: (tab: HealthTab) => void;
  onOpenMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  appMode = 'planner',
  activeTab,
  onChangeTab,
  activeHealthTab = 'body',
  onChangeHealthTab,
  onOpenMenu,
}) => {
  const handleTabClick = (tab: TabView) => {
    playClickSound();
    onChangeTab(tab);
  };

  const handleHealthTabClick = (tab: HealthTab) => {
    playClickSound();
    if (onChangeHealthTab) onChangeHealthTab(tab);
  };

  const isSecondaryActive = activeTab === 'backlog' || activeTab === 'stats' || activeTab === 'links';

  return (
    <>
      {/* Smooth Blur + Gradient Backdrop */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none h-24 select-none"
        style={{
          background: 'linear-gradient(to top, rgba(244, 240, 234, 0.96) 0%, rgba(244, 240, 234, 0.8) 55%, rgba(244, 240, 234, 0) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage: 'linear-gradient(to top, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0) 100%)',
        }}
      />

      {/* Symmetrical 4-Item Japanese Editorial Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)+12px)] px-4 select-none">
        <nav className="w-full max-w-sm bg-white/95 backdrop-blur-md border-[1.75px] border-[#24201D] rounded-2xl shadow-[0_10px_25px_rgba(36,32,29,0.06),2px_2px_0px_#24201D] p-1 grid grid-cols-4 pointer-events-auto font-body gap-1">
          
          {appMode === 'health' ? (
            /* Health & Body OS Tabs */
            <>
              {/* 1. Body & BMI */}
              <button
                onClick={() => handleHealthTabClick('body')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  activeHealthTab === 'body'
                    ? 'bg-[#DDE8DE] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                    : 'hover:bg-[#F4F0EA] border-[1.5px] border-transparent text-[#78716C]'
                }`}
              >
                <Scale
                  className={`w-4 h-4 stroke-[2] ${
                    activeHealthTab === 'body' ? 'text-[#24201D]' : 'text-[#78716C]'
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                    activeHealthTab === 'body' ? 'font-bold text-[#24201D]' : 'font-medium text-[#78716C]'
                  }`}
                >
                  Body
                </span>
              </button>

              {/* 2. Intake (Calories & Water) */}
              <button
                onClick={() => handleHealthTabClick('intake')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  activeHealthTab === 'intake'
                    ? 'bg-[#FBECCF] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                    : 'hover:bg-[#F4F0EA] border-[1.5px] border-transparent text-[#78716C]'
                }`}
              >
                <Utensils
                  className={`w-4 h-4 stroke-[2] ${
                    activeHealthTab === 'intake' ? 'text-[#24201D]' : 'text-[#78716C]'
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                    activeHealthTab === 'intake' ? 'font-bold text-[#24201D]' : 'font-medium text-[#78716C]'
                  }`}
                >
                  Intake
                </span>
              </button>

              {/* 3. Activity */}
              <button
                onClick={() => handleHealthTabClick('activity')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  activeHealthTab === 'activity'
                    ? 'bg-[#FEE2E2] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                    : 'hover:bg-[#F4F0EA] border-[1.5px] border-transparent text-[#78716C]'
                }`}
              >
                <Activity
                  className={`w-4 h-4 stroke-[2] ${
                    activeHealthTab === 'activity' ? 'text-[#24201D]' : 'text-[#78716C]'
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                    activeHealthTab === 'activity' ? 'font-bold text-[#24201D]' : 'font-medium text-[#78716C]'
                  }`}
                >
                  Activity
                </span>
              </button>

              {/* 4. AI Coach */}
              <button
                onClick={() => handleHealthTabClick('coach')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  activeHealthTab === 'coach'
                    ? 'bg-[#E0E7FF] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                    : 'hover:bg-[#F4F0EA] border-[1.5px] border-transparent text-[#78716C]'
                }`}
              >
                <Bot
                  className={`w-4 h-4 stroke-[2] ${
                    activeHealthTab === 'coach' ? 'text-[#24201D]' : 'text-[#78716C]'
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                    activeHealthTab === 'coach' ? 'font-bold text-[#24201D]' : 'font-medium text-[#78716C]'
                  }`}
                >
                  AI Coach
                </span>
              </button>
            </>
          ) : (
            /* Planner OS Tabs */
            <>
              {/* 1. Today Priorities */}
              <button
                onClick={() => handleTabClick('priorities')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
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
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
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

              {/* 3. Focus Timer */}
              <button
                onClick={() => handleTabClick('focus')}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
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

              {/* 4. Menu / More */}
              <button
                onClick={() => {
                  playClickSound();
                  onOpenMenu();
                }}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
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
                  Menu
                </span>
              </button>
            </>
          )}

        </nav>
      </div>
    </>
  );
};
