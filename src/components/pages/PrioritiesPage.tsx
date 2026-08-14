import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Crown,
  Timer,
  Check,
  Code,
  Palette,
  Activity,
  BookOpen,
  Plus,
  Play,
  ArrowDown,
  Clock,
  Sparkles,
  Mic,
  MicOff,
  Wand2,
  Trophy,
} from 'lucide-react';
import type { Task, FocusSession, HabitLog } from '../../types';
import { playTaskCheckSound, playSuccessChime, playClickSound } from '../../lib/sound';
import { startVoiceDictation, stopVoiceDictation, isSpeechRecognitionSupported } from '../../lib/speechRecognition';

import { LottiePlayer } from '../common/LottiePlayer';
import stressManagementAnimation from '../../assets/stress-management.json';

interface PrioritiesPageProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  priorityTasks: Task[];
  allTasks?: Task[];
  focusSessions?: FocusSession[];
  habitLogs?: HabitLog[];
  onToggleComplete: (task: Task) => void;
  onDemoteToBacklog: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onOpenAddTask: (prioritySlotIndex?: number) => void;
  onStartFocus: (task: Task) => void;
  onLogFocusSession?: (session: Omit<FocusSession, 'id'>) => Promise<any>;
  onQuickCreateTask?: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<any>;
  onOpenSmartBraindump?: () => void;
  onOpenEveningReview?: () => void;
}

