import { prisma } from '../lib/prisma.js';

export interface ClientSyncPushPayload {
  tasks?: Array<{
    clientLocalId?: number;
    id?: string;
    title: string;
    isPriority: boolean;
    isCompleted: boolean;
    date: string;
    category?: string;
    estimatedMinutes?: number;
    createdAt?: number;
    updatedAt?: number;
    deletedAt?: number | null;
  }>;
  habits?: Array<{
    clientLocalId?: number;
    id?: string;
    title: string;
    icon?: string;
    color?: string;
    targetDays: string[];
    archived?: boolean;
    createdAt?: number;
    updatedAt?: number;
    deletedAt?: number | null;
  }>;
  habitLogs?: Array<{
    clientLocalHabitId?: number;
    habitId?: string | number;
    habitTitle?: string;
    date: string;
    completed: boolean;
  }>;
  focusSessions?: Array<{
    taskId?: string | number | null;
    taskTitle?: string;
    durationMinutes: number;
    mode?: string;
    date: string;
    completedAt: number;
  }>;
  links?: Array<{
    clientLocalId?: number;
    id?: string;
    title: string;
    url: string;
    icon?: string;
    iconBg?: string;
    category?: string;
    clicks?: number;
    createdAt?: number;
    deletedAt?: number | null;
  }>;
  healthProfile?: {
    age: number;
    gender: string;
    height: number;
    currentWeight: number;
    targetWeight: number;
    waistCm?: number;
    activityLevel: string;
    goal: string;
  };
  weightLogs?: Array<{
    date: string;
    weight: number;
    bmi: number;
    bodyFatPercentage?: number;
    waistCm?: number;
    note?: string;
  }>;
  mealLogs?: Array<{
    date: string;
    name: string;
    mealType: string;
    kcal: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    time?: string;
    aiEstimated?: boolean;
  }>;
  waterLogs?: Array<{
    date: string;
    amountMl: number;
  }>;
  workoutLogs?: Array<{
    date: string;
    title: string;
    category: string;
    durationMinutes: number;
    caloriesBurned?: number;
    notes?: string;
  }>;
}

