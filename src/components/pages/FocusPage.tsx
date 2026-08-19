import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  CheckCircle2,
  Clock,
  Target,
  Plus,
  Check,
  Zap,
  Coffee,
  Timer,
  Save,
  ChevronDown,
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
  onLogFocusSession: (session: Omit<FocusSession, 'id' | 'completedAt'>) => Promise<any> | void;
  todaysSessions: FocusSession[];
  selectedDate: string;
}

const FOCUS_PRESETS = [15, 25, 45, 60];
const BREAK_PRESETS = [5, 10, 15, 20];

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
  const [breakMinutes, setBreakMinutes] = useState<number>(5);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  
  // Custom Focus Goal Title
  const [goalTitle, setGoalTitle] = useState<string>(selectedTask?.title || '');
  const [linkedTaskId, setLinkedTaskId] = useState<number | undefined>(selectedTask?.id);
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      setGoalTitle(selectedTask.title);
      setLinkedTaskId(selectedTask.id);
    }
  }, [selectedTask]);

  const handleSelectPreset = (mins: number) => {
    playClickSound();
    setIsRunning(false);
    if (mode === 'pomodoro') {
      setCustomMinutes(mins);
      setSecondsLeft(mins * 60);
    } else if (mode === 'break') {
      setBreakMinutes(mins);
      setSecondsLeft(mins * 60);
    }
  };

  const handleModeChange = (newMode: 'pomodoro' | 'break' | 'stopwatch') => {
    playClickSound();
    setIsRunning(false);
    setMode(newMode);
    if (newMode === 'stopwatch') {
      setStopwatchSeconds(0);
    } else if (newMode === 'break') {
      setSecondsLeft(breakMinutes * 60);
    } else {
      setSecondsLeft(customMinutes * 60);
    }
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

  const handleTimerComplete = async () => {
    setIsRunning(false);
    playTimerFinishAlarm();

    const durationMins =
      mode === 'break'
        ? breakMinutes
        : mode === 'stopwatch'
        ? Math.max(1, Math.round(stopwatchSeconds / 60))
        : customMinutes;

    const titleToSave =
      goalTitle.trim() ||
      (mode === 'break' ? 'Rest Break' : 'Deep Focus Session');

    await onLogFocusSession({
      taskId: linkedTaskId || undefined,
      taskTitle: titleToSave,
      durationMinutes: durationMins,
      mode: mode === 'break' ? 'pomodoro' : mode,
      date: selectedDate,
    });

    sendLocalNotification(
      'Focus Session Complete',
      `Great job! You logged ${durationMins}m on "${titleToSave}".`
    );

    playSuccessChime();
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4', '#FED7AA'],
    });
  };

  const handleManualSaveSession = async () => {
    playClickSound();
    const durationMins =
      mode === 'stopwatch'
        ? Math.max(1, Math.round(stopwatchSeconds / 60))
        : mode === 'break'
        ? Math.max(1, Math.round((breakMinutes * 60 - secondsLeft) / 60))
        : Math.max(1, Math.round((customMinutes * 60 - secondsLeft) / 60));

    const titleToSave =
      goalTitle.trim() ||
      (mode === 'break' ? 'Rest Break' : 'Deep Focus Session');

    await onLogFocusSession({
      taskId: linkedTaskId || undefined,
      taskTitle: titleToSave,
      durationMinutes: durationMins,
      mode: mode === 'break' ? 'pomodoro' : mode,
      date: selectedDate,
    });

    playSuccessChime();
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#D1FBE4'],
    });

    handleReset();
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
      setSecondsLeft(breakMinutes * 60);
    } else {
      setSecondsLeft(customMinutes * 60);
    }
  };

  const handleSelectTaskFromDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setLinkedTaskId(undefined);
      onClearSelectedTask();
      return;
    }
    const tId = Number(val);
    const found = activeTasks.find((t) => t.id === tId);
    if (found) {
      setLinkedTaskId(found.id);
      setGoalTitle(found.title);
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
    <div className="w-full space-y-3.5 pb-24 font-body select-none">
      
      {/* 1. Main Sumire Focus Card */}
      <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-4">
        
        {/* Top Card Header with Zen Desk Stand Mode in Top-Right Corner */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFE873] border border-[#18181B] flex items-center justify-center shadow-2xs">
              <Zap className="w-4 h-4 text-[#18181B] stroke-[2.25]" />
            </div>
            <div>
              <h2 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                Sumire Focus Mode
              </h2>
              <span className="text-[10px] font-bold text-slate-400">
                Deep work & flow timer
              </span>
            </div>
          </div>

          {/* Zen Desk Stand Mode Button (Top-Right Corner) */}
          <button
            onClick={() => {
              playClickSound();
              setIsZenModeOpen(true);
            }}
            title="Zen Desk Stand Mode"
            className="px-3 py-1.5 rounded-xl bg-[#E8DCFF] hover:bg-[#D8C4FF] border-[1.5px] border-[#18181B] flex items-center gap-1.5 text-xs font-bold text-[#18181B] shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 stroke-[2.25]" />
            <span className="text-[11px] font-black font-display">Zen Stand</span>
          </button>
        </div>

        {/* Mode Selector Tabs (Focus Flow, Rest Break, Stopwatch) */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F2] border-[1.5px] border-[#18181B] rounded-2xl shadow-2xs">
          {[
            { id: 'pomodoro', label: 'Focus Flow', icon: <Zap className="w-3.5 h-3.5" /> },
            { id: 'break', label: 'Rest Break', icon: <Coffee className="w-3.5 h-3.5" /> },
            { id: 'stopwatch', label: 'Stopwatch', icon: <Timer className="w-3.5 h-3.5" /> },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id as any)}
              className={`flex-1 py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === m.id
                  ? 'bg-[#FFE873] text-[#18181B] border-[1.5px] border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                  : 'text-slate-500 hover:text-[#18181B]'
              }`}
            >
              {m.icon}
              <span className="text-[11px] font-black">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Custom Goal Title & Task Link Panel */}
        <div className="p-3 bg-[#FAF7F2] border-[1.5px] border-[#18181B] rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-purple-700 stroke-[2.25]" />
              <span>Focus Target / Goal Title</span>
            </label>

            {/* Quick Link Task Dropdown */}
            {activeTasks.length > 0 && (
              <div className="relative">
                <select
                  value={linkedTaskId || ''}
                  onChange={handleSelectTaskFromDropdown}
                  className="text-[10px] font-bold px-2 py-0.5 bg-white border border-[#18181B] rounded-lg text-slate-700 outline-none cursor-pointer shadow-2xs pr-5"
                >
                  <option value="">Link task...</option>
                  {activeTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.isPriority ? '[Top] ' : ''}
                      {t.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white border-[1.5px] border-[#18181B] rounded-xl px-3 py-2 shadow-2xs">
            <input
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder={mode === 'break' ? 'Rest Break & Coffee' : 'e.g. Design app interface, Study chapter 4...'}
              className="w-full text-xs font-bold text-[#18181B] outline-none placeholder:text-slate-400 bg-transparent"
            />
            {goalTitle && (
              <button
                type="button"
                onClick={() => {
                  setGoalTitle('');
                  setLinkedTaskId(undefined);
                  onClearSelectedTask();
                }}
                className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 hover:text-[#18181B] cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Large Digits Display */}
        <div className="py-2 text-center">
          <div className="text-6xl sm:text-7xl font-black font-display font-mono-num text-[#18181B] tracking-tight">
            {displayTime}
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mt-1">
            {isRunning ? 'Session Active' : 'Ready'}
          </span>
        </div>

        {/* Duration Preset Chips */}
        {mode !== 'stopwatch' && (
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {(mode === 'pomodoro' ? FOCUS_PRESETS : BREAK_PRESETS).map((mins) => {
              const isActive = (mode === 'pomodoro' ? customMinutes : breakMinutes) === mins;
              return (
                <button
                  key={mins}
                  onClick={() => handleSelectPreset(mins)}
                  className={`px-3 py-1 text-xs font-bold font-mono-num rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FFE873] border-[#18181B] text-[#18181B] shadow-[1px_1px_0px_#18181B]'
                      : 'bg-white border-[#18181B]/30 text-slate-600 hover:border-[#18181B]'
                  }`}
                >
                  {mins}m
                </button>
              );
            })}
          </div>
        )}

        {/* Controls Bar: Start Focus + Reset + Manual Log Session */}
        <div className="flex items-center justify-center gap-2.5 pt-2 border-t border-[#18181B]/15">
          <button
            onClick={handleTogglePlay}
            className={`flex-1 py-3 px-4 rounded-2xl border-[1.75px] border-[#18181B] flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#18181B] active:translate-y-0.5 transition-all cursor-pointer ${
              isRunning ? 'bg-[#FED7AA] text-[#18181B]' : 'bg-[#FFE873] hover:bg-[#FED7AA] text-[#18181B]'
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

          {/* Reset Button */}
          <button
            onClick={handleReset}
            title="Reset Timer"
            className="w-11 h-11 rounded-2xl bg-white hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-slate-700 shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.25]" />
          </button>

          {/* Manual Save Session to Database */}
          <button
            onClick={handleManualSaveSession}
            title="Save Completed Session to Database"
            className="px-3.5 py-3 rounded-2xl bg-[#D1FBE4] hover:bg-[#B7F4D1] border-[1.75px] border-[#18181B] flex items-center justify-center gap-1.5 text-xs font-black text-emerald-950 shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.25]" />
            <span className="hidden sm:inline">Log</span>
          </button>
        </div>

      </div>

      {/* 2. In-App Lo-Fi Music Player */}
      <InAppMusicPlayer />

      {/* 3. Today's Completed Focus History (IndexedDB Log) */}
      <div className="p-4 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black font-display text-slate-500 uppercase tracking-wider">
              Today's Focus Log
            </span>
            <span className="px-2 py-0.5 bg-[#FAF7F2] border border-[#18181B]/20 text-[9px] font-bold text-slate-600 rounded-full">
              {todaysSessions.length} sessions
            </span>
          </div>

          <span className="text-xs font-black font-mono-num text-[#18181B]">
            {totalFocusTodayMins}m total
          </span>
        </div>

        {todaysSessions.length === 0 ? (
          <div className="py-4 text-center bg-[#FAF7F2] border border-dashed border-[#18181B]/30 rounded-xl">
            <p className="text-xs font-bold text-slate-500">No focus sessions logged today yet.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Start a timer above to track your deep work!</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {todaysSessions.map((s, idx) => (
              <div
                key={s.id || idx}
                className="p-2.5 bg-[#FAF7F2] border border-[#18181B]/20 rounded-xl flex items-center justify-between text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-lg bg-[#D1FBE4] border border-[#18181B] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-800 stroke-[3]" />
                  </div>
                  <span className="font-bold text-[#18181B] truncate">
                    {s.taskTitle || 'Focus Session'}
                  </span>
                </div>
                <span className="font-black font-mono-num text-purple-900 shrink-0 ml-2">
                  +{s.durationMinutes}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Fullscreen Zen Mode Overlay */}
      {isZenModeOpen && (
        <ZenFullscreenTimer
          isOpen={isZenModeOpen}
          mode={mode}
          isRunning={isRunning}
          formattedTime={displayTime}
          taskTitle={goalTitle || activeTasks.find((t) => t.id === linkedTaskId)?.title}
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
