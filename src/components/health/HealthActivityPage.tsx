import React, { useState } from 'react';
import {
  Activity,
  Dumbbell,
  Footprints,
  Flame,
  Plus,
  Trash2,
  Clock,
  Heart,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import type { WorkoutLog } from '../../types/health';

interface HealthActivityPageProps {
  todaysWorkouts: WorkoutLog[];
  todaysActiveCaloriesBurned: number;
  selectedDate: string;
  onLogWorkout: (workout: Omit<WorkoutLog, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteWorkout: (id: number) => Promise<void>;
}

export const HealthActivityPage: React.FC<HealthActivityPageProps> = ({
  todaysWorkouts,
  todaysActiveCaloriesBurned,
  selectedDate,
  onLogWorkout,
  onDeleteWorkout,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WorkoutLog['category']>('gym');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [caloriesBurned, setCaloriesBurned] = useState<string>('300');

  const totalWorkoutMinutes = todaysWorkouts.reduce((acc, w) => acc + (w.durationMinutes || 0), 0);

  const getCategoryIcon = (cat: WorkoutLog['category']) => {
    switch (cat) {
      case 'gym':
        return <Dumbbell className="w-3.5 h-3.5 text-[#854D0E]" />;
      case 'cardio':
      case 'run':
        return <Activity className="w-3.5 h-3.5 text-[#DC2626]" />;
      case 'walk':
        return <Footprints className="w-3.5 h-3.5 text-[#2D503C]" />;
      default:
        return <Heart className="w-3.5 h-3.5 text-[#9333EA]" />;
    }
  };

  const handleQuickDuration = (mins: number) => {
    playClickSound();
    setDurationMinutes(mins);
    // Rough estimate ~ 7 kcal per minute for moderate workout
    setCaloriesBurned(String(mins * 7));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    playSuccessChime();
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#F59E0B', '#EF4444', '#3D6B52'],
    });

    await onLogWorkout({
      date: selectedDate,
      title: title.trim(),
      category,
      durationMinutes,
      caloriesBurned: Number(caloriesBurned) || durationMinutes * 7,
    });

    setTitle('');
  };

  return (
    <div className="w-full space-y-3.5 pb-3 font-body select-none">
      
      {/* 1. Activity Summary Hero Card */}
      <div className="p-4 sm:p-5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#FEE2E2] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Activity className="w-3.5 h-3.5 text-[#DC2626]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#6B635B] uppercase tracking-wider block font-display leading-none">
                Daily Movement
              </span>
              <h2 className="text-sm font-bold font-display text-[#24201D] mt-0.5 leading-none">
                Activity & Workouts
              </h2>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#24201D]/30 text-[#6B635B]">
            {todaysWorkouts.length} sessions today
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block">
              Active Burn
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono-num text-[#24201D]">
                {todaysActiveCaloriesBurned}
              </span>
              <span className="text-xs font-bold text-[#6B635B]">kcal</span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              Added to daily energy limit
            </span>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block">
              Active Duration
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono-num text-[#24201D]">
                {totalWorkoutMinutes}
              </span>
              <span className="text-xs font-bold text-[#6B635B]">mins</span>
            </div>
            <span className="text-[10px] text-stone-400 mt-0.5 block">
              Total workout time
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quick Log Workout Form */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-3">
        <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
          Log a Workout Session
        </h3>

        {/* Categories */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-[#FAF8F5] border border-[#24201D] rounded-xl shadow-2xs">
          {(
            [
              { id: 'gym', label: 'Gym' },
              { id: 'cardio', label: 'Cardio' },
              { id: 'run', label: 'Run' },
              { id: 'walk', label: 'Walk' },
              { id: 'stretch', label: 'Stretch' },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                playClickSound();
                setCategory(c.id);
              }}
              className={`py-1 rounded-lg text-[10px] font-black capitalize transition-all cursor-pointer ${
                category === c.id ? 'bg-[#24201D] text-white shadow-2xs' : 'text-[#6B635B] hover:text-[#24201D]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="e.g. Upper Body Strength, 5km Morning Run..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
          />

          {/* Quick Duration Chips */}
          <div>
            <span className="text-[10px] font-bold text-[#6B635B] uppercase block mb-1">
              Duration
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[15, 30, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleQuickDuration(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-black font-mono-num border transition-all cursor-pointer ${
                    durationMinutes === m
                      ? 'bg-[#24201D] text-white border-[#24201D] shadow-2xs'
                      : 'bg-white text-[#6B635B] border-[#24201D]/25 hover:border-[#24201D]'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Calories input */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="text-[10px] font-bold text-[#6B635B] uppercase block mb-1">
                Est. Calories Burned
              </span>
              <div className="relative">
                <input
                  type="number"
                  value={caloriesBurned}
                  onChange={(e) => setCaloriesBurned(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#24201D] rounded-xl text-xs font-bold font-mono-num text-[#24201D]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6B635B]">
                  kcal
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!title.trim()}
              className="mt-5 px-5 py-2.5 bg-[#3D6B52] hover:bg-[#345B45] disabled:opacity-40 text-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-black shadow-2xs cursor-pointer active:translate-y-0.5 transition-all uppercase tracking-wider font-display flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Log</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Today's Workouts List */}
      <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2.5">
        <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#6B635B]">
          Today's Workout Sessions ({todaysWorkouts.length})
        </h3>

        {todaysWorkouts.length === 0 ? (
          <p className="text-xs text-stone-400 italic">No workouts logged for today.</p>
        ) : (
          <div className="space-y-2">
            {todaysWorkouts.map((w) => (
              <div
                key={w.id}
                className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#24201D]/30 flex items-center justify-center shadow-2xs">
                    {getCategoryIcon(w.category)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#24201D] block">
                      {w.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-bold font-mono-num text-[#6B635B]">
                      <span>{w.durationMinutes} mins</span>
                      <span>•</span>
                      <span className="text-[#DC2626]">{w.caloriesBurned} kcal burned</span>
                      <span>•</span>
                      <span className="capitalize">{w.category}</span>
                    </div>
                  </div>
                </div>

                {w.id && (
                  <button
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
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
