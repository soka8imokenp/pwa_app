import React, { useState, useMemo } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import {
  Sparkles,
  Trophy,
  Flame,
  Target,
  Clock,
  Zap,
  TrendingUp,
  BarChart3,
  PieChart,
  CheckCircle2,
  Calendar,
  Share2,
  Award,
  Crown,
  Code,
  Palette,
  BookOpen,
  Activity,
  Check,
  Sword,
} from 'lucide-react';
import type { Task, HabitLog, FocusSession } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface StatsPageProps {
  tasks: Task[];
  habitLogs: HabitLog[];
  focusSessions: FocusSession[];
  onSelectDate: (dateStr: string) => void;
}

type Timeframe = '7d' | '30d' | '90d' | 'all';

interface AchievementItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  iconBg: string;
  unlocked: boolean;
  xp: string;
  progress: number;
  maxProgress: number;
}

export const StatsPage: React.FC<StatsPageProps> = ({
  tasks,
  habitLogs,
  focusSessions,
  onSelectDate,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [copiedShare, setCopiedShare] = useState(false);
  const [inspectedDate, setInspectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // 1. Timeframe Filtering Math
  const timeframeDays = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;

  const filteredTasks = useMemo(() => {
    if (timeframe === 'all') return tasks;
    const cutoff = subDays(new Date(), timeframeDays);
    return tasks.filter((t) => parseISO(t.date) >= cutoff);
  }, [tasks, timeframe, timeframeDays]);

  const filteredFocusSessions = useMemo(() => {
    if (timeframe === 'all') return focusSessions;
    const cutoff = subDays(new Date(), timeframeDays);
    return focusSessions.filter((s) => parseISO(s.date) >= cutoff);
  }, [focusSessions, timeframe, timeframeDays]);

  const filteredHabitLogs = useMemo(() => {
    if (timeframe === 'all') return habitLogs;
    const cutoff = subDays(new Date(), timeframeDays);
    return habitLogs.filter((l) => parseISO(l.date) >= cutoff);
  }, [habitLogs, timeframe, timeframeDays]);

  // 2. Metrics calculation
  const totalTasksDone = filteredTasks.filter((t) => t.isCompleted).length;
  const totalTasksCount = filteredTasks.length;
  const taskCompletionRate = totalTasksCount > 0 ? Math.round((totalTasksDone / totalTasksCount) * 100) : 0;

  const totalHabitChecks = filteredHabitLogs.filter((l) => l.completed).length;
  const totalFocusMinutes = filteredFocusSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

  // Productivity Score Calculation (0-100)
  const productivityScore = Math.min(
    100,
    Math.round(
      (taskCompletionRate * 0.5) +
      Math.min(totalHabitChecks * 3, 30) +
      Math.min((totalFocusMinutes / 60) * 4, 20)
    )
  );

  // 3. 11-Week (77 Days) Heatmap Data
  const totalHeatmapDays = 77;
  const heatmapDays = useMemo(() => {
    return Array.from({ length: totalHeatmapDays }).map((_, i) => {
      const d = subDays(new Date(), totalHeatmapDays - 1 - i);
      const dateStr = format(d, 'yyyy-MM-dd');

      const dayTasks = tasks.filter((t) => t.date === dateStr);
      const completedTasks = dayTasks.filter((t) => t.isCompleted).length;
      const completedHabits = habitLogs.filter((l) => l.date === dateStr && l.completed).length;
      const focusMins = focusSessions
        .filter((s) => s.date === dateStr)
        .reduce((acc, s) => acc + s.durationMinutes, 0);

      const rawScore = completedTasks * 2 + completedHabits * 1.5 + focusMins / 15;

      let level = 0;
      if (rawScore > 0) level = 1;
      if (rawScore >= 3) level = 2;
      if (rawScore >= 6) level = 3;
      if (rawScore >= 9) level = 4;

      return {
        dateStr,
        dayTasks,
        completedTasks,
        completedHabits,
        focusMins,
        rawScore,
        level,
        isSelected: dateStr === inspectedDate,
      };
    });
  }, [tasks, habitLogs, focusSessions, inspectedDate]);

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-[#E9D5FF] border-[#18181B]/40';
      case 2:
        return 'bg-[#C084FC] border-[#18181B] shadow-[1px_1px_0px_#18181B]';
      case 3:
        return 'bg-[#BEF264] border-[#18181B] shadow-[1px_1px_0px_#18181B]';
      case 4:
        return 'bg-[#FED7AA] border-[#18181B] shadow-[1.5px_1.5px_0px_#18181B]';
      default:
        return 'bg-[#FAF7F2] border-slate-200';
    }
  };

  // 4. Inspected Day Details
  const inspectedDayDetails = useMemo(() => {
    const dayTasks = tasks.filter((t) => t.date === inspectedDate);
    const dayHabits = habitLogs.filter((l) => l.date === inspectedDate && l.completed);
    const dayFocus = focusSessions.filter((s) => s.date === inspectedDate);
    const totalFocus = dayFocus.reduce((acc, s) => acc + s.durationMinutes, 0);

    return {
      date: inspectedDate,
      tasks: dayTasks,
      completedTasks: dayTasks.filter((t) => t.isCompleted),
      habitsCount: dayHabits.length,
      focusSessions: dayFocus,
      totalFocusMins: totalFocus,
    };
  }, [inspectedDate, tasks, habitLogs, focusSessions]);

  // 5. Category Distribution Breakdown with Lucide Icons
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = { code: 0, design: 0, learn: 0, health: 0 };
    filteredTasks.forEach((t) => {
      const cat = t.category || 'code';
      if (counts[cat] !== undefined) counts[cat]++;
      else counts.code++;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return [
      { id: 'code', name: 'Dev & Code', count: counts.code, pct: Math.round((counts.code / total) * 100), color: '#C084FC', icon: <Code className="w-4 h-4 text-purple-950 stroke-[2.25]" /> },
      { id: 'design', name: 'UI & Design', count: counts.design, pct: Math.round((counts.design / total) * 100), color: '#FED7AA', icon: <Palette className="w-4 h-4 text-orange-950 stroke-[2.25]" /> },
      { id: 'learn', name: 'Learning & Books', count: counts.learn, pct: Math.round((counts.learn / total) * 100), color: '#BAE6FD', icon: <BookOpen className="w-4 h-4 text-sky-950 stroke-[2.25]" /> },
      { id: 'health', name: 'Health & Vitality', count: counts.health, pct: Math.round((counts.health / total) * 100), color: '#BEF264', icon: <Activity className="w-4 h-4 text-lime-950 stroke-[2.25]" /> },
    ];
  }, [filteredTasks]);

  // 6. Achievements with Lucide Icons
  const achievements: AchievementItem[] = useMemo(() => {
    const totalCompleted = tasks.filter((t) => t.isCompleted).length;
    const maxHabits = habitLogs.filter((l) => l.completed).length;
    const focusHoursNum = Math.floor(focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60);

    return [
      {
        id: 'first_3',
        title: 'Rule of 3 Master',
        desc: 'Complete all 3 priorities in a single day',
        icon: <Target className="w-5 h-5 text-purple-950 stroke-[2.25]" />,
        iconBg: '#E9D5FF',
        unlocked: true,
        xp: '+250 XP',
        progress: 3,
        maxProgress: 3,
      },
      {
        id: 'streak_7',
        title: '7-Day Unstoppable',
        desc: 'Complete at least 14 daily habit check-ins',
        icon: <Flame className="w-5 h-5 text-amber-700 stroke-[2.25]" />,
        iconBg: '#FEF08A',
        unlocked: maxHabits >= 14,
        xp: '+500 XP',
        progress: Math.min(maxHabits, 14),
        maxProgress: 14,
      },
      {
        id: 'deep_10',
        title: '10h Deep Flow Club',
        desc: 'Log over 10 hours of focused Pomodoro work',
        icon: <Clock className="w-5 h-5 text-lime-950 stroke-[2.25]" />,
        iconBg: '#BEF264',
        unlocked: focusHoursNum >= 10,
        xp: '+750 XP',
        progress: Math.min(focusHoursNum, 10),
        maxProgress: 10,
      },
      {
        id: 'vault_50',
        title: 'Vault Slayer',
        desc: 'Complete 50 tasks across all projects',
        icon: <Crown className="w-5 h-5 text-orange-950 stroke-[2.25]" />,
        iconBg: '#FED7AA',
        unlocked: totalCompleted >= 50,
        xp: '+1,000 XP',
        progress: Math.min(totalCompleted, 50),
        maxProgress: 50,
      },
    ];
  }, [tasks, habitLogs, focusSessions]);

  const handleShareStats = () => {
    playSuccessChime();
    const summaryText = `⚡ Productivity Score: ${productivityScore}/100 (Grade A+)\n🎯 Quests Done: ${totalTasksDone}\n🔥 Habit Consistency: ${totalHabitChecks} checks\n⏱️ Deep Flow: ${totalFocusHours} hours\nTracked with Pragmatic Planner!`;
    navigator.clipboard.writeText(summaryText);
    setCopiedShare(true);
    confetti({
      particleCount: 75,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#BEF264', '#C084FC', '#FED7AA', '#38BDF8'],
    });
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleTrophyClick = (ach: AchievementItem) => {
    playSuccessChime();
    if (ach.unlocked) {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FEF08A', '#BEF264', '#C084FC'],
      });
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-28 font-body select-none">
      
      {/* 1. Timeframe Selector Capsule Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 p-1 bg-white/95 border-[1.75px] border-[#18181B] rounded-full shadow-[2px_2px_0px_#18181B]">
          {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                playClickSound();
                setTimeframe(tf);
              }}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                timeframe === tf
                  ? 'bg-[#C084FC] text-[#18181B] border border-[#18181B] shadow-2xs'
                  : 'text-slate-500 hover:text-[#18181B]'
              }`}
            >
              {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : tf === '90d' ? '3 Months' : 'All Time'}
            </button>
          ))}
        </div>

        <button
          onClick={handleShareStats}
          className="h-9 px-3.5 rounded-full bg-white hover:bg-[#FAF5FF] border-[1.75px] border-[#18181B] text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 transition-all cursor-pointer shrink-0"
          title="Share Summary"
        >
          {copiedShare ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              <span className="text-emerald-700">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 stroke-[2.25]" />
              <span>Share</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Player Level & Productivity Grade Hero Capsule */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2.25rem] p-4 shadow-[2.5px_2.5px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FEF08A] to-[#FED7AA] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs shrink-0">
              <Zap className="w-6 h-6 text-amber-950 fill-amber-400 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                  Level 14 Focus Architect
                </span>
                <span className="text-[9px] font-black text-lime-950 bg-[#BEF264] px-2 py-0.5 rounded-full border border-[#18181B]/20 font-mono-num">
                  Grade A+ ({productivityScore}%)
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Top 5% productivity score in {timeframe.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-black font-mono-num text-[#18181B]">
              3,450
            </span>
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block font-mono-num">
              / 5,000 XP
            </span>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="w-full h-2.5 bg-[#FAF7F2] rounded-full border border-slate-200 overflow-hidden p-0.5">
          <div
            style={{ width: '69%' }}
            className="h-full rounded-full bg-[#C084FC] border border-[#18181B] transition-all duration-500"
          />
        </div>
      </div>

      {/* 3. 3-Stat Velocity & Completion Grid with Lucide Icons */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[1.75rem] p-3.5 text-center shadow-[2px_2px_0px_#18181B] space-y-0.5">
          <div className="w-8 h-8 rounded-full bg-[#E9D5FF] border border-[#18181B] flex items-center justify-center mx-auto text-xs shadow-2xs">
            <Target className="w-4 h-4 text-purple-950 stroke-[2.25]" />
          </div>
          <span className="text-xl font-black font-mono-num text-[#18181B] block">
            {totalTasksDone}
          </span>
          <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Quests Done
          </span>
          <span className="text-[8px] font-bold text-purple-800 font-mono-num block">
            {taskCompletionRate}% rate
          </span>
        </div>

        <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[1.75rem] p-3.5 text-center shadow-[2px_2px_0px_#18181B] space-y-0.5">
          <div className="w-8 h-8 rounded-full bg-[#FEF08A] border border-[#18181B] flex items-center justify-center mx-auto text-xs shadow-2xs">
            <Flame className="w-4 h-4 text-amber-700 stroke-[2.25]" />
          </div>
          <span className="text-xl font-black font-mono-num text-[#18181B] block">
            {totalHabitChecks}
          </span>
          <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Habit Checks
          </span>
          <span className="text-[8px] font-bold text-amber-800 font-mono-num block">
            Discipline
          </span>
        </div>

        <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[1.75rem] p-3.5 text-center shadow-[2px_2px_0px_#18181B] space-y-0.5">
          <div className="w-8 h-8 rounded-full bg-[#BEF264] border border-[#18181B] flex items-center justify-center mx-auto text-xs shadow-2xs">
            <Clock className="w-4 h-4 text-lime-950 stroke-[2.25]" />
          </div>
          <span className="text-xl font-black font-mono-num text-[#18181B] block">
            {totalFocusHours}h
          </span>
          <span className="text-[9px] font-extrabold uppercase text-slate-400 block tracking-wider">
            Deep Flow Time
          </span>
          <span className="text-[8px] font-bold text-lime-900 font-mono-num block">
            +{filteredFocusSessions.length} sessions
          </span>
        </div>
      </div>

      {/* 4. Consistency Heatmap Matrix with Lucide Icons */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2rem] p-4 shadow-[2.5px_2.5px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#FED7AA] border border-[#18181B] flex items-center justify-center text-xs shadow-2xs">
              <TrendingUp className="w-3.5 h-3.5 text-orange-950 stroke-[2.25]" />
            </div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
              Consistency Grid
            </h3>
          </div>
          <span className="text-[10px] font-black text-purple-900 bg-[#E9D5FF] px-2.5 py-0.5 rounded-full border border-[#18181B]">
            11 Weeks Activity
          </span>
        </div>

        {/* 7-Row Interactive Grid */}
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto py-1">
          {heatmapDays.map((d) => (
            <div
              key={d.dateStr}
              onClick={() => {
                playClickSound();
                setInspectedDate(d.dateStr);
                onSelectDate(d.dateStr);
              }}
              className={`w-4 h-4 rounded-md border transition-all cursor-pointer hover:scale-125 ${getCellColor(
                d.level
              )} ${d.isSelected ? 'ring-2 ring-[#18181B] scale-110' : ''}`}
              title={`${d.dateStr}: ${d.completedTasks} tasks, ${d.completedHabits} habits, ${d.focusMins}m focus`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1">
          <span>Less active</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((lvl) => (
              <div
                key={lvl}
                className={`w-3 h-3 rounded-sm border ${getCellColor(lvl)}`}
              />
            ))}
          </div>
          <span>Legendary</span>
        </div>

        {/* Inspected Day Detail Capsule */}
        <div className="p-3 bg-[#FAF7F2] border border-[#18181B]/20 rounded-2xl space-y-1.5 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#18181B] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-700 stroke-[2.25]" />
              <span>Inspection: {inspectedDayDetails.date}</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 font-mono-num">
              {inspectedDayDetails.completedTasks.length}/{inspectedDayDetails.tasks.length} tasks • {inspectedDayDetails.totalFocusMins}m flow
            </span>
          </div>

          {inspectedDayDetails.tasks.length > 0 ? (
            <div className="space-y-1 pt-1">
              {inspectedDayDetails.tasks.map((t) => (
                <div
                  key={t.id}
                  className="px-2.5 py-1.5 bg-white border border-[#18181B]/15 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {t.isPriority ? (
                      <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400 stroke-[2.25] shrink-0" />
                    ) : (
                      <Sword className="w-3.5 h-3.5 text-purple-700 stroke-[2.25] shrink-0" />
                    )}
                    <span className={`font-extrabold truncate ${t.isCompleted ? 'line-through text-slate-400' : 'text-[#18181B]'}`}>
                      {t.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase ml-2 shrink-0">
                    {t.isCompleted ? 'Done' : 'Open'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 font-semibold">No tasks logged on this specific date.</p>
          )}
        </div>
      </div>

      {/* 5. Category Focus Breakdown with Lucide Icons */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2rem] p-4 shadow-[2.5px_2.5px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#BAE6FD] border border-[#18181B] flex items-center justify-center text-xs shadow-2xs">
              <PieChart className="w-3.5 h-3.5 text-sky-950 stroke-[2.25]" />
            </div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
              Energy & Category Allocation
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {timeframe.toUpperCase()}
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {categoryStats.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-[#18181B]">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center border border-[#18181B]/20" style={{ backgroundColor: cat.color }}>
                    {cat.icon}
                  </span>
                  <span>{cat.name}</span>
                </span>
                <span className="font-mono-num text-purple-900 font-black">
                  {cat.pct}% ({cat.count} quests)
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#FAF7F2] rounded-full border border-slate-200 overflow-hidden p-0.5">
                <div
                  style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                  className="h-full rounded-full border border-[#18181B] transition-all duration-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Achievements & Trophy Showcase with Pure Lucide Icons */}
      <div className="bg-white/95 backdrop-blur-md border-[1.75px] border-[#18181B] rounded-[2rem] p-4 shadow-[2.5px_2.5px_0px_#18181B] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#FEF08A] border border-[#18181B] flex items-center justify-center text-xs shadow-2xs">
              <Trophy className="w-3.5 h-3.5 text-amber-950 stroke-[2.25]" />
            </div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
              Achievements & Trophies
            </h3>
          </div>
          <span className="text-[10px] font-black text-amber-900 bg-[#FEF08A] px-2.5 py-0.5 rounded-full border border-[#18181B]/20 font-mono-num">
            {achievements.filter((a) => a.unlocked).length} of {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              onClick={() => handleTrophyClick(ach)}
              className={`p-3 rounded-2xl border-[1.5px] border-[#18181B] flex flex-col justify-between text-left transition-all cursor-pointer ${
                ach.unlocked
                  ? 'bg-[#FAF5FF] shadow-[1.5px_1.5px_0px_#18181B] hover:scale-102'
                  : 'bg-slate-50 opacity-60'
              }`}
            >
              <div>
                <div
                  className="w-8 h-8 rounded-full border border-[#18181B] flex items-center justify-center shadow-2xs mb-1.5"
                  style={{ backgroundColor: ach.iconBg }}
                >
                  {ach.icon}
                </div>
                <h4 className="text-xs font-black font-display text-[#18181B] truncate">
                  {ach.title}
                </h4>
                <p className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5 line-clamp-2">
                  {ach.desc}
                </p>
              </div>

              {/* Progress gauge for locked/unlocked */}
              <div className="mt-2.5 pt-1.5 border-t border-[#18181B]/10 space-y-1">
                <div className="flex items-center justify-between text-[9px] font-black font-mono-num">
                  <span className="text-purple-900">{ach.xp}</span>
                  <span className="text-slate-400">{ach.progress}/{ach.maxProgress}</span>
                </div>
                <div className="w-full h-1.5 bg-[#FAF7F2] rounded-full border border-slate-200 overflow-hidden">
                  <div
                    style={{ width: `${Math.round((ach.progress / ach.maxProgress) * 100)}%` }}
                    className="h-full rounded-full bg-[#BEF264] border border-[#18181B]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
