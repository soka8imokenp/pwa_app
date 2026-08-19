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
  MessageSquareText,
  ChevronRight,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';

export type TabView = 'priorities' | 'backlog' | 'habits' | 'sumire' | 'focus' | 'stats' | 'links';

interface BottomNavProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  onOpenSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
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

      {/* Seamless Neo-Brutalist Bottom Sheet Menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end p-3 sm:p-4 bg-[#18181B]/40 backdrop-blur-xs select-none animate-in fade-in duration-150 font-body"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="w-full max-w-md mx-auto bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-3 mb-16 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#18181B]/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#BAE6FD] border border-[#18181B] flex items-center justify-center shadow-2xs">
                  <LayoutGrid className="w-4 h-4 text-[#18181B] stroke-[2.25]" />
                </div>
                <div>
                  <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                    Archive & Features
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400">
                    Additional tools and portal links
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-7 h-7 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs active:scale-95"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Polished Menu Rows */}
            <div className="space-y-2 pt-1">
              {/* Backlog */}
              <button
                onClick={() => handleTabClick('backlog')}
                className={`w-full p-3 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
                  activeTab === 'backlog'
                    ? 'bg-[#E8DCFF] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-[#FAF7F2] hover:bg-slate-100 border-slate-200 hover:border-[#18181B]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                    <Inbox className="w-4 h-4 text-purple-900 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#18181B]">Backlog</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Unfinished tasks & raw ideas</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Stats */}
              <button
                onClick={() => handleTabClick('stats')}
                className={`w-full p-3 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
                  activeTab === 'stats'
                    ? 'bg-[#BAE6FD] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-[#FAF7F2] hover:bg-slate-100 border-slate-200 hover:border-[#18181B]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                    <BarChart3 className="w-4 h-4 text-sky-900 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#18181B]">Productivity Stats</h4>
                    <p className="text-[10px] text-slate-500 font-medium">28-day heatmap & deep work</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Kawaii Hub */}
              <button
                onClick={() => handleTabClick('links')}
                className={`w-full p-3 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
                  activeTab === 'links'
                    ? 'bg-[#FCE7F3] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                    : 'bg-[#FAF7F2] hover:bg-slate-100 border-slate-200 hover:border-[#18181B]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                    <Compass className="w-4 h-4 text-pink-900 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#18181B]">Kawaii Ecosystem Hub</h4>
                    <p className="text-[10px] text-slate-500 font-medium">TV, Manga, Anime & Bot</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  playClickSound();
                  setIsMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full p-3 rounded-2xl bg-[#FAF7F2] hover:bg-amber-50 border-[1.75px] border-slate-200 hover:border-[#18181B] flex items-center justify-between transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                    <Settings className="w-4 h-4 text-amber-900 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#18181B]">Settings</h4>
                    <p className="text-[10px] text-slate-500 font-medium">API Keys, Theme colors & Backup</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Symmetrical 5-Item Neo-Brutalist Dock */}
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

          {/* 3. Sumire Companion (Standard Tab) */}
          <button
            onClick={() => handleTabClick('sumire')}
            className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'sumire'
                ? 'bg-[#E8DCFF] border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                : 'hover:bg-slate-50 border-[1.5px] border-transparent text-slate-500'
            }`}
            title="Sumire Companion"
          >
            <MessageSquareText
              className={`w-4 h-4 stroke-[2] ${
                activeTab === 'sumire' ? 'text-[#18181B]' : 'text-slate-500'
              }`}
            />
            <span
              className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                activeTab === 'sumire' ? 'font-bold text-[#18181B]' : 'font-medium text-slate-500'
              }`}
            >
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
