import React, { useState } from 'react';
import {
  Utensils,
  Droplets,
  Plus,
  Minus,
  Trash2,
  Mic,
  MicOff,
  Flame,
  Bot,
  Clock,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playClickSound, playSuccessChime, playTaskCheckSound } from '../../lib/sound';
import { startVoiceDictation, stopVoiceDictation, isSpeechRecognitionSupported } from '../../lib/speechRecognition';
import type { MealLog, WaterLog, MealType, CalculatedHealthMetrics } from '../../types/health';
import { estimateMealNutritionWithAI } from '../../lib/aiHealthService';

interface HealthIntakePageProps {
  metrics: CalculatedHealthMetrics;
  todaysMeals: MealLog[];
  todaysWaterLogs: WaterLog[];
  todaysTotalKcal: number;
  todaysProteinGrams: number;
  todaysCarbsGrams: number;
  todaysFatGrams: number;
  todaysWaterTotalMl: number;
  selectedDate: string;
  onLogMeal: (meal: Omit<MealLog, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteMealLog: (id: number) => Promise<void>;
  onLogWater: (amountMl?: number, date?: string) => Promise<void>;
  onRemoveLatestWater: () => Promise<void>;
}

export const HealthIntakePage: React.FC<HealthIntakePageProps> = ({
  metrics,
  todaysMeals,
  todaysWaterLogs,
  todaysTotalKcal,
  todaysProteinGrams,
  todaysCarbsGrams,
  todaysFatGrams,
  todaysWaterTotalMl,
  selectedDate,
  onLogMeal,
  onDeleteMealLog,
  onLogWater,
  onRemoveLatestWater,
}) => {
  const [mealText, setMealText] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [showManualInputs, setShowManualInputs] = useState(false);
  const [manualKcal, setManualKcal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const { targetDailyCalories, targetProteinGrams, targetCarbsGrams, targetFatGrams, targetWaterMl } = metrics;

  // Calorie & macro percentages
  const kcalPercent = Math.min(100, Math.round((todaysTotalKcal / targetDailyCalories) * 100));
  const remainingKcal = targetDailyCalories - todaysTotalKcal;
  const proteinPercent = Math.min(100, Math.round((todaysProteinGrams / targetProteinGrams) * 100));
  const carbsPercent = Math.min(100, Math.round((todaysCarbsGrams / targetCarbsGrams) * 100));
  const fatPercent = Math.min(100, Math.round((todaysFatGrams / targetFatGrams) * 100));

  // Water calculations
  const waterTargetGlasses = Math.max(1, Math.round(targetWaterMl / 250));
  const waterConsumedGlasses = Math.round(todaysWaterTotalMl / 250);
  const waterPercent = Math.min(100, Math.round((todaysWaterTotalMl / targetWaterMl) * 100));

  const handleAddWaterGlass = async () => {
    playTaskCheckSound();
    await onLogWater(250, selectedDate);

    if (todaysWaterTotalMl + 250 >= targetWaterMl && todaysWaterTotalMl < targetWaterMl) {
      playSuccessChime();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#60A5FA', '#93C5FD', '#BFDBFE'],
      });
    }
  };

