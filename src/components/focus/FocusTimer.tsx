import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, Clock, Zap, Coffee, Flame } from 'lucide-react';
import { BrutalCard } from '../common/BrutalCard';
import { BrutalButton } from '../common/BrutalButton';
import { BrutalBadge } from '../common/BrutalBadge';
import type { Task, FocusSession } from '../../types';
import { playClickSound, playTimerFinishAlarm, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface FocusTimerProps {
  activeTasks: Task[];
  selectedTask?: Task | null;
  onClearSelectedTask: () => void;
  onLogFocusSession: (session: Omit<FocusSession, 'id' | 'completedAt'>) => void;
  todaysSessions: FocusSession[];
  selectedDate: string;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
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

  // Sync selected task from external props if clicked from Rule of 3
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

  // Timer Tick
  useEffect(() => {
    let interval: any = null;

    if (isRunning) {
      interval = setInterval(() => {
        if (mode === 'stopwatch') {
          setStopwatchSeconds((prev) => prev + 1);
        } else {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsRunning(false);
              handleTimerFinish();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, mode]);

  const handleTimerFinish = () => {
    playTimerFinishAlarm();
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#C084FC', '#FDBA74', '#86EFAC'],
    });

    const durationMins = mode === 'pomodoro' ? 25 : mode === 'deepwork' ? 50 : 5;
    const taskObj = activeTasks.find((t) => t.id === linkedTaskId);

    if (mode !== 'break') {
      onLogFocusSession({
        taskId: linkedTaskId,
        taskTitle: taskObj?.title || 'Deep Work Session',
        durationMinutes: durationMins,
        date: selectedDate,
        mode,
      });
    }
  };

  const handleManualCompleteAndLog = () => {
    let durationMins = 0;
    if (mode === 'stopwatch') {
      durationMins = Math.max(1, Math.round(stopwatchSeconds / 60));
    } else {
      const fullSecs = initialDurationForMode(mode);
      const elapsedSecs = fullSecs - secondsLeft;
      durationMins = Math.max(1, Math.round(elapsedSecs / 60));
    }

    const taskObj = activeTasks.find((t) => t.id === linkedTaskId);

    onLogFocusSession({
      taskId: linkedTaskId,
      taskTitle: taskObj?.title || (mode === 'break' ? 'Break' : 'Focus Session'),
      durationMinutes: durationMins,
      date: selectedDate,
      mode: mode === 'break' ? 'pomodoro' : mode,
    });

    playSuccessChime();
    setIsRunning(false);
    setSecondsLeft(initialDurationForMode(mode));
    setStopwatchSeconds(0);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === 'stopwatch') {
      setStopwatchSeconds(0);
    } else {
      setSecondsLeft(initialDurationForMode(mode));
    }
    playClickSound();
  };

  // Time Formatter
  const displaySeconds = mode === 'stopwatch' ? stopwatchSeconds : secondsLeft;
  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const currentTask = activeTasks.find((t) => t.id === linkedTaskId);
  const totalMinutesToday = todaysSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  return (
    <BrutalCard variant="peach" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-[#1E1B4B]/15 dark:border-orange-300/20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#FED7AA] dark:bg-[#431E10] border-2 border-[#1E1B4B] dark:border-orange-400 rounded-xl shadow-[2px_2px_0px_#1E1B4B]">
            <Clock className="w-5 h-5 text-orange-950 dark:text-orange-100" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-purple-50 tracking-tight">
              Focus Engine
            </h3>
            <p className="text-xs font-bold text-orange-950/70 dark:text-orange-300">
              Quantifiable facts • {totalMinutesToday}m logged today
            </p>
          </div>
        </div>

        <BrutalBadge variant="peach" size="md">
          {todaysSessions.length} SESSIONS
        </BrutalBadge>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/80 dark:bg-[#1E172E] border-2 border-[#1E1B4B] dark:border-purple-300 rounded-2xl">
        {[
          { id: 'pomodoro', label: '25m Pomo', icon: <Zap className="w-3.5 h-3.5" /> },
          { id: 'deepwork', label: '50m Deep', icon: <Flame className="w-3.5 h-3.5" /> },
          { id: 'break', label: '5m Rest', icon: <Coffee className="w-3.5 h-3.5" /> },
          { id: 'stopwatch', label: 'Stopwatch', icon: <Clock className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleModeChange(tab.id as any)}
            className={`py-2 px-1 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mode === tab.id
                ? 'bg-[#FDBA74] text-slate-950 border-2 border-[#1E1B4B] shadow-[2px_2px_0px_#1E1B4B] dark:bg-[#FB923C]'
                : 'text-slate-700 dark:text-purple-200 hover:text-slate-950'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Big Digital Display Box */}
      <div className="bg-white dark:bg-[#19152B] border-[2.5px] border-[#1E1B4B] dark:border-purple-300 rounded-3xl p-6 text-center shadow-[4px_4px_0px_#1E1B4B] dark:shadow-[4px_4px_0px_#A855F7]">
        {/* Linked Task Bar */}
        <div className="mb-3">
          {currentTask ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF5FF] dark:bg-[#2A1D45] border-2 border-[#1E1B4B] rounded-xl">
              <span className="text-[11px] font-black text-purple-950 dark:text-purple-200 truncate max-w-[200px]">
                🎯 {currentTask.title}
              </span>
              <button
                onClick={() => {
                  setLinkedTaskId(undefined);
                  onClearSelectedTask();
                }}
                className="text-xs font-bold text-slate-500 hover:text-rose-600"
              >
                ✕
              </button>
            </div>
          ) : (
            <select
              value={linkedTaskId || ''}
              onChange={(e) => setLinkedTaskId(e.target.value ? Number(e.target.value) : undefined)}
              className="text-xs font-bold px-3 py-1 bg-[#FAF5FF] dark:bg-[#231A3A] border-2 border-[#1E1B4B] dark:border-purple-300 rounded-xl text-slate-700 dark:text-purple-200 outline-none"
            >
              <option value="">Link to task (Optional)</option>
              {activeTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.isPriority ? '★ ' : ''}
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Big Digit Timer */}
        <div className="text-6xl sm:text-7xl font-black font-mono-num tracking-tight text-slate-950 dark:text-purple-50 my-2">
          {formattedTime}
        </div>

        {/* Progress status */}
        <div className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-purple-300 mb-6">
          {isRunning ? '⚡ Session in progress...' : 'Ready to begin'}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <BrutalButton
            variant="secondary"
            size="icon"
            onClick={handleReset}
            title="Reset timer"
            className="w-11 h-11"
          >
            <RotateCcw className="w-5 h-5 text-slate-700 dark:text-purple-200" />
          </BrutalButton>

          <BrutalButton
            variant={isRunning ? 'peach' : 'lime'}
            size="lg"
            onClick={() => {
              setIsRunning(!isRunning);
              playClickSound();
            }}
            className="min-w-[140px] flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>START</span>
              </>
            )}
          </BrutalButton>

          {(isRunning || displaySeconds !== initialDurationForMode(mode)) && (
            <BrutalButton
              variant="primary"
              size="icon"
              onClick={handleManualCompleteAndLog}
              title="Finish & log session"
              className="w-11 h-11"
            >
              <CheckCircle2 className="w-5 h-5 text-slate-950 dark:text-white" />
            </BrutalButton>
          )}
        </div>
      </div>
    </BrutalCard>
  );
};
