import React, { useState, useEffect } from 'react';
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
  Flower2,
  User,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import { getAvatarById } from '../../data/avatars';
import type { TabView } from '../layout/BottomNav';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabView;
  onSelectTab: (tab: TabView) => void;
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
  onOpenSumire?: () => void;
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
  onOpenProfile,
  onOpenSumire,
  onOpenEveningReview,
  onOpenWeeklyInfographic,
  onOpenCalendarExport,
  onLockApp,
}) => {
  const [avatarId, setAvatarId] = useState<string>('sumire-scout');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAvatar = localStorage.getItem('kairo_selected_avatar');
      if (savedAvatar) setAvatarId(savedAvatar);
      const savedUser = localStorage.getItem('kairo_user_name');
      if (savedUser) setUserName(savedUser);
    }
  }, [isOpen]);

  const activeAvatar = getAvatarById(avatarId);

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
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DDE8DE] border-[1.5px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <LayoutGrid className="w-4.5 h-4.5 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Features & Archive
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Tools, Analytics & Integrations
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#F4F0EA] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Featured: Sumire Companion */}
        {onOpenSumire && (
          <button
            onClick={() => {
              playClickSound();
              onClose();
              onOpenSumire();
            }}
            className="w-full p-3.5 rounded-2xl bg-[#DDE8DE] hover:bg-[#C9DCCB] border-[1.75px] border-[#24201D] flex items-center justify-between transition-all cursor-pointer text-left shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3D6B52] text-white border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                <Flower2 className="w-5 h-5 text-[#FBECCF] stroke-[2.25]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black text-[#2D503C] font-display uppercase tracking-wide">
                    Sumire Companion
                  </h4>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3D6B52]" />
                </div>
                <p className="text-[10px] text-[#2D503C]/80 font-medium">
                  Goal breakdown, reflections & mindful coaching
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#2D503C] group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* User Profile & Account Entry */}
        {onOpenProfile && (
          <button
            onClick={() => {
              playClickSound();
              onClose();
              onOpenProfile();
            }}
            className="w-full p-3.5 rounded-2xl bg-[#F4EFFC] hover:bg-[#EAE2F7] border-[1.75px] border-[#24201D] flex items-center justify-between transition-all cursor-pointer text-left shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 group"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0 p-0.5 group-hover:scale-105 transition-transform"
                style={{ backgroundColor: activeAvatar.bg }}
              >
                {activeAvatar.renderSvg('w-full h-full')}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-[#382B5C] font-display uppercase tracking-wide truncate">
                  User Profile
                </h4>
                <p className="text-[10px] text-[#55437E] font-medium truncate">
                  {userName || 'Identity, mascot avatar & account data'}
                </p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-lg bg-white border border-[#24201D]/20 flex items-center justify-center text-[#4E3982] shadow-2xs group-hover:translate-x-0.5 transition-transform shrink-0">
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </button>
        )}

        {/* Section 1: Views & Hubs */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block px-1">
            Views & Workload
          </span>

          {/* Backlog */}
          <button
            onClick={() => handleTabClick('backlog')}
            className={`w-full p-3 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
              activeTab === 'backlog'
                ? 'bg-[#DDE8DE] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                : 'bg-[#F4F0EA] hover:bg-[#E8EFE9] border-stone-200 hover:border-[#24201D] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                <Inbox className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#24201D]">Task Backlog</h4>
                <p className="text-[10px] text-[#6B635B] font-medium">Idea pool & postponed tasks</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>

          {/* Stats */}
          <button
            onClick={() => handleTabClick('stats')}
            className={`w-full p-3 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
              activeTab === 'stats'
                ? 'bg-[#DEE8EF] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                : 'bg-[#F4F0EA] hover:bg-[#E4EEF5] border-stone-200 hover:border-[#24201D] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                <BarChart3 className="w-4 h-4 text-[#2A495E] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#24201D]">Productivity Stats</h4>
                <p className="text-[10px] text-[#6B635B] font-medium">Heatmaps & focus distribution</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>

          {/* Kawaii Hub */}
          <button
            onClick={() => handleTabClick('links')}
            className={`w-full p-3 rounded-2xl border-[1.75px] flex items-center justify-between transition-all cursor-pointer text-left ${
              activeTab === 'links'
                ? 'bg-[#F7E3DC] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                : 'bg-[#F4F0EA] hover:bg-[#FAF0EC] border-stone-200 hover:border-[#24201D] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
                <Compass className="w-4 h-4 text-[#C25E40] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#24201D]">Ecosystem Hub</h4>
                <p className="text-[10px] text-[#6B635B] font-medium">TV, Manga, Anime & Tools</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Section 2: Actions & Tools */}
        <div className="space-y-2 pt-1">
          <div className="px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B]">
              Tools & Export
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Weekly Infographic Card */}
            {onOpenWeeklyInfographic && (
              <button
                onClick={() => {
                  playClickSound();
                  onClose();
                  onOpenWeeklyInfographic();
                }}
                className="p-3.5 rounded-2xl bg-[#DDE8DE] hover:bg-[#C9DCCB] border-[1.75px] border-[#24201D] flex flex-col justify-between transition-all cursor-pointer text-left shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 group min-h-[110px]"
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform mb-2">
                  <Share2 className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#2D503C] font-display uppercase tracking-wide">
                    Weekly Card
                  </h4>
                  <p className="text-[10px] text-[#2D503C]/80 font-medium leading-tight mt-0.5">
                    Infographic digest & XP stats
                  </p>
                </div>
              </button>
            )}

            {/* Calendar Export Card */}
            {onOpenCalendarExport && (
              <button
                onClick={() => {
                  playClickSound();
                  onClose();
                  onOpenCalendarExport();
                }}
                className="p-3.5 rounded-2xl bg-[#FBECCF] hover:bg-[#F7E2BB] border-[1.75px] border-[#24201D] flex flex-col justify-between transition-all cursor-pointer text-left shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 group min-h-[110px]"
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform mb-2">
                  <Calendar className="w-4 h-4 text-[#854D0E] stroke-[2.25]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#854D0E] font-display uppercase tracking-wide">
                    Calendar Export
                  </h4>
                  <p className="text-[10px] text-[#854D0E]/80 font-medium leading-tight mt-0.5">
                    Sync schedule to external apps
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Settings */}
          <button
            onClick={handleSettingsClick}
            className="w-full p-3.5 rounded-2xl bg-[#F8F5EE] hover:bg-[#F2ECE0] border-[1.75px] border-[#24201D] flex items-center justify-between transition-all cursor-pointer text-left shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 mt-2 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#24201D] text-white border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0 group-hover:rotate-45 transition-transform duration-300">
                <Settings className="w-5 h-5 text-[#F0BB58] stroke-[2.25]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-[#24201D] font-display uppercase tracking-wide">
                  Settings
                </h4>
                <p className="text-[10px] text-[#6B635B] font-medium">Sound, Security, AI & Backup</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-lg bg-white border border-[#24201D]/20 flex items-center justify-center text-[#24201D] shadow-2xs group-hover:translate-x-0.5 transition-transform shrink-0">
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};
