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
    if (score === 0) return 'bg-[#FAF7F2] border-slate-200 text-slate-400';
    if (score <= 2) return 'bg-[#E8DCFF] border-[#C084FC] text-purple-900';
    if (score <= 5) return 'bg-[#BEF264] border-[#65A30D] text-emerald-950 font-bold';
    return 'bg-[#FFE873] border-[#CA8A04] text-amber-950 font-black shadow-2xs';
  };

  return (
    <div className="neo-card p-4 bg-white space-y-3 font-body select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E8DCFF] border-[1.5px] border-[#18181B] flex items-center justify-center shadow-[1px_1px_0px_#18181B]">
            <Calendar className="w-4 h-4 text-[#18181B] stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#18181B]">
              Activity Heatmap
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">
              Last 4 Weeks Consistency
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
          <span>Less</span>
          <div className="w-3 h-3 rounded bg-[#FAF7F2] border border-slate-200" />
          <div className="w-3 h-3 rounded bg-[#E8DCFF] border border-[#C084FC]" />
          <div className="w-3 h-3 rounded bg-[#BEF264] border border-[#65A30D]" />
          <div className="w-3 h-3 rounded bg-[#FFE873] border border-[#CA8A04]" />
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
              className={`h-9 rounded-xl border-[1.5px] flex flex-col items-center justify-center transition-all cursor-pointer ${getColorClass(
                stats.score
              )} ${
                isSelected
                  ? 'ring-2 ring-[#18181B] scale-105 shadow-[1.5px_1.5px_0px_#18181B]'
                  : isCurrent
                  ? 'border-[#18181B] border-dashed'
                  : ''
              }`}
              title={`${stats.dateStr}: ${stats.tasksDone} tasks, ${stats.focusMins}m focus`}
            >
              <span className="text-[10px] font-mono-num font-bold leading-none">
                {format(day, 'd')}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70 leading-none mt-0.5">
                {format(day, 'EEE')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Day Detail Popover */}
      {selectedDayInfo && (
        <div className="p-3 bg-[#FAF7F2] border-[1.5px] border-[#18181B] rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
          <div>
            <span className="text-[10px] font-bold font-display uppercase tracking-wider text-slate-500 block">
              {selectedDayInfo.dateStr} Summary
            </span>
            <div className="flex items-center gap-3 mt-1 font-bold text-[#18181B]">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                {selectedDayInfo.tasksDone} Tasks
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-600 stroke-[2.5]" />
                {selectedDayInfo.focusMins}m Focus
              </span>
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
                {selectedDayInfo.habitsDone} Habits
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
