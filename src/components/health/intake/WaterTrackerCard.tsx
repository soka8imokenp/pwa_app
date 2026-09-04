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
      {/* 1. Header with Icons, Titles and Target Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
            <Droplets className="w-5 h-5 text-[#0284C7]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                Water Hydration
              </h3>
              {isGoalReached && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#DDE8DE] text-[#2D503C] border border-[#24201D]">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Норма
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black font-mono-num text-[#24201D] leading-none">
                {currentLiters}
              </span>
              <span className="text-xs font-bold font-mono-num text-[#6B635B]">
                / {targetLiters} л
              </span>
              <span className="text-[10px] font-bold text-[#0284C7] ml-1 font-mono-num">
                ({consumedGlasses}/{targetGlasses} ст • {waterPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Quick Steppers (+250, +500, +1000, -250) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onRemoveWater}
            disabled={todaysWaterTotalMl <= 0}
            title="Удалить последний стакан"
            className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-200 disabled:opacity-25 disabled:cursor-not-allowed border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => onAddWater(250)}
            title="Добавить 250 мл (1 стакан)"
            className="px-2 py-1 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white border border-[#24201D] text-[11px] font-black shadow-2xs active:scale-95 cursor-pointer font-display flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            250
          </button>

          <button
            type="button"
            onClick={() => onAddWater(500)}
            title="Добавить 500 мл (бутылка 0.5л)"
            className="px-2 py-1 rounded-lg bg-white hover:bg-sky-50 text-[#0284C7] border border-[#24201D] text-[11px] font-black shadow-2xs active:scale-95 cursor-pointer font-display"
          >
            +500
          </button>

          <button
            type="button"
            onClick={() => onAddWater(1000)}
            title="Добавить 1000 мл (1 литр)"
            className="px-2 py-1 rounded-lg bg-white hover:bg-sky-50 text-[#0284C7] border border-[#24201D] text-[11px] font-black shadow-2xs active:scale-95 cursor-pointer font-display hidden sm:block"
          >
            +1л
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

      {/* 3. Milestone Guide: 4 ст = 1L • 8 ст = 2L • 12 ст = 3L • 16 ст = 4L */}
      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[#6B635B] bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#24201D]/20">
        <span className={consumedGlasses >= 4 ? 'text-[#0284C7] font-black' : ''}>4 ст = 1.0 л</span>
        <span>•</span>
        <span className={consumedGlasses >= 8 ? 'text-[#0284C7] font-black' : ''}>8 ст = 2.0 л</span>
        <span>•</span>
        <span className={consumedGlasses >= 12 ? 'text-[#0284C7] font-black' : ''}>12 ст = 3.0 л</span>
        <span>•</span>
        <span className={consumedGlasses >= 16 ? 'text-[#0284C7] font-black' : ''}>16 ст = 4.0 л</span>
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
              title={`Стакан #${glassNum} (${glassNum * GLASS_SIZE_ML} мл / ${(glassNum * 0.25).toFixed(2)} л)`}
              className={`relative h-12 rounded-xl border-[1.5px] border-[#24201D] flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 select-none ${
                isFilled
                  ? 'bg-gradient-to-b from-[#38BDF8] to-[#0284C7] text-white font-black'
                  : 'bg-[#FAF8F5] hover:bg-[#E0F2FE]/50 text-[#8C827A]'
              }`}
            >
              {/* Daily Target Badge on exact target glass */}
              {isTarget && (
                <div
                  title={`Цель: ${glassNum} стаканов (${targetLiters} л)`}
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

      {/* 5. Mobile +1L Quick Button Footer */}
      <div className="flex items-center justify-between sm:hidden pt-0.5">
        <span className="text-[10px] text-[#6B635B] font-medium">
          💡 Нажмите на стакан для быстрого заполнения
        </span>
        <button
          type="button"
          onClick={() => onAddWater(1000)}
          className="px-2 py-0.5 rounded-md bg-[#E0F2FE] hover:bg-sky-200 text-[#0284C7] border border-[#24201D] text-[10px] font-black font-display cursor-pointer"
        >
          +1 литр
        </button>
      </div>
    </div>
  );
};
