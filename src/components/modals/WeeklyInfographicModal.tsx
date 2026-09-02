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
        backgroundColor: '#FAF8F5',
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
        colors: ['#F0BB58', '#3D6B52', '#C25E40'],
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
        backgroundColor: '#FAF8F5',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
        
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between pb-1 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Trophy className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Weekly Infographic
              </h3>
              <p className="text-[10px] text-[#6B635B] font-bold">
                Export & Share your progress card
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-stone-700 hover:text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* The Visual Infographic Card to Rasterize */}
        <div
          ref={cardRef}
          className="p-5 bg-[#FAF8F5] border-[2px] border-[#24201D] rounded-[2rem] shadow-[3px_3px_0px_#24201D] space-y-4 text-center relative overflow-hidden"
        >
          {/* Subtle Japanese Paper Dots Accent Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#24201D 1.2px, transparent 1.2px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Header Brand Badge */}
          <div className="relative z-10 flex items-center justify-between pb-2 border-b border-[#24201D]/20">
            <div className="flex items-center gap-2 text-left">
              <div className="w-9 h-9 rounded-xl bg-[#F0BB58] border-[1.5px] border-[#24201D] flex items-center justify-center shadow-2xs font-display font-black text-sm text-[#24201D]">
                DS
              </div>
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                  Daily Sumire
                </h4>
                <p className="text-[9px] font-bold text-[#6B635B] font-mono-num">
                  {weekRangeLabel}
                </p>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-[#DDE8DE] border border-[#24201D] rounded-full text-[9px] font-black text-[#2D503C] shadow-2xs uppercase">
              Level {level}
            </span>
          </div>

          {/* Title & User Hero */}
          <div className="relative z-10 space-y-0.5 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#854D0E] bg-[#FBECCF] px-2.5 py-0.5 rounded-full border border-[#24201D]">
              Weekly Performance Digest
            </span>
            <h2 className="text-lg font-black font-display uppercase tracking-tight text-[#24201D] pt-1">
              {userName}
            </h2>
            <p className="text-[11px] font-bold text-[#6B635B]">
              Consistency Score: <span className="font-mono-num text-[#24201D] font-black">{averageScore}%</span> average
            </p>
          </div>

          {/* 4 Metric Badges Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-2">
            {/* 1. Tasks */}
            <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <Target className="w-4 h-4 text-[#3D6B52]" />
                <span className="text-[9px] font-black text-stone-400 uppercase">Tasks</span>
              </div>
              <p className="text-base font-black font-mono-num text-[#24201D] mt-1">
                {completedTasks}/{totalTasks}
              </p>
              <p className="text-[9px] font-bold text-[#6B635B] truncate">
                Completed this week
              </p>
            </div>

            {/* 2. Focus Time */}
            <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <Clock className="w-4 h-4 text-[#476C85]" />
                <span className="text-[9px] font-black text-stone-400 uppercase">Deep Flow</span>
              </div>
              <p className="text-base font-black font-mono-num text-[#24201D] mt-1">
                {totalFocusHours}h
              </p>
              <p className="text-[9px] font-bold text-[#6B635B] truncate">
                Focused work logged
              </p>
            </div>

            {/* 3. Habits */}
            <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <Flame className="w-4 h-4 text-[#C25E40] fill-[#F0BB58]" />
                <span className="text-[9px] font-black text-stone-400 uppercase">Habits</span>
              </div>
              <p className="text-base font-black font-mono-num text-[#24201D] mt-1">
                {totalHabitChecks}
              </p>
              <p className="text-[9px] font-bold text-[#6B635B] truncate">
                Streak completions
              </p>
            </div>

            {/* 4. Experience Points */}
            <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs text-left">
              <div className="flex items-center justify-between">
                <Zap className="w-4 h-4 text-[#E09F3E]" />
                <span className="text-[9px] font-black text-stone-400 uppercase">XP Earned</span>
              </div>
              <p className="text-base font-black font-mono-num text-[#24201D] mt-1">
                +{totalXP}
              </p>
              <p className="text-[9px] font-bold text-[#6B635B] truncate">
                Productivity points
              </p>
            </div>
          </div>

          {/* 7-Day Consistency Pills */}
          <div className="relative z-10 p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-black uppercase text-stone-400 px-1">
              <span>7-Day Heatmap</span>
              <span>Mon - Sun</span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {daysArray.map((day) => (
                <div
                  key={day.dateStr}
                  className={`py-1.5 px-0.5 rounded-xl border flex flex-col items-center justify-center text-center ${
                    day.score >= 50
                      ? 'bg-[#3D6B52] border-[#24201D] text-white shadow-2xs'
                      : day.completed
                      ? 'bg-[#DDE8DE] border-[#3D6B52]/40 text-[#2D503C]'
                      : 'bg-[#F4F0EA] border-[#24201D]/20 text-stone-400'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase">{day.dayShort}</span>
                  <span className="text-[10px] font-mono-num font-black mt-0.5">{day.dayNum}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex-1 py-3 px-4 bg-[#FAF8F5] hover:bg-stone-100 border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black text-[#24201D] shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2.25]" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleNativeShare}
            disabled={isExporting}
            className="flex-1 py-3 px-4 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Copied Image!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 stroke-[2.25]" />
                <span>Share Card</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
