export type Gender = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';

export type HealthGoal = 'lose' | 'maintain' | 'gain';

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface HealthProfile {
  id: string; // 'user'
  name?: string;
  age: number; // in years (e.g. 25)
  gender: Gender;
  height: number; // in cm (e.g. 178)
  currentWeight: number; // in kg (e.g. 75.5)
  targetWeight: number; // in kg (e.g. 72.0)
  activityLevel: ActivityLevel;
  goal: HealthGoal;
  updatedAt: number;
}

export interface WeightLog {
  id?: number;
  date: string; // YYYY-MM-DD
  weight: number; // in kg
  bmi: number;
  bodyFatPercentage?: number;
  note?: string;
  createdAt: number;
}

export interface MealLog {
  id?: number;
  date: string; // YYYY-MM-DD
  name: string;
  mealType: MealType;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  time?: string;
  aiEstimated?: boolean;
  createdAt: number;
}

export interface WaterLog {
  id?: number;
  date: string; // YYYY-MM-DD
  amountMl: number; // e.g. 250
  createdAt: number;
}

export interface WorkoutLog {
  id?: number;
  date: string; // YYYY-MM-DD
  title: string;
  category: 'gym' | 'cardio' | 'run' | 'walk' | 'stretch' | 'sports';
  durationMinutes: number;
  caloriesBurned?: number;
  notes?: string;
  createdAt: number;
}

export interface CalculatedHealthMetrics {
  bmi: number;
  bmiCategory: BmiCategory;
  bmiCategoryLabel: string;
  bmiColor: string;
  idealWeightMin: number;
  idealWeightMax: number;
  idealWeightOptimal: number;
  bmr: number; // Basal Metabolic Rate (Mifflin-St Jeor)
  tdee: number; // Total Daily Energy Expenditure
  targetDailyCalories: number; // Adjusted for goal (deficit/maintain/surplus)
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  targetWaterMl: number;
  bodyFatPercentage: number;
  muscleMassKg: number;
  waterPercentage: number;
  boneMassKg: number;
}
