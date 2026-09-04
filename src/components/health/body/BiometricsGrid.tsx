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
    bmr,
    tdee,
    bodyFatPercentage,
    muscleMassKg,
    targetWaterMl,
    targetDailyCalories,
    targetProteinGrams,
    waistToHeightRatio,
    waistRiskCategory,
  } = metrics;

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
            Metabolic Rate & Body Composition
          </h3>
          <span className="text-[9px] text-stone-400 font-bold block">
            Tap any metric to view clinical science & recommendations
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Waist-to-Height Ratio (WHtR) */}
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
            <span className="text-[9px] font-bold text-[#6B635B] uppercase">WHtR Ratio</span>
            <HelpCircle className="w-3 h-3 text-stone-400" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
            {waistToHeightRatio ?? '—'}
          </span>
          <span
            className={`text-[9px] font-bold ${
              waistToHeightRatio && waistToHeightRatio < 0.5 ? 'text-[#3D6B52]' : 'text-[#DC2626]'
            }`}
          >
            {waistRiskCategory || 'Set in profile'}
          </span>
        </button>

        {/* Body Fat % */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: 'Body Fat Percentage',
              value: `${bodyFatPercentage}%`,
              category:
                profile.gender === 'male'
                  ? bodyFatPercentage < 15
                    ? 'Athletic'
                    : bodyFatPercentage <= 20
                    ? 'Fitness'
                    : 'Acceptable'
                  : bodyFatPercentage < 22
                  ? 'Athletic'
                  : bodyFatPercentage <= 28
                  ? 'Fitness'
                  : 'Acceptable',
              description:
                'Estimated total adipose tissue mass relative to total body weight. Can be updated directly from smart bioimpedance scales or calculated via Deurenberg adult formula.',
              formula: 'Deurenberg: 1.20 × BMI + 0.23 × Age - 10.8 × Sex - 5.4',
              clinicalTip:
                'Optimal range for longevity: 12-18% for men, 18-24% for women. Avoid rapid crashes below 8% (men) or 14% (women) to preserve hormonal health.',
            });
          }}
          className="p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase">Body Fat %</span>
            <HelpCircle className="w-3 h-3 text-stone-400" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
            {bodyFatPercentage}%
          </span>
          <span className="text-[9px] text-stone-400">Scale or formula</span>
        </button>

        {/* Muscle Mass */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: 'Lean Muscle & Tissue Mass',
              value: `${muscleMassKg} kg`,
              category: 'Metabolic Engine',
              description:
                'Lean body mass represents all non-fat tissues: skeletal muscle, organs, bone, and intracellular water. Muscle is your primary glucose sink and metabolic engine.',
              formula: 'Total Body Weight × (1 - Body Fat% ÷ 100)',
              clinicalTip:
                'Consume at least 1.6–2.2g of protein per kg of body weight during calorie restriction to safeguard lean tissue against catabolism.',
            });
          }}
          className="p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase">Lean Mass</span>
            <HelpCircle className="w-3 h-3 text-stone-400" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
            {muscleMassKg} <span className="text-xs">kg</span>
          </span>
          <span className="text-[9px] text-stone-400">Active lean tissue</span>
        </button>

        {/* Basal BMR */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: 'Basal Metabolic Rate (BMR)',
              value: `${bmr} kcal`,
              category: 'Mifflin-St Jeor Formula',
              description:
                'The baseline energy your body expends completely at rest just to maintain vital physiological processes: breathing, heart contractions, cellular repair, and brain activity.',
              formula: 'Mifflin-St Jeor: 10 × weight(kg) + 6.25 × height(cm) - 5 × age + s',
              clinicalTip:
                'Never consume less than your BMR for extended periods. Chronic sub-BMR diets cause hormonal downregulation, thyroid slowing, and metabolic adaptation.',
            });
          }}
          className="p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase">BMR (Basal)</span>
            <HelpCircle className="w-3 h-3 text-stone-400" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
            {bmr} <span className="text-xs">kcal</span>
          </span>
          <span className="text-[9px] text-stone-400">Resting metabolism</span>
        </button>

        {/* Maintenance TDEE */}
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
            <span className="text-[9px] font-bold text-[#6B635B] uppercase">TDEE Total</span>
            <HelpCircle className="w-3 h-3 text-stone-400" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
            {tdee} <span className="text-xs">kcal</span>
          </span>
          <span className="text-[9px] text-stone-400">Maintenance energy</span>
        </button>

        {/* Target Daily Intake */}
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
            <span className="text-[9px] font-bold text-[#854D0E] uppercase">Target Kcal</span>
            <HelpCircle className="w-3 h-3 text-[#854D0E]" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#854D0E] mt-0.5 block">
            {targetDailyCalories} <span className="text-xs">kcal</span>
          </span>
          <span className="text-[9px] font-bold text-[#A16207]">
            {profile.goal === 'lose' ? 'Cut (-400)' : profile.goal === 'gain' ? 'Bulk (+350)' : 'Maintain'}
          </span>
        </button>

        {/* Daily Protein Target */}
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
            <span className="text-[9px] font-bold text-[#2D503C] uppercase">Protein Goal</span>
            <HelpCircle className="w-3 h-3 text-[#2D503C]" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#2D503C] mt-0.5 block">
            {targetProteinGrams} <span className="text-xs">g</span>
          </span>
          <span className="text-[9px] font-bold text-[#3D6B52]">Muscle synthesis</span>
        </button>

        {/* Hydration Target */}
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
            <span className="text-[9px] font-bold text-[#1E3A8A] uppercase">Water Goal</span>
            <HelpCircle className="w-3 h-3 text-[#1E3A8A]" />
          </div>
          <span className="text-lg font-black font-mono-num text-[#1E3A8A] mt-0.5 block">
            {targetWaterMl} <span className="text-xs">ml</span>
          </span>
          <span className="text-[9px] font-bold text-[#2563EB]">Intracellular water</span>
        </button>
      </div>
    </div>
  );
};
