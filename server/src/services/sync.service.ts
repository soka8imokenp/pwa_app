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
    habitId: string | number;
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
}

export async function processSyncPush(userId: string, payload: ClientSyncPushPayload) {
  const now = new Date();

  // 1. Process Tasks
  if (payload.tasks && payload.tasks.length > 0) {
    for (const item of payload.tasks) {
      if (item.id) {
        await prisma.task.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            userId,
            clientLocalId: item.clientLocalId,
            title: item.title,
            isPriority: item.isPriority,
            isCompleted: item.isCompleted,
            date: item.date,
            category: item.category || 'general',
            estimatedMinutes: item.estimatedMinutes || 30,
            deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
          },
          update: {
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

  // 2. Process Habits
  if (payload.habits && payload.habits.length > 0) {
    for (const item of payload.habits) {
      const targetDaysStr = JSON.stringify(item.targetDays || ['mon','tue','wed','thu','fri','sat','sun']);
      if (item.id) {
        await prisma.habit.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            userId,
            clientLocalId: item.clientLocalId,
            title: item.title,
            icon: item.icon || 'zap',
            color: item.color || '#FFDE59',
            targetDays: targetDaysStr,
            archived: item.archived || false,
            deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
          },
          update: {
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

  // 3. Process Focus Sessions
  if (payload.focusSessions && payload.focusSessions.length > 0) {
    for (const item of payload.focusSessions) {
      await prisma.focusSession.create({
        data: {
          userId,
          taskTitle: item.taskTitle || 'Focus Session',
          durationMinutes: item.durationMinutes,
          mode: item.mode || 'pomodoro',
          date: item.date,
          completedAt: BigInt(item.completedAt || Date.now()),
        },
      });
    }
  }

  // 4. Process Links
  if (payload.links && payload.links.length > 0) {
    for (const item of payload.links) {
      if (item.id) {
        await prisma.link.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            userId,
            clientLocalId: item.clientLocalId,
            title: item.title,
            url: item.url,
            icon: item.icon || 'link',
            iconBg: item.iconBg || '#FFDE59',
            category: item.category || 'general',
            clicks: item.clicks || 0,
            deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
          },
          update: {
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

  return { success: true, serverTimestamp: Date.now() };
}

export async function processSyncPull(userId: string, sinceTimestamp?: number) {
  const since = sinceTimestamp ? new Date(sinceTimestamp) : new Date(0);

  const [tasks, habits, focusSessions, links] = await Promise.all([
    prisma.task.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.habit.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.focusSession.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.link.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
  ]);

  // Convert BigInt to number for JSON serialization
  const serializedFocus = focusSessions.map((s) => ({
    ...s,
    completedAt: Number(s.completedAt),
  }));

  return {
    tasks,
    habits: habits.map((h) => ({
      ...h,
      targetDays: JSON.parse(h.targetDays || '[]'),
    })),
    focusSessions: serializedFocus,
    links,
    serverTimestamp: Date.now(),
  };
}
