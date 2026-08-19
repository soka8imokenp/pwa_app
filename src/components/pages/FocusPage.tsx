import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Target,
  Maximize2,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { Task, FocusSession } from '../../types';
import { playClickSound, playTimerFinishAlarm, playSuccessChime } from '../../lib/sound';
import { sendLocalNotification, requestNotificationPermission } from '../../lib/notifications';
import { ZenFullscreenTimer } from '../focus/ZenFullscreenTimer';
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

const PRESET_MINUTES = [15, 25, 45, 60];

export const FocusPage: React.FC<FocusPageProps> = ({
  activeTasks,
  selectedTask,
  onClearSelectedTask,
  onLogFocusSession,
  todaysSessions,
  selectedDate,
}) => {
  const [mode, setMode] = useState<'pomodoro' | 'break' | 'stopwatch'>('pomodoro');
  const [customMinutes, setCustomMinutes] = useState<number>(25);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [linkedTaskId, setLinkedTaskId] = useState<number | undefined>(selectedTask?.id);
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);

  useEffect(() => {
    if (selectedTask?.id) {
      setLinkedTaskId(selectedTask.id);
    }
  }, [selectedTask]);

  const handleSelectPreset = (mins: number) => {
    playClickSound();
    setIsRunning(false);
    setMode('pomodoro');
    setCustomMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const handleModeChange = (newMode: typeof mode) => {
    setIsRunning(false);
    setMode(newMode);
    if (newMode === 'stopwatch') {
      setStopwatchSeconds(0);
    } else if (newMode === 'break') {
      setSecondsLeft(5 * 60);
    } else {
      setSecondsLeft(customMinutes * 60);
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

    const durationMins = mode === 'break' ? 5 : mode === 'stopwatch' ? Math.round(stopwatchSeconds / 60) : customMinutes;
    const taskObj = activeTasks.find((t) => t.id === linkedTaskId);

    onLogFocusSession({
      taskId: linkedTaskId || undefined,
      taskTitle: taskObj?.title || `${mode === 'break' ? 'Break' : 'Focus'} Session`,
      durationMinutes: durationMins || 1,
      mode: mode === 'break' ? 'pomodoro' : mode,
      date: selectedDate,
    });

    sendLocalNotification(
      'Focus Session Finished',
      `Great job! You completed ${durationMins}m of dedicated focus.`
    );

    playSuccessChime();
    confetti({
      particleCount: 70,
      spread: 60,
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
    } else if (mode === 'break') {
      setSecondsLeft(5 * 60);
    } else {
      setSecondsLeft(customMinutes * 60);
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
            { id: 'pomodoro', label: 'Focus Flow' },
            { id: 'break', label: 'Rest Break' },
            { id: 'stopwatch', label: 'Stopwatch' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id as any)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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

      {/* 2. Main Timer Card */}
      <div className="neo-card p-6 bg-white flex flex-col items-center justify-center text-center space-y-5">
        {/* Linked Task Selector */}
        {selectedTask ? (
          <div className="px-3 py-1 bg-[#E8DCFF] border-[1.5px] border-[#18181B] rounded-full text-xs font-bold text-[#18181B] flex items-center gap-1.5 shadow-[1px_1px_0px_#18181B]">
            <Target className="w-3.5 h-3.5" />
            <span className="truncate max-w-[200px]">{selectedTask.title}</span>
            <button onClick={onClearSelectedTask} className="hover:opacity-75 font-black ml-1">×</button>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display">
            {mode === 'break' ? 'Rest & Recharge' : 'Sumire Focus Mode'}
          </span>
        )}

        {/* Large Digits */}
        <div className="text-6xl sm:text-7xl font-extrabold font-display font-mono-num text-[#18181B] tracking-tight">
          {displayTime}
        </div>

        {/* Quick Duration Preset Chips (15m, 25m, 45m, 60m) */}
        {mode === 'pomodoro' && (
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1.5 rounded-2xl border-[1.5px] border-[#18181B]">
            <Clock className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {PRESET_MINUTES.map((mins) => (
              <button
                key={mins}
                onClick={() => handleSelectPreset(mins)}
                className={`px-2.5 py-1 text-xs font-bold font-mono-num rounded-xl transition-all cursor-pointer ${
                  customMinutes === mins
                    ? 'bg-[#FFE873] border border-[#18181B] text-[#18181B] shadow-[1px_1px_0px_#18181B]'
                    : 'text-slate-500 hover:text-[#18181B]'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        )}

        {/* Primary Controls */}
        <div className="flex items-center gap-3 pt-1">
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
          activeSound="none"
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
          onComplete={handleTimerComplete}
          onToggleSound={() => {}}
          onClose={() => setIsZenModeOpen(false)}
        />
      )}
    </div>
  );
};
