import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Target,
  Bluetooth,
  Settings2,
  RefreshCw,
  Bot,
  Compass,
} from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import type { HealthProfile, CalculatedHealthMetrics, WeightLog } from '../../types/health';
import { LogWeightModal } from './LogWeightModal';
import { HealthProfileModal } from './HealthProfileModal';
import { HealthOnboardingWizard } from './HealthOnboardingWizard';
import { XiaomiScaleModal } from './XiaomiScaleModal';
import { calculateXiaomiBiometrics, type XiaomiBiometricMetrics } from '../../lib/xiaomiScale';
import { generateClinicalHealthSummaryAI } from '../../lib/aiHealthService';
import {
  computeWeightMovingAverage,
  computeWeeklyPace,
  computeProjectedGoalDate,
  filterWeightOutliers,
  calculateBmi,
} from '../../lib/healthFormulas';
import { db } from '../../lib/db';
import { useTranslation } from '../../i18n/LanguageContext';

// Decomposed Modular Subcomponents
import { ZeppBodyCompositionCard } from './body/ZeppBodyCompositionCard';
import { BiometricsGrid } from './body/BiometricsGrid';
import { WeightTrendChart } from './body/WeightTrendChart';
import { WeightHistoryList } from './body/WeightHistoryList';
import { MetricDetailModal, type MetricDetailModalInfo } from './body/MetricDetailModal';

interface HealthBodyPageProps {
  profile: HealthProfile;
  metrics: CalculatedHealthMetrics;
  weightLogs: WeightLog[];
  selectedDate: string;
  onSaveWeight: (
    weight: number,
    note?: string,
    date?: string,
    bodyFat?: number,
    waistCm?: number,
    scaleMetrics?: XiaomiBiometricMetrics
  ) => Promise<void>;
  onDeleteWeightLog: (id: number) => Promise<void>;
  onUpdateProfile: (updates: Partial<HealthProfile>) => Promise<void>;
  autoOpenWizard?: boolean;
  onWizardHandled?: () => void;
}

