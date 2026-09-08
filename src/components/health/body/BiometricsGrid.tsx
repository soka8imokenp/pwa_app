import React from 'react';
import { HelpCircle } from 'lucide-react';
import { playClickSound } from '../../../lib/sound';
import type { HealthProfile, CalculatedHealthMetrics } from '../../../types/health';
import type { MetricDetailModalInfo } from './MetricDetailModal';

interface BiometricsGridProps {
  profile: HealthProfile;
  metrics: CalculatedHealthMetrics;
  onSelectMetric: (info: MetricDetailModalInfo) => void;
}

export const BiometricsGrid: React.FC<BiometricsGridProps> = ({
  profile,
  metrics,
  onSelectMetric,
}) => {
  const {
    tdee,
    targetWaterMl,
    targetDailyCalories,
    targetProteinGrams,
    waistToHeightRatio,
    waistRiskCategory,
  } = metrics;

  const deficitSurplusKcal =
    profile.goal === 'lose' ? -400 : profile.goal === 'gain' ? 350 : 0;
  const energyBalanceValue =
    deficitSurplusKcal < 0
      ? `${deficitSurplusKcal} kcal`
      : deficitSurplusKcal > 0
      ? `+${deficitSurplusKcal} kcal`
      : '±0 kcal';
  const energyBalanceLabel =
    profile.goal === 'lose'
      ? 'Caloric Deficit'
      : profile.goal === 'gain'
      ? 'Caloric Surplus'
      : 'Energy Balance';

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 font-body">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
            Daily Energy & Nutrition Targets
          </h3>
          <span className="text-[9px] text-stone-400 font-bold block mt-0.5">
            Prescribed targets based on your metabolic expenditure & goal
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* 1. Waist-to-Height Ratio (WHtR) */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: 'Waist-to-Height Ratio (WHtR)',
              value: waistToHeightRatio ? String(waistToHeightRatio) : 'N/A',
              category: waistRiskCategory || 'Enter waist in Profile',
              description:
                'The Waist-to-Height Ratio (WHtR) is recognized by the WHO and UK NICE as the most accurate clinical metric for assessing central visceral fat and cardiovascular health, outperforming BMI alone.',
              formula: 'Waist Circumference (cm) ÷ Height (cm)',
              clinicalTip:
                'Keep your waist circumference under half your height (WHtR < 0.50) to minimize metabolic syndrome and visceral adiposity risk.',
            });
          }}
          className="p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase font-display">WHtR Ratio</span>
            <HelpCircle className="w-3 h-3 text-stone-400" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
            {waistToHeightRatio ?? '—'}
          </span>
          <span
            className={`text-[9px] font-bold block truncate ${
              waistToHeightRatio && waistToHeightRatio < 0.5 ? 'text-[#3D6B52]' : 'text-[#DC2626]'
            }`}
          >
            {waistRiskCategory || 'Set in profile'}
          </span>
        </button>

        {/* 2. Total Daily Energy Expenditure (TDEE) */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: 'Total Daily Energy Expenditure (TDEE)',
              value: `${tdee} kcal`,
              category: `${profile.activityLevel.replace('_', ' ').toUpperCase()} Activity`,
              description:
                'The total energy you burn per 24-hour cycle, combining BMR + Non-Exercise Activity (NEAT) + Exercise (EAT) + Thermic Effect of Food (TEF).',
              formula: 'BMR × Physical Activity Factor (1.2 to 1.725)',
              clinicalTip:
                'To maintain steady weight, your average caloric intake should match this TDEE number. For sustainable fat loss, stay 300–500 kcal below TDEE.',
            });
          }}
          className="p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase font-display">TDEE Total</span>
            <HelpCircle className="w-3 h-3 text-stone-400" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
            {profile.currentWeight > 0 ? (
              <>
                {tdee} <span className="text-xs">kcal</span>
              </>
            ) : (
              '—'
            )}
          </span>
          <span className="text-[9px] text-stone-400 font-medium block truncate">Maintenance energy</span>
        </button>

        {/* 3. Target Daily Caloric Intake */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: 'Prescribed Target Energy Intake',
              value: `${targetDailyCalories} kcal`,
              category: `Goal: ${profile.goal.toUpperCase()}`,
              description:
                'Your calorie prescription tailored to your specific goal: calculated with an evidence-based deficit (fat loss), surplus (hypertrophy), or exact maintenance.',
              formula:
                profile.goal === 'lose'
                  ? 'TDEE - 400 kcal (Deficit)'
                  : profile.goal === 'gain'
                  ? 'TDEE + 350 kcal (Surplus)'
                  : 'TDEE (Neutral Energy Balance)',
              clinicalTip:
                'Adherence beats perfection: eating within ±100 kcal of this target 80% of the time guarantees body recomposition results.',
            });
          }}
          className="p-2.5 bg-[#FBECCF] hover:bg-[#F7E3DC] border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#854D0E] uppercase font-display">Target Intake</span>
            <HelpCircle className="w-3 h-3 text-[#854D0E]" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#854D0E] mt-0.5 block">
            {profile.currentWeight > 0 ? (
              <>
                {targetDailyCalories} <span className="text-xs">kcal</span>
              </>
            ) : (
              '—'
            )}
          </span>
          <span className="text-[9px] font-bold text-[#A16207] block truncate">
            {profile.goal === 'lose' ? 'Cut (-400)' : profile.goal === 'gain' ? 'Bulk (+350)' : 'Maintain (0)'}
          </span>
        </button>

        {/* 4. Energy Balance Delta */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: 'Prescribed Energy Balance Delta',
              value: energyBalanceValue,
              category: energyBalanceLabel,
              description:
                profile.goal === 'lose'
                  ? 'A moderate 400 kcal daily caloric deficit creates a negative energy balance of ~2,800 kcal per week, translating into approximately 0.4 kg of sustainable fat loss per week without provoking metabolic adaptation.'
                  : profile.goal === 'gain'
                  ? 'A controlled 350 kcal daily surplus provides sufficient energy to drive myofibrillar protein synthesis and muscle hypertrophy while minimizing unwanted adipose tissue gain.'
                  : 'A neutral energy balance maintains your current body weight while supporting physical performance and metabolic homeostasis.',
              formula: 'Target Calories - Maintenance TDEE',
              clinicalTip:
                'Consistent energy deficits/surpluses require accurate food logging. Track intake for 2 weeks to calibrate against true body weight change.',
            });
          }}
          className="p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase font-display">Energy Delta</span>
            <HelpCircle className="w-3 h-3 text-stone-400" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
            {profile.currentWeight > 0 ? energyBalanceValue : '—'}
          </span>
          <span
            className={`text-[9px] font-bold block truncate ${
              profile.goal === 'lose'
                ? 'text-[#2563EB]'
                : profile.goal === 'gain'
                ? 'text-[#D97706]'
                : 'text-[#059669]'
            }`}
          >
            {energyBalanceLabel}
          </span>
        </button>

        {/* 5. Daily Protein Target */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: 'Prescribed Daily Protein Target',
              value: `${targetProteinGrams} g`,
              category: `${profile.goal === 'maintain' ? '1.5g' : '1.8g'} per kg bodyweight`,
              description:
                'Essential amino acid intake for myofibrillar protein synthesis (MPS), satiety modulation, and preserving lean muscle tissue during a caloric deficit.',
              formula: `${profile.goal === 'maintain' ? '1.5' : '1.8'}g × Body Weight (${profile.currentWeight}kg)`,
              clinicalTip:
                'Distribute protein evenly across 3–4 meals (approx. 25–40g per meal) to trigger the leucine threshold for maximum muscle repair.',
            });
          }}
          className="p-2.5 bg-[#DDE8DE] hover:bg-[#C9DCCB] border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#2D503C] uppercase font-display">Protein Goal</span>
            <HelpCircle className="w-3 h-3 text-[#2D503C]" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#2D503C] mt-0.5 block">
            {profile.currentWeight > 0 ? (
              <>
                {targetProteinGrams} <span className="text-xs">g</span>
              </>
            ) : (
              '—'
            )}
          </span>
          <span className="text-[9px] font-bold text-[#3D6B52] block truncate">Muscle synthesis</span>
        </button>

        {/* 6. Hydration Target */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: 'Prescribed Daily Hydration',
              value: `${targetWaterMl} ml`,
              category: '35 ml per kg bodyweight',
              description:
                'Baseline water volume required for cellular hydration, joint lubrication, cognitive performance, and metabolic toxin filtration by the kidneys.',
              formula: `35 ml × Body Weight (${profile.currentWeight}kg)`,
              clinicalTip:
                'Add 400–600 ml for every hour of moderate-to-high intensity athletic exercise or hot environmental exposure.',
            });
          }}
          className="p-2.5 bg-[#DEE8EF] hover:bg-[#CADBE6] border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#1E3A8A] uppercase font-display">Water Goal</span>
            <HelpCircle className="w-3 h-3 text-[#1E3A8A]" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#2A495E] mt-0.5 block">
            {profile.currentWeight > 0 ? (
              <>
                {targetWaterMl} <span className="text-xs">ml</span>
              </>
            ) : (
              '—'
            )}
          </span>
          <span className="text-[9px] font-bold text-[#2563EB] block truncate">Intracellular water</span>
        </button>
      </div>
    </div>
  );
};
