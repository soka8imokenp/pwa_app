import { getStoredGeminiApiKey } from './aiService';
import type { HealthProfile, CalculatedHealthMetrics, MealType, WeightLog, MealLog, WorkoutLog } from '../types/health';

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
      const waistInfo = profile.waistCm
        ? `- Waist: ${profile.waistCm} cm (WHtR: ${(profile.waistCm / profile.height).toFixed(2)})`
        : '';

      const prompt = `You are Sumire Health AI — an elite, knowledgeable, empathetic, evidence-based personal health, nutrition, and metabolic coach.

USER'S LIVE BIOMETRICS & METABOLIC TELEMETRY:
- Demographics: Biological Sex: ${profile.gender}, Age: ${profile.age} y.o., Height: ${profile.height} cm
- Weight Progress: Current ${profile.currentWeight} kg -> Target: ${profile.targetWeight} kg (Goal: ${profile.goal})
  ${waistInfo}
- Body Mass Index (BMI): ${metrics.bmi} (${metrics.bmiCategoryLabel}) | Healthy WHO Range for ${profile.height}cm: ${metrics.idealWeightMin}–${metrics.idealWeightMax} kg
- Body Composition: ~${metrics.bodyFatPercentage}% Body Fat, ${metrics.muscleMassKg} kg Lean Tissue
- Energy Expenditure: Basal BMR: ${metrics.bmr} kcal, Total Daily TDEE: ${metrics.tdee} kcal
- Prescribed Intake: ${metrics.targetDailyCalories} kcal/day (${metrics.targetProteinGrams}g Protein, ${metrics.targetCarbsGrams}g Carbs, ${metrics.targetFatGrams}g Fat, ${metrics.targetWaterMl}ml Water)
- Today's Consumed Intake: ${context?.todaysTotalKcal || 0} / ${metrics.targetDailyCalories} kcal (Protein: ${context?.todaysProteinGrams || 0}g, Carbs: ${context?.todaysCarbsGrams || 0}g, Fat: ${context?.todaysFatGrams || 0}g)
  - Meals logged today: ${mealsList}
- Today's Hydration: ${context?.todaysWaterTotalMl || 0} / ${metrics.targetWaterMl} ml
- Today's Workouts: ${workoutsList} (Active Burn: +${context?.todaysActiveCaloriesBurned || 0} kcal)
- Recent Weigh-ins: ${recentWeights}

COACHING ROLE & PHILOSOPHY:
1. FULL CONVERSATIONAL FREEDOM:
   - You are a real, warm, articulate nutrition and health expert, NOT a rigid robot.
   - You can discuss ANY health, diet, food, lifestyle, fitness, metabolic, and weight questions with depth, practical examples, and nuance.
   - When asked about specific treats or foods (e.g. "Can I eat ice cream / chocolate / pizza / fast food?"):
     * Explain flexible dieting (IIFYM / 80/20 rule), how many calories/sugar it typically contains (e.g. 180-220 kcal for a portion of ice cream), how to easily fit it into the user's daily budget of ${metrics.targetDailyCalories} kcal, and why total restriction leads to psychological burnout and binge cycles.
   - When asked about weight targets (e.g. "Should I drop my weight to 65 kg?"):
     * Calculate what BMI that would produce for height ${profile.height} cm: weight / (height/100)^2.
     * Compare with the WHO healthy range (${metrics.idealWeightMin}–${metrics.idealWeightMax} kg), consider muscle mass preservation vs fat loss, and give a thoughtful, personalized recommendation.
   - When asked about cravings, supplements, recovery, meal timing, intermittent fasting, or workouts:
     * Provide evidence-based, actionable explanations with pros, cons, and tips.
2. TAILORED DATA GROUNDING:
   - Naturally reference their personal stats (height, BMR, TDEE, today's calories/protein) when relevant to make the answer personalized and grounded.
3. BOUNDARIES:
   - Only decline topics that are 100% completely unrelated to human life, body, health, wellness, or food (e.g., coding software, political elections, writing poetry). If anything can be linked to stress, sleep, energy, or lifestyle, answer it through the lens of health!
4. STYLE:
   - Clear, supportive, knowledgeable, friendly, and structured (use bullet points where helpful).
   - DO NOT use the word "sparkle" or the icon "✨".
   - Respond in the user's language (Russian if Russian, English if English).

User Question: "${question}"`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 },
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

  // Multi-Intent Conversational Offline Engine
  const lowerQ = question.toLowerCase();

  // Intent 1: Ice Cream, Sweets, Treats & Cheat Meals
  if (/морожен|сладк|шоколад|чипсы|пицц|бутер|бургер|вкусняш|читмил|сахар|торт|печень|десерт|ice cream|chocolate|sweet|pizza|cheat/i.test(lowerQ)) {
    const remainingKcal = Math.max(0, metrics.targetDailyCalories - (context?.todaysTotalKcal || 0));
    return `Да, мороженое и любимые десерты можно и нужно вписывать в рацион! В доказательной диетологии ключевую роль играет принцип гибкой диеты (правило 80/20).

Как это работает для тебя:
• Калорийность: порция классического пломбира (80–100г) содержит около 180–220 ккал и 15–20г углеводов.
• Твой суточный лимит: ${metrics.targetDailyCalories} ккал. Если сегодня уже съедено ${context?.todaysTotalKcal || 0} ккал, у тебя остается в запасе ${remainingKcal} ккал — мороженое идеально помещается в баланс!
• Практический совет: съешь десерт после сбалансированного приема пищи (с белком и клетчаткой). Это сгладит скачок глюкозы и избавит от чувства вины. Главное — вписаться в суточную калорийность и добрать ${metrics.targetProteinGrams}г белка.`;
  }

  // Intent 2: Target Weight Evaluation (e.g. "спустить вес до 65")
  const targetMatch = lowerQ.match(/(\d{2,3})/);
  if (/спустить|сбросить до|снизить до|похудеть до|весить|цель|target|60|65|70|75|80/i.test(lowerQ) && targetMatch) {
    const desiredWeight = parseFloat(targetMatch[1]);
    if (desiredWeight >= 40 && desiredWeight <= 150) {
      const heightM = profile.height / 100;
      const desiredBmi = Number((desiredWeight / (heightM * heightM)).toFixed(1));
      const isHealthyBmi = desiredBmi >= 18.5 && desiredBmi <= 24.9;

      return `Разберем цель ${desiredWeight} кг для твоего роста ${profile.height} см:

• Прогноз BMI: при весе ${desiredWeight} кг твой индекс массы тела составит ${desiredBmi}.
• Коридор здоровья по ВОЗ: ${metrics.idealWeightMin} – ${metrics.idealWeightMax} кг. ${isHealthyBmi ? 'Этот вес находится в границах здоровой нормы.' : desiredBmi < 18.5 ? 'Внимание: этот вес ниже границы дефицита массы (<18.5) и может снизить гормональный фон.' : 'Этот вес относится к избыточной массе.'}
• Оценка композиции: сейчас твой вес ${profile.currentWeight} кг. До цели ${desiredWeight} кг нужно ${profile.currentWeight > desiredWeight ? `сбросить ${Number((profile.currentWeight - desiredWeight).toFixed(1))} кг` : `набрать ${Number((desiredWeight - profile.currentWeight).toFixed(1))} кг`}.
• Рекомендация: при интенсивном снижении важно сохранить мышечную ткань (${metrics.muscleMassKg} кг). Рекомендую двигаться плавно с темпом ~0.4–0.5 кг в неделю, удерживая белок не ниже ${metrics.targetProteinGrams}г/день.`;
    }
  }

  // Intent 3: Protein & Nutrition
  if (/белок|протеин|protein|мясо|творог|яйц|рыб/i.test(lowerQ)) {
    return `Белок — ключевой нутриент для сохранения метаболизма и мышц при цели (${profile.goal}):

• Твоя суточная норма: ${metrics.targetProteinGrams}г в день (~${(metrics.targetProteinGrams * 4)} ккал).
• Сегодня съедено: ${context?.todaysProteinGrams || 0}г из ${metrics.targetProteinGrams}г.
• Топ источников: куриное филе (31г/100г), творог 5% (16г/100г), яйца (6г/шт), тунец (24г/100г), сывороточный протеин (24г/порция).
• Совет: распределяй белок равномерно по 25–40г на каждый основной прием пищи для постоянного синтеза мышечного белка (MPS).`;
  }

  // Intent 4: Water & Hydration
  if (/вод|пить|жидкост|water|hydration/i.test(lowerQ)) {
    return `Твоя физиологическая норма воды рассчитана по стандарту 35 мл на 1 кг веса (${profile.currentWeight} кг):

• Суточный ориентир: ${(metrics.targetWaterMl / 1000).toFixed(1)} литра (${metrics.targetWaterMl} мл).
• Сегодня выпито: ${context?.todaysWaterTotalMl || 0} мл (${Math.round((context?.todaysWaterTotalMl || 0) / 250)} стаканов).
• Зачем это нужно: достаточное количество воды снижает ложное чувство голода, выводит избыточный натрий (предотвращает отеки) и ускоряет липолиз.`;
  }

  // Intent 5: Cravings & Late-night eating
  if (/на ночь|вечер|голод|аппетит|тяга|сорват|жор|craving/i.test(lowerQ)) {
    return `Вечерняя тяга к еде обычно вызвана двумя причинами: недостатком белка и сложных углеводов в течение дня, либо стрессовым скачком кортизола.

Как решить это без срывов:
1. Не бойся есть вечером: метаболизм ночью не «засыпает», важен суммарный суточный баланс калорий (${metrics.targetDailyCalories} ккал).
2. Идеальный вечерний перекус: 150г нежирного творога или греческого йогурта с ягодами (казеин медленно усваивается и защитит от ночного голода).
3. Проверь обед: если днем был сильный дефицит, организм логично требует быстрой энергии вечером.`;
  }

  // Intent 6: Training & Workouts
  if (/трениров|зал|мышц|кардио|спорт|упражнен|workout|gym/i.test(lowerQ)) {
    return `Физическая активность для твоего профиля (цель: ${profile.goal}, активность: ${profile.activityLevel}):

• Расход энергии: твой суточный расход TDEE составляет ${metrics.tdee} ккал. За сегодня тренировками сожжено +${context?.todaysActiveCaloriesBurned || 0} ккал.
• Силовые тренировки: 3 раза в неделю стимулируют сохранение ${metrics.muscleMassKg} кг активной мышечной массы.
• Шаги и кардио: 8000–10000 шагов в день обеспечивают мягкий расход жира без перегрузки суставов и ЦНС.`;
  }

  // General Evidence-Based Health Response
  const diffKg = Math.abs(Number((profile.currentWeight - profile.targetWeight).toFixed(1)));
  const remainingKcal = Math.max(0, metrics.targetDailyCalories - (context?.todaysTotalKcal || 0));

  return `Я внимательно изучила твои параметры и готова разобрать любой вопрос по рациону, продуктам или тренировкам:

• Твой статус: вес ${profile.currentWeight} кг (цель ${profile.targetWeight} кг, дельта ${diffKg} кг), BMI ${metrics.bmi} (${metrics.bmiCategoryLabel}).
• Сегодняшний баланс: ${context?.todaysTotalKcal || 0} / ${metrics.targetDailyCalories} ккал (осталось ${remainingKcal} ккал), белок ${context?.todaysProteinGrams || 0}/${metrics.targetProteinGrams}г.

Ты можешь спросить меня о конкретных продуктах (мороженое, фрукты, кофе), скорректировать цель по весу или составить план питания. Что именно разберем?`;
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

  const waistSnippet = metrics.waistToHeightRatio
    ? `, индекс талии WHtR: ${metrics.waistToHeightRatio} (${metrics.waistRiskCategory || 'норма'})`
    : '';

  if (apiKey && navigator.onLine) {
    try {
      const prompt = `You are a clinical physician and metabolic endocrinologist.
Analyze this patient's comprehensive health profile:
- Demographics: ${profile.gender}, ${profile.age} y.o., Height: ${profile.height} cm, Weight: ${profile.currentWeight} kg -> Goal: ${profile.targetWeight} kg (${profile.goal})
- BMI: ${metrics.bmi} (${metrics.bmiCategoryLabel}) | Ideal WHO Corridor: ${metrics.idealWeightMin}–${metrics.idealWeightMax} kg${waistSnippet}
- Metabolism: BMR ${metrics.bmr} kcal, TDEE ${metrics.tdee} kcal, Prescribed: ${metrics.targetDailyCalories} kcal/day
- Body Composition: ~${metrics.bodyFatPercentage}% Fat, ${metrics.muscleMassKg} kg Lean Tissue | Protein Target: ${metrics.targetProteinGrams}g/day
- Weigh-in Trend: ${trendSnippet}

Write an elegant, structured clinical analysis in Russian (3 concise sections):
1. [Клинический статус]: Evaluate BMI, healthy corridor, and central visceral fat risk.
2. [Прогноз и темп]: Evaluate timeline to goal (${profile.targetWeight} kg) at safe physiological rate (0.4-0.5 kg/week).
3. [Назначения]: Clear prescription for daily caloric budget (${metrics.targetDailyCalories} kcal), protein (${metrics.targetProteinGrams}g), and water (${(metrics.targetWaterMl/1000).toFixed(1)}L).
Tone: Serious, empathetic, clinical, encouraging. NO sparkles ("✨") or emoji floods.`;

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
      console.warn('AI clinical summary fallback:', err);
    }
  }

  // Dynamic Algorithmic Clinical Generator (Offline fallback)
  const diffKg = Math.abs(Number((profile.currentWeight - profile.targetWeight).toFixed(1)));
  const estimatedWeeks = Math.max(1, Math.ceil(diffKg / 0.45));

  let goalPaceText = '';
  if (profile.goal === 'lose') {
    goalPaceText = diffKg > 0
      ? `Для безопасного снижения ${diffKg} кг без замедления щитовидной железы ориентировочный срок составит ~${estimatedWeeks} недель при дефиците ~400 ккал/день.`
      : `Целевой вес ${profile.targetWeight} кг достигнут. Рекомендуется фиксация на калораже поддержки (TDEE: ${metrics.tdee} ккал).`;
  } else if (profile.goal === 'gain') {
    goalPaceText = `Для чистого набора ${diffKg} кг сухой мышечной массы ориентируйся на профицит 300–350 ккал с прогрессивными силовыми нагрузками.`;
  } else {
    goalPaceText = `Режим поддержания стабильного веса. Оптимальный суточный расход энергии: ${metrics.tdee} ккал.`;
  }

  return `• Клинический статус: Индекс массы тела равен ${metrics.bmi} (${metrics.bmiCategoryLabel}). Здоровый диапазон по ВОЗ для роста ${profile.height} см составляет ${metrics.idealWeightMin}–${metrics.idealWeightMax} кг${waistSnippet}.
• Динамика и прогноз: ${trendSnippet} ${goalPaceText}
• Клинические назначения: Суточный рацион — ${metrics.targetDailyCalories} ккал, потребление белка — не ниже ${metrics.targetProteinGrams}г/сутки (для сохранения ${metrics.muscleMassKg} кг мышечной массы), гидратация — ${(metrics.targetWaterMl / 1000).toFixed(1)}л чистой воды.`;
}

