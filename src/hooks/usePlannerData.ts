import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDemoDataIfEmpty } from '../lib/db';
import { migrateExistingMealsToEnglish } from '../lib/mealTranslator';
import type { Task, Habit, HabitLog, FocusSession, HabitWithStats, DayOverviewStats } from '../types';
import { calculateHabitStats, calculateOverallActivityStreak, OverallActivityStats } from '../lib/streaks';
import { triggerTwoWaySync } from '../lib/syncEngine';
import { sendLocalNotification } from '../lib/notifications';
import { logActivity, seedInitialActivityFromHistoryIfEmpty } from '../lib/activityLogger';

const getLanguage = (): 'uz' | 'en' | 'ru' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('kairo_app_language');
    if (saved === 'ru' || saved === 'en' || saved === 'uz') return saved;
  }
  return 'uz';
};

export function usePlannerData(selectedDate: string) {
  // Ensure database is initialized with initial sample data on first load and trigger sync
  useEffect(() => {
    seedDemoDataIfEmpty().then(() => {
      seedInitialActivityFromHistoryIfEmpty();
      migrateExistingMealsToEnglish().finally(() => {
        triggerTwoWaySync();
      });
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
    return dateTasks
      .filter((t) => t.isPriority)
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999;
        const orderB = typeof b.order === 'number' ? b.order : 999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return (Number(a.id) || 0) - (Number(b.id) || 0);
      })
      .slice(0, 3);
  }, [dateTasks]);

  const backlogTasks = useMemo(() => {
    return allTasks
      .filter((t) => !t.isPriority && (t.date === selectedDate || !t.isCompleted))
      .sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
  }, [allTasks, selectedDate]);

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

    const lang = getLanguage();
    const taskDetails =
      lang === 'uz'
        ? (task.isPriority ? 'Top-3 ustuvorliklarga qoʻshildi' : 'Bosh rejaga qoʻshildi')
        : lang === 'ru'
        ? (task.isPriority ? 'Добавлено в топ-3 приоритетов' : 'Добавлено в бэклог')
        : (task.isPriority ? 'Added to Top 3 Priorities' : 'Added to Backlog');

    const notifTitle =
      lang === 'uz'
        ? 'Vazifa rejalashtirildi'
        : lang === 'ru'
        ? 'Задача запланирована'
        : 'Task Scheduled';

    const notifBody =
      lang === 'uz'
        ? `"${task.title}" ${task.isPriority ? 'Top ustuvorliklar' : 'Bosh reja'}ga saqlandi`
        : lang === 'ru'
        ? `"${task.title}" сохранено в ${task.isPriority ? 'Топ приоритеты' : 'Бэклог'}`
        : `"${task.title}" saved to ${task.isPriority ? 'Top Priorities' : 'Backlog'}`;

    logActivity({
      action: 'created',
      entity: task.isPriority ? 'priority' : 'backlog',
      title: task.title,
      details: taskDetails,
    });
    sendLocalNotification(
      notifTitle,
      notifBody,
      { tab: task.isPriority ? 'priorities' : 'backlog', taskId: Number(id) }
    );
  };

  const toggleTaskComplete = async (task: Task) => {
    if (!task.id) return;
    const nextDone = !task.isCompleted;
    await db.tasks.update(task.id, { isCompleted: nextDone, updatedAt: Date.now() });
    triggerTwoWaySync();

    const lang = getLanguage();
    const completeDetails =
      lang === 'uz'
        ? (nextDone ? 'Bajarildi deb belgilandi' : 'Qayta ochildi')
        : lang === 'ru'
        ? (nextDone ? 'Отмечено выполненным' : 'Задача возобновлена')
        : (nextDone ? 'Marked as completed' : 'Reopened task');

    logActivity({
      action: nextDone ? 'completed' : 'uncompleted',
      entity: task.isPriority ? 'priority' : 'task',
      title: task.title,
      details: completeDetails,
    });
  };

  const toggleSubTaskComplete = async (taskId: number, subTaskId: string) => {
    const task = await db.tasks.get(taskId);
    if (!task || !task.subtasks) return;
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    await db.tasks.update(taskId, { subtasks: updatedSubtasks, updatedAt: Date.now() });
    triggerTwoWaySync();
  };

  const promoteTaskToPriority = async (task: Task) => {
    if (!task.id) return;
    if (priorityTasks.length >= 3) return;
    await db.tasks.update(task.id, { isPriority: true, date: selectedDate, order: priorityTasks.length, updatedAt: Date.now() });
    triggerTwoWaySync();
    logActivity({
      action: 'promoted',
      entity: 'priority',
      title: task.title,
      details: 'Promoted from Backlog to Top 3 Priorities',
    });
  };

  const demoteTaskToBacklog = async (task: Task) => {
    if (!task.id) return;
    await db.tasks.update(task.id, { isPriority: false, order: undefined, updatedAt: Date.now() });
    triggerTwoWaySync();
    logActivity({
      action: 'demoted',
      entity: 'backlog',
      title: task.title,
      details: 'Moved from Top 3 to Backlog',
    });
  };

  const reorderPriorityTasks = async (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex < 0 ||
      sourceIndex >= priorityTasks.length ||
      targetIndex < 0 ||
      targetIndex >= priorityTasks.length ||
      sourceIndex === targetIndex
    ) {
      return;
    }

    const updated = [...priorityTasks];
    const [movedTask] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, movedTask);

    await Promise.all(
      updated.map(async (t, idx) => {
        const numId = Number(t.id);
        if (isNaN(numId)) return;
        await db.tasks.update(numId, { order: idx });
      })
    );
    triggerTwoWaySync();
  };

  const deleteTask = async (taskId: number) => {
    const taskToDelete = await db.tasks.get(taskId);
    await db.tasks.delete(taskId);
    triggerTwoWaySync();
    if (taskToDelete) {
      logActivity({
        action: 'deleted',
        entity: taskToDelete.isPriority ? 'priority' : 'task',
        title: taskToDelete.title,
        details: 'Task deleted permanently',
      });
    }
  };

  const addHabit = async (habit: Omit<Habit, 'id' | 'createdAt' | 'archived'>) => {
    const id = await db.habits.add({
      ...habit,
      archived: false,
      createdAt: Date.now(),
    });
    triggerTwoWaySync();

    const lang = getLanguage();
    const habitDetails =
      lang === 'uz'
        ? 'Yangi kunlik odat trekeri yaratildi'
        : lang === 'ru'
        ? 'Создан новый трекер ежедневной привычки'
        : 'Created new daily habit tracker';

    const habitNotifTitle =
      lang === 'uz'
        ? 'Odat yaratildi'
        : lang === 'ru'
        ? 'Привычка создана'
        : 'Habit Created';

    const habitNotifBody =
      lang === 'uz'
        ? `"${habit.title}" kunlik odatlar trekeriga qoʻshildi`
        : lang === 'ru'
        ? `"${habit.title}" добавлена в трекер ежедневных привычек`
        : `"${habit.title}" added to daily habits streak tracker`;

    logActivity({
      action: 'created',
      entity: 'habit',
      title: habit.title,
      details: habitDetails,
    });
    sendLocalNotification(
      habitNotifTitle,
      habitNotifBody,
      { tab: 'habits', habitId: Number(id) }
    );
  };

  const updateTaskDate = async (taskId: number, newDate: string) => {
    await db.tasks.update(taskId, { date: newDate, updatedAt: Date.now() });
    triggerTwoWaySync();
  };

  const deleteHabit = async (habitId: number) => {
    const habitToDelete = await db.habits.get(habitId);
    await db.transaction('rw', [db.habits, db.habitLogs], async () => {
      await db.habits.delete(habitId);
      await db.habitLogs.where('habitId').equals(habitId).delete();
    });
    triggerTwoWaySync();
    if (habitToDelete) {
      const lang = getLanguage();
      const deleteDetails =
        lang === 'uz'
          ? 'Odat butunlay oʻchirildi'
          : lang === 'ru'
          ? 'Привычка удалена навсегда'
          : 'Habit deleted permanently';

      logActivity({
        action: 'deleted',
        entity: 'habit',
        title: habitToDelete.title,
        details: deleteDetails,
      });
    }
  };

  const toggleHabitLog = async (habitId: number, dateStr: string, currentStatus: boolean) => {
    const existingLog = await db.habitLogs
      .where('[habitId+date]')
      .equals([habitId, dateStr])
      .first();

    const nextCompleted = !currentStatus;
    if (existingLog && existingLog.id) {
      await db.habitLogs.update(existingLog.id, { completed: nextCompleted });
    } else {
      await db.habitLogs.add({
        habitId,
        date: dateStr,
        completed: nextCompleted,
      });
    }
    triggerTwoWaySync();

    const targetHabit = allHabits.find((h) => h.id === habitId);
    const lang = getLanguage();
    const habitLogDetails =
      lang === 'uz'
        ? (nextCompleted ? `${dateStr} uchun bajarilganlik qayd etildi` : `${dateStr} uchun belgi olib tashlandi`)
        : lang === 'ru'
        ? (nextCompleted ? `Отмечено выполнение на ${dateStr}` : `Снята отметка за ${dateStr}`)
        : (nextCompleted ? `Logged completion for ${dateStr}` : `Unchecked for ${dateStr}`);

    logActivity({
      action: nextCompleted ? 'completed' : 'uncompleted',
      entity: 'habit',
      title: targetHabit?.title || (lang === 'uz' ? 'Odat' : lang === 'ru' ? 'Привычка' : 'Habit'),
      details: habitLogDetails,
    });
  };

  const logFocusSession = async (session: Omit<FocusSession, 'id' | 'completedAt'>) => {
    const now = Date.now();
    await db.focusSessions.add({
      ...session,
      completedAt: now,
    });
    triggerTwoWaySync();

    const lang = getLanguage();
    const focusTitle = session.taskTitle || (lang === 'uz' ? 'Fokus seansi' : lang === 'ru' ? 'Сессия фокуса' : 'Focus Session');
    const focusDetails =
      lang === 'uz'
        ? `${session.durationMinutes} daqiqalik fokus yakunlandi (${session.mode})`
        : lang === 'ru'
        ? `${session.durationMinutes} мин фокуса завершено (${session.mode})`
        : `${session.durationMinutes}m focus completed (${session.mode})`;

    logActivity({
      action: 'focus',
      entity: 'focus',
      title: focusTitle,
      details: focusDetails,
      timestamp: now,
    });
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
    reorderPriorityTasks,
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
