import React, { useState } from 'react';
import { X, User, Target, Activity } from 'lucide-react';
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
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel || 'moderate');
  const [goal, setGoal] = useState<HealthGoal>(profile.goal || 'lose');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playSuccessChime();
    await onSaveProfile({
      age: Number(age),
      gender,
      height: Number(height),
      targetWeight: Number(targetWeight),
      activityLevel,
      goal,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-sm bg-white border-[2px] border-[#24201D] rounded-3xl shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
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
              <p className="text-[10px] font-bold text-[#6B635B]">
                Personalize BMI & calorie targets
              </p>
            </div>
          </div>

          <button
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
          
          {/* Gender Tabs */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block mb-1">
              Gender
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF8F5] border border-[#24201D] rounded-xl shadow-2xs">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setGender(g);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-black capitalize transition-all cursor-pointer ${
                    gender === g
                      ? 'bg-[#24201D] text-white shadow-2xs'
                      : 'text-[#6B635B] hover:text-[#24201D]'
                  }`}
                >
                  {g === 'male' ? 'Male / Мужской' : 'Female / Женский'}
                </button>
              ))}
            </div>
          </div>

          {/* Age & Height */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block mb-1">
                Age (years)
              </label>
              <input
                type="number"
                min="14"
                max="100"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#24201D] rounded-xl text-sm font-bold font-mono-num text-[#24201D] shadow-2xs focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                min="120"
                max="230"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#24201D] rounded-xl text-sm font-bold font-mono-num text-[#24201D] shadow-2xs focus:outline-none"
              />
            </div>
          </div>

          {/* Target Weight */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block mb-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-[#3D6B52]" /> Target Weight (kg)
            </label>
            <input
              type="number"
              step="0.5"
              min="35"
              max="200"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#24201D] rounded-xl text-base font-black font-mono-num text-[#24201D] shadow-2xs focus:outline-none"
            />
          </div>

          {/* Goal Selector */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block mb-1">
              Primary Goal
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#FAF8F5] border border-[#24201D] rounded-xl shadow-2xs">
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

          {/* Activity Level */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Activity Level
            </label>
            <div className="space-y-1">
              {(
                [
                  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise (x1.2)' },
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
                  className={`w-full p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
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
                    <div className="w-2 h-2 rounded-full bg-[#24201D]" />
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
