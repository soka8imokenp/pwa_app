import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Minimize2, Target, Check, Hourglass, Music2, AlertCircle } from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import { AmbientSoundType } from '../../lib/ambientSound';
import { musicPlayer, MusicPlayerState } from '../../lib/musicPlayerService';

interface ZenFullscreenTimerProps {
  isOpen: boolean;
  onClose: () => void;
  formattedTime: string;
  isRunning: boolean;
  elapsedFocusSeconds?: number;
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
  elapsedFocusSeconds = 0,
  onTogglePlay,
  onReset,
  onComplete,
  taskTitle,
  mode,
}) => {
  const [playerState, setPlayerState] = useState<MusicPlayerState>(() => musicPlayer.getState());
  const [pausedSeconds, setPausedSeconds] = useState(0);

  useEffect(() => {
    const unsubscribe = musicPlayer.subscribe((state) => {
      setPlayerState(state);
    });
    return unsubscribe;
  }, []);

  // Track pause time in RED when paused after starting
  useEffect(() => {
    let pauseInterval: any = null;

    if (!isRunning && elapsedFocusSeconds > 0) {
      pauseInterval = setInterval(() => {
        setPausedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (isRunning) {
      setPausedSeconds(0);
    }

    return () => clearInterval(pauseInterval);
  }, [isRunning, elapsedFocusSeconds]);

  const { currentTrack, isPlaying: isMusicPlaying } = playerState;

  if (!isOpen) return null;

  const formatPauseTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#FAF7F2] flex flex-col justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+28px)] select-none font-body animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-[1.5px_1.5px_0px_#18181B]">
            <Hourglass className="w-4 h-4 text-[#18181B] stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xs font-black font-display uppercase tracking-wider text-[#18181B] block leading-tight">
              Zen Desk Stand Mode
            </span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Sumire Focus Flow
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] cursor-pointer active:scale-95 transition-all"
          title="Exit Zen Mode"
        >
          <Minimize2 className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Giant Clock Center */}
      <div className="text-center my-auto space-y-4">
        {taskTitle && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E8DCFF] border-[1.75px] border-[#18181B] rounded-full shadow-[1.5px_1.5px_0px_#18181B]">
            <Target className="w-4 h-4 text-[#18181B] stroke-[2.5]" />
            <span className="text-xs font-bold text-[#18181B] truncate max-w-xs">
              {taskTitle}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-7xl sm:text-9xl font-extrabold font-display font-mono-num tracking-tight text-[#18181B] drop-shadow-[3px_3px_0px_rgba(24,24,27,0.1)]">
            {formattedTime}
          </h1>

          <div className="flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#18181B] bg-[#FFE873] px-3.5 py-1 rounded-full border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B] inline-block">
              {isRunning ? 'Flow Active' : 'Session Paused'} • {mode.toUpperCase()}
            </span>

            {/* Red Paused Time Counter */}
            {!isRunning && elapsedFocusSeconds > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border-[1.5px] border-rose-500 rounded-full text-xs font-black font-mono-num text-rose-600 shadow-[1px_1px_0px_#E11D48] animate-in fade-in zoom-in-95 duration-150">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Paused: {formatPauseTime(pausedSeconds)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Now Playing Live Mini Player Pill */}
        {currentTrack && (
          <button
            onClick={() => {
              playClickSound();
              musicPlayer.togglePlay();
            }}
            title={isMusicPlaying ? 'Click to Pause' : 'Click to Play'}
            className="inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-50 border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] max-w-xs sm:max-w-sm mx-auto cursor-pointer transition-all active:translate-y-0.5"
          >
            <div className="w-6 h-6 rounded-lg bg-[#FFE873] border border-[#18181B] flex items-center justify-center shrink-0">
              <Music2 className="w-3.5 h-3.5 text-[#18181B] stroke-[2.25]" />
            </div>

            <div className="min-w-0 text-left flex-1">
              <p className="text-xs font-bold text-[#18181B] truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate">{currentTrack.artist}</p>
            </div>

            {isMusicPlaying ? (
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="w-1 h-3 bg-[#18181B] rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-[#18181B] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-1 h-2 bg-[#18181B] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            ) : (
              <Play className="w-3.5 h-3.5 fill-[#18181B] text-[#18181B] shrink-0 ml-1" />
            )}
          </button>
        )}
      </div>

      {/* Bottom Floating Controls */}
      <div className="flex items-center justify-center gap-3 max-w-sm mx-auto w-full mb-2">
        <button
          onClick={onTogglePlay}
          className={`flex-1 py-3.5 px-5 rounded-2xl border-[2px] border-[#18181B] font-extrabold font-display text-xs sm:text-sm uppercase tracking-wider shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isRunning ? 'bg-[#FED7AA] text-[#18181B]' : 'bg-[#FFE873] text-[#18181B]'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4 fill-current stroke-[2.25]" />
              <span>Pause Session</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current stroke-[2.25]" />
              <span>Resume Flow</span>
            </>
          )}
        </button>

        <button
          onClick={onReset}
          title="Reset Timer"
          className="w-12 h-12 rounded-2xl bg-white hover:bg-slate-100 border-[2px] border-[#18181B] flex items-center justify-center text-slate-700 shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none cursor-pointer shrink-0"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          onClick={onComplete}
          title="Complete & Log Session"
          className="w-12 h-12 rounded-2xl bg-[#D1FBE4] hover:bg-[#B7F4D1] border-[2px] border-[#18181B] flex items-center justify-center text-emerald-950 shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none cursor-pointer shrink-0"
        >
          <Check className="w-5 h-5 stroke-[3]" />
        </button>
      </div>

    </div>
  );
};
