import React from 'react';
import {
  X,
  CheckCircle2,
  Microscope,
  Activity,
  Target,
  Flame,
  ShieldAlert,
  Gauge,
  Percent,
  Dumbbell,
  Droplets,
  Zap,
  Bone,
  Scale,
  Award,
  Check,
  AlertCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { playClickSound } from '../../../lib/sound';
import { useTranslation } from '../../../i18n/LanguageContext';

export interface MetricDetailModalInfo {
  title: string;
  value: string;
  category: string;
  description: string;
  formula: string;
  clinicalTip: string;
  statusType?: 'optimal' | 'attention' | 'alert';
  statusLabel?: string;
  normRange?: string;
  numericValue?: number;
  unit?: string;
  metricId?: string;
}

interface MetricDetailModalProps {
  info: MetricDetailModalInfo | null;
  onClose: () => void;
}

export function getMetricGaugePercentage(
  metricId: string | undefined,
  numericValue: number | undefined
): number {
  if (numericValue === undefined || isNaN(numericValue)) return 50;

  switch (metricId) {
    case 'bmi': {
      // WHO Norm 18.5 - 24.9. Bounds: 15 to 35.
      return Math.min(95, Math.max(5, Math.round(((numericValue - 15) / 20) * 100)));
    }
    case 'bodyFat': {
      // Norm 10 - 20% (male) or 18 - 28% (female). Bounds: 5 to 40%.
      return Math.min(95, Math.max(5, Math.round(((numericValue - 5) / 35) * 100)));
    }
    case 'visceral': {
      // Norm 1 - 9. Bounds: 1 to 20.
      return Math.min(95, Math.max(5, Math.round(((numericValue - 1) / 19) * 100)));
    }
    case 'water': {
      // Norm 50 - 65%. Bounds: 40 to 75%.
      return Math.min(95, Math.max(5, Math.round(((numericValue - 40) / 35) * 100)));
    }
    case 'protein': {
      // Norm 16 - 22%. Bounds: 12 to 25%.
      return Math.min(95, Math.max(5, Math.round(((numericValue - 12) / 13) * 100)));
    }
    case 'muscle': {
      // Bounds: 30 to 80 kg.
      return Math.min(95, Math.max(5, Math.round(((numericValue - 30) / 50) * 100)));
    }
    case 'bone': {
      // Norm 2.5 - 3.8 kg. Bounds: 1.5 to 4.5 kg.
      return Math.min(95, Math.max(5, Math.round(((numericValue - 1.5) / 3.0) * 100)));
    }
    case 'bmr': {
      // Bounds: 1100 to 2300 kcal.
      return Math.min(95, Math.max(5, Math.round(((numericValue - 1100) / 1200) * 100)));
    }
    case 'whtr': {
      // Norm < 0.50. Bounds: 0.35 to 0.70.
      return Math.min(95, Math.max(5, Math.round(((numericValue - 0.35) / 0.35) * 100)));
    }
    default:
      return 50;
  }
}

export const MetricDetailModal: React.FC<MetricDetailModalProps> = ({ info, onClose }) => {
  const { t, language } = useTranslation();
  if (!info) return null;

  const getMetricIcon = () => {
    const id = info.metricId;
    const titleLower = info.title.toLowerCase();

    if (id === 'bmr' || titleLower.includes('bmr') || titleLower.includes('metabolic')) {
      return <Flame className="w-5 h-5 text-[#D97706]" />;
    }
    if (id === 'visceral' || titleLower.includes('visceral')) {
      return <ShieldAlert className="w-5 h-5 text-[#EA580C]" />;
    }
    if (id === 'bmi' || titleLower.includes('bmi')) {
      return <Gauge className="w-5 h-5 text-[#2563EB]" />;
    }
    if (id === 'bodyFat' || titleLower.includes('fat')) {
      return <Percent className="w-5 h-5 text-[#DC2626]" />;
    }
    if (id === 'muscle' || titleLower.includes('muscle') || titleLower.includes('lean')) {
      return <Dumbbell className="w-5 h-5 text-[#059669]" />;
    }
    if (id === 'water' || titleLower.includes('water') || titleLower.includes('hydration')) {
      return <Droplets className="w-5 h-5 text-[#0284C7]" />;
    }
    if (id === 'protein' || titleLower.includes('protein')) {
      return <Zap className="w-5 h-5 text-[#7C3AED]" />;
    }
    if (id === 'bone' || titleLower.includes('bone')) {
      return <Bone className="w-5 h-5 text-[#475569]" />;
    }
    if (id === 'whtr' || titleLower.includes('waist') || titleLower.includes('weight')) {
      return <Scale className="w-5 h-5 text-[#3D6B52]" />;
    }
    return <Award className="w-5 h-5 text-[#3D6B52]" />;
  };

  const statusType = info.statusType || (
    info.category.toLowerCase().includes('normal') || info.category.toLowerCase().includes('optimal')
      ? 'optimal'
      : info.category.toLowerCase().includes('attention') || info.category.toLowerCase().includes('cut') || info.category.toLowerCase().includes('bulk')
      ? 'attention'
      : 'alert'
  );

  const gaugePercent = getMetricGaugePercentage(info.metricId, info.numericValue);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#24201D]/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FAF8F5] border-[2px] border-[#24201D] rounded-3xl shadow-[5px_5px_0px_#24201D] p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto font-body select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Strip */}
        <div className="flex items-start justify-between gap-3 border-b-[1.75px] border-[#24201D]/15 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white border-[2px] border-[#24201D] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#24201D]">
              {getMetricIcon()}
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#6B635B] font-display block leading-none">
                {t('healthBody.telemetrySubtitle')}
              </span>
              <h3 className="text-base sm:text-lg font-black font-display text-[#24201D] mt-1 leading-tight truncate">
                {info.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white hover:bg-stone-100 border-[1.5px] border-[#24201D] text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
            title={t('common.cancel')}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Hero Measurement & Spectrum Card */}
        <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                {info.title}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black font-mono-num text-[#24201D] tracking-tight">
                  {info.value}
                </span>
              </div>
            </div>

            {/* Status Pill Badge */}
            <div className="text-right">
              {statusType === 'alert' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] border border-[#B91C1C]/30 text-[#B91C1C] text-xs font-black shadow-2xs font-display">
                  <ArrowDownCircle className="w-3.5 h-3.5 stroke-[2.5] text-[#DC2626] shrink-0" />
                  <span>{info.statusLabel || info.category}</span>
                </div>
              ) : statusType === 'attention' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBECCF] border border-[#B45309]/30 text-[#854D0E] text-xs font-black shadow-2xs font-display">
                  <AlertCircle className="w-3.5 h-3.5 stroke-[2.5] text-[#D97706] shrink-0" />
                  <span>{info.statusLabel || info.category}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DDE8DE] border border-[#2D503C]/30 text-[#2D503C] text-xs font-black shadow-2xs font-display">
                  <Check className="w-3.5 h-3.5 stroke-[3] text-[#2D503C] shrink-0" />
                  <span>{info.statusLabel || info.category}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stepped Reference Range Spectrum Bar */}
          <div className="pt-2 space-y-1.5 border-t border-[#24201D]/10">
            <div className="flex items-center justify-between text-[9px] font-black text-[#6B635B] uppercase font-display">
              <span className="text-blue-600">{t('healthBody.underweight')}</span>
              <span className="text-[#2D503C]">{t('healthBody.normal')}</span>
              <span className="text-rose-600">{t('healthBody.overweight')}</span>
            </div>

            <div className="relative w-full h-3 rounded-full border-[1.5px] border-[#24201D] overflow-hidden flex shadow-2xs bg-stone-100">
              <div className="h-full bg-[#93C5FD]" style={{ width: '25%' }} title={t('healthBody.underweight')} />
              <div className="h-full bg-[#86EFAC]" style={{ width: '50%' }} title={t('healthBody.normal')} />
              <div className="h-full bg-[#FCA5A5]" style={{ width: '25%' }} title={t('healthBody.overweight')} />
            </div>

            {/* Spectrum Marker Needle */}
            <div className="relative w-full h-3.5">
              <div
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
                style={{ left: `${gaugePercent}%` }}
              >
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-[#24201D]" />
                <span className="text-[8px] font-black font-mono-num text-[#24201D] leading-none mt-0.5">
                  ●
                </span>
              </div>
            </div>

            {info.normRange && (
              <div className="p-2 bg-[#FAF8F5] border border-[#24201D]/15 rounded-xl flex items-center justify-between text-[10px] font-bold text-[#6B635B]">
                <span>{t('zepp.normRange')}:</span>
                <span className="font-mono-num font-black text-[#24201D]">
                  {info.normRange}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Physiological Mechanism & Science */}
        <div className="p-4 bg-white border border-[#24201D]/20 rounded-2xl space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
            <Microscope className="w-4 h-4 text-[#3D6B52]" />
            <span>{t('healthBody.evidenceAnalysis')}</span>
          </div>
          <p className="text-xs text-[#24201D] leading-relaxed font-medium">
            {info.description}
          </p>
        </div>

        {/* Section 2: Clinical Formula / Protocol */}
        <div className="p-3.5 bg-[#DDE8DE]/60 border border-[#3D6B52]/30 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#2D503C] font-display">
            <Activity className="w-4 h-4 text-[#2D503C]" />
            <span>{language === 'ru' ? 'Формула' : language === 'uz' ? 'Formula' : 'Formula'}</span>
          </div>
          <div className="p-2.5 bg-white/80 border border-[#2D503C]/20 rounded-xl">
            <span className="text-xs font-mono font-bold text-[#24201D] block break-all">
              {info.formula}
            </span>
          </div>
        </div>

        {/* Section 3: Evidence-Based Recommendation */}
        <div className="p-4 bg-[#FBECCF] border border-[#854D0E]/30 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#854D0E] font-display">
            <Target className="w-4 h-4 text-[#854D0E]" />
            <span>{language === 'ru' ? 'Рекомендация' : language === 'uz' ? 'Tavsiya' : 'Recommendation'}</span>
          </div>
          <p className="text-xs font-bold text-[#713F12] leading-relaxed">
            {info.clinicalTip}
          </p>
        </div>

        {/* Got It Dismiss Button */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full py-3 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] uppercase tracking-wider font-display cursor-pointer active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('common.done')}</span>
        </button>
      </div>
    </div>
  );
};
