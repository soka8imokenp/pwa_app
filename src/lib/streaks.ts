import { subDays, format, parseISO } from 'date-fns';
import type { Habit, HabitLog, HabitWithStats, Task, FocusSession } from '../types';

export interface WeeklyDayStatus {
  date: string;
  dayLabel: string;
  active: boolean;
  isToday: boolean;
}

export interface OverallActivityStats {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  activeDatesSet: Set<string>;
  weeklyActivity: WeeklyDayStatus[];
}

/**
 * Calculates individual habit statistics and streak
 */
export function calculateHabitStats(
  habit: Habit,
  logs: HabitLog[],
  referenceDate: string = format(new Date(), 'yyyy-MM-dd')
): HabitWithStats {
  const habitLogs = logs.filter((l) => l.habitId === habit.id);
  const logMap = new Map<string, boolean>();
  habitLogs.forEach((l) => logMap.set(l.date, l.completed));

  const completedToday = Boolean(logMap.get(referenceDate));

  // Calculate current streak
  let currentStreak = 0;
  const refDateObj = parseISO(referenceDate);

  if (completedToday) {
    // Completed today -> streak is active starting from today
    currentStreak = 1;
    let checkDate = subDays(refDateObj, 1);
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      if (logMap.get(dateStr)) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
  } else {
    // Not yet completed today -> check if yesterday was active to keep streak alive
    let checkDate = subDays(refDateObj, 1);
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      if (logMap.get(dateStr)) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak & total completions across last 90 days
  let longestStreak = 0;
  let runningStreak = 0;
  let totalCompletions = 0;

  for (let i = 90; i >= 0; i--) {
    const dStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
    if (logMap.get(dStr)) {
      runningStreak++;
      totalCompletions++;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const completionRate = Math.min(100, Math.round((totalCompletions / 30) * 100));

  // Recent 7 days logs
  const recentLogs = Array.from({ length: 7 }).map((_, idx) => {
    const dStr = format(subDays(parseISO(referenceDate), 6 - idx), 'yyyy-MM-dd');
    return {
      date: dStr,
      completed: Boolean(logMap.get(dStr)),
    };
  });

  return {
    ...habit,
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    completedToday,
    completionRate,
    recentLogs,
  };
}

/**
 * Calculates overall user productivity streak across Tasks, Habits, and Focus Sessions.
 * A day is counted as active if the user completed:
 * - At least 1 task, OR
 * - At least 1 habit, OR
 * - At least 1 focus session (duration > 0)
 */
export function calculateOverallActivityStreak(
  tasks: Task[],
  habitLogs: HabitLog[],
  focusSessions: FocusSession[],
  referenceDate: string = format(new Date(), 'yyyy-MM-dd')
): OverallActivityStats {
  const activeDates = new Set<string>();

  // 1. Tasks completed
  tasks.forEach((t) => {
    if (t.isCompleted && t.date) {
      activeDates.add(t.date);
    }
  });

  // 2. Habits completed
  habitLogs.forEach((l) => {
    if (l.completed && l.date) {
      activeDates.add(l.date);
    }
  });

  // 3. Focus sessions completed
  focusSessions.forEach((s) => {
    if (s.durationMinutes > 0 && s.date) {
      activeDates.add(s.date);
    }
  });

  const isActiveToday = activeDates.has(referenceDate);

  // 4. Calculate current unbroken streak
  let currentStreak = 0;
  const refDateObj = parseISO(referenceDate);

  if (isActiveToday) {
    // Today is active -> start with 1 and count backwards
    currentStreak = 1;
    let checkDate = subDays(refDateObj, 1);
    while (true) {
      const dStr = format(checkDate, 'yyyy-MM-dd');
      if (activeDates.has(dStr)) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
  } else {
    // Today not yet active -> check if streak from yesterday is still valid
    let checkDate = subDays(refDateObj, 1);
    while (true) {
      const dStr = format(checkDate, 'yyyy-MM-dd');
      if (activeDates.has(dStr)) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
  }

  // 5. Calculate longest streak across history
  let longestStreak = currentStreak;
  let runningStreak = 0;
  for (let i = 365; i >= 0; i--) {
    const dStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
    if (activeDates.has(dStr)) {
      runningStreak++;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
  }

  // 6. Current Week Status (Sunday to Saturday)
  const currentDayOfWeek = refDateObj.getDay(); // 0 is Sunday
  const weekStart = subDays(refDateObj, currentDayOfWeek);
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const weeklyActivity: WeeklyDayStatus[] = Array.from({ length: 7 }).map((_, idx) => {
    const dObj = new Date(weekStart);
    dObj.setDate(weekStart.getDate() + idx);
    const dStr = format(dObj, 'yyyy-MM-dd');
    return {
      date: dStr,
      dayLabel: dayNames[idx],
      active: activeDates.has(dStr),
      isToday: dStr === referenceDate,
    };
  });

  return {
    currentStreak,
    longestStreak,
    isActiveToday,
    activeDatesSet: activeDates,
    weeklyActivity,
  };
}
