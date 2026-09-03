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
} from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import type { HealthProfile, CalculatedHealthMetrics, WeightLog } from '../../types/health';
import { LogWeightModal } from './LogWeightModal';
import { HealthProfileModal } from './HealthProfileModal';
import { generateClinicalHealthSummaryAI } from '../../lib/aiHealthService';

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
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  // AI-generated clinical summary state
  const [aiSummary, setAiSummary] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_clinical_health_summary') || '';
    }
    return '';
  });
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

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

  // Sorted weigh-in history (ASC by date)
  const sortedAllLogs = useMemo(() => {
    return [...weightLogs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  }, [weightLogs]);

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
      // Maintenance
      const diff = Math.abs(currentWeight - targetWeight);
      if (diff <= 0.5) return 100;
      if (diff <= 1.5) return 85;
      return Math.max(0, Math.round(100 - diff * 15));
    }
  }, [startingWeight, currentWeight, targetWeight, profile.goal]);

  // Delta vs previous weigh-in log
  const previousLog = sortedAllLogs.length > 1 ? sortedAllLogs[sortedAllLogs.length - 2] : null;
  const deltaFromPrev = previousLog ? Number((currentWeight - previousLog.weight).toFixed(1)) : null;

  // BMI Gauge indicator position (15 to 35 range mapped to 0% - 100%)
  const gaugePercent = Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100));

  // Time-range filtered logs for chart
  const filteredLogs = useMemo(() => {
    if (timeRange === '7d') return sortedAllLogs.slice(-7);
    if (timeRange === '30d') return sortedAllLogs.slice(-30);
    return sortedAllLogs;
  }, [sortedAllLogs, timeRange]);

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

  // Chart Geometry Calculation
  const chartData = useMemo(() => {
    const rawWeights = filteredLogs.map((l) => l.weight);
    const allVals = rawWeights.length > 0 ? [...rawWeights, targetWeight] : [currentWeight, targetWeight];

    const minWeightVal = Math.min(...allVals);
    const maxWeightVal = Math.max(...allVals);

    // Padding above and below to prevent clipping
    const chartMin = Number((minWeightVal - 1.5).toFixed(1));
    const chartMax = Number((maxWeightVal + 1.5).toFixed(1));
    const chartRange = chartMax - chartMin || 1;

    const svgWidth = 320;
    const svgHeight = 150;
    const paddingTop = 25;
    const paddingBottom = 30;
    const plotHeight = svgHeight - paddingTop - paddingBottom;
    const paddingLeft = 38;
    const paddingRight = 15;
    const plotWidth = svgWidth - paddingLeft - paddingRight;

    // Y position helper
    const getY = (val: number) => {
      const ratio = (val - chartMin) / chartRange;
      return paddingTop + (1 - ratio) * plotHeight;
    };

    // Calculate points
    const pts = filteredLogs.map((l, i) => {
      const xRatio = filteredLogs.length > 1 ? i / (filteredLogs.length - 1) : 0.5;
      const x = paddingLeft + xRatio * plotWidth;
      const y = getY(l.weight);
      return { x, y, weight: l.weight, date: l.date, note: l.note };
    });

    let linePath = '';
    let areaPath = '';

    if (pts.length > 1) {
      linePath = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
      const firstPt = pts[0];
      const lastPt = pts[pts.length - 1];
      const bottomY = paddingTop + plotHeight;
      areaPath = `${linePath} L ${lastPt.x} ${bottomY} L ${firstPt.x} ${bottomY} Z`;
    }

    const targetYPos = getY(targetWeight);

    // Reference Grid Lines
    const gridYVals = [
      { val: chartMax, y: paddingTop },
      { val: Number(((chartMax + chartMin) / 2).toFixed(1)), y: paddingTop + plotHeight / 2 },
      { val: chartMin, y: paddingTop + plotHeight },
    ];

    return {
      points: pts,
      linePath,
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

            <span className="text-[10px] font-bold text-[#6B635B] block">
              Height: {height} cm
            </span>
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

        {/* Live Goal Progress & Milestones */}
        <div className="p-3.5 bg-[#FBECCF] border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#854D0E]" />
              <span className="text-[11px] font-black font-display uppercase tracking-wider text-[#854D0E]">
                Goal: {targetWeight} kg ({profile.goal.toUpperCase()})
              </span>
            </div>
            <span className="text-xs font-black font-mono-num text-[#24201D] px-2 py-0.5 rounded-lg bg-white border border-[#24201D]/20 shadow-2xs">
              {progressPercent}% Complete
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

          {/* Status Text */}
          <div className="text-[11px] font-bold text-[#24201D] pt-0.5">
            {Math.abs(weightDiff) === 0 ? (
              <span>Goal Reached! Excellent consistency maintaining your target.</span>
            ) : isLossGoal ? (
              <span>{Math.abs(weightDiff)} kg left to lose (~{Math.max(1, Math.ceil(Math.abs(weightDiff) / 0.45))} weeks at safe deficit)</span>
            ) : (
              <span>{Math.abs(weightDiff)} kg left to gain (~{Math.max(1, Math.ceil(Math.abs(weightDiff) / 0.35))} weeks at clean surplus)</span>
            )}
          </div>
        </div>

      </div>

      {/* 2. Clinical Body Composition & Metabolic Grid */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
            Metabolic Rate & Body Stats
          </h3>
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

      {/* 3. Weight History Line Chart with Clear Markers */}
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
          <div className="flex items-center gap-1 p-0.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl shadow-2xs">
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
            <div className="absolute top-2 right-2 bg-white border border-[#24201D] rounded-lg px-2 py-1 shadow-2xs z-10 animate-in fade-in duration-100 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#6B635B]">
                {chartData.points[selectedPointIndex].date}:
              </span>
              <span className="text-xs font-black font-mono-num text-[#24201D]">
                {chartData.points[selectedPointIndex].weight} kg
              </span>
              {chartData.points[selectedPointIndex].note && (
                <span className="text-[9px] text-[#3D6B52] font-medium">
                  ({chartData.points[selectedPointIndex].note})
                </span>
              )}
            </div>
          )}

          <svg viewBox={`0 0 ${chartData.svgWidth} ${chartData.svgHeight}`} className="w-full h-36 overflow-visible">
            <defs>
              <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3D6B52" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#3D6B52" stopOpacity="0.02" />
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

            {/* Area Fill */}
            {chartData.areaPath && (
              <path d={chartData.areaPath} fill="url(#weightAreaGrad)" />
            )}

            {/* Line Path */}
            {chartData.linePath && (
              <path
                d={chartData.linePath}
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
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? '#3D6B52' : '#FFFFFF'}
                    stroke="#24201D"
                    strokeWidth={isSelected ? 2.5 : 1.75}
                    className="transition-all"
                  />
                  <text
                    x={p.x}
                    y={p.y - 7}
                    fill="#24201D"
                    fontSize="8"
                    fontWeight="black"
                    textAnchor="middle"
                    className="font-mono-num"
                  >
                    {p.weight}
                  </text>
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
