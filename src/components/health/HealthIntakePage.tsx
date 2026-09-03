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
  Zap,
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
  todaysActiveCaloriesBurned?: number;
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
  todaysActiveCaloriesBurned = 0,
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

  // Calorie calculations including active workout burn
  const effectiveTarget = targetDailyCalories + todaysActiveCaloriesBurned;
  const kcalPercent = Math.min(100, Math.round((todaysTotalKcal / effectiveTarget) * 100));
  const remainingKcal = effectiveTarget - todaysTotalKcal;

  // Macro percentages and remainders
  const proteinPercent = Math.min(100, Math.round((todaysProteinGrams / targetProteinGrams) * 100));
  const carbsPercent = Math.min(100, Math.round((todaysCarbsGrams / targetCarbsGrams) * 100));
  const fatPercent = Math.min(100, Math.round((todaysFatGrams / targetFatGrams) * 100));

  const proteinRemaining = Math.max(0, targetProteinGrams - todaysProteinGrams);
  const carbsRemaining = Math.max(0, targetCarbsGrams - todaysCarbsGrams);
  const fatRemaining = Math.max(0, targetFatGrams - todaysFatGrams);

  // Water calculations
  const waterTargetGlasses = Math.max(1, Math.round(targetWaterMl / 250));
  const waterConsumedGlasses = Math.round(todaysWaterTotalMl / 250);
  const waterPercent = Math.min(100, Math.round((todaysWaterTotalMl / targetWaterMl) * 100));

  const handleAddWater = async (amountMl = 250) => {
    playTaskCheckSound();
    await onLogWater(amountMl, selectedDate);

    if (todaysWaterTotalMl + amountMl >= targetWaterMl && todaysWaterTotalMl < targetWaterMl) {
      playSuccessChime();
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#60A5FA', '#93C5FD', '#BFDBFE'],
      });
    }
  };

  const handleRemoveWater = async () => {
    playClickSound();
    await onRemoveLatestWater();
  };

  const handleToggleVoice = () => {
    if (!isSpeechRecognitionSupported()) {
      alert('Voice dictation is supported in Chrome, Edge, and Android.');
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

  const handleQuickPreset = (presetText: string, suggestedType: MealType) => {
    playClickSound();
    setMealText(presetText);
    setMealType(suggestedType);
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

  // Group meals by meal type
  const groupedMeals = React.useMemo(() => {
    const groups: Record<MealType, MealLog[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    todaysMeals.forEach((m) => {
      if (groups[m.mealType]) {
        groups[m.mealType].push(m);
      } else {
        groups.snack.push(m);
      }
    });
    return groups;
  }, [todaysMeals]);

  const mealTypeConfig: Record<MealType, { label: string; icon: string }> = {
    breakfast: { label: 'Breakfast', icon: '🍳' },
    lunch: { label: 'Lunch', icon: '🥗' },
    dinner: { label: 'Dinner', icon: '🍲' },
    snack: { label: 'Snacks', icon: '🍎' },
  };

  const quickPresets = [
    { text: 'Coffee with milk', kcal: 50, type: 'breakfast' as MealType },
    { text: '2 Boiled Eggs & Toast', kcal: 220, type: 'breakfast' as MealType },
    { text: 'Chicken Breast & Rice', kcal: 450, type: 'lunch' as MealType },
    { text: 'Protein Shake', kcal: 180, type: 'snack' as MealType },
    { text: 'Salmon & Steamed Veggies', kcal: 480, type: 'dinner' as MealType },
    { text: 'Greek Yogurt & Honey', kcal: 160, type: 'snack' as MealType },
  ];

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      
      {/* 1. Calorie Budget & Energy Balance Card */}
      <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-4">
        
        {/* Top bar with remaining balance */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FBECCF] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Flame className="w-4 h-4 text-[#854D0E]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
                Energy Balance
              </span>
              <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
                Calories & Macros
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-[#6B635B] uppercase block">
              {remainingKcal < 0 ? 'Over Target' : 'Remaining'}
            </span>
            <span className={`text-base font-black font-mono-num leading-none ${remainingKcal < 0 ? 'text-red-500' : 'text-[#3D6B52]'}`}>
              {remainingKcal < 0 ? `+${Math.abs(remainingKcal)}` : remainingKcal} kcal
            </span>
          </div>
        </div>

        {/* Main Calorie Progress Bar */}
        <div className="p-3.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-black font-mono-num text-[#24201D]">
                {todaysTotalKcal}
              </span>
              <span className="text-xs font-bold text-[#6B635B] ml-1">
                / {effectiveTarget} kcal
              </span>
            </div>

            <div className="flex items-center gap-2">
              {todaysActiveCaloriesBurned > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#DDE8DE] border border-[#24201D]/20 text-[#2D503C] flex items-center gap-0.5 font-mono-num">
                  <Zap className="w-2.5 h-2.5 fill-[#2D503C]" />
                  +{todaysActiveCaloriesBurned} burned
                </span>
              )}
              <span className="text-xs font-black font-mono-num text-[#24201D]">
                {kcalPercent}%
              </span>
            </div>
          </div>

          <div className="w-full bg-white border border-[#24201D] h-3 rounded-full overflow-hidden p-0.5 shadow-2xs">
            <div
              className={`h-full rounded-full transition-all duration-300 ${remainingKcal < 0 ? 'bg-red-500' : 'bg-[#3D6B52]'}`}
              style={{ width: `${Math.min(100, kcalPercent)}%` }}
            />
          </div>
        </div>

        {/* Macro Progress Cards */}
        <div className="grid grid-cols-3 gap-2">
          {/* Protein */}
          <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[9px] font-black uppercase text-[#6B635B] font-display">
              <span>Protein</span>
              <span className="font-mono-num">{proteinPercent}%</span>
            </div>
            <div className="text-xs font-black font-mono-num text-[#24201D]">
              {todaysProteinGrams} <span className="text-[10px] text-[#6B635B]">/ {targetProteinGrams}g</span>
            </div>
            <div className="w-full bg-white border border-[#24201D]/30 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#EF4444] rounded-full" style={{ width: `${proteinPercent}%` }} />
            </div>
            <span className="text-[8px] font-bold text-stone-400 block font-mono-num">
              {proteinRemaining > 0 ? `${proteinRemaining}g left` : 'Goal reached'}
            </span>
          </div>

          {/* Carbs */}
          <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[9px] font-black uppercase text-[#6B635B] font-display">
              <span>Carbs</span>
              <span className="font-mono-num">{carbsPercent}%</span>
            </div>
            <div className="text-xs font-black font-mono-num text-[#24201D]">
              {todaysCarbsGrams} <span className="text-[10px] text-[#6B635B]">/ {targetCarbsGrams}g</span>
            </div>
            <div className="w-full bg-white border border-[#24201D]/30 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${carbsPercent}%` }} />
            </div>
            <span className="text-[8px] font-bold text-stone-400 block font-mono-num">
              {carbsRemaining > 0 ? `${carbsRemaining}g left` : 'Goal reached'}
            </span>
          </div>

          {/* Fat */}
          <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[9px] font-black uppercase text-[#6B635B] font-display">
              <span>Fat</span>
              <span className="font-mono-num">{fatPercent}%</span>
            </div>
            <div className="text-xs font-black font-mono-num text-[#24201D]">
              {todaysFatGrams} <span className="text-[10px] text-[#6B635B]">/ {targetFatGrams}g</span>
            </div>
            <div className="w-full bg-white border border-[#24201D]/30 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${fatPercent}%` }} />
            </div>
            <span className="text-[8px] font-bold text-stone-400 block font-mono-num">
              {fatRemaining > 0 ? `${fatRemaining}g left` : 'Goal reached'}
            </span>
          </div>
        </div>

      </div>

      {/* 2. Water Hydration Tracker */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Droplets className="w-4 h-4 text-[#0369A1]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                Water Hydration
              </h3>
              <span className="text-[10px] font-bold text-[#6B635B] font-mono-num">
                {todaysWaterTotalMl} / {targetWaterMl} ml ({waterPercent}%)
              </span>
            </div>
          </div>

          {/* Water Steppers */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRemoveWater}
              disabled={todaysWaterTotalMl <= 0}
              title="Remove 250ml"
              className="w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs active:scale-95 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => handleAddWater(250)}
              title="Add 250ml Glass"
              className="px-2.5 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white border border-[#24201D] flex items-center gap-1 text-xs font-black shadow-2xs active:scale-95 cursor-pointer font-display"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>+250 ml</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddWater(500)}
              title="Add 500ml Bottle"
              className="px-2 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-[#0284C7] border border-[#24201D] text-xs font-black shadow-2xs active:scale-95 cursor-pointer font-display"
            >
              <span>+500</span>
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
                onClick={isFilled && i === waterConsumedGlasses - 1 ? handleRemoveWater : () => handleAddWater(250)}
                className={`w-8 h-10 rounded-xl border-[1.5px] border-[#24201D] flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 ${
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
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Bot className="w-4 h-4 text-[#2D503C]" />
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
            onClick={() => {
              playClickSound();
              setShowManualInputs(!showManualInputs);
            }}
            className="text-[10px] font-bold text-[#3D6B52] hover:underline cursor-pointer"
          >
            {showManualInputs ? 'Switch to AI' : 'Manual Entry'}
          </button>
        </div>

        {/* Meal Type Pills */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                playClickSound();
                setMealType(t);
              }}
              className={`py-1.5 rounded-lg text-xs font-black capitalize transition-all cursor-pointer flex items-center justify-center gap-1 ${
                mealType === t ? 'bg-[#24201D] text-white shadow-2xs' : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              <span>{mealTypeConfig[t].icon}</span>
              <span className="text-[11px]">{mealTypeConfig[t].label}</span>
            </button>
          ))}
        </div>

        {/* Quick Food Presets */}
        <div className="space-y-1">
          <span className="text-[9px] font-black uppercase text-[#6B635B] font-display">
            Quick Add Presets:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {quickPresets.map((preset) => (
              <button
                key={preset.text}
                type="button"
                onClick={() => handleQuickPreset(preset.text, preset.type)}
                className="px-2 py-0.5 rounded-lg bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 hover:border-[#24201D] text-[10px] font-bold text-[#24201D] transition-all cursor-pointer shadow-2xs"
              >
                {preset.text} <span className="font-mono-num text-[#6B635B]">({preset.kcal}k)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Input with embedded voice button */}
        <form onSubmit={showManualInputs ? handleManualLog : handleEstimateAndLog} className="space-y-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. 2 fried eggs, rye toast, black coffee..."
              value={mealText}
              onChange={(e) => setMealText(e.target.value)}
              className="w-full pl-3.5 pr-11 py-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
            />
            <button
              type="button"
              onClick={handleToggleVoice}
              title="Voice Dictation"
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg border border-[#24201D] cursor-pointer transition-all shadow-2xs ${
                isVoiceActive ? 'bg-[#DC2626] text-white animate-pulse' : 'bg-white text-[#24201D]'
              }`}
            >
              {isVoiceActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Voice Listening Feedback Bar */}
          {isVoiceActive && (
            <div className="p-2 bg-[#FBECCF] border border-[#24201D] rounded-xl flex items-center gap-2 text-xs font-bold text-[#854D0E] animate-pulse">
              <Mic className="w-3.5 h-3.5" />
              <span>Listening... Speak your meal ingredients and portions clearly.</span>
            </div>
          )}

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
                  className="w-full p-1.5 text-xs font-bold bg-white border border-[#24201D] rounded-lg font-mono-num focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Protein</span>
                <input
                  type="number"
                  placeholder="25g"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  className="w-full p-1.5 text-xs font-bold bg-white border border-[#24201D] rounded-lg font-mono-num focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Carbs</span>
                <input
                  type="number"
                  placeholder="40g"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                  className="w-full p-1.5 text-xs font-bold bg-white border border-[#24201D] rounded-lg font-mono-num focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Fat</span>
                <input
                  type="number"
                  placeholder="12g"
                  value={manualFat}
                  onChange={(e) => setManualFat(e.target.value)}
                  className="w-full p-1.5 text-xs font-bold bg-white border border-[#24201D] rounded-lg font-mono-num focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!mealText.trim() || isEstimating}
            className="w-full py-3 bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-40 text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all flex items-center justify-center gap-2 font-display uppercase tracking-wider"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>{isEstimating ? 'Estimating with AI...' : showManualInputs ? 'Save Meal Record' : 'Estimate & Log Meal with AI'}</span>
          </button>
        </form>
      </div>

      {/* 4. Grouped Daily Meals History */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
            Daily Intake Log ({todaysMeals.length})
          </h3>
          <span className="text-xs font-black font-mono-num text-[#24201D]">
            Total: {todaysTotalKcal} kcal
          </span>
        </div>

        {todaysMeals.length === 0 ? (
          <p className="text-xs text-stone-400 italic py-2">No meals recorded for this date.</p>
        ) : (
          <div className="space-y-3">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((category) => {
              const items = groupedMeals[category];
              if (items.length === 0) return null;

              const subtotalKcal = items.reduce((acc, m) => acc + (m.kcal || 0), 0);

              return (
                <div key={category} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-black font-display uppercase tracking-wider text-[#24201D] flex items-center gap-1">
                      <span>{mealTypeConfig[category].icon}</span>
                      <span>{mealTypeConfig[category].label}</span>
                    </span>
                    <span className="text-[10px] font-bold font-mono-num text-[#6B635B]">
                      {subtotalKcal} kcal
                    </span>
                  </div>

                  <div className="space-y-1">
                    {items.map((meal) => (
                      <div
                        key={meal.id}
                        className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#24201D] truncate">
                              {meal.name}
                            </span>
                            {meal.time && (
                              <span className="text-[9px] text-stone-400 font-mono-num">
                                {meal.time}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold font-mono-num text-[#6B635B] flex-wrap">
                            <span className="text-[#24201D] font-black">{meal.kcal} kcal</span>
                            <span>•</span>
                            <span>P: {meal.proteinGrams}g</span>
                            <span>•</span>
                            <span>C: {meal.carbsGrams}g</span>
                            <span>•</span>
                            <span>F: {meal.fatGrams}g</span>
                          </div>
                        </div>

                        {meal.id && (
                          <button
                            type="button"
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
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
