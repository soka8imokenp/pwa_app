import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  HeartPulse,
  Trophy,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Flame,
  Scale,
  Dumbbell,
  Droplets,
  Heart,
  Info,
  ChevronRight,
  User,
  Activity,
  Target,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { useTranslation } from '../../i18n/LanguageContext';
import { AVATAR_OPTIONS, getAvatarById } from '../../data/avatars';
import {
  calculateBmi,
  getBmiCategory,
  calculateBmr,
  calculateTdee,
} from '../../lib/healthFormulas';
import type { HealthProfile, ActivityLevel, HealthGoal, Gender } from '../../types/health';

interface HealthOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  profile: HealthProfile;
  onSaveProfile: (updates: Partial<HealthProfile>) => Promise<void>;
  onSaveInitialWeight?: (weight: number, date?: string) => Promise<void>;
  hasExistingWeightLogs?: boolean;
}

const HEIGHT_PRESETS = [160, 165, 170, 175, 180, 185];

export const HealthOnboardingWizard: React.FC<HealthOnboardingWizardProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onSaveInitialWeight,
  hasExistingWeightLogs = false,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states initialized with existing profile values or friendly defaults
  const [gender, setGender] = useState<Gender>(profile.gender || 'male');
  const [age, setAge] = useState<number>(profile.age > 0 ? profile.age : 25);
  const [height, setHeight] = useState<number>(profile.height > 0 ? profile.height : 175);
  const [currentWeight, setCurrentWeight] = useState<number>(profile.currentWeight > 0 ? profile.currentWeight : 70.0);
  const [targetWeight, setTargetWeight] = useState<number>(profile.targetWeight > 0 ? profile.targetWeight : 68.0);
  const [waistCm, setWaistCm] = useState<number>(profile.waistCm && profile.waistCm > 0 ? profile.waistCm : 80);
  const [goal, setGoal] = useState<HealthGoal>(profile.goal || 'lose');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel || 'moderate');
  const [isSaving, setIsSaving] = useState(false);

  // Mascot avatar for commentary
  const avatarId = typeof window !== 'undefined' ? localStorage.getItem('kairo_selected_avatar') || 'bunny-scout' : 'bunny-scout';
  const mascot = getAvatarById(avatarId);

  // Dynamic calculations
  const heightM = Math.max(1, height) / 100;
  const bmi = calculateBmi(currentWeight, height);
  const { label: bmiLabel, color: bmiColor } = getBmiCategory(bmi);
  const idealMin = Number((18.5 * heightM * heightM).toFixed(1));
  const idealMax = Number((24.9 * heightM * heightM).toFixed(1));
  const weightDeltaToTarget = Number((currentWeight - targetWeight).toFixed(1));

  const bmr = calculateBmr(currentWeight, height, age, gender);
  const tdee = calculateTdee(bmr, activityLevel);

  let targetDailyCalories = tdee;
  if (goal === 'lose') {
    targetDailyCalories = Math.max(1200, Math.round(tdee - 400));
  } else if (goal === 'gain') {
    targetDailyCalories = Math.round(tdee + 350);
  }

  const targetWaterMl = Math.round(currentWeight * 35);
  const targetWaterL = (targetWaterMl / 1000).toFixed(1);

  if (!isOpen) return null;

  const handleNext = () => {
    playClickSound();
    if (step === 3) {
      // Transition to final celebration
      playSuccessChime();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#3D6B52', '#E09F3E', '#FBECCF', '#EDE9FE'],
      });
      setStep(4);
    } else {
      setStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleBack = () => {
    playClickSound();
    setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4);
  };

  const handleSkip = () => {
    playClickSound();
    localStorage.setItem('kairo_health_onboarded', 'skipped');
    onClose();
  };

  const handleFinalize = async () => {
    playSuccessChime();
    setIsSaving(true);
    try {
      await onSaveProfile({
        gender,
        age: Number(age),
        height: Number(height),
        currentWeight: Number(currentWeight),
        targetWeight: Number(targetWeight),
        waistCm: Number(waistCm),
        goal,
        activityLevel,
        updatedAt: Date.now(),
      });

      // If user has no existing weight logs, record initial weigh-in
      if (!hasExistingWeightLogs && onSaveInitialWeight) {
        await onSaveInitialWeight(Number(currentWeight));
      }

      localStorage.setItem('kairo_health_onboarded', 'true');
      onClose();
    } catch (err) {
      console.error('Error saving health onboarding:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-[#24201D]/60 backdrop-blur-md animate-in fade-in duration-200 font-body select-none">
      <div className="w-full max-w-md bg-[#FAF8F5] border-[2px] border-[#24201D] rounded-[2.25rem] shadow-[4.5px_4.5px_0px_#24201D] max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Sticky Header Bar */}
        <div className="px-5 py-3.5 bg-white border-b-[2px] border-[#24201D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <HeartPulse className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                {t.modals.profileSetupTitle}
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                {step === 4 ? t.modals.stepFinalTelemetry : `${step} / 3`}
              </p>
            </div>
          </div>

          {step < 4 && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] font-bold text-[#6B635B] hover:text-[#24201D] px-2.5 py-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              {t.modals.skipForNow}
            </button>
          )}
        </div>

        {/* Mascot Speech Bubble & Stepper Bar */}
        {step < 4 && (
          <div className="px-5 pt-3 pb-1 shrink-0 space-y-2.5">
            {/* Step Progress Indicators */}
            <div className="grid grid-cols-3 gap-2">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= 1 ? 'bg-[#3D6B52]' : 'bg-stone-200'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= 2 ? 'bg-[#3D6B52]' : 'bg-stone-200'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= 3 ? 'bg-[#3D6B52]' : 'bg-stone-200'
                }`}
              />
            </div>

            {/* Sumire Mascot Dialogue Strip */}
            <div className="p-2.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl border border-[#24201D] flex items-center justify-center p-1 shadow-2xs shrink-0"
                style={{ backgroundColor: mascot.bg }}
              >
                {mascot.renderSvg('w-full h-full')}
              </div>
              <p className="text-[11px] font-bold text-[#24201D] leading-snug">
                {step === 1 && (
                  <span>
                    {t.modals.mascotStep1}
                  </span>
                )}
                {step === 2 && (
                  <span>
                    {t.modals.mascotStep2}
                  </span>
                )}
                {step === 3 && (
                  <span>
                    {t.modals.mascotStep3}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Scrollable Content Step Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* ========================================================================= */}
          {/* STEP 1: BIOLOGICAL BASICS                                                 */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
              
              {/* Biological Sex */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display px-1">
                  {t.modals.biologicalSex}
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#EAE5DC] border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setGender('male');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      gender === 'male'
                        ? 'bg-[#24201D] text-white shadow-2xs'
                        : 'text-[#6B635B] hover:text-[#24201D]'
                    }`}
                  >
                    <span>{t.modals.maleSex}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setGender('female');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      gender === 'female'
                        ? 'bg-[#24201D] text-white shadow-2xs'
                        : 'text-[#6B635B] hover:text-[#24201D]'
                    }`}
                  >
                    <span>{t.modals.femaleSex}</span>
                  </button>
                </div>
              </div>

              {/* Age & Height Steppers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Age */}
                <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
                    {t.modals.ageLabel}
                  </span>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setAge((prev) => Math.max(14, prev - 1));
                      }}
                      className="w-9 h-9 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-2xl font-black font-mono-num text-[#24201D]">
                      {age}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setAge((prev) => Math.min(100, prev + 1));
                      }}
                      className="w-9 h-9 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Height */}
                <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
                    {t.modals.heightLabel}
                  </span>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setHeight((prev) => Math.max(120, prev - 1));
                      }}
                      className="w-9 h-9 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-2xl font-black font-mono-num text-[#24201D]">
                      {height}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setHeight((prev) => Math.min(230, prev + 1));
                      }}
                      className="w-9 h-9 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Height Presets Strip */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#6B635B] block px-1">
                  {t.modals.quickHeightPresets}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {HEIGHT_PRESETS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setHeight(h);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono-num font-bold border transition-all cursor-pointer ${
                        height === h
                          ? 'bg-[#3D6B52] text-white border-[#24201D] shadow-2xs'
                          : 'bg-white hover:bg-stone-100 border-[#24201D]/20 text-[#24201D]'
                      }`}
                    >
                      {h} cm
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: BODY MASS & GOALS                                                 */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
              
              {/* Current Weight Stepper */}
              <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
                    {t.modals.currentBodyMass}
                  </span>
                  <span
                    className="text-[10px] font-black font-mono-num px-2 py-0.5 rounded-full border border-[#24201D]/30"
                    style={{ backgroundColor: `${bmiColor}20`, color: bmiColor }}
                  >
                    BMI {bmi} · {bmiLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setCurrentWeight((prev) => Math.max(35, Number((prev - 1.0).toFixed(1))));
                      }}
                      className="px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-[#24201D] border border-stone-300 cursor-pointer"
                    >
                      -1kg
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setCurrentWeight((prev) => Math.max(35, Number((prev - 0.2).toFixed(1))));
                      }}
                      className="w-9 h-9 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                    >
                      -
                    </button>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-mono-num text-[#24201D]">
                      {currentWeight}
                    </span>
                    <span className="text-xs font-bold text-[#6B635B]">kg</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setCurrentWeight((prev) => Math.min(220, Number((prev + 0.2).toFixed(1))));
                      }}
                      className="w-9 h-9 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setCurrentWeight((prev) => Math.min(220, Number((prev + 1.0).toFixed(1))));
                      }}
                      className="px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-[#24201D] border border-stone-300 cursor-pointer"
                    >
                      +1kg
                    </button>
                  </div>
                </div>
              </div>

              {/* Target Goal Weight */}
              <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-[#3D6B52]" /> {t.modals.targetGoalWeight}
                  </span>
                  <span className="text-[10px] font-bold text-[#6B635B]">
                    {weightDeltaToTarget > 0
                      ? `${weightDeltaToTarget} ${t.modals.kgToLose}`
                      : weightDeltaToTarget < 0
                      ? `${Math.abs(weightDeltaToTarget)} ${t.modals.kgToGain}`
                      : t.modals.targetReached}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setTargetWeight((prev) => Math.max(35, Number((prev - 0.5).toFixed(1))));
                    }}
                    className="w-9 h-9 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                  >
                    -
                  </button>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black font-mono-num text-[#24201D]">
                      {targetWeight}
                    </span>
                    <span className="text-xs font-bold text-[#6B635B]">kg</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setTargetWeight((prev) => Math.min(220, Number((prev + 0.5).toFixed(1))));
                    }}
                    className="w-9 h-9 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* WHO Healthy Range Card */}
              <div className="p-3 bg-[#FAF8F5] border-[1.5px] border-[#24201D]/20 rounded-2xl flex items-center justify-between shadow-2xs">
                <span className="text-[10px] font-bold text-[#6B635B] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#3D6B52]" />
                  <span>{t.modals.whoHealthyRange} ({height} sm):</span>
                </span>
                <span className="text-xs font-black font-mono-num text-[#24201D]">
                  {idealMin} – {idealMax} kg
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: LIFESTYLE & GOALS                                                 */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-150">
              
              {/* Primary Goal Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display px-1">
                  {t.modals.primaryFitnessAmbition}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setGoal('lose');
                    }}
                    className={`p-2.5 rounded-2xl border-[1.75px] flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                      goal === 'lose'
                        ? 'bg-[#FBECCF] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                        : 'bg-white border-stone-200 hover:border-[#24201D] opacity-75 hover:opacity-100 shadow-2xs'
                    }`}
                  >
                    <Flame className="w-4 h-4 text-[#854D0E] fill-[#E09F3E]" />
                    <span className="text-xs font-black text-[#24201D]">{t.modals.fatLoss}</span>
                    <span className="text-[9px] text-[#854D0E] font-medium">-400 kcal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setGoal('maintain');
                    }}
                    className={`p-2.5 rounded-2xl border-[1.75px] flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                      goal === 'maintain'
                        ? 'bg-[#DDE8DE] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                        : 'bg-white border-stone-200 hover:border-[#24201D] opacity-75 hover:opacity-100 shadow-2xs'
                    }`}
                  >
                    <Scale className="w-4 h-4 text-[#2D503C]" />
                    <span className="text-xs font-black text-[#24201D]">{t.modals.maintain}</span>
                    <span className="text-[9px] text-[#2D503C] font-medium">{t.modals.equilibrium}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setGoal('gain');
                    }}
                    className={`p-2.5 rounded-2xl border-[1.75px] flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                      goal === 'gain'
                        ? 'bg-[#EDE9FE] border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                        : 'bg-white border-stone-200 hover:border-[#24201D] opacity-75 hover:opacity-100 shadow-2xs'
                    }`}
                  >
                    <Dumbbell className="w-4 h-4 text-[#6B21A8]" />
                    <span className="text-xs font-black text-[#24201D]">{t.modals.muscleGain}</span>
                    <span className="text-[9px] text-[#6B21A8] font-medium">+350 kcal</span>
                  </button>
                </div>
              </div>

              {/* Activity Level Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display px-1">
                  {t.modals.dailyActivityRhythm}
                </label>
                <div className="space-y-1.5">
                  {(
                    [
                      { id: 'sedentary', label: t.modals.activitySedentary },
                      { id: 'light', label: t.modals.activityLight },
                      { id: 'moderate', label: t.modals.activityModerate },
                      { id: 'very_active', label: t.modals.activityVeryActive },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setActivityLevel(item.id);
                      }}
                      className={`w-full p-2.5 rounded-2xl border-[1.75px] flex items-center justify-between text-left transition-all cursor-pointer ${
                        activityLevel === item.id
                          ? 'bg-white border-[#24201D] shadow-[2px_2px_0px_#24201D]'
                          : 'bg-[#FAF8F5] border-stone-200 hover:border-[#24201D]/40 shadow-2xs'
                      }`}
                    >
                      <div>
                        <h5 className="text-xs font-black text-[#24201D]">{item.label}</h5>
                      </div>
                      {activityLevel === item.id && (
                        <div className="w-5 h-5 rounded-full bg-[#3D6B52] text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Targets Preview Strip */}
              <div className="p-3 bg-[#DDE8DE] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#2D503C] flex items-center gap-1 font-display">
                  <Zap className="w-3 h-3 text-[#2D503C]" />
                  <span>{t.modals.computedDailyBaseline}</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-[#24201D]">
                  <div className="p-2 rounded-xl bg-white border border-[#24201D]/20">
                    <span className="text-[10px] text-[#6B635B] block">{t.healthIntake.target}</span>
                    <span className="text-sm font-black font-mono-num text-[#2D503C]">
                      {targetDailyCalories} kcal
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#24201D]/20">
                    <span className="text-[10px] text-[#6B635B] block">{t.healthIntake.waterTarget}</span>
                    <span className="text-sm font-black font-mono-num text-[#2A495E]">
                      {targetWaterL} L / day
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: CELEBRATION / SUMMARY SCREEN                                      */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-4 text-center py-2 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-[#FBECCF] border-[2px] border-[#24201D] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#24201D]">
                <Trophy className="w-8 h-8 text-[#854D0E] stroke-[2.25]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black font-display uppercase tracking-wide text-[#24201D]">
                  {t.modals.calibrationComplete}
                </h3>
                <p className="text-xs font-bold text-[#6B635B] max-w-xs mx-auto">
                  {t.modals.calibrationCompleteDesc}
                </p>
              </div>

              {/* Summary Metrics Matrix */}
              <div className="grid grid-cols-2 gap-2.5 text-left pt-1">
                <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-[#6B635B]">{t.modals.startingMass}</span>
                  <div className="text-base font-black font-mono-num text-[#24201D]">
                    {currentWeight} kg
                  </div>
                  <span className="text-[10px] font-bold text-[#3D6B52]">BMI {bmi}</span>
                </div>

                <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-[#6B635B]">{t.modals.targetMass}</span>
                  <div className="text-base font-black font-mono-num text-[#24201D]">
                    {targetWeight} kg
                  </div>
                  <span className="text-[10px] font-bold text-[#854D0E]">
                    {weightDeltaToTarget > 0 ? `-${weightDeltaToTarget} kg` : `+${Math.abs(weightDeltaToTarget)} kg`}
                  </span>
                </div>

                <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-[#6B635B]">{t.modals.dailyCaloriePlan}</span>
                  <div className="text-base font-black font-mono-num text-[#24201D]">
                    {targetDailyCalories} kcal
                  </div>
                  <span className="text-[10px] font-bold text-[#6B635B]">TDEE ~{tdee}</span>
                </div>

                <div className="p-3 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-0.5">
                  <span className="text-[9px] font-black uppercase text-[#6B635B]">{t.modals.dailyHydration}</span>
                  <div className="text-base font-black font-mono-num text-[#24201D]">
                    {targetWaterL} L
                  </div>
                  <span className="text-[10px] font-bold text-[#4338CA]">{targetWaterMl} ml</span>
                </div>
              </div>

              {/* Ready Button */}
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isSaving}
                className="w-full py-3.5 px-4 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[2px] border-[#24201D] rounded-2xl text-xs font-black shadow-[3px_3px_0px_#24201D] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 transition-all uppercase tracking-wider font-display mt-2"
              >
                <span>{isSaving ? t.modals.calibrating : t.modals.enterHealthDashboard}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons (Steps 1 to 3) */}
        {step < 4 && (
          <div className="p-4 bg-white border-t-[2px] border-[#24201D] flex items-center justify-between gap-3 shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="py-2.5 px-4 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border-[1.5px] border-[#24201D] text-xs font-black text-[#24201D] flex items-center gap-1.5 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer font-display uppercase tracking-wider"
              >
                <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t.common.back}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="py-2.5 px-5 rounded-xl bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.5px] border-[#24201D] text-xs font-black flex items-center gap-1.5 shadow-2xs active:translate-y-0.5 transition-all cursor-pointer font-display uppercase tracking-wider"
            >
              <span>{step === 3 ? t.modals.finalizeCalibration : t.common.next}</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
export default HealthOnboardingWizard;
