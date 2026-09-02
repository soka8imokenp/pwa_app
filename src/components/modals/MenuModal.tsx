import React from 'react';
import {
  X,
  LayoutGrid,
  Inbox,
  BarChart3,
  Compass,
  Settings,
  ChevronRight,
  Share2,
  Calendar,
  Lock,
  Moon,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import { isPinSet } from '../../lib/securityService';
import type { TabView } from '../layout/BottomNav';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabView;
  onSelectTab: (tab: TabView) => void;
  onOpenSettings: () => void;
  onOpenEveningReview?: () => void;
  onOpenWeeklyInfographic?: () => void;
  onOpenCalendarExport?: () => void;
  onLockApp?: () => void;
}

export const MenuModal: React.FC<MenuModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenSettings,
  onOpenEveningReview,
  onOpenWeeklyInfographic,
  onOpenCalendarExport,
  onLockApp,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#DEE8EF] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <LayoutGrid className="w-5 h-5 text-[#2A495E] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display text-[#24201D]">
                Archive & Features
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Additional tools and ecosystem portals
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-stone-700 hover:text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Section 1: Planner & Archive */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block px-1">
            Archive & Workload
          </span>

          {/* Backlog */}
          <button
            onClick={() => handleTabClick('backlog')}
            className={`w-full p-3.5 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
              activeTab === 'backlog'
                ? 'bg-[#DDE8DE] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                : 'bg-[#F4F0EA] hover:bg-[#E8EFE9] border-stone-200 hover:border-[#24201D] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                <Inbox className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#24201D]">Backlog</h4>
                <p className="text-[10px] text-[#6B635B] font-medium">Unfinished tasks & raw ideas</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>

          {/* Stats */}
          <button
            onClick={() => handleTabClick('stats')}
            className={`w-full p-3.5 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
              activeTab === 'stats'
                ? 'bg-[#DEE8EF] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                : 'bg-[#F4F0EA] hover:bg-[#E4EEF5] border-stone-200 hover:border-[#24201D] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                <BarChart3 className="w-4 h-4 text-[#2A495E] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#24201D]">Productivity Stats</h4>
                <p className="text-[10px] text-[#6B635B] font-medium">28-day heatmap & deep work</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>

          {/* Kawaii Hub */}
          <button
            onClick={() => handleTabClick('links')}
            className={`w-full p-3.5 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
              activeTab === 'links'
                ? 'bg-[#F7E3DC] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                : 'bg-[#F4F0EA] hover:bg-[#FAF0EC] border-stone-200 hover:border-[#24201D] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                <Compass className="w-4 h-4 text-[#C25E40] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#24201D]">Kawaii Ecosystem Hub</h4>
                <p className="text-[10px] text-[#6B635B] font-medium">TV, Manga, Anime & Bot</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Section 2: Preferences */}
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block px-1">
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
              className="w-full p-3.5 rounded-2xl bg-[#FBECCF] hover:bg-[#F7E2BB] border-[1.75px] border-[#24201D] flex items-center justify-between transition-all cursor-pointer text-left shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F0BB58] border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                  <Moon className="w-4 h-4 text-[#854D0E] stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#24201D]">Evening Debrief</h4>
                  <p className="text-[10px] text-[#6B635B] font-medium">Daily wrap-up, score & rollover</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>
          )}

          {/* Weekly Infographic */}
          {onOpenWeeklyInfographic && (
            <button
              onClick={() => {
                playClickSound();
                onClose();
                onOpenWeeklyInfographic();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#DDE8DE] hover:bg-[#C9DCCB] border-[1.75px] border-[#24201D] flex items-center justify-between transition-all cursor-pointer text-left shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                  <Share2 className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#24201D]">Weekly Infographic</h4>
                  <p className="text-[10px] text-[#6B635B] font-medium">Export & share progress card</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>
          )}

          {/* Calendar Sync & .ics Export */}
          {onOpenCalendarExport && (
            <button
              onClick={() => {
                playClickSound();
                onClose();
                onOpenCalendarExport();
              }}
              className="w-full p-3.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#F4F0EA] border-[1.75px] border-[#24201D] flex items-center justify-between transition-all cursor-pointer text-left shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FBECCF] border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                  <Calendar className="w-4 h-4 text-[#854D0E] stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#24201D]">Экспорт календаря (.ics)</h4>
                  <p className="text-[10px] text-[#6B635B] font-medium">Экспорт расписания и задач в .ics</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </button>
          )}

          {/* Quick Lock App Button (If PIN is set) */}
          {isPinSet() && onLockApp && (
            <button
              onClick={() => {
                playClickSound();
                onClose();
                onLockApp();
              }}
              className="w-full p-3.5 rounded-2xl bg-white hover:bg-stone-100 border-[1.75px] border-[#24201D] flex items-center justify-between transition-all cursor-pointer text-left shadow-2xs group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F7E3DC] border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                  <Lock className="w-4 h-4 text-[#C25E40] stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#24201D]">Lock Application</h4>
                  <p className="text-[10px] text-[#6B635B] font-medium">Instant PIN code security lock</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={handleSettingsClick}
            className="w-full p-3.5 rounded-2xl bg-[#24201D] text-white border-[1.75px] border-[#24201D] flex items-center justify-between transition-all cursor-pointer text-left shadow-[2px_2px_0px_#24201D] active:translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-2xs shrink-0">
                <Settings className="w-4 h-4 text-white stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">App Settings</h4>
                <p className="text-[10px] text-white/70 font-medium">Themes, Sound, Cloud Sync, Backup</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </div>

      </div>
    </div>
  );
};