  const handleRemoveWaterGlass = async () => {
    playClickSound();
    await onRemoveLatestWater();
  };

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Voice dictation is supported in Chrome/Edge/Android.');
      return;
    }

    if (isVoiceActive) {
      stopVoiceDictation();
      setIsVoiceActive(false);
    } else {
      setIsVoiceActive(true);
      startVoiceDictation({
        onTranscript: (transcript: string) => {
          setMealText(transcript);
        },
        onError: () => setIsVoiceActive(false),
        onEnd: () => setIsVoiceActive(false),
      });
    }
  };

  const handleEstimateAndLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealText.trim()) return;

    setIsEstimating(true);
    playClickSound();

    try {
      const result = await estimateMealNutritionWithAI(mealText.trim(), mealType);

      await onLogMeal({
        date: selectedDate,
        name: result.name,
        mealType: result.mealType,
        kcal: result.kcal,
        proteinGrams: result.proteinGrams,
        carbsGrams: result.carbsGrams,
        fatGrams: result.fatGrams,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        aiEstimated: true,
      });

      playSuccessChime();
      setMealText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealText.trim()) return;

    playSuccessChime();
    await onLogMeal({
      date: selectedDate,
      name: mealText.trim(),
      mealType,
      kcal: Number(manualKcal) || 300,
      proteinGrams: Number(manualProtein) || 15,
      carbsGrams: Number(manualCarbs) || 35,
      fatGrams: Number(manualFat) || 10,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aiEstimated: false,
    });

    setMealText('');
    setManualKcal('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setShowManualInputs(false);
  };

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      
      {/* 1. Calorie Budget & Macronutrient Card */}
      <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#FBECCF] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Flame className="w-3.5 h-3.5 text-[#854D0E]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#6B635B] uppercase tracking-wider block font-display leading-none">
                Energy Budget
              </span>
              <h2 className="text-sm font-bold font-display text-[#24201D] mt-0.5 leading-none">
                Calories & Macros
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-[#6B635B] uppercase block">Remaining</span>
            <span className={`text-sm font-black font-mono-num leading-none ${remainingKcal < 0 ? 'text-red-500' : 'text-[#3D6B52]'}`}>
              {remainingKcal} kcal
            </span>
          </div>
        </div>

        {/* Main Calorie Numbers */}
        <div className="p-3.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-2">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-black font-mono-num text-[#24201D]">
                {todaysTotalKcal}
              </span>
              <span className="text-xs font-bold text-[#6B635B] ml-1">/ {targetDailyCalories} kcal</span>
            </div>
            <span className="text-xs font-black font-mono-num text-[#24201D]">
              {kcalPercent}%
            </span>
          </div>

          <div className="w-full bg-white border border-[#24201D] h-3 rounded-full overflow-hidden p-0.5 shadow-2xs">
            <div
              className={`h-full rounded-full transition-all duration-300 ${remainingKcal < 0 ? 'bg-red-500' : 'bg-[#F0BB58]'}`}
              style={{ width: `${Math.min(100, kcalPercent)}%` }}
            />
          </div>
        </div>

        {/* Macro Progress Bars */}
        <div className="grid grid-cols-3 gap-2">
          {/* Protein */}
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-[#6B635B]">
              <span>Protein</span>
              <span className="font-mono-num">{proteinPercent}%</span>
            </div>
            <div className="text-xs font-black font-mono-num text-[#24201D]">
              {todaysProteinGrams} <span className="text-[10px] text-[#6B635B]">/ {targetProteinGrams}g</span>
            </div>
            <div className="w-full bg-white border border-[#24201D]/30 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#EF4444] rounded-full" style={{ width: `${proteinPercent}%` }} />
            </div>
          </div>

          {/* Carbs */}
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-[#6B635B]">
              <span>Carbs</span>
              <span className="font-mono-num">{carbsPercent}%</span>
            </div>
            <div className="text-xs font-black font-mono-num text-[#24201D]">
              {todaysCarbsGrams} <span className="text-[10px] text-[#6B635B]">/ {targetCarbsGrams}g</span>
            </div>
            <div className="w-full bg-white border border-[#24201D]/30 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${carbsPercent}%` }} />
            </div>
          </div>

          {/* Fat */}
          <div className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase text-[#6B635B]">
              <span>Fat</span>
              <span className="font-mono-num">{fatPercent}%</span>
            </div>
            <div className="text-xs font-black font-mono-num text-[#24201D]">
              {todaysFatGrams} <span className="text-[10px] text-[#6B635B]">/ {targetFatGrams}g</span>
            </div>
            <div className="w-full bg-white border border-[#24201D]/30 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${fatPercent}%` }} />
            </div>
          </div>
        </div>

      </div>

      {/* 2. Water Hydration Tracker */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#E0F2FE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Droplets className="w-3.5 h-3.5 text-[#0369A1]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                Water Hydration
              </h3>
              <span className="text-[10px] font-bold text-[#6B635B]">
                {todaysWaterTotalMl} / {targetWaterMl} ml ({waterPercent}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRemoveWaterGlass}
              disabled={todaysWaterTotalMl <= 0}
              title="Remove 250ml"
              className="w-7 h-7 rounded-lg bg-[#FAF8F5] hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 cursor-pointer"
            >
              <Minus className="w-3 h-3 stroke-[2.5]" />
            </button>
            <button
              onClick={handleAddWaterGlass}
              title="Add 250ml Glass"
              className="px-2.5 py-1 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white border border-[#24201D] flex items-center gap-1 text-[11px] font-bold shadow-2xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>+250 ml</span>
            </button>
          </div>
        </div>

        {/* Glasses Visual Matrix */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {Array.from({ length: Math.max(8, waterTargetGlasses) }).map((_, i) => {
            const isFilled = i < waterConsumedGlasses;
            return (
              <button
                key={i}
                type="button"
                onClick={isFilled && i === waterConsumedGlasses - 1 ? handleRemoveWaterGlass : handleAddWaterGlass}
                className={`w-8 h-10 rounded-lg border-[1.5px] border-[#24201D] flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 ${
                  isFilled
                    ? 'bg-[#38BDF8] text-white font-black'
                    : 'bg-[#FAF8F5] text-stone-300 hover:border-[#24201D]'
                }`}
              >
                <Droplets className={`w-3.5 h-3.5 ${isFilled ? 'fill-white' : ''}`} />
                <span className="text-[8px] font-mono-num leading-none mt-0.5">
                  {i + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. AI Meal Logger (Voice or Text) */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Bot className="w-3.5 h-3.5 text-[#2D503C]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                AI Meal Logger
              </h3>
              <span className="text-[10px] font-bold text-[#6B635B]">
                Type or speak what you ate
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowManualInputs(!showManualInputs)}
            className="text-[10px] font-bold text-[#3D6B52] hover:underline cursor-pointer"
          >
            {showManualInputs ? 'Auto AI Mode' : 'Manual Numbers'}
          </button>
        </div>

        {/* Meal Type Pills */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#FAF8F5] border border-[#24201D] rounded-xl shadow-2xs">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                playClickSound();
                setMealType(t);
              }}
              className={`py-1 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${
                mealType === t ? 'bg-[#24201D] text-white shadow-2xs' : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Text Input with embedded voice button */}
        <form onSubmit={showManualInputs ? handleManualLog : handleEstimateAndLog} className="space-y-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. 2 fried eggs, rye toast, black coffee..."
              value={mealText}
              onChange={(e) => setMealText(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
            />
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg border border-[#24201D] cursor-pointer transition-all ${
                isVoiceActive ? 'bg-[#C25E40] text-white animate-pulse' : 'bg-white text-[#24201D]'
              }`}
            >
              {isVoiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Manual inputs toggle */}
          {showManualInputs && (
            <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Kcal</span>
                <input
                  type="number"
                  placeholder="350"
                  value={manualKcal}
                  onChange={(e) => setManualKcal(e.target.value)}
                  className="w-full p-1 text-xs font-bold bg-white border border-[#24201D] rounded font-mono-num"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Protein</span>
                <input
                  type="number"
                  placeholder="25g"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  className="w-full p-1 text-xs font-bold bg-white border border-[#24201D] rounded font-mono-num"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Carbs</span>
                <input
                  type="number"
                  placeholder="40g"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                  className="w-full p-1 text-xs font-bold bg-white border border-[#24201D] rounded font-mono-num"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Fat</span>
                <input
                  type="number"
                  placeholder="12g"
                  value={manualFat}
                  onChange={(e) => setManualFat(e.target.value)}
                  className="w-full p-1 text-xs font-bold bg-white border border-[#24201D] rounded font-mono-num"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!mealText.trim() || isEstimating}
            className="w-full py-2.5 bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-40 text-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-black shadow-2xs cursor-pointer active:translate-y-0.5 transition-all flex items-center justify-center gap-2 font-display uppercase tracking-wider"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>{isEstimating ? 'Estimating with AI...' : showManualInputs ? 'Save Meal' : 'Estimate & Log with AI'}</span>
          </button>
        </form>
      </div>

      {/* 4. Today's Logged Meals */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
        <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
          Today's Meals ({todaysMeals.length})
        </h3>

        {todaysMeals.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No meals logged for today.</p>
        ) : (
          <div className="space-y-2">
            {todaysMeals.map((meal) => (
              <div
                key={meal.id}
                className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#24201D] truncate">
                      {meal.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-white border border-[#24201D]/20 text-[#6B635B]">
                      {meal.mealType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[10px] font-bold font-mono-num text-[#6B635B] flex-wrap">
                    <span className="text-[#24201D]">{meal.kcal} kcal</span>
                    <span>•</span>
                    <span>P: {meal.proteinGrams}g</span>
                    <span>C: {meal.carbsGrams}g</span>
                    <span>F: {meal.fatGrams}g</span>
                    {meal.time && (
                      <>
                        <span>•</span>
                        <span className="font-normal text-stone-400">{meal.time}</span>
                      </>
                    )}
                  </div>
                </div>

                {meal.id && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onDeleteMealLog(meal.id!);
                    }}
                    title="Delete meal"
                    className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-white transition-all cursor-pointer ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
