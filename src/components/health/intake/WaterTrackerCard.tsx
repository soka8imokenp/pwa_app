import React from 'react';
import { Droplets, Minus, Plus, Target, CheckCircle2 } from 'lucide-react';

interface WaterTrackerCardProps {
  todaysWaterTotalMl: number;
  targetWaterMl: number;
  onAddWater: (amountMl?: number) => Promise<void>;
  onRemoveWater: () => Promise<void>;
}

const TOTAL_GRID_GLASSES = 16; // 16 glasses * 250 ml = 4000 ml (4.0 L)
const GLASS_SIZE_ML = 250;

export const WaterTrackerCard: React.FC<WaterTrackerCardProps> = ({
  todaysWaterTotalMl,
  targetWaterMl,
  onAddWater,
  onRemoveWater,
}) => {
  const targetGlasses = Math.max(1, Math.round(targetWaterMl / GLASS_SIZE_ML));
  const consumedGlasses = Math.round(todaysWaterTotalMl / GLASS_SIZE_ML);
  const waterPercent = Math.min(100, Math.round((todaysWaterTotalMl / targetWaterMl) * 100));
  const isGoalReached = todaysWaterTotalMl >= targetWaterMl && targetWaterMl > 0;

  const currentLiters = (todaysWaterTotalMl / 1000).toFixed(2);
  const targetLiters = (targetWaterMl / 1000).toFixed(2);

  // Handle glass tap: fill up to this glass, or remove last glass
  const handleGlassClick = (index: number) => {
    const glassNumber = index + 1;
    if (glassNumber > consumedGlasses) {
      const mlToAdd = (glassNumber - consumedGlasses) * GLASS_SIZE_ML;
      onAddWater(mlToAdd);
    } else if (glassNumber === consumedGlasses) {
      onRemoveWater();
    }
  };

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3.5">
      {/* 1. Header with Icons, Titles, Liters Display and Steppers */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
            <Droplets className="w-5 h-5 text-[#0284C7]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                Water Hydration
              </h3>
              {isGoalReached && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#DDE8DE] text-[#2D503C] border border-[#24201D]">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Goal Reached
                </span>
              )}
            </div>

            {/* Adapted Clean Liter Display in English */}
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black font-mono-num text-[#24201D] tracking-tight leading-none">
                {currentLiters}
              </span>
              <span className="text-xs font-bold font-mono-num text-[#8C827A]">
                / {targetLiters} L
              </span>
            </div>
          </div>
        </div>

        {/* Tactile Steppers: Undo (-) and +250 ml */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRemoveWater}
            disabled={todaysWaterTotalMl <= 0}
            title="Remove 250 ml"
            className="w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 disabled:opacity-25 disabled:cursor-not-allowed border-[1.5px] border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => onAddWater(250)}
            title="Add 250 ml (1 glass)"
            className="h-8 px-3 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white border-[1.5px] border-[#24201D] text-xs font-black shadow-2xs active:scale-95 cursor-pointer font-display flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            +250 ml
          </button>
        </div>
      </div>

      {/* 2. Sleek Target Progress Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full bg-[#FAF8F5] border border-[#24201D] rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-[#38BDF8] to-[#0284C7] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, waterPercent))}%` }}
          />
        </div>
      </div>

      {/* 3. Milestone Guide: 4 gl = 1.0L • 8 gl = 2.0L • 12 gl = 3.0L • 16 gl = 4.0L */}
      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#6B635B] bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#24201D]/20">
        <span className={consumedGlasses >= 4 ? 'text-[#0284C7] font-black' : ''}>4 gl = 1.0L</span>
        <span>•</span>
        <span className={consumedGlasses >= 8 ? 'text-[#0284C7] font-black' : ''}>8 gl = 2.0L</span>
        <span>•</span>
        <span className={consumedGlasses >= 12 ? 'text-[#0284C7] font-black' : ''}>12 gl = 3.0L</span>
        <span>•</span>
        <span className={consumedGlasses >= 16 ? 'text-[#0284C7] font-black' : ''}>16 gl = 4.0L</span>
      </div>

      {/* 4. Symmetrical 16-Glass Matrix: 2 even rows of 8 glasses */}
      <div className="grid grid-cols-8 gap-1.5 sm:gap-2 pt-0.5">
        {Array.from({ length: TOTAL_GRID_GLASSES }).map((_, i) => {
          const glassNum = i + 1;
          const isFilled = i < consumedGlasses;
          const isTarget = glassNum === targetGlasses;
          const isMilestone = glassNum % 4 === 0;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleGlassClick(i)}
              title={`Glass #${glassNum} (${glassNum * GLASS_SIZE_ML} ml / ${(glassNum * 0.25).toFixed(2)} L)`}
              className={`relative h-12 rounded-xl border-[1.5px] border-[#24201D] flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 select-none ${
                isFilled
                  ? 'bg-gradient-to-b from-[#38BDF8] to-[#0284C7] text-white font-black'
                  : 'bg-[#FAF8F5] hover:bg-[#E0F2FE]/50 text-[#8C827A]'
              }`}
            >
              {/* Daily Target Badge on exact target glass */}
              {isTarget && (
                <div
                  title={`Goal: ${glassNum} glasses (${targetLiters} L)`}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FFE873] border border-[#24201D] flex items-center justify-center shadow-2xs"
                >
                  <Target className="w-2.5 h-2.5 text-[#24201D] stroke-[2.5]" />
                </div>
              )}

              {/* Water Droplet Icon */}
              <Droplets
                className={`w-3.5 h-3.5 transition-transform ${
                  isFilled ? 'fill-white stroke-white scale-110' : 'stroke-[#8C827A]'
                }`}
              />

              {/* Glass Number or Milestone Liters */}
              <span
                className={`text-[9px] font-mono-num leading-none mt-0.5 font-bold ${
                  isFilled ? 'text-white' : 'text-[#24201D]'
                }`}
              >
                {isMilestone ? `${glassNum * 0.25}L` : glassNum}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
