import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDemoDataIfEmpty } from '../lib/db';
import type { Task, Habit, HabitLog, FocusSession, HabitWithStats, DayOverviewStats } from '../types';
import { calculateHabitStats, calculateOverallActivityStreak, OverallActivityStats } from '../lib/streaks';
import { triggerTwoWaySync } from '../lib/syncEngine';
import { sendLocalNotification } from '../lib/notifications';

export function usePlannerData(selectedDate: string) {
  // Ensure database is initialized with initial sample data on first load and trigger sync
  useEffect(() => {
    seedDemoDataIfEmpty().then(() => {
      triggerTwoWaySync();
    });
  }, []);

  // 1. Live Queries from IndexedDB
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const allHabits = useLiveQuery(() => db.habits.filter((h) => !h.archived).toArray(), []) || [];
  const allHabitLogs = useLiveQuery(() => db.habitLogs.toArray(), []) || [];
  const allFocusSessions = useLiveQuery(() => db.focusSessions.toArray(), []) || [];
  const allLinks = useLiveQuery(() => db.links.toArray(), []) || [];

  // 2. Filtered for Selected Date
  const dateTasks = useMemo(() => {
    return allTasks.filter((t) => t.date === selectedDate);
  }, [allTasks, selectedDate]);

  const priorityTasks = useMemo(() => {
    return dateTasks.filter((t) => t.isPriority).slice(0, 3);
  }, [dateTasks]);

  const backlogTasks = useMemo(() => {
    return dateTasks.filter((t) => !t.isPriority);
  }, [dateTasks]);

  const todaysFocusSessions = useMemo(() => {
    return allFocusSessions.filter((s) => s.date === selectedDate);
  }, [allFocusSessions, selectedDate]);

  // 3. Habits with calculated streaks and stats
  const habitsWithStats: HabitWithStats[] = useMemo(() => {
    return allHabits.map((habit) => calculateHabitStats(habit, allHabitLogs, selectedDate));
  }, [allHabits, allHabitLogs, selectedDate]);

  // 4. Overall User Activity Streak calculation across Tasks, Habits & Focus
  const activityStats: OverallActivityStats = useMemo(() => {
    return calculateOverallActivityStreak(allTasks, allHabitLogs, allFocusSessions, selectedDate);
  }, [allTasks, allHabitLogs, allFocusSessions, selectedDate]);

  const overallStreak = activityStats.currentStreak;

  // 5. Day Overview Stats
  const dayStats: DayOverviewStats = useMemo(() => {
    const totalPriority = priorityTasks.length;
    const completedPriority = priorityTasks.filter((t) => t.isCompleted).length;
    const totalBacklog = backlogTasks.length;
    const completedBacklog = backlogTasks.filter((t) => t.isCompleted).length;
    const totalHabits = habitsWithStats.length;
    const completedHabits = habitsWithStats.filter((h) => h.completedToday).length;
    const focusMinutesToday = todaysFocusSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    // Productivity Score: 60% priority tasks + 40% habits
    let priorityScore = totalPriority > 0 ? (completedPriority / totalPriority) * 60 : 0;
    let habitScore = totalHabits > 0 ? (completedHabits / totalHabits) * 40 : 0;
    const dailyScore = Math.min(100, Math.round(priorityScore + habitScore));

    return {
      totalPriority,
      completedPriority,
      totalBacklog,
      completedBacklog,
      totalHabits,
      completedHabits,
      focusMinutesToday,
      dailyScore,
    };
  }, [priorityTasks, backlogTasks, habitsWithStats, todaysFocusSessions]);

  // 6. Database Action Handlers
  const addTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    const id = await db.tasks.add({
      ...task,
      createdAt: Date.now(),
    });
    triggerTwoWaySync();
    sendLocalNotification(
      'Task Scheduled',
      `"${task.title}" saved to ${task.isPriority ? 'Top Priorities' : 'Backlog'}`,
      { tab: task.isPriority ? 'priorities' : 'backlog', taskId: Number(id) }
    );
  };

  const toggleTaskComplete = async (task: Task) => {
    if (!task.id) return;
    await db.tasks.update(task.id, { isCompleted: !task.isCompleted });
    triggerTwoWaySync();
  };

  const toggleSubTaskComplete = async (taskId: number, subTaskId: string) => {
    const task = await db.tasks.get(taskId);
    if (!task || !task.subtasks) return;
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    await db.tasks.update(taskId, { subtasks: updatedSubtasks });
    triggerTwoWaySync();
  };

  const promoteTaskToPriority = async (task: Task) => {
    if (!task.id) return;
    if (priorityTasks.length >= 3) return;
    await db.tasks.update(task.id, { isPriority: true });
    triggerTwoWaySync();
  };

  const demoteTaskToBacklog = async (task: Task) => {
    if (!task.id) return;
    await db.tasks.update(task.id, { isPriority: false });
    triggerTwoWaySync();
  };

  const deleteTask = async (taskId: number) => {
    await db.tasks.delete(taskId);
    triggerTwoWaySync();
  };

  const addHabit = async (habit: Omit<Habit, 'id' | 'createdAt' | 'archived'>) => {
    const id = await db.habits.add({
      ...habit,
      archived: false,
      createdAt: Date.now(),
    });
    triggerTwoWaySync();
    sendLocalNotification(
      'Habit Created',
      `"${habit.title}" added to daily habits streak tracker`,
      { tab: 'habits', habitId: Number(id) }
    );
  };

  const updateTaskDate = async (taskId: number, newDate: string) => {
    await db.tasks.update(taskId, { date: newDate });
    triggerTwoWaySync();
  };

  const deleteHabit = async (habitId: number) => {
    await db.transaction('rw', [db.habits, db.habitLogs], async () => {
      await db.habits.delete(habitId);
      await db.habitLogs.where('habitId').equals(habitId).delete();
    });
    triggerTwoWaySync();
  };

  const toggleHabitLog = async (habitId: number, dateStr: string, currentStatus: boolean) => {
    const existingLog = await db.habitLogs
      .where('[habitId+date]')
      .equals([habitId, dateStr])
      .first();

    if (existingLog && existingLog.id) {
      await db.habitLogs.update(existingLog.id, { completed: !currentStatus });
    } else {
      await db.habitLogs.add({
        habitId,
        date: dateStr,
        completed: !currentStatus,
      });
    }
    triggerTwoWaySync();
  };

  const logFocusSession = async (session: Omit<FocusSession, 'id' | 'completedAt'>) => {
    await db.focusSessions.add({
      ...session,
      completedAt: Date.now(),
    });
    triggerTwoWaySync();
  };

  const deleteFocusSession = async (sessionId: number) => {
    await db.focusSessions.delete(sessionId);
    triggerTwoWaySync();
  };

  const addLink = async (link: Omit<import('../types').LinkItem, 'id' | 'createdAt'>) => {
    await db.links.add({
      ...link,
      createdAt: Date.now(),
    });
    triggerTwoWaySync();
  };

  const deleteLink = async (linkId: number) => {
    await db.links.delete(linkId);
    triggerTwoWaySync();
  };

  const incrementLinkClicks = async (linkId: number) => {
    const item = await db.links.get(linkId);
    if (item && item.id) {
      await db.links.update(item.id, { clicks: (item.clicks || 0) + 1 });
      triggerTwoWaySync();
    }
  };

  const bulkAddTasks = async (tasksList: Omit<Task, 'id' | 'createdAt'>[]) => {
    const payload = tasksList.map((t, idx) => ({
      ...t,
      createdAt: Date.now() + idx,
    }));
    await db.tasks.bulkAdd(payload);
    triggerTwoWaySync();
  };

  return {
    allTasks,
    allHabitLogs,
    allFocusSessions,
    allLinks,
    priorityTasks,
    backlogTasks,
    habitsWithStats,
    todaysFocusSessions,
    overallStreak,
    activityStats,
    dayStats,
    canAddPriority: priorityTasks.length < 3,
    addTask,
    bulkAddTasks,
    toggleTaskComplete,
    toggleSubTaskComplete,
    promoteTaskToPriority,
    demoteTaskToBacklog,
    deleteTask,
    updateTaskDate,
    addHabit,
    deleteHabit,
    toggleHabitLog,
    logFocusSession,
    deleteFocusSession,
    addLink,
    deleteLink,
    incrementLinkClicks,
  };
}
