import { db, type ActivityLog } from './db';

/**
 * Logs a user action into the persistent Activity Logs audit trail
 */
export async function logActivity(
  entry: Omit<ActivityLog, 'id' | 'timestamp' | 'date'> & { timestamp?: number; date?: string }
): Promise<void> {
  try {
    const now = entry.timestamp || Date.now();
    const date = entry.date || new Date(now).toISOString().split('T')[0];

    await db.activityLogs.add({
      ...entry,
      timestamp: now,
      date,
    });

    // Notify any listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sumire:activity_logged'));
    }

    // Keep table trimmed to 300 most recent records for ultra-fast queries
    const count = await db.activityLogs.count();
    if (count > 300) {
      const keysToDelete = await db.activityLogs.orderBy('timestamp').limit(count - 300).keys();
      await db.activityLogs.bulkDelete(keysToDelete as number[]);
    }
  } catch (err) {
    console.warn('Failed to record activity log:', err);
  }
}

/**
 * Seeds initial logs from existing history if activity table is empty
 */
export async function seedInitialActivityFromHistoryIfEmpty(): Promise<void> {
  try {
    const existingCount = await db.activityLogs.count();
    if (existingCount > 0) return;

    const [tasks, focusSessions, weightLogs] = await Promise.all([
      db.tasks.toArray(),
      db.focusSessions.toArray(),
      db.weightLogs.toArray(),
    ]);

    const initialLogs: Omit<ActivityLog, 'id'>[] = [];

    // 1. Completed & active tasks
    tasks.forEach((t) => {
      const ts = t.updatedAt || t.createdAt || Date.now();
      const d = t.date || new Date(ts).toISOString().split('T')[0];

      if (t.isCompleted) {
        initialLogs.push({
          timestamp: ts,
          date: d,
          action: 'completed',
          entity: t.isPriority ? 'priority' : 'task',
          title: t.title,
          details: t.isPriority ? 'Completed Top 3 Priority goal' : 'Completed task',
        });
      } else {
        initialLogs.push({
          timestamp: t.createdAt || ts,
          date: d,
          action: 'created',
          entity: t.isPriority ? 'priority' : 'backlog',
          title: t.title,
          details: t.isPriority ? 'Added to Top 3 Priorities' : 'Added to Backlog',
        });
      }
    });

    // 2. Focus Sessions
    focusSessions.forEach((s) => {
      const ts = s.completedAt || Date.now();
      initialLogs.push({
        timestamp: ts,
        date: s.date || new Date(ts).toISOString().split('T')[0],
        action: 'focus',
        entity: 'focus',
        title: s.taskTitle || 'Focus Session',
        details: `${s.durationMinutes}m focus completed (${s.mode || 'pomodoro'})`,
      });
    });

    // 3. Weight Logs
    weightLogs.forEach((w) => {
      const ts = w.createdAt || Date.now();
      initialLogs.push({
        timestamp: ts,
        date: w.date || new Date(ts).toISOString().split('T')[0],
        action: 'weight',
        entity: 'scale',
        title: `${w.weight.toFixed(1)} kg`,
        details: `Smart Scale reading${w.bmi ? ` • BMI ${w.bmi.toFixed(1)}` : ''}`,
      });
    });

    // Sort descending and insert
    initialLogs.sort((a, b) => b.timestamp - a.timestamp);
    if (initialLogs.length > 0) {
      await db.activityLogs.bulkAdd(initialLogs.slice(0, 150));
    }
  } catch (err) {
    console.warn('Failed to seed initial activity logs:', err);
  }
}

/**
 * Clears all activity log records
 */
export async function clearActivityLogs(): Promise<void> {
  try {
    await db.activityLogs.clear();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sumire:activity_logged'));
    }
  } catch (err) {
    console.warn('Failed to clear activity logs:', err);
  }
}
