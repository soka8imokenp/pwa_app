import React, { useState } from 'react';
import {
  Scale,
  Target,
  Plus,
  Settings2,
  TrendingDown,
  TrendingUp,
  Activity,
  Flame,
  Droplets,
  Trash2,
  Calendar,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';
import type { HealthProfile, CalculatedHealthMetrics, WeightLog } from '../../types/health';
import { LogWeightModal } from './LogWeightModal';
import { HealthProfileModal } from './HealthProfileModal';

interface HealthBodyPageProps {
  profile: HealthProfile;
  metrics: CalculatedHealthMetrics;
  weightLogs: WeightLog[];
  selectedDate: string;
  onSaveWeight: (weight: number, note?: string, date?: string) => Promise<void>;
  onDeleteWeightLog: (id: number) => Promise<void>;
  onUpdateProfile: (updates: Partial<HealthProfile>) => Promise<void>;
}

export const HealthBodyPage: React.FC<HealthBodyPageProps> = ({
  profile,
  metrics,
  weightLogs,
  selectedDate,
  onSaveWeight,
  onDeleteWeightLog,
  onUpdateProfile,
}) => {
  const [isLogWeightOpen, setIsLogWeightOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  const { currentWeight, targetWeight, height } = profile;
  const {
    bmi,
    bmiCategoryLabel,
    bmiColor,
    idealWeightMin,
    idealWeightMax,
    bmr,
    tdee,
    bodyFatPercentage,
    muscleMassKg,
    targetWaterMl,
    targetDailyCalories,
    targetProteinGrams,
  } = metrics;

  // Weight progress calculations
  const weightDiff = Number((currentWeight - targetWeight).toFixed(1));
  const isLossGoal = profile.goal === 'lose';
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (1 - Math.abs(currentWeight - targetWeight) / Math.max(1, Math.abs(currentWeight - targetWeight) + 5)) * 100
      )
    )
  );

  // Delta vs previous weigh-in log
  const previousLog = weightLogs.length > 1 ? weightLogs[weightLogs.length - 2] : null;
  const deltaFromPrev = previousLog ? Number((currentWeight - previousLog.weight).toFixed(1)) : null;

  // BMI Gauge indicator position (15 to 35 range mapped to 0% - 100%)
  const gaugePercent = Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100));

  // Time-range filtered logs for chart
  const filteredLogs = React.useMemo(() => {
    if (timeRange === '7d') return weightLogs.slice(-7);
    if (timeRange === '30d') return weightLogs.slice(-30);
    return weightLogs;
  }, [weightLogs, timeRange]);

  // Chart coordinates
  const weights = filteredLogs.map((l) => l.weight);
  const chartPoints = filteredLogs.length > 0 ? weights : [currentWeight];
  const rawMin = Math.min(...chartPoints, targetWeight);
  const rawMax = Math.max(...chartPoints, targetWeight);
  const minW = rawMin - 1.5;
  const maxW = rawMax + 1.5;
  const rangeW = maxW - minW || 1;

  const points = filteredLogs.map((l, i) => {
    const x = filteredLogs.length > 1 ? (i / (filteredLogs.length - 1)) * 280 + 20 : 160;
    const y = 115 - ((l.weight - minW) / rangeW) * 85;
    return { x, y, weight: l.weight, date: l.date };
  });

  const pathD = points.length > 1
    ? points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '')
    : '';

  const targetY = 115 - ((targetWeight - minW) / rangeW) * 85;

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      
      {/* 1. Hero BMI & Weight Card */}
      <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-4">
        
        {/* Top bar with quick buttons */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Scale className="w-4 h-4 text-[#2D503C]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#6B635B] uppercase tracking-wider block font-display leading-none">
                Biometrics & Body OS
              </span>
              <h2 className="text-sm font-bold font-display text-[#24201D] mt-0.5 leading-none">
                BMI & Weight Tracker
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                playClickSound();
                setIsProfileOpen(true);
              }}
              title="Edit Profile Parameters"
              className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Settings2 className="w-4 h-4 stroke-[2]" />
            </button>

            <button
              onClick={() => {
                playClickSound();
                setIsLogWeightOpen(true);
              }}
              className="px-3 py-1.5 bg-[#3D6B52] hover:bg-[#345B45] text-white border border-[#24201D] rounded-xl text-xs font-black shadow-2xs cursor-pointer active:translate-y-0.5 transition-all flex items-center gap-1.5 uppercase tracking-wider font-display"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Weigh-In</span>
            </button>
          </div>
        </div>

        {/* Main Weight & BMI Numbers */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Weight */}
          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B]">
                Current Weight
              </span>
              {deltaFromPrev !== null && (
                <span
                  className={`text-[9px] font-black font-mono-num flex items-center gap-0.5 ${
                    isLossGoal
                      ? deltaFromPrev <= 0 ? 'text-[#3D6B52]' : 'text-[#DC2626]'
                      : deltaFromPrev >= 0 ? 'text-[#3D6B52]' : 'text-[#DC2626]'
                  }`}
                >
                  {deltaFromPrev < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  {deltaFromPrev > 0 ? `+${deltaFromPrev}` : deltaFromPrev}kg
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono-num text-[#24201D]">
                {currentWeight}
              </span>
              <span className="text-xs font-bold text-[#6B635B]">kg</span>
            </div>

            <span className="text-[10px] font-bold text-[#6B635B] block">
              Height: {height} cm
            </span>
          </div>

          {/* BMI Category */}
          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block">
              Body Mass Index
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono-num text-[#24201D]">
                {bmi}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-2xs"
                style={{ backgroundColor: bmiColor }}
              >
                {bmiCategoryLabel.split(' ')[0]}
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#6B635B] block">
              Ideal: {idealWeightMin}–{idealWeightMax} kg
            </span>
          </div>
        </div>

        {/* BMI Color Gauge Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[9px] font-bold text-[#6B635B] uppercase font-mono-num">
            <span>&lt;18.5 Deficit</span>
            <span>18.5 – 24.9 Normal</span>
            <span>25 – 29.9 Over</span>
            <span>30+ Obese</span>
          </div>
          
          <div className="relative w-full h-3 rounded-full border border-[#24201D] overflow-hidden flex shadow-2xs">
            <div className="h-full bg-[#60A5FA]" style={{ width: '22%' }} title="Underweight (<18.5)" />
            <div className="h-full bg-[#86EFAC]" style={{ width: '32%' }} title="Normal (18.5-24.9)" />
            <div className="h-full bg-[#FDE047]" style={{ width: '25%' }} title="Overweight (25-29.9)" />
            <div className="h-full bg-[#F87171]" style={{ width: '21%' }} title="Obese (30+)" />
          </div>

          {/* Marker pointer */}
          <div className="relative w-full h-2">
            <div
              className="absolute -top-1 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-[#24201D] transition-all duration-300"
              style={{ left: `${gaugePercent}%` }}
            />
          </div>
        </div>

        {/* Target Goal Progress Banner */}
        <div className="p-3 bg-[#FBECCF] border border-[#24201D] rounded-xl shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#854D0E]" />
            <div>
              <span className="text-[10px] font-bold text-[#854D0E] uppercase tracking-wider block leading-none">
                Target: {targetWeight} kg ({profile.goal.toUpperCase()})
              </span>
              <span className="text-xs font-black text-[#24201D] mt-0.5 block">
                {Math.abs(weightDiff) === 0
                  ? 'Target Reached! Keep up the great consistency.'
                  : isLossGoal
                  ? `${Math.abs(weightDiff)} kg to lose to reach your goal`
                  : `${Math.abs(weightDiff)} kg to gain to reach your goal`}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-black font-mono-num text-[#24201D]">
              {progressPercent}%
            </span>
          </div>
        </div>

      </div>

      {/* 2. Clinical Body Composition & Metabolic Grid */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
            Metabolic Rate & Body Stats
          </h3>
          <span className="text-[10px] font-bold text-[#3D6B52] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Gold Standard Models
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Body Fat % */}
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Est. Body Fat</span>
            <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
              {bodyFatPercentage}%
            </span>
            <span className="text-[9px] text-stone-400">Deurenberg formula</span>
          </div>

          {/* Muscle Mass */}
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Lean Muscle</span>
            <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
              {muscleMassKg} <span className="text-xs">kg</span>
            </span>
            <span className="text-[9px] text-stone-400">Active lean tissue</span>
          </div>

          {/* BMR */}
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Basal BMR</span>
            <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
              {bmr} <span className="text-xs">kcal</span>
            </span>
            <span className="text-[9px] text-stone-400">Mifflin-St Jeor</span>
          </div>

          {/* TDEE */}
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Daily TDEE</span>
            <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
              {tdee} <span className="text-xs">kcal</span>
            </span>
            <span className="text-[9px] text-stone-400">With {profile.activityLevel} activity</span>
          </div>

          {/* Water Target */}
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Daily Water</span>
            <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
              {(targetWaterMl / 1000).toFixed(1)} <span className="text-xs">L</span>
            </span>
            <span className="text-[9px] text-stone-400">{Math.round(targetWaterMl / 250)} glasses/day</span>
          </div>

          {/* Calorie Target */}
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Calorie Target</span>
            <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
              {targetDailyCalories} <span className="text-xs">kcal</span>
            </span>
            <span className="text-[9px] text-stone-400">{targetProteinGrams}g protein/day</span>
          </div>
        </div>
      </div>

      {/* 3. Weight History Line Chart with Filter */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B] leading-none">
              Weight Trend
            </h3>
            <span className="text-[10px] font-bold text-stone-400 mt-0.5 block">
              Target line: {targetWeight} kg
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-0.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            {(
              [
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: 'all', label: 'ALL' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  setTimeRange(t.id);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  timeRange === t.id
                    ? 'bg-[#24201D] text-white shadow-2xs'
                    : 'text-[#6B635B] hover:text-[#24201D]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {points.length > 0 ? (
          <div className="w-full bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl p-2.5 relative overflow-hidden">
            <svg viewBox="0 0 320 135" className="w-full h-32 overflow-visible">
              {/* Target dashed line */}
              <line
                x1="20"
                y1={targetY}
                x2="300"
                y2={targetY}
                stroke="#DC2626"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text x="295" y={targetY - 4} fill="#DC2626" fontSize="8" fontWeight="bold" textAnchor="end">
                Target {targetWeight}kg
              </text>

              {/* Progress line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#3D6B52"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    fill="#FAF8F5"
                    stroke="#24201D"
                    strokeWidth="2"
                  />
                  <text
                    x={p.x}
                    y={p.y - 7}
                    fill="#24201D"
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono-num"
                  >
                    {p.weight}
                  </text>
                  <text
                    x={p.x}
                    y="130"
                    fill="#78716C"
                    fontSize="7"
                    textAnchor="middle"
                    className="font-mono-num"
                  >
                    {p.date.slice(5)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div className="p-6 text-center text-xs font-bold text-stone-400 bg-[#FAF8F5] rounded-xl border border-dashed border-[#24201D]/20">
            No weigh-in logs recorded yet. Tap "+ Weigh-In" to begin!
          </div>
        )}
      </div>

      {/* 4. Clinical Evidence-Based Health Insight Card */}
      <div className="p-3.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl flex items-start gap-2.5">
        <div className="p-1.5 rounded-xl bg-white border border-[#24201D]/25 shadow-2xs shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-[#3D6B52]" />
        </div>
        <div className="text-xs leading-relaxed text-[#24201D]">
          <span className="font-black font-display uppercase tracking-wider block text-[10px] text-[#3D6B52] mb-0.5">
            Clinical Summary & Recommendation
          </span>
          <p className="text-[11px] font-bold text-[#6B635B]">
            Your current BMI of <span className="text-[#24201D] font-black">{bmi}</span> places you in the{' '}
            <span className="text-[#24201D] font-black">{bmiCategoryLabel}</span> zone. For your height of {height} cm, a healthy WHO weight range is{' '}
            <span className="text-[#24201D] font-black">{idealWeightMin}–{idealWeightMax} kg</span>. To reach your target of {targetWeight} kg sustainably, aim for{' '}
            <span className="text-[#24201D] font-black">{targetDailyCalories} kcal/day</span> and at least{' '}
            <span className="text-[#24201D] font-black">{targetProteinGrams}g of protein</span> daily.
          </p>
        </div>
      </div>

      {/* 5. Weigh-In History Records */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
            Weigh-In Log History ({weightLogs.length})
          </h3>
          <span className="text-[10px] font-bold text-[#6B635B]">
            Latest {Math.min(10, weightLogs.length)} records
          </span>
        </div>

        {weightLogs.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No records yet.</p>
        ) : (
          <div className="space-y-1.5">
            {weightLogs.slice(-10).reverse().map((log) => (
              <div
                key={log.id}
                className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#24201D]/30 flex items-center justify-center font-bold text-xs shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-[#6B635B]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono-num text-[#24201D]">
                        {log.weight} kg
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#24201D]/20 text-[#6B635B] font-mono-num">
                        BMI {log.bmi}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#6B635B] block">
                      {log.date} {log.note ? `• ${log.note}` : ''}
                    </span>
                  </div>
                </div>

                {log.id && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onDeleteWeightLog(log.id!);
                    }}
                    title="Delete log"
                    className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-white transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <LogWeightModal
        isOpen={isLogWeightOpen}
        onClose={() => setIsLogWeightOpen(false)}
        currentWeight={currentWeight}
        heightCm={height}
        selectedDate={selectedDate}
        onSaveWeight={onSaveWeight}
      />

      <HealthProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onSaveProfile={onUpdateProfile}
      />

    </div>
  );
};
