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
}) => {
  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [inputSteps, setInputSteps] = useState(String(currentSteps));
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [inputGoal, setInputGoal] = useState(String(goal));

  const formatHoursMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  // SVG Circular Progress Math
  const radius = 78;
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

  return (
    <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-4 font-body select-none">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#24201D]/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
            <Footprints className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
              Daily Movement
            </span>
            <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
              Шагомер и активность
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasNativeSensor && (
            <div
              title={isSensorActive ? 'Аппаратный датчик активен' : 'Ожидание шагов'}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#24201D]/20 text-[10px] font-bold text-[#2D503C] shadow-2xs"
            >
              <Smartphone className="w-3 h-3 text-[#3D6B52]" />
              <span className="hidden sm:inline">Датчик</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setInputGoal(String(goal));
              setIsEditingGoal(!isEditingGoal);
            }}
            className="flex items-center gap-1 text-xs font-black font-mono-num text-[#24201D] px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#24201D]/25 hover:border-[#24201D] shadow-2xs transition-all cursor-pointer"
          >
            <span>{progressPercent}% цели</span>
            <Edit2 className="w-2.5 h-2.5 text-[#6B635B]" />
          </button>
        </div>
      </div>

      {/* Goal Edit Inline Drawer */}
      {isEditingGoal && (
        <form onSubmit={handleSaveGoal} className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#6B635B] font-display">Цель шагов в день:</span>
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
              className="px-2.5 py-1 bg-[#3D6B52] text-white rounded-lg text-[11px] font-bold shadow-2xs cursor-pointer font-display"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setIsEditingGoal(false)}
              className="px-2 py-1 bg-white border border-[#24201D]/20 text-[#6B635B] rounded-lg text-[11px] font-bold cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* 2. Main Circular Pedometer Gauge */}
      <div className="flex flex-col items-center justify-center pt-1 pb-1">
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
          
          {/* SVG Ring */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
            {/* Background Track */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              className="stroke-[#FAF8F5]"
              strokeWidth="13"
              fill="transparent"
            />
            <circle
              cx="90"
              cy="90"
              r={radius}
              className="stroke-[#24201D]/10"
              strokeWidth="14"
              strokeDasharray="4 6"
              fill="transparent"
            />

            {/* Progress Stroke */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              stroke={isGoalMet ? '#10B981' : '#3D6B52'}
              strokeWidth="13"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Central Counter Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[#2D503C] mb-0.5">
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
                title="Нажмите, чтобы изменить вручную"
              >
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono-num text-[#24201D] group-hover:text-[#3D6B52] transition-colors leading-none tracking-tight">
                    {currentSteps.toLocaleString()}
                  </span>
                  <Edit2 className="w-3 h-3 text-stone-400 group-hover:text-[#24201D] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-[11px] font-bold font-mono-num text-[#6B635B] mt-1">
                  из {goal.toLocaleString()} шагов
                </span>
              </div>
            )}

            {isGoalMet && (
              <span className="mt-1 text-[10px] font-black text-[#2D503C] uppercase tracking-wider bg-[#DDE8DE] px-2 py-0.5 rounded-full border border-[#2D503C]/30 flex items-center gap-1 shadow-2xs animate-in zoom-in-95 duration-200">
                <Sparkles className="w-2.5 h-2.5 text-[#F59E0B]" />
                Цель выполнена!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Bento Tri-Metric Strip */}
      <div className="grid grid-cols-3 gap-2">
        {/* Calories */}
        <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[#DC2626]">
            <Flame className="w-3.5 h-3.5 stroke-[2.25]" />
            <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              Калории
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
            <span className="text-lg font-black font-mono-num text-[#24201D]">
              +{caloriesBurned}
            </span>
            <span className="text-[10px] font-bold text-[#6B635B]">ккал</span>
          </div>
          <span className="text-[9px] text-[#3D6B52] font-bold block">
            Расход при ходьбе
          </span>
        </div>

        {/* Distance */}
        <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[#2563EB]">
            <MapPin className="w-3.5 h-3.5 stroke-[2.25]" />
            <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              Дистанция
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
            <span className="text-lg font-black font-mono-num text-[#24201D]">
              {distanceKm}
            </span>
            <span className="text-[10px] font-bold text-[#6B635B]">км</span>
          </div>
          <span className="text-[9px] text-stone-400 font-bold block">
            Длина шага
          </span>
        </div>

        {/* Walking Time */}
        <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[#D97706]">
            <Clock className="w-3.5 h-3.5 stroke-[2.25]" />
            <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              Время
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
            <span className="text-lg font-black font-mono-num text-[#24201D]">
              {formatHoursMinutes(durationMinutes)}
            </span>
          </div>
          <span className="text-[9px] text-stone-400 font-bold block">
            Активная ходьба
          </span>
        </div>
      </div>

      {/* 4. Quick Stepper Buttons */}
      <div className="pt-0.5 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
          <span>Быстрое добавление шагов</span>
          <button
            type="button"
            onClick={() => onAddSteps(-500)}
            className="flex items-center gap-0.5 text-stone-400 hover:text-red-500 cursor-pointer font-mono-num"
            title="Отнять 500 шагов"
          >
            <Minus className="w-2.5 h-2.5" /> 500
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {[500, 1000, 2500, 5000].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onAddSteps(amount)}
              className="py-2 px-1 bg-[#FAF8F5] hover:bg-white active:translate-y-0.5 border border-[#24201D]/25 hover:border-[#24201D] rounded-xl text-xs font-black font-mono-num text-[#24201D] shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-0.5"
            >
              <Plus className="w-3 h-3 text-[#3D6B52] stroke-[2.5]" />
              <span>{amount >= 1000 ? `${amount / 1000}k` : amount}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
