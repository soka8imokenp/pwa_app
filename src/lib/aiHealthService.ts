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

/**
 * Generates personalized health advice from Sumire Health AI using the exact Gemini model loop with multimodal photo support
 */
export async function getHealthCoachAdviceWithAI(
  profile: HealthProfile,
  metrics: CalculatedHealthMetrics,
  question: string,
  context?: HealthTelemetryContext,
  imageAttachment?: { base64Data: string; mimeType: string },
  chatHistory: Array<{ sender: 'user' | 'sumire'; text: string }> = []
): Promise<string> {
  const apiKey = getStoredGeminiApiKey().trim();

  if (!apiKey) {
    throw new Error(
      'Пожалуйста, укажите Google Gemini API Key в Настройках приложения (кнопка ⚙️ вверху экрана), чтобы Sumire могла анализировать ваши фото и отвечать на любые вопросы в реальном времени.'
    );
  }

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
  const waistInfo = profile.waistCm
    ? `- Waist: ${profile.waistCm} cm (WHtR: ${(profile.waistCm / profile.height).toFixed(2)})`
    : '';

  const systemInstructionText = `You are Sumire Health AI — an elite, knowledgeable, empathetic, evidence-based personal health, nutrition, and metabolic coach.

USER'S LIVE BIOMETRICS & METABOLIC TELEMETRY:
- Demographics: Biological Sex: ${profile.gender}, Age: ${profile.age} y.o., Height: ${profile.height} cm
- Weight Progress: Current ${profile.currentWeight} kg -> Target: ${profile.targetWeight} kg (Goal: ${profile.goal}, Delta: ${deltaKg > 0 ? `${deltaKg} kg to lose` : `${Math.abs(deltaKg)} kg to gain`})
  ${waistInfo}
- Body Mass Index (BMI): ${metrics.bmi} (${metrics.bmiCategoryLabel}) | Healthy WHO Range for ${profile.height}cm: ${metrics.idealWeightMin}–${metrics.idealWeightMax} kg
- Body Composition: ~${metrics.bodyFatPercentage}% Body Fat, ${metrics.muscleMassKg} kg Lean Tissue
- Energy Expenditure: Basal BMR: ${metrics.bmr} kcal, Total Daily TDEE: ${metrics.tdee} kcal
- Prescribed Intake: ${metrics.targetDailyCalories} kcal/day (${metrics.targetProteinGrams}g Protein, ${metrics.targetCarbsGrams}g Carbs, ${metrics.targetFatGrams}g Fat, ${metrics.targetWaterMl}ml Water)
- Today's Consumed Intake: ${context?.todaysTotalKcal || 0} / ${metrics.targetDailyCalories} kcal (Protein: ${context?.todaysProteinGrams || 0}g, Carbs: ${context?.todaysCarbsGrams || 0}g, Fat: ${context?.todaysFatGrams || 0}g)
  - Meals logged today: ${mealsList}
- Today's Hydration: ${context?.todaysWaterTotalMl || 0} / ${metrics.targetWaterMl} ml
- Today's Workouts: ${workoutsList} (Active Burn: +${context?.todaysActiveCaloriesBurned || 0} kcal)
- Recent Weigh-in History: ${recentWeights}

COACHING CAPABILITIES & GUIDELINES:
1. DIETARY & FOOD ANALYSIS (INCLUDING PHOTOS):
   - You analyze any food, meal, dessert, plate photo, nutrition label, or recipe.
   - When given a photo of food / plate / snack / nutritional label:
     * Accurately identify the ingredients, components, and portion size.
     * Estimate total calories (kcal) and macronutrients (protein, carbs, fat).
     * Provide constructive feedback: explain how it fits into their daily budget (${metrics.targetDailyCalories} kcal, ${metrics.targetProteinGrams}g protein) and how to balance the rest of the day.
   - You embrace flexible dieting (IIFYM / 80/20 rule): treats like ice cream, chocolate, pizza, or burgers can be enjoyed in moderation without guilt if daily macros and calories allow.
2. WEIGHT, BODY COMPOSITION & TARGETS:
   - When asked if they should change their weight target (e.g. "Should I drop my weight to 65 kg?"):
     * Calculate resulting BMI for height ${profile.height} cm: targetWeight / (height/100)^2.
     * Compare with WHO healthy range (${metrics.idealWeightMin}–${metrics.idealWeightMax} kg).
     * Analyze muscle retention, metabolic health, and give a thoughtful, honest recommendation.
3. CONVERSATIONAL FREEDOM:
   - Speak naturally, warmly, intelligently, and constructively like a top-tier private nutritionist and fitness coach.
   - Seamlessly connect personal stats to your recommendations.
4. TONE & STYLE:
   - Supportive, evidence-based, articulate, and practical (use bullet points for readability).
   - NEVER use the word "sparkle" or the icon "✨".
   - Respond in the user's language (Russian if Russian, English if English).`;

  // Build multi-turn contents payload
  const contents: any[] = [];

  // Previous conversation turns (up to 8)
  chatHistory.slice(-8).forEach((msg) => {
    if (msg.sender === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.text }] });
    } else if (msg.sender === 'sumire') {
      contents.push({ role: 'model', parts: [{ text: msg.text }] });
    }
  });

  // Current turn with optional image attachment
  const currentParts: any[] = [];
  if (imageAttachment && imageAttachment.base64Data) {
    currentParts.push({
      inlineData: {
        mimeType: imageAttachment.mimeType || 'image/jpeg',
        data: imageAttachment.base64Data,
      },
    });
  }

  currentParts.push({
    text: question || (imageAttachment ? 'Оцени это блюдо на фото, его калорийность, состав и дай рекомендации для моего рациона.' : ''),
  });

  contents.push({
    role: 'user',
    parts: currentParts,
  });

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];

  let lastError: any = null;
  let responseData: any = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1000,
          },
        }),
      });

      if (res.ok) {
        responseData = await res.json();
        break;
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson;
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (!responseData) {
    const errorMsg = lastError?.error?.message || 'Не удалось связаться с сервисом Gemini. Пожалуйста, проверьте API-ключ в настройках или подключение к сети.';
    throw new Error(errorMsg);
  }

  const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Пустой ответ от модели Gemini. Попробуйте переформулировать вопрос.');
  }

  return text.trim();
}

/**
 * Generates an automated, dynamic clinical health summary based on current BMI, metabolic rate, and weight trend
 */
export async function generateClinicalHealthSummaryAI(
  profile: HealthProfile,
  metrics: CalculatedHealthMetrics,
  weightLogs: WeightLog[] = []
): Promise<string> {
  const apiKey = getStoredGeminiApiKey().trim();

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
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];

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

    for (const model of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
        // try next candidate model
      }
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

