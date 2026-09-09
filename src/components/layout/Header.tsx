import React, { useState, useEffect } from 'react';
import { Flame, Settings, CheckSquare, Apple } from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import { getAvatarById } from '../../data/avatars';
import { useTranslation } from '../../i18n/LanguageContext';

interface HeaderProps {
  streakCount: number;
  userName?: string;
  appMode?: 'planner' | 'health';
  onChangeAppMode?: (mode: 'planner' | 'health') => void;
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
  onOpenStreak?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  streakCount,
  userName = 'Alex',
  appMode = 'planner',
  onChangeAppMode,
  onOpenSettings,
  onOpenProfile,
  onOpenStreak,
}) => {
  const { t } = useTranslation();
  const [avatarId, setAvatarId] = useState<string>('sumire-scout');

  useEffect(() => {
    const updateAvatar = () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('kairo_selected_avatar');
        if (saved) setAvatarId(saved);
      }
    };
    updateAvatar();
    window.addEventListener('storage', updateAvatar);
    return () => window.removeEventListener('storage', updateAvatar);
  }, []);

  const activeAvatar = getAvatarById(avatarId);
  const firstName = userName.split(' ')[0] || 'Friend';

  return (
    <header className="w-full bg-transparent pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-1 px-1 select-none font-body space-y-2">
      <div className="flex items-center justify-between gap-3">
        {/* Left: User Profile & Greeting */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              playClickSound();
              if (onOpenProfile) {
                onOpenProfile();
              } else {
                onOpenSettings();
              }
            }}
            className="w-10 h-10 rounded-2xl border-[1.75px] border-[#24201D] flex items-center justify-center shadow-[2px_2px_0px_#24201D] shrink-0 cursor-pointer active:translate-y-0.5 active:shadow-none transition-all p-0.5 group hover:scale-105"
            style={{ backgroundColor: activeAvatar.bg }}
            title={t('header.profileTooltip')}
          >
            {activeAvatar.renderSvg('w-full h-full')}
          </button>

          <div>
            <span className="text-[10px] font-bold text-[#6B635B] uppercase tracking-wider block leading-none font-display">
              {appMode === 'health' ? t('header.healthTitle') : t('header.plannerTitle')}
            </span>
            <h1 className="text-sm font-bold font-display text-[#24201D] tracking-tight leading-tight mt-0.5">
              {t('header.greeting', { name: firstName })}
            </h1>
          </div>
        </div>

        {/* Right: Streak & Settings */}
        <div className="flex items-center gap-2">
          {/* Flame Streak Pill */}
          <button
            onClick={() => {
              playClickSound();
              if (onOpenStreak) onOpenStreak();
            }}
            title={streakCount > 0 ? t('header.streakTitle', { count: streakCount }) : t('header.streakStart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-[1.75px] border-[#24201D] rounded-full shadow-[1.5px_1.5px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all ${
              streakCount > 0
                ? 'bg-[#F0BB58] hover:bg-[#E5A943]'
                : 'bg-[#F4F0EA] hover:bg-stone-200'
            }`}
          >
            <Flame
              className={`w-3.5 h-3.5 stroke-[2] ${
                streakCount > 0
                  ? 'text-[#8A4B12] fill-[#D97706]'
                  : 'text-stone-400 fill-stone-300'
              }`}
            />
            <span className="text-xs font-bold font-display text-[#24201D] font-mono-num">
              {streakCount}d
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              playClickSound();
              onOpenSettings();
            }}
            title={t('header.settingsTooltip')}
            className="w-8.5 h-8.5 rounded-xl bg-[#F8F5EE] hover:bg-[#F2ECE0] border-[1.75px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-[1.5px_1.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer group"
          >
            <Settings className="w-4 h-4 text-[#24201D] stroke-[2.25] group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Mode Switcher Pill */}
      {onChangeAppMode && (
        <div className="flex items-center justify-center pt-0.5">
          <div className="p-1 bg-white/90 backdrop-blur-sm border-[1.75px] border-[#24201D] rounded-2xl shadow-[1.5px_1.5px_0px_#24201D] flex items-center gap-1 w-full max-w-sm">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onChangeAppMode('planner');
              }}
              className={`flex-1 py-1 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer font-display uppercase tracking-wider ${
                appMode === 'planner'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{t('header.plannerMode')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                onChangeAppMode('health');
              }}
              className={`flex-1 py-1 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer font-display uppercase tracking-wider ${
                appMode === 'health'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>{t('header.healthMode')}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
