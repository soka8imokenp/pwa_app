import { getStoredGeminiApiKey } from './aiService';

const COMMON_FOOD_DICTIONARY: Record<string, string> = {
  // Beverages
  'айс ти': 'Iced Tea',
  'айсти': 'Iced Tea',
  'липтон': 'Lipton Iced Tea',
  'чай липтон': 'Lipton Iced Tea',
  'чай': 'Tea',
  'холодный чай': 'Iced Tea',
  'зеленый чай': 'Green Tea',
  'черный чай': 'Black Tea',
  'кофе': 'Coffee',
  'кофе с молоком': 'Coffee with Milk',
  'латте': 'Latte',
  'капучино': 'Cappuccino',
  'эспрессо': 'Espresso',
  'вода': 'Water',
  'сок': 'Juice',
  'апельсиновый сок': 'Orange Juice',
  'яблочный сок': 'Apple Juice',
  'газировка': 'Soda',
  'кола': 'Cola',
  'пепси': 'Pepsi',
  'лимонад': 'Lemonade',
  'энергетик': 'Energy Drink',
  'молоко': 'Milk',
  'кефир': 'Kefir',
  'смузи': 'Smoothie',
  'протеин': 'Protein Shake',
  'протеиновый коктейль': 'Protein Shake',

  // Desserts & Snacks
  'мороженое': 'Ice Cream',
  'мороженное': 'Ice Cream',
  'пломбир': 'Plombir Ice Cream',
  'шоколад': 'Chocolate',
  'печенье': 'Cookies',
  'торт': 'Cake',
  'круассан': 'Croissant',
  'чипсы': 'Chips',
  'орехи': 'Nuts',
  'миндаль': 'Almonds',
  'арахис': 'Peanuts',

  // Meals & Breakfast
  'пицца': 'Pizza',
  'пицца маргарита': 'Margherita Pizza',
  'пепперони': 'Pepperoni Pizza',
  'овсянка': 'Oatmeal',
  'овсяная каша': 'Oatmeal Porridge',
  'яйца': 'Eggs',
  'вареные яйца': 'Boiled Eggs',
  'яичница': 'Fried Eggs',
  'омлет': 'Omelette',
  'тост': 'Toast',
  'хлеб': 'Bread',
  'сыр': 'Cheese',
  'творог': 'Cottage Cheese',
  'бутерброд': 'Sandwich',
  'сэндвич': 'Sandwich',
  'бургер': 'Burger',

  // Main dishes
  'курица': 'Chicken',
  'куриная грудка': 'Chicken Breast',
  'куриное филе': 'Chicken Fillet',
  'курица с рисом': 'Chicken with Rice',
  'рис': 'Rice',
  'гречка': 'Buckwheat',
  'паста': 'Pasta',
  'макароны': 'Pasta',
  'спагетти': 'Spaghetti',
  'салат': 'Salad',
  'суп': 'Soup',
  'борщ': 'Borscht',
  'пельмени': 'Dumplings',
  'рыба': 'Fish',
  'лосось': 'Salmon',
  'стейк': 'Steak',
  'говядина': 'Beef',
  'шашлык': 'Shashlik / Grilled Meat',
  'картофель': 'Potatoes',
  'картошка': 'Potatoes',
  'пюре': 'Mashed Potatoes',
  'яблоко': 'Apple',
  'банан': 'Banana',
  'ягоды': 'Berries',
  'клубника': 'Strawberries',
};

/**
 * Fast synchronous dictionary-based translation from Russian/Cyrillic food terms to English.
 */
export function translateFoodNameSync(russianName: string): string {
  if (!russianName) return 'Meal Item';
  const trimmed = russianName.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct dictionary match
  if (COMMON_FOOD_DICTIONARY[lower]) {
    return COMMON_FOOD_DICTIONARY[lower];
  }

  // 2. Partial dictionary matching (e.g. "выпил 2л липтона", "мороженое пломбир 100г")
  for (const [ruKey, enVal] of Object.entries(COMMON_FOOD_DICTIONARY)) {
    if (lower.includes(ruKey)) {
      // Check if there is a volume or size (e.g. "2л", "0.5л", "200г", "2L")
      const volumeMatch = trimmed.match(/(\d+(?:[.,]\d+)?\s*(?:л|l|мл|ml|г|g|кг|kg))/i);
      if (volumeMatch) {
        return `${enVal} ${volumeMatch[1].toUpperCase()}`;
      }
      return enVal;
    }
  }

  // If no match found and contains Cyrillic, capitalize words
  if (/[а-яё]/i.test(trimmed)) {
    // Basic fallback title
    return trimmed;
  }

  return trimmed;
}

/**
 * High-accuracy translation using Gemini AI with instant dictionary fallback.
 */
export async function translateFoodNameToEnglish(foodName: string): Promise<string> {
  if (!foodName || !/[а-яё]/i.test(foodName)) {
    return foodName || 'Meal Item';
  }

  // Check sync dictionary first
  const syncMatch = translateFoodNameSync(foodName);
  if (syncMatch !== foodName) {
    return syncMatch;
  }

  const apiKey = getStoredGeminiApiKey();
  if (apiKey && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const prompt = `Translate this food or drink name into clean, natural English (e.g. "айс ти липтон" -> "Lipton Iced Tea", "мороженое" -> "Ice Cream").
Return ONLY the English title, nothing else: "${foodName}"`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 30,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text && !/[а-яё]/i.test(text)) {
          return text.replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // Fallback
    }
  }

  return syncMatch;
}

/**
 * Automatically updates any existing Cyrillic meal records in the database into English.
 */
export async function migrateExistingMealsToEnglish(): Promise<void> {
  try {
    const { db } = await import('./db');
    const allMeals = await db.mealLogs.toArray();
    for (const meal of allMeals) {
      if (meal.id && /[а-яё]/i.test(meal.name)) {
        const english = translateFoodNameSync(meal.name);
        if (english && english !== meal.name) {
          await db.mealLogs.update(meal.id, { name: english });
        }
      }
    }
  } catch (err) {
    console.warn('Cyrillic meal migration skipped:', err);
  }
}
