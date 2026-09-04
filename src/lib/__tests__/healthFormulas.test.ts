import { describe, it, expect } from 'vitest';
import {
  calculateBmi,
  getBmiCategory,
  calculateBmr,
  calculateTdee,
  calculateComprehensiveMetrics,
  computeWeightMovingAverage,
  computeWeeklyPace,
  computeProjectedGoalDate,
} from '../healthFormulas';
import type { HealthProfile, WeightLog } from '../../types/health';

describe('healthFormulas', () => {
  it('calculateBmi: correctly calculates WHO standard BMI', () => {
    // 70kg at 175cm => 70 / (1.75 * 1.75) = 22.857... => 22.9
    expect(calculateBmi(70, 175)).toBe(22.9);
    // Boundary conditions
    expect(calculateBmi(0, 175)).toBe(0);
    expect(calculateBmi(70, 0)).toBe(0);
  });

  it('getBmiCategory: returns proper clinical classifications', () => {
    expect(getBmiCategory(17.5).category).toBe('underweight');
    expect(getBmiCategory(22.0).category).toBe('normal');
    expect(getBmiCategory(27.5).category).toBe('overweight');
    expect(getBmiCategory(32.0).category).toBe('obese');
  });

  it('calculateBmr: computes Mifflin-St Jeor formula accurately', () => {
    // Male: 10 * 80 + 6.25 * 180 - 5 * 30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBmr(80, 180, 30, 'male')).toBe(1780);

    // Female: 10 * 60 + 6.25 * 165 - 5 * 25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 => 1345
    expect(calculateBmr(60, 165, 25, 'female')).toBe(1345);
  });

  it('calculateTdee: correctly scales with activity multipliers', () => {
    const bmr = 1780;
    expect(calculateTdee(bmr, 'sedentary')).toBe(Math.round(1780 * 1.2));
    expect(calculateTdee(bmr, 'light')).toBe(Math.round(1780 * 1.375));
    expect(calculateTdee(bmr, 'moderate')).toBe(Math.round(1780 * 1.55));
    expect(calculateTdee(bmr, 'very_active')).toBe(Math.round(1780 * 1.725));
  });

  it('calculateComprehensiveMetrics: calculates all body composition fields', () => {
    const profile: HealthProfile = {
      id: 'user',
      age: 28,
      gender: 'male',
      height: 180,
      currentWeight: 78,
      targetWeight: 74,
      waistCm: 82,
      activityLevel: 'moderate',
      goal: 'lose',
      updatedAt: Date.now(),
    };

    const metrics = calculateComprehensiveMetrics(profile);
    expect(metrics.bmi).toBe(24.1);
    expect(metrics.bmiCategory).toBe('normal');
    expect(metrics.bmr).toBeGreaterThan(1600);
    expect(metrics.tdee).toBeGreaterThan(metrics.bmr);
    // Deficit for losing weight
    expect(metrics.targetDailyCalories).toBe(metrics.tdee - 400);
    expect(metrics.targetProteinGrams).toBe(Math.round(78 * 1.8));
    expect(metrics.targetWaterMl).toBe(Math.round(78 * 35));
    expect(metrics.waistToHeightRatio).toBe(0.46);
  });

  it('computeWeightMovingAverage: smooths noisy weight fluctuations', () => {
    const logs: WeightLog[] = [
      { date: '2026-09-01', weight: 80.0, bmi: 24, createdAt: 1 },
      { date: '2026-09-02', weight: 81.0, bmi: 24, createdAt: 2 },
      { date: '2026-09-03', weight: 79.0, bmi: 24, createdAt: 3 },
    ];

    const result = computeWeightMovingAverage(logs, 3);
    expect(result).toHaveLength(3);
    // Average of 80, 81, 79 is 80.0
    expect(result[2].movingAvg).toBe(80.0);
  });

  it('computeWeeklyPace: calculates accurate rate of progress', () => {
    const logs: WeightLog[] = [
      { date: '2026-08-01', weight: 82.0, bmi: 25, createdAt: 1 },
      { date: '2026-08-15', weight: 81.0, bmi: 24.5, createdAt: 2 },
      { date: '2026-08-29', weight: 80.0, bmi: 24, createdAt: 3 },
    ];

    const pace = computeWeeklyPace(logs);
    expect(pace.paceKgPerWeek).toBeCloseTo(0.5, 1);
    expect(pace.isOptimal).toBe(true);
  });

  it('computeProjectedGoalDate: computes realistic finish ETA', () => {
    // Need to lose 4kg at 0.5kg/week => ~8 weeks
    const projected = computeProjectedGoalDate(80, 76, 'lose', 0.5);
    expect(projected.weeksRemaining).toBe(8);
    expect(projected.isReached).toBe(false);
  });
});
