import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Timer as TimerIcon,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';
import type { Task, FocusSession } from '../../types';
import { playClickSound, playTimerFinishAlarm, playSuccessChime } from '../../lib/sound';
import { playAmbientSound, stopAmbientSound, AmbientSoundType } from '../../lib/ambientSound';
import { sendLocalNotification, requestNotificationPermission } from '../../lib/notifications';
import { ZenFullscreenTimer } from '../focus/ZenFullscreenTimer';
import { SpotifyFocusPlayer } from '../focus/SpotifyFocusPlayer';
import { InAppMusicPlayer } from '../focus/InAppMusicPlayer';
import confetti from 'canvas-confetti';

interface FocusPageProps {
  activeTasks: Task[];
  selectedTask?: Task | null;
  onClearSelectedTask: () => void;
  onLogFocusSession: (session: Omit<FocusSession, 'id' | 'completedAt'>) => void;
  todaysSessions: FocusSession[];
  selectedDate: string;
}

const AMBIENT_PRESETS: { id: AmbientSoundType; label: string; icon: string }[] = [
  { id: 'rain', label: 'Rain', icon: '🌧️' },
  { id: 'waves', label: 'Waves', icon: '🌊' },
  { id: 'binaural', label: 'Flow', icon: '🧠' },
  { id: 'whitenoise', label: 'White', icon: '⚪' },
];

