import React, { useState } from 'react';
import { X, User, Target, Activity, Info, Check } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import type { HealthProfile, ActivityLevel, HealthGoal, Gender } from '../../types/health';

interface HealthProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: HealthProfile;
  onSaveProfile: (updates: Partial<HealthProfile>) => Promise<void>;
}

export const HealthProfileModal: React.FC<HealthProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
}) => {
  const [age, setAge] = useState<number>(profile.age || 25);
  const [gender, setGender] = useState<Gender>(profile.gender || 'male');
  const [height, setHeight] = useState<number>(profile.height || 175);
  const [targetWeight, setTargetWeight] = useState<number>(profile.targetWeight || 70);
  const [waistCm, setWaistCm] = useState<number>(profile.waistCm || 82);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel || 'moderate');
  const [goal, setGoal] = useState<HealthGoal>(profile.goal || 'lose');

  if (!isOpen) return null;

  const heightM = Math.max(1, height) / 100;
  const idealMin = Number((18.5 * heightM * heightM).toFixed(1));
  const idealMax = Number((24.9 * heightM * heightM).toFixed(1));
  const weightDeltaToTarget = Number(((profile.currentWeight || 70) - targetWeight).toFixed(1));

  const handleStepAge = (delta: number) => {
    playClickSound();
    setAge((prev) => Math.max(14, Math.min(100, prev + delta)));
  };

  const handleStepHeight = (delta: number) => {
    playClickSound();
    setHeight((prev) => Math.max(120, Math.min(230, prev + delta)));
  };

  const handleStepWaist = (delta: number) => {
    playClickSound();
    setWaistCm((prev) => Math.max(45, Math.min(180, prev + delta)));
  };

  const handleStepTargetWeight = (delta: number) => {
    playClickSound();
    setTargetWeight((prev) => Math.max(35, Math.min(220, Number((prev + delta).toFixed(1)))));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playSuccessChime();
    await onSaveProfile({
      age: Number(age),
      gender,
      height: Number(height),
      targetWeight: Number(targetWeight),
      waistCm: Number(waistCm),
      activityLevel,
      goal,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#24201D]/55 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-sm bg-white border-[2px] border-[#24201D] rounded-3xl shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FBECCF] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <User className="w-4 h-4 text-[#854D0E]" />
            </div>
            <div>
              <h2 className="text-sm font-black font-display uppercase tracking-wider text-[#24201D]">
                Health Profile Setup
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-7 h-7 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-[#24201D] shadow-2xs cursor-pointer active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Biological Sex */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block mb-1 font-display">
              Biological Sex
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setGender(g);
                  }}
                  className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    gender === g
                      ? 'bg-[#24201D] text-white shadow-2xs'
                      : 'text-[#6B635B] hover:text-[#24201D]'
                  }`}
                >
                  <span>{g === 'male' ? '♂ Male' : '♀ Female'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Age & Height Steppers */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Age */}
            <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
                Age (years)
              </label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleStepAge(-1)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-sm font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  -
                </button>
                <span className="text-base font-black font-mono-num text-[#24201D]">{age}</span>
                <button
                  type="button"
                  onClick={() => handleStepAge(1)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-sm font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Height */}
            <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
                Height (cm)
              </label>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleStepHeight(-1)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-sm font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  -
                </button>
                <span className="text-base font-black font-mono-num text-[#24201D]">{height}</span>
                <button
                  type="button"
                  onClick={() => handleStepHeight(1)}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-sm font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Waist */}
            <div className="p-2.5 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1 col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
                  Waist Circumference (cm)
                </label>
                <span className="text-[9px] font-bold text-stone-400">At navel level</span>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleStepWaist(-1)}
                  className="w-8 h-8 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-sm font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  -
                </button>
                <div className="text-center">
                  <span className="text-base font-black font-mono-num text-[#24201D]">{waistCm} cm</span>
                  <span className="text-[9px] text-[#3D6B52] font-bold block">
                    WHtR: {(waistCm / height).toFixed(2)} {waistCm / height < 0.5 ? '(Healthy)' : '(Elevated)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStepWaist(1)}
                  className="w-8 h-8 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-sm font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Healthy WHO Range Card */}
          <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center justify-between shadow-2xs">
            <span className="text-[10px] font-bold text-[#6B635B] flex items-center gap-1">
              <Info className="w-3 h-3 text-[#3D6B52]" /> Healthy WHO range:
            </span>
            <span className="text-xs font-black font-mono-num text-[#24201D]">
              {idealMin} – {idealMax} kg
            </span>
          </div>

          {/* Target Weight with Steppers */}
          <div className="p-3 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] flex items-center gap-1 font-display">
                <Target className="w-3 h-3 text-[#3D6B52]" /> Target Goal Weight
              </label>
              <span className="text-xs font-bold text-[#6B635B]">
                {weightDeltaToTarget > 0 ? `${weightDeltaToTarget} kg to lose` : `${Math.abs(weightDeltaToTarget)} kg to gain`}
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 py-1">
              <button
                type="button"
                onClick={() => handleStepTargetWeight(-0.5)}
                className="w-9 h-9 rounded-xl bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
              >
                -
              </button>

              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono-num text-[#24201D]">{targetWeight}</span>
                <span className="text-xs font-bold text-[#6B635B]">kg</span>
              </div>

              <button
                type="button"
                onClick={() => handleStepTargetWeight(0.5)}
                className="w-9 h-9 rounded-xl bg-white hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
              >
                +
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 pt-0.5">
              {[-1.0, -0.5, 0.5, 1.0].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleStepTargetWeight(step)}
                  className="py-1 rounded-md bg-white hover:bg-stone-100 border border-[#24201D] text-[10px] font-black font-mono-num text-[#24201D] shadow-2xs cursor-pointer active:scale-95"
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Goal Selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block mb-1 font-display">
              Primary Metabolic Goal
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl shadow-2xs">
              {(
                [
                  { id: 'lose', label: 'Fat Loss', sub: '-400 kcal' },
                  { id: 'maintain', label: 'Maintain', sub: 'TDEE' },
                  { id: 'gain', label: 'Muscle', sub: '+350 kcal' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setGoal(item.id);
                  }}
                  className={`py-2 px-1 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                    goal === item.id
                      ? 'bg-[#24201D] text-white shadow-2xs'
                      : 'text-[#6B635B] hover:text-[#24201D]'
                  }`}
                >
                  <span className="text-[11px] font-black leading-tight">{item.label}</span>
                  <span className="text-[9px] opacity-70 font-mono-num">{item.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Level Selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block mb-1 flex items-center gap-1 font-display">
              <Activity className="w-3 h-3 text-[#3D6B52]" /> Daily Activity Level
            </label>
            <div className="space-y-1.5">
              {(
                [
                  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, light walking (x1.20)' },
                  { id: 'light', label: 'Light Active', desc: '1–3 light workouts / week (x1.375)' },
                  { id: 'moderate', label: 'Moderately Active', desc: '3–5 workouts / week (x1.55)' },
                  { id: 'very_active', label: 'Very Active', desc: '6–7 hard workouts / week (x1.725)' },
                ] as const
              ).map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setActivityLevel(act.id);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left border-[1.5px] transition-all cursor-pointer flex items-center justify-between ${
                    activityLevel === act.id
                      ? 'bg-[#FBECCF] border-[#24201D] text-[#24201D] shadow-2xs font-black'
                      : 'bg-white border-[#24201D]/20 text-[#6B635B] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div>
                    <span className="text-xs block font-bold text-[#24201D]">{act.label}</span>
                    <span className="text-[10px] text-[#6B635B]">{act.desc}</span>
                  </div>
                  {activityLevel === act.id && (
                    <div className="w-4 h-4 rounded-full bg-[#24201D] flex items-center justify-center text-white">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all font-display uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Save Health Profile</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
