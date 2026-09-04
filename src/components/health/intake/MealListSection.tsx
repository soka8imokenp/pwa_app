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
  Zap,
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
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  { type: 'breakfast', label: 'Breakfast', icon: Sun, accentColor: '#FEF08A' },
  { type: 'lunch', label: 'Lunch', icon: Flame, accentColor: '#FECDD3' },
  { type: 'dinner', label: 'Dinner', icon: Moon, accentColor: '#E9D5FF' },
  { type: 'snack', label: 'Snacks & Drinks', icon: Coffee, accentColor: '#DCFCE7' },
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

  const handleDelete = async (id: number) => {
    playClickSound();
    if (confirm('Delete this meal entry?')) {
      await onDeleteMeal(id);
    }
  };

  return (
    <div className="space-y-3">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const mealsInCat = todaysMeals.filter((m) => m.mealType === cat.type);
        const catKcal = mealsInCat.reduce((acc, m) => acc + (m.kcal || 0), 0);
        const isCollapsed = collapsedCategories[cat.type];

        return (
          <div
            key={cat.type}
            className="bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] overflow-hidden"
          >
            {/* Accordion Header */}
            <button
              type="button"
              onClick={() => toggleCategory(cat.type)}
              className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-xl border border-[#24201D] flex items-center justify-center shadow-2xs"
                  style={{ backgroundColor: cat.accentColor }}
                >
                  <Icon className="w-4 h-4 text-[#24201D]" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                    {cat.label}
                  </h4>
                  <span className="text-[10px] font-bold text-[#6B635B] font-mono-num">
                    {mealsInCat.length} {mealsInCat.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black font-mono-num text-[#24201D] px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#24201D]/20 shadow-2xs">
                  {catKcal} kcal
                </span>
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-[#6B635B]" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-[#6B635B]" />
                )}
              </div>
            </button>

            {/* Accordion Content */}
            {!isCollapsed && (
              <div className="border-t border-[#24201D]/15 p-3 space-y-2 bg-[#FAF8F5]/60">
                {mealsInCat.length === 0 ? (
                  <p className="text-[11px] text-[#6B635B] font-bold text-center py-2 italic">
                    No {cat.label.toLowerCase()} logged yet
                  </p>
                ) : (
                  mealsInCat.map((meal) => (
                    <div
                      key={meal.id || meal.createdAt}
                      className="p-2.5 bg-white border border-[#24201D]/20 rounded-xl flex items-center justify-between hover:shadow-2xs transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#24201D]">
                            {meal.name}
                          </span>
                          {meal.aiEstimated && (
                            <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5 font-display">
                              <Zap className="w-2.5 h-2.5" /> AI
                            </span>
                          )}
                          {meal.time && (
                            <span className="text-[9px] font-bold text-stone-400 flex items-center gap-0.5 font-mono-num">
                              <Clock className="w-2.5 h-2.5" />
                              {meal.time}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#6B635B] font-mono-num">
                          <span className="font-bold text-[#24201D]">{meal.kcal} kcal</span>
                          <span>•</span>
                          <span>P: {meal.proteinGrams}g</span>
                          <span>•</span>
                          <span>C: {meal.carbsGrams}g</span>
                          <span>•</span>
                          <span>F: {meal.fatGrams}g</span>
                        </div>
                      </div>

                      {meal.id && (
                        <button
                          type="button"
                          onClick={() => handleDelete(meal.id!)}
                          title="Delete meal"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
