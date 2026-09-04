import { z } from 'zod';

export const taskSyncSchema = z.object({
  clientLocalId: z.number().optional(),
  id: z.string().optional(),
  title: z.string().min(1).max(300),
  isPriority: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  date: z.string(),
  category: z.string().max(100).optional(),
  estimatedMinutes: z.number().min(0).max(1440).optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  deletedAt: z.number().nullable().optional(),
});

export const habitSyncSchema = z.object({
  clientLocalId: z.number().optional(),
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  targetDays: z.array(z.string()).default([]),
  archived: z.boolean().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  deletedAt: z.number().nullable().optional(),
});

export const habitLogSyncSchema = z.object({
  clientLocalHabitId: z.number().optional(),
  habitId: z.union([z.string(), z.number()]).optional(),
  habitTitle: z.string().optional(),
  date: z.string(),
  completed: z.boolean(),
});

export const focusSessionSyncSchema = z.object({
  taskId: z.union([z.string(), z.number()]).nullable().optional(),
  taskTitle: z.string().optional(),
  durationMinutes: z.number().min(0).max(1440),
  mode: z.string().optional(),
  date: z.string(),
  completedAt: z.number(),
});

export const linkSyncSchema = z.object({
  clientLocalId: z.number().optional(),
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  url: z.string().url().or(z.string().min(1)),
  icon: z.string().max(100).optional(),
  iconBg: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  clicks: z.number().min(0).optional(),
  createdAt: z.number().optional(),
  deletedAt: z.number().nullable().optional(),
});

export const healthProfileSyncSchema = z.object({
  age: z.number().min(1).max(150),
  gender: z.string(),
  height: z.number().min(30).max(300),
  currentWeight: z.number().min(20).max(500),
  targetWeight: z.number().min(20).max(500),
  waistCm: z.number().min(20).max(300).optional(),
  activityLevel: z.string(),
  goal: z.string(),
});

export const mealLogSyncSchema = z.object({
  date: z.string(),
  name: z.string().min(1).max(200),
  mealType: z.string(),
  kcal: z.number().min(0),
  proteinGrams: z.number().min(0),
  carbsGrams: z.number().min(0),
  fatGrams: z.number().min(0),
  time: z.string().optional(),
  aiEstimated: z.boolean().optional(),
});

export const waterLogSyncSchema = z.object({
  date: z.string(),
  amountMl: z.number().min(0).max(20000),
});

export const workoutLogSyncSchema = z.object({
  date: z.string(),
  title: z.string().min(1).max(200),
  category: z.string(),
  durationMinutes: z.number().min(0).max(1440),
  caloriesBurned: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export const syncPushPayloadSchema = z.object({
  tasks: z.array(taskSyncSchema).optional(),
  habits: z.array(habitSyncSchema).optional(),
  habitLogs: z.array(habitLogSyncSchema).optional(),
  focusSessions: z.array(focusSessionSyncSchema).optional(),
  links: z.array(linkSyncSchema).optional(),
  healthProfile: healthProfileSyncSchema.optional(),
  weightLogs: z.array(z.any()).optional(),
  mealLogs: z.array(mealLogSyncSchema).optional(),
  waterLogs: z.array(waterLogSyncSchema).optional(),
  workoutLogs: z.array(workoutLogSyncSchema).optional(),
});
