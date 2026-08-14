import React from 'react';
import { Compass, Inbox, Link2, Timer, BarChart3 } from 'lucide-react';
import { playClickSound } from '../../lib/sound';

export type TabView = 'priorities' | 'backlog' | 'links' | 'focus' | 'stats' | 'habits';

interface BottomNavProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
  onOpenSettings?: () => void;
}

interface NavItem {
  id: TabView;
  label: string;
  icon: React.ElementType;
  bubbleBg: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'priorities', label: 'Themes', icon: Compass, bubbleBg: '#C084FC' },
  { id: 'backlog', label: 'Posts', icon: Inbox, bubbleBg: '#FFDE59' },
  { id: 'links', label: 'Links', icon: Link2, bubbleBg: '#FF844B' },
  { id: 'focus', label: 'Focus', icon: Timer, bubbleBg: '#BEF264' },
  { id: 'stats', label: 'Stats', icon: BarChart3, bubbleBg: '#38BDF8' },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
}) => {
  const handleTabClick = (id: TabView) => {
    playClickSound();
    onChangeTab(id);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-2 px-3 sm:pb-4">
      {/* Floating Neo-Brutalist Dock with Solid Offset Shadow */}
      <nav className="w-full max-w-md bg-white/95 backdrop-blur-xl border-2 border-black rounded-[2.5rem] shadow-[0_16px_35px_rgba(0,0,0,0.1),3px_3px_0px_#000000] px-3 pt-3.5 pb-2.5 flex items-center justify-around pointer-events-auto select-none font-body">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className="flex flex-col items-center justify-center group cursor-pointer transition-transform active:scale-90"
            >
              {/* Circular Icon Bubble with High-Contrast Solid Shadows */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 border-2 ${
                  isActive
                    ? 'border-black shadow-[2.5px_2.5px_0px_#000000] scale-105'
                    : 'bg-[#FAF6EE] border-black/20 group-hover:border-black group-hover:bg-slate-50'
                }`}
                style={{
                  backgroundColor: isActive ? item.bubbleBg : undefined,
                }}
              >
                <Icon
                  className={`w-5 h-5 stroke-[2.25] transition-transform ${
                    isActive ? 'text-black scale-105' : 'text-slate-600 group-hover:text-black'
                  }`}
                />
              </div>

              {/* Label underneath */}
              <span
                className={`text-[11px] mt-1.5 tracking-tight leading-none transition-colors ${
                  isActive
                    ? 'font-black text-black'
                    : 'font-bold text-slate-500 group-hover:text-black'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