export const FocusPage: React.FC<FocusPageProps> = ({
  activeTasks,
  selectedTask,
  onClearSelectedTask,
  onLogFocusSession,
  todaysSessions,
  selectedDate,
}) => {
  const [mode, setMode] = useState<'pomodoro' | 'deepwork' | 'break' | 'stopwatch'>('pomodoro');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [linkedTaskId, setLinkedTaskId] = useState<number | undefined>(selectedTask?.id);
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);
  const [activeSound, setActiveSound] = useState<AmbientSoundType>('none');

  useEffect(() => {
    if (selectedTask?.id) {
      setLinkedTaskId(selectedTask.id);
    }
  }, [selectedTask]);

  const initialDurationForMode = (m: typeof mode) => {
    switch (m) {
      case 'pomodoro':
        return 25 * 60;
      case 'deepwork':
        return 50 * 60;
      case 'break':
        return 5 * 60;
      case 'stopwatch':
        return 0;
    }
  };

  const handleModeChange = (newMode: typeof mode) => {
    setIsRunning(false);
    setMode(newMode);
    if (newMode === 'stopwatch') {
      setStopwatchSeconds(0);
    } else {
      setSecondsLeft(initialDurationForMode(newMode));
    }
    playClickSound();
  };

  // Timer Tick Interval
  useEffect(() => {
    let interval: any = null;

    if (isRunning) {
      if (mode === 'stopwatch') {
        interval = setInterval(() => {
          setStopwatchSeconds((prev) => prev + 1);
        }, 1000);
      } else {
        interval = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    playTimerFinishAlarm();

    const durationMins = mode === 'pomodoro' ? 25 : mode === 'deepwork' ? 50 : 5;
    const taskObj = activeTasks.find((t) => t.id === linkedTaskId);

    onLogFocusSession({
      taskId: linkedTaskId || undefined,
      taskTitle: taskObj?.title || `${mode === 'break' ? 'Break' : 'Focus'} Session`,
      durationMinutes: durationMins,
      mode: mode === 'break' ? 'pomodoro' : mode,
      date: selectedDate,
    });

    sendLocalNotification(
      '⚡ Focus Session Finished!',
      `Awesome job! You completed a ${durationMins}m focus session.`
    );

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });
  };

  const handleTogglePlay = () => {
    playClickSound();
    if (!isRunning) {
      requestNotificationPermission();
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    playClickSound();
    setIsRunning(false);
    if (mode === 'stopwatch') {
      setStopwatchSeconds(0);
    } else {
      setSecondsLeft(initialDurationForMode(mode));
    }
  };

  const handleToggleSound = (soundId: AmbientSoundType) => {
    playClickSound();
    if (activeSound === soundId) {
      stopAmbientSound();
      setActiveSound('none');
    } else {
      playAmbientSound(soundId, 0.4);
      setActiveSound(soundId);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const displayTime = mode === 'stopwatch' ? formatTime(stopwatchSeconds) : formatTime(secondsLeft);
  const totalFocusTodayMins = todaysSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  return (
    <div className="w-full space-y-4 pb-20 font-body select-none">
      {/* 1. Mode Tabs & Fullscreen Trigger */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-white border-[1.75px] border-[#18181B] rounded-xl shadow-[1.5px_1.5px_0px_#18181B]">
          {[
            { id: 'pomodoro', label: '25m Focus' },
            { id: 'deepwork', label: '50m Deep' },
            { id: 'break', label: '5m Break' },
            { id: 'stopwatch', label: 'Stopwatch' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id as any)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === m.id
                  ? 'bg-[#FFE873] text-[#18181B] border-[1.25px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                  : 'text-slate-500 hover:text-[#18181B]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            playClickSound();
            setIsZenModeOpen(true);
          }}
          title="Fullscreen Desk Stand Clock"
          className="w-8 h-8 rounded-xl bg-white border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 cursor-pointer"
        >
          <Maximize2 className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* 2. Main Glowing Timer Card */}
      <div className="neo-card p-8 bg-white flex flex-col items-center justify-center text-center space-y-6">
        {/* Linked Task Selector */}
        {selectedTask ? (
          <div className="px-3 py-1 bg-[#E8DCFF] border-[1.5px] border-[#18181B] rounded-full text-xs font-bold text-[#18181B] flex items-center gap-1.5 shadow-[1px_1px_0px_#18181B]">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate max-w-[200px]">{selectedTask.title}</span>
            <button onClick={onClearSelectedTask} className="hover:opacity-75 font-black ml-1">×</button>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {mode === 'break' ? '☕ Rest & Recharge' : '⚡ Deep Focus Mode'}
          </span>
        )}

        {/* Large Digits */}
        <div className="text-6xl sm:text-7xl font-extrabold font-display font-mono-num text-[#18181B] tracking-tight">
          {displayTime}
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTogglePlay}
            className={`px-8 py-3 rounded-xl border-[2px] border-[#18181B] flex items-center gap-2 font-bold text-sm shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
              isRunning ? 'bg-[#FED7AA] text-[#18181B]' : 'bg-[#FFE873] text-[#18181B]'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-[#18181B]" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-[#18181B]" />
                <span>Start Focus</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            title="Reset Timer"
            className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* 3. In-App Native Music Player (Full-length playback from CDN/Vercel) */}
      <InAppMusicPlayer />

      {/* 4. Integrated Spotify & Lo-Fi Focus Music Lounge */}
      <SpotifyFocusPlayer />

      {/* 4. Ambient Soundscapes */}
      <div className="neo-card p-4 bg-white space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-display text-slate-500 uppercase tracking-wider">
            Ambient Flow Noise
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            {activeSound !== 'none' ? `Playing: ${activeSound}` : 'Off'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {AMBIENT_PRESETS.map((snd) => (
            <button
              key={snd.id}
              onClick={() => handleToggleSound(snd.id)}
              className={`py-2 px-1 rounded-xl border-[1.5px] border-[#18181B] flex flex-col items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                activeSound === snd.id
                  ? 'bg-[#E8DCFF] shadow-[1.5px_1.5px_0px_#18181B] -translate-y-0.5'
                  : 'bg-[#FAF7F2] hover:bg-slate-100 shadow-[1px_1px_0px_#18181B]'
              }`}
            >
              <span>{snd.icon}</span>
              <span className="text-[10px] text-[#18181B]">{snd.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Today's Completed Focus History */}
      <div className="neo-card p-4 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-display text-slate-500 uppercase tracking-wider">
            Today's Log
          </span>
          <span className="text-xs font-bold text-[#18181B] font-mono-num">
            {totalFocusTodayMins}m total
          </span>
        </div>

        {todaysSessions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">
            No focus sessions logged today yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {todaysSessions.slice(0, 4).map((s, idx) => (
              <div
                key={s.id || idx}
                className="p-2 bg-[#FAF7F2] border border-slate-200 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-[#18181B] truncate max-w-[220px]">
                    {s.taskTitle}
                  </span>
                </div>
                <span className="font-bold font-mono-num text-slate-600 shrink-0">
                  +{s.durationMinutes}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal Component */}
      {isZenModeOpen && (
        <ZenFullscreenTimer
          isOpen={isZenModeOpen}
          mode={mode}
          isRunning={isRunning}
          formattedTime={displayTime}
          taskTitle={activeTasks.find((t) => t.id === linkedTaskId)?.title}
          activeSound={activeSound}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
          onComplete={handleTimerComplete}
          onToggleSound={handleToggleSound}
          onClose={() => setIsZenModeOpen(false)}
        />
      )}
    </div>
  );
};
