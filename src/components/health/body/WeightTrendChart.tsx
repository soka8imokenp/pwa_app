import React, { useState, useMemo } from 'react';
import {
  Download,
  Info,
  Calendar,
  X,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { playClickSound } from '../../../lib/sound';
import { exportWeightLogsToCsv } from '../../../lib/exportImport';

export interface ChartPoint {
  x: number;
  y: number;
  avgY: number;
  weight: number;
  movingAvg: number;
  date: string;
  note?: string;
  bodyFat?: number;
  waist?: number;
}

interface WeightTrendChartProps {
  logsWithMovingAvg: Array<{
    date: string;
    weight: number;
    movingAvg: number;
    note?: string;
    bodyFatPercentage?: number;
    waistCm?: number;
  }>;
  targetWeight: number;
  currentWeight: number;
  allWeightLogs: any[];
}

export const WeightTrendChart: React.FC<WeightTrendChartProps> = ({
  logsWithMovingAvg,
  targetWeight,
  currentWeight,
  allWeightLogs,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  // Time-range filtered logs
  const filteredLogs = useMemo(() => {
    if (timeRange === '7d') return logsWithMovingAvg.slice(-7);
    if (timeRange === '30d') return logsWithMovingAvg.slice(-30);
    if (timeRange === '90d') return logsWithMovingAvg.slice(-90);
    return logsWithMovingAvg;
  }, [logsWithMovingAvg, timeRange]);

  // Dynamic statistics summary for the active period
  const stats = useMemo(() => {
    if (filteredLogs.length === 0) return null;
    const latest = filteredLogs[filteredLogs.length - 1];
    const first = filteredLogs[0];
    const latestMA = latest.movingAvg;
    const delta = Number((latest.weight - first.weight).toFixed(1));
    const maDelta = Number((latest.movingAvg - first.movingAvg).toFixed(1));
    const isDown = maDelta < -0.2;
    const isUp = maDelta > 0.2;

    return {
      latestWeight: latest.weight,
      latestMA,
      delta,
      maDelta,
      trend: isDown ? ('down' as const) : isUp ? ('up' as const) : ('stable' as const),
    };
  }, [filteredLogs]);

  // SVG Chart Geometry
  const chartData = useMemo(() => {
    if (filteredLogs.length === 0) return null;

    // Filter valid positive weights
    const weights = filteredLogs
      .map((l) => l.weight)
      .filter((w) => typeof w === 'number' && w > 20 && !isNaN(w));
    const movingAvgs = filteredLogs
      .map((l) => l.movingAvg)
      .filter((w) => typeof w === 'number' && w > 20 && !isNaN(w));

    const activeVals = [...weights, ...movingAvgs];
    if (activeVals.length === 0) return null;

    let minVal = Math.min(...activeVals);
    let maxVal = Math.max(...activeVals);

    // Only include targetWeight in Y domain if it's within a reasonable visual delta (<= 6kg from data)
    // This prevents a distant goal (e.g. 60kg vs 95kg) from squashing all daily variations into an imperceptible flat line!
    const hasValidTarget = typeof targetWeight === 'number' && targetWeight > 30 && !isNaN(targetWeight);
    const isTargetNear = hasValidTarget && targetWeight >= minVal - 6 && targetWeight <= maxVal + 6;
    if (isTargetNear) {
      minVal = Math.min(minVal, targetWeight);
      maxVal = Math.max(maxVal, targetWeight);
    }

    const paddingVal = Math.max(1.2, (maxVal - minVal) * 0.18);
    const chartMin = Number((minVal - paddingVal).toFixed(1));
    const chartMax = Number((maxVal + paddingVal).toFixed(1));
    const chartRange = Math.max(1.5, chartMax - chartMin);

    const svgWidth = 360;
    const svgHeight = 160;
    const paddingLeft = 38; // 38px ensures 5-char numbers like 102.5 never clip
    const paddingRight = 16;
    const paddingTop = 16;
    const paddingBottom = 24;

    const plotHeight = svgHeight - paddingTop - paddingBottom;
    const plotWidth = svgWidth - paddingLeft - paddingRight;

    const getY = (val: number) => {
      const ratio = (val - chartMin) / chartRange;
      return paddingTop + (1 - ratio) * plotHeight;
    };

    const pts: ChartPoint[] = filteredLogs.map((l, i) => {
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
    } else if (pts.length === 1) {
      // Single point baseline across the chart
      rawLinePath = `M ${paddingLeft} ${pts[0].y} L ${svgWidth - paddingRight} ${pts[0].y}`;
      avgLinePath = `M ${paddingLeft} ${pts[0].avgY} L ${svgWidth - paddingRight} ${pts[0].avgY}`;
    }

    const targetYPos = hasValidTarget ? getY(targetWeight) : -100;

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
      hasValidTarget,
      isTargetNear,
      gridYVals,
      chartMin,
      chartMax,
      svgWidth,
      svgHeight,
      paddingLeft,
      plotWidth,
    };
  }, [filteredLogs, currentWeight, targetWeight]);

  const handleExportCsv = () => {
    playClickSound();
    exportWeightLogsToCsv(allWeightLogs);
  };

  const selectedPt =
    selectedPointIndex !== null && chartData?.points[selectedPointIndex]
      ? chartData.points[selectedPointIndex]
      : null;

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3 font-body">
      {/* 1. Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24201D]/15 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
            Weight Dynamics & Moving Avg
          </span>
          <div
            title="Dots represent daily weigh-ins. The solid dark green line is the 7-day Moving Average filter."
            className="cursor-help"
          >
            <Info className="w-3.5 h-3.5 text-stone-400 hover:text-stone-600" />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCsv}
            title="Export CSV history"
            className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] text-[#24201D] flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5 stroke-[2]" />
          </button>

          {/* Time range selector */}
          <div className="flex items-center p-0.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => {
                  playClickSound();
                  setTimeRange(range);
                  setSelectedPointIndex(null);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-[#3D6B52] text-white shadow-2xs'
                    : 'text-[#6B635B] hover:text-[#24201D]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Real-time Moving Average Insight Bar */}
      {stats && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#24201D]/15 text-xs flex-wrap">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] font-display">
              7-Day MA:
            </span>
            <span className="font-mono-num font-black text-sm text-[#24201D]">
              {stats.latestMA} kg
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6B635B] font-bold">
              Period:
              <span
                className={`ml-1 font-mono-num font-black ${
                  stats.delta < 0
                    ? 'text-[#2D503C]'
                    : stats.delta > 0
                    ? 'text-[#C25E40]'
                    : 'text-[#6B635B]'
                }`}
              >
                {stats.delta > 0 ? `+${stats.delta}` : stats.delta} kg
              </span>
            </span>

            {stats.trend === 'down' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#DDE8DE] text-[#2D503C] border border-[#2D503C]/20 text-[9px] font-black uppercase">
                <TrendingDown className="w-3 h-3" />
                Down
              </span>
            )}
            {stats.trend === 'up' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#F7E3DC] text-[#C25E40] border border-[#C25E40]/20 text-[9px] font-black uppercase">
                <TrendingUp className="w-3 h-3" />
                Up
              </span>
            )}
            {stats.trend === 'stable' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-stone-200 text-stone-700 border border-stone-300 text-[9px] font-black uppercase">
                <Minus className="w-3 h-3" />
                Stable
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Legend */}
      <div className="flex items-center justify-between text-[10px] text-[#6B635B] font-bold px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3D6B52] border border-[#24201D]" />
            <span>Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#2D503C] rounded-full" />
            <span>7-Day Trend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-[#C25E40]" />
            <span>Goal</span>
          </div>
        </div>
        <span className="font-mono-num text-[9px] text-stone-400">Tap points for details</span>
      </div>

      {/* 4. SVG Canvas */}
      {chartData ? (
        <div className="relative w-full overflow-hidden bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl p-1">
          <svg
            viewBox={`0 0 ${chartData.svgWidth} ${chartData.svgHeight}`}
            className="w-full h-44 overflow-visible"
          >
            <defs>
              <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3D6B52" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3D6B52" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Y-Axis Labels */}
            {chartData.gridYVals.map((g, idx) => (
              <g key={idx}>
                <line
                  x1={chartData.paddingLeft}
                  y1={g.y}
                  x2={chartData.svgWidth - 16}
                  y2={g.y}
                  stroke="#E8E0D2"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={chartData.paddingLeft - 4}
                  y={g.y + 3}
                  textAnchor="end"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#8C827A"
                  className="font-mono-num"
                >
                  {g.val}
                </text>
              </g>
            ))}

            {/* Target Weight Dashed Guide Line */}
            {chartData.isTargetNear &&
              chartData.targetYPos >= 10 &&
              chartData.targetYPos <= chartData.svgHeight - 15 && (
                <g>
                  <line
                    x1={chartData.paddingLeft}
                    y1={chartData.targetYPos}
                    x2={chartData.svgWidth - 16}
                    y2={chartData.targetYPos}
                    stroke="#C25E40"
                    strokeWidth="1.25"
                    strokeDasharray="4 3"
                  />
                  <text
                    x={chartData.svgWidth - 18}
                    y={chartData.targetYPos - 3}
                    textAnchor="end"
                    fontSize="8"
                    fontWeight="900"
                    fill="#C25E40"
                    className="font-mono-num"
                  >
                    Goal: {targetWeight}kg
                  </text>
                </g>
              )}

            {/* Shaded Area */}
            {chartData.areaPath && <path d={chartData.areaPath} fill="url(#weightAreaGrad)" />}

            {/* Smoothed Moving Average Trend Line */}
            {chartData.avgLinePath && (
              <path
                d={chartData.avgLinePath}
                fill="none"
                stroke="#2D503C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Raw Points Line */}
            {chartData.rawLinePath && (
              <path
                d={chartData.rawLinePath}
                fill="none"
                stroke="#3D6B52"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeOpacity="0.6"
              />
            )}

            {/* Interactive Scatter Dots with generous touch hit target */}
            {chartData.points.map((pt, i) => {
              const isSelected = selectedPointIndex === i;
              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onClick={() => {
                    playClickSound();
                    setSelectedPointIndex(isSelected ? null : i);
                  }}
                >
                  {/* Invisible 36px touch hit area */}
                  <circle cx={pt.x} cy={pt.y} r={18} fill="transparent" />
                  {/* Visible point circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? '#C25E40' : '#FFFFFF'}
                    stroke={isSelected ? '#24201D' : '#3D6B52'}
                    strokeWidth={isSelected ? 2.5 : 2}
                    className="transition-all"
                  />
                </g>
              );
            })}
          </svg>

          {/* Single entry baseline hint */}
          {chartData.points.length === 1 && (
            <div className="mt-1 px-2.5 py-1 text-center text-[10px] text-[#8C827A] font-bold">
              1 weigh-in logged. Add 2+ entries to view the moving average trend line.
            </div>
          )}

          {/* Selected Point Tooltip card */}
          {selectedPt && (
            <div className="mt-2 p-2.5 bg-white border border-[#24201D] rounded-xl shadow-2xs flex items-center justify-between text-xs animate-fadeIn">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#6B635B] flex items-center gap-1 font-mono-num">
                    <Calendar className="w-3 h-3" />
                    {selectedPt.date}
                  </span>
                  {selectedPt.note && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-medium">
                      {selectedPt.note}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-black font-mono-num text-[#24201D]">
                    {selectedPt.weight} kg
                  </span>
                  <span className="text-[10px] font-bold text-[#3D6B52]">
                    (MA-7: {selectedPt.movingAvg} kg)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPointIndex(null)}
                className="p-1 rounded-lg hover:bg-stone-100 text-[#6B635B] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-[#6B635B] font-bold">
          No weigh-ins logged yet. Tap &ldquo;Weigh-In&rdquo; to start tracking.
        </div>
      )}
    </div>
  );
};
