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
    const [
      localTasks,
      localHabits,
      localHabitLogs,
      localSessions,
      localLinks,
      localProfiles,
      localWeights,
      localMeals,
      localWaters,
      localWorkouts,
    ] = await Promise.all([
      db.tasks.toArray(),
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.focusSessions.toArray(),
      db.links.toArray(),
      db.healthProfile.toArray(),
      db.weightLogs.toArray(),
      db.mealLogs.toArray(),
      db.waterLogs.toArray(),
      db.workoutLogs.toArray(),
    ]);

    const habitMap = new Map<number, string>();
    localHabits.forEach((h) => {
      if (h.id) habitMap.set(h.id, h.title);
    });

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
      habitLogs: localHabitLogs.map((hl) => ({
        clientLocalHabitId: hl.habitId,
        habitTitle: habitMap.get(hl.habitId) || '',
        date: hl.date,
        completed: hl.completed,
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
      healthProfile: localProfiles[0]
        ? {
            age: localProfiles[0].age,
            gender: localProfiles[0].gender,
            height: localProfiles[0].height,
            currentWeight: localProfiles[0].currentWeight,
            targetWeight: localProfiles[0].targetWeight,
            waistCm: localProfiles[0].waistCm,
            activityLevel: localProfiles[0].activityLevel,
            goal: localProfiles[0].goal,
          }
        : undefined,
      weightLogs: localWeights.map((w) => ({
        date: w.date,
        weight: w.weight,
        bmi: w.bmi,
        bodyFatPercentage: w.bodyFatPercentage,
        waistCm: w.waistCm,
        note: w.note,
      })),
      mealLogs: localMeals.map((m) => ({
        date: m.date,
        name: m.name,
        mealType: m.mealType,
        kcal: m.kcal,
        proteinGrams: m.proteinGrams,
        carbsGrams: m.carbsGrams,
        fatGrams: m.fatGrams,
        time: m.time,
        aiEstimated: m.aiEstimated,
      })),
      waterLogs: localWaters.map((w) => ({
        date: w.date,
        amountMl: w.amountMl,
      })),
      workoutLogs: localWorkouts.map((w) => ({
        date: w.date,
        title: w.title,
        category: w.category,
        durationMinutes: w.durationMinutes,
        caloriesBurned: w.caloriesBurned,
        notes: w.notes,
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

    // 6. Merge incoming habit logs
    if (pullData.habitLogs && pullData.habitLogs.length > 0) {
      const refreshedHabits = await db.habits.toArray();
      const habitTitleToLocalId = new Map<string, number>();
      refreshedHabits.forEach((h) => {
        if (h.id) habitTitleToLocalId.set(h.title, h.id);
      });

      for (const remoteLog of pullData.habitLogs) {
        let localHabitId = remoteLog.clientLocalHabitId;
        if (!localHabitId && remoteLog.habitTitle) {
          localHabitId = habitTitleToLocalId.get(remoteLog.habitTitle);
        }

        if (localHabitId) {
          const existingLog = await db.habitLogs
            .where('[habitId+date]')
            .equals([localHabitId, remoteLog.date])
            .first();

          if (existingLog && existingLog.id) {
            await db.habitLogs.update(existingLog.id, { completed: remoteLog.completed });
          } else {
            await db.habitLogs.add({
              habitId: localHabitId,
              date: remoteLog.date,
              completed: remoteLog.completed,
            });
          }
        }
      }
    }

    // 7. Merge incoming focus sessions (deduplicated by completedAt)
    if (pullData.focusSessions && pullData.focusSessions.length > 0) {
      for (const s of pullData.focusSessions) {
        const existing = await db.focusSessions
          .filter((local) => local.completedAt === s.completedAt)
          .first();

        if (!existing) {
          await db.focusSessions.add({
            taskId: s.taskId,
            taskTitle: s.taskTitle,
            durationMinutes: s.durationMinutes,
            mode: s.mode,
            date: s.date,
            completedAt: s.completedAt,
          });
        }
      }
    }

    // 8. Merge incoming health profile
    if (pullData.healthProfile) {
      const existing = await db.healthProfile.toArray();
      await db.healthProfile.put({
        ...existing[0],
        ...pullData.healthProfile,
        id: 'user',
        updatedAt: Date.now(),
      });
    }

    // 9. Merge incoming weight logs
    if (pullData.weightLogs && pullData.weightLogs.length > 0) {
      for (const w of pullData.weightLogs) {
        const existing = await db.weightLogs.where('date').equals(w.date).first();
        if (existing && existing.id) {
          await db.weightLogs.update(existing.id, {
            weight: w.weight,
            bmi: w.bmi,
            bodyFatPercentage: w.bodyFatPercentage,
            waistCm: w.waistCm,
            note: w.note,
          });
        } else {
          await db.weightLogs.add({
            date: w.date,
            weight: w.weight,
            bmi: w.bmi,
            bodyFatPercentage: w.bodyFatPercentage,
            waistCm: w.waistCm,
            note: w.note,
            createdAt: Date.now(),
          });
        }
      }
    }

    // 10. Merge incoming meal logs
    if (pullData.mealLogs && pullData.mealLogs.length > 0) {
      for (const m of pullData.mealLogs) {
        const existing = await db.mealLogs
          .where('date')
          .equals(m.date)
          .and((local) => local.name === m.name && local.mealType === m.mealType)
          .first();

        if (!existing) {
          await db.mealLogs.add({
            date: m.date,
            name: m.name,
            mealType: m.mealType,
            kcal: m.kcal,
            proteinGrams: m.proteinGrams,
            carbsGrams: m.carbsGrams,
            fatGrams: m.fatGrams,
            time: m.time,
            aiEstimated: m.aiEstimated,
            createdAt: Date.now(),
          });
        }
      }
    }

    // 11. Merge incoming water logs
    if (pullData.waterLogs && pullData.waterLogs.length > 0) {
      for (const w of pullData.waterLogs) {
        const existing = await db.waterLogs.where('date').equals(w.date).first();
        if (!existing) {
          await db.waterLogs.add({
            date: w.date,
            amountMl: w.amountMl,
            createdAt: Date.now(),
          });
        }
      }
    }

    // 12. Merge incoming workout logs
    if (pullData.workoutLogs && pullData.workoutLogs.length > 0) {
      for (const w of pullData.workoutLogs) {
        const existing = await db.workoutLogs
          .where('date')
          .equals(w.date)
          .and((local) => local.title === w.title)
          .first();

        if (!existing) {
          await db.workoutLogs.add({
            date: w.date,
            title: w.title,
            category: w.category,
            durationMinutes: w.durationMinutes,
            caloriesBurned: w.caloriesBurned,
            notes: w.notes,
            createdAt: Date.now(),
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
