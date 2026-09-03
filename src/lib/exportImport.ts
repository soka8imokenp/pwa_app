import { db, seedDemoDataIfEmpty } from './db';
import type { Task, Habit, HabitLog, FocusSession } from '../types';
import type { HealthProfile, WeightLog, MealLog, WaterLog, WorkoutLog } from '../types/health';

export interface BackupData {
  version: number;
  exportedAt: string;
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  focusSessions: FocusSession[];
  healthProfile?: HealthProfile[];
  weightLogs?: WeightLog[];
  mealLogs?: MealLog[];
  waterLogs?: WaterLog[];
  workoutLogs?: WorkoutLog[];
}

export async function exportDatabaseToJson(): Promise<string> {
  const tasks = await db.tasks.toArray();
  const habits = await db.habits.toArray();
  const habitLogs = await db.habitLogs.toArray();
  const focusSessions = await db.focusSessions.toArray();
  const healthProfile = await db.healthProfile.toArray();
  const weightLogs = await db.weightLogs.toArray();
  const mealLogs = await db.mealLogs.toArray();
  const waterLogs = await db.waterLogs.toArray();
  const workoutLogs = await db.workoutLogs.toArray();

  const backup: BackupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks,
    habits,
    habitLogs,
    focusSessions,
    healthProfile,
    weightLogs,
    mealLogs,
    waterLogs,
    workoutLogs,
  };

  return JSON.stringify(backup, null, 2);
}

export function downloadBackupFile(jsonString: string) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kairo-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importDatabaseFromJson(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data: BackupData = JSON.parse(jsonString);

    if (!data.tasks || !data.habits || !data.habitLogs) {
      throw new Error('Invalid backup file format.');
    }

    await db.transaction(
      'rw',
      [
        db.tasks,
        db.habits,
        db.habitLogs,
        db.focusSessions,
        db.healthProfile,
        db.weightLogs,
        db.mealLogs,
        db.waterLogs,
        db.workoutLogs,
      ],
      async () => {
        await db.tasks.clear();
        await db.habits.clear();
        await db.habitLogs.clear();
        await db.focusSessions.clear();
        await db.healthProfile.clear();
        await db.weightLogs.clear();
        await db.mealLogs.clear();
        await db.waterLogs.clear();
        await db.workoutLogs.clear();

        if (data.tasks.length > 0) await db.tasks.bulkAdd(data.tasks);
        if (data.habits.length > 0) await db.habits.bulkAdd(data.habits);
        if (data.habitLogs.length > 0) await db.habitLogs.bulkAdd(data.habitLogs);
        if (data.focusSessions && data.focusSessions.length > 0) await db.focusSessions.bulkAdd(data.focusSessions);
        if (data.healthProfile && data.healthProfile.length > 0) await db.healthProfile.bulkAdd(data.healthProfile);
        if (data.weightLogs && data.weightLogs.length > 0) await db.weightLogs.bulkAdd(data.weightLogs);
        if (data.mealLogs && data.mealLogs.length > 0) await db.mealLogs.bulkAdd(data.mealLogs);
        if (data.waterLogs && data.waterLogs.length > 0) await db.waterLogs.bulkAdd(data.waterLogs);
        if (data.workoutLogs && data.workoutLogs.length > 0) await db.workoutLogs.bulkAdd(data.workoutLogs);
      }
    );

    return { success: true, message: 'Planner & Health data imported successfully!' };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Failed to import backup.' };
  }
}

export async function resetAndSeedDatabase() {
  await db.transaction(
    'rw',
    [
      db.tasks,
      db.habits,
      db.habitLogs,
      db.focusSessions,
      db.healthProfile,
      db.weightLogs,
      db.mealLogs,
      db.waterLogs,
      db.workoutLogs,
    ],
    async () => {
      await db.tasks.clear();
      await db.habits.clear();
      await db.habitLogs.clear();
      await db.focusSessions.clear();
      await db.healthProfile.clear();
      await db.weightLogs.clear();
      await db.mealLogs.clear();
      await db.waterLogs.clear();
      await db.workoutLogs.clear();
    }
  );
  await seedDemoDataIfEmpty();
}
