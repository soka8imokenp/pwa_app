import React, { useState, useMemo } from 'react';
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
import { getWeekDaysForDate } from '../../lib/dateUtils';
import { startVoiceDictation, stopVoiceDictation, isSpeechRecognitionSupported } from '../../lib/speechRecognition';
import { WeeklyActivityChart } from '../analytics/WeeklyActivityChart';
import { MiniFocusRing } from '../focus/MiniFocusRing';

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
  onSelectDate,
  priorityTasks,
  allTasks = [],
  focusSessions = [],
  onToggleComplete,
  onDemoteToBacklog,
  onDeleteTask,
  onOpenAddTask,
  onStartFocus,
  onLogFocusSession,
  onQuickCreateTask,
  onOpenSmartBraindump,
  onOpenEveningReview,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const weekDays = getWeekDaysForDate(selectedDate);
  const primaryTask = priorityTasks[0];
  const secondaryTasks = priorityTasks.slice(1, 3);
  const completedCount = priorityTasks.filter((t) => t.isCompleted).length;

  // Compute 7-day activity metrics for the interactive chart
  const chartDays = useMemo(() => {
    return weekDays.map((day) => {
      const dayTasks = allTasks.filter((t) => t.date === day.dateStr && t.isPriority);
      const dayCompleted = dayTasks.filter((t) => t.isCompleted).length;
      const rate = dayTasks.length > 0 ? Math.round((dayCompleted / dayTasks.length) * 100) : 0;

      const dayFocusMins = focusSessions
        .filter((s) => s.date === day.dateStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);

      return {
        dayShort: day.dayShort,
        dayNumber: day.dayNumber,
        dateStr: day.dateStr,
        completionRate: rate,
        focusMinutes: dayFocusMins,
        isToday: day.isToday,
        isSelected: day.isSelected,
      };
    });
  }, [weekDays, allTasks, focusSessions]);

  const totalWeeklyFocus = useMemo(() => {
    return chartDays.reduce((acc, d) => acc + d.focusMinutes, 0);
  }, [chartDays]);

  const handleDoneClick = (task: Task) => {
    playTaskCheckSound();
    onToggleComplete(task);

    if (!task.isCompleted) {
      setTimeout(() => {
        playSuccessChime();
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C084FC', '#BEF264', '#FED7AA', '#38BDF8', '#FEF08A'],
        });
      }, 100);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !onQuickCreateTask) return;

    playClickSound();
    await onQuickCreateTask({
      title: quickTitle.trim(),
      isPriority: priorityTasks.length < 3,
      isCompleted: false,
      date: selectedDate,
      category: 'general',
      estimatedMinutes: 30,
    });
    setQuickTitle('');
  };

  const handleToggleVoiceDictation = () => {
    playClickSound();
    if (isVoiceActive) {
      stopVoiceDictation();
      setIsVoiceActive(false);
    } else {
      setIsVoiceActive(true);
      startVoiceDictation({
        onTranscript: (text) => {
          setQuickTitle(text);
        },
        onError: () => setIsVoiceActive(false),
        onEnd: () => setIsVoiceActive(false),
      });
    }
  };

  const handleMiniSessionComplete = (minutes: number) => {
    if (onLogFocusSession) {
      onLogFocusSession({
        date: selectedDate,
        durationMinutes: minutes,
        mode: 'pomodoro',
        completedAt: Date.now(),
      });
    }
  };

  const getCategoryDetails = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'design':
      case 'ui':
        return { bg: '#FED7AA', icon: <Palette className="w-5 h-5 text-orange-950 stroke-[2.25]" /> };
      case 'learn':
        return { bg: '#BAE6FD', icon: <BookOpen className="w-5 h-5 text-sky-950 stroke-[2.25]" /> };
      case 'health':
      case 'fitness':
        return { bg: '#BEF264', icon: <Activity className="w-5 h-5 text-lime-950 stroke-[2.25]" /> };
      case 'code':
      case 'dev':
      default:
        return { bg: '#E9D5FF', icon: <Code className="w-5 h-5 text-purple-950 stroke-[2.25]" /> };
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-28 font-body select-none">
      
      {/* 1. Interactive Weekly Momentum & Focus Graph */}
      <WeeklyActivityChart
        days={chartDays}
        onSelectDate={onSelectDate}
        weeklyStreak={4}
        totalFocusTime={totalWeeklyFocus}
      />

      {/* 2. Clean Daily Priorities Section (Rule of 3) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black font-display uppercase tracking-wider text-slate-700">
              Daily Priorities
            </h2>
            <span className="text-[10px] font-extrabold font-mono-num px-2 py-0.5 rounded-full bg-white border border-[#18181B]/15 text-[#18181B]">
              {completedCount}/{priorityTasks.length} Done
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenEveningReview && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenEveningReview();
                }}
                className="text-[10px] font-black text-amber-900 bg-[#FEF08A] hover:bg-[#FDE047] px-2.5 py-0.5 rounded-full border border-[#18181B] shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                title="Evening Daily Wrap-up"
              >
                <Trophy className="w-3 h-3 text-amber-800 stroke-[2.25]" />
                <span>Debrief</span>
              </button>
            )}

            <span className="text-[10px] font-bold text-purple-800 font-mono-num bg-[#F5EEFF] px-2.5 py-0.5 rounded-full border border-[#18181B]/15">
              Rule of 3
            </span>
          </div>
        </div>

        {/* Priority Task Cards or Single Clean Empty State */}
        {priorityTasks.length > 0 ? (
          <div className="space-y-2.5">
            {/* Slot #1: Hero Capsule Card */}
            {primaryTask && (
              <div
                className={`bg-white border-[1.75px] border-[#18181B] rounded-[2rem] p-4 shadow-[2px_2px_0px_#18181B] relative transition-all ${
                  primaryTask.isCompleted ? 'opacity-85 bg-slate-50' : ''
                }`}
              >
                {/* Top Row with Lucide Icon Avatar Badge */}
                <div className="flex items-center gap-3 mb-2.5">
                  <div
                    className="w-12 h-12 rounded-full border-[1.75px] border-[#18181B] flex items-center justify-center shadow-[1.5px_1.5px_0px_#18181B] shrink-0"
                    style={{ backgroundColor: getCategoryDetails(primaryTask.category).bg }}
                  >
                    {getCategoryDetails(primaryTask.category).icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#FEF08A] text-[#18181B] border border-[#18181B] rounded-full text-[9px] font-black uppercase tracking-wider shadow-2xs flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-700 fill-amber-400 stroke-[2.25]" />
                        <span>Primary #1</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono-num flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-purple-700 stroke-[2.25]" />
                        {primaryTask.estimatedMinutes || 30}m
                      </span>
                    </div>
                    <h3
                      onClick={() => handleDoneClick(primaryTask)}
                      className={`text-base font-black font-display text-[#18181B] tracking-tight leading-snug cursor-pointer select-none truncate mt-0.5 ${
                        primaryTask.isCompleted ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {primaryTask.title}
                    </h3>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleDoneClick(primaryTask)}
                    className={`flex-1 py-2.5 px-4 rounded-full border-[1.75px] border-[#18181B] font-black font-display text-xs uppercase tracking-wider transition-all shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 cursor-pointer ${
                      primaryTask.isCompleted
                        ? 'bg-[#BEF264] text-[#18181B]'
                        : 'bg-[#C084FC] hover:bg-[#B366FA] text-[#18181B]'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{primaryTask.isCompleted ? 'Completed! Undo' : 'Mark Done'}</span>
                  </button>

                  <button
                    onClick={() => onStartFocus(primaryTask)}
                    title="Start Timer"
                    className="py-2.5 px-4 rounded-full bg-[#FAF7F2] hover:bg-purple-50 border-[1.75px] border-[#18181B] text-xs font-black font-display text-[#18181B] shadow-[1.5px_1.5px_0px_#18181B] active:translate-y-0.5 active:shadow-none flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Timer className="w-4 h-4 text-purple-800 stroke-[2.25]" />
                    <span>Timer</span>
                  </button>
                </div>
              </div>
            )}

            {/* Secondary Priorities (Slots #2 & #3) */}
            {secondaryTasks.map((task, idx) => (
              <div
                key={task.id || idx}
                className={`bg-white border-[1.75px] border-[#18181B] rounded-[2rem] p-3 shadow-[1.5px_1.5px_0px_#18181B] flex items-center justify-between gap-3 transition-all ${
                  task.isCompleted ? 'opacity-80 bg-slate-50' : 'hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleDoneClick(task)}
                    className={`w-10 h-10 rounded-full border-[1.75px] border-[#18181B] flex items-center justify-center shrink-0 transition-colors shadow-2xs cursor-pointer ${
                      task.isCompleted ? 'bg-[#BEF264]' : 'bg-[#FAF7F2] hover:bg-purple-100'
                    }`}
                  >
                    {task.isCompleted ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <span className="text-xs font-black text-slate-500">#{idx + 2}</span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <span
                      onClick={() => handleDoneClick(task)}
                      className={`text-xs font-extrabold truncate block cursor-pointer select-none ${
                        task.isCompleted ? 'line-through text-slate-400' : 'text-[#18181B]'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      Priority #{idx + 2}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onStartFocus(task)}
                    title="Start focus timer"
                    className="w-9 h-9 rounded-full bg-[#FAF5FF] border border-[#18181B] flex items-center justify-center hover:bg-purple-100 cursor-pointer shadow-2xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-[#18181B] stroke-[2.25]" />
                  </button>
                  <button
                    onClick={() => onDemoteToBacklog(task)}
                    title="Move to Backlog"
                    className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#18181B] cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5 stroke-[2.25]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Clean Single Empty State */
          <div className="bg-white border-[1.75px] border-[#18181B] rounded-[2rem] p-5 text-center shadow-[2px_2px_0px_#18181B] space-y-1.5">
            <div className="w-12 h-12 rounded-full bg-[#E9D5FF] border border-[#18181B] flex items-center justify-center mx-auto text-base shadow-2xs">
              <Crown className="w-6 h-6 text-purple-950 stroke-[2.25]" />
            </div>
            <h3 className="text-sm font-black font-display text-[#18181B]">
              No Priorities Set Yet
            </h3>
            <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto">
              Type your top focus below or use Smart Braindump.
            </p>
          </div>
        )}
      </div>

      {/* 3. Quick Add Bar with Voice Dictation & Braindump Spark Button */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-white border-[1.75px] border-[#18181B] rounded-full p-1.5 shadow-[2px_2px_0px_#18181B] flex items-center gap-1.5"
      >
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a priority outcome or speak..."
          className="flex-1 pl-4 pr-2 py-2 text-xs font-bold bg-transparent outline-none placeholder:text-slate-400"
        />

        {/* Voice Dictate Button */}
        {isSpeechRecognitionSupported() && (
          <button
            type="button"
            onClick={handleToggleVoiceDictation}
            className={`w-9 h-9 rounded-full border border-[#18181B]/20 flex items-center justify-center cursor-pointer transition-all shrink-0 ${
              isVoiceActive ? 'bg-rose-400 text-white animate-pulse' : 'bg-[#FAF7F2] text-slate-600 hover:bg-[#E9D5FF]'
            }`}
            title={isVoiceActive ? 'Stop Recording' : 'Voice Input'}
          >
            {isVoiceActive ? <MicOff className="w-3.5 h-3.5 stroke-[2.5]" /> : <Mic className="w-3.5 h-3.5 stroke-[2.5]" />}
          </button>
        )}

        {/* Smart Braindump Modal Trigger */}
        {onOpenSmartBraindump && (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenSmartBraindump();
            }}
            className="w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-[#FEF08A] text-[#18181B] border border-[#18181B]/20 flex items-center justify-center cursor-pointer shrink-0 shadow-2xs"
            title="Smart Braindump Parser"
          >
            <Wand2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}

        <button
          type="submit"
          disabled={!quickTitle.trim()}
          className="px-4 py-2 rounded-full bg-[#C084FC] hover:bg-[#B366FA] disabled:opacity-40 text-[#18181B] border-[1.5px] border-[#18181B] text-xs font-black shadow-xs active:translate-y-0.5 cursor-pointer shrink-0 transition-all flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Add</span>
        </button>
      </form>

      {/* 4. Live Interactive Mini Focus Engine */}
      <MiniFocusRing onSessionComplete={handleMiniSessionComplete} />

    </div>
  );
};
