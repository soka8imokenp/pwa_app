import React, { useState, useMemo } from 'react';
import {
  Activity,
  Dumbbell,
  Footprints,
  Flame,
  Plus,
  Minus,
  Trash2,
  Clock,
  Heart,
  Zap,
  Settings2,
  Check,
  X,
  Timer,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playClickSound, playSuccessChime, playTaskCheckSound } from '../../lib/sound';
import type { WorkoutLog, HealthProfile, CalculatedHealthMetrics } from '../../types/health';

interface HealthActivityPageProps {
  profile?: HealthProfile;
  metrics?: CalculatedHealthMetrics;
  todaysWorkouts: WorkoutLog[];
  todaysActiveCaloriesBurned: number;
  selectedDate: string;
  onLogWorkout: (workout: Omit<WorkoutLog, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteWorkout: (id: number) => Promise<void>;
}

type WorkoutCategory = WorkoutLog['category'];
type IntensityLevel = 'low' | 'moderate' | 'high';

interface WorkoutPreset {
  id: string;
  title: string;
  category: WorkoutCategory;
  durationMinutes: number;
}

const DEFAULT_WORKOUT_PRESETS: WorkoutPreset[] = [
  { id: '1', title: 'Strength Training', category: 'gym', durationMinutes: 45 },
  { id: '2', title: 'Outdoor Running', category: 'run', durationMinutes: 30 },
  { id: '3', title: 'Brisk Walk', category: 'walk', durationMinutes: 30 },
  { id: '4', title: 'HIIT Session', category: 'cardio', durationMinutes: 25 },
  { id: '5', title: 'Mobility & Yoga', category: 'stretch', durationMinutes: 20 },
];

// Exercise MET values (Compendium of Physical Activities)
const MET_VALUES: Record<WorkoutCategory, number> = {
  gym: 5.5,
  run: 9.0,
  cardio: 7.5,
  walk: 3.8,
  stretch: 2.8,
};

const INTENSITY_MULTIPLIERS: Record<IntensityLevel, number> = {
  low: 0.85,
  moderate: 1.0,
  high: 1.25,
};

export const HealthActivityPage: React.FC<HealthActivityPageProps> = ({
  profile,
  metrics,
  todaysWorkouts,
  todaysActiveCaloriesBurned,
  selectedDate,
  onLogWorkout,
  onDeleteWorkout,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WorkoutCategory>('gym');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [intensity, setIntensity] = useState<IntensityLevel>('moderate');
  const [customCalories, setCustomCalories] = useState<string>('');

  // Presets state
  const [presets, setPresets] = useState<WorkoutPreset[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kairo_workout_quick_presets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_WORKOUT_PRESETS;
        }
      }
    }
    return DEFAULT_WORKOUT_PRESETS;
  });

  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<WorkoutCategory>('gym');
  const [newPresetDuration, setNewPresetDuration] = useState<number>(30);

  const userWeight = profile?.currentWeight || 70;

  // Daily target active calories based on user profile activity level
  const dailyTargetActiveKcal = useMemo(() => {
    switch (profile?.activityLevel) {
      case 'sedentary':
        return 250;
      case 'light':
        return 350;
      case 'very_active':
        return 650;
      case 'moderate':
      default:
        return 450;
    }
  }, [profile?.activityLevel]);

  // Scientific MET Calorie Calculation: MET * Intensity * Weight (kg) * (Minutes / 60)
  const calculatedKcal = useMemo(() => {
    const met = MET_VALUES[category] || 5.0;
    const mult = INTENSITY_MULTIPLIERS[intensity] || 1.0;
    return Math.round((met * mult * userWeight * durationMinutes) / 60);
  }, [category, intensity, userWeight, durationMinutes]);

  // Effective calories to log
  const effectiveCalories = customCalories !== '' ? Number(customCalories) || 0 : calculatedKcal;

  const totalWorkoutMinutes = useMemo(() => {
    return todaysWorkouts.reduce((acc, w) => acc + (w.durationMinutes || 0), 0);
  }, [todaysWorkouts]);

  const goalPercent = Math.min(100, Math.round((todaysActiveCaloriesBurned / dailyTargetActiveKcal) * 100));

  const getCategoryConfig = (cat: WorkoutCategory) => {
    switch (cat) {
      case 'gym':
        return {
          label: 'Strength',
          icon: <Dumbbell className="w-3.5 h-3.5 stroke-[2.25]" />,
          color: '#854D0E',
          bg: '#FEF3C7',
        };
      case 'run':
        return {
          label: 'Run',
          icon: <Flame className="w-3.5 h-3.5 stroke-[2.25]" />,
          color: '#DC2626',
          bg: '#FEE2E2',
        };
      case 'cardio':
        return {
          label: 'Cardio',
          icon: <Zap className="w-3.5 h-3.5 stroke-[2.25]" />,
          color: '#D97706',
          bg: '#FFEDD5',
        };
      case 'walk':
        return {
          label: 'Walk',
          icon: <Footprints className="w-3.5 h-3.5 stroke-[2.25]" />,
          color: '#2D503C',
          bg: '#DDE8DE',
        };
      case 'stretch':
      default:
        return {
          label: 'Mobility',
          icon: <Heart className="w-3.5 h-3.5 stroke-[2.25]" />,
          color: '#7C3AED',
          bg: '#F3E8FF',
        };
    }
  };

  const handleSelectPreset = (preset: WorkoutPreset) => {
    playClickSound();
    setTitle(preset.title);
    setCategory(preset.category);
    setDurationMinutes(preset.durationMinutes);
    setCustomCalories('');
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetTitle.trim()) return;

    playSuccessChime();
    const updated = [
      ...presets,
      {
        id: String(Date.now()),
        title: newPresetTitle.trim(),
        category: newPresetCategory,
        durationMinutes: newPresetDuration,
      },
    ];
    setPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_workout_quick_presets', JSON.stringify(updated));
    }
    setNewPresetTitle('');
    setNewPresetDuration(30);
  };

  const handleDeletePreset = (id: string) => {
    playClickSound();
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kairo_workout_quick_presets', JSON.stringify(updated));
    }
  };

  const handleStepDuration = (delta: number) => {
    playClickSound();
    setDurationMinutes((prev) => Math.max(5, Math.min(240, prev + delta)));
    setCustomCalories('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    playSuccessChime();
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#F59E0B', '#EF4444', '#3D6B52'],
    });

    await onLogWorkout({
      date: selectedDate,
      title: title.trim(),
      category,
      durationMinutes,
      caloriesBurned: effectiveCalories,
    });

    setTitle('');
    setCustomCalories('');
  };

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      
      {/* 1. Activity Summary Hero Card */}
      <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3.5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Activity className="w-4 h-4 text-[#DC2626]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#6B635B] uppercase tracking-wider block font-display leading-none">
                Movement OS
              </span>
              <h2 className="text-sm font-black font-display text-[#24201D] mt-0.5 leading-none">
                Daily Workouts & Burn
              </h2>
            </div>
          </div>

          <span className="text-xs font-black font-mono-num text-[#24201D] px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#24201D]/25 shadow-2xs">
            {goalPercent}% of Goal
          </span>
        </div>

        {/* Progress Bar towards active target */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs font-bold text-[#6B635B]">
            <span>Active Burn vs Daily Target</span>
            <span className="font-mono-num font-black text-[#24201D]">
              {todaysActiveCaloriesBurned} / {dailyTargetActiveKcal} kcal
            </span>
          </div>

          <div className="w-full h-3 bg-[#FAF8F5] border border-[#24201D] rounded-full overflow-hidden p-0.5 shadow-2xs">
            <div
              className="h-full bg-[#DC2626] rounded-full transition-all duration-500"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
              Active Burn
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black font-mono-num text-[#24201D]">
                {todaysActiveCaloriesBurned}
              </span>
              <span className="text-xs font-bold text-[#6B635B]">kcal</span>
            </div>
            <span className="text-[9px] text-[#3D6B52] font-bold block">
              + Added to intake budget
            </span>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
              Active Time
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black font-mono-num text-[#24201D]">
                {totalWorkoutMinutes}
              </span>
              <span className="text-xs font-bold text-[#6B635B]">mins</span>
            </div>
            <span className="text-[9px] text-stone-400 font-bold block">
              {todaysWorkouts.length} logged sessions
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
              Energy Rate
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black font-mono-num text-[#24201D]">
                {totalWorkoutMinutes > 0 ? Math.round((todaysActiveCaloriesBurned / totalWorkoutMinutes) * 60) : 0}
              </span>
              <span className="text-xs font-bold text-[#6B635B]">kcal/hr</span>
            </div>
            <span className="text-[9px] text-stone-400 font-bold block">
              Average metabolic rate
            </span>
          </div>
        </div>
      </div>

      {/* 2. Workout Logger Form */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#FAF8F5] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Plus className="w-3.5 h-3.5 text-[#24201D]" />
            </div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
              Log Workout Session
            </h3>
          </div>
        </div>

        {/* Minimalist Line SVG Category Selector */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs">
          {(['gym', 'run', 'cardio', 'walk', 'stretch'] as const).map((c) => {
            const config = getCategoryConfig(c);
            const isSelected = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  playClickSound();
                  setCategory(c);
                  setCustomCalories('');
                }}
                className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-[#24201D] text-white shadow-2xs'
                    : 'text-[#6B635B] hover:text-[#24201D]'
                }`}
              >
                <div>{config.icon}</div>
                <span className="text-[10px] font-display">{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Workout Presets Bar with Custom Edit */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#6B635B] font-display tracking-wider">
              Quick Workout Presets
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsEditingPresets(!isEditingPresets);
              }}
              className={`p-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                isEditingPresets
                  ? 'bg-[#24201D] text-white border-[#24201D]'
                  : 'bg-[#FAF8F5] text-[#6B635B] border-[#24201D]/20 hover:border-[#24201D]'
              }`}
            >
              <Settings2 className="w-3 h-3 stroke-[2.25]" />
              <span>{isEditingPresets ? 'Done' : 'Edit'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map((p) => (
              <div
                key={p.id}
                className="flex items-center bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D]/25 hover:border-[#24201D] rounded-lg shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#24201D] cursor-pointer flex items-center gap-1"
                >
                  <span>{p.title}</span>
                  <span className="font-mono-num text-[10px] text-[#6B635B]">({p.durationMinutes}m)</span>
                </button>

                {isEditingPresets && (
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p.id)}
                    title="Delete preset"
                    className="pr-1.5 pl-0.5 py-1 text-stone-400 hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Preset Creator Modal/Inline */}
          {isEditingPresets && (
            <form onSubmit={handleAddPreset} className="p-2.5 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl space-y-2 animate-in fade-in duration-100">
              <span className="text-[10px] font-black uppercase text-[#24201D] block font-display">
                Add Custom Workout Template
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text"
                  placeholder="Title (e.g. Leg Day)"
                  value={newPresetTitle}
                  onChange={(e) => setNewPresetTitle(e.target.value)}
                  className="col-span-2 px-2.5 py-1.5 bg-white border border-[#24201D] rounded-lg text-xs font-bold text-[#24201D] focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Minutes"
                  value={newPresetDuration}
                  onChange={(e) => setNewPresetDuration(Number(e.target.value))}
                  className="px-2 py-1.5 bg-white border border-[#24201D] rounded-lg text-xs font-bold text-[#24201D] font-mono-num focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  {(['gym', 'run', 'cardio', 'walk', 'stretch'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewPresetCategory(t)}
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                        newPresetCategory === t
                          ? 'bg-[#24201D] text-white'
                          : 'bg-white text-[#6B635B] border border-[#24201D]/20'
                      }`}
                    >
                      {t.slice(0, 3).toUpperCase()}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!newPresetTitle.trim()}
                  className="px-3 py-1 bg-[#3D6B52] disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer font-display"
                >
                  + Add
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="e.g. Upper Body Push, 5km Morning Run..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
          />

          {/* Duration & Intensity Controls */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Duration Stepper */}
            <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] flex items-center gap-1 font-display">
                <Clock className="w-3 h-3 text-[#3D6B52]" /> Duration
              </label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleStepDuration(-5)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-sm font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  -
                </button>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black font-mono-num text-[#24201D]">
                    {durationMinutes}
                  </span>
                  <span className="text-[10px] font-bold text-[#6B635B]">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStepDuration(5)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-sm font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Intensity Selector */}
            <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
                Intensity Level
              </label>
              <div className="grid grid-cols-3 gap-1 pt-0.5">
                {(['low', 'moderate', 'high'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIntensity(lvl);
                      setCustomCalories('');
                    }}
                    className={`py-1 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                      intensity === lvl
                        ? 'bg-[#24201D] text-white shadow-2xs'
                        : 'bg-white text-[#6B635B] border border-[#24201D]/20 hover:border-[#24201D]'
                    }`}
                  >
                    {lvl.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Duration Jump Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[15, 30, 45, 60, 90].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  playClickSound();
                  setDurationMinutes(m);
                  setCustomCalories('');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono-num border transition-all cursor-pointer ${
                  durationMinutes === m
                    ? 'bg-[#24201D] text-white border-[#24201D] shadow-2xs'
                    : 'bg-[#FAF8F5] text-[#6B635B] border-[#24201D]/20 hover:border-[#24201D]'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>

          {/* Calories Estimation with manual override */}
          <div className="p-3 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                Calculated Burn (MET formula)
              </span>
              <span className="text-[9px] text-stone-400">
                Personalized for {userWeight}kg at {intensity} intensity
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={customCalories !== '' ? customCalories : calculatedKcal}
                onChange={(e) => setCustomCalories(e.target.value)}
                className="w-20 px-2 py-1 bg-white border border-[#24201D] rounded-lg text-sm font-black font-mono-num text-[#24201D] text-right focus:outline-none"
              />
              <span className="text-xs font-bold text-[#6B635B]">kcal</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-3 bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-40 text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all uppercase tracking-wider font-display flex items-center justify-center gap-2"
          >
            <Activity className="w-4 h-4 stroke-[2.5]" />
            <span>Save Workout Session</span>
          </button>
        </form>
      </div>

      {/* 3. Today's Workouts History Log */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#FAF8F5] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Timer className="w-3.5 h-3.5 text-[#24201D]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D] leading-none">
                Workout Activity Log
              </h3>
              <span className="text-[10px] font-bold text-[#6B635B]">
                {todaysWorkouts.length} sessions logged
              </span>
            </div>
          </div>

          <span className="text-xs font-black font-mono-num text-[#DC2626] px-2 py-0.5 bg-[#FAF8F5] border border-[#24201D]/25 rounded-lg shadow-2xs">
            +{todaysActiveCaloriesBurned} kcal
          </span>
        </div>

        {todaysWorkouts.length === 0 ? (
          <div className="p-6 text-center text-xs font-bold text-stone-400 bg-[#FAF8F5] rounded-xl border border-dashed border-[#24201D]/20">
            No workouts logged for this date. Log a session above to boost your daily calorie budget!
          </div>
        ) : (
          <div className="space-y-2">
            {todaysWorkouts.map((w) => {
              const config = getCategoryConfig(w.category);
              return (
                <div
                  key={w.id}
                  className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 hover:border-[#24201D] rounded-xl flex items-center justify-between transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl border border-[#24201D] flex items-center justify-center shadow-2xs"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      {config.icon}
                    </div>

                    <div>
                      <span className="text-xs font-black text-[#24201D] block">
                        {w.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold font-mono-num text-[#6B635B]">
                        <span>{w.durationMinutes} mins</span>
                        <span>•</span>
                        <span className="text-[#DC2626] font-black">+{w.caloriesBurned} kcal</span>
                        <span>•</span>
                        <span className="uppercase text-[9px] font-display">{config.label}</span>
                      </div>
                    </div>
                  </div>

                  {w.id && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onDeleteWorkout(w.id!);
                      }}
                      title="Delete workout"
                      className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-white transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
