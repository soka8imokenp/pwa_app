import React from 'react';
import { Droplets, Minus } from 'lucide-react';

interface WaterTrackerCardProps {
  todaysWaterTotalMl: number;
  targetWaterMl: number;
  onAddWater: (amountMl?: number) => Promise<void>;
  onRemoveWater: () => Promise<void>;
}

export const WaterTrackerCard: React.FC<WaterTrackerCardProps> = ({
  todaysWaterTotalMl,
  targetWaterMl,
  onAddWater,
  onRemoveWater,
}) => {
  const waterPercent = Math.min(100, Math.round((todaysWaterTotalMl / targetWaterMl) * 100));
  const waterTargetGlasses = Math.max(1, Math.round(targetWaterMl / 250));
  const waterConsumedGlasses = Math.round(todaysWaterTotalMl / 250);

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] border border-[#24201D] flex items-center justify-center shadow-2xs">
            <Droplets className="w-4 h-4 text-[#0369A1]" />
          </div>
          <div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
              Water Hydration
            </h3>
            <span className="text-[10px] font-bold text-[#6B635B] font-mono-num">
              {todaysWaterTotalMl} / {targetWaterMl} ml ({waterPercent}%)
            </span>
          </div>
        </div>

        {/* Water Steppers */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRemoveWater}
            disabled={todaysWaterTotalMl <= 0}
            title="Remove last water"
            className="w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button
            type="button"
            onClick={() => onAddWater(250)}
            className="px-3 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white border border-[#24201D] text-xs font-black shadow-2xs active:scale-95 cursor-pointer font-display"
          >
            +250 ml
          </button>

          <button
            type="button"
            onClick={() => onAddWater(500)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-[#0284C7] border border-[#24201D] text-xs font-black shadow-2xs active:scale-95 cursor-pointer font-display"
          >
            +500 ml
          </button>
        </div>
      </div>

      {/* Glasses Visual Matrix */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {Array.from({ length: Math.max(8, waterTargetGlasses) }).map((_, i) => {
          const isFilled = i < waterConsumedGlasses;
          return (
            <button
              key={i}
              type="button"
              onClick={isFilled && i === waterConsumedGlasses - 1 ? onRemoveWater : () => onAddWater(250)}
              className={`w-8 h-10 rounded-xl border-[1.5px] border-[#24201D] flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 ${
                isFilled
                  ? 'bg-[#38BDF8] text-white font-black'
                  : 'bg-[#FAF8F5] text-stone-300 hover:border-[#24201D]'
              }`}
            >
              <Droplets className={`w-3.5 h-3.5 ${isFilled ? 'fill-white' : ''}`} />
              <span className="text-[8px] font-mono-num leading-none mt-0.5">
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
