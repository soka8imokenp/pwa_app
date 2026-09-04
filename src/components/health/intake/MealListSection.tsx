import React, { useState } from 'react';
import {
  Sun,
  Flame,
  Moon,
  Coffee,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  Utensils,
} from 'lucide-react';
import { playClickSound } from '../../../lib/sound';
import type { MealLog, MealType } from '../../../types/health';

interface MealListSectionProps {
  todaysMeals: MealLog[];
  onDeleteMeal: (id: number) => Promise<void>;
}

interface CategoryConfig {
  type: MealType;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  { type: 'breakfast', label: 'Завтрак', sublabel: 'Breakfast', icon: Sun, accentColor: '#FEF08A' },
  { type: 'lunch', label: 'Обед', sublabel: 'Lunch', icon: Flame, accentColor: '#FECDD3' },
  { type: 'dinner', label: 'Ужин', sublabel: 'Dinner', icon: Moon, accentColor: '#E9D5FF' },
  { type: 'snack', label: 'Перекус и напитки', sublabel: 'Snacks & Drinks', icon: Coffee, accentColor: '#DCFCE7' },
];

export const MealListSection: React.FC<MealListSectionProps> = ({
  todaysMeals,
  onDeleteMeal,
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<MealType, boolean>>({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  });

  const toggleCategory = (cat: MealType) => {
    playClickSound();
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleDelete = async (id: number, name: string) => {
    playClickSound();
    if (confirm(`Удалить «${name}» из рациона?`)) {
      await onDeleteMeal(id);
    }
  };

  return (
    <div className="space-y-3 font-body">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const mealsInCat = todaysMeals.filter((m) => m.mealType === cat.type);
        const catKcal = mealsInCat.reduce((acc, m) => acc + (m.kcal || 0), 0);
        const isCollapsed = collapsedCategories[cat.type];

        return (
          <div
            key={cat.type}
            className="bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] overflow-hidden transition-all"
          >
            {/* Accordion Category Header */}
            <button
              type="button"
              onClick={() => toggleCategory(cat.type)}
              className="w-full p-3.5 flex items-center justify-between hover:bg-[#FAF8F5] transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0"
                  style={{ backgroundColor: cat.accentColor }}
                >
                  <Icon className="w-4 h-4 text-[#24201D]" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                      {cat.label}
                    </h4>
                    <span className="text-[10px] text-[#8C827A] font-bold">
                      • {cat.sublabel}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#6B635B] font-mono-num">
                    {mealsInCat.length === 0
                      ? 'Нет записей'
                      : `${mealsInCat.length} ${mealsInCat.length === 1 ? 'позиция' : mealsInCat.length <= 4 ? 'позиции' : 'позиций'}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black font-mono-num text-[#24201D] px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#24201D]/20 shadow-2xs">
                  {catKcal} ккал
                </span>
                <div className="w-6 h-6 rounded-lg bg-[#FAF8F5] border border-[#24201D]/15 flex items-center justify-center">
                  {isCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#24201D]" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-[#24201D]" />
                  )}
                </div>
              </div>
            </button>

            {/* Accordion Category Content */}
            {!isCollapsed && (
              <div className="border-t border-[#24201D]/15 p-3 space-y-2.5 bg-[#FAF8F5]/50">
                {mealsInCat.length === 0 ? (
                  <div className="py-5 px-3 text-center rounded-xl border border-dashed border-[#24201D]/20 bg-white/70">
                    <Utensils className="w-5 h-5 text-stone-300 mx-auto mb-1.5 stroke-[1.5]" />
                    <p className="text-[11px] text-[#8C827A] font-bold">
                      В категории «{cat.label}» пока ничего не записано
                    </p>
                    <span className="text-[10px] text-stone-400 mt-0.5 block">
                      Используйте микрофон, камеру или пресеты выше
                    </span>
                  </div>
                ) : (
                  mealsInCat.map((meal) => (
                    <div
                      key={meal.id || meal.createdAt}
                      className="p-3 bg-white border-[1.5px] border-[#24201D] rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-2"
                    >
                      {/* Top Row: Food Name, Time, Kcal Badge and Delete */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <h5 className="text-xs sm:text-sm font-black text-[#24201D] leading-snug break-words">
                            {meal.name}
                          </h5>

                          {meal.time && (
                            <div className="inline-flex items-center gap-1 text-[9px] font-bold text-[#8C827A] font-mono-num bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#24201D]/15">
                              <Clock className="w-2.5 h-2.5 text-[#8C827A]" />
                              <span>{meal.time}</span>
                            </div>
                          )}
                        </div>

                        {/* Right: Kcal Badge and Delete Action */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="px-2 py-1 rounded-lg bg-[#24201D] text-white flex items-center gap-1 shadow-2xs font-mono-num font-black text-xs">
                            <Flame className="w-3 h-3 text-[#FFE873] fill-[#FFE873]" />
                            <span>{meal.kcal}</span>
                            <span className="text-[9px] text-stone-300 font-bold">ккал</span>
                          </div>

                          {meal.id && (
                            <button
                              type="button"
                              onClick={() => handleDelete(meal.id!, meal.name)}
                              title="Удалить позицию"
                              className="w-7 h-7 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center border border-transparent hover:border-red-200 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Macronutrient Chips (Proteins, Fats, Carbs) */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#DDE8DE] text-[#2D503C] border border-[#2D503C]/20 text-[10px] font-bold font-mono-num">
                          <span className="text-[9px] font-black opacity-70">БЕЛКИ</span>
                          <span>{meal.proteinGrams}г</span>
                        </div>

                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#92400E]/20 text-[10px] font-bold font-mono-num">
                          <span className="text-[9px] font-black opacity-70">ЖИРЫ</span>
                          <span>{meal.fatGrams}г</span>
                        </div>

                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E0F2FE] text-[#0369A1] border border-[#0369A1]/20 text-[10px] font-bold font-mono-num">
                          <span className="text-[9px] font-black opacity-70">УГЛЕВОДЫ</span>
                          <span>{meal.carbsGrams}г</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
