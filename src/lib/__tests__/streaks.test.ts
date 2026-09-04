import { describe, it, expect } from 'vitest';
import { calculateHabitStats, calculateOverallActivityStreak } from '../streaks';
import type { Habit, HabitLog, Task, FocusSession } from '../../types';

describe('streaks', () => {
  const sampleHabit: Habit = {
    id: 1,
    title: 'Morning Meditation',
    icon: 'zap',
    color: '#FFDE59',
    targetDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    archived: false,
    createdAt: Date.now(),
  };

  it('calculateHabitStats: computes 0 streak when no logs', () => {
    const stats = calculateHabitStats(sampleHabit, [], '2026-09-04');
    expect(stats.currentStreak).toBe(0);
    expect(stats.completedToday).toBe(false);
  });

  it('calculateHabitStats: computes 1-day streak when completed today', () => {
    const logs: HabitLog[] = [
      { id: 1, habitId: 1, date: '2026-09-04', completed: true },
    ];
    const stats = calculateHabitStats(sampleHabit, logs, '2026-09-04');
    expect(stats.currentStreak).toBe(1);
    expect(stats.completedToday).toBe(true);
  });

  it('calculateHabitStats: computes multi-day consecutive streak', () => {
    const logs: HabitLog[] = [
      { id: 1, habitId: 1, date: '2026-09-02', completed: true },
      { id: 2, habitId: 1, date: '2026-09-03', completed: true },
      { id: 3, habitId: 1, date: '2026-09-04', completed: true },
    ];
    const stats = calculateHabitStats(sampleHabit, logs, '2026-09-04');
    expect(stats.currentStreak).toBe(3);
  });

  it('calculateHabitStats: preserves active streak from yesterday before completing today', () => {
    const logs: HabitLog[] = [
      { id: 1, habitId: 1, date: '2026-09-02', completed: true },
      { id: 2, habitId: 1, date: '2026-09-03', completed: true },
    ];
    // Today is 2026-09-04, user hasn't checked it yet today
    const stats = calculateHabitStats(sampleHabit, logs, '2026-09-04');
    expect(stats.currentStreak).toBe(2);
    expect(stats.completedToday).toBe(false);
  });

  it('calculateOverallActivityStreak: combines tasks, habits, and focus sessions', () => {
    const tasks: Task[] = [
      {
        id: 1,
        title: 'Deep Work',
        isPriority: true,
        isCompleted: true,
        date: '2026-09-03',
        createdAt: 1,
      },
    ];

    const habitLogs: HabitLog[] = [
      { id: 1, habitId: 1, date: '2026-09-04', completed: true },
    ];

    const focusSessions: FocusSession[] = [];

    const stats = calculateOverallActivityStreak(tasks, habitLogs, focusSessions, '2026-09-04');
    // Active yesterday (task) and today (habit) => streak is 2
    expect(stats.currentStreak).toBe(2);
    expect(stats.isActiveToday).toBe(true);
  });
});
