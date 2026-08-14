import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { BarChart3 } from 'lucide-react';
import { BrutalCard } from '../common/BrutalCard';
import type { Task, HabitLog, FocusSession } from '../../types';

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
  const [hoveredCell, setHoveredCell] = useState<{
    date: string;
    tasksCount: number;
    habitsCount: number;
    focusMinutes: number;
    score: number;
  } | null>(null);

  // Generate data for past 105 days (15 weeks of 7 days)
  const totalDays = 105;
  const daysData = Array.from({ length: totalDays }).map((_, i) => {
    const d = subDays(new Date(), totalDays - 1 - i);
    const dateStr = format(d, 'yyyy-MM-dd');

    const completedTasks = tasks.filter((t) => t.date === dateStr && t.isCompleted).length;
    const completedHabits = habitLogs.filter((l) => l.date === dateStr && l.completed).length;
    const focusMins = focusSessions
      .filter((s) => s.date === dateStr)
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    // Activity score: tasks*2 + habits*1.5 + (focusMins/15)
    const rawScore = completedTasks * 2 + completedHabits * 1.5 + focusMins / 15;

    let level = 0;
    if (rawScore > 0) level = 1;
    if (rawScore >= 3) level = 2;
    if (rawScore >= 6) level = 3;
    if (rawScore >= 9) level = 4;

    return {
      dateStr,
      dayNumber: format(d, 'd'),
      month: format(d, 'MMM'),
      dayOfWeek: d.getDay(),
      completedTasks,
      completedHabits,
      focusMins,
      rawScore,
      level,
    };
  });

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-[#E9D5FF] dark:bg-[#432375] border-[#1E1B4B]/40 dark:border-purple-400/40';
      case 2:
        return 'bg-[#C084FC] dark:bg-[#7E22CE] border-[#1E1B4B] dark:border-purple-300 shadow-[1px_1px_0px_#1E1B4B]';
      case 3:
        return 'bg-[#BEF264] dark:bg-[#84CC16] border-[#1E1B4B] dark:border-lime-300 shadow-[1.5px_1.5px_0px_#1E1B4B]';
      case 4:
        return 'bg-[#FACC15] dark:bg-[#EAB308] border-[#1E1B4B] dark:border-yellow-200 shadow-[2px_2px_0px_#1E1B4B]';
      default:
        return 'bg-white/80 dark:bg-[#1E1830] border-[#1E1B4B]/20 dark:border-purple-400/20';
    }
  };

  const totalFocusHours = (
    focusSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60
  ).toFixed(1);
  const totalTasksCompleted = tasks.filter((t) => t.isCompleted).length;
  const totalHabitCompletions = habitLogs.filter((l) => l.completed).length;

  return (
    <BrutalCard variant="milk" className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[#1E1B4B]/10 dark:border-purple-300/15">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#E0F2FE] dark:bg-[#13304A] border-2 border-[#1E1B4B] dark:border-sky-400 rounded-xl shadow-[2px_2px_0px_#1E1B4B]">
            <BarChart3 className="w-5 h-5 text-sky-950 dark:text-sky-100" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-purple-50 tracking-tight">
              Activity Progression Heatmap
            </h3>
            <p className="text-xs font-bold text-slate-600 dark:text-purple-300">
              GitHub-style quantifiable consistency over 15 weeks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-purple-300">Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((lvl) => (
              <div
                key={lvl}
                className={`w-3.5 h-3.5 rounded-sm border ${getCellColor(lvl)}`}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-purple-300">More</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-[#FAF5FF] dark:bg-[#1E1733] border-2 border-[#1E1B4B] dark:border-purple-300 rounded-2xl shadow-[2px_2px_0px_#1E1B4B]">
          <span className="text-[10px] font-extrabold uppercase text-purple-900 dark:text-purple-300 block">
            Tasks Done
          </span>
          <span className="text-xl font-black text-slate-950 dark:text-purple-50 font-mono-num">
            {totalTasksCompleted}
          </span>
        </div>
        <div className="p-3 bg-[#ECFCCB] dark:bg-[#1B2F13] border-2 border-[#1E1B4B] dark:border-lime-400 rounded-2xl shadow-[2px_2px_0px_#1E1B4B]">
          <span className="text-[10px] font-extrabold uppercase text-lime-950 dark:text-lime-300 block">
            Habit Checks
          </span>
          <span className="text-xl font-black text-slate-950 dark:text-lime-50 font-mono-num">
            {totalHabitCompletions}
          </span>
        </div>
        <div className="p-3 bg-[#FFEDD5] dark:bg-[#341B0E] border-2 border-[#1E1B4B] dark:border-orange-400 rounded-2xl shadow-[2px_2px_0px_#1E1B4B]">
          <span className="text-[10px] font-extrabold uppercase text-orange-950 dark:text-orange-300 block">
            Total Focus
          </span>
          <span className="text-xl font-black text-slate-950 dark:text-orange-50 font-mono-num">
            {totalFocusHours}h
          </span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5 p-2 bg-[#FAF7F2] dark:bg-[#151224] border-2 border-[#1E1B4B] dark:border-purple-300/40 rounded-2xl min-w-[620px]">
          {daysData.map((day) => (
            <button
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              onMouseEnter={() =>
                setHoveredCell({
                  date: day.dateStr,
                  tasksCount: day.completedTasks,
                  habitsCount: day.completedHabits,
                  focusMinutes: day.focusMins,
                  score: Math.round(day.rawScore * 10) / 10,
                })
              }
              onMouseLeave={() => setHoveredCell(null)}
              className={`w-4.5 h-4.5 rounded-md border transition-transform hover:scale-130 cursor-pointer ${getCellColor(
                day.level
              )}`}
              aria-label={`Date ${day.dateStr}`}
            />
          ))}
        </div>
      </div>

      {/* Tooltip Bar */}
      <div className="h-6 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-purple-200 px-2">
        {hoveredCell ? (
          <span>
            🗓️ <span className="font-black">{hoveredCell.date}</span>: {hoveredCell.tasksCount} tasks,{' '}
            {hoveredCell.habitsCount} habits, {hoveredCell.focusMinutes}m focus (Score:{' '}
            {hoveredCell.score})
          </span>
        ) : (
          <span className="text-slate-400 dark:text-purple-400">
            Hover over any square to see quantifiable day breakdown
          </span>
        )}
      </div>
    </BrutalCard>
  );
};
