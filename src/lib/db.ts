import Dexie, { type Table } from 'dexie';
import { format } from 'date-fns';
import type { Task, Habit, HabitLog, FocusSession, LinkItem } from '../types';
import type { HealthProfile, WeightLog, MealLog, WaterLog, WorkoutLog, StepLog } from '../types/health';
import { DEFAULT_HEALTH_PROFILE, calculateBmi } from './healthFormulas';

export interface UserSettingRecord {
  key: string;
  value: any;
}

export interface ActivityLog {
  id?: number;
  timestamp: number;
  date: string;
  action: 'created' | 'completed' | 'uncompleted' | 'deleted' | 'promoted' | 'demoted' | 'focus' | 'weight' | 'habit' | 'meal' | 'water';
  entity: 'task' | 'priority' | 'backlog' | 'habit' | 'focus' | 'scale' | 'nutrition' | 'system';
  title: string;
  details?: string;
  badge?: string;
  metadata?: any;
}

export class PlannerDatabase extends Dexie {
  tasks!: Table<Task>;
  habits!: Table<Habit>;
  habitLogs!: Table<HabitLog>;
  focusSessions!: Table<FocusSession>;
  links!: Table<LinkItem>;
  settings!: Table<UserSettingRecord>;
  healthProfile!: Table<HealthProfile>;
  weightLogs!: Table<WeightLog>;
  mealLogs!: Table<MealLog>;
  waterLogs!: Table<WaterLog>;
  workoutLogs!: Table<WorkoutLog>;
  stepLogs!: Table<StepLog>;
  activityLogs!: Table<ActivityLog>;

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
    this.version(3).stores({
      tasks: '++id, date, isPriority, isCompleted, createdAt, order',
    });
    this.version(4).stores({
      healthProfile: 'id',
      weightLogs: '++id, date, createdAt',
      mealLogs: '++id, date, mealType, createdAt',
      waterLogs: '++id, date, createdAt',
      workoutLogs: '++id, date, category, createdAt',
    });
    this.version(5).stores({
      tasks: '++id, date, isPriority, isCompleted, createdAt, order, updatedAt, deletedAt',
      habits: '++id, archived, createdAt, updatedAt, deletedAt',
      links: '++id, title, category, clicks, createdAt, updatedAt, deletedAt',
    });
    this.version(6).stores({
      activityLogs: '++id, timestamp, date, action, entity',
    });
    this.version(7).stores({
      stepLogs: '++id, &date, steps, caloriesBurned, distanceMeters, durationMinutes, createdAt',
    });
  }
}

export const db = new PlannerDatabase();

// Seed initial clean starter data if database is empty (0-day streak guaranteed on fresh install)
export async function seedDemoDataIfEmpty() {
  const taskCount = await db.tasks.count();
  const habitCount = await db.habits.count();
  const linkCount = await db.links.count();

  // Seed default links if empty
  if (linkCount === 0) {
    await db.links.bulkAdd([
      {
        title: 'Buy Me A Coffee',
        url: 'https://buymeacoffee.com',
        icon: '☕',
        iconBg: '#FEF08A',
        category: 'support',
        clicks: 0,
        createdAt: Date.now(),
      },
      {
        title: "JannetTV's YouTube",
        url: 'https://youtube.com',
        icon: '▶️',
        iconBg: '#FECDD3',
        category: 'media',
        clicks: 0,
        createdAt: Date.now(),
      },
      {
        title: 'Lo-Fi Focus Playlist',
        url: 'https://spotify.com',
        icon: '🎵',
        iconBg: '#DCFCE7',
        category: 'focus',
        clicks: 0,
        createdAt: Date.now(),
      },
      {
        title: 'Open Source GitHub',
        url: 'https://github.com',
        icon: '💻',
        iconBg: '#E9D5FF',
        category: 'code',
        clicks: 0,
        createdAt: Date.now(),
      },
    ]);
  }

  // Seed clean starter habits if empty (0 completed logs)
  if (habitCount === 0) {
    await db.habits.bulkAdd([
      {
        title: 'Code Deep Work (2h)',
        icon: '⚡',
        color: '#C084FC',
        targetDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        archived: false,
        createdAt: Date.now(),
      },
      {
        title: 'Read 20 pages',
        icon: '📚',
        color: '#86EFAC',
        targetDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        archived: false,
        createdAt: Date.now(),
      },
      {
        title: 'Hydrate 2.5L Water',
        icon: '💧',
        color: '#BAE6FD',
        targetDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        archived: false,
        createdAt: Date.now(),
      },
      {
        title: 'Gym / Stretch Session',
        icon: '💪',
        color: '#FDBA74',
        targetDays: ['mon', 'wed', 'fri', 'sun'],
        archived: false,
        createdAt: Date.now(),
      },
    ]);
  }

  // Seed clean starter tasks if empty (all uncompleted)
  if (taskCount === 0) {
    const today = format(new Date(), 'yyyy-MM-dd');
    await db.tasks.bulkAdd([
      {
        title: 'Set up your daily goals & priorities',
        isPriority: true,
        isCompleted: false,
        date: today,
        category: 'general',
        estimatedMinutes: 15,
        createdAt: Date.now(),
      },
      {
        title: 'Complete your first focus timer session',
        isPriority: true,
        isCompleted: false,
        date: today,
        category: 'code',
        estimatedMinutes: 25,
        createdAt: Date.now(),
      },
      {
        title: 'Check your habits to start your 1-day streak',
        isPriority: false,
        isCompleted: false,
        date: today,
        category: 'health',
        estimatedMinutes: 10,
        createdAt: Date.now(),
      },
    ]);
  }

}

// ==========================================
// Step Tracking Helpers & Formulas
// ==========================================

export function calculateStepCalories(steps: number, weightKg = 70): number {
  return Math.round(steps * (0.04 * (Math.max(35, weightKg) / 70)));
}

export function calculateStepDistanceMeters(steps: number, heightCm = 175): number {
  const strideMeters = (Math.max(120, heightCm) * 0.415) / 100;
  return Math.round(steps * strideMeters);
}

export function calculateStepDurationMinutes(steps: number): number {
  return Math.round(steps / 100);
}

export async function getStepLogForDate(date: string): Promise<StepLog | undefined> {
  return db.stepLogs.where('date').equals(date).first();
}

export async function upsertStepLog(
  date: string,
  steps: number,
  options?: {
    goal?: number;
    weightKg?: number;
    heightCm?: number;
    source?: 'sensor' | 'manual' | 'pedometer';
  }
): Promise<StepLog> {
  const existing = await getStepLogForDate(date);
  const goal = options?.goal ?? (existing?.goal || 10000);
  const weightKg = options?.weightKg ?? 70;
  const heightCm = options?.heightCm ?? 175;
  const safeSteps = Math.max(0, Math.round(steps));

  const caloriesBurned = calculateStepCalories(safeSteps, weightKg);
  const distanceMeters = calculateStepDistanceMeters(safeSteps, heightCm);
  const durationMinutes = calculateStepDurationMinutes(safeSteps);
  const now = Date.now();

  const record: StepLog = {
    ...(existing || {}),
    date,
    steps: safeSteps,
    goal,
    caloriesBurned,
    distanceMeters,
    durationMinutes,
    source: options?.source || existing?.source || 'manual',
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  };

  if (existing?.id) {
    record.id = existing.id;
    await db.stepLogs.put(record);
  } else {
    const id = await db.stepLogs.add(record);
    record.id = Number(id);
  }

  return record;
}
