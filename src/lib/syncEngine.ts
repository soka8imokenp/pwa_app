import { db } from './db';
import { syncApi, getAuthToken } from './api';

const LAST_SYNC_KEY = 'kairo_last_sync_timestamp';

let isSyncing = false;

export function getLastSyncTimestamp(): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(LAST_SYNC_KEY)) || 0;
}

export function setLastSyncTimestamp(ts: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_SYNC_KEY, String(ts));
}

export async function triggerTwoWaySync(): Promise<boolean> {
  const token = getAuthToken();
  if (!token || isSyncing) return false;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    isSyncing = true;

    // 1. Gather all local data for push
    const [localTasks, localHabits, localSessions, localLinks] = await Promise.all([
      db.tasks.toArray(),
      db.habits.toArray(),
      db.focusSessions.toArray(),
      db.links.toArray(),
    ]);

    const pushPayload = {
      tasks: localTasks.map((t) => ({
        clientLocalId: t.id,
        title: t.title,
        isPriority: t.isPriority,
        isCompleted: t.isCompleted,
        date: t.date,
        category: t.category,
        estimatedMinutes: t.estimatedMinutes,
        createdAt: t.createdAt,
      })),
      habits: localHabits.map((h) => ({
        clientLocalId: h.id,
        title: h.title,
        icon: h.icon,
        color: h.color,
        targetDays: h.targetDays,
        archived: h.archived,
        createdAt: h.createdAt,
      })),
      focusSessions: localSessions.map((s) => ({
        taskId: s.taskId,
        taskTitle: s.taskTitle,
        durationMinutes: s.durationMinutes,
        mode: s.mode,
        date: s.date,
        completedAt: s.completedAt || Date.now(),
      })),
      links: localLinks.map((l) => ({
        clientLocalId: l.id,
        title: l.title,
        url: l.url,
        icon: l.icon,
        iconBg: l.iconBg,
        category: l.category,
        clicks: l.clicks,
        createdAt: l.createdAt,
      })),
    };

    // 2. Push to backend
    await syncApi.push(pushPayload);

    // 3. Pull latest changes from backend
    const lastSync = getLastSyncTimestamp();
    const pullData = await syncApi.pull(lastSync > 0 ? lastSync : undefined);

    // 4. Merge incoming tasks into Dexie DB
    if (pullData.tasks && pullData.tasks.length > 0) {
      for (const remoteTask of pullData.tasks) {
        const existing = await db.tasks
          .filter((t) => t.title === remoteTask.title && t.date === remoteTask.date)
          .first();

        if (existing && existing.id) {
          await db.tasks.update(existing.id, {
            isCompleted: remoteTask.isCompleted,
            isPriority: remoteTask.isPriority,
            category: remoteTask.category,
            estimatedMinutes: remoteTask.estimatedMinutes,
          });
        } else {
          await db.tasks.add({
            title: remoteTask.title,
            isPriority: remoteTask.isPriority,
            isCompleted: remoteTask.isCompleted,
            date: remoteTask.date,
            category: remoteTask.category,
            estimatedMinutes: remoteTask.estimatedMinutes,
            createdAt: new Date(remoteTask.createdAt).getTime(),
          });
        }
      }
    }

    // 5. Merge incoming habits
    if (pullData.habits && pullData.habits.length > 0) {
      for (const remoteHabit of pullData.habits) {
        const existing = await db.habits
          .filter((h) => h.title === remoteHabit.title)
          .first();

        if (!existing) {
          await db.habits.add({
            title: remoteHabit.title,
            icon: remoteHabit.icon,
            color: remoteHabit.color,
            targetDays: remoteHabit.targetDays || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
            archived: remoteHabit.archived || false,
            createdAt: new Date(remoteHabit.createdAt).getTime(),
          });
        }
      }
    }

    setLastSyncTimestamp(pullData.serverTimestamp);
    return true;
  } catch (err) {
    console.warn('[SyncEngine] Background sync deferred:', err);
    return false;
  } finally {
    isSyncing = false;
  }
}
