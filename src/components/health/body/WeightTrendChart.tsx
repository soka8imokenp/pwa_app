import React, { useState, useMemo } from 'react';
import {
  Download,
  Info,
  Calendar,
  X,
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

  // SVG Chart Geometry
  const chartData = useMemo(() => {
    if (filteredLogs.length === 0) return null;

    const weights = filteredLogs.map((l) => l.weight);
    const movingAvgs = filteredLogs.map((l) => l.movingAvg);
    const allVals = [...weights, ...movingAvgs, targetWeight, currentWeight];

    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const paddingVal = Math.max(1.5, (maxVal - minVal) * 0.15);

    const chartMin = Number((minVal - paddingVal).toFixed(1));
    const chartMax = Number((maxVal + paddingVal).toFixed(1));
    const chartRange = Math.max(2, chartMax - chartMin);

    const svgWidth = 340;
    const svgHeight = 160;
    const paddingLeft = 32;
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

  const handleExportCsv = () => {
    playClickSound();
    exportWeightLogsToCsv(allWeightLogs);
  };

  const selectedPt =
    selectedPointIndex !== null && chartData?.points[selectedPointIndex]
      ? chartData.points[selectedPointIndex]
      : null;

  return (
    <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24201D]/15 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
            Weight Dynamics & Moving Avg
          </span>
          <div
            title="Dots represent daily weigh-ins. The solid green line is the 7-day Moving Average filter."
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
            className="p-1 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] text-[#24201D] flex items-center justify-center cursor-pointer shadow-2xs"
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

      {/* Legend */}
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

      {/* SVG Canvas */}
      {chartData ? (
        <div className="relative w-full overflow-hidden bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl p-1">
          <svg
            viewBox={`0 0 ${chartData.svgWidth} ${chartData.svgHeight}`}
            className="w-full h-40 overflow-visible"
          >
            <defs>
              <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3D6B52" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3D6B52" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
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
            {chartData.targetYPos >= 10 && chartData.targetYPos <= chartData.svgHeight - 15 && (
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

            {/* Interactive Scatter Dots */}
            {chartData.points.map((pt, i) => {
              const isSelected = selectedPointIndex === i;
              return (
                <g key={i} className="cursor-pointer" onClick={() => setSelectedPointIndex(i)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6 : 3.5}
                    fill={isSelected ? '#C25E40' : '#FFFFFF'}
                    stroke={isSelected ? '#24201D' : '#3D6B52'}
                    strokeWidth={isSelected ? 2 : 1.5}
                    className="transition-all"
                  />
                </g>
              );
            })}
          </svg>

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
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
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
