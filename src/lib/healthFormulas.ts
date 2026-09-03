import type { HealthProfile, CalculatedHealthMetrics, BmiCategory, WeightLog, HealthGoal } from '../types/health';

/**
 * Calculates BMI according to WHO standards: weight(kg) / (height(m))^2
 */
export function calculateBmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

/**
 * Returns the BMI category and presentation data
 */
export function getBmiCategory(bmi: number): { category: BmiCategory; label: string; color: string } {
  if (bmi < 18.5) {
    return { category: 'underweight', label: 'Underweight', color: '#60A5FA' };
  } else if (bmi <= 24.9) {
    return { category: 'normal', label: 'Normal / Healthy', color: '#3D6B52' };
  } else if (bmi <= 29.9) {
    return { category: 'overweight', label: 'Overweight', color: '#E09F3E' };
  } else {
    return { category: 'obese', label: 'Obese', color: '#DC2626' };
  }
}

/**
 * Basal Metabolic Rate using the Mifflin-St Jeor Equation (clinical gold standard)
 */
export function calculateBmr(weightKg: number, heightCm: number, age: number, gender: 'male' | 'female'): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = gender === 'male' ? base + 5 : base - 161;
  return Math.round(Math.max(800, bmr));
}

/**
 * Total Daily Energy Expenditure based on activity multiplier
 */
export function calculateTdee(bmr: number, activityLevel: HealthProfile['activityLevel']): number {
  const multipliers: Record<HealthProfile['activityLevel'], number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.2));
}

/**
 * Computes comprehensive health & body composition metrics
 */
export function calculateComprehensiveMetrics(profile: HealthProfile): CalculatedHealthMetrics {
  const { currentWeight, height, age, gender, activityLevel, goal } = profile;

  const bmi = calculateBmi(currentWeight, height);
  const { category, label, color } = getBmiCategory(bmi);

  const heightM = height / 100;
  const idealWeightMin = Number((18.5 * heightM * heightM).toFixed(1));
  const idealWeightMax = Number((24.9 * heightM * heightM).toFixed(1));
  const idealWeightOptimal = Number((21.7 * heightM * heightM).toFixed(1));

  const bmr = calculateBmr(currentWeight, height, age, gender);
  const tdee = calculateTdee(bmr, activityLevel);

  // Calorie adjustments based on goal
  let targetDailyCalories = tdee;
  if (goal === 'lose') {
    targetDailyCalories = Math.max(1200, Math.round(tdee - 400));
  } else if (goal === 'gain') {
    targetDailyCalories = Math.round(tdee + 350);
  }

  // Macronutrient breakdown (Protein: 1.8g/kg for cut/gain, 1.5g/kg for maintain; Fat: 0.9g/kg)
  const proteinGramsPerKg = goal === 'maintain' ? 1.5 : 1.8;
  const targetProteinGrams = Math.round(currentWeight * proteinGramsPerKg);
  const targetFatGrams = Math.round(currentWeight * 0.9);

  const proteinKcal = targetProteinGrams * 4;
  const fatKcal = targetFatGrams * 9;
  const remainingKcalForCarbs = Math.max(0, targetDailyCalories - proteinKcal - fatKcal);
  const targetCarbsGrams = Math.round(remainingKcalForCarbs / 4);

  // Hydration target: 35ml per kg of bodyweight
  const targetWaterMl = Math.round(currentWeight * 35);

  // Deurenberg Body Fat Formula
  const genderOffset = gender === 'male' ? 16.2 : 5.4;
  const rawFat = 1.20 * bmi + 0.23 * age - genderOffset;
  const bodyFatPercentage = Number(Math.max(5, Math.min(60, rawFat)).toFixed(1));

  const muscleMassKg = Number((currentWeight * (1 - bodyFatPercentage / 100)).toFixed(1));
  const waterPercentage = gender === 'male' ? 58.5 : 54.0;
  const boneMassKg = Number((currentWeight * 0.04).toFixed(1));

  // Waist to Height Ratio calculation if waist is provided
  let waistToHeightRatio: number | undefined = undefined;
  let waistRiskCategory: string | undefined = undefined;
  if (profile.waistCm && profile.waistCm > 0) {
    waistToHeightRatio = Number((profile.waistCm / height).toFixed(2));
    if (waistToHeightRatio < 0.40) {
      waistRiskCategory = 'Low (Underweight)';
    } else if (waistToHeightRatio <= 0.49) {
      waistRiskCategory = 'Healthy (<0.5)';
    } else if (waistToHeightRatio <= 0.59) {
      waistRiskCategory = 'Increased Risk';
    } else {
      waistRiskCategory = 'High Risk';
    }
  }

  return {
    bmi,
    bmiCategory: category,
    bmiCategoryLabel: label,
    bmiColor: color,
    idealWeightMin,
    idealWeightMax,
    idealWeightOptimal,
    bmr,
    tdee,
    targetDailyCalories,
    targetProteinGrams,
    targetCarbsGrams,
    targetFatGrams,
    targetWaterMl,
    bodyFatPercentage,
    muscleMassKg,
    waterPercentage,
    boneMassKg,
    waistToHeightRatio,
    waistRiskCategory,
  };
}