export const PrioritiesPage: React.FC<PrioritiesPageProps> = ({
  selectedDate,
  priorityTasks,
  onToggleComplete,
  onDemoteToBacklog,
  onOpenAddTask,
  onStartFocus,
  onQuickCreateTask,
  onOpenSmartBraindump,
  onOpenEveningReview,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const primaryTask = priorityTasks[0];
  const secondaryTasks = priorityTasks.slice(1, 3);
  const completedCount = priorityTasks.filter((t) => t.isCompleted).length;
  const progressPercent = priorityTasks.length > 0 ? Math.round((completedCount / priorityTasks.length) * 100) : 0;

  const handleDoneClick = (task: Task) => {
    playTaskCheckSound();
    onToggleComplete(task);

    if (!task.isCompleted) {
      if (completedCount + 1 === priorityTasks.length && priorityTasks.length > 0) {
        playSuccessChime();
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFE873', '#E8DCFF', '#D1FBE4', '#FED7AA'],
        });
      }
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !onQuickCreateTask) return;

    playClickSound();
    await onQuickCreateTask({
      title: quickTitle.trim(),
      date: selectedDate,
      isPriority: priorityTasks.length < 3,
      isCompleted: false,
      category: 'general',
      estimatedMinutes: 30,
    });
    setQuickTitle('');
  };

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Voice dictation is supported in Chrome/Edge.');
      return;
    }

    if (isVoiceActive) {
      stopVoiceDictation();
      setIsVoiceActive(false);
    } else {
      setIsVoiceActive(true);
      startVoiceDictation({
        onTranscript: (transcript: string) => {
          setQuickTitle(transcript);
        },
        onError: () => {
          setIsVoiceActive(false);
        },
        onEnd: () => {
          setIsVoiceActive(false);
        },
      });
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'code':
        return <Code className="w-3.5 h-3.5" />;
      case 'design':
        return <Palette className="w-3.5 h-3.5" />;
      case 'health':
        return <Activity className="w-3.5 h-3.5" />;
      case 'learn':
        return <BookOpen className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="w-full space-y-4 pb-20 font-body">
      {/* 1. Header Progress Bar */}
      <div className="neo-card p-4 flex items-center justify-between gap-3 bg-white">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Daily Focus Progress
          </span>
          <h2 className="text-base font-bold font-display text-[#18181B] mt-0.5">
            {completedCount} of {priorityTasks.length} Priorities Done
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-24 bg-slate-100 border-[1.5px] border-[#18181B] h-3.5 rounded-full overflow-hidden p-0.5 shadow-[1px_1px_0px_#18181B]">
            <div
              className="bg-[#FFE873] h-full rounded-full transition-all duration-300 border-[1px] border-[#18181B]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold font-mono-num text-[#18181B]">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Stress Management Lottie Centerpiece Decoration */}
      <div className="w-full flex justify-center items-center py-2 select-none pointer-events-none">
        <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          <LottiePlayer
            animationData={stressManagementAnimation}
            loop={true}
            autoplay={true}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* 2. Hero Priority #1 Card */}
      {primaryTask ? (
        <div
          className={`neo-card p-5 transition-all ${
            primaryTask.isCompleted ? 'bg-slate-50 opacity-80' : 'bg-white'
          }`}
        >
          {/* Card Badge Header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFE873] border-[1.5px] border-[#18181B] rounded-full shadow-[1px_1px_0px_#18181B]">
              <Crown className="w-3.5 h-3.5 text-amber-900 fill-amber-500 stroke-[2]" />
              <span className="text-[10px] font-bold text-[#18181B] uppercase tracking-wider">
                Top Priority #1
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <Clock className="w-3 h-3" />
                {primaryTask.estimatedMinutes || 30}m
              </span>
              <button
                onClick={() => onDemoteToBacklog(primaryTask)}
                title="Move to Backlog"
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 border-[1.5px] border-[#18181B] flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Task Title */}
          <h3
            className={`text-base sm:text-lg font-bold font-display text-[#18181B] leading-snug mb-4 ${
              primaryTask.isCompleted ? 'line-through text-slate-400' : ''
            }`}
          >
            {primaryTask.title}
          </h3>

          {/* Actions: Start Focus + Mark Completed */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => onStartFocus(primaryTask)}
              className="px-4 py-2 bg-[#E8DCFF] hover:bg-[#D8C4FF] neo-btn flex items-center gap-2 text-xs text-[#18181B] cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-[#18181B]" />
              <span>Start Focus Timer</span>
            </button>

            <button
              onClick={() => handleDoneClick(primaryTask)}
              className={`w-9 h-9 rounded-xl border-[1.75px] border-[#18181B] flex items-center justify-center transition-all cursor-pointer ${
                primaryTask.isCompleted
                  ? 'bg-[#D1FBE4] text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]'
                  : 'bg-white hover:bg-slate-50 shadow-[1.5px_1.5px_0px_#18181B]'
              }`}
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onOpenAddTask(0)}
          className="w-full neo-card p-6 border-dashed bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center"
        >
          <div className="w-10 h-10 rounded-full bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-[1px_1px_0px_#18181B]">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-sm font-bold font-display text-[#18181B]">
            Set Top Priority #1
          </span>
          <span className="text-xs text-slate-500">
            What is the single most important thing to accomplish today?
          </span>
        </button>
      )}

      {/* 3. Secondary Priorities #2 & #3 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold font-display text-slate-500 uppercase tracking-wider">
            Supporting Priorities (2 & 3)
          </span>
          {priorityTasks.length < 3 && (
            <button
              onClick={() => onOpenAddTask(priorityTasks.length)}
              className="text-xs font-bold text-[#18181B] flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Slot
            </button>
          )}
        </div>

        {secondaryTasks.map((task, idx) => (
          <div
            key={task.id || idx}
            className={`neo-card p-4 flex items-center justify-between gap-3 transition-all ${
              task.isCompleted ? 'bg-slate-50 opacity-80' : 'bg-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => handleDoneClick(task)}
                className={`w-7 h-7 rounded-lg border-[1.75px] border-[#18181B] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  task.isCompleted
                    ? 'bg-[#D1FBE4] text-[#18181B] shadow-[1px_1px_0px_#18181B]'
                    : 'bg-white hover:bg-slate-50 shadow-[1px_1px_0px_#18181B]'
                }`}
              >
                {task.isCompleted && <Check className="w-4 h-4 stroke-[2.5]" />}
              </button>

              <div className="min-w-0">
                <span
                  className={`text-sm font-bold block truncate text-[#18181B] ${
                    task.isCompleted ? 'line-through text-slate-400' : ''
                  }`}
                >
                  {task.title}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                    {getCategoryIcon(task.category)}
                    {task.category || 'general'}
                  </span>
                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {task.estimatedMinutes || 30}m
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onStartFocus(task)}
                title="Focus"
                className="w-8 h-8 rounded-lg bg-[#FAF7F2] hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-[#18181B] cursor-pointer"
              >
                <Timer className="w-4 h-4 stroke-[2]" />
              </button>
              <button
                onClick={() => onDemoteToBacklog(task)}
                title="Move to Backlog"
                className="w-8 h-8 rounded-lg bg-[#FAF7F2] hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <ArrowDown className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </div>
        ))}

        {priorityTasks.length < 3 && (
          <button
            onClick={() => onOpenAddTask(priorityTasks.length)}
            className="w-full py-3 neo-card border-dashed bg-white hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-600"
          >
            <Plus className="w-4 h-4" />
            <span>Add Priority #{priorityTasks.length + 1}</span>
          </button>
        )}
      </div>

      {/* 4. Clean Quick Input & Tools */}
      <div className="pt-2 space-y-3">
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Quick add task..."
              className="w-full px-4 py-2.5 bg-white border-[1.75px] border-[#18181B] rounded-xl text-sm font-medium text-[#18181B] placeholder:text-slate-400 shadow-[1.5px_1.5px_0px_#18181B] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg border-[1.25px] border-[#18181B] ${
                isVoiceActive ? 'bg-red-400 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isVoiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="px-4 py-2.5 bg-[#FFE873] neo-btn text-xs text-[#18181B] cursor-pointer disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          {onOpenSmartBraindump && (
            <button
              onClick={() => {
                playClickSound();
                onOpenSmartBraindump();
              }}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 neo-btn flex items-center justify-center gap-1.5 text-xs text-[#18181B] cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Smart Braindump</span>
            </button>
          )}

          {onOpenEveningReview && (
            <button
              onClick={() => {
                playClickSound();
                onOpenEveningReview();
              }}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 neo-btn flex items-center justify-center gap-1.5 text-xs text-[#18181B] cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Day Wrap-up</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
