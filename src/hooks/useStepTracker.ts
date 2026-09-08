import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
  parseISO,
} from 'date-fns';
import { db, upsertStepLog, calculateStepCalories, calculateStepDistanceMeters, calculateStepDurationMinutes } from '../lib/db';
import type { StepLog, HealthProfile } from '../types/health';
import { playClickSound, playSuccessChime } from '../lib/sound';
import confetti from 'canvas-confetti';

interface UseStepTrackerOptions {
  selectedDate: string;
  profile?: HealthProfile;
  onGoalReached?: () => void;
}

export interface DayStepItem {
  dateStr: string;
  dayName: string;
  dayNumber: number;
  steps: number;
  goal: number;
  caloriesBurned: number;
  distanceKm: number;
  durationMinutes: number;
  percent: number;
  isGoalMet: boolean;
  isToday: boolean;
  isSelected: boolean;
}

export function useStepTracker({ selectedDate, profile, onGoalReached }: UseStepTrackerOptions) {
  const userWeight = profile?.currentWeight || 70;
  const userHeight = profile?.height || 175;

  // Live query for current selected date step log
  const stepLog = useLiveQuery(
    () => db.stepLogs.where('date').equals(selectedDate).first(),
    [selectedDate]
  );

  // Live query for all step logs (used for calendar & streak calculations)
  const allStepLogs = useLiveQuery(
    () => db.stepLogs.orderBy('date').toArray(),
    []
  ) || [];

  const [hasNativeSensor, setHasNativeSensor] = useState(false);
  const [isSensorActive, setIsSensorActive] = useState(false);

  // Fallback defaults if no record exists yet for selectedDate
  const currentSteps = stepLog?.steps ?? 0;
  const currentGoal = stepLog?.goal ?? 10000;
  const currentCalories = stepLog?.caloriesBurned ?? calculateStepCalories(currentSteps, userWeight);
  const currentDistanceKm = ((stepLog?.distanceMeters ?? calculateStepDistanceMeters(currentSteps, userHeight)) / 1000);
  const currentDurationMinutes = stepLog?.durationMinutes ?? calculateStepDurationMinutes(currentSteps);
  const progressPercent = Math.min(100, Math.round((currentSteps / Math.max(1, currentGoal)) * 100));
  const isGoalMet = currentSteps >= currentGoal && currentGoal > 0;

  // 1. Android Native Step Sensor Listener & Bridge
  useEffect(() => {
    const isAndroidBridgePresent =
      typeof window !== 'undefined' &&
      Boolean((window as any).AndroidStepCounter || (window as any).Android);

    if (isAndroidBridgePresent) {
      setHasNativeSensor(true);
      try {
        if ((window as any).AndroidStepCounter?.startStepTracking) {
          (window as any).AndroidStepCounter.startStepTracking();
          setIsSensorActive(true);
        }
      } catch (err) {
        console.warn('Could not auto-start Android step counter:', err);
      }
    }

    // Window callback invoked by MainActivity.java
    (window as any).__onNativeStepUpdate = async (sensorSteps: number, rawSteps?: number) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (typeof sensorSteps === 'number' && sensorSteps >= 0) {
        setIsSensorActive(true);
        // Protect existing steps from being wiped to 0 if hardware sensor reports 0
        const existing = await db.stepLogs.where('date').equals(today).first();
        if (sensorSteps > 0 || !existing || existing.steps === 0) {
          upsertStepLog(today, sensorSteps, {
            weightKg: userWeight,
            heightCm: userHeight,
            source: 'sensor',
          }).catch((err) => console.error('Failed to upsert sensor step log:', err));
        }
      }
    };

    return () => {
      delete (window as any).__onNativeStepUpdate;
    };
  }, [userWeight, userHeight]);

  // 2. Action Handlers
  const addSteps = useCallback(
    async (delta: number, targetDate = selectedDate) => {
      playClickSound();
      const existing = await db.stepLogs.where('date').equals(targetDate).first();
      const prevSteps = existing?.steps || 0;
      const newSteps = Math.max(0, prevSteps + delta);
      const goal = existing?.goal || currentGoal;

      const updated = await upsertStepLog(targetDate, newSteps, {
        goal,
        weightKg: userWeight,
        heightCm: userHeight,
        source: 'manual',
      });

      // Calibrate native sensor baseline so future hardware steps build upon this total
      if (typeof window !== 'undefined' && (window as any).AndroidStepCounter?.calibrateStepOffset) {
        try {
          (window as any).AndroidStepCounter.calibrateStepOffset(newSteps);
        } catch (e) {
          console.warn('Could not calibrate native step counter:', e);
        }
      }

      // Goal reached celebration
      if (prevSteps < goal && newSteps >= goal) {
        playSuccessChime();
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3D6B52', '#10B981', '#F59E0B', '#3B82F6'],
        });
        if (onGoalReached) onGoalReached();
      }

      return updated;
    },
    [selectedDate, currentGoal, userWeight, userHeight, onGoalReached]
  );

  const setSteps = useCallback(
    async (steps: number, targetDate = selectedDate) => {
      const existing = await db.stepLogs.where('date').equals(targetDate).first();
      const prevSteps = existing?.steps || 0;
      const safeSteps = Math.max(0, Math.round(steps));
      const goal = existing?.goal || currentGoal;

      const updated = await upsertStepLog(targetDate, safeSteps, {
        goal,
        weightKg: userWeight,
        heightCm: userHeight,
        source: 'manual',
      });

      // Calibrate native sensor baseline so future hardware steps build upon this total
      if (typeof window !== 'undefined' && (window as any).AndroidStepCounter?.calibrateStepOffset) {
        try {
          (window as any).AndroidStepCounter.calibrateStepOffset(safeSteps);
        } catch (e) {
          console.warn('Could not calibrate native step counter:', e);
        }
      }

      if (prevSteps < goal && safeSteps >= goal) {
        playSuccessChime();
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3D6B52', '#10B981', '#F59E0B', '#3B82F6'],
        });
      }

      return updated;
    },
    [selectedDate, currentGoal, userWeight, userHeight]
  );

  const setStepGoal = useCallback(
    async (newGoal: number, targetDate = selectedDate) => {
      const existing = await db.stepLogs.where('date').equals(targetDate).first();
      const steps = existing?.steps || 0;
      await upsertStepLog(targetDate, steps, {
        goal: Math.max(1000, newGoal),
        weightKg: userWeight,
        heightCm: userHeight,
      });
    },
    [selectedDate, userWeight, userHeight]
  );

  // 3. Week Calendar Analytics (Monday - Sunday for selected date)
  const weekStats = useMemo(() => {
    const activeDate = parseISO(selectedDate);
    const weekStart = startOfWeek(activeDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(activeDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const logMap = new Map<string, StepLog>();
    allStepLogs.forEach((l) => logMap.set(l.date, l));

    let totalSteps = 0;
    let totalCalories = 0;
    let totalDistanceKm = 0;
    let bestDaySteps = 0;
    let bestDayDate = '';

    const days: DayStepItem[] = weekDays.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const log = logMap.get(dateStr);
      const steps = log?.steps || 0;
      const goal = log?.goal || currentGoal;
      const caloriesBurned = log?.caloriesBurned || calculateStepCalories(steps, userWeight);
      const distanceKm = (log?.distanceMeters || calculateStepDistanceMeters(steps, userHeight)) / 1000;
      const durationMinutes = log?.durationMinutes || calculateStepDurationMinutes(steps);
      const percent = Math.min(100, Math.round((steps / Math.max(1, goal)) * 100));
      const isGoalMet = steps >= goal && goal > 0;

      totalSteps += steps;
      totalCalories += caloriesBurned;
      totalDistanceKm += distanceKm;

      if (steps > bestDaySteps) {
        bestDaySteps = steps;
        bestDayDate = dateStr;
      }

      return {
        dateStr,
        dayName: format(d, 'EEE'), // Mon, Tue, etc.
        dayNumber: d.getDate(),
        steps,
        goal,
        caloriesBurned,
        distanceKm,
        durationMinutes,
        percent,
        isGoalMet,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      };
    });

    const averageSteps = Math.round(totalSteps / 7);

    return {
      days,
      totalSteps,
      averageSteps,
      totalCalories,
      totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
      bestDaySteps,
      bestDayDate,
    };
  }, [selectedDate, allStepLogs, currentGoal, userWeight, userHeight]);

  // 4. Month Calendar Analytics (Full Month Matrix)
  const monthStats = useMemo(() => {
    const activeDate = parseISO(selectedDate);
    const monthStart = startOfMonth(activeDate);
    const monthEnd = endOfMonth(activeDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const logMap = new Map<string, StepLog>();
    allStepLogs.forEach((l) => logMap.set(l.date, l));

    let totalSteps = 0;
    let totalCalories = 0;
    let totalDistanceKm = 0;
    let goalStreakDays = 0;
    let maxDaySteps = 0;

    const days: DayStepItem[] = daysInMonth.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const log = logMap.get(dateStr);
      const steps = log?.steps || 0;
      const goal = log?.goal || currentGoal;
      const caloriesBurned = log?.caloriesBurned || calculateStepCalories(steps, userWeight);
      const distanceKm = (log?.distanceMeters || calculateStepDistanceMeters(steps, userHeight)) / 1000;
      const durationMinutes = log?.durationMinutes || calculateStepDurationMinutes(steps);
      const percent = Math.min(100, Math.round((steps / Math.max(1, goal)) * 100));
      const isGoalMet = steps >= goal && goal > 0;

      totalSteps += steps;
      totalCalories += caloriesBurned;
      totalDistanceKm += distanceKm;

      if (isGoalMet) goalStreakDays++;
      if (steps > maxDaySteps) maxDaySteps = steps;

      return {
        dateStr,
        dayName: format(d, 'EEE'),
        dayNumber: d.getDate(),
        steps,
        goal,
        caloriesBurned,
        distanceKm,
        durationMinutes,
        percent,
        isGoalMet,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
      };
    });

    // Calculate leading empty padding cells for Monday-first calendar grid
    const firstDayOfWeek = getDay(monthStart); // 0 (Sun) to 6 (Sat)
    const paddingDaysCount = (firstDayOfWeek + 6) % 7; // Monday = 0, Sunday = 6

    const averageSteps = daysInMonth.length > 0 ? Math.round(totalSteps / daysInMonth.length) : 0;

    return {
      days,
      paddingDaysCount,
      monthName: format(activeDate, 'LLLL yyyy'),
      totalSteps,
      averageSteps,
      totalCalories,
      totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
      goalStreakDays,
      daysInMonthCount: daysInMonth.length,
      maxDaySteps,
    };
  }, [selectedDate, allStepLogs, currentGoal, userWeight, userHeight]);

  const resyncSensor = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).AndroidStepCounter?.resyncPhoneSteps) {
      try {
        (window as any).AndroidStepCounter.resyncPhoneSteps();
      } catch (e) {
        console.warn('Failed to trigger native sensor resync:', e);
      }
    }
  }, []);

  return {
    stepLog,
    currentSteps,
    currentGoal,
    currentCalories,
    currentDistanceKm: Number(currentDistanceKm.toFixed(2)),
    currentDurationMinutes,
    progressPercent,
    isGoalMet,
    hasNativeSensor,
    isSensorActive,
    addSteps,
    setSteps,
    setStepGoal,
    resyncSensor,
    weekStats,
    monthStats,
  };
}
