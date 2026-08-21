import React from 'react';
import {
  X,
  LayoutGrid,
  Inbox,
  BarChart3,
  Compass,
  Settings,
  ChevronRight,
  Moon,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import type { TabView } from '../layout/BottomNav';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabView;
  onSelectTab: (tab: TabView) => void;
  onOpenSettings: () => void;
  onOpenEveningReview?: () => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenEveningReview,
}) => {
  if (!isOpen) return null;

  const handleTabClick = (tab: TabView) => {
    playClickSound();
    onSelectTab(tab);
    onClose();
  };

  const handleSettingsClick = () => {
    playClickSound();
    onClose();
    onOpenSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#BAE6FD] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs">
              <LayoutGrid className="w-5 h-5 text-sky-950 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display text-[#18181B]">
                Archive & Features
              </h3>
              <p className="text-[10px] font-bold text-slate-400">
                Additional tools and ecosystem portals
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-slate-700 hover:text-[#18181B] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Section 1: Planner & Archive */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
            Archive & Workload
          </span>

          {/* Backlog */}
          <button
            onClick={() => handleTabClick('backlog')}
            className={`w-full p-3.5 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
              activeTab === 'backlog'
                ? 'bg-[#E8DCFF] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                : 'bg-[#FAF7F2] hover:bg-purple-50/50 border-slate-200 hover:border-[#18181B] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                <Inbox className="w-4 h-4 text-purple-950 stroke-[2.25]" />
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
            className={`w-full p-3.5 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
              activeTab === 'stats'
                ? 'bg-[#BAE6FD] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                : 'bg-[#FAF7F2] hover:bg-sky-50/50 border-slate-200 hover:border-[#18181B] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                <BarChart3 className="w-4 h-4 text-sky-950 stroke-[2.25]" />
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
            className={`w-full p-3.5 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
              activeTab === 'links'
                ? 'bg-[#FCE7F3] border-[#18181B] shadow-[2px_2px_0px_#18181B]'
                : 'bg-[#FAF7F2] hover:bg-pink-50/50 border-slate-200 hover:border-[#18181B] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                <Compass className="w-4 h-4 text-pink-950 stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#18181B]">Kawaii Ecosystem Hub</h4>
                <p className="text-[10px] text-slate-500 font-medium">TV, Manga, Anime & Bot</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Section 2: Preferences */}
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
            Preferences
          </span>

          {/* Evening Debrief */}
          {onOpenEveningReview && (
            <button
              onClick={() => {
                playClickSound();
                onClose();
                onOpenEveningReview();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#FEFCE8] hover:bg-amber-100/60 border-[1.75px] border-[#18181B] flex items-center justify-between transition-all cursor-pointer text-left shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FEF08A] border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                  <Moon className="w-4 h-4 text-amber-950 stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#18181B]">Evening Debrief</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Daily wrap-up, score & rollover</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={handleSettingsClick}
            className="w-full p-3.5 rounded-2xl bg-[#FAF7F2] hover:bg-amber-50 border-[1.75px] border-slate-200 hover:border-[#18181B] flex items-center justify-between transition-all cursor-pointer text-left shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFE873] border border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
                <Settings className="w-4 h-4 text-amber-950 stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#18181B]">Settings</h4>
                <p className="text-[10px] text-slate-500 font-medium">API Keys, Accents & Backup</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

      </div>
    </div>
  );
};
