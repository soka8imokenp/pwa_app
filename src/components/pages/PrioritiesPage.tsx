import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
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
  Repeat,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { Task, FocusSession, HabitLog } from '../../types';
import { playTaskCheckSound, playSuccessChime, playClickSound } from '../../lib/sound';
import { DailyMoodAndNote } from '../planner/DailyMoodAndNote';
import { QuickScratchpadCard } from '../scratchpad/QuickScratchpadCard';

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
  onReorderPriority?: (sourceIndex: number, targetIndex: number) => void;
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
  onReorderPriority,
  onQuickCreateTask,
}) => {
  const [localPriorities, setLocalPriorities] = useState<Task[]>(priorityTasks);

  React.useEffect(() => {
    setLocalPriorities(priorityTasks);
  }, [priorityTasks]);

  const handleReorder = (sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;
    if (sourceIndex < 0 || sourceIndex >= localPriorities.length) return;
    if (targetIndex < 0 || targetIndex >= localPriorities.length) return;

    playClickSound();

    // 1. Instant optimistic local update
    const updated = [...localPriorities];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setLocalPriorities(updated);

    // 2. Persist to DB
    onReorderPriority?.(sourceIndex, targetIndex);
  };

  const completedCount = localPriorities.filter((t) => t.isCompleted).length;
  const progressPercent = localPriorities.length > 0 ? Math.round((completedCount / localPriorities.length) * 100) : 0;

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
          colors: ['#3D6B52', '#E09F3E', '#F0BB58', '#476C85'],
        });
      }
    }
  };

  const handleSubTaskClick = (taskId?: number, subTaskId?: string) => {
    if (!taskId || !subTaskId || !onToggleSubTaskComplete) return;
    playTaskCheckSound();
    onToggleSubTaskComplete(taskId, subTaskId);
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

  const SLOT_COLORS = ['#FBECCF', '#DDE8DE', '#F7E3DC'];

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      
      {/* 1. Daily Progress & Header */}
      <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block font-display">
            Daily Focus
          </span>
          <h2 className="text-sm font-bold font-display text-[#24201D] mt-0.5">
            {completedCount} of {priorityTasks.length} Priorities Completed
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-20 bg-[#F4F0EA] border-[1.5px] border-[#24201D] h-3 rounded-full overflow-hidden p-0.5 shadow-2xs">
            <div
              className="bg-[#3D6B52] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold font-mono-num text-[#24201D]">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* 2. Compact Daily Mood & Micro-Note */}
      <DailyMoodAndNote selectedDate={selectedDate} />

      {/* 3. Top 3 Priorities Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
            Top 3 Priorities ({localPriorities.length}/3)
          </span>
        </div>

        {/* Priority Task Cards */}
        {localPriorities.map((task, idx) => {
          const slotBg = SLOT_COLORS[idx] || '#F4F0EA';

          return (
            <div
              key={task.id || idx}
              className={`p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] transition-all space-y-3 ${
                task.isCompleted ? 'bg-stone-50/80 opacity-75' : ''
              }`}
            >
              {/* Top Priority Slot Header Bar */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#24201D]/10">
                <div className="flex items-center gap-2">
                  {/* Slot Number Badge */}
                  <span
                    className="px-2.5 py-1 rounded-xl border border-[#24201D] text-xs font-black font-mono-num shadow-2xs text-[#24201D]"
                    style={{ backgroundColor: slotBg }}
                  >
                    Priority #{idx + 1}
                  </span>

                  {/* Direct Switcher: Move to 1, 2, 3 */}
                  {localPriorities.length > 1 && (
                    <div className="flex items-center gap-1 bg-[#F4F0EA] p-0.5 rounded-xl border border-[#24201D]/25">
                      <span className="text-[9px] font-black text-[#6B635B] px-1 uppercase tracking-tight">
                        Move:
                      </span>
                      {localPriorities.map((_, targetSlot) => {
                        const isCurrent = targetSlot === idx;
                        return (
                          <button
                            key={targetSlot}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleReorder(idx, targetSlot)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono-num transition-all ${
                              isCurrent
                                ? 'bg-[#24201D] text-white shadow-2xs cursor-default'
                                : 'bg-white hover:bg-stone-100 text-[#24201D] border border-[#24201D]/20 cursor-pointer active:scale-90'
                            }`}
                          >
                            #{targetSlot + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Big, comfortable Up / Down buttons */}
                {localPriorities.length > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleReorder(idx, idx - 1)}
                      title="Move up"
                      className="w-7 h-7 rounded-xl bg-[#FAF8F5] hover:bg-[#DDE8DE] disabled:opacity-30 disabled:hover:bg-[#FAF8F5] disabled:cursor-not-allowed border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    <button
                      type="button"
                      disabled={idx === localPriorities.length - 1}
                      onClick={() => handleReorder(idx, idx + 1)}
                      title="Move down"
                      className="w-7 h-7 rounded-xl bg-[#FAF8F5] hover:bg-[#DDE8DE] disabled:opacity-30 disabled:hover:bg-[#FAF8F5] disabled:cursor-not-allowed border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                )}
              </div>

              {/* Title, Metadata & Complete Checkbox */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-sm font-bold text-[#24201D] leading-snug break-words ${
                      task.isCompleted ? 'line-through text-stone-400' : ''
                    }`}
                  >
                    {task.title}
                  </h3>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B635B] uppercase">
                      {getCategoryIcon(task.category)}
                      {task.category || 'general'}
                    </span>
                    <span className="text-[10px] text-stone-400">•</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B635B]">
                      <Clock className="w-3 h-3" />
                      {task.estimatedMinutes || 30}m
                    </span>

                    {task.isRecurring && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#DDE8DE] border border-[#24201D] text-[9px] font-bold text-[#24201D]">
                        <Repeat className="w-2.5 h-2.5" /> Routine
                      </span>
                    )}
                  </div>
                </div>

                {/* Mark Done Checkbox */}
                <button
                  onClick={() => handleDoneClick(task)}
                  className={`w-8 h-8 rounded-xl border-[1.75px] border-[#24201D] flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    task.isCompleted
                      ? 'bg-[#3D6B52] text-white shadow-[1px_1px_0px_#24201D]'
                      : 'bg-white hover:bg-[#F4F0EA] shadow-[1px_1px_0px_#24201D]'
                  }`}
                >
                  {task.isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              </div>

              {/* Subtasks Checklist */}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/15 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#6B635B] uppercase tracking-wider">
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
                      className="w-full flex items-center gap-2 text-xs font-medium text-[#24201D] text-left hover:bg-white/80 p-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <div
                        className={`w-4 h-4 rounded border border-[#24201D] flex items-center justify-center shrink-0 ${
                          st.isCompleted ? 'bg-[#3D6B52] text-white' : 'bg-white'
                        }`}
                      >
                        {st.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className={`truncate ${st.isCompleted ? 'line-through text-stone-400' : ''}`}>
                        {st.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Focus Button & Move to Backlog */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#24201D]/10">
                <button
                  onClick={() => onStartFocus(task)}
                  className="px-3 py-1 bg-[#F7E3DC] hover:bg-[#EED5CE] border border-[#24201D] rounded-lg text-xs font-bold text-[#24201D] flex items-center gap-1.5 shadow-2xs cursor-pointer active:translate-y-0.5"
                >
                  <Play className="w-3 h-3 fill-[#24201D]" />
                  <span>Start Focus</span>
                </button>

                <button
                  onClick={() => onDemoteToBacklog(task)}
                  title="Move to Backlog"
                  className="px-2 py-1 bg-[#F4F0EA] hover:bg-stone-200 border border-[#24201D] rounded-lg text-[10px] font-bold text-[#6B635B] flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <ArrowDown className="w-3 h-3" />
                  <span>Backlog</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Add Priority Goal Slot Button (if < 3) */}
      {localPriorities.length < 3 && (
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenAddTask(localPriorities.length);
          }}
          className="w-full py-3.5 px-4 bg-[#FAF8F5] hover:bg-[#F4F0EA] border-[1.75px] border-dashed border-[#24201D]/35 hover:border-[#24201D] rounded-2xl flex items-center justify-center gap-2.5 text-xs font-black text-[#24201D] shadow-2xs hover:shadow-[2px_2px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all font-display uppercase tracking-wider"
        >
          <div className="w-5 h-5 rounded-lg bg-[#3D6B52] text-white flex items-center justify-center shadow-2xs">
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span>Add Priority Goal #{localPriorities.length + 1}</span>
        </button>
      )}

      {/* 5. Bottom Quick Scratchpad Card */}
      <div className="pt-2">
        <QuickScratchpadCard
          selectedDate={selectedDate}
          onQuickCreateTask={onQuickCreateTask}
        />
      </div>

    </div>
  );
};
