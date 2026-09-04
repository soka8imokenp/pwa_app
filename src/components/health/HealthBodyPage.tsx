import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Target,
  Plus,
  Settings2,
  RefreshCw,
  Bot,
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

// Decomposed Modular Subcomponents
import { BiometricsGrid } from './body/BiometricsGrid';
import { WeightTrendChart } from './body/WeightTrendChart';
import { WeightHistoryList } from './body/WeightHistoryList';
import { MetricDetailModal, type MetricDetailModalInfo } from './body/MetricDetailModal';

interface HealthBodyPageProps {
  profile: HealthProfile;
  metrics: CalculatedHealthMetrics;
  weightLogs: WeightLog[];
  selectedDate: string;
  onSaveWeight: (weight: number, note?: string, date?: string, bodyFat?: number, waistCm?: number) => Promise<void>;
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
  const [activeMetricDetail, setActiveMetricDetail] = useState<MetricDetailModalInfo | null>(null);

  // AI-generated clinical summary state (in English)
  const [aiSummary, setAiSummary] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_clinical_health_summary') || '';
      if (/[а-яё]/i.test(saved)) {
        localStorage.removeItem('kairo_clinical_health_summary');
        return '';
      }
      return saved;
    }
    return '';
  });
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const { currentWeight, targetWeight } = profile;
  const {
    bmi,
    bmiCategoryLabel,
    bmiColor,
    idealWeightMin,
    idealWeightMax,
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

  // Generate / refresh AI clinical summary
  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    playClickSound();

    try {
      const summaryText = await generateClinicalHealthSummaryAI(profile, metrics, logsWithMovingAvg.slice(-30));
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

  const handleSaveWeightInternal = async (
    weight: number,
    note?: string,
    date?: string,
    bodyFat?: number,
    waistCmVal?: number
  ) => {
    await onSaveWeight(weight, note, date, bodyFat, waistCmVal);
    setTimeout(() => {
      handleGenerateSummary();
    }, 300);
  };

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

        {/* Big Weight Numbers & BMI Badge */}
        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
              Current Body Mass
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-4xl sm:text-5xl font-black font-mono-num text-[#24201D] tracking-tight">
                {currentWeight}
              </span>
              <span className="text-sm font-black text-[#6B635B] uppercase font-display">
                kg
              </span>

              {deltaFromPrev !== null && deltaFromPrev !== 0 && (
                <span
                  className={`ml-2 text-xs font-black font-mono-num px-1.5 py-0.5 rounded-lg border ${
                    deltaFromPrev < 0
                      ? 'bg-[#DDE8DE] text-[#2D503C] border-[#2D503C]/30'
                      : 'bg-[#F7E3DC] text-[#C25E40] border-[#C25E40]/30'
                  }`}
                >
                  {deltaFromPrev > 0 ? `+${deltaFromPrev}` : deltaFromPrev} kg
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
              WHO Clinical BMI
            </span>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-2xl font-black font-mono-num text-[#24201D]">
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

      {/* 2. Clinical Body Composition & Metabolic Grid (Decomposed Component) */}
      <BiometricsGrid
        profile={profile}
        metrics={metrics}
        onSelectMetric={(info) => setActiveMetricDetail(info)}
      />

      {/* 3. Weight History Line Chart with Moving Average Trend (Decomposed Component) */}
      <WeightTrendChart
        logsWithMovingAvg={logsWithMovingAvg}
        targetWeight={targetWeight}
        currentWeight={currentWeight}
        allWeightLogs={sortedAllLogs}
      />

      {/* 4. AI-Powered Scientific Health Facts & Insights */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Bot className="w-3.5 h-3.5 text-[#2D503C]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                AI Science & Health Facts
              </h3>
              <span className="text-[9px] text-stone-400 font-bold block mt-0.5">
                Evidence-based physiology analysis
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin text-[#3D6B52]' : ''}`} />
          </button>
        </div>

        <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/15 rounded-xl text-xs text-[#24201D] leading-relaxed whitespace-pre-line font-medium">
          {isGeneratingSummary ? (
            <div className="flex items-center gap-2 text-stone-500 py-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3D6B52]" />
              <span>Analyzing metabolic telemetry and scientific literature...</span>
            </div>
          ) : (
            aiSummary || 'Tap the refresh button to generate an evidence-based clinical analysis.'
          )}
        </div>
      </div>

      {/* 5. Weigh-In History List (Decomposed Component) */}
      <WeightHistoryList
        weightLogs={sortedAllLogs}
        onDeleteLog={onDeleteWeightLog}
      />

      {/* Modals */}
      <LogWeightModal
        isOpen={isLogWeightOpen}
        onClose={() => setIsLogWeightOpen(false)}
        onSaveWeight={handleSaveWeightInternal}
        currentWeight={currentWeight}
        heightCm={profile.height}
        selectedDate={selectedDate}
      />

      <HealthProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onSaveProfile={onUpdateProfile}
      />

      <MetricDetailModal
        info={activeMetricDetail}
        onClose={() => setActiveMetricDetail(null)}
      />
    </div>
  );
};
export default HealthBodyPage;
