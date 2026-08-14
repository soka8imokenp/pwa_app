import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Zap,
  Flame,
  Coffee,
  Check,
  Sparkles,
  ChevronDown,
  X,
  Headphones,
  Volume2,
  VolumeX,
  Target,
  Timer as TimerIcon,
  Maximize2,
} from 'lucide-react';
import type { Task, FocusSession } from '../../types';
import { playClickSound, playTimerFinishAlarm, playSuccessChime } from '../../lib/sound';
import { playAmbientSound, stopAmbientSound, AmbientSoundType } from '../../lib/ambientSound';
import { sendLocalNotification, requestNotificationPermission } from '../../lib/notifications';
import { ZenFullscreenTimer } from '../focus/ZenFullscreenTimer';
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
  { id: 'rain', label: 'Raindrops', icon: '🌧️' },
  { id: 'waves', label: 'Ocean Waves', icon: '🌊' },
  { id: 'binaural', label: 'Alpha Flow', icon: '🧠' },
  { id: 'whitenoise', label: 'White Noise', icon: '⚪' },
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

  // Zen Fullscreen Mode State
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);

  // Dropdown / Popover State for Task Selector
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);

  // Ambient Sound Generator State
  const [activeSound, setActiveSound] = useState<AmbientSoundType>('none');
  const [volume, setVolume] = useState(0.4);

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

  // Ambient Sound Controller
  useEffect(() => {
    if (isRunning && activeSound !== 'none') {
      playAmbientSound(activeSound, volume);
    } else if (!isRunning) {
      stopAmbientSound();
    }
    return () => stopAmbientSound();
  }, [isRunning, activeSound, volume]);

  const handleTimerFinish = () => {
    playTimerFinishAlarm();

    // Send push notification
    sendLocalNotification(
      '🎉 Focus Session Completed!',
      `Great job! You finished your ${mode === 'pomodoro' ? '25m' : '50m'} flow session.`
    );

    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#C084FC', '#BEF264', '#FED7AA', '#38BDF8'],
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

  const toggleSoundPreset = (presetId: AmbientSoundType) => {
    playClickSound();
    if (activeSound === presetId) {
      setActiveSound('none');
      stopAmbientSound();
    } else {
      setActiveSound(presetId);
      if (isRunning) {
        playAmbientSound(presetId, volume);
      }
    }
  };

  const handleStartFlow = () => {
    requestNotificationPermission();
    playClickSound();
    setIsRunning(!isRunning);
  };

  const displaySeconds = mode === 'stopwatch' ? stopwatchSeconds : secondsLeft;
  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const currentTask = activeTasks.find((t) => t.id === linkedTaskId);
  const totalMinutesToday = todaysSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const dailyFocusGoalMinutes = 120; // 2 hours
  const goalPercent = Math.min(100, Math.round((totalMinutesToday / dailyFocusGoalMinutes) * 100));

  // SVG circular math
  const fullDuration = initialDurationForMode(mode);
  const progressPercent = mode === 'stopwatch'
    ? Math.min((stopwatchSeconds / (60 * 60)) * 100, 100)
    : fullDuration > 0
    ? ((fullDuration - secondsLeft) / fullDuration) * 100
    : 0;

  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-28 font-body select-none">
      
      {/* Zen Fullscreen Modal */}
      <ZenFullscreenTimer
        isOpen={isZenModeOpen}
        onClose={() => setIsZenModeOpen(false)}
        formattedTime={formattedTime}
        isRunning={isRunning}
        onTogglePlay={handleStartFlow}
        onReset={handleReset}
        onComplete={handleManualCompleteAndLog}
        taskTitle={currentTask?.title}
        activeSound={activeSound}
        onToggleSound={toggleSoundPreset}
        mode={mode}
      />

      {/* 1. Daily Focus Goal Progress Capsule */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2rem] p-3.5 shadow-[2px_2px_0px_#18181B] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#BEF264] border border-[#18181B] flex items-center justify-center shadow-2xs">
            <TimerIcon className="w-5 h-5 text-lime-950 stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
              Daily Focus Target
            </h3>
            <p className="text-[10px] font-semibold text-slate-500">
              {totalMinutesToday}m of {dailyFocusGoalMinutes}m ({goalPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-20 h-2.5 bg-[#FAF7F2] rounded-full border border-slate-200 overflow-hidden p-0.5">
            <div
              style={{ width: `${goalPercent}%` }}
              className="h-full rounded-full bg-[#C084FC] border border-[#18181B] transition-all duration-500"
            />
          </div>

          <button
            onClick={() => {
              playClickSound();
              setIsZenModeOpen(true);
            }}
            className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-[#E9D5FF] border border-[#18181B]/20 flex items-center justify-center text-[#18181B] cursor-pointer shadow-2xs active:scale-95 transition-transform"
            title="Open Zen Desk Stand Clock"
          >
            <Maximize2 className="w-3.5 h-3.5 stroke-[2.25]" />
          </button>
        </div>
      </div>

      {/* 2. Timer Hero Capsule */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2.25rem] p-5 text-center shadow-[2.5px_2.5px_0px_#18181B] space-y-4 relative">
        
        {/* Mode Chips Capsule Bar */}
        <div className="flex items-center justify-center gap-1 p-1 bg-[#FAF7F2] border border-[#18181B]/15 rounded-full max-w-xs mx-auto">
          {[
            { id: 'pomodoro', label: '25m', icon: <Zap className="w-3.5 h-3.5 stroke-[2.25]" /> },
            { id: 'deepwork', label: '50m', icon: <Flame className="w-3.5 h-3.5 stroke-[2.25]" /> },
            { id: 'break', label: '5m', icon: <Coffee className="w-3.5 h-3.5 stroke-[2.25]" /> },
            { id: 'stopwatch', label: 'Stopwatch', icon: <Clock className="w-3.5 h-3.5 stroke-[2.25]" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleModeChange(tab.id as any)}
              className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                mode === tab.id
                  ? 'bg-[#C084FC] text-[#18181B] border border-[#18181B] shadow-2xs'
                  : 'text-slate-500 hover:text-[#18181B]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Custom Pillowy Task Attachment Dropdown */}
        <div className="relative inline-block w-full max-w-xs">
          {currentTask ? (
            <div className="inline-flex items-center justify-between gap-2 w-full px-3.5 py-1.5 bg-[#F5EEFF] border-[1.5px] border-[#18181B] rounded-full shadow-2xs">
              <span className="text-xs font-black text-[#18181B] truncate flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-purple-700 stroke-[2.5]" />
                {currentTask.title}
              </span>
              <button
                onClick={() => {
                  setLinkedTaskId(undefined);
                  onClearSelectedTask();
                }}
                className="w-5 h-5 rounded-full bg-white border border-[#18181B]/20 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer text-xs"
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2 bg-[#FAF7F2] hover:bg-white border-[1.5px] border-[#18181B]/25 hover:border-[#18181B] rounded-full text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                <span className="flex items-center gap-1.5 text-slate-600 truncate">
                  <Target className="w-3.5 h-3.5 text-purple-700 stroke-[2.25]" />
                  <span>Attach goal to session...</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTaskDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Custom Animated Task List Popover */}
              {isTaskDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white border-[1.75px] border-[#18181B] rounded-3xl p-2 shadow-[0_12px_30px_rgba(24,24,27,0.15),2px_2px_0px_#18181B] space-y-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                    Select Quest ({activeTasks.length})
                  </p>
                  {activeTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 p-2">No active tasks. Add one in Today tab!</p>
                  ) : (
                    activeTasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          playClickSound();
                          setLinkedTaskId(t.id);
                          setIsTaskDropdownOpen(false);
                        }}
                        className="w-full p-2 rounded-2xl hover:bg-[#FAF5FF] flex items-center justify-between text-left transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-extrabold text-[#18181B] truncate">
                          {t.title}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase ml-2 shrink-0 font-mono-num">
                          {t.estimatedMinutes || 30}m
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive Circular Countdown Gauge */}
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-2">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r={radius}
              className="stroke-slate-100 fill-none"
              strokeWidth="10"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              className="stroke-[#C084FC] fill-none transition-all duration-300 ease-linear"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black font-mono-num tracking-tight text-[#18181B]">
              {formattedTime}
            </span>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 mt-1 flex items-center gap-1">
              {isRunning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#BEF264] animate-pulse inline-block" />
                  <span>Flow Active</span>
                </>
              ) : (
                <span>Ready</span>
              )}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-2.5 max-w-xs mx-auto pt-1">
          <button
            onClick={handleStartFlow}
            className={`flex-1 py-3 px-5 rounded-full border-[1.75px] border-[#18181B] font-black font-display text-xs uppercase tracking-wider shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isRunning
                ? 'bg-[#FEF08A] hover:bg-[#FDE047] text-[#18181B]'
                : 'bg-[#BEF264] hover:bg-[#A3E635] text-[#18181B]'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current stroke-[2.25]" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current stroke-[2.25]" />
                <span>Start Flow</span>
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            title="Reset Timer"
            className="w-11 h-11 rounded-full bg-[#FAF7F2] hover:bg-slate-100 border-[1.75px] border-[#18181B] flex items-center justify-center text-slate-600 hover:text-[#18181B] shadow-2xs active:scale-95 transition-transform cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          </button>

          {(isRunning || displaySeconds < fullDuration) && (
            <button
              onClick={handleManualCompleteAndLog}
              title="Log & Complete"
              className="w-11 h-11 rounded-full bg-[#E9D5FF] hover:bg-[#D8B4FE] border-[1.75px] border-[#18181B] flex items-center justify-center text-[#18181B] shadow-2xs active:scale-95 transition-transform cursor-pointer shrink-0"
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Ambient Flow Soundscape Synthesizer */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2rem] p-4 shadow-[2px_2px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E9D5FF] border border-[#18181B] flex items-center justify-center text-xs">
              <Headphones className="w-4 h-4 text-purple-900 stroke-[2.25]" />
            </div>
            <div>
              <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                Ambient Flow Audio
              </h4>
              <p className="text-[10px] font-semibold text-slate-500">
                {activeSound === 'none' ? 'Synthesizer muted' : `Playing ${activeSound} texture`}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (activeSound !== 'none') {
                setActiveSound('none');
                stopAmbientSound();
              } else {
                setActiveSound('rain');
                if (isRunning) playAmbientSound('rain', volume);
              }
            }}
            className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#18181B] flex items-center justify-center cursor-pointer shadow-2xs"
          >
            {activeSound !== 'none' ? (
              <Volume2 className="w-4 h-4 text-purple-800 stroke-[2.25]" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400 stroke-[2.25]" />
            )}
          </button>
        </div>

        {/* Sound Preset Pills */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {AMBIENT_PRESETS.map((p) => {
            const isActive = activeSound === p.id;
            return (
              <button
                key={p.id}
                onClick={() => toggleSoundPreset(p.id)}
                className={`py-2 px-1.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#BEF264] text-[#18181B] border-[#18181B] shadow-2xs font-extrabold'
                    : 'bg-[#FAF7F2] text-slate-600 border-slate-200 hover:border-[#18181B]'
                }`}
              >
                <span className="text-base block mb-0.5">{p.icon}</span>
                <span className="text-[9px] font-black tracking-tight leading-none block">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Today's Focus Log Summary */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2rem] p-4 shadow-[2px_2px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-700 stroke-[2.25]" />
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
              Today's Focus Log
            </h3>
          </div>
          <span className="text-[10px] font-black text-amber-900 bg-[#FEF08A] px-2.5 py-0.5 rounded-full border border-[#18181B]/20 font-mono-num">
            {totalMinutesToday}m total
          </span>
        </div>

        {todaysSessions.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs font-semibold">
            No focus sessions logged today yet. Launch one above!
          </div>
        ) : (
          <div className="space-y-2">
            {todaysSessions.map((session, idx) => (
              <div
                key={session.id || idx}
                className="p-2.5 bg-[#FAF7F2] border border-[#18181B]/15 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#BEF264] border border-[#18181B] flex items-center justify-center text-xs font-black">
                    ⚡
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-[#18181B]">
                      {session.taskTitle || 'Focus Session'}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {session.mode || 'Pomodoro'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black font-mono-num text-purple-800">
                  +{session.durationMinutes}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
