import { getStoredGeminiApiKey } from './aiService';
import type { HealthProfile, CalculatedHealthMetrics, MealType, WeightLog } from '../types/health';

export interface EstimatedMealResult {
  name: string;
  kcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  mealType: MealType;
}

/**
 * Parses meal description using Gemini AI, with instant fallback if offline/no key
 */
export async function estimateMealNutritionWithAI(
  mealDescription: string,
  preferredMealType: MealType = 'lunch'
): Promise<EstimatedMealResult> {
  const apiKey = getStoredGeminiApiKey();

  if (apiKey && navigator.onLine) {
    try {
      const prompt = `You are an elite clinical nutritionist. The user ate: "${mealDescription}".
Estimate the nutritional breakdown accurately.
Return STRICT JSON ONLY in the following format (no markdown, no backticks, just raw JSON):
{
  "name": "Short clean food title",
  "kcal": 450,
  "proteinGrams": 30,
  "carbsGrams": 45,
  "fatGrams": 15,
  "mealType": "${preferredMealType}"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            name: parsed.name || mealDescription,
            kcal: Number(parsed.kcal) || 350,
            proteinGrams: Number(parsed.proteinGrams) || 20,
            carbsGrams: Number(parsed.carbsGrams) || 40,
            fatGrams: Number(parsed.fatGrams) || 12,
            mealType: parsed.mealType || preferredMealType,
          };
        }
      }
    } catch (err) {
      console.warn('AI meal estimation fallback:', err);
    }
  }

  // Smart Offline Heuristic Fallback
  const lower = mealDescription.toLowerCase();
  let kcal = 400;
  let protein = 22;
  let carbs = 45;
  let fat = 14;

  if (lower.includes('egg') || lower.includes('яйц')) {
    kcal = 280;
    protein = 20;
    carbs = 6;
    fat = 18;
  } else if (lower.includes('chicken') || lower.includes('куриц') || lower.includes('грудк')) {
    kcal = 450;
    protein = 42;
    carbs = 30;
    fat = 12;
  } else if (lower.includes('salad') || lower.includes('салат')) {
    kcal = 220;
    protein = 8;
    carbs = 18;
    fat = 12;
  } else if (lower.includes('protein') || lower.includes('протеин') || lower.includes('shake')) {
    kcal = 180;
    protein = 28;
    carbs = 6;
    fat = 3;
  } else if (lower.includes('coffee') || lower.includes('кофе')) {
    kcal = 90;
    protein = 3;
    carbs = 10;
    fat = 4;
  } else if (lower.includes('steak') || lower.includes('говядин') || lower.includes('мясо')) {
    kcal = 550;
    protein = 45;
    carbs = 10;
    fat = 32;
  }

  return {
    name: mealDescription.trim(),
    kcal,
    proteinGrams: protein,
    carbsGrams: carbs,
    fatGrams: fat,
    mealType: preferredMealType,
  };
}

export interface HealthTelemetryContext {
  todaysMeals?: MealLog[];
  todaysWaterTotalMl?: number;
  todaysWorkouts?: WorkoutLog[];
  todaysActiveCaloriesBurned?: number;
  todaysTotalKcal?: number;
  todaysProteinGrams?: number;
  todaysCarbsGrams?: number;
  todaysFatGrams?: number;
  weightLogs?: WeightLog[];
}

/**
 * Generates personalized health advice from Sumire Health AI
 */
export async function getHealthCoachAdviceWithAI(
  profile: HealthProfile,
  metrics: CalculatedHealthMetrics,
  question: string,
  context?: HealthTelemetryContext
): Promise<string> {
  const apiKey = getStoredGeminiApiKey();

  // Prepare Live RAG Context Telemetry
  const mealsList = context?.todaysMeals && context.todaysMeals.length > 0
    ? context.todaysMeals.map(m => `${m.name} (${m.kcal} kcal, P:${m.proteinGrams}g, C:${m.carbsGrams}g, F:${m.fatGrams}g)`).join('; ')
    : 'No meals logged yet today';

  const workoutsList = context?.todaysWorkouts && context.todaysWorkouts.length > 0
    ? context.todaysWorkouts.map(w => `${w.title} (${w.durationMinutes}m, +${w.caloriesBurned} kcal, cat: ${w.category})`).join('; ')
    : 'No workouts logged yet today';

  const recentWeights = context?.weightLogs && context.weightLogs.length > 0
    ? context.weightLogs.slice(-5).map(l => `${l.date}: ${l.weight}kg`).join(', ')
    : `${profile.currentWeight} kg`;

  const startingWeight = context?.weightLogs && context.weightLogs.length > 0 ? context.weightLogs[0].weight : profile.currentWeight;
  const deltaKg = Number((profile.currentWeight - profile.targetWeight).toFixed(1));

  if (apiKey && navigator.onLine) {
    try {
      const prompt = `You are Sumire Health AI — a clinical, evidence-based health, BMI, metabolism, and nutrition intelligence agent.

LIVE USER HEALTH TELEMETRY (RAG GROUND TRUTH):
- User Profile: Age ${profile.age}, Biological Sex: ${profile.gender}, Height: ${profile.height} cm
- Weight Progress: Current ${profile.currentWeight} kg -> Goal ${profile.targetWeight} kg (Baseline Start: ${startingWeight} kg, Delta: ${deltaKg > 0 ? `${deltaKg} kg to lose` : `${Math.abs(deltaKg)} kg to gain`})
- Body Mass Index (BMI): ${metrics.bmi} (WHO Category: ${metrics.bmiCategoryLabel})
- Body Composition: ~${metrics.bodyFatPercentage}% Body Fat, ${metrics.muscleMassKg} kg Lean Muscle Mass
- Energy Expenditure: Basal BMR ${metrics.bmr} kcal, Daily TDEE ${metrics.tdee} kcal
- Prescribed Intake for Goal (${profile.goal}): ${metrics.targetDailyCalories} kcal/day
  - Target Protein: ${metrics.targetProteinGrams}g, Carbs: ${metrics.targetCarbsGrams}g, Fat: ${metrics.targetFatGrams}g
  - Target Water: ${metrics.targetWaterMl} ml/day
- Today's Real Consumed Intake:
  - Total Calories: ${context?.todaysTotalKcal || 0} / ${metrics.targetDailyCalories} kcal
  - Protein: ${context?.todaysProteinGrams || 0} / ${metrics.targetProteinGrams}g
  - Carbs: ${context?.todaysCarbsGrams || 0} / ${metrics.targetCarbsGrams}g
  - Fat: ${context?.todaysFatGrams || 0} / ${metrics.targetFatGrams}g
  - Meals eaten today: ${mealsList}
- Today's Hydration: ${context?.todaysWaterTotalMl || 0} / ${metrics.targetWaterMl} ml
- Today's Physical Activity: ${workoutsList} (Active Burn: +${context?.todaysActiveCaloriesBurned || 0} kcal)
- Recent Weigh-in History: ${recentWeights}

STRICT DOMAIN GUARDRAILS (CRITICAL):
1. MANDATORY DOMAIN RESTRICTION: You MUST ONLY answer questions strictly and directly related to:
   - Body Mass Index (BMI), body fat percentage, lean body mass, and weight management.
   - Clinical nutrition, calories, macronutrients (proteins, carbs, fats), micronutrients, hydration, and meal composition.
   - Metabolic health, BMR, TDEE, metabolic adaptation, and recovery.
   - Physical exercise, workouts, energy expenditure, and fitness physiology.
2. STRICT OFF-TOPIC REFUSAL:
   If the user asks ANY question outside the scope of health, BMI, nutrition, diet, or physical fitness (for example: coding, software, politics, world history, creative writing, general philosophy, entertainment, math problems, personal non-health chatter, etc.):
   You MUST politely and strictly DECLINE to answer, and redirect them back to their health/nutrition/BMI goals.
   Use this exact polite refusal style:
   "Я твой персональный ассистент по здоровью, питанию и телу — Sumire Health AI.
   Я специализируюсь исключительно на вопросах BMI, состава тела, правильного питания, калорий, тренировок и метаболизма.
   Пожалуйста, задай вопрос, касающийся твоего рациона, веса или физической активности."
3. BEHAVIOR & TONE:
   - Serious, analytical, empathetic, clinical, and strictly evidence-based.
   - Use the live telemetry numbers above to provide hyper-personalized insights when relevant.
   - NEVER use the word or icon "sparkles" ("✨") or emoji floods.
   - Respond in the exact language of the user's inquiry (Russian if Russian, English if English).

User Question: "${question}"`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.25 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (err) {
      console.warn('AI health advice fallback:', err);
    }
  }

  // Offline Expert Fallback with Domain Boundary Check
  const lowerQ = question.toLowerCase();
  const isHealthTopic = /bmi|вес|похуд|набор|масс|калор|ккал|белок|протеин|углевод|жир|вод|трениров|зал|кардио|спорт|питан|диет|завтрак|обед|ужин|еда|мышц|жир|fat|weight|diet|food|eat|protein|calorie|carb|water|workout|exercise|health|burn|muscle/i.test(lowerQ);

  if (!isHealthTopic) {
    return `Я твой персональный ассистент по здоровью, питанию и телу — Sumire Health AI.
Я консультирую исключительно по темам BMI, состава тела, рациона питания, калорийности и тренировок.
Пожалуйста, задай вопрос, касающийся твоего здоровья, рациона или физической формы.`;
  }

  const diffKg = Math.abs(Number((profile.currentWeight - profile.targetWeight).toFixed(1)));
  return `Твой текущий индекс массы тела: ${metrics.bmi} (${metrics.bmiCategoryLabel}). 
Базовый метаболизм (BMR) составляет ${metrics.bmr} ккал, а суточный расход энергии (TDEE) — ${metrics.tdee} ккал.

Текущая статистика за день:
• Калории: ${context?.todaysTotalKcal || 0} / ${metrics.targetDailyCalories} ккал (Остаток: ${Math.max(0, metrics.targetDailyCalories - (context?.todaysTotalKcal || 0))} ккал)
• Белок: ${context?.todaysProteinGrams || 0} / ${metrics.targetProteinGrams}г
• Вода: ${context?.todaysWaterTotalMl || 0} / ${metrics.targetWaterMl} мл
• Активный расход тренировками: +${context?.todaysActiveCaloriesBurned || 0} ккал

До цели (${profile.targetWeight} кг) осталось ${diffKg} кг. Держи дефицит калорий и норму белка для сохранения мышечной массы.`;
}

/**
 * Generates an automated, dynamic clinical health summary based on current BMI, metabolic rate, and weight trend
 */
export async function generateClinicalHealthSummaryAI(
  profile: HealthProfile,
  metrics: CalculatedHealthMetrics,
  weightLogs: WeightLog[] = []
): Promise<string> {
  const apiKey = getStoredGeminiApiKey();

  // Determine actual trend from history
  let trendSnippet = 'Вес стабилен.';
  if (weightLogs.length >= 2) {
    const firstW = weightLogs[0].weight;
    const lastW = weightLogs[weightLogs.length - 1].weight;
    const diff = Number((lastW - firstW).toFixed(1));
    if (diff < 0) {
      trendSnippet = `Динамика за период: снижение на ${Math.abs(diff)} кг.`;
    } else if (diff > 0) {
      trendSnippet = `Динамика за период: прирост на ${diff} кг.`;
    }
  }

  if (apiKey && navigator.onLine) {
    try {
      const prompt = `You are a clinical physician and metabolic health specialist.
Analyze this user's current parameters and weight trend:
- Sex: ${profile.gender}, Age: ${profile.age} y.o.
- Height: ${profile.height} cm, Weight: ${profile.currentWeight} kg -> Target: ${profile.targetWeight} kg (Goal: ${profile.goal})
- BMI: ${metrics.bmi} (${metrics.bmiCategoryLabel}) | Ideal Weight Range: ${metrics.idealWeightMin}–${metrics.idealWeightMax} kg
- BMR: ${metrics.bmr} kcal, TDEE: ${metrics.tdee} kcal, Daily Target: ${metrics.targetDailyCalories} kcal
- Est. Body Fat: ${metrics.bodyFatPercentage}% | Protein Goal: ${metrics.targetProteinGrams}g/day
- Trend: ${trendSnippet}

Write a concise, professional 3-sentence clinical summary in Russian.
1. Evaluate their BMI and healthy weight corridor for their height.
2. Evaluate their target and give the estimated safe timeline (based on ~0.4-0.5kg/week fat loss or lean gain).
3. Give one key metabolic recommendation (protein or hydration).
Tone: Serious, clear, encouraging, clinical. DO NOT use sparkles ("✨") or emoji spam.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (err) {
      console.warn('AI clinical summary fallback:', err);
    }
  }

  // Dynamic Algorithmic Clinical Generator (Offline fallback)
  const diffKg = Math.abs(Number((profile.currentWeight - profile.targetWeight).toFixed(1)));
  const estimatedWeeks = Math.max(1, Math.ceil(diffKg / 0.45));

  let goalText = '';
  if (profile.goal === 'lose') {
    goalText = diffKg > 0
      ? `Для безопасного сброса ${diffKg} кг без замедления метаболизма ориентировочный срок составит ~${estimatedWeeks} недель при дефиците 400 ккал/день.`
      : `Целевой вес достигнут. Рекомендуется переходить на рацион поддержки (TDEE: ${metrics.tdee} ккал).`;
  } else if (profile.goal === 'gain') {
    goalText = `Для набора ${diffKg} кг сухой массы ориентируйся на профицит 300-350 ккал с акцентом на силовые тренировки.`;
  } else {
    goalText = `Ты находишься в режиме поддержания. Оптимальный суточный калораж: ${metrics.tdee} ккал.`;
  }

  return `Твой индекс массы тела равен ${metrics.bmi} (${metrics.bmiCategoryLabel}). Здоровый диапазон по ВОЗ для роста ${profile.height} см составляет ${metrics.idealWeightMin}–${metrics.idealWeightMax} кг. ${goalText} Для защиты мышечной массы держи белок на уровне не ниже ${metrics.targetProteinGrams}г/сутки и пей не менее ${(metrics.targetWaterMl / 1000).toFixed(1)}л воды. ${trendSnippet}`;
}

