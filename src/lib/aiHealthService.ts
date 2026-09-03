import { getStoredGeminiApiKey } from './aiService';
import type { HealthProfile, CalculatedHealthMetrics, MealType } from '../types/health';

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

/**
 * Generates personalized health advice from Sumire Health AI
 */
export async function getHealthCoachAdviceWithAI(
  profile: HealthProfile,
  metrics: CalculatedHealthMetrics,
  question: string
): Promise<string> {
  const apiKey = getStoredGeminiApiKey();

  if (apiKey && navigator.onLine) {
    try {
      const prompt = `You are Sumire, a serious, calm, elite health and nutrition coach for the user.
User Profile:
- Gender: ${profile.gender}, Age: ${profile.age}
- Height: ${profile.height} cm, Current Weight: ${profile.currentWeight} kg, Target: ${profile.targetWeight} kg
- BMI: ${metrics.bmi} (${metrics.bmiCategoryLabel})
- BMR: ${metrics.bmr} kcal, TDEE: ${metrics.tdee} kcal
- Target Calories for ${profile.goal}: ${metrics.targetDailyCalories} kcal/day
- Target Protein: ${metrics.targetProteinGrams}g, Carbs: ${metrics.targetCarbsGrams}g, Fats: ${metrics.targetFatGrams}g
- Target Water: ${metrics.targetWaterMl} ml/day

User question: "${question}"

Behavioral Rules:
- Persona: Calm, concise, strictly evidence-based, supportive yet direct.
- DO NOT use sparkles ("✨") or emoji spam.
- Keep the response between 2 and 4 compact paragraphs with bullet points if helpful.
- Respond in the exact language of the user's question (Russian if Russian, English if English).`;

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

  // Offline Expert Fallback
  const diffKg = Math.abs(Number((profile.currentWeight - profile.targetWeight).toFixed(1)));
  return `Твой текущий индекс массы тела: ${metrics.bmi} (${metrics.bmiCategoryLabel}). 
Базовый метаболизм (BMR) составляет ${metrics.bmr} ккал, а суточный расход энергии (TDEE) — ${metrics.tdee} ккал.

Для безопасного достижения цели (${profile.targetWeight} кг, осталось ${diffKg} кг):
• Держи суточный рацион в районе ${metrics.targetDailyCalories} ккал.
• Потребляй не менее ${metrics.targetProteinGrams}г белка в день для сохранения мышечного тонуса.
• Выпивай минимум ${(metrics.targetWaterMl / 1000).toFixed(1)} л чистой воды ежедневно.

Регулярность важнее экстремальных ограничений. Продолжай фиксировать вес и пить воду.`;
}
