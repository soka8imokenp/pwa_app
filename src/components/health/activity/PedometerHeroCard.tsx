import React, { useState } from 'react';
import {
  Footprints,
  Flame,
  MapPin,
  Clock,
  Plus,
  Minus,
  Edit2,
  Check,
  Trophy,
  Sparkles,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../../lib/sound';

interface PedometerHeroCardProps {
  currentSteps: number;
  goal: number;
  caloriesBurned: number;
  distanceKm: number;
  durationMinutes: number;
  progressPercent: number;
  isGoalMet: boolean;
  hasNativeSensor?: boolean;
  isSensorActive?: boolean;
  onAddSteps: (delta: number) => Promise<any>;
  onSetSteps: (steps: number) => Promise<any>;
  onSetGoal: (goal: number) => Promise<any>;
  onResyncSensor?: () => void;
  onOpenHealthConnectSettings?: () => void;
}

export const PedometerHeroCard: React.FC<PedometerHeroCardProps> = ({
  currentSteps,
  goal,
  caloriesBurned,
  distanceKm,
  durationMinutes,
  progressPercent,
  isGoalMet,
  hasNativeSensor,
  isSensorActive,
  onAddSteps,
  onSetSteps,
  onSetGoal,
  onResyncSensor,
  onOpenHealthConnectSettings,
}) => {
  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [inputSteps, setInputSteps] = useState(String(currentSteps));
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [inputGoal, setInputGoal] = useState(String(goal));
  const [isSyncing, setIsSyncing] = useState(false);

  const formatHoursMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  // Circular gauge geometry
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, progressPercent) / 100) * circumference;

  const handleSaveSteps = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputSteps, 10);
    if (!isNaN(val) && val >= 0) {
      await onSetSteps(val);
      setIsEditingSteps(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputGoal, 10);
    if (!isNaN(val) && val >= 1000) {
      await onSetGoal(val);
      setIsEditingGoal(false);
    }
  };

  const handleSync = () => {
    playClickSound();
    setIsSyncing(true);
    if (onResyncSensor) {
      onResyncSensor();
    }
    // Also trigger Health Connect settings for manual data source selection
    if (onOpenHealthConnectSettings) {
      onOpenHealthConnectSettings();
    }
    setTimeout(() => {
      setIsSyncing(false);
    }, 800);
  };

  return (
    <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3.5 font-body select-none">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
            <Footprints className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
              Daily Movement
            </span>
            <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
              Pedometer
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Health Connect Settings Button */}
          {onOpenHealthConnectSettings && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onOpenHealthConnectSettings();
              }}
              title="Open Health Connect settings to sync Samsung Health, Zepp Life, etc."
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#DDE8DE] hover:bg-[#C5D5C8] border border-[#24201D]/25 active:translate-y-0.5 text-[10px] font-bold text-[#2D503C] shadow-2xs transition-all cursor-pointer font-display"
            >
              <Smartphone className="w-3 h-3" />
              <span className="hidden sm:inline">Data Sources</span>
            </button>
          )}

          {/* Live Device Sync Button */}
          <button
            type="button"
            onClick={handleSync}
            title="Sync live step counter from phone"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 active:translate-y-0.5 text-[11px] font-bold text-[#24201D] shadow-2xs transition-all cursor-pointer font-display"
          >
            <RefreshCw className={`w-3 h-3 text-[#3D6B52] ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Goal Setting Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setInputGoal(String(goal));
              setIsEditingGoal(!isEditingGoal);
            }}
            title="Edit daily step goal"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 active:translate-y-0.5 shadow-2xs transition-all cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#24201D] stroke-[2.25]" />
          </button>
        </div>
      </div>

      {/* Goal Edit Drawer */}
      {isEditingGoal && (
        <form onSubmit={handleSaveGoal} className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#6B635B] font-display">Daily Target:</span>
            <input
              type="number"
              step="500"
              min="1000"
              max="50000"
              value={inputGoal}
              onChange={(e) => setInputGoal(e.target.value)}
              className="w-24 px-2 py-1 bg-white border border-[#24201D] rounded-lg text-xs font-black font-mono-num text-[#24201D] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="submit"
              className="px-2.5 py-1 bg-[#3D6B52] text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer font-display"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditingGoal(false)}
              className="px-2 py-1 bg-white border border-[#24201D]/20 text-[#6B635B] rounded-lg text-xs font-bold cursor-pointer font-display"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* 2. Premium Circular Pedometer Gauge */}
      <div className="flex flex-col items-center justify-center py-1">
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
            <circle
              cx="90"
              cy="90"
              r={radius}
              className="stroke-[#FAF8F5]"
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="90"
              cy="90"
              r={radius}
              className="stroke-[#24201D]/10"
              strokeWidth="12"
              strokeDasharray="4 6"
              fill="transparent"
            />
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke={isGoalMet ? '#10B981' : '#3D6B52'}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Central Stats */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 mb-1">
              {isGoalMet ? (
                <Trophy className="w-4 h-4 text-[#F59E0B] stroke-[2.5]" />
              ) : (
                <Footprints className="w-4 h-4 text-[#3D6B52] stroke-[2.25]" />
              )}
            </div>

            {isEditingSteps ? (
              <form onSubmit={handleSaveSteps} className="flex flex-col items-center gap-1.5">
                <input
                  type="number"
                  autoFocus
                  value={inputSteps}
                  onChange={(e) => setInputSteps(e.target.value)}
                  className="w-28 text-center text-xl font-black font-mono-num text-[#24201D] bg-white border border-[#24201D] rounded-lg px-2 py-0.5 focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="submit"
                    className="p-1 bg-[#3D6B52] text-white rounded-md cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingSteps(false)}
                    className="px-1.5 py-0.5 bg-[#FAF8F5] border border-[#24201D]/20 text-[10px] font-bold text-[#6B635B] rounded-md cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </form>
            ) : (
              <div
                onClick={() => {
                  playClickSound();
                  setInputSteps(String(currentSteps));
                  setIsEditingSteps(true);
                }}
                className="group cursor-pointer flex flex-col items-center"
                title="Click to edit steps manually"
              >
                <div className="relative inline-flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-black font-mono-num text-[#24201D] group-hover:text-[#3D6B52] transition-colors leading-none tracking-tight text-center">
                    {currentSteps.toLocaleString()}
                  </span>
                  <Edit2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#24201D] opacity-70 group-hover:opacity-100 transition-opacity absolute -right-5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span className="text-[11px] font-bold font-mono-num text-[#6B635B] mt-1">
                  of {goal.toLocaleString()} steps
                </span>
              </div>
            )}

            {isGoalMet && (
              <span className="mt-1 text-[10px] font-black text-[#2D503C] uppercase tracking-wider bg-[#DDE8DE] px-2 py-0.5 rounded-full border border-[#2D503C]/30 flex items-center gap-1 shadow-2xs animate-in zoom-in-95 duration-200 font-display">
                <Sparkles className="w-2.5 h-2.5 text-[#F59E0B]" />
                Goal Reached
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Clean Bento Tri-Metric Strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1 text-[#DC2626]">
            <Flame className="w-3.5 h-3.5 stroke-[2.25]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              Burn
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-lg font-black font-mono-num text-[#24201D]">
              +{caloriesBurned}
            </span>
            <span className="text-[10px] font-bold text-[#6B635B]">kcal</span>
          </div>
        </div>

        <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1 text-[#2563EB]">
            <MapPin className="w-3.5 h-3.5 stroke-[2.25]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              Distance
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-lg font-black font-mono-num text-[#24201D]">
              {distanceKm}
            </span>
            <span className="text-[10px] font-bold text-[#6B635B]">km</span>
          </div>
        </div>

        <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1 text-[#D97706]">
            <Clock className="w-3.5 h-3.5 stroke-[2.25]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              Time
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-lg font-black font-mono-num text-[#24201D]">
              {formatHoursMinutes(durationMinutes)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Quick Stepper Pills */}
      <div className="grid grid-cols-5 gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => onAddSteps(-500)}
          className="py-1.5 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 active:translate-y-0.5 rounded-xl text-xs font-black font-mono-num text-stone-500 shadow-2xs cursor-pointer flex items-center justify-center"
          title="Subtract 500 steps"
        >
          -500
        </button>
        {[500, 1000, 2500, 5000].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onAddSteps(amount)}
            className="py-1.5 bg-[#FAF8F5] hover:bg-white border border-[#24201D]/25 hover:border-[#24201D] active:translate-y-0.5 rounded-xl text-xs font-black font-mono-num text-[#24201D] shadow-2xs cursor-pointer flex items-center justify-center gap-0.5"
          >
            <Plus className="w-2.5 h-2.5 text-[#3D6B52]" />
            <span>{amount >= 1000 ? `${amount / 1000}k` : amount}</span>
          </button>
        ))}
      </div>

    </div>
  );
};
