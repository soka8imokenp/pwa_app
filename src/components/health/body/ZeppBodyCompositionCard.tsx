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
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowDownCircle,
  TrendingDown,
  TrendingUp,
  Minus,
  Check,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { playClickSound } from '../../../lib/sound';
import type { HealthProfile, WeightLog } from '../../../types/health';
import type { XiaomiBiometricMetrics, ZeppMetricItem } from '../../../lib/xiaomiScale';
import type { MetricDetailModalInfo } from './MetricDetailModal';

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
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display block leading-none">
                Clinical Telemetry
              </span>
              <h3 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
                Body Composition Analysis
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

  const getMetricVisuals = (id: ZeppMetricItem['id']) => {
    switch (id) {
      case 'bmr':
        return {
          icon: <Flame className="w-4 h-4 text-[#D97706]" />,
          bg: 'bg-[#FEF3C7] border-[#D97706]/35 text-[#D97706]',
        };
      case 'visceral':
        return {
          icon: <ShieldAlert className="w-4 h-4 text-[#EA580C]" />,
          bg: 'bg-[#FFEDD5] border-[#EA580C]/35 text-[#EA580C]',
        };
      case 'bmi':
        return {
          icon: <Gauge className="w-4 h-4 text-[#2563EB]" />,
          bg: 'bg-[#EFF6FF] border-[#3B82F6]/35 text-[#2563EB]',
        };
      case 'bodyFat':
        return {
          icon: <Percent className="w-4 h-4 text-[#DC2626]" />,
          bg: 'bg-[#FEE2E2] border-[#EF4444]/35 text-[#DC2626]',
        };
      case 'muscle':
        return {
          icon: <Dumbbell className="w-4 h-4 text-[#059669]" />,
          bg: 'bg-[#DCFCE7] border-[#10B981]/35 text-[#059669]',
        };
      case 'water':
        return {
          icon: <Droplets className="w-4 h-4 text-[#0284C7]" />,
          bg: 'bg-[#E0F2FE] border-[#06B6D4]/35 text-[#0284C7]',
        };
      case 'protein':
        return {
          icon: <Zap className="w-4 h-4 text-[#7C3AED]" />,
          bg: 'bg-[#F3E8FF] border-[#8B5CF6]/35 text-[#7C3AED]',
        };
      case 'bone':
        return {
          icon: <Bone className="w-4 h-4 text-[#475569]" />,
          bg: 'bg-[#F1F5F9] border-[#64748B]/35 text-[#475569]',
        };
      default:
        return {
          icon: <Award className="w-4 h-4 text-[#3D6B52]" />,
          bg: 'bg-[#DDE8DE] border-[#2D503C]/35 text-[#3D6B52]',
        };
    }
  };

  const handleItemClick = (item: ZeppMetricItem) => {
    playClickSound();
    if (onSelectMetric) {
      // Safe deduplication for modal
      const rawFormatted = item.valueFormatted || '';
      const cleanValue = item.unit
        ? rawFormatted.replace(new RegExp(`\\s*${item.unit}$`), '').trim()
        : rawFormatted;

      onSelectMetric({
        title: item.title,
        value: `${cleanValue} ${item.unit}`.trim(),
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

  // Ultra-Compact, High-Precision Status Capsule (Never crowds the row)
  const renderStatusTag = (statusType: ZeppMetricItem['statusType'], label: string) => {
    let shortText = label;
    if (/below target/i.test(label) || /underweight/i.test(label) || /deficit/i.test(label)) {
      shortText = 'Low';
    } else if (/needs attention/i.test(label) || /attention/i.test(label)) {
      shortText = 'Check';
    } else if (/normal/i.test(label)) {
      shortText = 'Normal';
    } else if (/optimal/i.test(label)) {
      shortText = 'Optimal';
    } else if (/high/i.test(label) || /overweight/i.test(label)) {
      shortText = 'High';
    }

    if (statusType === 'alert') {
      return (
        <span className="text-[10px] font-black text-[#991B1B] bg-[#FEE2E2] px-2 py-0.5 rounded-full border border-[#991B1B]/35 shadow-2xs font-display inline-flex items-center gap-1 shrink-0">
          <ArrowDownCircle className="w-2.5 h-2.5 stroke-[2.5] text-[#DC2626]" />
          <span>{shortText}</span>
        </span>
      );
    }
    if (statusType === 'attention') {
      return (
        <span className="text-[10px] font-black text-[#854D0E] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#854D0E]/35 shadow-2xs font-display inline-flex items-center gap-1 shrink-0">
          <AlertCircle className="w-2.5 h-2.5 stroke-[2.5] text-[#D97706]" />
          <span>{shortText}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-black text-[#2D503C] bg-[#DDE8DE] px-2 py-0.5 rounded-full border border-[#2D503C]/35 shadow-2xs font-display inline-flex items-center gap-1 shrink-0">
        <Check className="w-2.5 h-2.5 stroke-[3] text-[#2D503C]" />
        <span>{shortText}</span>
      </span>
    );
  };

  const score = metrics.bodyScore;
  const scorePercent = Math.min(100, Math.max(0, score));

  const scoreTierText =
    score >= 85
      ? 'Optimal Vitality'
      : score >= 70
      ? 'Solid Condition'
      : 'Needs Attention';

  const scoreTierColor =
    score >= 85
      ? 'text-[#2D503C] bg-[#DDE8DE] border-[#2D503C]/30'
      : score >= 70
      ? 'text-[#854D0E] bg-[#FBECCF] border-[#854D0E]/30'
      : 'text-[#991B1B] bg-[#FEE2E2] border-[#991B1B]/30';

  const scoreDotColor =
    score >= 85 ? 'bg-[#10B981]' : score >= 70 ? 'bg-[#D97706]' : 'bg-[#EF4444]';

  const scoreBarColor =
    score >= 85 ? 'bg-[#3D6B52]' : score >= 70 ? 'bg-[#E09F3E]' : 'bg-[#C25E40]';

  return (
    <div className="bg-white border-[1.75px] border-[#24201D] rounded-3xl shadow-[3px_3px_0px_#24201D] overflow-hidden font-body select-none">
      {/* Top Identity Strip */}
      <div className="p-3.5 sm:p-4 bg-[#FAF8F5] border-b-[1.75px] border-[#24201D]/15 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center font-black font-display text-xs text-[#2D503C] shadow-2xs shrink-0">
            {profile.name ? profile.name.slice(0, 1).toUpperCase() : 'B'}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black font-display text-[#24201D] truncate leading-none">
              {profile.name || 'Bek Sama'}
            </h3>
            <span className="text-[10px] text-[#6B635B] font-medium block mt-0.5 leading-none">
              Body Composition OS • {latestLog?.date
                ? new Date(latestLog.date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Today'}
            </span>
          </div>
        </div>

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

      {/* Signature Bento Hero: Body Health Score Monument & Vitals */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-[#FFFDF9] via-[#FAF8F5] to-[#F5EFE6] border-b-[1.75px] border-[#24201D]/20 space-y-3">
        {/* Main Body Health Score Pod */}
        <div className="p-4 bg-white border-2 border-[#24201D] rounded-2xl shadow-[3px_3px_0px_#24201D] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#3D6B52]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#6B635B] font-display">
                BODY HEALTH SCORE
              </span>
            </div>
            <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black font-display inline-flex items-center gap-1.5 shadow-2xs ${scoreTierColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${scoreDotColor} animate-pulse shrink-0`} />
              <span>{scoreTierText}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 pt-0.5">
            <span className="text-5xl sm:text-6xl font-black font-mono-num text-[#24201D] tracking-tight leading-none">
              {score}
            </span>
            <span className="text-xs font-black text-[#6B635B] font-display uppercase leading-none">
              / 100
            </span>
            <span className="ml-auto text-[9px] font-bold text-[#6B635B] font-display uppercase tracking-wider bg-[#FAF8F5] px-2 py-0.5 rounded-lg border border-[#24201D]/15">
              Bio-Impedance
            </span>
          </div>

          {/* Stepped Tri-Zone Telemetry Gauge Track */}
          <div className="space-y-1 pt-0.5">
            <div className="w-full h-2.5 rounded-full bg-stone-100 border border-[#24201D] overflow-hidden p-0.5 shadow-2xs">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${scoreBarColor}`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-[#6B635B]/70 font-display">
              <span>Attention &lt;70</span>
              <span>Solid 70–84</span>
              <span>Optimal 85+</span>
            </div>
          </div>
        </div>

        {/* Twin Micro-Cards: Somatotype & Scale Weight */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Physique Somatotype Pod */}
          <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              <Award className="w-3.5 h-3.5 text-[#3D6B52]" />
              <span>Somatotype</span>
            </div>
            <span className="text-base font-black font-display text-[#24201D] block truncate leading-tight mt-0.5">
              {metrics.bodyType}
            </span>
            <span className="text-[9px] text-[#6B635B] font-medium block truncate">
              9-Box Matrix
            </span>
          </div>

          {/* Scale Weight Pod */}
          <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              <Scale className="w-3.5 h-3.5 text-[#2563EB]" />
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
        </div>

        {/* Tactile 8-Pip Biomarkers Balance Strip */}
        <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider font-display">
            <span className="text-[#24201D]">Biomarkers Resilience</span>
            <span className="text-[#2D503C] font-mono-num">{achievedItems.length} of 8 Targets Met</span>
          </div>

          {/* 8 Distinct Segmented Pips */}
          <div className="grid grid-cols-8 gap-1.5">
            {metrics.items.map((it) => (
              <div
                key={it.id}
                className={`h-2.5 rounded-full border border-[#24201D] shadow-2xs transition-all duration-300 ${
                  it.group === 'achieved'
                    ? 'bg-[#3D6B52]'
                    : it.group === 'attention'
                    ? 'bg-[#E09F3E]'
                    : 'bg-[#C25E40]'
                }`}
                title={`${it.title}: ${it.statusLabel}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Expandable Accordion Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-[#FAF8F5] space-y-3">
          {/* Segmented Filter Pills (NO COUNTS) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveFilter('all');
              }}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'bg-white hover:bg-stone-100 text-[#6B635B] border border-[#24201D]/20'
              }`}
            >
              All
            </button>

            {achievedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFilter('achieved');
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
                  activeFilter === 'achieved'
                    ? 'bg-[#2D503C] text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-[#2D503C] border border-[#24201D]/20'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Achieved</span>
              </button>
            )}

            {attentionItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFilter('attention');
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
                  activeFilter === 'attention'
                    ? 'bg-[#854D0E] text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-[#854D0E] border border-[#24201D]/20'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Attention</span>
              </button>
            )}

            {notReachedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFilter('not_reached');
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
                  activeFilter === 'not_reached'
                    ? 'bg-[#991B1B] text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-[#991B1B] border border-[#24201D]/20'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>Below Target</span>
              </button>
            )}
          </div>

          {/* Structured 2-Line Metric Cards: No Truncation, Clean Status Alignment */}
          <div className="space-y-2">
            {displayItems.map((item) => {
              const visuals = getMetricVisuals(item.id);
              // Clean value guarantee: strip duplicate trailing unit
              const rawFormatted = item.valueFormatted || '';
              const cleanValue = item.unit
                ? rawFormatted.replace(new RegExp(`\\s*${item.unit}$`), '').trim()
                : rawFormatted;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="w-full p-3 bg-white hover:bg-stone-50 border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#24201D] cursor-pointer text-left group space-y-2 select-none"
                >
                  {/* Line 1: Title on left, Numeric Value on right */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${visuals.bg}`}>
                        {visuals.icon}
                      </div>
                      <span className="font-display font-black text-xs sm:text-sm text-[#24201D] truncate group-hover:text-[#3D6B52] transition-colors">
                        {item.title}
                      </span>
                    </div>

                    {/* Bold Numeric Value + Single Unit (NO DUPLICATES) */}
                    <div className="flex items-baseline gap-1 shrink-0 font-mono-num font-black text-xs sm:text-sm text-[#24201D]">
                      <span>{cleanValue}</span>
                      {item.unit && (
                        <span className="text-[10px] font-bold text-[#6B635B] font-display uppercase">
                          {item.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Line 2: Target Range on left, Compact Status Capsule on right */}
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#24201D]/10">
                    <div className="flex items-center gap-1.5 min-w-0 text-[10px] text-[#6B635B] font-medium truncate">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#24201D]/40 font-display">Target:</span>
                      <span className="font-mono-num font-bold text-[#24201D] truncate">{item.normRange}</span>
                    </div>

                    {/* Compact Sculpted Status Capsule Tag (Only ~50px!) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderStatusTag(item.statusType, item.statusLabel)}
                      <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-[#24201D] transition-colors" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
