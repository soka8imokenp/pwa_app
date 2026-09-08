import React, { useState, useMemo } from 'react';
import {
  Flame,
  ShieldAlert,
  Gauge,
  Percent,
  Dumbbell,
  Droplets,
  Zap,
  Bone,
  Scale,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowDownCircle,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { playClickSound } from '../../../lib/sound';
import type { HealthProfile, WeightLog } from '../../../types/health';
import type { XiaomiBiometricMetrics, ZeppMetricItem } from '../../../lib/xiaomiScale';
import { type MetricDetailModalInfo, getMetricGaugePercentage } from './MetricDetailModal';

interface ZeppBodyCompositionCardProps {
  profile: HealthProfile;
  metrics?: XiaomiBiometricMetrics;
  latestLog?: WeightLog;
  previousLog?: WeightLog | null;
  onOpenScaleModal: () => void;
  onSelectMetric?: (info: MetricDetailModalInfo) => void;
}

type FilterTab = 'all' | 'achieved' | 'attention' | 'not_reached';

export const ZeppBodyCompositionCard: React.FC<ZeppBodyCompositionCardProps> = ({
  profile,
  metrics,
  latestLog,
  previousLog,
  onOpenScaleModal,
  onSelectMetric,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Calculate delta progress vs previous weigh-in
  const currentWeight = latestLog?.weight ?? profile.currentWeight;
  const prevWeight = previousLog?.weight;
  const deltaKg = prevWeight !== undefined ? Number((currentWeight - prevWeight).toFixed(1)) : 0;
  const deltaSign = deltaKg > 0 ? `+${deltaKg}` : `${deltaKg}`;

  // Metric groups
  const notReachedItems = useMemo(
    () => metrics?.items.filter((i) => i.group === 'not_reached') || [],
    [metrics]
  );
  const attentionItems = useMemo(
    () => metrics?.items.filter((i) => i.group === 'attention') || [],
    [metrics]
  );
  const achievedItems = useMemo(
    () => metrics?.items.filter((i) => i.group === 'achieved') || [],
    [metrics]
  );

  // Filtered metric list
  const displayItems = useMemo(() => {
    if (!metrics) return [];
    if (activeFilter === 'achieved') return achievedItems;
    if (activeFilter === 'attention') return attentionItems;
    if (activeFilter === 'not_reached') return notReachedItems;
    return metrics.items;
  }, [metrics, activeFilter, achievedItems, attentionItems, notReachedItems]);

  if (!metrics) {
    return (
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-3xl shadow-[3px_3px_0px_#24201D] space-y-3 font-body select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center text-[#2D503C] shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display block leading-none">
                Clinical Telemetry
              </span>
              <h3 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
                Body Composition (Bio-Impedance)
              </h3>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl text-center space-y-2.5">
          <p className="text-xs text-[#6B635B] font-medium leading-relaxed max-w-xs mx-auto">
            Step onto your smart scale barefoot to unlock your full bio-impedance composition breakdown: body score, lean muscle mass, hydration, visceral fat, and somatic classification.
          </p>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenScaleModal();
            }}
            className="py-2.5 px-4 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-black shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 transition-all inline-flex items-center gap-2 cursor-pointer font-display uppercase tracking-wider"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Weigh In on Smart Scale</span>
          </button>
        </div>
      </div>
    );
  }

  const getMetricIcon = (id: ZeppMetricItem['id']) => {
    switch (id) {
      case 'bmr':
        return <Flame className="w-4 h-4 text-[#D97706]" />;
      case 'visceral':
        return <ShieldAlert className="w-4 h-4 text-[#EA580C]" />;
      case 'bmi':
        return <Gauge className="w-4 h-4 text-[#2563EB]" />;
      case 'bodyFat':
        return <Percent className="w-4 h-4 text-[#DC2626]" />;
      case 'muscle':
        return <Dumbbell className="w-4 h-4 text-[#059669]" />;
      case 'water':
        return <Droplets className="w-4 h-4 text-[#0284C7]" />;
      case 'protein':
        return <Zap className="w-4 h-4 text-[#7C3AED]" />;
      case 'bone':
        return <Bone className="w-4 h-4 text-[#475569]" />;
      default:
        return <Award className="w-4 h-4 text-[#3D6B52]" />;
    }
  };

  const handleItemClick = (item: ZeppMetricItem) => {
    playClickSound();
    if (onSelectMetric) {
      onSelectMetric({
        title: item.title,
        value: `${item.valueFormatted} ${item.unit}`.trim(),
        category: item.statusLabel,
        description: item.description,
        formula: item.normRange,
        clinicalTip: `Clinical target range: ${item.normRange}. Evaluated current status: ${item.statusLabel}.`,
        statusType: item.statusType,
        statusLabel: item.statusLabel,
        normRange: item.normRange,
        numericValue: item.value,
        unit: item.unit,
        metricId: item.id,
      });
    }
  };

  const renderBadge = (statusType: ZeppMetricItem['statusType'], label: string) => {
    if (statusType === 'alert') {
      return (
        <span className="text-[10px] font-black text-[#991B1B] bg-[#FEE2E2] px-2.5 py-1 rounded-full border border-[#991B1B]/30 shadow-2xs font-display flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0 animate-pulse" />
          <span>{label}</span>
        </span>
      );
    }
    if (statusType === 'attention') {
      return (
        <span className="text-[10px] font-black text-[#854D0E] bg-[#FBECCF] px-2.5 py-1 rounded-full border border-[#854D0E]/30 shadow-2xs font-display flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-black text-[#2D503C] bg-[#DDE8DE] px-2.5 py-1 rounded-full border border-[#2D503C]/30 shadow-2xs font-display flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
        <span>{label}</span>
      </span>
    );
  };

  // Radial Gauge Calculations
  const score = metrics.bodyScore;
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const scoreColor =
    score >= 85 ? '#3D6B52' : score >= 70 ? '#E09F3E' : '#C25E40';

  const scoreEvaluation =
    score >= 85
      ? 'Optimal Vitality'
      : score >= 70
      ? 'Solid Condition'
      : 'Needs Attention';

  const renderMetricCard = (item: ZeppMetricItem) => {
    const gaugePercent = getMetricGaugePercentage(item.id, item.value);

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleItemClick(item)}
        className="w-full p-3 sm:p-3.5 bg-white hover:bg-[#FAF8F5] border-[1.5px] border-[#24201D]/20 hover:border-[#24201D] rounded-2xl flex flex-col gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-2xs group text-left"
      >
        {/* Top row: Icon, Title & Value + Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] group-hover:bg-white border border-[#24201D]/20 flex items-center justify-center shrink-0 shadow-2xs transition-colors">
              {getMetricIcon(item.id)}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black font-display text-[#24201D] leading-tight truncate">
                {item.title}
              </h4>
              <span className="text-[10px] text-[#6B635B] font-medium block truncate">
                Target: {item.normRange}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-sm font-black font-mono-num text-[#24201D] leading-none">
                  {item.valueFormatted}
                </span>
                {item.unit && (
                  <span className="text-[10px] font-bold text-[#6B635B] leading-none">
                    {item.unit}
                  </span>
                )}
              </div>
            </div>
            {renderBadge(item.statusType, item.statusLabel)}
            <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-[#24201D] transition-colors shrink-0" />
          </div>
        </div>

        {/* Mini 3-Zone Reference Spectrum */}
        <div className="pt-1 space-y-1">
          <div className="relative w-full h-1.5 rounded-full bg-stone-100 border border-[#24201D]/25 overflow-hidden flex shadow-2xs">
            <div className="h-full bg-[#93C5FD]" style={{ width: '25%' }} title="Low" />
            <div className="h-full bg-[#86EFAC]" style={{ width: '50%' }} title="Normal" />
            <div className="h-full bg-[#FCA5A5]" style={{ width: '25%' }} title="High" />
          </div>

          <div className="relative w-full h-2">
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
              style={{ left: `${gaugePercent}%` }}
            >
              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-[#24201D]" />
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="bg-white border-[1.75px] border-[#24201D] rounded-3xl shadow-[3px_3px_0px_#24201D] overflow-hidden font-body select-none">
      {/* Top Identity & Action Header */}
      <div className="p-3.5 sm:p-4 bg-[#FAF8F5] border-b-[1.75px] border-[#24201D]/15 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center font-black font-display text-xs text-[#2D503C] shadow-2xs shrink-0">
            {profile.name ? profile.name.slice(0, 1).toUpperCase() : 'B'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black font-display text-[#24201D] truncate">
                {profile.name || 'Bek Sama'}
              </span>
              <span className="px-1.5 py-0.2 rounded-md bg-white border border-[#24201D]/20 text-[9px] font-bold text-[#6B635B] uppercase font-mono-num shrink-0">
                BIA
              </span>
            </div>
            <span className="text-[10px] text-[#6B635B] font-medium block">
              {latestLog?.date
                ? new Date(latestLog.date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Today'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
            8 Parameters
          </span>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsExpanded(!isExpanded);
            }}
            className="p-1.5 rounded-xl bg-white hover:bg-stone-100 border border-[#24201D] text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Luxury Centerpiece: Radial Score Meter & Vitals */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-[#FAF8F5] via-white to-[#F5EFE6] border-b-[1.75px] border-[#24201D]/15 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          {/* Left: Circular Score Gauge (Radial Meter) */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white border border-[#24201D]/20 rounded-2xl shadow-2xs">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                {/* Background Ring */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#E8E0D2"
                  strokeWidth="7"
                  fill="none"
                />
                {/* Active Score Ring */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke={scoreColor}
                  strokeWidth="7"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Inside Score Typography */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black font-mono-num text-[#24201D] tracking-tight leading-none">
                  {score}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#6B635B] font-display mt-1 leading-none">
                  BODY SCORE
                </span>
              </div>
            </div>

            {/* Score Tier Badge */}
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DDE8DE] border border-[#2D503C]/25 text-[#2D503C] text-[10px] font-black font-display shadow-2xs">
              <Sparkles className="w-3 h-3" />
              <span>{scoreEvaluation}</span>
            </div>
          </div>

          {/* Right: Somatotype & Scale Telemetry Micro-Cards */}
          <div className="sm:col-span-7 grid grid-cols-2 gap-2.5">
            {/* Physique Somatotype */}
            <div className="p-3 bg-white border border-[#24201D]/20 rounded-2xl shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
                <Award className="w-3.5 h-3.5 text-[#3D6B52]" />
                <span>Physique</span>
              </div>
              <span className="text-base font-black font-display text-[#24201D] block truncate leading-tight mt-0.5">
                {metrics.bodyType}
              </span>
              <span className="text-[9px] text-stone-400 font-bold block truncate">
                9-Box Somatotype
              </span>
            </div>

            {/* Current Weight & Delta */}
            <div className="p-3 bg-white border border-[#24201D]/20 rounded-2xl shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
                <Scale className="w-3.5 h-3.5 text-[#2D503C]" />
                <span>Scale Weight</span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-black font-mono-num text-[#24201D] leading-tight">
                  {currentWeight.toFixed(2)}
                </span>
                <span className="text-[10px] font-bold text-[#6B635B]">kg</span>
              </div>
              <div className="flex items-center gap-1">
                {prevWeight !== undefined ? (
                  deltaKg < 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#2D503C] font-mono-num">
                      <TrendingDown className="w-3 h-3 text-[#2D503C]" />
                      <span>{deltaSign} kg</span>
                    </span>
                  ) : deltaKg > 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#C25E40] font-mono-num">
                      <TrendingUp className="w-3 h-3 text-[#C25E40]" />
                      <span>{deltaSign} kg</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#6B635B] font-mono-num">
                      <Minus className="w-3 h-3" />
                      <span>0.0 kg</span>
                    </span>
                  )
                ) : (
                  <span className="text-[9px] text-stone-400 font-bold">Baseline</span>
                )}
              </div>
            </div>

            {/* Goal Ratio Bar */}
            <div className="col-span-2 p-3 bg-white border border-[#24201D]/20 rounded-2xl shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider font-display">
                <span className="text-[#24201D]">Biomarkers Health Distribution</span>
                <span className="text-[#2D503C] font-mono-num">{achievedItems.length} of 8 Met</span>
              </div>

              {/* Segmented Distribution Bar */}
              <div className="w-full h-2.5 rounded-full bg-stone-100 border border-[#24201D]/25 overflow-hidden flex shadow-2xs">
                <div
                  className="h-full bg-[#3D6B52] transition-all duration-500"
                  style={{ width: `${(achievedItems.length / 8) * 100}%` }}
                  title={`${achievedItems.length} Targets Achieved`}
                />
                <div
                  className="h-full bg-[#E09F3E] transition-all duration-500"
                  style={{ width: `${(attentionItems.length / 8) * 100}%` }}
                  title={`${attentionItems.length} Need Attention`}
                />
                <div
                  className="h-full bg-[#C25E40] transition-all duration-500"
                  style={{ width: `${(notReachedItems.length / 8) * 100}%` }}
                  title={`${notReachedItems.length} Below Target`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Accordion Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-[#FAF8F5] space-y-4">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveFilter('all');
              }}
              className={`py-1 px-3 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'bg-white hover:bg-stone-100 text-[#6B635B] border border-[#24201D]/20'
              }`}
            >
              All (8)
            </button>

            {achievedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFilter('achieved');
                }}
                className={`py-1 px-3 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                  activeFilter === 'achieved'
                    ? 'bg-[#2D503C] text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-[#2D503C] border border-[#24201D]/20'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Achieved ({achievedItems.length})</span>
              </button>
            )}

            {attentionItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFilter('attention');
                }}
                className={`py-1 px-3 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                  activeFilter === 'attention'
                    ? 'bg-[#854D0E] text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-[#854D0E] border border-[#24201D]/20'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Attention ({attentionItems.length})</span>
              </button>
            )}

            {notReachedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFilter('not_reached');
                }}
                className={`py-1 px-3 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                  activeFilter === 'not_reached'
                    ? 'bg-[#991B1B] text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-[#991B1B] border border-[#24201D]/20'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>Below ({notReachedItems.length})</span>
              </button>
            )}
          </div>

          {/* Cards List */}
          <div className="space-y-2">
            {displayItems.map(renderMetricCard)}
          </div>

          {/* Footer Controls & Citations */}
          <div className="pt-2 border-t border-[#24201D]/15 flex items-center justify-between text-[10px] text-[#6B635B]">
            <span className="font-medium">
              Clinical BIA Telemetry (openScale & Zepp)
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onOpenScaleModal();
              }}
              className="py-1 px-2.5 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D]/30 text-[#3D6B52] font-black cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:translate-y-0.5 transition-all font-display uppercase tracking-wider"
            >
              <Scale className="w-3.5 h-3.5 text-[#3D6B52]" />
              <span>New Weigh-In</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
