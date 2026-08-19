import { format } from 'date-fns';
import { db } from './db';
import { getTodayString } from './dateUtils';
import type { Task, Habit, HabitLog, FocusSession } from '../types';

export interface PlannerContextSnapshot {
  date: string;
  dayOfWeek: string;
  priorities: Task[];
  regularTasks: Task[];
  backlogTasks: Task[];
  habits: {
    title: string;
    targetDays: string[];
    completedToday: boolean;
  }[];
  focusToday: {
    totalMinutes: number;
    sessionsCount: number;
    recentSessions: { taskTitle?: string; durationMinutes: number }[];
  };
  dailyMood?: string;
  dailyNote?: string;
  scratchpadNotes?: string;
}

export async function buildPlannerRAGContext(targetDate: string = getTodayString()): Promise<string> {
  const dateObj = new Date();
  const dayOfWeek = format(dateObj, 'EEEE');

  // 1. Fetch Tasks
  const allTasks = await db.tasks.toArray();
  const todayTasks = allTasks.filter((t) => t.date === targetDate);
  const priorities = todayTasks.filter((t) => t.isPriority);
  const regularTasks = todayTasks.filter((t) => !t.isPriority);
  const backlogTasks = allTasks.filter((t) => t.date !== targetDate && !t.isCompleted);

  // 2. Fetch Habits & Logs
  const allHabits = await db.habits.filter((h) => !h.archived).toArray();
  const todayLogs = await db.habitLogs.where('date').equals(targetDate).toArray();
  const completedHabitIds = new Set(todayLogs.filter((l) => l.completed).map((l) => l.habitId));

  const habitsFormatted = allHabits.map((h) => ({
    title: h.title,
    targetDays: h.targetDays,
    completedToday: completedHabitIds.has(h.id || 0),
  }));

  // 3. Fetch Focus Sessions for Today
  const todayFocus = await db.focusSessions.where('date').equals(targetDate).toArray();
  const totalFocusMinutes = todayFocus.reduce((acc, s) => acc + s.durationMinutes, 0);

  // 4. LocalStorage Reflection & Scratchpad
  let dailyMood = 'none';
  let dailyNote = '';
  let scratchpadNotes = '';

  if (typeof window !== 'undefined') {
    dailyMood = localStorage.getItem(`kairo_daily_mood_${targetDate}`) || 'not set';
    dailyNote = localStorage.getItem(`kairo_daily_note_${targetDate}`) || '';
    scratchpadNotes = localStorage.getItem('kairo_scratchpad_notes') || '';
  }

  // Format into compact, high-signal Markdown context for the LLM
  const lines: string[] = [];

  lines.push(`## Current Time & Date: ${targetDate} (${dayOfWeek})`);

  // Daily State
  lines.push(`\n### Daily State:`);
  lines.push(`- Mood / State: ${dailyMood}`);
  if (dailyNote.trim()) {
    lines.push(`- Daily Reflection: "${dailyNote.trim()}"`);
  }

  // Priorities
  lines.push(`\n### Today's Top Priorities (Target: 3 slots max):`);
  if (priorities.length === 0) {
    lines.push(`- (No priority tasks set for today yet)`);
  } else {
    priorities.forEach((t, i) => {
      const subtaskStr = t.subtasks && t.subtasks.length > 0
        ? ` [Subtasks: ${t.subtasks.map(s => `${s.isCompleted ? '✓' : '○'} ${s.title}`).join(', ')}]`
        : '';
      lines.push(
        `${i + 1}. [${t.isCompleted ? 'COMPLETED' : 'PENDING'}] "${t.title}" (${t.category || 'general'}, est: ${t.estimatedMinutes || 30}m)${subtaskStr}`
      );
    });
  }

  // Regular Tasks for Today
  lines.push(`\n### Other Scheduled Tasks for Today:`);
  if (regularTasks.length === 0) {
    lines.push(`- (None)`);
  } else {
    regularTasks.forEach((t) => {
      lines.push(
        `- [${t.isCompleted ? 'COMPLETED' : 'PENDING'}] "${t.title}" (${t.category || 'general'})`
      );
    });
  }

  // Backlog
  lines.push(`\n### Unfinished Backlog Ideas (${backlogTasks.length} total):`);
  if (backlogTasks.length === 0) {
    lines.push(`- (Empty backlog)`);
  } else {
    backlogTasks.slice(0, 8).forEach((t) => {
      lines.push(`- "${t.title}" (${t.category || 'general'})`);
    });
    if (backlogTasks.length > 8) {
      lines.push(`- ...and ${backlogTasks.length - 8} more backlog items`);
    }
  }

  // Habits
  lines.push(`\n### Daily Habits:`);
  habitsFormatted.forEach((h) => {
    lines.push(
      `- [${h.completedToday ? 'DONE TODAY' : 'NOT DONE YET'}] "${h.title}" (Days: ${h.targetDays.join(', ')})`
    );
  });

  // Focus
  lines.push(`\n### Focus Work:`);
  lines.push(`- Total Deep Work Logged Today: ${totalFocusMinutes} minutes (${todayFocus.length} sessions)`);

  // Scratchpad
  if (scratchpadNotes.trim()) {
    lines.push(`\n### User's Scratchpad Quick Memo:`);
    lines.push(`"""\n${scratchpadNotes.trim().slice(0, 600)}\n"""`);
  }

  return lines.join('\n');
}
