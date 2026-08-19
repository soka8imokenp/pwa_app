import React, { useState } from 'react';
import {
  CheckSquare,
  Zap,
  Timer,
  LayoutGrid,
  Inbox,
  BarChart3,
  Compass,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';

export type TabView = 'priorities' | 'backlog' | 'habits' | 'focus' | 'stats' | 'links';

interface BottomNavProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  onOpenCompanion: () => void;
  onOpenSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenCompanion,
  onOpenSettings,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTabClick = (tab: TabView) => {
    playClickSound();
    setIsMenuOpen(false);
    onChangeTab(tab);
  };

  const handleMenuToggle = () => {
    playClickSound();
    setIsMenuOpen(!isMenuOpen);
  };

  const isSecondaryActive = activeTab === 'backlog' || activeTab === 'stats' || activeTab === 'links';

  return (
    <>
      {/* Telegram-style Smooth Blur + Gradient Backdrop */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none h-28 select-none"
        style={{
          background: 'linear-gradient(to top, rgba(250, 247, 242, 0.96) 0%, rgba(250, 247, 242, 0.8) 55%, rgba(250, 247, 242, 0) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage: 'linear-gradient(to top, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0) 100%)',
        }}
      />

      {/* Secondary Menu Popup Sheet */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end p-4 bg-[#18181B]/40 backdrop-blur-xs select-none animate-in fade-in duration-150 font-body"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="w-full max-w-sm mx-auto bg-white border-[2px] border-[#18181B] rounded-[2rem] shadow-[4px_4px_0px_#18181B] p-4 space-y-3 mb-16 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#18181B]/15 px-1">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-purple-900 stroke-[2.5]" />
                <span className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                  More Features & Archive
                </span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Backlog */}
              <button
                onClick={() => handleTabClick('backlog')}
                className={`p-3 rounded-2xl border-[1.75px] flex flex-col items-start gap-2 transition-all cursor-pointer text-left ${
                  activeTab === 'backlog'
                    ? 'bg-[#E8DCFF] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-[#FAF7F2] border-slate-200 hover:border-[#18181B]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs">
                  <Inbox className="w-4 h-4 text-purple-900" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#18181B]">Backlog</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Pending ideas</p>
                </div>
              </button>

              {/* Stats & Heatmap */}
              <button
                onClick={() => handleTabClick('stats')}
                className={`p-3 rounded-2xl border-[1.75px] flex flex-col items-start gap-2 transition-all cursor-pointer text-left ${
                  activeTab === 'stats'
                    ? 'bg-[#BAE6FD] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-[#FAF7F2] border-slate-200 hover:border-[#18181B]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs">
                  <BarChart3 className="w-4 h-4 text-sky-900" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#18181B]">Stats</h4>
                  <p className="text-[10px] text-slate-500 font-medium">28d Heatmap</p>
                </div>
              </button>

              {/* Kawaii Hub */}
              <button
                onClick={() => handleTabClick('links')}
                className={`p-3 rounded-2xl border-[1.75px] flex flex-col items-start gap-2 transition-all cursor-pointer text-left ${
                  activeTab === 'links'
                    ? 'bg-[#FCE7F3] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-[#FAF7F2] border-slate-200 hover:border-[#18181B]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs">
                  <Compass className="w-4 h-4 text-pink-900" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#18181B]">Kawaii Hub</h4>
                  <p className="text-[10px] text-slate-500 font-medium">TV, Manga, Wiki</p>
                </div>
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  playClickSound();
                  setIsMenuOpen(false);
                  onOpenSettings();
                }}
                className="p-3 rounded-2xl bg-[#FAF7F2] hover:bg-amber-50 border-[1.75px] border-slate-200 hover:border-[#18181B] flex flex-col items-start gap-2 transition-all cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs">
                  <Settings className="w-4 h-4 text-amber-900" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#18181B]">Settings</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Keys & Profile</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating 5-Item Neo-Brutalist Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)+14px)] px-3 select-none">
        <nav className="w-full max-w-md bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.06),2px_2px_0px_#18181B] p-1 flex items-center justify-between pointer-events-auto font-body gap-1">
          
          {/* 1. Today Priorities */}
          <button
            onClick={() => handleTabClick('priorities')}
            className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'priorities'
                ? 'bg-[#FFE873] border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                : 'hover:bg-slate-50 border-[1.5px] border-transparent text-slate-500'
            }`}
          >
            <CheckSquare
              className={`w-4 h-4 stroke-[2] ${
                activeTab === 'priorities' ? 'text-[#18181B]' : 'text-slate-500'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'priorities' ? 'font-bold text-[#18181B]' : 'font-medium text-slate-500'
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
                ? 'bg-[#D1FBE4] border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                : 'hover:bg-slate-50 border-[1.5px] border-transparent text-slate-500'
            }`}
          >
            <Zap
              className={`w-4 h-4 stroke-[2] ${
                activeTab === 'habits' ? 'text-[#18181B]' : 'text-slate-500'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'habits' ? 'font-bold text-[#18181B]' : 'font-medium text-slate-500'
              }`}
            >
              Habits
            </span>
          </button>

          {/* 3. Sumire Companion (Center Action Button) */}
          <button
            onClick={() => {
              playClickSound();
              onOpenCompanion();
            }}
            className="flex-1 py-1 px-1 rounded-xl bg-[#E8DCFF] hover:bg-[#D8C4FF] border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B] flex flex-col items-center justify-center transition-all cursor-pointer active:translate-y-0.5"
            title="Sumire Companion"
          >
            <div className="w-5 h-5 rounded-lg overflow-hidden border border-[#18181B] shrink-0">
              <img src="/sumire-avatar.png" alt="Sumire" className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] mt-0.5 font-bold text-[#18181B] tracking-tight leading-none">
              Sumire
            </span>
          </button>

          {/* 4. Focus Timer */}
          <button
            onClick={() => handleTabClick('focus')}
            className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'focus'
                ? 'bg-[#FED7AA] border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                : 'hover:bg-slate-50 border-[1.5px] border-transparent text-slate-500'
            }`}
          >
            <Timer
              className={`w-4 h-4 stroke-[2] ${
                activeTab === 'focus' ? 'text-[#18181B]' : 'text-slate-500'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'focus' ? 'font-bold text-[#18181B]' : 'font-medium text-slate-500'
              }`}
            >
              Focus
            </span>
          </button>

          {/* 5. Menu Drawer Toggle */}
          <button
            onClick={handleMenuToggle}
            className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              isMenuOpen || isSecondaryActive
                ? 'bg-[#BAE6FD] border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                : 'hover:bg-slate-50 border-[1.5px] border-transparent text-slate-500'
            }`}
          >
            <LayoutGrid
              className={`w-4 h-4 stroke-[2] ${
                isMenuOpen || isSecondaryActive ? 'text-[#18181B]' : 'text-slate-500'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                isMenuOpen || isSecondaryActive ? 'font-bold text-[#18181B]' : 'font-medium text-slate-500'
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
