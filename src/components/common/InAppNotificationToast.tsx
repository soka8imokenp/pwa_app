import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  ArrowRight,
  Zap,
  CheckCircle2,
  Flame,
  Target,
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
        return <Zap className="w-4 h-4 text-[#18181B] stroke-[2.5]" />;
      case 'habits':
        return <Flame className="w-4 h-4 text-[#18181B] stroke-[2.5]" />;
      case 'priorities':
      case 'backlog':
        return <Target className="w-4 h-4 text-[#18181B] stroke-[2.5]" />;
      default:
        return <Bell className="w-4 h-4 text-[#18181B] stroke-[2.5]" />;
    }
  };

  return (
    <div className="fixed top-4 left-3 right-3 sm:left-6 sm:right-6 z-[120] max-w-md mx-auto select-none font-body pointer-events-auto animate-in slide-in-from-top duration-250">
      <div
        onClick={handleToastClick}
        className="w-full p-3.5 bg-gradient-to-r from-[#FFE873] via-[#FED7AA] to-[#E8DCFF] border-[2px] border-[#18181B] rounded-2xl shadow-[4px_4px_0px_#18181B] flex items-center justify-between gap-3 cursor-pointer hover:opacity-95 active:translate-y-0.5 transition-all text-[#18181B]"
      >
        {/* Left Icon Badge */}
        <div className="w-10 h-10 rounded-xl border-[1.75px] border-[#18181B] bg-white flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_#18181B]">
          {getIconForTab(currentNotification.extra?.tab)}
        </div>

        {/* Content in Bold Solid Black Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-black font-display text-[#18181B] uppercase tracking-wider truncate">
              {currentNotification.title}
            </h4>
            <span className="px-2 py-0.5 bg-white border border-[#18181B] text-[8px] font-black text-[#18181B] rounded-md shadow-2xs">
              Tap to open
            </span>
          </div>
          <p className="text-[11px] font-extrabold text-[#18181B] truncate mt-0.5">
            {currentNotification.body}
          </p>
        </div>

        {/* Right Arrow & Close Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-white border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs">
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentNotification(null);
            }}
            className="w-8 h-8 rounded-xl bg-white/70 hover:bg-white border border-[#18181B] flex items-center justify-center text-[#18181B] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
