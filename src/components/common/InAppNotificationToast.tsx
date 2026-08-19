import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  ArrowRight,
  Zap,
  CheckCircle2,
  Flame,
  Target,
  Clock,
} from 'lucide-react';
import {
  subscribeInAppNotifications,
  NotificationPayload,
} from '../../lib/notifications';
import { playSuccessChime, playClickSound } from '../../lib/sound';
import type { TabView } from '../layout/BottomNav';

interface InAppNotificationToastProps {
  onNavigate: (tab: TabView, extra?: any) => void;
}

export const InAppNotificationToast: React.FC<InAppNotificationToastProps> = ({
  onNavigate,
}) => {
  const [currentNotification, setCurrentNotification] = useState<NotificationPayload | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeInAppNotifications((payload) => {
      setCurrentNotification(payload);
      playSuccessChime();
    });

    return () => unsubscribe();
  }, []);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!currentNotification) return;

    const timer = setTimeout(() => {
      setCurrentNotification(null);
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentNotification]);

  if (!currentNotification) return null;

  const handleToastClick = () => {
    playClickSound();
    if (currentNotification.extra?.tab) {
      onNavigate(currentNotification.extra.tab, currentNotification.extra);
    }
    setCurrentNotification(null);
  };

  const getIconForTab = (tab?: TabView) => {
    switch (tab) {
      case 'focus':
        return <Zap className="w-4 h-4 text-amber-950 stroke-[2.25]" />;
      case 'habits':
        return <Flame className="w-4 h-4 text-emerald-950 stroke-[2.25]" />;
      case 'priorities':
      case 'backlog':
        return <Target className="w-4 h-4 text-purple-950 stroke-[2.25]" />;
      default:
        return <Bell className="w-4 h-4 text-[#18181B] stroke-[2.25]" />;
    }
  };

  const getBadgeColor = (tab?: TabView) => {
    switch (tab) {
      case 'focus':
        return 'bg-[#FFE873]';
      case 'habits':
        return 'bg-[#D1FBE4]';
      case 'priorities':
        return 'bg-[#E8DCFF]';
      default:
        return 'bg-[#BAE6FD]';
    }
  };

  return (
    <div className="fixed top-4 left-3 right-3 sm:left-6 sm:right-6 z-[120] max-w-md mx-auto select-none font-body pointer-events-auto animate-in slide-in-from-top duration-250">
      <div
        onClick={handleToastClick}
        className="w-full p-3.5 bg-white border-[2px] border-[#18181B] rounded-2xl shadow-[4px_4px_0px_#18181B] flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 active:translate-y-0.5 transition-all"
      >
        {/* Left Icon Badge */}
        <div
          className={`w-9 h-9 rounded-xl border-[1.5px] border-[#18181B] flex items-center justify-center shrink-0 shadow-2xs ${getBadgeColor(
            currentNotification.extra?.tab
          )}`}
        >
          {getIconForTab(currentNotification.extra?.tab)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-black font-display text-[#18181B] truncate">
              {currentNotification.title}
            </h4>
            <span className="px-1.5 py-0.2 bg-[#FAF7F2] border border-[#18181B]/20 text-[8px] font-bold text-slate-500 rounded-md">
              Tap to open
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
            {currentNotification.body}
          </p>
        </div>

        {/* Right Arrow & Close Button */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] border border-[#18181B] flex items-center justify-center text-[#18181B]">
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentNotification(null);
            }}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-[#18181B] cursor-pointer"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
