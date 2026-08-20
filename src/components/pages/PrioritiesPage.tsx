import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
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
  Layers,
  Mic,
  MicOff,
  Repeat,
} from 'lucide-react';
import type { Task, FocusSession, HabitLog } from '../../types';
import { playTaskCheckSound, playSuccessChime, playClickSound } from '../../lib/sound';
import { startVoiceDictation, stopVoiceDictation, isSpeechRecognitionSupported } from '../../lib/speechRecognition';
import { DailyMoodAndNote } from '../planner/DailyMoodAndNote';
import { QuickScratchpadCard } from '../scratchpad/QuickScratchpadCard';
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
  onToggleSubTaskComplete?: (taskId: number, subTaskId: string) => void;
  onDemoteToBacklog: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onOpenAddTask: (prioritySlotIndex?: number) => void;
  onStartFocus: (task: Task) => void;
  onLogFocusSession?: (session: Omit<FocusSession, 'id'>) => Promise<any>;
  onQuickCreateTask?: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<any>;
}

export const PrioritiesPage: React.FC<PrioritiesPageProps> = ({
  selectedDate,
  priorityTasks,
  onToggleComplete,
  onToggleSubTaskComplete,
  onDemoteToBacklog,
  onOpenAddTask,
  onStartFocus,
  onQuickCreateTask,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);

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

  const handleSubTaskClick = (taskId?: number, subTaskId?: string) => {
    if (!taskId || !subTaskId || !onToggleSubTaskComplete) return;
    playTaskCheckSound();
    onToggleSubTaskComplete(taskId, subTaskId);
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
      alert('Голосовой ввод поддерживается в Chrome/Edge/Android.');
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
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  const SLOT_COLORS = ['#FFE873', '#E8DCFF', '#FED7AA'];

  return (
    <div className="w-full space-y-3.5 pb-24 font-body select-none">
      
      {/* 1. Daily Progress & Header */}
      <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Today's Focus
          </span>
          <h2 className="text-sm font-bold font-display text-[#18181B] mt-0.5">
            {completedCount} of {priorityTasks.length} Priorities Completed
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-20 bg-slate-100 border-[1.5px] border-[#18181B] h-3 rounded-full overflow-hidden p-0.5 shadow-2xs">
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

      {/* 2. Compact Daily Mood & Micro-Note */}
      <DailyMoodAndNote selectedDate={selectedDate} />

      {/* 3. Decorative Lottie Centerpiece Banner */}
      <div className="w-full flex items-center justify-center py-1 select-none pointer-events-none">
        <div className="w-40 h-40 flex items-center justify-center">
          <LottiePlayer
            animationData={stressManagementAnimation}
            loop={true}
            autoplay={true}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* 4. Top 3 Priorities Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black font-display uppercase tracking-wider text-slate-500">
            Top 3 Priorities
          </span>
          {priorityTasks.length < 3 && (
            <button
              onClick={() => onOpenAddTask(priorityTasks.length)}
              className="text-xs font-bold text-[#18181B] flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Slot
            </button>
          )}
        </div>

        {/* Priority Task Cards */}
        {priorityTasks.map((task, idx) => {
          const slotBg = SLOT_COLORS[idx] || '#FAF7F2';

          return (
            <div
              key={task.id || idx}
              className={`p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-[2px_2px_0px_#18181B] transition-all space-y-2.5 ${
                task.isCompleted ? 'bg-slate-50 opacity-75' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  {/* Slot Number Badge */}
                  <span
                    className="w-6 h-6 rounded-lg border border-[#18181B] flex items-center justify-center text-xs font-black text-[#18181B] shadow-2xs shrink-0 mt-0.5"
                    style={{ backgroundColor: slotBg }}
                  >
                    {idx + 1}
                  </span>

                  {/* Title & Metadata */}
                  <div className="min-w-0">
                    <h3
                      className={`text-sm font-bold text-[#18181B] leading-snug break-words ${
                        task.isCompleted ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {task.title}
                    </h3>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                        {getCategoryIcon(task.category)}
                        {task.category || 'general'}
                      </span>
                      <span className="text-[10px] text-slate-400">•</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Clock className="w-3 h-3" />
                        {task.estimatedMinutes || 30}m
                      </span>

                      {task.isRecurring && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#BEF264] border border-[#18181B] text-[9px] font-bold text-[#18181B]">
                          <Repeat className="w-2.5 h-2.5" /> Routine
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mark Done Checkbox */}
                <button
                  onClick={() => handleDoneClick(task)}
                  className={`w-8 h-8 rounded-xl border-[1.75px] border-[#18181B] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    task.isCompleted
                      ? 'bg-[#D1FBE4] text-[#18181B] shadow-[1px_1px_0px_#18181B]'
                      : 'bg-white hover:bg-slate-50 shadow-[1px_1px_0px_#18181B]'
                  }`}
                >
                  {task.isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              </div>

              {/* Subtasks Checklist (Interactive) */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="p-2.5 bg-[#FAF7F2] border border-[#18181B]/15 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Checklist</span>
                    <span>
                      {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length}
                    </span>
                  </div>
                  {task.subtasks.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSubTaskClick(task.id, st.id)}
                      className="w-full flex items-center gap-2 text-xs font-medium text-slate-700 text-left hover:bg-white/80 p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <div
                        className={`w-4 h-4 rounded border border-[#18181B] flex items-center justify-center shrink-0 ${
                          st.isCompleted ? 'bg-[#18181B] text-white' : 'bg-white'
                        }`}
                      >
                        {st.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className={`truncate ${st.isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {st.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Focus Button & Move to Backlog */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#18181B]/10">
                <button
                  onClick={() => onStartFocus(task)}
                  className="px-3 py-1 bg-[#E8DCFF] hover:bg-[#D8C4FF] border border-[#18181B] rounded-lg text-xs font-bold text-[#18181B] flex items-center gap-1.5 shadow-2xs cursor-pointer active:translate-y-0.5"
                >
                  <Play className="w-3 h-3 fill-[#18181B]" />
                  <span>Start Focus</span>
                </button>

                <button
                  onClick={() => onDemoteToBacklog(task)}
                  title="Move to Backlog"
                  className="px-2 py-1 bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] rounded-lg text-[10px] font-bold text-slate-600 flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>Backlog</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Minimalist Quick Add Input */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick add new task..."
            className="w-full px-3.5 py-2.5 bg-white border-[1.75px] border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] placeholder:text-slate-400 shadow-[1.5px_1.5px_0px_#18181B] focus:outline-none"
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
          className="px-4 py-2.5 bg-[#FFE873] hover:bg-[#FED7AA] border-[1.75px] border-[#18181B] rounded-xl text-xs font-black text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] cursor-pointer disabled:opacity-50 active:translate-y-0.5 transition-all"
        >
          Add
        </button>
      </form>

      {/* 6. Bottom Quick Scratchpad Card */}
      <div className="pt-2">
        <QuickScratchpadCard
          selectedDate={selectedDate}
          onQuickCreateTask={onQuickCreateTask}
        />
      </div>

    </div>
  );
};