export const HealthBodyPage: React.FC<HealthBodyPageProps> = ({
  profile,
  metrics,
  weightLogs,
  selectedDate,
  onSaveWeight,
  onDeleteWeightLog,
  onUpdateProfile,
  autoOpenWizard,
  onWizardHandled,
}) => {
  const { t, language } = useTranslation();
  const [isLogWeightOpen, setIsLogWeightOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [activeMetricDetail, setActiveMetricDetail] = useState<MetricDetailModalInfo | null>(null);

  // Guided Health Onboarding State
  const [isOnboarded, setIsOnboarded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_health_onboarded') === 'true';
    }
    return false;
  });

  const [isOnboardingSkipped, setIsOnboardingSkipped] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kairo_health_onboarded') === 'skipped';
    }
    return false;
  });

  // Never auto-open wizard on initial app mount; only open when explicitly commanded by autoOpenWizard
  const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState(false);

  useEffect(() => {
    if (autoOpenWizard) {
      setIsOnboardingWizardOpen(true);
      onWizardHandled?.();
    }
  }, [autoOpenWizard, onWizardHandled]);

  const handleCloseWizard = () => {
    setIsOnboardingWizardOpen(false);
    if (typeof window !== 'undefined') {
      const status = localStorage.getItem('kairo_health_onboarded');
      setIsOnboarded(status === 'true');
      setIsOnboardingSkipped(status === 'skipped');
    }
  };

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

  // Outlier-sanitized weight logs (filters out legacy halved readings)
  const sanitizedLogs = useMemo(() => {
    return filterWeightOutliers(sortedAllLogs, currentWeight);
  }, [sortedAllLogs, currentWeight]);

  // Smoothed Moving Average Logs (using consolidated, sanitized daily data)
  const logsWithMovingAvg = useMemo(() => {
    return computeWeightMovingAverage(sanitizedLogs, 7, currentWeight);
  }, [sanitizedLogs, currentWeight]);

  // Real initial starting weight from earliest valid log
  const startingWeight = sanitizedLogs.length > 0 ? sanitizedLogs[0].weight : currentWeight;

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
    return computeWeeklyPace(sanitizedLogs, currentWeight);
  }, [sanitizedLogs, currentWeight]);

  const projectedGoal = useMemo(() => {
    return computeProjectedGoalDate(currentWeight, targetWeight, profile.goal, weeklyPaceInfo.paceKgPerWeek);
  }, [currentWeight, targetWeight, profile.goal, weeklyPaceInfo]);

  // Delta vs previous weigh-in log
  const previousLog = sanitizedLogs.length > 1 ? sanitizedLogs[sanitizedLogs.length - 2] : null;
  const deltaFromPrev = previousLog ? Number((currentWeight - previousLog.weight).toFixed(1)) : null;

  // One-time self-healing check on mount to heal/clean corrupt halved logs in Dexie db
  useEffect(() => {
    const healCorruptLogs = async () => {
      try {
        if (currentWeight > 55) {
          const corrupt = await db.weightLogs
            .filter((l) => typeof l.weight === 'number' && l.weight < 45 && l.weight > 20)
            .toArray();
          if (corrupt.length > 0) {
            for (const item of corrupt) {
              if (item.id) {
                const sameDayValid = await db.weightLogs
                  .where('date')
                  .equals(item.date)
                  .filter((l) => l.weight > 50)
                  .first();
                if (sameDayValid) {
                  await db.weightLogs.delete(item.id);
                } else {
                  await db.weightLogs.update(item.id, {
                    weight: Number((item.weight * 2).toFixed(1)),
                    bmi: calculateBmi(item.weight * 2, profile.height),
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('Healing legacy logs:', e);
      }
    };
    healCorruptLogs();
  }, [currentWeight, profile.height]);

  // BMI Gauge indicator position (15 to 35 range mapped to 0% - 100%)
  const gaugePercent = Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100));

  // Generate / refresh AI clinical summary
  const handleGenerateSummary = async () => {
    if (currentWeight <= 0) return;
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
    if (!aiSummary && profile.currentWeight > 0) {
      handleGenerateSummary();
    }
  }, [profile.currentWeight, profile.targetWeight, profile.goal, profile.height, profile.age]);

  // Find latest log that has saved Zepp Life metrics
  const latestLogWithMetrics = useMemo(() => {
    for (let i = sortedAllLogs.length - 1; i >= 0; i--) {
      if (sortedAllLogs[i].metrics) {
        return sortedAllLogs[i];
      }
    }
    return null;
  }, [sortedAllLogs]);

  // Compute active Zepp Life biometrics (using saved scale metrics or estimated from current profile)
  const activeBiometrics = useMemo(() => {
    if (latestLogWithMetrics?.metrics) {
      return latestLogWithMetrics.metrics;
    }
    if (currentWeight > 0) {
      return calculateXiaomiBiometrics(
        currentWeight,
        500, // standard clinical baseline resistance
        profile.height || 178,
        profile.age || 26,
        profile.gender || 'male'
      );
    }
    return undefined;
  }, [latestLogWithMetrics, currentWeight, profile.height, profile.age, profile.gender]);

  const handleSaveWeightInternal = async (
    weight: number,
    note?: string,
    date?: string,
    bodyFat?: number,
    waistCmVal?: number,
    scaleMetrics?: XiaomiBiometricMetrics
  ) => {
    await onSaveWeight(weight, note, date, bodyFat, waistCmVal, scaleMetrics);
    setTimeout(() => {
      handleGenerateSummary();
    }, 300);
  };

  const handleSaveScaleReading = async (
    weight: number,
    bodyFat?: number,
    scaleMetrics?: XiaomiBiometricMetrics
  ) => {
    await handleSaveWeightInternal(
      weight,
      'Smart Scale (Bio-Impedance)',
      undefined,
      bodyFat,
      profile.waistCm,
      scaleMetrics
    );

    const profileUpdates: Partial<HealthProfile> = {
      currentWeight: weight,
      updatedAt: Date.now(),
    };
    await onUpdateProfile(profileUpdates);
  };

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      {/* Onboarding / Calibration Banner if Skipped or Uncalibrated */}
      {(isOnboardingSkipped || currentWeight <= 0) && (
        <div className="p-3 bg-[#FBECCF] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#24201D] flex items-center justify-center shrink-0 shadow-2xs">
              <Compass className="w-4 h-4 text-[#854D0E] stroke-[2.25]" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-[#854D0E] font-display uppercase tracking-wide truncate">
                {currentWeight <= 0 ? t('healthBody.calibrateBannerTitle') : t('healthBody.calibrateProfile')}
              </h4>
              <p className="text-[10px] text-[#854D0E]/80 font-medium truncate">
                {currentWeight <= 0
                  ? t('healthBody.calibrateBannerDesc')
                  : t('healthBody.calibrateBannerDesc')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsOnboardingWizardOpen(true);
            }}
            className="py-1.5 px-3 rounded-xl bg-[#854D0E] hover:bg-[#6D3E0B] text-white border border-[#24201D] text-xs font-black shadow-2xs active:translate-y-0.5 transition-all cursor-pointer shrink-0 font-display uppercase tracking-wider"
          >
            {t('healthBody.calibrateProfile')}
          </button>
        </div>
      )}

      {/* 1. Hero BMI & Weight Card */}
      <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-4">
        {/* Top bar - spacious, uncluttered */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
              <Scale className="w-4 h-4 text-[#2D503C]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
                {t('healthBody.telemetryTitle')}
              </span>
              <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
                {t('healthBody.telemetrySubtitle')}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsProfileOpen(true);
            }}
            title={t('healthBody.editProfileParams')}
            className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Settings2 className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Big Weight Numbers & BMI Badge */}
        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
              {t('healthBody.currentWeight')}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-4xl sm:text-5xl font-black font-mono-num text-[#24201D] tracking-tight">
                {currentWeight > 0 ? currentWeight : '—'}
              </span>
              {currentWeight > 0 && (
                <span className="text-sm font-black text-[#6B635B] uppercase font-display">
                  kg
                </span>
              )}

              {currentWeight > 0 && deltaFromPrev !== null && deltaFromPrev !== 0 && (
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
              {t('healthBody.bmiLabel')}
            </span>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-2xl font-black font-mono-num text-[#24201D]">
                {bmi > 0 ? bmi : '—'}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-2xs"
                style={{ backgroundColor: bmiColor }}
              >
                {bmi > 0 ? (
                  metrics.bmiCategory === 'underweight'
                    ? (language === 'ru' ? 'Дефицит' : language === 'uz' ? 'Kam vazn' : 'Underweight')
                    : metrics.bmiCategory === 'normal'
                    ? (language === 'ru' ? 'Норма' : language === 'uz' ? 'Meʼyor' : 'Normal')
                    : metrics.bmiCategory === 'overweight'
                    ? (language === 'ru' ? 'Избыток' : language === 'uz' ? 'Ortiqcha' : 'Overweight')
                    : metrics.bmiCategory === 'obese'
                    ? (language === 'ru' ? 'Ожирение' : language === 'uz' ? 'Semizlik' : 'Obese')
                    : bmiCategoryLabel.split(' ')[0]
                ) : '—'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#6B635B] block">
              {idealWeightMin > 0 ? t('healthBody.idealRange', { min: idealWeightMin, max: idealWeightMax }) : `${language === 'ru' ? 'Идеал' : 'Ideal'}: —`}
            </span>
          </div>
        </div>

        {/* Dedicated Action Strip: Smart Scale & Weigh-In (Side-by-side, no crowding) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Unique Smart Scale Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsScaleModalOpen(true);
            }}
            title={t('healthBody.scaleConnectBtn')}
            className="py-2.5 px-3 bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-black shadow-[2px_2px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all flex items-center justify-center gap-2 uppercase tracking-wider font-display"
          >
            <Scale className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span>{t('healthBody.scaleConnectBtn')}</span>
          </button>

          {/* Clean Weigh-In Button (without '+' icon) */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsLogWeightOpen(true);
            }}
            className="py-2.5 px-3 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-black shadow-[2px_2px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all flex items-center justify-center uppercase tracking-wider font-display"
          >
            {t('healthBody.logWeightBtn')}
          </button>
        </div>

        {/* BMI Color Gauge Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[9px] font-bold text-[#6B635B] uppercase font-mono-num">
            <span>&lt;18.5 {t('healthBody.underweight')}</span>
            <span>18.5 – 24.9 {t('healthBody.normal')}</span>
            <span>25 – 29.9 {t('healthBody.overweight')}</span>
            <span>30+ {t('healthBody.obese')}</span>
          </div>

          <div className="relative w-full h-3 rounded-full border border-[#24201D] overflow-hidden flex shadow-2xs">
            <div className="h-full bg-[#60A5FA]" style={{ width: '22%' }} title={t('healthBody.underweight')} />
            <div className="h-full bg-[#86EFAC]" style={{ width: '32%' }} title={t('healthBody.normal')} />
            <div className="h-full bg-[#FDE047]" style={{ width: '25%' }} title={t('healthBody.overweight')} />
            <div className="h-full bg-[#F87171]" style={{ width: '21%' }} title={t('healthBody.obese')} />
          </div>

          {/* Marker pointer */}
          {bmi > 0 && (
            <div className="relative w-full h-2">
              <div
                className="absolute -top-1 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-[#24201D] transition-all duration-300"
                style={{ left: `${gaugePercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Live Goal Progress & Pace Milestones */}
        <div className="p-3.5 bg-[#FBECCF] border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#854D0E]" />
              <span className="text-[11px] font-black font-display uppercase tracking-wider text-[#854D0E]">
                {targetWeight > 0 ? t('healthBody.goalTitle', { weight: targetWeight, goal: profile.goal.toUpperCase() }) : t('healthBody.goalNotSet')}
              </span>
            </div>
            {targetWeight > 0 && currentWeight > 0 ? (
              <span className="text-xs font-black font-mono-num text-[#24201D] px-2 py-0.5 rounded-lg bg-white border border-[#24201D]/20 shadow-2xs">
                {t('healthBody.donePercent', { percent: progressPercent })}
              </span>
            ) : (
              <span className="text-xs font-bold text-[#854D0E] font-display uppercase tracking-wider">
                {t('healthBody.setupTarget')}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-white border border-[#24201D] rounded-full overflow-hidden p-0.5 shadow-2xs">
            <div
              className="h-full bg-[#3D6B52] rounded-full transition-all duration-500"
              style={{ width: targetWeight > 0 && currentWeight > 0 ? `${progressPercent}%` : '0%' }}
            />
          </div>

          {/* Start vs Current vs Goal Markers */}
          <div className="flex items-center justify-between text-[10px] font-bold text-[#6B635B] pt-0.5">
            <span>{t('healthBody.startLabel')} <b className="font-mono-num text-[#24201D]">{startingWeight > 0 ? `${startingWeight}kg` : '—'}</b></span>
            <span>{t('healthBody.nowLabel')} <b className="font-mono-num text-[#24201D]">{currentWeight > 0 ? `${currentWeight}kg` : '—'}</b></span>
            <span>{t('healthBody.targetLabel')} <b className="font-mono-num text-[#24201D]">{targetWeight > 0 ? `${targetWeight}kg` : '—'}</b></span>
          </div>

          {/* Rate of Change & ETA Badge */}
          {targetWeight > 0 && currentWeight > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#854D0E]/20">
              <div className="p-2 bg-white/80 border border-[#24201D]/20 rounded-xl space-y-0.5">
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block font-display">
                  {t('healthBody.weeklyPace')}:
                </span>
                <span className={`text-[11px] font-black font-mono-num block ${weeklyPaceInfo.isOptimal ? 'text-[#2D503C]' : 'text-[#854D0E]'}`}>
                  {weeklyPaceInfo.paceLabel}
                </span>
              </div>

              <div className="p-2 bg-white/80 border border-[#24201D]/20 rounded-xl space-y-0.5">
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block font-display">
                  {t('healthBody.projectedFinish')}:
                </span>
                <span className="text-[11px] font-black font-mono-num text-[#24201D] block">
                  {projectedGoal.dateString}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Zepp Life Clinical Body Composition Breakdown */}
      <ZeppBodyCompositionCard
        profile={profile}
        metrics={activeBiometrics}
        latestLog={latestLogWithMetrics || sortedAllLogs[sortedAllLogs.length - 1]}
        previousLog={previousLog}
        onOpenScaleModal={() => setIsScaleModalOpen(true)}
        onSelectMetric={(info) => setActiveMetricDetail(info)}
      />

      {/* 3. Clinical Body Composition & Metabolic Grid (Decomposed Component) */}
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
        allWeightLogs={sanitizedLogs}
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
                {t('healthBody.aiClinicalSummary')}
              </h3>
              <span className="text-[9px] text-stone-400 font-bold block mt-0.5">
                {t('healthBody.evidenceAnalysis')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || currentWeight <= 0}
            className="p-1.5 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title={t('healthBody.refreshSummary')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin text-[#3D6B52]' : ''}`} />
          </button>
        </div>

        <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/15 rounded-xl text-xs text-[#24201D] leading-relaxed whitespace-pre-line font-medium">
          {isGeneratingSummary ? (
            <div className="flex items-center gap-2 text-stone-500 py-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3D6B52]" />
              <span>{t('healthBody.generatingSummary')}</span>
            </div>
          ) : currentWeight <= 0 ? (
            t('healthBody.calibrateBannerDesc')
          ) : (
            aiSummary || t('healthBody.refreshSummary')
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
        onClose={() => {
          setIsProfileOpen(false);
          if (typeof window !== 'undefined') {
            const status = localStorage.getItem('kairo_health_onboarded');
            setIsOnboarded(status === 'true');
            setIsOnboardingSkipped(status === 'skipped');
          }
        }}
        profile={profile}
        onSaveProfile={onUpdateProfile}
      />

      <HealthOnboardingWizard
        isOpen={isOnboardingWizardOpen}
        onClose={handleCloseWizard}
        profile={profile}
        onSaveProfile={onUpdateProfile}
        onSaveInitialWeight={async (w) => {
          await onSaveWeight(w);
        }}
        hasExistingWeightLogs={weightLogs.length > 0}
      />

      <MetricDetailModal
        info={activeMetricDetail}
        onClose={() => setActiveMetricDetail(null)}
      />

      <XiaomiScaleModal
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
        profile={profile}
        onSaveReading={handleSaveScaleReading}
      />
    </div>
  );
};
export default HealthBodyPage;
