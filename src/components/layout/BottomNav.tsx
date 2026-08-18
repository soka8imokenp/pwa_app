import React from 'react';
import { CheckSquare, Inbox, Zap, Timer, BarChart3, Link2 } from 'lucide-react';
import { playClickSound } from '../../lib/sound';

export type TabView = 'priorities' | 'backlog' | 'habits' | 'focus' | 'stats' | 'links';

interface BottomNavProps {
  activeTab: TabView;
  onChangeTab: (tab: TabView) => void;
}

interface NavItem {
  id: TabView;
  label: string;
  icon: React.ElementType;
  activeBg: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'priorities', label: 'Today', icon: CheckSquare, activeBg: '#FFE873' },
  { id: 'backlog', label: 'Backlog', icon: Inbox, activeBg: '#E8DCFF' },
  { id: 'habits', label: 'Habits', icon: Zap, activeBg: '#D1FBE4' },
  { id: 'focus', label: 'Focus', icon: Timer, activeBg: '#FED7AA' },
  { id: 'stats', label: 'Stats', icon: BarChart3, activeBg: '#BAE6FD' },
  { id: 'links', label: 'Links', icon: Link2, activeBg: '#FCE7F3' },
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
    <>
      {/* Telegram-style Smooth Blur + Gradient Backdrop (Blurs & fades scrolling items underneath) */}
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

      {/* Floating Sleek Neo-Brutalist Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)+16px)] px-3 select-none">
        <nav className="w-full max-w-lg bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.06),2px_2px_0px_#18181B] p-1.5 flex items-center justify-between pointer-events-auto font-body">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex-1 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                    : 'hover:bg-slate-50 border-[1.5px] border-transparent text-slate-500'
                }`}
                style={{
                  backgroundColor: isActive ? item.activeBg : 'transparent',
                }}
              >
                <Icon
                  className={`w-4 h-4 stroke-[2] ${
                    isActive ? 'text-[#18181B]' : 'text-slate-500'
                  }`}
                />
                <span
                  className={`text-[10px] mt-0.5 tracking-tight leading-none ${
                    isActive ? 'font-bold text-[#18181B]' : 'font-medium text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
