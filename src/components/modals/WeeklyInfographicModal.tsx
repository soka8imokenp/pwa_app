import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  Check,
  Flame,
  Clock,
  Target,
  Trophy,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import type { Task, HabitLog, FocusSession } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { format, subDays, parseISO } from 'date-fns';
import confetti from 'canvas-confetti';

interface WeeklyInfographicModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  habitLogs: HabitLog[];
  focusSessions: FocusSession[];
  userName?: string;
}

export const WeeklyInfographicModal: React.FC<WeeklyInfographicModalProps> = ({
  isOpen,
  onClose,
  tasks,
  habitLogs,
  focusSessions,
  userName = 'Sam Smith',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Calculate Last 7 Days Metrics
  const today = new Date();
  const weekStart = subDays(today, 6);
  const weekRangeLabel = `${format(weekStart, 'MMM d')} – ${format(today, 'MMM d, yyyy')}`;

  const past7DaysTasks = tasks.filter((t) => parseISO(t.date) >= weekStart);
  const past7DaysFocus = focusSessions.filter((s) => parseISO(s.date) >= weekStart);
  const past7DaysHabits = habitLogs.filter((l) => parseISO(l.date) >= weekStart);

  const completedTasks = past7DaysTasks.filter((t) => t.isCompleted).length;
  const totalTasks = past7DaysTasks.length;
  const totalFocusMins = past7DaysFocus.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalFocusHours = (totalFocusMins / 60).toFixed(1);
  const totalHabitChecks = past7DaysHabits.filter((l) => l.completed).length;

  const totalXP = (completedTasks * 50) + (totalHabitChecks * 20) + (totalFocusMins * 2);
  const level = Math.floor(totalXP / 500) + 1;

  // 7-day Breakdown
  const daysArray = Array.from({ length: 7 }).map((_, idx) => {
    const d = subDays(today, 6 - idx);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayTasks = tasks.filter((t) => t.date === dateStr);
    const dayFocus = focusSessions.filter((s) => s.date === dateStr);
    const dayHabits = habitLogs.filter((l) => l.date === dateStr && l.completed);

    const doneCount = dayTasks.filter((t) => t.isCompleted).length;
    const focusMinutes = dayFocus.reduce((acc, s) => acc + s.durationMinutes, 0);
    const score = Math.min(
      100,
      Math.round(
        (dayTasks.length > 0 ? (doneCount / dayTasks.length) * 50 : 30) +
        Math.min(dayHabits.length * 10, 30) +
        Math.min(focusMinutes / 3, 20)
      )
    );

    return {
      dayShort: format(d, 'EEE'),
      dayNum: format(d, 'd'),
      dateStr,
      score,
      completed: doneCount > 0 || dayHabits.length > 0 || focusMinutes > 0,
    };
  });

  const averageScore = Math.round(
    daysArray.reduce((acc, d) => acc + d.score, 0) / daysArray.length
  );

  const handleDownload = async () => {
    if (!cardRef.current || isExporting) return;
    playClickSound();
    setIsExporting(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#FAF7F2',
      });

      const link = document.createElement('a');
      link.download = `Daily-Sumire-Week-${format(today, 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();

      playSuccessChime();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFE873', '#BEF264', '#E8DCFF'],
      });
    } catch (err) {
      console.error('Failed to export image', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    if (!cardRef.current || isExporting) return;
    playClickSound();
    setIsExporting(true);

    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#FAF7F2',
      });

      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `Daily-Sumire-Week-${format(today, 'yyyy-MM-dd')}.png`, {
          type: 'image/png',
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My Weekly Productivity • Daily Sumire',
            text: `I completed ${completedTasks} tasks and logged ${totalFocusHours}h of deep focus this week with Daily Sumire!`,
            files: [file],
          });
          playSuccessChime();
          return;
        }
      }

      // Fallback to clipboard if native share not supported
      if (blob && navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setIsCopied(true);
        playSuccessChime();
        setTimeout(() => setIsCopied(false), 2500);
      } else {
        handleDownload();
      }
    } catch (err) {
      console.warn('Share error fallback to download', err);
      handleDownload();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#18181B]/50 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
        
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between pb-1 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8DCFF] border border-[#18181B] flex items-center justify-center shadow-2xs">
              <Trophy className="w-4 h-4 text-purple-900 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                Weekly Infographic
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Export & Share your progress card
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-slate-700 hover:text-[#18181B] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* 🎨 The Visual Infographic Card to Rasterize */}
        <div
          ref={cardRef}
          className="p-5 bg-[#FAF7F2] border-[2px] border-[#18181B] rounded-[2rem] shadow-[3px_3px_0px_#18181B] space-y-4 text-center relative overflow-hidden"
        >
          {/* Subtle Neo-Brutalist Dots Accent Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#18181B 1.2px, transparent 1.2px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Header Brand Badge */}
          <div className="relative z-10 flex items-center justify-between pb-2 border-b border-[#18181B]/20">
            <div className="flex items-center gap-2 text-left">
              <div className="w-9 h-9 rounded-xl bg-[#FFE873] border-[1.5px] border-[#18181B] flex items-center justify-center shadow-2xs font-display font-black text-sm">
                DS
              </div>
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                  Daily Sumire
                </h4>
                <p className="text-[9px] font-bold text-slate-500 font-mono-num">
                  {weekRangeLabel}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-[#D1FBE4] border border-[#18181B] rounded-full text-[9px] font-black text-emerald-950 shadow-2xs uppercase">
              Level {level}
            </span>
          </div>

          {/* Title & User Hero */}
          <div className="relative z-10 space-y-0.5 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 bg-[#E8DCFF] px-2.5 py-0.5 rounded-full border border-[#18181B]">
              Weekly Performance Digest
            </span>
            <h2 className="text-lg font-black font-display uppercase tracking-tight text-[#18181B] pt-1">
              {userName}
            </h2>
            <p className="text-[11px] font-bold text-slate-500">
              Consistency Score: <span className="font-mono-num text-[#18181B] font-black">{averageScore}%</span> average
            </p>
          </div>

          {/* 4 Pastel Metric Badges Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-2">
            {/* 1. Tasks */}
            <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <Target className="w-4 h-4 text-purple-700" />
                <span className="text-[9px] font-black text-slate-400 uppercase">Tasks</span>
              </div>
              <p className="text-base font-black font-mono-num text-[#18181B] mt-1">
                {completedTasks}/{totalTasks}
              </p>
              <p className="text-[9px] font-bold text-slate-500 truncate">
                Completed this week
              </p>
            </div>

            {/* 2. Focus Time */}
            <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <Clock className="w-4 h-4 text-sky-700" />
                <span className="text-[9px] font-black text-slate-400 uppercase">Deep Flow</span>
              </div>
              <p className="text-base font-black font-mono-num text-[#18181B] mt-1">
                {totalFocusHours}h
              </p>
              <p className="text-[9px] font-bold text-slate-500 truncate">
                Focused work logged
              </p>
            </div>

            {/* 3. Habits */}
            <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <Flame className="w-4 h-4 text-amber-600 fill-amber-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase">Habits</span>
              </div>
              <p className="text-base font-black font-mono-num text-[#18181B] mt-1">
                {totalHabitChecks}
              </p>
              <p className="text-[9px] font-bold text-slate-500 truncate">
                Streak completions
              </p>
            </div>

            {/* 4. Experience Points */}
            <div className="p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <Zap className="w-4 h-4 text-amber-700" />
                <span className="text-[9px] font-black text-slate-400 uppercase">XP Earned</span>
              </div>
              <p className="text-base font-black font-mono-num text-[#18181B] mt-1">
                +{totalXP}
              </p>
              <p className="text-[9px] font-bold text-slate-500 truncate">
                Productivity points
              </p>
            </div>
          </div>

          {/* 7-Day Consistency Pills */}
          <div className="relative z-10 p-3 bg-white border-[1.75px] border-[#18181B] rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-400 px-1">
              <span>7-Day Heatmap</span>
              <span>Mon - Sun</span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {daysArray.map((day) => (
                <div
                  key={day.dateStr}
                  className={`py-1.5 px-0.5 rounded-xl border flex flex-col items-center justify-center text-center ${
                    day.score >= 70
                      ? 'bg-[#BEF264] border-[#18181B] shadow-2xs'
                      : day.score > 0
                      ? 'bg-[#FFE873] border-[#18181B]'
                      : 'bg-[#FAF7F2] text-slate-400 border-slate-200'
                  }`}
                >
                  <span className="text-[8px] font-extrabold uppercase">{day.dayShort}</span>
                  <span className="text-[9px] font-black font-mono-num">{day.dayNum}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Signature */}
          <div className="relative z-10 flex items-center justify-between pt-1 text-[9px] font-black text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-700 stroke-[2.5]" />
              <span>Offline-First Vault</span>
            </span>
            <span className="uppercase tracking-wider">
              Sumire Ecosystem
            </span>
          </div>
        </div>

        {/* Action Buttons: Share & Download */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="py-2.5 px-3 bg-[#FAF7F2] hover:bg-slate-100 disabled:opacity-50 border-[1.75px] border-[#18181B] rounded-2xl text-xs font-black text-[#18181B] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <Download className="w-4 h-4 stroke-[2.25]" />
            <span>{isExporting ? 'Generating...' : 'Save PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handleNativeShare}
            disabled={isExporting}
            className="py-2.5 px-3 bg-[#FFE873] hover:bg-[#FED7AA] disabled:opacity-50 border-[1.75px] border-[#18181B] rounded-2xl text-xs font-black text-[#18181B] shadow-[2px_2px_0px_#18181B] flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 transition-all"
          >
            {isCopied ? <Check className="w-4 h-4 stroke-[3]" /> : <Share2 className="w-4 h-4 stroke-[2.25]" />}
            <span>{isCopied ? 'Copied Image!' : 'Share Image'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
