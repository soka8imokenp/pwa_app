import React, { useState } from 'react';
import { format, subDays, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { Calendar, Check, Clock, Flame } from 'lucide-react';
import type { Task, HabitLog, FocusSession } from '../../types';
import { playClickSound } from '../../lib/sound';

interface ActivityHeatmapProps {
  tasks: Task[];
  habitLogs: HabitLog[];
  focusSessions: FocusSession[];
  onSelectDate: (dateStr: string) => void;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  tasks,
  habitLogs,
  focusSessions,
  onSelectDate,
}) => {
  const today = new Date();
  const days = eachDayOfInterval({
    start: subDays(today, 27), // 4 full weeks (28 days)
    end: today,
  });

  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    tasksDone: number;
    focusMins: number;
    habitsDone: number;
  } | null>(null);

  const getDayStats = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayTasks = tasks.filter((t) => t.date === dateStr && t.isCompleted);
    const dayHabits = habitLogs.filter((l) => l.date === dateStr && l.completed);
    const dayFocus = focusSessions.filter((s) => s.date === dateStr);
    const focusMins = dayFocus.reduce((acc, s) => acc + s.durationMinutes, 0);

    const score = dayTasks.length * 2 + dayHabits.length + Math.round(focusMins / 15);
    return {
      dateStr,
      tasksDone: dayTasks.length,
      habitsDone: dayHabits.length,
      focusMins,
      score,
    };
  };

  const handleTileClick = (day: Date) => {
    playClickSound();
    const stats = getDayStats(day);
    setSelectedDayInfo(stats);
    onSelectDate(stats.dateStr);
  };

  const getColorClass = (score: number) => {
    if (score === 0) return 'bg-[#F4F0EA] border-[#24201D]/15 text-[#6B635B]';
    if (score <= 2) return 'bg-[#DDE8DE] border-[#3D6B52]/40 text-[#2D503C]';
    if (score <= 5) return 'bg-[#8FA89B] border-[#3D6B52] text-white font-bold';
    return 'bg-[#3D6B52] border-[#24201D] text-white font-black shadow-2xs';
  };

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 font-body select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border-[1.5px] border-[#24201D] flex items-center justify-center shadow-2xs">
            <Calendar className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#24201D]">
              Activity Heatmap
            </h3>
            <span className="text-[10px] text-[#6B635B] font-bold">
              Last 4 Weeks Consistency
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 text-[9px] font-bold text-stone-400">
          <span>Less</span>
          <div className="w-3 h-3 rounded bg-[#F4F0EA] border border-[#24201D]/15" />
          <div className="w-3 h-3 rounded bg-[#DDE8DE] border border-[#3D6B52]/40" />
          <div className="w-3 h-3 rounded bg-[#8FA89B] border border-[#3D6B52]" />
          <div className="w-3 h-3 rounded bg-[#3D6B52] border border-[#24201D]" />
          <span>More</span>
        </div>
      </div>

      {/* Grid 7 columns x 4 rows */}
      <div className="grid grid-cols-7 gap-1.5 pt-1">
        {days.map((day) => {
          const stats = getDayStats(day);
          const isCurrent = isSameDay(day, today);
          const isSelected = selectedDayInfo?.dateStr === stats.dateStr;

          return (
            <button
              key={stats.dateStr}
              type="button"
              onClick={() => handleTileClick(day)}
              className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1 text-[10px] transition-all cursor-pointer relative ${getColorClass(
                stats.score
              )} ${
                isSelected
                  ? 'ring-2 ring-[#24201D] scale-105 shadow-2xs z-10'
                  : isCurrent
                  ? 'ring-1.5 ring-[#C25E40]'
                  : 'hover:scale-105'
              }`}
            >
              <span className="leading-none text-[9px] font-mono-num">{format(day, 'd')}</span>
              {stats.score > 0 && (
                <span className="text-[7px] font-bold opacity-80 mt-0.5">
                  {stats.score}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day Details Drawer */}
      {selectedDayInfo && (
        <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <span className="font-bold text-[#24201D] font-mono-num">
            {selectedDayInfo.dateStr}
          </span>
          <div className="flex items-center gap-3 text-[10px] font-bold text-[#6B635B]">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-[#3D6B52]" /> {selectedDayInfo.tasksDone} tasks
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#3D6B52]" /> {selectedDayInfo.focusMins}m
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#C25E40]" /> {selectedDayInfo.habitsDone} habits
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
