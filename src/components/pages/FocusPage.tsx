import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Check,
  Zap,
  Coffee,
  Timer,
  Save,
  Trash2,
  AlertCircle,
  Flower2,
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
  onDeleteFocusSession?: (sessionId: number) => Promise<any> | void;
  todaysSessions: FocusSession[];
  selectedDate: string;
}

const FOCUS_PRESETS = [15, 25, 45, 60];
const BREAK_PRESETS = [5, 10, 15, 20];

export const FocusPage: React.FC<FocusPageProps> = ({
  selectedTask,
  onClearSelectedTask,
  onLogFocusSession,
  onDeleteFocusSession,
  todaysSessions,
  selectedDate,
}) => {
  const [mode, setMode] = useState<'pomodoro' | 'break' | 'stopwatch'>('pomodoro');
  const [customMinutes, setCustomMinutes] = useState<number>(25);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [elapsedFocusSeconds, setElapsedFocusSeconds] = useState(0);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  
  // Custom Focus Goal Title
  const [goalTitle, setGoalTitle] = useState<string>(selectedTask?.title || '');
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);

  useEffect(() => {
    if (selectedTask) {
      setGoalTitle(selectedTask.title);
    }
  }, [selectedTask]);

  const handleSelectPreset = (mins: number) => {
    playClickSound();
    setIsRunning(false);
    setElapsedFocusSeconds(0);
    setPausedSeconds(0);
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
    setElapsedFocusSeconds(0);
    setPausedSeconds(0);
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
      interval = setInterval(() => {
        setElapsedFocusSeconds((prev) => prev + 1);

        if (mode === 'stopwatch') {
          setStopwatchSeconds((prev) => prev + 1);
        } else {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, mode]);

  // Pause Duration Counter in Red
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

  const handleTimerComplete = async () => {
    setIsRunning(false);
    playTimerFinishAlarm();

    const actualMinutes =
      mode === 'stopwatch'
        ? Math.max(1, Math.round(stopwatchSeconds / 60))
        : mode === 'break'
        ? breakMinutes
        : customMinutes;

    const titleToSave =
      goalTitle.trim() ||
      (mode === 'break' ? 'Rest Break' : 'Deep Focus');

    await onLogFocusSession({
      taskId: selectedTask?.id || undefined,
      taskTitle: titleToSave,
      durationMinutes: actualMinutes,
      mode: mode === 'break' ? 'pomodoro' : mode,
      date: selectedDate,
    });

    sendLocalNotification(
      'Focus Session Complete',
      `Logged ${actualMinutes}m on "${titleToSave}".`,
      { tab: 'focus' }
    );

    playSuccessChime();
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4', '#FED7AA'],
    });

    setElapsedFocusSeconds(0);
    setPausedSeconds(0);
  };

  // Save / Stop Early with Real Actual Elapsed Time
  const handleStopAndLogSession = async () => {
    const totalElapsed = mode === 'stopwatch' ? stopwatchSeconds : elapsedFocusSeconds;
    if (totalElapsed < 3) return;

    playClickSound();
    setIsRunning(false);

    const actualMinutes =
      mode === 'stopwatch'
        ? Math.max(1, Math.round(stopwatchSeconds / 60))
        : Math.max(1, Math.round(elapsedFocusSeconds / 60));

    const titleToSave =
      goalTitle.trim() ||
      (mode === 'break' ? 'Rest Break' : 'Deep Focus');

    await onLogFocusSession({
      taskId: selectedTask?.id || undefined,
      taskTitle: titleToSave,
      durationMinutes: actualMinutes,
      mode: mode === 'break' ? 'pomodoro' : mode,
      date: selectedDate,
    });

    sendLocalNotification(
      'Session Saved',
      `Saved ${actualMinutes}m on "${titleToSave}".`,
      { tab: 'focus' }
    );

    playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#D1FBE4'],
    });

    handleReset();
  };

  const handleTogglePlay = () => {
    playClickSound();
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    playClickSound();
    setIsRunning(false);
    setElapsedFocusSeconds(0);
    setPausedSeconds(0);
    if (mode === 'stopwatch') {
      setStopwatchSeconds(0);
    } else if (mode === 'break') {
      setSecondsLeft(breakMinutes * 60);
    } else {
      setSecondsLeft(customMinutes * 60);
    }
  };

  const handleDeleteSession = async (sessionId?: number) => {
    if (!sessionId || !onDeleteFocusSession) return;
    playClickSound();
    await onDeleteFocusSession(sessionId);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const displayTime = mode === 'stopwatch' ? formatTime(stopwatchSeconds) : formatTime(secondsLeft);
  const totalFocusTodayMins = todaysSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const currentElapsedMinutes = Math.max(1, Math.round((mode === 'stopwatch' ? stopwatchSeconds : elapsedFocusSeconds) / 60));
  const hasActiveSession = isRunning || elapsedFocusSeconds > 0 || (mode === 'stopwatch' && stopwatchSeconds > 0);

  return (
    <div className="w-full space-y-3.5 pb-24 font-body select-none">
      
      {/* 1. Main Sumire Focus Card */}
      <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3.5">
        
        {/* Top Header with Zen Mode Icon in Top-Right Corner */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#EDE9FE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Flower2 className="w-4 h-4 text-[#7E22CE] stroke-[2.25]" />
            </div>
            <div>
              <h2 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Sumire Focus Mode
              </h2>
            </div>
          </div>

          {/* Zen Stand Icon Button (Top-Right Corner) */}
          <button
            onClick={() => {
              playClickSound();
              setIsZenModeOpen(true);
            }}
            title="Zen Desk Stand Mode"
            className="w-8 h-8 rounded-xl bg-[#F4F0EA] hover:bg-[#DDE8DE] border-[1.5px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:translate-y-0.5 transition-all cursor-pointer"
          >
            <Maximize2 className="w-4 h-4 stroke-[2.25]" />
          </button>
        </div>

        {/* Mode Selector Tabs (Focus Flow, Rest Break, Stopwatch) */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F0EA] border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs">
          {[
            { id: 'pomodoro', label: 'Focus Flow', icon: <Zap className="w-3.5 h-3.5" /> },
            { id: 'break', label: 'Rest Break', icon: <Coffee className="w-3.5 h-3.5" /> },
            { id: 'stopwatch', label: 'Stopwatch', icon: <Timer className="w-3.5 h-3.5" /> },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id as any)}
              className={`flex-1 py-1.5 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === m.id
                  ? 'bg-[#F0BB58] text-[#24201D] border-[1.5px] border-[#24201D] shadow-[1px_1px_0px_#24201D]'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              {m.icon}
              <span className="text-[11px] font-black">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Title Input */}
        <div className="flex items-center gap-2 bg-[#F4F0EA] border border-[#24201D] rounded-xl px-3 py-2 shadow-2xs">
          <input
            type="text"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="Focus goal or task title..."
            className="w-full text-xs font-bold text-[#24201D] outline-none placeholder:text-[#A89F91] bg-transparent"
          />
          {goalTitle && (
            <button
              type="button"
              onClick={() => {
                setGoalTitle('');
                onClearSelectedTask();
              }}
              className="w-4 h-4 rounded-full bg-stone-200/80 flex items-center justify-center text-[10px] font-black text-[#6B635B] hover:text-[#24201D] cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Large Digits Display & Status Indicator */}
        <div className="py-3 text-center space-y-2">
          <div className="text-6xl sm:text-7xl font-black font-display font-mono-num text-[#24201D] tracking-tight">
            {displayTime}
          </div>

          <div className="flex items-center justify-center gap-2">
            {isRunning ? (
              <span className="px-3 py-1 bg-[#DDE8DE] border border-[#3D6B52] rounded-full text-[10px] font-black font-mono-num text-[#2D503C] shadow-2xs">
                Active • {currentElapsedMinutes}m elapsed
              </span>
            ) : elapsedFocusSeconds > 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F7E3DC] border-[1.5px] border-[#C25E40] rounded-full text-xs font-black font-mono-num text-[#9A3412] shadow-[1px_1px_0px_#C25E40] animate-in fade-in zoom-in-95 duration-150">
                <span className="w-2 h-2 rounded-full bg-[#C25E40] animate-ping" />
                <span>Paused: {formatTime(pausedSeconds)}</span>
              </div>
            ) : (
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B635B]">
                Ready to Focus
              </span>
            )}
          </div>
        </div>

        {/* Duration Preset Chips */}
        {mode !== 'stopwatch' && (
          <div className="flex items-center justify-center gap-1.5">
            {(mode === 'pomodoro' ? FOCUS_PRESETS : BREAK_PRESETS).map((mins) => {
              const isActive = (mode === 'pomodoro' ? customMinutes : breakMinutes) === mins;
              return (
                <button
                  key={mins}
                  onClick={() => handleSelectPreset(mins)}
                  className={`px-3.5 py-1 text-xs font-bold font-mono-num rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#3D6B52] border-[#24201D] text-white shadow-[1px_1px_0px_#24201D]'
                      : 'bg-[#F4F0EA] border-[#24201D]/25 text-[#6B635B] hover:border-[#24201D]'
                  }`}
                >
                  {mins}m
                </button>
              );
            })}
          </div>
        )}

        {/* Primary Controls Bar: Start / Pause / Resume + Conditional Reset & Complete Checkmark */}
        <div className="pt-2 border-t border-[#24201D]/15">
          {!hasActiveSession ? (
            /* IDLE STATE: Only Big Prominent Start Button */
            <button
              onClick={handleTogglePlay}
              className="w-full py-3.5 px-4 rounded-2xl border-[1.75px] border-[#24201D] bg-[#3D6B52] hover:bg-[#345B45] text-white flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>
                {mode === 'break' ? 'Start Rest Break' : mode === 'stopwatch' ? 'Start Stopwatch' : 'Start Focus Flow'}
              </span>
            </button>
          ) : (
            /* ACTIVE / PAUSED STATE: Action Controls Reveal */
            <div className="flex items-center justify-center gap-2 w-full animate-in fade-in zoom-in-95 duration-150">
              {/* Start / Pause / Resume Button */}
              <button
                onClick={handleTogglePlay}
                className={`flex-1 py-3 px-4 rounded-2xl border-[1.75px] border-[#24201D] flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider shadow-[2.5px_2.5px_0px_#24201D] active:translate-y-0.5 transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-[#C25E40] text-white hover:bg-[#AC5035]'
                    : 'bg-[#F0BB58] hover:bg-[#E5A943] text-[#24201D]'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-white" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-[#24201D]" />
                    <span>Resume</span>
                  </>
                )}
              </button>

              {/* Reset / Discard Button (Only appears when session is active or paused) */}
              <button
                onClick={handleReset}
                title="Reset / Discard Session"
                className="w-11 h-11 rounded-2xl bg-white hover:bg-rose-50 border-[1.75px] border-[#24201D] flex items-center justify-center text-[#24201D] hover:text-rose-600 shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 cursor-pointer shrink-0 transition-colors"
              >
                <RotateCcw className="w-4 h-4 stroke-[2.25]" />
              </button>

              {/* Complete & Log Session Checkmark Button */}
              <button
                onClick={handleStopAndLogSession}
                title={`Complete & Log Session (${currentElapsedMinutes}m)`}
                className="w-11 h-11 rounded-2xl bg-[#DDE8DE] hover:bg-[#C9DCCB] border-[1.75px] border-[#24201D] flex items-center justify-center text-[#2D503C] shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 cursor-pointer shrink-0 transition-all"
              >
                <Check className="w-5 h-5 stroke-[3]" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* 2. In-App Lo-Fi Music Player */}
      <InAppMusicPlayer />

      {/* 3. Today's Completed Focus History (IndexedDB Log) */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black font-display text-[#6B635B] uppercase tracking-wider">
              Today's Focus Log
            </span>
            <span className="px-2 py-0.5 bg-[#F4F0EA] border border-[#24201D]/20 text-[9px] font-bold text-[#6B635B] rounded-full">
              {todaysSessions.length} sessions
            </span>
          </div>

          <span className="text-xs font-black font-mono-num text-[#24201D]">
            {totalFocusTodayMins}m total
          </span>
        </div>

        {todaysSessions.length === 0 ? (
          <div className="py-4 text-center bg-[#FAF8F5] border border-dashed border-[#24201D]/25 rounded-xl">
            <p className="text-xs font-bold text-[#6B635B]">No focus sessions logged today yet.</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Start a timer above to track your deep work!</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {todaysSessions.map((s, idx) => (
              <div
                key={s.id || idx}
                className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl flex items-center justify-between text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-lg bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#2D503C] stroke-[3]" />
                  </div>
                  <span className="font-bold text-[#24201D] truncate">
                    {s.taskTitle || 'Focus Session'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="font-black font-mono-num text-[#3D6B52]">
                    +{s.durationMinutes}m
                  </span>
                  {s.id && onDeleteFocusSession && (
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      title="Delete log entry"
                      className="w-5 h-5 rounded hover:bg-rose-100 flex items-center justify-center text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
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
          elapsedFocusSeconds={elapsedFocusSeconds}
          formattedTime={displayTime}
          taskTitle={goalTitle || selectedTask?.title}
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