export async function processSyncPush(userId: string, payload: ClientSyncPushPayload) {
  const now = new Date();

  // 1. Process Tasks (upsert with clientLocalId deduplication)
  if (payload.tasks && payload.tasks.length > 0) {
    for (const item of payload.tasks) {
      const existing = await prisma.task.findFirst({
        where: {
          userId,
          OR: [
            ...(item.id ? [{ id: item.id }] : []),
            ...(item.clientLocalId ? [{ clientLocalId: item.clientLocalId, date: item.date }] : []),
            { title: item.title, date: item.date },
          ],
        },
      });

      if (existing) {
        await prisma.task.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            isPriority: item.isPriority,
            isCompleted: item.isCompleted,
            date: item.date,
            category: item.category || 'general',
            estimatedMinutes: item.estimatedMinutes || 30,
            deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
            updatedAt: now,
          },
        });
      } else {
        await prisma.task.create({
          data: {
            userId,
            clientLocalId: item.clientLocalId,
            title: item.title,
            isPriority: item.isPriority,
            isCompleted: item.isCompleted,
            date: item.date,
            category: item.category || 'general',
            estimatedMinutes: item.estimatedMinutes || 30,
          },
        });
      }
    }
  }

  // 2. Process Habits (upsert with clientLocalId deduplication)
  if (payload.habits && payload.habits.length > 0) {
    for (const item of payload.habits) {
      const targetDaysStr = JSON.stringify(item.targetDays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
      const existing = await prisma.habit.findFirst({
        where: {
          userId,
          OR: [
            ...(item.id ? [{ id: item.id }] : []),
            ...(item.clientLocalId ? [{ clientLocalId: item.clientLocalId }] : []),
            { title: item.title },
          ],
        },
      });

      if (existing) {
        await prisma.habit.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            icon: item.icon || 'zap',
            color: item.color || '#FFDE59',
            targetDays: targetDaysStr,
            archived: item.archived || false,
            deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
            updatedAt: now,
          },
        });
      } else {
        await prisma.habit.create({
          data: {
            userId,
            clientLocalId: item.clientLocalId,
            title: item.title,
            icon: item.icon || 'zap',
            color: item.color || '#FFDE59',
            targetDays: targetDaysStr,
            archived: item.archived || false,
          },
        });
      }
    }
  }

  // 3. Process Habit Logs
  if (payload.habitLogs && payload.habitLogs.length > 0) {
    for (const log of payload.habitLogs) {
      const habit = await prisma.habit.findFirst({
        where: {
          userId,
          OR: [
            ...(log.clientLocalHabitId ? [{ clientLocalId: log.clientLocalHabitId }] : []),
            ...(log.habitTitle ? [{ title: log.habitTitle }] : []),
            ...(log.habitId && typeof log.habitId === 'string' ? [{ id: log.habitId }] : []),
          ],
        },
      });

      if (habit) {
        await prisma.habitLog.upsert({
          where: {
            userId_habitId_date: {
              userId,
              habitId: habit.id,
              date: log.date,
            },
          },
          create: {
            userId,
            habitId: habit.id,
            date: log.date,
            completed: log.completed,
          },
          update: {
            completed: log.completed,
            updatedAt: now,
          },
        });
      }
    }
  }

  // 4. Process Focus Sessions (deduplicate by userId and completedAt)
  if (payload.focusSessions && payload.focusSessions.length > 0) {
    for (const item of payload.focusSessions) {
      const completedAtBigInt = BigInt(item.completedAt || Date.now());
      const existing = await prisma.focusSession.findFirst({
        where: {
          userId,
          completedAt: completedAtBigInt,
        },
      });

      if (!existing) {
        await prisma.focusSession.create({
          data: {
            userId,
            taskTitle: item.taskTitle || 'Focus Session',
            durationMinutes: item.durationMinutes,
            mode: item.mode || 'pomodoro',
            date: item.date,
            completedAt: completedAtBigInt,
          },
        });
      }
    }
  }

  // 5. Process Links
  if (payload.links && payload.links.length > 0) {
    for (const item of payload.links) {
      const existing = await prisma.link.findFirst({
        where: {
          userId,
          OR: [
            ...(item.id ? [{ id: item.id }] : []),
            ...(item.clientLocalId ? [{ clientLocalId: item.clientLocalId }] : []),
            { url: item.url },
          ],
        },
      });

      if (existing) {
        await prisma.link.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            url: item.url,
            icon: item.icon || 'link',
            iconBg: item.iconBg || '#FFDE59',
            category: item.category || 'general',
            clicks: item.clicks || 0,
            deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
            updatedAt: now,
          },
        });
      } else {
        await prisma.link.create({
          data: {
            userId,
            clientLocalId: item.clientLocalId,
            title: item.title,
            url: item.url,
            icon: item.icon || 'link',
            iconBg: item.iconBg || '#FFDE59',
            category: item.category || 'general',
            clicks: item.clicks || 0,
          },
        });
      }
    }
  }

  // 6. Process Health Profile
  if (payload.healthProfile) {
    await prisma.healthProfile.upsert({
      where: { userId },
      create: {
        userId,
        age: payload.healthProfile.age,
        gender: payload.healthProfile.gender,
        height: payload.healthProfile.height,
        currentWeight: payload.healthProfile.currentWeight,
        targetWeight: payload.healthProfile.targetWeight,
        waistCm: payload.healthProfile.waistCm,
        activityLevel: payload.healthProfile.activityLevel,
        goal: payload.healthProfile.goal,
      },
      update: {
        age: payload.healthProfile.age,
        gender: payload.healthProfile.gender,
        height: payload.healthProfile.height,
        currentWeight: payload.healthProfile.currentWeight,
        targetWeight: payload.healthProfile.targetWeight,
        waistCm: payload.healthProfile.waistCm,
        activityLevel: payload.healthProfile.activityLevel,
        goal: payload.healthProfile.goal,
        updatedAt: now,
      },
    });
  }

  // 7. Process Weight Logs
  if (payload.weightLogs && payload.weightLogs.length > 0) {
    for (const log of payload.weightLogs) {
      await prisma.weightLog.upsert({
        where: {
          userId_date: {
            userId,
            date: log.date,
          },
        },
        create: {
          userId,
          date: log.date,
          weight: log.weight,
          bmi: log.bmi,
          bodyFatPercentage: log.bodyFatPercentage,
          waistCm: log.waistCm,
          note: log.note,
        },
        update: {
          weight: log.weight,
          bmi: log.bmi,
          bodyFatPercentage: log.bodyFatPercentage,
          waistCm: log.waistCm,
          note: log.note,
          updatedAt: now,
        },
      });
    }
  }

  // 8. Process Meal Logs
  if (payload.mealLogs && payload.mealLogs.length > 0) {
    for (const meal of payload.mealLogs) {
      const existing = await prisma.mealLog.findFirst({
        where: {
          userId,
          date: meal.date,
          name: meal.name,
          mealType: meal.mealType,
        },
      });

      if (!existing) {
        await prisma.mealLog.create({
          data: {
            userId,
            date: meal.date,
            name: meal.name,
            mealType: meal.mealType,
            kcal: meal.kcal,
            proteinGrams: meal.proteinGrams,
            carbsGrams: meal.carbsGrams,
            fatGrams: meal.fatGrams,
            time: meal.time,
            aiEstimated: meal.aiEstimated || false,
          },
        });
      }
    }
  }

  // 9. Process Water Logs
  if (payload.waterLogs && payload.waterLogs.length > 0) {
    for (const water of payload.waterLogs) {
      const existing = await prisma.waterLog.findFirst({
        where: {
          userId,
          date: water.date,
          amountMl: water.amountMl,
        },
      });

      if (!existing) {
        await prisma.waterLog.create({
          data: {
            userId,
            date: water.date,
            amountMl: water.amountMl,
          },
        });
      }
    }
  }

  // 10. Process Workout Logs
  if (payload.workoutLogs && payload.workoutLogs.length > 0) {
    for (const workout of payload.workoutLogs) {
      const existing = await prisma.workoutLog.findFirst({
        where: {
          userId,
          date: workout.date,
          title: workout.title,
        },
      });

      if (!existing) {
        await prisma.workoutLog.create({
          data: {
            userId,
            date: workout.date,
            title: workout.title,
            category: workout.category,
            durationMinutes: workout.durationMinutes,
            caloriesBurned: workout.caloriesBurned,
            notes: workout.notes,
          },
        });
      }
    }
  }

  return { success: true, serverTimestamp: Date.now() };
}

