import { subDays, format, parseISO } from 'date-fns';
import type { Habit, HabitLog, HabitWithStats } from '../types';

export function calculateHabitStats(habit: Habit, logs: HabitLog[], referenceDate: string = format(new Date(), 'yyyy-MM-dd')): HabitWithStats {
  const habitLogs = logs.filter((l) => l.habitId === habit.id);
  const logMap = new Map<string, boolean>();
  habitLogs.forEach((l) => logMap.set(l.date, l.completed));

  const completedToday = Boolean(logMap.get(referenceDate));

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = parseISO(referenceDate);

  // If not completed today, check starting from yesterday for unbroken streak
  if (!completedToday) {
    checkDate = subDays(checkDate, 1);
  }

  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (logMap.get(dateStr)) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  // Calculate longest streak & total completions
  let longestStreak = 0;
  let runningStreak = 0;
  let totalCompletions = 0;

  // Check last 90 days
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
