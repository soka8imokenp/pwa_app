import React, { useState, useMemo } from 'react';
import { subDays, parseISO } from 'date-fns';
import {
  Trophy,
  Flame,
  Clock,
  CheckCircle2,
  Share2,
  Crown,
} from 'lucide-react';
import type { Task, HabitLog, FocusSession } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { ActivityHeatmap } from '../analytics/ActivityHeatmap';
import confetti from 'canvas-confetti';

interface StatsPageProps {
  tasks: Task[];
  habitLogs: HabitLog[];
  focusSessions: FocusSession[];
  onSelectDate: (dateStr: string) => void;
  onOpenInfographic?: () => void;
}

type Timeframe = '7d' | '30d' | 'all';

export const StatsPage: React.FC<StatsPageProps> = ({
  tasks,
  habitLogs,
  focusSessions,
  onSelectDate,
  onOpenInfographic,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [copiedShare, setCopiedShare] = useState(false);

  const timeframeDays = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 365;

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

  const totalTasksDone = filteredTasks.filter((t) => t.isCompleted).length;
  const totalTasksCount = filteredTasks.length;
  const totalHabitChecks = filteredHabitLogs.filter((l) => l.completed).length;
  const totalFocusMinutes = filteredFocusSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

  // Level & XP Calculation
  const totalXP = (totalTasksDone * 50) + (totalHabitChecks * 20) + (totalFocusMinutes * 2);
  const currentLevel = Math.floor(totalXP / 500) + 1;
  const xpIntoCurrentLevel = totalXP % 500;
  const levelProgressPercent = Math.round((xpIntoCurrentLevel / 500) * 100);

  const handleShareCard = () => {
    playSuccessChime();
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFE873', '#E8DCFF', '#D1FBE4'],
    });

    const shareText = `Daily Sumire Stats: Level ${currentLevel} • ${totalTasksDone} Tasks Done • ${totalFocusHours}h Deep Focus!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <div className="w-full space-y-4 pb-20 font-body select-none">
      {/* 1. Top Level & XP Card */}
      <div className="neo-card p-5 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFE873] border-[1.75px] border-[#18181B] flex items-center justify-center text-sm font-bold shadow-[1.5px_1.5px_0px_#18181B]">
              <Crown className="w-5 h-5 text-amber-900 fill-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                Mastery Rank
              </span>
              <h2 className="text-base font-bold font-display text-[#18181B] mt-0.5">
                Level {currentLevel} Architect
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              if (onOpenInfographic) {
                playClickSound();
                onOpenInfographic();
              } else {
                handleShareCard();
              }
            }}
            className="px-3.5 py-1.5 bg-[#E8DCFF] hover:bg-[#D8C4FF] neo-btn flex items-center gap-1.5 text-xs text-[#18181B] cursor-pointer shadow-2xs active:translate-y-0.5"
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2.25]" />
            <span>Weekly Card</span>
          </button>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold font-mono-num text-slate-500">
            <span>{xpIntoCurrentLevel} / 500 XP</span>
            <span>{levelProgressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 border-[1.5px] border-[#18181B] h-3 rounded-full overflow-hidden p-0.5 shadow-[1px_1px_0px_#18181B]">
            <div
              className="bg-[#FFE873] h-full rounded-full transition-all duration-300 border-[1px] border-[#18181B]"
              style={{ width: `${levelProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Key Metrics 3-Column Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="neo-card p-3.5 bg-white text-center space-y-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
          <span className="text-lg font-bold font-mono-num text-[#18181B] block">
            {totalTasksDone}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Tasks Done
          </span>
        </div>

        <div className="neo-card p-3.5 bg-white text-center space-y-1">
          <Clock className="w-4 h-4 text-purple-600 mx-auto" />
          <span className="text-lg font-bold font-mono-num text-[#18181B] block">
            {totalFocusHours}h
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Focus Time
          </span>
        </div>

        <div className="neo-card p-3.5 bg-white text-center space-y-1">
          <Flame className="w-4 h-4 text-amber-600 mx-auto" />
          <span className="text-lg font-bold font-mono-num text-[#18181B] block">
            {totalHabitChecks}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Habit Logs
          </span>
        </div>
      </div>

      {/* 3. 28-Day Consistency Heatmap Grid */}
      <ActivityHeatmap
        tasks={tasks}
        habitLogs={habitLogs}
        focusSessions={focusSessions}
        onSelectDate={onSelectDate}
      />

      {/* 4. Timeframe Filter Selector */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold font-display text-slate-500 uppercase tracking-wider">
          Time Period
        </span>
        <div className="flex items-center gap-1">
          {(['7d', '30d', 'all'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => {
                playClickSound();
                setTimeframe(tf);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer border-[1.5px] ${
                timeframe === tf
                  ? 'bg-[#18181B] text-white border-[#18181B] shadow-[1px_1px_0px_#18181B]'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-[#18181B]'
              }`}
            >
              {tf === 'all' ? 'All Time' : tf}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Achievements & Badges */}
      <div className="neo-card p-5 bg-white space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold font-display text-[#18181B] uppercase tracking-wider">
            Unlocked Milestones
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { title: 'First Blood', desc: 'Complete 1st Task', unlocked: totalTasksDone >= 1, xp: '+50 XP', color: '#FFE873' },
            { title: 'Deep Worker', desc: '5h Focus Logged', unlocked: Number(totalFocusHours) >= 5, xp: '+200 XP', color: '#E8DCFF' },
            { title: 'Habit Master', desc: '10 Habit Logs', unlocked: totalHabitChecks >= 10, xp: '+150 XP', color: '#D1FBE4' },
            { title: 'Rule of 3 Hero', desc: 'Clear Daily Top 3', unlocked: totalTasksDone >= 3, xp: '+300 XP', color: '#FED7AA' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border-[1.5px] border-[#18181B] space-y-1 transition-all ${
                item.unlocked ? 'bg-white shadow-[1.5px_1.5px_0px_#18181B]' : 'bg-slate-50 opacity-40 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: item.color }}>
                  {item.unlocked ? 'Unlocked' : 'Locked'}
                </span>
                <span className="text-[9px] font-bold font-mono-num text-slate-500">{item.xp}</span>
              </div>
              <h4 className="text-xs font-bold text-[#18181B]">{item.title}</h4>
              <p className="text-[10px] text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
