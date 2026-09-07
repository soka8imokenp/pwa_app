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
  ArrowUp,
  Clock,
  Layers,
  Repeat,
  ChevronUp,
  ChevronDown,
  Inbox,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { Task, FocusSession, HabitLog } from '../../types';
import { playTaskCheckSound, playSuccessChime, playClickSound } from '../../lib/sound';
import { DailyMoodAndNote } from '../planner/DailyMoodAndNote';
import { QuickScratchpadCard } from '../scratchpad/QuickScratchpadCard';

interface PrioritiesPageProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  priorityTasks: Task[];
  backlogTasks?: Task[];
  canAddPriority?: boolean;
  allTasks?: Task[];
  focusSessions?: FocusSession[];
  habitLogs?: HabitLog[];
  onToggleComplete: (task: Task) => void;
  onToggleSubTaskComplete?: (taskId: number, subTaskId: string) => void;
  onDemoteToBacklog: (task: Task) => void;
  onPromoteToPriority?: (task: Task) => void;
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
  backlogTasks = [],
  onToggleComplete,
  onToggleSubTaskComplete,
  onDemoteToBacklog,
  onPromoteToPriority,
  onDeleteTask,
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

  const CATEGORY_CONFIG = [
    { id: 'general', label: 'General', icon: Layers, bg: '#FAF8F5', text: '#6B635B' },
    { id: 'code', label: 'Code', icon: Code, bg: '#DDE8DE', text: '#2D503C' },
    { id: 'design', label: 'Design', icon: Palette, bg: '#F7E3DC', text: '#C25E40' },
    { id: 'learn', label: 'Learn', icon: BookOpen, bg: '#FBECCF', text: '#854D0E' },
    { id: 'health', label: 'Health', icon: Activity, bg: '#DDE8DE', text: '#2D503C' },
  ] as const;

  // Backlog integration states
  const [quickBacklogTitle, setQuickBacklogTitle] = useState('');
  const [quickBacklogCategory, setQuickBacklogCategory] = useState<Task['category']>('general');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [showCompletedBacklog, setShowCompletedBacklog] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const currentCategoryConfig = CATEGORY_CONFIG.find((c) => c.id === quickBacklogCategory) || CATEGORY_CONFIG[0];
  const CurrentCategoryIcon = currentCategoryConfig.icon;

  const activeBacklogTasks = backlogTasks.filter((t) => !t.isCompleted);
  const completedBacklogTasks = backlogTasks.filter((t) => t.isCompleted);

  const handlePromote = (task: Task) => {
    if (localPriorities.length >= 3) {
      playClickSound();
      setFeedbackNotice('Top 3 slots are full! Move one to Backlog first.');
      setTimeout(() => setFeedbackNotice(null), 3500);
      return;
    }
    playSuccessChime();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#3D6B52', '#E09F3E', '#F0BB58', '#476C85'],
    });
    onPromoteToPriority?.(task);
  };

  const handleDemote = (task: Task) => {
    playClickSound();
    onDemoteToBacklog(task);
  };

  const handleAddBacklogInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBacklogTitle.trim() || !onQuickCreateTask) return;
    playClickSound();
    await onQuickCreateTask({
      title: quickBacklogTitle.trim(),
      category: quickBacklogCategory || 'general',
      estimatedMinutes: 30,
      isPriority: false,
      isCompleted: false,
      date: selectedDate,
    });
    setQuickBacklogTitle('');
  };

  const getCategoryBg = (category?: string) => {
    switch (category) {
      case 'code':
        return '#DDE8DE';
      case 'design':
        return '#F7E3DC';
      case 'health':
        return '#DDE8DE';
      case 'learn':
        return '#FBECCF';
      default:
        return '#FAF8F5';
    }
  };

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
                  onClick={() => handleDemote(task)}
                  title="Move to Backlog"
                  className="px-2.5 py-1 bg-[#F4F0EA] hover:bg-stone-200 border border-[#24201D] rounded-lg text-[10px] font-bold text-[#6B635B] flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95 transition-all"
                >
                  <ArrowDown className="w-3 h-3 text-[#24201D]" />
                  <span>To Backlog</span>
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

      {/* 5. Integrated Task Backlog Section */}
      <div id="backlog-section" className="space-y-2.5 pt-1">
        {/* Backlog Header Bar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border-[1.5px] border-[#24201D] flex items-center justify-center shadow-[1px_1px_0px_#24201D]">
              <Inbox className="w-3.5 h-3.5 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Task Backlog
              </span>
              <span className="px-2 py-0.5 bg-[#FAF8F5] border border-[#24201D]/25 rounded-full text-[10px] font-black font-mono-num text-[#6B635B] shadow-2xs">
                {activeBacklogTasks.length}
              </span>
            </div>
          </div>
        </div>

        {/* Temporary Feedback Notice */}
        {feedbackNotice && (
          <div className="p-3 bg-[#FBECCF] border-[1.75px] border-[#24201D] rounded-2xl text-xs font-bold text-[#24201D] flex items-center justify-between shadow-[2px_2px_0px_#24201D] animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C25E40] shrink-0" />
              <span>{feedbackNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackNotice(null)}
              className="text-[10px] uppercase font-black px-2 py-1 bg-white border border-[#24201D] rounded-lg shadow-2xs cursor-pointer active:scale-95 ml-2"
            >
              OK
            </button>
          </div>
        )}

        {/* Quick Inline Add Form with Custom Neo-Brutalist Dropdown */}
        <div className="relative">
          <form
            onSubmit={handleAddBacklogInline}
            className="p-2 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex items-center gap-2 transition-all focus-within:shadow-[3px_3px_0px_#24201D]"
          >
            <input
              type="text"
              value={quickBacklogTitle}
              onChange={(e) => setQuickBacklogTitle(e.target.value)}
              placeholder="Quick add to backlog..."
              className="flex-1 min-w-0 px-2.5 py-1.5 bg-transparent text-xs font-bold text-[#24201D] placeholder:text-[#8C827A] placeholder:font-normal focus:outline-none"
            />

            {/* Custom Category Dropdown Trigger */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#24201D] text-[10px] font-black uppercase tracking-tight shadow-2xs cursor-pointer active:scale-95 transition-all"
                style={{ backgroundColor: currentCategoryConfig.bg, color: currentCategoryConfig.text }}
              >
                <CurrentCategoryIcon className="w-3 h-3 stroke-[2.5]" />
                <span>{currentCategoryConfig.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Custom Popover Dropdown Panel */}
              {isCategoryDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsCategoryDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[3px_3px_0px_#24201D] p-1.5 min-w-[145px] space-y-1 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#8C827A] border-b border-[#24201D]/10">
                      Category
                    </div>
                    {CATEGORY_CONFIG.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = quickBacklogCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setQuickBacklogCategory(cat.id as any);
                            setIsCategoryDropdownOpen(false);
                            playClickSound();
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FAF8F5] border border-[#24201D] shadow-2xs text-[#24201D]'
                              : 'hover:bg-[#FAF8F5] text-[#24201D] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded-lg border border-[#24201D]/20 flex items-center justify-center shrink-0"
                              style={{ backgroundColor: cat.bg, color: cat.text }}
                            >
                              <Icon className="w-3 h-3 stroke-[2.5]" />
                            </div>
                            <span className="text-[11px] font-bold">{cat.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#3D6B52] stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={!quickBacklogTitle.trim()}
              className="px-3.5 py-1.5 bg-[#3D6B52] hover:bg-[#325843] disabled:opacity-30 disabled:hover:bg-[#3D6B52] border-[1.5px] border-[#24201D] rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-[1px_1px_0px_#24201D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
            >
              Add
            </button>
          </form>
        </div>

        {/* Active Backlog Tasks List */}
        {activeBacklogTasks.length === 0 ? (
          <div className="p-4 bg-white/70 border-[1.75px] border-dashed border-[#24201D]/25 rounded-2xl text-center space-y-1 shadow-2xs">
            <p className="text-xs font-bold text-[#6B635B]">Backlog is currently empty</p>
            <p className="text-[10px] text-stone-400 font-medium">
              Queue secondary tasks here or demote priorities anytime.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeBacklogTasks.map((task) => {
              const catConfig = CATEGORY_CONFIG.find((c) => c.id === task.category) || CATEGORY_CONFIG[0];
              const CatIcon = catConfig.icon;

              return (
                <div
                  key={task.id}
                  className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex items-center justify-between gap-2.5 transition-all hover:translate-x-0.5"
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleDoneClick(task)}
                    className="w-6 h-6 rounded-xl border-[1.75px] border-[#24201D] bg-white hover:bg-stone-100 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-2xs"
                  >
                    {task.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3] text-[#3D6B52]" />}
                  </button>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border border-[#24201D]/20 shadow-2xs"
                        style={{ backgroundColor: catConfig.bg, color: catConfig.text }}
                      >
                        <CatIcon className="w-2.5 h-2.5 stroke-[2.5]" />
                        {catConfig.label}
                      </span>
                      <span className="text-[10px] text-[#8C827A] font-mono-num flex items-center gap-0.5 font-bold">
                        <Clock className="w-2.5 h-2.5" /> {task.estimatedMinutes || 30}m
                      </span>
                    </div>
                    <p className={`text-xs font-bold text-[#24201D] truncate leading-tight ${task.isCompleted ? 'line-through text-stone-400' : ''}`}>
                      {task.title}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Promote to Top 3 Priorities */}
                    <button
                      type="button"
                      onClick={() => handlePromote(task)}
                      title={localPriorities.length < 3 ? "Promote to Top 3 Priorities" : "Top 3 is full"}
                      className={`px-2.5 py-1 rounded-xl border-[1.5px] border-[#24201D] text-[10px] font-black uppercase tracking-tight flex items-center gap-1 shadow-[1px_1px_0px_#24201D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer ${
                        localPriorities.length < 3
                          ? 'bg-[#F0BB58] hover:bg-[#e2af51] text-[#24201D]'
                          : 'bg-stone-100 text-stone-400 border-stone-300 shadow-none cursor-not-allowed'
                      }`}
                    >
                      <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                      <span>To Today</span>
                    </button>

                    {/* Quick Focus Button */}
                    <button
                      type="button"
                      onClick={() => onStartFocus(task)}
                      title="Start Focus Session"
                      className="w-7 h-7 rounded-xl bg-[#FAF8F5] hover:bg-[#F7E3DC] border-[1.5px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-[1px_1px_0px_#24201D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-[#24201D]" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => task.id && onDeleteTask(task.id)}
                      title="Delete task"
                      className="w-7 h-7 rounded-xl bg-[#FAF8F5] hover:bg-rose-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-[#8C827A] hover:text-rose-600 shadow-[1px_1px_0px_#24201D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 stroke-[2]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed Backlog Tasks Panel in our Style */}
        {completedBacklogTasks.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowCompletedBacklog((prev) => !prev);
              }}
              className="w-full py-2 px-3.5 bg-white hover:bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex items-center justify-between text-xs font-bold text-[#6B635B] transition-all cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3D6B52]" />
                <span className="font-display uppercase tracking-wider text-[10px] font-black text-[#24201D]">
                  Completed Backlog ({completedBacklogTasks.length})
                </span>
              </div>
              <div className="w-5 h-5 rounded-lg bg-[#FAF8F5] border border-[#24201D]/25 flex items-center justify-center text-[#24201D]">
                {showCompletedBacklog ? (
                  <ChevronUp className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-3 h-3 stroke-[2.5]" />
                )}
              </div>
            </button>

            {showCompletedBacklog && (
              <div className="space-y-2 mt-2 p-2 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D]">
                {completedBacklogTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 bg-white border border-[#24201D]/20 rounded-xl flex items-center justify-between gap-2.5 shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleDoneClick(task)}
                      className="w-5 h-5 rounded-lg border-[1.5px] border-[#24201D] bg-[#3D6B52] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span className="flex-1 text-xs line-through truncate text-stone-400 font-medium">
                      {task.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => task.id && onDeleteTask(task.id)}
                      className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
