import React from 'react';
import { Utensils, Flame } from 'lucide-react';

interface MacroProgressCardsProps {
  todaysTotalKcal: number;
  effectiveTarget: number;
  remainingKcal: number;
  kcalPercent: number;
  todaysActiveCaloriesBurned: number;
  todaysProteinGrams: number;
  targetProteinGrams: number;
  proteinPercent: number;
  proteinRemaining: number;
  todaysCarbsGrams: number;
  targetCarbsGrams: number;
  carbsPercent: number;
  carbsRemaining: number;
  todaysFatGrams: number;
  targetFatGrams: number;
  fatPercent: number;
  fatRemaining: number;
}

export const MacroProgressCards: React.FC<MacroProgressCardsProps> = ({
  todaysTotalKcal,
  effectiveTarget,
  remainingKcal,
  kcalPercent,
  todaysActiveCaloriesBurned,
  todaysProteinGrams,
  targetProteinGrams,
  proteinPercent,
  proteinRemaining,
  todaysCarbsGrams,
  targetCarbsGrams,
  carbsPercent,
  carbsRemaining,
  todaysFatGrams,
  targetFatGrams,
  fatPercent,
  fatRemaining,
}) => {
  return (
    <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-4">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-[#24201D]/15 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F7E3DC] border border-[#24201D] flex items-center justify-center shadow-2xs">
            <Utensils className="w-4 h-4 text-[#C25E40]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
              Daily Nutrition Target
            </span>
            <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
              Calories & Macronutrients
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {todaysActiveCaloriesBurned > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FEF3C7] border border-[#F59E0B] text-[10px] font-black text-[#B45309] font-mono-num shadow-2xs">
              <Flame className="w-3 h-3 text-[#D97706]" />
              <span>+{todaysActiveCaloriesBurned} burned</span>
            </div>
          )}
        </div>
      </div>

      {/* Big Calorie Numbers & Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-[#6B635B] font-display">
              Total Intake
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-4xl font-black font-mono-num text-[#24201D]">
                {todaysTotalKcal}
              </span>
              <span className="text-xs font-bold text-[#6B635B] uppercase font-display">
                / {effectiveTarget} kcal
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-[#6B635B] font-display block">
              Remaining Budget
            </span>
            <span
              className={`text-xl font-black font-mono-num block ${
                remainingKcal >= 0 ? 'text-[#3D6B52]' : 'text-[#DC2626]'
              }`}
            >
              {remainingKcal >= 0 ? `${remainingKcal} kcal` : `${Math.abs(remainingKcal)} over`}
            </span>
          </div>
        </div>

        <div className="w-full h-3.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-full overflow-hidden p-0.5 shadow-2xs">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              kcalPercent > 105 ? 'bg-[#DC2626]' : 'bg-[#3D6B52]'
            }`}
            style={{ width: `${Math.min(100, kcalPercent)}%` }}
          />
        </div>
      </div>

      {/* 3 Macro Cards: Protein, Carbs, Fat */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {/* Protein */}
        <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[9px] font-black uppercase text-[#6B635B] font-display">
            <span>Protein</span>
            <span className="font-mono-num">{proteinPercent}%</span>
          </div>
          <div className="text-xs font-black font-mono-num text-[#24201D]">
            {todaysProteinGrams} <span className="text-[10px] text-[#6B635B]">/ {targetProteinGrams}g</span>
          </div>
          <div className="w-full bg-white border border-[#24201D]/30 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${proteinPercent}%` }} />
          </div>
          <span className="text-[8px] font-bold text-stone-400 block font-mono-num">
            {proteinRemaining > 0 ? `${proteinRemaining}g left` : 'Goal reached'}
          </span>
        </div>

        {/* Carbs */}
        <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[9px] font-black uppercase text-[#6B635B] font-display">
            <span>Carbs</span>
            <span className="font-mono-num">{carbsPercent}%</span>
          </div>
          <div className="text-xs font-black font-mono-num text-[#24201D]">
            {todaysCarbsGrams} <span className="text-[10px] text-[#6B635B]">/ {targetCarbsGrams}g</span>
          </div>
          <div className="w-full bg-white border border-[#24201D]/30 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${carbsPercent}%` }} />
          </div>
          <span className="text-[8px] font-bold text-stone-400 block font-mono-num">
            {carbsRemaining > 0 ? `${carbsRemaining}g left` : 'Goal reached'}
          </span>
        </div>

        {/* Fat */}
        <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[9px] font-black uppercase text-[#6B635B] font-display">
            <span>Fat</span>
            <span className="font-mono-num">{fatPercent}%</span>
          </div>
          <div className="text-xs font-black font-mono-num text-[#24201D]">
            {todaysFatGrams} <span className="text-[10px] text-[#6B635B]">/ {targetFatGrams}g</span>
          </div>
          <div className="w-full bg-white border border-[#24201D]/30 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${fatPercent}%` }} />
          </div>
          <span className="text-[8px] font-bold text-stone-400 block font-mono-num">
            {fatRemaining > 0 ? `${fatRemaining}g left` : 'Goal reached'}
          </span>
        </div>
      </div>
    </div>
  );
};
