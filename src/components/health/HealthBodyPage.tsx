import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  Bot,
  Download,
  HelpCircle,
  X,
  Dumbbell,
  Apple,
} from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import type { HealthProfile, CalculatedHealthMetrics, WeightLog } from '../../types/health';
import { LogWeightModal } from './LogWeightModal';
import { HealthProfileModal } from './HealthProfileModal';
import { generateClinicalHealthSummaryAI } from '../../lib/aiHealthService';
import {
  computeWeightMovingAverage,
  computeWeeklyPace,
  computeProjectedGoalDate,
} from '../../lib/healthFormulas';

interface HealthBodyPageProps {
  profile: HealthProfile;
  metrics: CalculatedHealthMetrics;
  weightLogs: WeightLog[];
  selectedDate: string;
  onSaveWeight: (weight: number, note?: string, date?: string, bodyFat?: number, waistCm?: number) => Promise<void>;
  onDeleteWeightLog: (id: number) => Promise<void>;
  onUpdateProfile: (updates: Partial<HealthProfile>) => Promise<void>;
}

interface MetricDetailModalInfo {
  title: string;
  value: string;
  category: string;
  description: string;
  formula: string;
  clinicalTip: string;
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
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [activeMetricDetail, setActiveMetricDetail] = useState<MetricDetailModalInfo | null>(null);

