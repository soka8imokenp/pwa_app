import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Minimize2, Target, Check, Hourglass, Music2, AlertCircle, Radio } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] bg-[#F4F0EA] flex flex-col justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+28px)] select-none font-body animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F0BB58] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs">
            <Hourglass className="w-4 h-4 text-[#24201D] stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] block leading-tight">
              Zen Desk Stand Mode
            </span>
            <span className="text-[10px] text-[#6B635B] font-bold uppercase tracking-wider">
              Sumire Focus Flow
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-10 h-10 rounded-xl bg-white hover:bg-stone-100 border-[1.75px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs cursor-pointer active:scale-95 transition-all"
          title="Exit Zen Mode"
        >
          <Minimize2 className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Giant Clock Center */}
      <div className="text-center my-auto space-y-4">
        {taskTitle && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#DDE8DE] border-[1.75px] border-[#24201D] rounded-full shadow-2xs">
            <Target className="w-4 h-4 text-[#2D503C] stroke-[2.5]" />
            <span className="text-xs font-bold text-[#2D503C] truncate max-w-xs">
              {taskTitle}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-7xl sm:text-9xl font-extrabold font-display font-mono-num tracking-tight text-[#24201D] drop-shadow-[3px_3px_0px_rgba(36,32,29,0.1)]">
            {formattedTime}
          </h1>

          <div className="flex flex-col items-center justify-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#24201D] bg-[#F0BB58] px-3.5 py-1 rounded-full border-[1.5px] border-[#24201D] shadow-2xs inline-block">
              {isRunning ? 'Flow Active' : 'Session Paused'} • {mode.toUpperCase()}
            </span>

            {/* Red Paused Time Counter */}
            {!isRunning && elapsedFocusSeconds > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F7E3DC] border-[1.5px] border-[#C25E40] rounded-full text-xs font-black font-mono-num text-[#C25E40] shadow-2xs animate-in fade-in zoom-in-95 duration-150">
                <span className="w-2 h-2 rounded-full bg-[#C25E40] animate-ping" />
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
            title={isMusicPlaying ? 'Click to Pause Lofi Radio' : 'Click to Play Lofi Radio'}
            className="inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-stone-50 border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] max-w-xs sm:max-w-sm mx-auto cursor-pointer transition-all active:translate-y-0.5"
          >
            <div className="w-6 h-6 rounded-lg bg-[#F0BB58] border border-[#24201D] flex items-center justify-center shrink-0">
              <Radio className="w-3.5 h-3.5 text-[#24201D] stroke-[2.25]" />
            </div>

            <div className="min-w-0 text-left flex-1">
              <p className="text-xs font-bold text-[#24201D] truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-[#6B635B] font-medium truncate">{currentTrack.artist}</p>
            </div>

            {isMusicPlaying ? (
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="w-1 h-3 bg-[#3D6B52] rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-[#3D6B52] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-1 h-2 bg-[#3D6B52] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            ) : (
              <Play className="w-3.5 h-3.5 fill-[#24201D] text-[#24201D] shrink-0 ml-1" />
            )}
          </button>
        )}
      </div>

      {/* Bottom Floating Controls */}
      <div className="flex items-center justify-center gap-3 max-w-sm mx-auto w-full mb-2">
        {!isRunning && elapsedFocusSeconds === 0 ? (
          <button
            onClick={onTogglePlay}
            className="w-full py-3.5 px-5 rounded-2xl border-[2px] border-[#24201D] font-extrabold font-display text-xs sm:text-sm uppercase tracking-wider shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#3D6B52] text-white"
          >
            <Play className="w-4 h-4 fill-current stroke-[2.25]" />
            <span>Start Flow</span>
          </button>
        ) : (
          <>
            <button
              onClick={onTogglePlay}
              className={`flex-1 py-3.5 px-5 rounded-2xl border-[2px] border-[#24201D] font-extrabold font-display text-xs sm:text-sm uppercase tracking-wider shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isRunning ? 'bg-[#C25E40] text-white' : 'bg-[#F0BB58] text-[#24201D]'
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
              className="w-12 h-12 rounded-2xl bg-white hover:bg-stone-100 border-[2px] border-[#24201D] flex items-center justify-center text-stone-700 shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none cursor-pointer shrink-0"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={onComplete}
              title="Complete & Log Session"
              className="w-12 h-12 rounded-2xl bg-[#DDE8DE] hover:bg-[#C9DCCB] border-[2px] border-[#24201D] flex items-center justify-center text-[#2D503C] shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 active:shadow-none cursor-pointer shrink-0"
            >
              <Check className="w-5 h-5 stroke-[3]" />
            </button>
          </>
        )}
      </div>

    </div>
  );
};
