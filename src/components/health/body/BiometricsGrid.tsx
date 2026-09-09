import React from 'react';
import {
  Activity,
  Flame,
  Target,
  TrendingDown,
  TrendingUp,
  Dumbbell,
  Droplets,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { playClickSound } from '../../../lib/sound';
import type { HealthProfile, CalculatedHealthMetrics } from '../../../types/health';
import type { MetricDetailModalInfo } from './MetricDetailModal';
import { useTranslation } from '../../../i18n/LanguageContext';

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
  const { t } = useTranslation();
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
      ? t('biometrics.caloricDeficit')
      : profile.goal === 'gain'
      ? t('biometrics.caloricSurplus')
      : t('biometrics.caloricBalance');

  const isWhtrOptimal = waistToHeightRatio ? waistToHeightRatio < 0.5 : false;

  return (
    <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-3xl shadow-[3px_3px_0px_#24201D] space-y-3.5 font-body select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#24201D]/15">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center text-[#2D503C] shadow-2xs shrink-0">
            <Activity className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#6B635B] font-display block leading-none">
              {t('biometrics.telemetryMatrix')}
            </span>
            <h3 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none truncate">
              {t('biometrics.dailyEnergyTargets')}
            </h3>
          </div>
        </div>

        <div className="px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#24201D]/20 text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display shadow-2xs shrink-0">
          WHO / NICE
        </div>
      </div>

      {/* 6 High-Contrast Bento Telemetry Pods */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* 1. Waist-to-Height Ratio (WHtR) */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: t('biometrics.whtrTitle'),
              value: waistToHeightRatio ? String(waistToHeightRatio) : 'N/A',
              category: waistRiskCategory || 'Enter waist in Profile',
              statusType: isWhtrOptimal ? 'optimal' : 'alert',
              statusLabel: isWhtrOptimal ? t('biometrics.whtrOptimal') : waistRiskCategory || t('biometrics.whtrAlert'),
              normRange: '< 0.50 Ratio',
              numericValue: waistToHeightRatio,
              metricId: 'whtr',
              description:
                'The Waist-to-Height Ratio (WHtR) is recognized by the WHO and UK NICE as the most accurate clinical metric for assessing central visceral fat and cardiovascular health, outperforming BMI alone.',
              formula: 'Waist Circumference (cm) ÷ Height (cm)',
              clinicalTip:
                'Keep your waist circumference under half your height (WHtR < 0.50) to minimize metabolic syndrome and visceral adiposity risk.',
            });
          }}
          className="p-3 bg-[#F0FDF4] hover:bg-[#DCFCE7] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] text-left cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#24201D] group flex flex-col justify-between space-y-2"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-white border border-[#24201D]/20 flex items-center justify-center text-[#16A34A] shrink-0 shadow-2xs">
                {isWhtrOptimal ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[10px] font-black text-[#15803D] uppercase tracking-wider font-display truncate">
                WHtR Ratio
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#15803D]/60 group-hover:text-[#15803D] transition-colors shrink-0" />
          </div>

          <div>
            <span className="text-lg sm:text-xl font-black font-mono-num text-[#24201D] leading-none block">
              {waistToHeightRatio ?? '—'}
            </span>
          </div>

          <div className="pt-1 border-t border-[#15803D]/20 flex items-center justify-between text-[9px] font-bold">
            <span className={isWhtrOptimal ? 'text-[#15803D]' : 'text-[#DC2626]'}>
              {isWhtrOptimal ? '● Safe (< 0.50)' : waistRiskCategory || 'Set in profile'}
            </span>
          </div>
        </button>

        {/* 2. Total Daily Energy Expenditure (TDEE) */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: t('biometrics.tdeeTitle'),
              value: `${tdee} kcal`,
              category: `${profile.activityLevel.replace('_', ' ').toUpperCase()} Activity`,
              statusType: 'optimal',
              statusLabel: t('biometrics.tdeeDesc'),
              normRange: `~${tdee} kcal/day`,
              numericValue: tdee,
              metricId: 'bmr',
              description:
                'The total energy you burn per 24-hour cycle, combining BMR + Non-Exercise Activity (NEAT) + Exercise (EAT) + Thermic Effect of Food (TEF).',
              formula: 'BMR × Physical Activity Factor (1.2 to 1.725)',
              clinicalTip:
                'To maintain steady weight, your average caloric intake should match this TDEE number. For sustainable fat loss, stay 300–500 kcal below TDEE.',
            });
          }}
          className="p-3 bg-[#FFFBEB] hover:bg-[#FEF3C7] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] text-left cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#24201D] group flex flex-col justify-between space-y-2"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-white border border-[#24201D]/20 flex items-center justify-center text-[#D97706] shrink-0 shadow-2xs">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-[#B45309] uppercase tracking-wider font-display truncate">
                {t('biometrics.tdeeTitle')}
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#B45309]/60 group-hover:text-[#B45309] transition-colors shrink-0" />
          </div>

          <div>
            <span className="text-lg sm:text-xl font-black font-mono-num text-[#24201D] leading-none block">
              {profile.currentWeight > 0 ? (
                <>
                  {tdee} <span className="text-[10px] font-bold text-[#6B635B] font-display uppercase">kcal</span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>

          <div className="pt-1 border-t border-[#B45309]/20 flex items-center justify-between text-[9px] font-bold text-[#92400E]">
            <span>{t('biometrics.tdeeDesc')}</span>
          </div>
        </button>

        {/* 3. Target Daily Caloric Intake */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: t('biometrics.calorieTargetTitle'),
              value: `${targetDailyCalories} kcal`,
              category: `Goal: ${profile.goal.toUpperCase()}`,
              statusType: 'optimal',
              statusLabel: profile.goal === 'lose' ? 'Cut (-400)' : profile.goal === 'gain' ? 'Bulk (+350)' : 'Maintenance',
              normRange: `${targetDailyCalories} kcal/day`,
              numericValue: targetDailyCalories,
              metricId: 'bmr',
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
          className="p-3 bg-[#FBECCF] hover:bg-[#F7E3DC] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] text-left cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#24201D] group flex flex-col justify-between space-y-2"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-white border border-[#24201D]/20 flex items-center justify-center text-[#854D0E] shrink-0 shadow-2xs">
                <Target className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-[#854D0E] uppercase tracking-wider font-display truncate">
                {t('biometrics.calorieTargetTitle')}
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#854D0E]/60 group-hover:text-[#854D0E] transition-colors shrink-0" />
          </div>

          <div>
            <span className="text-lg sm:text-xl font-black font-mono-num text-[#854D0E] leading-none block">
              {profile.currentWeight > 0 ? (
                <>
                  {targetDailyCalories} <span className="text-[10px] font-bold text-[#854D0E]/80 font-display uppercase">kcal</span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>

          <div className="pt-1 border-t border-[#854D0E]/20 flex items-center justify-between text-[9px] font-bold text-[#854D0E]">
            <span>{profile.goal === 'lose' ? 'Cut (-400)' : profile.goal === 'gain' ? 'Bulk (+350)' : 'Maintain (0)'}</span>
          </div>
        </button>

        {/* 4. Energy Balance Delta */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: t('biometrics.energyBalanceTitle'),
              value: energyBalanceValue,
              category: energyBalanceLabel,
              statusType: 'optimal',
              statusLabel: energyBalanceLabel,
              normRange: energyBalanceValue,
              numericValue: deficitSurplusKcal,
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
          className={`p-3 border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] text-left cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#24201D] group flex flex-col justify-between space-y-2 ${
            profile.goal === 'lose' ? 'bg-[#EFF6FF] hover:bg-[#DBEAFE]' : 'bg-[#FAF5FF] hover:bg-[#F3E8FF]'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-white border border-[#24201D]/20 flex items-center justify-center text-[#2563EB] shrink-0 shadow-2xs">
                {deficitSurplusKcal < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 text-[#2563EB]" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 text-[#7C3AED]" />
                )}
              </div>
              <span className="text-[10px] font-black text-[#1D4ED8] uppercase tracking-wider font-display truncate">
                {t('biometrics.energyBalanceTitle')}
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#1D4ED8]/60 group-hover:text-[#1D4ED8] transition-colors shrink-0" />
          </div>

          <div>
            <span className="text-lg sm:text-xl font-black font-mono-num text-[#24201D] leading-none block">
              {profile.currentWeight > 0 ? energyBalanceValue : '—'}
            </span>
          </div>

          <div className="pt-1 border-t border-[#1D4ED8]/20 flex items-center justify-between text-[9px] font-bold text-[#1E40AF]">
            <span>{energyBalanceLabel}</span>
          </div>
        </button>

        {/* 5. Daily Protein Target */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: t('biometrics.proteinTargetTitle'),
              value: `${targetProteinGrams} g`,
              category: `${profile.goal === 'maintain' ? '1.5g' : '1.8g'} per kg bodyweight`,
              statusType: 'optimal',
              statusLabel: t('biometrics.proteinTargetDesc'),
              normRange: `≥ ${targetProteinGrams} g`,
              numericValue: targetProteinGrams,
              metricId: 'protein',
              description:
                'Essential amino acid intake for myofibrillar protein synthesis (MPS), satiety modulation, and preserving lean muscle tissue during a caloric deficit.',
              formula: `${profile.goal === 'maintain' ? '1.5' : '1.8'}g × Body Weight (${profile.currentWeight}kg)`,
              clinicalTip:
                'Distribute protein evenly across 3–4 meals (approx. 25–40g per meal) to trigger the leucine threshold for maximum muscle repair.',
            });
          }}
          className="p-3 bg-[#F3E8FF] hover:bg-[#E9D5FF] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] text-left cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#24201D] group flex flex-col justify-between space-y-2"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-white border border-[#24201D]/20 flex items-center justify-center text-[#7C3AED] shrink-0 shadow-2xs">
                <Dumbbell className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-[#6B21A8] uppercase tracking-wider font-display truncate">
                {t('biometrics.proteinTargetTitle')}
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#6B21A8]/60 group-hover:text-[#6B21A8] transition-colors shrink-0" />
          </div>

          <div>
            <span className="text-lg sm:text-xl font-black font-mono-num text-[#24201D] leading-none block">
              {profile.currentWeight > 0 ? (
                <>
                  {targetProteinGrams} <span className="text-[10px] font-bold text-[#6B635B] font-display uppercase">g</span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>

          <div className="pt-1 border-t border-[#6B21A8]/20 flex items-center justify-between text-[9px] font-bold text-[#6B21A8]">
            <span>{t('biometrics.proteinTargetDesc')}</span>
          </div>
        </button>

        {/* 6. Hydration Target */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onSelectMetric({
              title: t('biometrics.waterTitle'),
              value: `${targetWaterMl} ml`,
              category: '35 ml per kg bodyweight',
              statusType: 'optimal',
              statusLabel: t('biometrics.waterDesc'),
              normRange: `~${targetWaterMl} ml`,
              numericValue: targetWaterMl,
              metricId: 'water',
              description:
                'Baseline water volume required for cellular hydration, joint lubrication, cognitive performance, and metabolic toxin filtration by the kidneys.',
              formula: `35 ml × Body Weight (${profile.currentWeight}kg)`,
              clinicalTip:
                'Add 400–600 ml for every hour of moderate-to-high intensity athletic exercise or hot environmental exposure.',
            });
          }}
          className="p-3 bg-[#E0F2FE] hover:bg-[#BAE6FD] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] text-left cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#24201D] group flex flex-col justify-between space-y-2"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-white border border-[#24201D]/20 flex items-center justify-center text-[#0284C7] shrink-0 shadow-2xs">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-[#0369A1] uppercase tracking-wider font-display truncate">
                {t('biometrics.waterTitle')}
              </span>
            </div>
            <ChevronRight className="w-3 h-3 text-[#0369A1]/60 group-hover:text-[#0369A1] transition-colors shrink-0" />
          </div>

          <div>
            <span className="text-lg sm:text-xl font-black font-mono-num text-[#24201D] leading-none block">
              {profile.currentWeight > 0 ? (
                <>
                  {targetWaterMl} <span className="text-[10px] font-bold text-[#6B635B] font-display uppercase">ml</span>
                </>
              ) : (
                '—'
              )}
            </span>
          </div>

          <div className="pt-1 border-t border-[#0369A1]/20 flex items-center justify-between text-[9px] font-bold text-[#0369A1]">
            <span>{t('biometrics.waterDesc')}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
