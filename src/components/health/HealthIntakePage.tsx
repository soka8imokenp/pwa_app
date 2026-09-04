import React, { useState } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  Mic,
  MicOff,
  Bot,
  Settings2,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playClickSound, playSuccessChime, playTaskCheckSound } from '../../lib/sound';
import { startVoiceDictation, stopVoiceDictation, isSpeechRecognitionSupported } from '../../lib/speechRecognition';
import type { MealLog, WaterLog, MealType, CalculatedHealthMetrics } from '../../types/health';
import { estimateMealNutritionWithAI } from '../../lib/aiHealthService';

// Decomposed Modular Subcomponents
import { MacroProgressCards } from './intake/MacroProgressCards';
import { WaterTrackerCard } from './intake/WaterTrackerCard';
import { MealListSection } from './intake/MealListSection';

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

interface QuickPresetItem {
  id: string;
  text: string;
  kcal: number;
  type: MealType;
}

const DEFAULT_PRESETS: QuickPresetItem[] = [
  { id: '1', text: 'Coffee with milk', kcal: 50, type: 'breakfast' },
  { id: '2', text: '2 Boiled Eggs & Toast', kcal: 220, type: 'breakfast' },
  { id: '3', text: 'Chicken Breast & Rice', kcal: 450, type: 'lunch' },
  { id: '4', text: 'Protein Shake', kcal: 180, type: 'snack' },
];