export async function processSyncPull(userId: string, sinceTimestamp?: number) {
  const since = sinceTimestamp ? new Date(sinceTimestamp) : new Date(0);

  const [
    tasks,
    habits,
    habitLogs,
    focusSessions,
    links,
    healthProfile,
    weightLogs,
    mealLogs,
    waterLogs,
    workoutLogs,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.habit.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.habitLog.findMany({
      where: { userId, updatedAt: { gte: since } },
      include: { habit: { select: { clientLocalId: true, title: true } } },
    }),
    prisma.focusSession.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.link.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.healthProfile.findUnique({
      where: { userId },
    }),
    prisma.weightLog.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.mealLog.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.waterLog.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.workoutLog.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
  ]);

  // Convert BigInt to number for JSON serialization
  const serializedFocus = focusSessions.map((s) => ({
    ...s,
    completedAt: Number(s.completedAt),
  }));

  // Map habit logs with local habit info
  const serializedHabitLogs = habitLogs.map((hl) => ({
    date: hl.date,
    completed: hl.completed,
    clientLocalHabitId: hl.habit?.clientLocalId,
    habitTitle: hl.habit?.title,
  }));

  return {
    tasks,
    habits: habits.map((h) => ({
      ...h,
      targetDays: JSON.parse(h.targetDays || '[]'),
    })),
    habitLogs: serializedHabitLogs,
    focusSessions: serializedFocus,
    links,
    healthProfile,
    weightLogs,
    mealLogs,
    waterLogs,
    workoutLogs,
    serverTimestamp: Date.now(),
  };
}
