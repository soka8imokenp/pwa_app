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
import { useTranslation } from '../../../i18n/LanguageContext';

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
  const { t } = useTranslation();
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
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display block leading-none">
                {t('healthBody.telemetryTitle')}
              </span>
              <h3 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
                {t('zepp.title')}
              </h3>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl text-center space-y-2.5">
          <p className="text-xs text-[#6B635B] font-medium leading-relaxed max-w-xs mx-auto">
            {t('zepp.noScaleData')}
          </p>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenScaleModal();
            }}
            className="py-2.5 px-4 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-black shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 transition-all inline-flex items-center gap-2 cursor-pointer font-display uppercase tracking-wider"
          >
            <Scale className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t('healthBody.scaleConnectBtn')}</span>
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

  // Distinctive, Compact Status Badge with Neo-Brutalist border & subtle icon
  const renderStatusBadge = (statusType: ZeppMetricItem['statusType'], label: string) => {
    if (statusType === 'alert') {
      return (
        <span className="text-[10px] font-black text-[#991B1B] bg-[#FEE2E2] px-2.5 py-0.5 rounded-md border border-[#991B1B]/35 shadow-2xs font-display inline-flex items-center gap-1 shrink-0">
          <ArrowDownCircle className="w-2.5 h-2.5 stroke-[2.5] text-[#DC2626]" />
          <span>{label}</span>
        </span>
      );
    }
    if (statusType === 'attention') {
      return (
        <span className="text-[10px] font-black text-[#854D0E] bg-[#FEF3C7] px-2.5 py-0.5 rounded-md border border-[#854D0E]/35 shadow-2xs font-display inline-flex items-center gap-1 shrink-0">
          <AlertCircle className="w-2.5 h-2.5 stroke-[2.5] text-[#D97706]" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-black text-[#2D503C] bg-[#DDE8DE] px-2.5 py-0.5 rounded-md border border-[#2D503C]/35 shadow-2xs font-display inline-flex items-center gap-1 shrink-0">
        <Check className="w-2.5 h-2.5 stroke-[3] text-[#2D503C]" />
        <span>{label}</span>
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
      ? 'text-[#2D503C] bg-[#DDE8DE] border-[#2D503C]/35'
      : score >= 70
      ? 'text-[#854D0E] bg-[#FBECCF] border-[#854D0E]/35'
      : 'text-[#991B1B] bg-[#FEE2E2] border-[#991B1B]/35';

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
        <div className="p-4 sm:p-5 bg-white border-2 border-[#24201D] rounded-2xl shadow-[3px_3px_0px_#24201D] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#3D6B52] stroke-[2.5]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#6B635B] font-display">
                {t('zepp.bodyScore')}
              </span>
            </div>
            <div className={`px-2.5 py-0.5 rounded-md border text-[10px] font-black font-display inline-flex items-center gap-1.5 shadow-2xs ${scoreTierColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${scoreDotColor} animate-pulse shrink-0`} />
              <span>{scoreTierText}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl sm:text-7xl font-black font-mono-num text-[#24201D] tracking-tight leading-none">
                {score}
              </span>
              <span className="text-sm font-black text-[#6B635B] font-display uppercase leading-none">
                / 100
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-[#6B635B] font-medium block">Progress</span>
              <span className="text-xs font-black font-mono-num text-[#24201D]">
                {deltaSign !== '0' ? `${deltaSign} kg` : t('healthBody.normal')}
              </span>
            </div>
          </div>

          {/* Stepped Tri-Zone Telemetry Gauge Track */}
          <div className="space-y-1 pt-1">
            <div className="w-full h-2.5 rounded-full bg-stone-100 border border-[#24201D] overflow-hidden p-0.5 shadow-2xs">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${scoreBarColor}`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-[#6B635B]/70 font-display">
              <span>{t('zepp.statusAttention')} &lt;70</span>
              <span>70–84</span>
              <span>{t('zepp.statusOptimal')} 85+</span>
            </div>
          </div>
        </div>

        {/* Twin Micro-Cards: Somatotype & Scale Weight */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Physique Somatotype Pod */}
          <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              <Award className="w-3.5 h-3.5 text-[#3D6B52]" />
              <span>{t('zepp.bodyType')}</span>
            </div>
            <span className="text-base font-black font-display text-[#24201D] block truncate leading-tight mt-0.5">
              {metrics.bodyType}
            </span>
            <span className="text-[9px] text-[#6B635B] font-medium block truncate">
              {t('zepp.bodyType')}
            </span>
          </div>

          {/* Scale Weight Pod */}
          <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-1">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              <Scale className="w-3.5 h-3.5 text-[#3D6B52]" />
              <span>{t('healthBody.currentWeight')}</span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-black font-mono-num text-[#24201D] leading-tight">
                {currentWeight.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold text-[#6B635B] uppercase font-display">kg</span>
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
            <span className="text-[#24201D]">Biomarkers Balance</span>
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
          {/* Segmented Filter Pills (NO COUNTERS, NO NOISE) */}
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
              {t('zepp.filterAll')}
            </button>

            {achievedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFilter('achieved');
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 ${
                  activeFilter === 'achieved'
                    ? 'bg-[#2D503C] text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-[#6B635B] border border-[#24201D]/20'
                }`}
              >
                {t('zepp.filterAchieved')}
              </button>
            )}

            {attentionItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFilter('attention');
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 ${
                  activeFilter === 'attention'
                    ? 'bg-[#854D0E] text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-[#6B635B] border border-[#24201D]/20'
                }`}
              >
                {t('zepp.filterAttention')}
              </button>
            )}

            {notReachedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveFilter('not_reached');
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shrink-0 ${
                  activeFilter === 'not_reached'
                    ? 'bg-[#C25E40] text-white shadow-2xs'
                    : 'bg-white hover:bg-stone-100 text-[#6B635B] border border-[#24201D]/20'
                }`}
              >
                {t('zepp.filterNotReached')}
              </button>
            )}
          </div>

          {/* Spacious, Uncrowded Metric Rows: Full Titles, No Truncation, Distinct Badges */}
          <div className="space-y-2.5">
            {displayItems.map((item) => {
              const visuals = getMetricVisuals(item.id);
              const rawFormatted = item.valueFormatted || '';
              const cleanValue = item.unit
                ? rawFormatted.replace(new RegExp(`\\s*${item.unit}$`), '').trim()
                : rawFormatted;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="w-full p-3.5 bg-white hover:bg-[#FFFDF9] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#24201D] cursor-pointer text-left group flex items-center justify-between gap-3 select-none"
                >
                  {/* Left Column: Icon + Full Metric Title + Target */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl border border-[#24201D] flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${visuals.bg}`}>
                      {visuals.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-display font-black text-xs sm:text-sm text-[#24201D] truncate leading-tight group-hover:text-[#3D6B52] transition-colors">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-[#6B635B] font-medium block truncate mt-0.5 font-mono-num">
                        Target: {item.normRange}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Prominent Value (Single Unit) + Compact Status Badge */}
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <div className="flex items-baseline gap-1 font-mono-num font-black text-sm sm:text-base text-[#24201D]">
                      <span>{cleanValue}</span>
                      {item.unit && (
                        <span className="text-[10px] font-bold text-[#6B635B] font-display uppercase">
                          {item.unit}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {renderStatusBadge(item.statusType, item.statusLabel)}
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
