import Dexie, { type Table } from 'dexie';
import { format, subDays } from 'date-fns';
import type { Task, Habit, HabitLog, FocusSession, LinkItem } from '../types';

export interface UserSettingRecord {
  key: string;
  value: any;
}

export class PlannerDatabase extends Dexie {
  tasks!: Table<Task>;
  habits!: Table<Habit>;
  habitLogs!: Table<HabitLog>;
  focusSessions!: Table<FocusSession>;
  links!: Table<LinkItem>;
  settings!: Table<UserSettingRecord>;

  constructor() {
    super('PragmaticPlannerDB');
    this.version(2).stores({
      tasks: '++id, date, isPriority, isCompleted, createdAt',
      habits: '++id, archived, createdAt',
      habitLogs: '++id, [habitId+date], date, habitId',
      focusSessions: '++id, date, taskId, completedAt',
      links: '++id, title, category, clicks, createdAt',
      settings: 'key'
    });
  }
}

export const db = new PlannerDatabase();

// Seed initial sample data if database is empty
export async function seedDemoDataIfEmpty() {
  const taskCount = await db.tasks.count();
  const linkCount = await db.links.count();

  // Seed default links matching the reference image if empty
  if (linkCount === 0) {
    await db.links.bulkAdd([
      {
        title: 'Buy Me A Coffee',
        url: 'https://buymeacoffee.com',
        icon: '☕',
        iconBg: '#FEF08A',
        category: 'support',
        clicks: 42,
        createdAt: Date.now() - 86400000 * 10,
      },
      {
        title: "JannetTV's YouTube",
        url: 'https://youtube.com',
        icon: '▶️',
        iconBg: '#FECDD3',
        category: 'media',
        clicks: 128,
        createdAt: Date.now() - 86400000 * 9,
      },
      {
        title: "JannetTV's Happs",
        url: 'https://happs.tv',
        icon: '〰️',
        iconBg: '#FCE7F3',
        category: 'social',
        clicks: 89,
        createdAt: Date.now() - 86400000 * 8,
      },
      {
        title: 'Lo-Fi Focus Playlist',
        url: 'https://spotify.com',
        icon: '🎵',
        iconBg: '#DCFCE7',
        category: 'focus',
        clicks: 76,
        createdAt: Date.now() - 86400000 * 7,
      },
      {
        title: 'Open Source GitHub',
        url: 'https://github.com',
        icon: '💻',
        iconBg: '#E9D5FF',
        category: 'code',
        clicks: 110,
        createdAt: Date.now() - 86400000 * 6,
      },
    ]);
  }

  if (taskCount > 0) return;

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
  const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');

  // 1. Initial Habits
  const habit1Id = await db.habits.add({
    title: 'Code Deep Work (2h)',
    icon: '⚡',
    color: '#C084FC',
    targetDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    archived: false,
    createdAt: Date.now() - 86400000 * 14,
  });

  const habit2Id = await db.habits.add({
    title: 'Read 20 pages (Tech/Philosophy)',
    icon: '📚',
    color: '#86EFAC',
    targetDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    archived: false,
    createdAt: Date.now() - 86400000 * 14,
  });

  const habit3Id = await db.habits.add({
    title: 'Hydrate 2.5L Water',
    icon: '💧',
    color: '#BAE6FD',
    targetDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    archived: false,
    createdAt: Date.now() - 86400000 * 14,
  });

  const habit4Id = await db.habits.add({
    title: 'Gym / Stretch Session',
    icon: '💪',
    color: '#FDBA74',
    targetDays: ['mon', 'wed', 'fri', 'sun'],
    archived: false,
    createdAt: Date.now() - 86400000 * 14,
  });

  // 2. Initial Habit Logs for streak simulation
  const pastDays = [
    { d: threeDaysAgo, h1: true, h2: true, h3: true, h4: true },
    { d: twoDaysAgo, h1: true, h2: true, h3: true, h4: false },
    { d: yesterday, h1: true, h2: true, h3: true, h4: true },
    { d: today, h1: true, h2: false, h3: true, h4: false },
  ];

  for (const day of pastDays) {
    await db.habitLogs.bulkAdd([
      { habitId: habit1Id as number, date: day.d, completed: day.h1 },
      { habitId: habit2Id as number, date: day.d, completed: day.h2 },
      { habitId: habit3Id as number, date: day.d, completed: day.h3 },
      { habitId: habit4Id as number, date: day.d, completed: day.h4 },
    ]);
  }

  // 3. Initial Top 3 Tasks for Today
  await db.tasks.bulkAdd([
    {
      title: 'Finish Soft Brutalism PWA UI Architecture',
      isPriority: true,
      isCompleted: true,
      date: today,
      category: 'code',
      estimatedMinutes: 60,
      createdAt: Date.now() - 3600000 * 4,
    },
    {
      title: 'Implement Dexie.js Live Queries & Streaks',
      isPriority: true,
      isCompleted: false,
      date: today,
      category: 'code',
      estimatedMinutes: 45,
      createdAt: Date.now() - 3600000 * 3,
    },
    {
      title: 'Review weekly product velocity & roadmap',
      isPriority: true,
      isCompleted: false,
      date: today,
      category: 'design',
      estimatedMinutes: 30,
      createdAt: Date.now() - 3600000 * 2,
    },
    {
      title: 'Refactor Tailwind color palette variables',
      isPriority: false,
      isCompleted: true,
      date: today,
      category: 'design',
      estimatedMinutes: 20,
      createdAt: Date.now() - 3600000 * 5,
    },
    {
      title: 'Test Web Audio API click haptic synthesizers',
      isPriority: false,
      isCompleted: false,
      date: today,
      category: 'code',
      estimatedMinutes: 15,
      createdAt: Date.now() - 3600000 * 1,
    },
    {
      title: 'Draft weekly architecture changelog',
      isPriority: false,
      isCompleted: false,
      date: today,
      category: 'admin',
      estimatedMinutes: 25,
      createdAt: Date.now(),
    },
  ]);

  // 4. Focus Sessions
  await db.focusSessions.bulkAdd([
    {
      taskId: 1,
      taskTitle: 'Finish Soft Brutalism PWA UI Architecture',
      durationMinutes: 50,
      completedAt: Date.now() - 7200000,
      date: today,
      mode: 'deepwork',
    },
    {
      taskId: 4,
      taskTitle: 'Refactor Tailwind color palette variables',
      durationMinutes: 25,
      completedAt: Date.now() - 3600000,
      date: today,
      mode: 'pomodoro',
    },
    {
      taskTitle: 'Yesterday Core Engine Build',
      durationMinutes: 50,
      completedAt: Date.now() - 86400000,
      date: yesterday,
      mode: 'deepwork',
    },
    {
      taskTitle: 'Previous Milestone Focus',
      durationMinutes: 50,
      completedAt: Date.now() - 86400000 * 2,
      date: twoDaysAgo,
      mode: 'deepwork',
    }
  ]);
}