/**
 * Computes 7-day rolling moving average for weight trend smoothing
 */
export function computeWeightMovingAverage(logs: WeightLog[], windowDays = 7): Array<WeightLog & { movingAvg: number }> {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((log, index) => {
    const windowStart = Math.max(0, index - windowDays + 1);
    const slice = sorted.slice(windowStart, index + 1);
    const avg = slice.reduce((sum, item) => sum + item.weight, 0) / slice.length;
    return {
      ...log,
      movingAvg: Number(avg.toFixed(1)),
    };
  });
}

/**
 * Computes the weekly rate of change (kg/week) from recent logs
 */
export function computeWeeklyPace(logs: WeightLog[]): { paceKgPerWeek: number; paceLabel: string; isOptimal: boolean } {
  if (logs.length < 2) {
    return { paceKgPerWeek: 0, paceLabel: 'Baseline Establishing', isOptimal: true };
  }

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];

  let baselineLog = sorted[0];
  for (let i = sorted.length - 2; i >= 0; i--) {
    const dDiff = (new Date(latest.date).getTime() - new Date(sorted[i].date).getTime()) / (1000 * 3600 * 24);
    if (dDiff >= 5 && dDiff <= 14) {
      baselineLog = sorted[i];
      break;
    }
  }

  const daysElapsed = Math.max(1, (new Date(latest.date).getTime() - new Date(baselineLog.date).getTime()) / (1000 * 3600 * 24));
  const deltaWeight = latest.weight - baselineLog.weight;
  const paceKgPerWeek = Number(((deltaWeight / daysElapsed) * 7).toFixed(2));

  let paceLabel = 'Stable (±0.1 kg/wk)';
  let isOptimal = true;

  if (paceKgPerWeek <= -0.8) {
    paceLabel = `${paceKgPerWeek} kg/wk (Aggressive Deficit)`;
    isOptimal = false;
  } else if (paceKgPerWeek < -0.2) {
    paceLabel = `${paceKgPerWeek} kg/wk (Optimal Fat Loss)`;
    isOptimal = true;
  } else if (paceKgPerWeek >= -0.2 && paceKgPerWeek <= 0.2) {
    paceLabel = `${paceKgPerWeek > 0 ? `+${paceKgPerWeek}` : paceKgPerWeek} kg/wk (Maintaining)`;
    isOptimal = true;
  } else if (paceKgPerWeek > 0.2 && paceKgPerWeek <= 0.5) {
    paceLabel = `+${paceKgPerWeek} kg/wk (Optimal Lean Bulk)`;
    isOptimal = true;
  } else if (paceKgPerWeek > 0.5) {
    paceLabel = `+${paceKgPerWeek} kg/wk (High Surplus)`;
    isOptimal = false;
  }

  return { paceKgPerWeek, paceLabel, isOptimal };
}

/**
 * Computes projected goal completion date based on goal and pace
 */
export function computeProjectedGoalDate(
  currentWeight: number,
  targetWeight: number,
  goal: HealthGoal,
  weeklyPace?: number
): { dateString: string; weeksRemaining: number } {
  const deltaKg = Math.abs(currentWeight - targetWeight);
  if (deltaKg <= 0.1) {
    return { dateString: 'Goal Reached!', weeksRemaining: 0 };
  }

  let pace = 0.45;
  if (goal === 'gain') pace = 0.35;
  if (weeklyPace && Math.abs(weeklyPace) >= 0.15) {
    pace = Math.min(1.0, Math.abs(weeklyPace));
  }

  const weeksRemaining = Math.max(1, Math.ceil(deltaKg / pace));
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksRemaining * 7);

  const dateString = targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return { dateString, weeksRemaining };
}

/**
 * Default starter health profile for fresh setups
 */
export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  id: 'user',
  name: '',
  age: 26,
  gender: 'male',
  height: 178,
  currentWeight: 76.5,
  targetWeight: 72.0,
  waistCm: 82,
  activityLevel: 'moderate',
  goal: 'lose',
  updatedAt: Date.now(),
};
