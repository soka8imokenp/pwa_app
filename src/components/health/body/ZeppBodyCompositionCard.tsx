import React, { useState } from 'react';
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
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
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

export const ZeppBodyCompositionCard: React.FC<ZeppBodyCompositionCardProps> = ({
  profile,
  metrics,
  latestLog,
  previousLog,
  onOpenScaleModal,
  onSelectMetric,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!metrics) {
    return (
      <div className="p-4 bg-white border-[2px] border-[#24201D] rounded-3xl shadow-[3px_3px_0px_#24201D] space-y-3 font-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] border border-[#24201D] flex items-center justify-center text-[#059669] shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Состав тела (Bio-Impedance)
              </h3>
              <p className="text-[10px] text-[#6B635B] font-medium">
                Анализ Zepp Life: жир, мышцы, вода, белок и оценка тела
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl text-center space-y-2">
          <p className="text-xs text-[#6B635B] font-medium leading-relaxed max-w-xs mx-auto">
            Встаньте на весы босиком для полного клинического анализа состава тела (оценка тела, белок, мышцы, вода, висцеральный жир).
          </p>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenScaleModal();
            }}
            className="py-2.5 px-4 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.5px] border-[#24201D] rounded-xl text-xs font-black shadow-2xs active:translate-y-0.5 transition-all inline-flex items-center gap-2 cursor-pointer font-display uppercase tracking-wider"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Взвеситься на умных весах</span>
          </button>
        </div>
      </div>
    );
  }

  // Calculate delta progress vs previous weigh-in
  const currentWeight = latestLog?.weight ?? profile.currentWeight;
  const prevWeight = previousLog?.weight;
  const deltaKg = prevWeight !== undefined ? Number((currentWeight - prevWeight).toFixed(1)) : 0;
  const deltaSign = deltaKg > 0 ? `+${deltaKg}` : `${deltaKg}`;

  // Metric groups as in Zepp Life screenshot:
  const notReachedItems = metrics.items.filter((i) => i.group === 'not_reached');
  const attentionItems = metrics.items.filter((i) => i.group === 'attention');
  const achievedItems = metrics.items.filter((i) => i.group === 'achieved');

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
        clinicalTip: `Референсный диапазон нормы: ${item.normRange}. Текущий статус: ${item.statusLabel}.`,
      });
    }
  };

  const renderBadge = (statusType: ZeppMetricItem['statusType'], label: string) => {
    if (statusType === 'alert') {
      return (
        <span className="text-[10px] font-bold text-[#B91C1C] bg-[#FEE2E2] px-2 py-0.5 rounded-full border border-[#B91C1C]/30 shadow-2xs font-display">
          {label}
        </span>
      );
    }
    if (statusType === 'attention') {
      return (
        <span className="text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#B45309]/30 shadow-2xs font-display">
          {label}
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full border border-[#065F46]/30 shadow-2xs font-display">
        {label}
      </span>
    );
  };

  const renderItemRow = (item: ZeppMetricItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => handleItemClick(item)}
      className="w-full p-2.5 bg-white hover:bg-stone-50 border border-[#24201D]/25 rounded-2xl flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer shadow-2xs"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center justify-center shrink-0">
          {getMetricIcon(item.id)}
        </div>
        <div className="text-left">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-bold text-[#24201D] font-display">
              {item.title}
            </span>
            <span className="text-xs font-black font-mono-num text-[#24201D]">
              {item.valueFormatted}
            </span>
            {item.unit && (
              <span className="text-[10px] font-bold text-[#6B635B]">
                {item.unit}
              </span>
            )}
          </div>
          <span className="text-[9px] text-[#6B635B] block">
            Норма: {item.normRange}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {renderBadge(item.statusType, item.statusLabel)}
      </div>
    </button>
  );

  return (
    <div className="bg-white border-[2px] border-[#24201D] rounded-3xl shadow-[3px_3px_0px_#24201D] overflow-hidden font-body space-y-0">
      {/* Top Emerald Header Inspired by Zepp Life */}
      <div className="p-4 bg-gradient-to-br from-[#059669] via-[#10B981] to-[#047857] text-white border-b-[2px] border-[#24201D] space-y-3 relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-sm pointer-events-none" />
        <div className="absolute right-12 bottom-0 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

        {/* User Identity Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-xs border border-white/40 flex items-center justify-center text-sm font-black font-display text-white shadow-2xs">
              {profile.name ? profile.name.slice(0, 1).toUpperCase() : 'B'}
            </div>
            <div>
              <h4 className="text-xs font-black tracking-wide font-display text-white">
                {profile.name || 'Bek Sama'}
              </h4>
              <span className="text-[9px] text-white/80 font-medium">
                {latestLog?.date
                  ? new Date(latestLog.date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Сегодня'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsExpanded(!isExpanded);
            }}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
            title={isExpanded ? 'Свернуть' : 'Развернуть'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Body Score Hero (Оценка тела: 90) */}
        <div className="text-center py-1 space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/85 font-display block">
            Оценка тела
          </span>
          <div className="flex items-center justify-center">
            <span className="text-5xl font-black font-mono-num tracking-tight text-white drop-shadow-sm">
              {metrics.bodyScore}
            </span>
          </div>
          {prevWeight !== undefined && (
            <span className="text-[10px] font-bold text-emerald-100 font-mono-num block">
              Прогресс: {deltaSign} кг
            </span>
          )}
        </div>

        {/* Twin Pill Bar: Вес & Телосложение */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 bg-black/15 backdrop-blur-xs border border-white/25 rounded-2xl flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black font-mono-num text-white leading-none">
                  {currentWeight.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-[10px] font-bold text-white/80">кг</span>
              </div>
              <span className="text-[9px] font-bold text-white/70 uppercase font-display block mt-0.5">
                Вес
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-black/15 backdrop-blur-xs border border-white/25 rounded-2xl flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-black font-display text-white leading-none block truncate">
                {metrics.bodyType}
              </span>
              <span className="text-[9px] font-bold text-white/70 uppercase font-display block mt-0.5">
                Телосложение
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Content Body */}
      {isExpanded && (
        <div className="p-4 bg-[#FAF8F5] space-y-4">
          {/* Section 1: Элементы не достигшие цели (Red / Rose) */}
          {notReachedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#B91C1C]">
                <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span>
                  {notReachedItems.length}{' '}
                  {notReachedItems.length === 1
                    ? 'элемент не достиг цели'
                    : 'элементов не достигли цели'}
                </span>
              </div>
              <div className="space-y-1.5">
                {notReachedItems.map(renderItemRow)}
              </div>
            </div>
          )}

          {/* Section 2: Элементы, нуждающиеся в вашем внимании (Amber / Yellow) */}
          {attentionItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#B45309]">
                <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span>
                  {attentionItems.length}{' '}
                  {attentionItems.length === 1
                    ? 'элемент нуждается в вашем внимании'
                    : 'элементов нуждаются в вашем внимании'}
                </span>
              </div>
              <div className="space-y-1.5">
                {attentionItems.map(renderItemRow)}
              </div>
            </div>
          )}

          {/* Section 3: Достигнутые цели (Emerald / Green) */}
          {achievedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#065F46]">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span>
                  Достигнуто {achievedItems.length}{' '}
                  {achievedItems.length === 1
                    ? 'цель'
                    : achievedItems.length >= 2 && achievedItems.length <= 4
                    ? 'цели'
                    : 'целей'}
                </span>
              </div>
              <div className="space-y-1.5">
                {achievedItems.map(renderItemRow)}
              </div>
            </div>
          )}

          {/* Footer Sync Button */}
          <div className="pt-1 flex items-center justify-between text-[10px] text-[#6B635B]">
            <span className="font-medium">
              Алгоритм клинического BIA (Zepp Life / openScale)
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onOpenScaleModal();
              }}
              className="text-[#059669] hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
            >
              <Scale className="w-3 h-3" />
              <span>Новый замер</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