export const HealthIntakePage: React.FC<HealthIntakePageProps> = ({
  metrics,
  todaysMeals,
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

  // Quick presets management state
  const [presets, setPresets] = useState<QuickPresetItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_meal_quick_presets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_PRESETS;
        }
      }
    }
    return DEFAULT_PRESETS;
  });

  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetKcal, setNewPresetKcal] = useState('');
  const [newPresetType, setNewPresetType] = useState<MealType>('snack');

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

  const handleAddWaterInternal = async (amountMl = 250) => {
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

  const handleRemoveWaterInternal = async () => {
    playClickSound();
    await onRemoveLatestWater();
  };

  // Voice Dictation
  const handleToggleVoice = () => {
    playClickSound();
    if (isVoiceActive) {
      stopVoiceDictation();
      setIsVoiceActive(false);
    } else {
      setIsVoiceActive(true);
      startVoiceDictation({
        onTranscript: (text: string) => {
          setMealText((prev) => (prev ? `${prev} ${text}` : text));
        },
        onEnd: () => {
          setIsVoiceActive(false);
        },
      });
    }
  };

  // Submit Meal
  const handleAddMeal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mealText.trim()) return;

    playClickSound();
    setIsEstimating(true);

    try {
      if (showManualInputs && manualKcal) {
        await onLogMeal({
          date: selectedDate,
          name: mealText.trim(),
          mealType,
          kcal: parseInt(manualKcal, 10) || 0,
          proteinGrams: parseFloat(manualProtein) || 0,
          carbsGrams: parseFloat(manualCarbs) || 0,
          fatGrams: parseFloat(manualFat) || 0,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          aiEstimated: false,
        });
      } else {
        const est = await estimateMealNutritionWithAI(mealText.trim(), mealType);
        await onLogMeal({
          date: selectedDate,
          name: est.name,
          mealType: est.mealType,
          kcal: est.kcal,
          proteinGrams: est.proteinGrams,
          carbsGrams: est.carbsGrams,
          fatGrams: est.fatGrams,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          aiEstimated: true,
        });
      }

      setMealText('');
      setManualKcal('');
      setManualProtein('');
      setManualCarbs('');
      setManualFat('');
      playSuccessChime();
    } catch (err) {
      console.error(err);
    } finally {
      setIsEstimating(false);
    }
  };

  // Preset Handlers
  const handleApplyPreset = async (p: QuickPresetItem) => {
    playClickSound();
    setIsEstimating(true);
    try {
      const est = await estimateMealNutritionWithAI(p.text, p.type);
      await onLogMeal({
        date: selectedDate,
        name: est.name,
        mealType: est.mealType,
        kcal: est.kcal,
        proteinGrams: est.proteinGrams,
        carbsGrams: est.carbsGrams,
        fatGrams: est.fatGrams,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        aiEstimated: true,
      });
      playSuccessChime();
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSaveNewPreset = () => {
    if (!newPresetName.trim()) return;
    playClickSound();
    const updated = [
      ...presets,
      {
        id: String(Date.now()),
        text: newPresetName.trim(),
        kcal: parseInt(newPresetKcal, 10) || 150,
        type: newPresetType,
      },
    ];
    setPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_meal_quick_presets', JSON.stringify(updated));
    }
    setNewPresetName('');
    setNewPresetKcal('');
  };

  const handleDeletePreset = (id: string) => {
    playClickSound();
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_meal_quick_presets', JSON.stringify(updated));
    }
  };

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      {/* 1. Macro & Calorie Progress Cards (Decomposed) */}
      <MacroProgressCards
        todaysTotalKcal={todaysTotalKcal}
        effectiveTarget={effectiveTarget}
        remainingKcal={remainingKcal}
        kcalPercent={kcalPercent}
        todaysActiveCaloriesBurned={todaysActiveCaloriesBurned}
        todaysProteinGrams={todaysProteinGrams}
        targetProteinGrams={targetProteinGrams}
        proteinPercent={proteinPercent}
        proteinRemaining={proteinRemaining}
        todaysCarbsGrams={todaysCarbsGrams}
        targetCarbsGrams={targetCarbsGrams}
        carbsPercent={carbsPercent}
        carbsRemaining={carbsRemaining}
        todaysFatGrams={todaysFatGrams}
        targetFatGrams={targetFatGrams}
        fatPercent={fatPercent}
        fatRemaining={fatRemaining}
      />

      {/* 2. Water Hydration Tracker (Decomposed) */}
      <WaterTrackerCard
        todaysWaterTotalMl={todaysWaterTotalMl}
        targetWaterMl={targetWaterMl}
        onAddWater={handleAddWaterInternal}
        onRemoveWater={handleRemoveWaterInternal}
      />

      {/* 3. AI Meal Logger Form */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Bot className="w-4 h-4 text-[#2D503C]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                Meal Logger
              </h3>
              <span className="text-[10px] font-bold text-[#6B635B]">
                AI voice dictation or text
              </span>
            </div>
          </div>

          <div className="flex items-center p-0.5 bg-[#FAF8F5] border border-[#24201D] rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowManualInputs(false);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase font-display transition-all cursor-pointer ${
                !showManualInputs
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              AI Auto
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowManualInputs(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase font-display transition-all cursor-pointer ${
                showManualInputs
                  ? 'bg-[#24201D] text-white shadow-2xs'
                  : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* Meal Form */}
        <form onSubmit={handleAddMeal} className="space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={mealText}
                onChange={(e) => setMealText(e.target.value)}
                placeholder='e.g. "Chicken salad with avocado and 2 toasts"'
                className="w-full px-3 py-2 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 focus:outline-none focus:bg-white transition-all pr-8"
              />
              {mealText && (
                <button
                  type="button"
                  onClick={() => setMealText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isSpeechRecognitionSupported() && (
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-2 rounded-xl border border-[#24201D] flex items-center justify-center transition-all cursor-pointer ${
                  isVoiceActive
                    ? 'bg-[#DC2626] text-white shadow-2xs animate-pulse'
                    : 'bg-[#FAF8F5] hover:bg-stone-100 text-[#24201D]'
                }`}
              >
                {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Meal Type Pill Selector */}
          <div className="grid grid-cols-4 gap-1.5">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  playClickSound();
                  setMealType(t);
                }}
                className={`py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider font-display transition-all cursor-pointer ${
                  mealType === t
                    ? 'bg-[#24201D] text-white border-[#24201D] shadow-2xs'
                    : 'bg-[#FAF8F5] hover:bg-stone-100 text-[#6B635B] border-[#24201D]/20'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Optional Manual Inputs */}
          {showManualInputs && (
            <div className="grid grid-cols-4 gap-2 pt-1">
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Kcal</span>
                <input
                  type="number"
                  value={manualKcal}
                  onChange={(e) => setManualKcal(e.target.value)}
                  placeholder="350"
                  className="w-full px-2 py-1.5 bg-[#FAF8F5] border border-[#24201D]/30 rounded-xl text-xs font-mono-num font-bold text-[#24201D] mt-0.5"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Protein</span>
                <input
                  type="number"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(e.target.value)}
                  placeholder="25g"
                  className="w-full px-2 py-1.5 bg-[#FAF8F5] border border-[#24201D]/30 rounded-xl text-xs font-mono-num font-bold text-[#24201D] mt-0.5"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Carbs</span>
                <input
                  type="number"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(e.target.value)}
                  placeholder="40g"
                  className="w-full px-2 py-1.5 bg-[#FAF8F5] border border-[#24201D]/30 rounded-xl text-xs font-mono-num font-bold text-[#24201D] mt-0.5"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-[#6B635B] uppercase block">Fat</span>
                <input
                  type="number"
                  value={manualFat}
                  onChange={(e) => setManualFat(e.target.value)}
                  placeholder="12g"
                  className="w-full px-2 py-1.5 bg-[#FAF8F5] border border-[#24201D]/30 rounded-xl text-xs font-mono-num font-bold text-[#24201D] mt-0.5"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!mealText.trim() || isEstimating}
            className="w-full py-2.5 bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-50 text-white border border-[#24201D] rounded-xl text-xs font-black shadow-2xs uppercase tracking-wider font-display transition-all cursor-pointer active:translate-y-0.5"
          >
            {isEstimating ? 'AI Estimating Kcal & Macros...' : '+ Add Meal'}
          </button>
        </form>

        {/* Quick Presets Bar */}
        <div className="pt-2 border-t border-[#24201D]/15 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              Quick Meal Presets
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsEditingPresets(!isEditingPresets);
              }}
              className="p-1 rounded-lg text-[#6B635B] hover:text-[#24201D] hover:bg-[#FAF8F5]"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map((p) => (
              <div key={p.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  disabled={isEstimating}
                  className="px-2.5 py-1 bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/20 rounded-xl text-[10px] font-bold text-[#24201D] shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>{p.text}</span>
                  <span className="text-[#6B635B] font-mono-num">({p.kcal}k)</span>
                </button>
                {isEditingPresets && (
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p.id)}
                    className="p-1 text-red-500 hover:text-red-700 ml-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isEditingPresets && (
            <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase text-[#6B635B] block font-display">
                Create New Quick Preset
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset title (e.g. Oatmeal)"
                  className="flex-1 px-2.5 py-1.5 bg-white border border-[#24201D]/20 rounded-xl text-xs font-bold"
                />
                <input
                  type="number"
                  value={newPresetKcal}
                  onChange={(e) => setNewPresetKcal(e.target.value)}
                  placeholder="Kcal"
                  className="w-16 px-2 py-1.5 bg-white border border-[#24201D]/20 rounded-xl text-xs font-mono-num font-bold"
                />
                <button
                  type="button"
                  onClick={handleSaveNewPreset}
                  className="px-3 py-1.5 bg-[#24201D] text-white rounded-xl text-xs font-black"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Meal Breakdown List Section (Decomposed) */}
      <MealListSection
        todaysMeals={todaysMeals}
        onDeleteMeal={onDeleteMealLog}
      />
    </div>
  );
};
export default HealthIntakePage;
