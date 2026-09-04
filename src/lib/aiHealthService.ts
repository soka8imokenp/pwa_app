import { getStoredGeminiApiKey } from './aiService';
import { translateFoodNameSync } from './mealTranslator';
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
CRITICAL: The "name" property MUST ALWAYS BE IN CLEAN, NATURAL ENGLISH (e.g. "Lipton Iced Tea 2L", "Vanilla Ice Cream", "Chicken Breast with Rice", "Borscht", "Oatmeal with Berries"). Translate if the user spoke another language.
Return STRICT JSON ONLY in the following format (no markdown, no backticks, just raw JSON):
{
  "name": "Short clean food title in English",
  "kcal": 450,
  "proteinGrams": 30,
  "carbsGrams": 45,
  "fatGrams": 15,
  "mealType": "${preferredMealType}"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
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
          const rawName = parsed.name || mealDescription;
          const englishName = /[а-яё]/i.test(rawName)
            ? translateFoodNameSync(rawName)
            : rawName;

          return {
            name: englishName,
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
  } else if (lower.includes('tea') || lower.includes('чай') || lower.includes('липтон') || lower.includes('lipton')) {
    kcal = 80;
    protein = 0;
    carbs = 20;
    fat = 0;
  } else if (lower.includes('ice cream') || lower.includes('морожен')) {
    kcal = 250;
    protein = 4;
    carbs = 32;
    fat = 14;
  } else if (lower.includes('pizza') || lower.includes('пицц')) {
    kcal = 600;
    protein = 24;
    carbs = 70;
    fat = 22;
  } else if (lower.includes('steak') || lower.includes('говядин') || lower.includes('мясо')) {
    kcal = 550;
    protein = 45;
    carbs = 10;
    fat = 32;
  }

  return {
    name: translateFoodNameSync(mealDescription.trim()),
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
    'gemini-3.5-flash-lite',
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

export const CURATED_SCIENCE_FACTS = [
  "⚡ Синтез мышечного белка (MPS): для максимальной стимуляции анаболизма порция белка должна содержать около 2.5–3г лейцина (эквивалент ~25–30г сывороточного протеина или 150г куриной грудки).",
  "💧 Гидратация и липолиз: обезвоживание всего на 2% снижает физическую выносливость на 10-15% и замедляет окисление жиров клетками печени.",
  "🔥 NEAT (нетренировочный термогенез): бытовая активность (ходьба, уборка, лестница) сжигает в 3–5 раз больше суточных калорий, чем 45 минут интенсивной тренировки в зале.",
  "🌙 Сон и гормоны голода: сокращение сна до 5–6 часов увеличивает секрецию грелина (гормона голода) на 15% и снижает лептин (гормон сытости), провоцируя тягу к сладкому.",
  "🏋️ Эффект EPOC: высокоинтенсивные силовые тренировки вызывают пост-тренировочное потребление кислорода, продолжая сжигать калории в течение 12–24 часов после занятия.",
  "🥑 Правило гибкой диеты (80/20): включение 15–20% калорий из любимых лакомств при соблюдении суточного бюджета предотвращает срывы и не замедляет сжигание жира.",
  "☕ Кофеин и выносливость: прием 3 мг кофеина на 1 кг массы тела за 45 минут до кардио ускоряет мобилизацию жирных кислот и повышает порог утомления.",
  "🥗 Клетчатка и гликемия: употребление порции зеленых овощей перед быстрыми углеводами замедляет всасывание и снижает пик глюкозы в крови на 30%.",
  "🏃 Пульсовая Зона 2: кардио при 60–70% от максимального пульса стимулирует рост плотности митохондрий и развивает способность организма использовать жиры как топливо.",
  "🧠 Креатин моногидрат: самая исследованная добавка доказательной медицины. Он ускоряет ресинтез АТФ в мышцах и поддерживает когнитивную выносливость головного мозга.",
  "🍌 Восстановление гликогена: мышечный гликоген восполняется наиболее активно в первые 2 часа после тренировки благодаря временному повышению активности транспортеров GLUT-4.",
  "🛡️ Защита мышц на дефиците: потребление белка на уровне 1.6–2.0г на 1 кг массы тела надежно предотвращает катаболизм активной мышечной ткани даже при дефиците калорий."
];

/**
 * Generates dynamic, evidence-based science insights about nutrition, sports, and fitness
 */
export async function generateClinicalHealthSummaryAI(
  _profile: HealthProfile,
  _metrics: CalculatedHealthMetrics,
  _weightLogs: WeightLog[] = []
): Promise<string> {
  const apiKey = getStoredGeminiApiKey().trim();

  if (apiKey && navigator.onLine) {
    try {
      const prompt = `You are Sumire Health AI — an elite sports scientist and clinical nutritionist.
Generate ONE fascinating, concise, evidence-based scientific fact or insight (2 sentences max) in Russian about nutrition, physical fitness, metabolism, or sports physiology.
The fact must be scientifically proven, surprising, and practical for someone improving their body composition.
Topics: muscle protein synthesis, NEAT, hydration & fat oxidation, sleep & ghrelin/leptin, EPOC effect, Zone 2 cardio, creatine, caffeine timing, or gut microbiome.
NO preamble, NO introduction, NO sparkles ("✨"). Output ONLY the science insight text.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 250,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) return text.trim();
      }
    } catch (err) {
      console.warn('AI science insight fallback:', err);
    }
  }

  // Instant rotation from curated sports science facts
  const randomIndex = Math.floor(Math.random() * CURATED_SCIENCE_FACTS.length);
  return CURATED_SCIENCE_FACTS[randomIndex];
}