  // AI-generated clinical summary state
  const [aiSummary, setAiSummary] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_clinical_health_summary') || '';
    }
    return '';
  });
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const { currentWeight, targetWeight, height, waistCm } = profile;
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
    waistToHeightRatio,
    waistRiskCategory,
  } = metrics;

  // Sorted weigh-in history (ASC by date)
  const sortedAllLogs = useMemo(() => {
    return [...weightLogs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  }, [weightLogs]);

  // Smoothed Moving Average Logs
  const logsWithMovingAvg = useMemo(() => {
    return computeWeightMovingAverage(sortedAllLogs, 7);
  }, [sortedAllLogs]);

  // Real initial starting weight from the earliest recorded log
  const startingWeight = sortedAllLogs.length > 0 ? sortedAllLogs[0].weight : currentWeight;

  // Real, non-hardcoded goal progress calculation
  const weightDiff = Number((currentWeight - targetWeight).toFixed(1));
  const isLossGoal = profile.goal === 'lose';

  const progressPercent = useMemo(() => {
    if (profile.goal === 'lose') {
      const totalToLose = startingWeight - targetWeight;
      const lost = startingWeight - currentWeight;
      if (totalToLose <= 0) return currentWeight <= targetWeight ? 100 : 0;
      return Math.min(100, Math.max(0, Math.round((lost / totalToLose) * 100)));
    } else if (profile.goal === 'gain') {
      const totalToGain = targetWeight - startingWeight;
      const gained = currentWeight - startingWeight;
      if (totalToGain <= 0) return currentWeight >= targetWeight ? 100 : 0;
      return Math.min(100, Math.max(0, Math.round((gained / totalToGain) * 100)));
    } else {
      const diff = Math.abs(currentWeight - targetWeight);
      if (diff <= 0.5) return 100;
      if (diff <= 1.5) return 85;
      return Math.max(0, Math.round(100 - diff * 15));
    }
  }, [startingWeight, currentWeight, targetWeight, profile.goal]);

  // Weekly Pace & Projected Milestone
  const weeklyPaceInfo = useMemo(() => {
    return computeWeeklyPace(sortedAllLogs);
  }, [sortedAllLogs]);

  const projectedGoal = useMemo(() => {
    return computeProjectedGoalDate(currentWeight, targetWeight, profile.goal, weeklyPaceInfo.paceKgPerWeek);
  }, [currentWeight, targetWeight, profile.goal, weeklyPaceInfo]);

  // Delta vs previous weigh-in log
  const previousLog = sortedAllLogs.length > 1 ? sortedAllLogs[sortedAllLogs.length - 2] : null;
  const deltaFromPrev = previousLog ? Number((currentWeight - previousLog.weight).toFixed(1)) : null;

  // BMI Gauge indicator position (15 to 35 range mapped to 0% - 100%)
  const gaugePercent = Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100));

  // Time-range filtered logs for chart
  const filteredLogs = useMemo(() => {
    if (timeRange === '7d') return logsWithMovingAvg.slice(-7);
    if (timeRange === '30d') return logsWithMovingAvg.slice(-30);
    if (timeRange === '90d') return logsWithMovingAvg.slice(-90);
    return logsWithMovingAvg;
  }, [logsWithMovingAvg, timeRange]);

  // Generate / refresh AI clinical summary
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    playClickSound();

    try {
      const summaryText = await generateClinicalHealthSummaryAI(profile, metrics, filteredLogs);
      setAiSummary(summaryText);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kairo_clinical_health_summary', summaryText);
      }
      playSuccessChime();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (!aiSummary) {
      handleGenerateSummary();
    }
  }, [profile.currentWeight, profile.targetWeight, profile.goal, profile.height, profile.age]);

  // Export Weigh-In Logs to CSV
  const handleExportCSV = () => {
    playClickSound();
    if (sortedAllLogs.length === 0) return;

    const headers = ['Date', 'Weight(kg)', 'BMI', 'BodyFat(%)', 'Waist(cm)', 'Note'];
    const rows = sortedAllLogs.map((l) => [
      l.date,
      l.weight,
      l.bmi,
      l.bodyFatPercentage ?? '',
      l.waistCm ?? '',
      `"${(l.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sumire_health_weights_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playSuccessChime();
  };

  // Chart Geometry Calculation
  const chartData = useMemo(() => {
    const rawWeights = filteredLogs.map((l) => l.weight);
    const avgWeights = filteredLogs.map((l) => l.movingAvg);
    const allVals = rawWeights.length > 0 ? [...rawWeights, ...avgWeights, targetWeight] : [currentWeight, targetWeight];

    const minWeightVal = Math.min(...allVals);
    const maxWeightVal = Math.max(...allVals);

    const chartMin = Number((minWeightVal - 1.2).toFixed(1));
    const chartMax = Number((maxWeightVal + 1.2).toFixed(1));
    const chartRange = chartMax - chartMin || 1;

    const svgWidth = 330;
    const svgHeight = 160;
    const paddingTop = 25;
    const paddingBottom = 32;
    const plotHeight = svgHeight - paddingTop - paddingBottom;
    const paddingLeft = 38;
    const paddingRight = 15;
    const plotWidth = svgWidth - paddingLeft - paddingRight;

    const getY = (val: number) => {
      const ratio = (val - chartMin) / chartRange;
      return paddingTop + (1 - ratio) * plotHeight;
    };

    // Calculate raw points and moving avg points
    const pts = filteredLogs.map((l, i) => {
      const xRatio = filteredLogs.length > 1 ? i / (filteredLogs.length - 1) : 0.5;
      const x = paddingLeft + xRatio * plotWidth;
      const y = getY(l.weight);
      const avgY = getY(l.movingAvg);
      return {
        x,
        y,
        avgY,
        weight: l.weight,
        movingAvg: l.movingAvg,
        date: l.date,
        note: l.note,
        bodyFat: l.bodyFatPercentage,
        waist: l.waistCm,
      };
    });

    let rawLinePath = '';
    let avgLinePath = '';
    let areaPath = '';

    if (pts.length > 1) {
      rawLinePath = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
      avgLinePath = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.avgY}` : `${acc} L ${p.x} ${p.avgY}`), '');

      const firstPt = pts[0];
      const lastPt = pts[pts.length - 1];
      const bottomY = paddingTop + plotHeight;
      areaPath = `${rawLinePath} L ${lastPt.x} ${bottomY} L ${firstPt.x} ${bottomY} Z`;
    }

    const targetYPos = getY(targetWeight);

    const gridYVals = [
      { val: chartMax, y: paddingTop },
      { val: Number(((chartMax + chartMin) / 2).toFixed(1)), y: paddingTop + plotHeight / 2 },
      { val: chartMin, y: paddingTop + plotHeight },
    ];

    return {
      points: pts,
      rawLinePath,
      avgLinePath,
      areaPath,
      targetYPos,
      gridYVals,
      chartMin,
      chartMax,
      svgWidth,
      svgHeight,
      paddingLeft,
      plotWidth,
    };
  }, [filteredLogs, currentWeight, targetWeight]);

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
              <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
                Biometrics & Body OS
              </span>
              <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
                BMI & Weight Tracker
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
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
              type="button"
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
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
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

            <div className="flex items-center justify-between text-[10px] font-bold text-[#6B635B] pt-0.5">
              <span>Height: {height} cm</span>
              {waistCm ? <span>Waist: {waistCm} cm</span> : null}
            </div>
          </div>

          {/* BMI Category */}
          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
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

        {/* Live Goal Progress & Pace Milestones */}
        <div className="p-3.5 bg-[#FBECCF] border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#854D0E]" />
              <span className="text-[11px] font-black font-display uppercase tracking-wider text-[#854D0E]">
                Goal: {targetWeight} kg ({profile.goal.toUpperCase()})
              </span>
            </div>
            <span className="text-xs font-black font-mono-num text-[#24201D] px-2 py-0.5 rounded-lg bg-white border border-[#24201D]/20 shadow-2xs">
              {progressPercent}% Done
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-white border border-[#24201D] rounded-full overflow-hidden p-0.5 shadow-2xs">
            <div
              className="h-full bg-[#3D6B52] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Start vs Current vs Goal Markers */}
          <div className="flex items-center justify-between text-[10px] font-bold text-[#6B635B] pt-0.5">
            <span>Start: <b className="font-mono-num text-[#24201D]">{startingWeight}kg</b></span>
            <span>Now: <b className="font-mono-num text-[#24201D]">{currentWeight}kg</b></span>
            <span>Target: <b className="font-mono-num text-[#24201D]">{targetWeight}kg</b></span>
          </div>

          {/* Rate of Change & ETA Badge */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#854D0E]/20">
            <div className="p-2 bg-white/80 border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold text-[#6B635B] uppercase block font-display">
                Weekly Pace:
              </span>
              <span className={`text-[11px] font-black font-mono-num block ${weeklyPaceInfo.isOptimal ? 'text-[#2D503C]' : 'text-[#854D0E]'}`}>
                {weeklyPaceInfo.paceLabel}
              </span>
            </div>

            <div className="p-2 bg-white/80 border border-[#24201D]/20 rounded-xl space-y-0.5">
              <span className="text-[9px] font-bold text-[#6B635B] uppercase block font-display">
                Projected Finish:
              </span>
              <span className="text-[11px] font-black font-mono-num text-[#24201D] block">
                {projectedGoal.dateString}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Clinical Body Composition & Metabolic Grid */}
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
          {/* Waist-to-Height Ratio (WHtR) - Gold Standard */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveMetricDetail({
                title: 'Waist-to-Height Ratio (WHtR)',
                value: waistToHeightRatio ? String(waistToHeightRatio) : 'N/A',
                category: waistRiskCategory || 'Enter waist in Profile',
                description: 'The Waist-to-Height Ratio (WHtR) is recognized by the WHO and UK NICE as the most accurate clinical metric for assessing central visceral fat and cardiovascular health, outperforming BMI alone.',
                formula: 'Waist Circumference (cm) ÷ Height (cm)',
                clinicalTip: 'Keep your waist circumference under half your height (WHtR < 0.50) to minimize metabolic syndrome and visceral adiposity risk.',
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
            <span className={`text-[9px] font-bold ${waistToHeightRatio && waistToHeightRatio < 0.5 ? 'text-[#3D6B52]' : 'text-[#DC2626]'}`}>
              {waistRiskCategory || 'Set in profile'}
            </span>
          </button>

          {/* Body Fat % */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveMetricDetail({
                title: 'Body Fat Percentage',
                value: `${bodyFatPercentage}%`,
                category: profile.gender === 'male' ? (bodyFatPercentage < 15 ? 'Athletic' : bodyFatPercentage <= 20 ? 'Fitness' : 'Acceptable') : (bodyFatPercentage < 22 ? 'Athletic' : bodyFatPercentage <= 28 ? 'Fitness' : 'Acceptable'),
                description: 'Estimated total adipose tissue mass relative to total body weight. Can be updated directly from smart bioimpedance scales or calculated via Deurenberg adult formula.',
                formula: 'Deurenberg: 1.20 × BMI + 0.23 × Age - 10.8 × Sex - 5.4',
                clinicalTip: 'Optimal range for longevity: 12-18% for men, 18-24% for women. Avoid rapid crashes below 8% (men) or 14% (women) to preserve hormonal health.',
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
              setActiveMetricDetail({
                title: 'Lean Muscle & Tissue Mass',
                value: `${muscleMassKg} kg`,
                category: 'Metabolic Engine',
                description: 'Lean body mass represents all non-fat tissues: skeletal muscle, organs, bone, and intracellular water. Muscle is your primary glucose sink and metabolic engine.',
                formula: 'Total Body Weight × (1 - Body Fat% ÷ 100)',
                clinicalTip: 'Consume at least 1.6–2.2g of protein per kg of body weight during calorie restriction to safeguard lean tissue against catabolism.',
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
              setActiveMetricDetail({
                title: 'Basal Metabolic Rate (BMR)',
                value: `${bmr} kcal`,
                category: 'Mifflin-St Jeor Formula',
                description: 'The baseline energy your body expends completely at rest just to maintain vital physiological processes: breathing, heart contractions, cellular repair, and brain activity.',
                formula: 'Mifflin-St Jeor: 10 × weight(kg) + 6.25 × height(cm) - 5 × age + s',
                clinicalTip: 'Never consume less than your BMR for extended periods. Chronic sub-BMR diets cause hormonal downregulation, thyroid slowing, and metabolic adaptation.',
              });
            }}
            className="p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#6B635B] uppercase">Basal BMR</span>
              <HelpCircle className="w-3 h-3 text-stone-400" />
            </div>
            <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
              {bmr} <span className="text-xs">kcal</span>
            </span>
            <span className="text-[9px] text-stone-400">Baseline resting burn</span>
          </button>

          {/* Daily TDEE */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveMetricDetail({
                title: 'Total Daily Energy Expenditure (TDEE)',
                value: `${tdee} kcal`,
                category: `Activity: ${profile.activityLevel}`,
                description: 'Total energy burned throughout a 24-hour cycle, combining your BMR, non-exercise activity thermogenesis (NEAT), exercise activity (EAT), and the thermic effect of food (TEF).',
                formula: 'BMR × Activity Multiplier (1.2 to 1.725)',
                clinicalTip: 'To lose fat steadily, eat 300-500 kcal below TDEE. To gain lean mass, eat 250-400 kcal above TDEE.',
              });
            }}
            className="p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#6B635B] uppercase">Daily TDEE</span>
              <HelpCircle className="w-3 h-3 text-stone-400" />
            </div>
            <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
              {tdee} <span className="text-xs">kcal</span>
            </span>
            <span className="text-[9px] text-stone-400">Maintenance baseline</span>
          </button>

          {/* Calorie Target */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveMetricDetail({
                title: 'Prescribed Intake Target',
                value: `${targetDailyCalories} kcal`,
                category: `Goal: ${profile.goal}`,
                description: 'Your personalized daily caloric budget calibrated to hit your target weight safely, preserving metabolic efficiency and avoiding lean muscle loss.',
                formula: `TDEE ${profile.goal === 'lose' ? '- 400 kcal' : profile.goal === 'gain' ? '+ 350 kcal' : '± 0 kcal'}`,
                clinicalTip: `Prioritize ${targetProteinGrams}g of protein daily (${(targetDailyCalories * 0.3 / 4).toFixed(0)} kcal) to promote satiety and support thermogenesis.`,
              });
            }}
            className="p-2.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-left cursor-pointer transition-all active:scale-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#6B635B] uppercase">Daily Calories</span>
              <HelpCircle className="w-3 h-3 text-stone-400" />
            </div>
            <span className="text-lg font-black font-mono-num text-[#24201D] mt-0.5 block">
              {targetDailyCalories} <span className="text-xs">kcal</span>
            </span>
            <span className="text-[9px] text-stone-400">{targetProteinGrams}g protein/day</span>
          </button>
        </div>
      </div>

      {/* 3. Weight History Line Chart with Moving Average Trend */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                Weight Trend & Moving Average
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-[#DDE8DE] border border-[#24201D] text-[9px] font-bold text-[#2D503C]">
                7D Smoothed
              </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-bold text-stone-400 mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3D6B52] inline-block" /> Raw Scale
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#2563EB] inline-block" /> 7D Trend Avg
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-[#DC2626] border-t border-dashed border-[#DC2626] inline-block" /> Target ({targetWeight}kg)
              </span>
            </div>
          </div>

          {/* Filter Range Pills */}
          <div className="flex items-center gap-1 p-0.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl shadow-2xs">
            {(
              [
                { id: '7d', label: '7D' },
                { id: '30d', label: '30D' },
                { id: '90d', label: '90D' },
                { id: 'all', label: 'ALL' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  setTimeRange(t.id);
                  setSelectedPointIndex(null);
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

        {/* SVG Chart */}
        <div className="w-full bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl p-2 relative overflow-hidden shadow-2xs">
          
          {/* Selected Point Callout Tooltip */}
          {selectedPointIndex !== null && chartData.points[selectedPointIndex] && (
            <div className="absolute top-2 right-2 bg-white border border-[#24201D] rounded-xl px-2.5 py-1.5 shadow-2xs z-10 animate-in fade-in duration-100 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#6B635B]">
                  {chartData.points[selectedPointIndex].date}:
                </span>
                <span className="text-xs font-black font-mono-num text-[#24201D]">
                  {chartData.points[selectedPointIndex].weight} kg
                </span>
                <span className="text-[10px] font-mono-num text-[#2563EB] font-bold">
                  (7D: {chartData.points[selectedPointIndex].movingAvg}kg)
                </span>
              </div>
              <div className="text-[9px] text-[#6B635B] flex items-center gap-2">
                {chartData.points[selectedPointIndex].bodyFat && (
                  <span>Fat: <b>{chartData.points[selectedPointIndex].bodyFat}%</b></span>
                )}
                {chartData.points[selectedPointIndex].waist && (
                  <span>Waist: <b>{chartData.points[selectedPointIndex].waist}cm</b></span>
                )}
                {chartData.points[selectedPointIndex].note && (
                  <span className="text-[#3D6B52]">"{chartData.points[selectedPointIndex].note}"</span>
                )}
              </div>
            </div>
          )}

          <svg viewBox={`0 0 ${chartData.svgWidth} ${chartData.svgHeight}`} className="w-full h-40 overflow-visible">
            <defs>
              <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3D6B52" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3D6B52" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {chartData.gridYVals.map((g, idx) => (
              <g key={idx}>
                <line
                  x1={chartData.paddingLeft}
                  y1={g.y}
                  x2={chartData.svgWidth - 10}
                  y2={g.y}
                  stroke="#24201D"
                  strokeOpacity="0.10"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={chartData.paddingLeft - 4}
                  y={g.y + 3}
                  fill="#78716C"
                  fontSize="8"
                  fontWeight="bold"
                  textAnchor="end"
                  className="font-mono-num"
                >
                  {g.val}
                </text>
              </g>
            ))}

            {/* Target dashed line */}
            <line
              x1={chartData.paddingLeft}
              y1={chartData.targetYPos}
              x2={chartData.svgWidth - 10}
              y2={chartData.targetYPos}
              stroke="#DC2626"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={chartData.svgWidth - 12}
              y={chartData.targetYPos - 4}
              fill="#DC2626"
              fontSize="8"
              fontWeight="black"
              textAnchor="end"
            >
              Goal {targetWeight}kg
            </text>

            {/* Area Fill under raw line */}
            {chartData.areaPath && (
              <path d={chartData.areaPath} fill="url(#weightAreaGrad)" />
            )}

            {/* Moving Average Line (Blue, smooth trend) */}
            {chartData.avgLinePath && (
              <path
                d={chartData.avgLinePath}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.85"
              />
            )}

            {/* Raw Weight Line (Green) */}
            {chartData.rawLinePath && (
              <path
                d={chartData.rawLinePath}
                fill="none"
                stroke="#3D6B52"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* If only 1 point exists, render horizontal guide */}
            {chartData.points.length === 1 && (
              <line
                x1={chartData.paddingLeft}
                y1={chartData.points[0].y}
                x2={chartData.svgWidth - 10}
                y2={chartData.points[0].y}
                stroke="#3D6B52"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
            )}

            {/* Data Circles */}
            {chartData.points.map((p, idx) => {
              const isSelected = selectedPointIndex === idx;
              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onClick={() => {
                    playClickSound();
                    setSelectedPointIndex(isSelected ? null : idx);
                  }}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? 6 : 3.5}
                    fill={isSelected ? '#3D6B52' : '#FFFFFF'}
                    stroke="#24201D"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="transition-all"
                  />
                  <text
                    x={p.x}
                    y={chartData.svgHeight - 8}
                    fill="#78716C"
                    fontSize="7"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono-num"
                  >
                    {p.date.slice(5)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 4. Real AI-Powered Clinical Summary Card (Dynamic & Regenerable) */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Bot className="w-3.5 h-3.5 text-[#2D503C]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                AI Clinical Health Analysis
              </h3>
              <span className="text-[10px] font-bold text-[#6B635B]">
                Personalized metabolic recommendation
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            title="Refresh AI Analysis"
            className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-xs leading-relaxed text-[#24201D]">
          {isGeneratingSummary ? (
            <div className="flex items-center gap-2 text-stone-500 py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs font-bold">Sumire is analyzing your metabolic trajectory...</span>
            </div>
          ) : (
            <p className="text-xs font-medium text-[#24201D] whitespace-pre-line leading-relaxed">
              {aiSummary || 'Tap the refresh icon above to generate your clinical analysis.'}
            </p>
          )}
        </div>
      </div>

      {/* 5. Weigh-In History Records with CSV Export */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B] leading-none">
              Weigh-In Log History ({weightLogs.length})
            </h3>
            <span className="text-[10px] font-bold text-stone-400 mt-0.5 block">
              Latest {Math.min(10, weightLogs.length)} records
            </span>
          </div>

          {weightLogs.length > 0 && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] text-[10px] font-bold text-[#24201D] flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3 h-3 text-[#3D6B52]" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {weightLogs.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No records yet.</p>
        ) : (
          <div className="space-y-1.5">
            {[...weightLogs].reverse().slice(0, 10).map((log) => (
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
                      {log.bodyFatPercentage && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DDE8DE] border border-[#24201D]/20 text-[#2D503C] font-mono-num">
                          {log.bodyFatPercentage}% Fat
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#6B635B] block">
                      {log.date} {log.waistCm ? `• Waist: ${log.waistCm}cm` : ''} {log.note ? `• ${log.note}` : ''}
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

      {/* 6. Metric Detail Science Modal */}
      {activeMetricDetail && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-[#24201D]/55 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
          <div className="w-full max-w-sm bg-white border-[2px] border-[#24201D] rounded-3xl shadow-[4px_4px_0px_#24201D] p-5 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
                  <Activity className="w-4 h-4 text-[#2D503C]" />
                </div>
                <div>
                  <h3 className="text-xs font-black font-display uppercase tracking-tight text-[#24201D]">
                    {activeMetricDetail.title}
                  </h3>
                  <span className="text-[10px] font-bold text-[#6B635B]">
                    Clinical Reference
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveMetricDetail(null);
                }}
                className="w-7 h-7 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs cursor-pointer active:scale-95 transition-all"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-3.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-2xl space-y-1">
              <span className="text-[9px] font-black uppercase text-[#6B635B] tracking-wider block font-display">
                Current Value:
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono-num text-[#24201D]">
                  {activeMetricDetail.value}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-[#24201D]/25 text-[10px] font-bold text-[#24201D]">
                  {activeMetricDetail.category}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-[#24201D]">
              <p className="text-stone-700 font-medium">
                {activeMetricDetail.description}
              </p>

              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 text-[11px] font-mono-num text-stone-600">
                <span className="font-bold text-[#24201D] block mb-0.5 font-body text-[10px] uppercase">
                  Formula:
                </span>
                {activeMetricDetail.formula}
              </div>

              <div className="p-2.5 rounded-xl bg-[#FBECCF] border border-[#24201D] text-[11px] text-[#854D0E] font-medium leading-normal">
                <span className="font-black uppercase text-[10px] block mb-0.5 font-display">
                  Clinical Recommendation:
                </span>
                {activeMetricDetail.clinicalTip}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveMetricDetail(null);
              }}
              className="w-full py-2.5 bg-[#24201D] text-white rounded-xl text-xs font-black uppercase tracking-wider font-display shadow-2xs active:translate-y-0.5 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <LogWeightModal
        isOpen={isLogWeightOpen}
        onClose={() => setIsLogWeightOpen(false)}
        currentWeight={currentWeight}
        heightCm={height}
        selectedDate={selectedDate}
        defaultWaist={waistCm}
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
