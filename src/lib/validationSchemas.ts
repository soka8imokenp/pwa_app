import { z } from 'zod';

// 1. Task Schema
export const taskSchema = z.object({
  id: z.number().optional(),
  title: z.string().trim().min(1, 'Task title cannot be empty').max(300, 'Title is too long'),
  isPriority: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)'),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().optional(),
  deletedAt: z.number().nullable().optional(),
  category: z.enum(['code', 'design', 'health', 'learn', 'admin', 'general']).optional(),
  estimatedMinutes: z.number().min(0).max(1440).optional(),
  subtasks: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().trim().min(1),
        isCompleted: z.boolean(),
      })
    )
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringDays: z.array(z.string()).optional(),
  order: z.number().optional(),
});

// 2. Habit Schema
export const habitSchema = z.object({
  id: z.number().optional(),
  title: z.string().trim().min(1, 'Habit title cannot be empty').max(200, 'Title is too long'),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  targetDays: z.array(z.string()).default([]),
  archived: z.boolean().default(false),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().optional(),
  deletedAt: z.number().nullable().optional(),
  order: z.number().optional(),
});

// 3. Link Schema
export const linkSchema = z.object({
  id: z.number().optional(),
  title: z.string().trim().min(1, 'Link title cannot be empty').max(200),
  url: z.string().trim().url('Must be a valid URL'),
  icon: z.string().max(100).optional(),
  iconBg: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  clicks: z.number().min(0).default(0),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().optional(),
  deletedAt: z.number().nullable().optional(),
});

// 4. Health Profile Schema
export const healthProfileSchema = z.object({
  id: z.string().default('user'),
  name: z.string().optional(),
  age: z.number().min(1).max(150),
  gender: z.enum(['male', 'female']),
  height: z.number().min(30).max(300),
  currentWeight: z.number().min(20).max(500),
  targetWeight: z.number().min(20).max(500),
  waistCm: z.number().min(20).max(300).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very_active']),
  goal: z.enum(['lose', 'maintain', 'gain']),
  updatedAt: z.number().default(() => Date.now()),
});

// 5. Meal Log Schema
export const mealLogSchema = z.object({
  id: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1, 'Meal name cannot be empty').max(200),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  kcal: z.number().min(0).max(10000),
  proteinGrams: z.number().min(0).max(1000),
  carbsGrams: z.number().min(0).max(1000),
  fatGrams: z.number().min(0).max(1000),
  time: z.string().optional(),
  aiEstimated: z.boolean().optional(),
  createdAt: z.number().default(() => Date.now()),
});

// 6. AI Meal Estimate Schema (for parsing Gemini responses safely)
export const aiMealEstimateSchema = z.object({
  name: z.string().optional(),
  kcal: z.coerce.number().min(0).max(10000).default(350),
  proteinGrams: z.coerce.number().min(0).max(1000).default(20),
  carbsGrams: z.coerce.number().min(0).max(1000).default(40),
  fatGrams: z.coerce.number().min(0).max(1000).default(12),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
});

// 7. Generic validation helper
export function validateSafe<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((i) => i.message).join(', '),
  };
}
