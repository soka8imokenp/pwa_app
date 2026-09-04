import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { HealthProfile, WeightLog, MealLog, WaterLog, WorkoutLog } from '../types/health';
import { DEFAULT_HEALTH_PROFILE, calculateComprehensiveMetrics, calculateBmi } from '../lib/healthFormulas';

export function useHealthData(selectedDate: string) {
  // 1. Live queries
  const profileList = useLiveQuery(() => db.healthProfile.toArray(), []) || [];
  const profile: HealthProfile = profileList[0] || DEFAULT_HEALTH_PROFILE;

  const allWeightLogs = useLiveQuery(() => db.weightLogs.orderBy('date').toArray(), []) || [];
  
  const todaysMeals = useLiveQuery(
    () => db.mealLogs.where('date').equals(selectedDate).toArray(),
    [selectedDate]
  ) || [];

  const todaysWaterLogs = useLiveQuery(
    () => db.waterLogs.where('date').equals(selectedDate).toArray(),
    [selectedDate]
  ) || [];

  const todaysWorkouts = useLiveQuery(
    () => db.workoutLogs.where('date').equals(selectedDate).toArray(),
    [selectedDate]
  ) || [];

  // 2. Computed Metrics
  const metrics = useMemo(() => {
    return calculateComprehensiveMetrics(profile);
  }, [profile]);

  // 3. Todays totals
  const todaysTotalKcal = useMemo(() => {
    return todaysMeals.reduce((acc, m) => acc + (m.kcal || 0), 0);
  }, [todaysMeals]);

  const todaysProteinGrams = useMemo(() => {
    return todaysMeals.reduce((acc, m) => acc + (m.proteinGrams || 0), 0);
  }, [todaysMeals]);

  const todaysCarbsGrams = useMemo(() => {
    return todaysMeals.reduce((acc, m) => acc + (m.carbsGrams || 0), 0);
  }, [todaysMeals]);

  const todaysFatGrams = useMemo(() => {
    return todaysMeals.reduce((acc, m) => acc + (m.fatGrams || 0), 0);
  }, [todaysMeals]);

  const todaysWaterTotalMl = useMemo(() => {
    return todaysWaterLogs.reduce((acc, w) => acc + (w.amountMl || 0), 0);
  }, [todaysWaterLogs]);

  const todaysActiveCaloriesBurned = useMemo(() => {
    return todaysWorkouts.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);
  }, [todaysWorkouts]);

  // 4. Action Handlers
  const updateProfile = async (updates: Partial<HealthProfile>) => {
    const updated: HealthProfile = {
      ...DEFAULT_HEALTH_PROFILE,
      ...profile,
      ...updates,
      id: 'user',
      updatedAt: Date.now(),
    };
    await db.healthProfile.put(updated);
  };

  const logWeight = async (
    weight: number,
    note?: string,
    date = selectedDate,
    bodyFat?: number,
    waistCm?: number
  ) => {
    const bmi = calculateBmi(weight, profile.height);
    await db.weightLogs.add({
      date,
      weight,
      bmi,
      bodyFatPercentage: bodyFat,
      waistCm,
      note,
      createdAt: Date.now(),
    });

    // Also update current weight and waist on profile
    const profileUpdates: Partial<HealthProfile> = { currentWeight: weight };
    if (waistCm && waistCm > 0) profileUpdates.waistCm = waistCm;
    await updateProfile(profileUpdates);
  };

  const deleteWeightLog = async (id: number) => {
    await db.weightLogs.delete(id);
    const remaining = await db.weightLogs.orderBy('date').toArray();
    if (remaining.length > 0) {
      const latest = remaining[remaining.length - 1];
      await updateProfile({ currentWeight: latest.weight });
    }
  };

  const logMeal = async (meal: Omit<MealLog, 'id' | 'createdAt'>) => {
    await db.mealLogs.add({
      ...meal,
      createdAt: Date.now(),
    });
  };

  const deleteMealLog = async (id: number) => {
    await db.mealLogs.delete(id);
  };

  const logWater = async (amountMl = 250, date = selectedDate) => {
    await db.waterLogs.add({
      date,
      amountMl,
      createdAt: Date.now(),
    });
  };

  const removeLatestWater = async () => {
    if (todaysWaterLogs.length === 0) return;
    const latest = todaysWaterLogs[todaysWaterLogs.length - 1];
    if (latest.id) {
      await db.waterLogs.delete(latest.id);
    }
  };

  const logWorkout = async (workout: Omit<WorkoutLog, 'id' | 'createdAt'>) => {
    await db.workoutLogs.add({
      ...workout,
      createdAt: Date.now(),
    });
  };

  const deleteWorkout = async (id: number) => {
    await db.workoutLogs.delete(id);
  };

  return {
    profile,
    metrics,
    allWeightLogs,
    todaysMeals,
    todaysWaterLogs,
    todaysWorkouts,
    todaysTotalKcal,
    todaysProteinGrams,
    todaysCarbsGrams,
    todaysFatGrams,
    todaysWaterTotalMl,
    todaysActiveCaloriesBurned,
    updateProfile,
    logWeight,
    deleteWeightLog,
    logMeal,
    deleteMealLog,
    logWater,
    removeLatestWater,
    logWorkout,
    deleteWorkout,
  };
}
