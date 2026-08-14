import React from 'react';
import { Play, Pause, RotateCcw, Minimize2, Volume2, VolumeX, Headphones, Target, Check } from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import { AmbientSoundType } from '../../lib/ambientSound';

interface ZenFullscreenTimerProps {
  isOpen: boolean;
  onClose: () => void;
  formattedTime: string;
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onComplete: () => void;
  taskTitle?: string;
  activeSound: AmbientSoundType;
  onToggleSound: (sound: AmbientSoundType) => void;
  mode: string;
}

export const ZenFullscreenTimer: React.FC<ZenFullscreenTimerProps> = ({
  isOpen,
  onClose,
  formattedTime,
  isRunning,
  onTogglePlay,
  onReset,
  onComplete,
  taskTitle,
  activeSound,
  onToggleSound,
  mode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF7F2] flex flex-col justify-between p-6 sm:p-10 select-none font-body animate-in fade-in duration-200">
      
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#BEF264] border-[1.5px] border-[#18181B] flex items-center justify-center text-xs font-black">
            ⚡
          </div>
          <span className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
            Zen Desk Stand Mode
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Ambient Sound Chips */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 bg-white border border-[#18181B] rounded-full shadow-2xs">
            {(['none', 'rain', 'waves', 'binaural', 'whitenoise'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  playClickSound();
                  onToggleSound(s);
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                  activeSound === s
                    ? 'bg-[#BEF264] text-[#18181B] border border-[#18181B]'
                    : 'text-slate-500 hover:text-[#18181B]'
                }`}
              >
                {s === 'none' ? 'Mute' : s}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-11 h-11 rounded-full bg-white hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[2px_2px_0px_#18181B] cursor-pointer active:scale-95"
            title="Exit Zen Mode"
          >
            <Minimize2 className="w-5 h-5 stroke-[2.25]" />
          </button>
        </div>
      </div>

      {/* Giant Clock Center */}
      <div className="text-center my-auto space-y-4">
        {taskTitle && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E9D5FF] border-[1.75px] border-[#18181B] rounded-full shadow-2xs">
            <Target className="w-4 h-4 text-purple-950 stroke-[2.5]" />
            <span className="text-sm font-black text-[#18181B] truncate max-w-sm">
              {taskTitle}
            </span>
          </div>
        )}

        <div className="relative inline-block">
          <h1 className="text-7xl sm:text-9xl font-black font-mono-num tracking-tighter text-[#18181B] drop-shadow-[4px_4px_0px_rgba(24,24,27,0.15)]">
            {formattedTime}
          </h1>
          <span className="text-xs font-black uppercase tracking-widest text-purple-800 bg-[#FEF08A] px-3 py-0.5 rounded-full border border-[#18181B] mt-2 inline-block">
            {isRunning ? 'Flow Active' : 'Paused'} • {mode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-4 max-w-sm mx-auto w-full">
        <button
          onClick={onTogglePlay}
          className={`flex-1 py-4 rounded-full border-[2px] border-[#18181B] font-black font-display text-sm uppercase tracking-wider shadow-[3px_3px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            isRunning ? 'bg-[#FEF08A] text-[#18181B]' : 'bg-[#BEF264] text-[#18181B]'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5 fill-current stroke-[2.25]" />
              <span>Pause Session</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current stroke-[2.25]" />
              <span>Resume Flow</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          title="Reset"
          className="w-14 h-14 rounded-full bg-white hover:bg-slate-100 border-[2px] border-[#18181B] flex items-center justify-center text-slate-700 shadow-[3px_3px_0px_#18181B] active:translate-y-0.5 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-5 h-5 stroke-[2.5]" />
        </button>

        <button
          onClick={onComplete}
          title="Complete & Log"
          className="w-14 h-14 rounded-full bg-[#E9D5FF] hover:bg-[#D8B4FE] border-[2px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[3px_3px_0px_#18181B] active:translate-y-0.5 cursor-pointer shrink-0"
        >
          <Check className="w-5 h-5 stroke-[3]" />
        </button>
      </div>

    </div>
  );
};
