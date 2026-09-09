import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  Check,
  Flame,
  Clock,
  Target,
  Trophy,
  Zap,
  Scale,
  Utensils,
  Droplets,
  Dumbbell,
  Heart,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import type { Task, HabitLog, FocusSession } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import confetti from 'canvas-confetti';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useTranslation } from '../../i18n/LanguageContext';
import { DEFAULT_HEALTH_PROFILE, calculateComprehensiveMetrics } from '../../lib/healthFormulas';

interface WeeklyInfographicModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  habitLogs: HabitLog[];
  focusSessions: FocusSession[];
  userName?: string;
}

export const WeeklyInfographicModal: React.FC<WeeklyInfographicModalProps> = ({
  isOpen,
  onClose,
  tasks,
  habitLogs,
  focusSessions,
  userName = 'Sam Smith',
}) => {
  const { t, language } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Live Query Health Data from Dexie
  const profileList = useLiveQuery(() => db.healthProfile.toArray(), []) || [];
  const healthProfile = profileList[0] || DEFAULT_HEALTH_PROFILE;
  const allWeightLogs = useLiveQuery(() => db.weightLogs.orderBy('date').toArray(), []) || [];
  const allMealLogs = useLiveQuery(() => db.mealLogs.toArray(), []) || [];
  const allWaterLogs = useLiveQuery(() => db.waterLogs.toArray(), []) || [];
  const allWorkoutLogs = useLiveQuery(() => db.workoutLogs.toArray(), []) || [];

  if (!isOpen) return null;

  // Calculate Last 7 Days Metrics
  const today = new Date();
  const weekStart = startOfDay(subDays(today, 6));
  const weekRangeLabel = `${format(weekStart, 'MMM d')} – ${format(today, 'MMM d, yyyy')}`;

  const past7DaysTasks = tasks.filter((t) => parseISO(t.date) >= weekStart);
  const past7DaysFocus = focusSessions.filter((s) => parseISO(s.date) >= weekStart);
  const past7DaysHabits = habitLogs.filter((l) => parseISO(l.date) >= weekStart);

  const completedTasks = past7DaysTasks.filter((t) => t.isCompleted).length;
  const totalTasks = past7DaysTasks.length;
  const totalFocusMins = past7DaysFocus.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalFocusHours = (totalFocusMins / 60).toFixed(1);
  const totalHabitChecks = past7DaysHabits.filter((l) => l.completed).length;

  const totalXP = (completedTasks * 50) + (totalHabitChecks * 20) + (totalFocusMins * 2);
  const level = Math.floor(totalXP / 500) + 1;

  // Health Metrics (Past 7 Days)
  const past7DaysWeights = allWeightLogs.filter((w) => parseISO(w.date) >= weekStart);
  const past7DaysMeals = allMealLogs.filter((m) => parseISO(m.date) >= weekStart);
  const past7DaysWater = allWaterLogs.filter((w) => parseISO(w.date) >= weekStart);
  const past7DaysWorkouts = allWorkoutLogs.filter((w) => parseISO(w.date) >= weekStart);

  // Weight Calculation & Trend
  const latestWeightLog = allWeightLogs.length > 0 ? allWeightLogs[allWeightLogs.length - 1] : null;
  const currentWeightVal = latestWeightLog ? latestWeightLog.weight : healthProfile.currentWeight;
  const weekStartWeight = past7DaysWeights.length > 0 ? past7DaysWeights[0].weight : currentWeightVal;
  const weightChangeDiff = Number((currentWeightVal - weekStartWeight).toFixed(1));

  // Calories: daily average over 7 days
  const totalWeeklyKcal = past7DaysMeals.reduce((acc, m) => acc + (m.kcal || 0), 0);
  const uniqueMealDays = new Set(past7DaysMeals.map((m) => m.date)).size;
  const avgDailyKcal = uniqueMealDays > 0 ? Math.round(totalWeeklyKcal / uniqueMealDays) : 0;

  // Water: daily average in Liters
  const totalWeeklyWaterMl = past7DaysWater.reduce((acc, w) => acc + (w.amountMl || 0), 0);
  const uniqueWaterDays = new Set(past7DaysWater.map((w) => w.date)).size;
  const avgDailyWaterL = uniqueWaterDays > 0 ? (totalWeeklyWaterMl / uniqueWaterDays / 1000).toFixed(1) : '0.0';

  // Workouts: sessions and total minutes
  const totalWorkoutCount = past7DaysWorkouts.length;
  const totalWorkoutMins = past7DaysWorkouts.reduce((acc, w) => acc + (w.durationMinutes || 0), 0);
  const totalWorkoutBurned = past7DaysWorkouts.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);

  // Calculated biometrics
  const healthMetrics = calculateComprehensiveMetrics(healthProfile);

  // 7-day Breakdown
  const daysArray = Array.from({ length: 7 }).map((_, idx) => {
    const d = subDays(today, 6 - idx);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayTasks = tasks.filter((t) => t.date === dateStr);
    const dayFocus = focusSessions.filter((s) => s.date === dateStr);
    const dayHabits = habitLogs.filter((l) => l.date === dateStr && l.completed);

    const doneCount = dayTasks.filter((t) => t.isCompleted).length;
    const focusMinutes = dayFocus.reduce((acc, s) => acc + s.durationMinutes, 0);

    const hasMeals = allMealLogs.some((m) => m.date === dateStr);
    const hasWater = allWaterLogs.some((w) => w.date === dateStr);
    const hasWorkout = allWorkoutLogs.some((w) => w.date === dateStr);
    const hasWeight = allWeightLogs.some((w) => w.date === dateStr);
    const hasHealthActivity = hasMeals || hasWater || hasWorkout || hasWeight;

    const taskScore = dayTasks.length > 0 ? (doneCount / dayTasks.length) * 40 : 25;
    const habitScore = Math.min(dayHabits.length * 10, 25);
    const focusScore = Math.min(focusMinutes / 3, 20);
    const healthScore = hasHealthActivity ? 15 : 0;

    const score = Math.min(100, Math.round(taskScore + habitScore + focusScore + healthScore));

    return {
      dayShort: format(d, 'EEE'),
      dayNum: format(d, 'd'),
      dateStr,
      score,
      focusCompleted: doneCount > 0 || dayHabits.length > 0 || focusMinutes > 0,
      healthCompleted: hasHealthActivity,
    };
  });

  const averageScore = Math.round(
    daysArray.reduce((acc, d) => acc + d.score, 0) / daysArray.length
  );

  const handleDownload = async () => {
    if (!cardRef.current || isExporting) return;
    playClickSound();
    setIsExporting(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#FAF8F5',
      });

      const link = document.createElement('a');
      link.download = `Daily-Sumire-Week-${format(today, 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();

      playSuccessChime();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#F0BB58', '#3D6B52', '#C25E40'],
      });
    } catch (err) {
      console.error('Failed to export image', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativeShare = async () => {
    if (!cardRef.current || isExporting) return;
    playClickSound();
    setIsExporting(true);

    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#FAF8F5',
      });

      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], `Daily-Sumire-Week-${format(today, 'yyyy-MM-dd')}.png`, {
          type: 'image/png',
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'My Weekly Productivity & Health • Daily Sumire',
            text: `This week with Daily Sumire: ${completedTasks} tasks, ${totalFocusHours}h deep focus, ${currentWeightVal}kg, and ${totalWorkoutCount} workout sessions!`,
            files: [file],
          });
          playSuccessChime();
          return;
        }
      }

      // Fallback to clipboard if native share not supported
      if (blob && navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setIsCopied(true);
        playSuccessChime();
        setTimeout(() => setIsCopied(false), 2500);
      } else {
        handleDownload();
      }
    } catch (err) {
      console.warn('Share error fallback to download', err);
      handleDownload();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[95vh] overflow-y-auto">
        
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between pb-1 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Trophy className="w-4 h-4 text-[#2D503C] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                {t.modals.weeklyCardTitle}
              </h3>
              <p className="text-[10px] text-[#6B635B] font-bold">
                {language === 'uz' ? 'Aql, tana va unumdorlik dayjesti' : language === 'ru' ? 'Дайджест разума, тела и продуктивности' : 'Mind, Body & Productivity Digest'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#FAF8F5] hover:bg-stone-100 border border-[#24201D] flex items-center justify-center text-stone-700 hover:text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* The Visual Infographic Card to Rasterize */}
        <div
          ref={cardRef}
          className="p-5 bg-[#FAF8F5] border-[2px] border-[#24201D] rounded-[2rem] shadow-[3px_3px_0px_#24201D] space-y-3.5 text-center relative overflow-hidden"
        >
          {/* Subtle Japanese Paper Dots Accent Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#24201D 1.2px, transparent 1.2px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Header Brand Badge */}
          <div className="relative z-10 flex items-center justify-between pb-2 border-b border-[#24201D]/20">
            <div className="flex items-center gap-2.5 text-left">
              <img
                src="/icon-192x192.png"
                alt="Daily Sumire"
                className="w-9 h-9 rounded-xl border-[1.5px] border-[#24201D] shadow-2xs object-cover shrink-0"
              />
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                  Daily Sumire
                </h4>
                <p className="text-[9px] font-bold text-[#6B635B] font-mono-num">
                  {weekRangeLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 bg-[#DDE8DE] border border-[#24201D] rounded-full text-[9px] font-black text-[#2D503C] shadow-2xs uppercase">
                {language === 'uz' ? `${level}-daraja` : language === 'ru' ? `Уровень ${level}` : `Level ${level}`}
              </span>
            </div>
          </div>

          {/* Title & User Hero */}
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FBECCF] border border-[#24201D] text-[10px] font-black uppercase tracking-wider text-[#854D0E]">
              {language === 'uz' ? 'Haftalik dayjest' : language === 'ru' ? 'Недельный дайджест' : 'Weekly Digest'}
            </div>
            <h2 className="text-lg font-black font-display uppercase tracking-tight text-[#24201D]">
              {userName}
            </h2>
            <p className="text-[11px] font-bold text-[#6B635B]">
              {language === 'uz' ? 'Barqarorlik koʻrsatkichi:' : language === 'ru' ? 'Индекс регулярности:' : 'Consistency Score:'} <span className="font-mono-num text-[#24201D] font-black">{averageScore}%</span> {language === 'uz' ? 'oʻrtacha' : language === 'ru' ? 'в среднем' : 'average'}
            </p>
          </div>

          {/* SECTION 1: EXECUTION & FOCUS */}
          <div className="relative z-10 space-y-1.5 text-left">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black font-display uppercase tracking-wider text-[#24201D] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#3D6B52] stroke-[2.25]" />
                {language === 'uz' ? 'Bajarish va chuqur fokus' : language === 'ru' ? 'Выполнение и глубокий фокус' : 'Execution & Deep Flow'}
              </span>
              <span className="text-[9px] font-bold text-[#3D6B52] font-mono-num">
                {completedTasks}/{totalTasks} {language === 'uz' ? 'ta vazifa' : language === 'ru' ? 'задач' : 'tasks'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Tasks */}
              <div className="p-2.5 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs text-left">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-[#DDE8DE] border border-[#24201D]/40 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-[#3D6B52]" />
                  </div>
                  <span className="text-[8px] font-black text-[#6B635B] uppercase">{t.priorities.title}</span>
                </div>
                <p className="text-sm font-black font-mono-num text-[#24201D] mt-1">
                  {completedTasks}/{totalTasks}
                </p>
                <p className="text-[9px] font-bold text-[#6B635B] truncate">
                  {language === 'uz' ? 'Bu hafta bajarildi' : language === 'ru' ? 'Завершено за неделю' : 'Completed this week'}
                </p>
              </div>

              {/* Deep Flow */}
              <div className="p-2.5 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs text-left">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-[#DEE8EF] border border-[#24201D]/40 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-[#476C85]" />
                  </div>
                  <span className="text-[8px] font-black text-[#6B635B] uppercase">{t.focus.title}</span>
                </div>
                <p className="text-sm font-black font-mono-num text-[#24201D] mt-1">
                  {totalFocusHours}h
                </p>
                <p className="text-[9px] font-bold text-[#6B635B] truncate">
                  {language === 'uz' ? 'Fokus vaqti' : language === 'ru' ? 'Время в фокусе' : 'Focused time logged'}
                </p>
              </div>

              {/* Habits */}
              <div className="p-2.5 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs text-left">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-[#FBECCF] border border-[#24201D]/40 flex items-center justify-center">
                    <Flame className="w-3.5 h-3.5 text-[#854D0E] fill-[#F0BB58]" />
                  </div>
                  <span className="text-[8px] font-black text-[#6B635B] uppercase">{t.habits.title}</span>
                </div>
                <p className="text-sm font-black font-mono-num text-[#24201D] mt-1">
                  {totalHabitChecks}
                </p>
                <p className="text-[9px] font-bold text-[#6B635B] truncate">
                  {language === 'uz' ? 'Odatlar bajarildi' : language === 'ru' ? 'Привычек выполнено' : 'Rituals maintained'}
                </p>
              </div>

              {/* XP */}
              <div className="p-2.5 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs text-left">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-[#FAF0EC] border border-[#24201D]/40 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-[#C25E40]" />
                  </div>
                  <span className="text-[8px] font-black text-[#6B635B] uppercase">
                    {language === 'uz' ? 'Mahorat' : language === 'ru' ? 'Мастерство' : 'Mastery'}
                  </span>
                </div>
                <p className="text-sm font-black font-mono-num text-[#24201D] mt-1">
                  +{totalXP} XP
                </p>
                <p className="text-[9px] font-bold text-[#6B635B] truncate">
                  {language === 'uz' ? 'Unumdorlik ballari' : language === 'ru' ? 'Очки продуктивности' : 'Productivity points'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: HEALTH & BODY VITALITY */}
          <div className="relative z-10 space-y-1.5 text-left">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black font-display uppercase tracking-wider text-[#24201D] flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#C25E40] fill-[#F7E3DC] stroke-[2.25]" />
                {language === 'uz' ? 'Salomatlik va tana quvvati' : language === 'ru' ? 'Здоровье и энергия тела' : 'Health & Body Vitality'}
              </span>
              <span className="text-[9px] font-bold text-[#854D0E] bg-[#FBECCF] px-2 py-0.5 rounded-full border border-[#24201D]/30 uppercase">
                {healthProfile.goal === 'lose'
                  ? (language === 'uz' ? 'Vazn yoʻqotish' : language === 'ru' ? 'Снижение веса' : 'Weight Loss')
                  : healthProfile.goal === 'gain'
                  ? (language === 'uz' ? 'Mushak toʻplash' : language === 'ru' ? 'Набор массы' : 'Muscle Gain')
                  : (language === 'uz' ? 'Vaznni saqlash' : language === 'ru' ? 'Поддержание' : 'Maintain')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Weight & Trend */}
              <div className="p-2.5 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs text-left">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-[#DDE8DE] border border-[#24201D]/40 flex items-center justify-center">
                    <Scale className="w-3.5 h-3.5 text-[#2D503C]" />
                  </div>
                  <span className="text-[8px] font-black uppercase text-[#2D503C] flex items-center gap-0.5">
                    {weightChangeDiff < 0 ? (
                      <TrendingDown className="w-2.5 h-2.5 text-emerald-600" />
                    ) : weightChangeDiff > 0 ? (
                      <TrendingUp className="w-2.5 h-2.5 text-amber-600" />
                    ) : (
                      <Minus className="w-2.5 h-2.5 text-stone-400" />
                    )}
                    {Math.abs(weightChangeDiff)} kg
                  </span>
                </div>
                <p className="text-sm font-black font-mono-num text-[#24201D] mt-1">
                  {currentWeightVal} kg
                </p>
                <p className="text-[9px] font-bold text-[#6B635B] truncate">
                  BMI {healthMetrics.bmi.toFixed(1)} • {healthMetrics.bmiCategoryLabel}
                </p>
              </div>

              {/* Nutrition & Calories */}
              <div className="p-2.5 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs text-left">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-[#FBECCF] border border-[#24201D]/40 flex items-center justify-center">
                    <Utensils className="w-3.5 h-3.5 text-[#854D0E]" />
                  </div>
                  <span className="text-[8px] font-black text-[#854D0E] uppercase">{t.health.nutrition}</span>
                </div>
                <p className="text-sm font-black font-mono-num text-[#24201D] mt-1">
                  {avgDailyKcal > 0 ? `${avgDailyKcal} kcal` : `${healthMetrics.targetDailyCalories || 2000} kcal`}
                </p>
                <p className="text-[9px] font-bold text-[#6B635B] truncate">
                  {uniqueMealDays > 0
                    ? (language === 'uz' ? `${uniqueMealDays} kun yozildi • kuniga oʻrtacha` : language === 'ru' ? `${uniqueMealDays} дн. внесено • ср/день` : `${uniqueMealDays}d logged • avg/day`)
                    : (language === 'uz' ? 'Maqsad kaloriya' : language === 'ru' ? 'Целевая норма' : 'Target energy')}
                </p>
              </div>

              {/* Hydration */}
              <div className="p-2.5 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs text-left">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-[#DEE8EF] border border-[#24201D]/40 flex items-center justify-center">
                    <Droplets className="w-3.5 h-3.5 text-[#2A495E]" />
                  </div>
                  <span className="text-[8px] font-black text-[#2A495E] uppercase">{t.health.water}</span>
                </div>
                <p className="text-sm font-black font-mono-num text-[#24201D] mt-1">
                  {Number(avgDailyWaterL) > 0 ? `${avgDailyWaterL}L` : `${((healthProfile.currentWeight * 35) / 1000).toFixed(1)}L`}
                </p>
                <p className="text-[9px] font-bold text-[#6B635B] truncate">
                  {uniqueWaterDays > 0
                    ? (language === 'uz' ? `${uniqueWaterDays} kun yozildi • kuniga oʻrtacha` : language === 'ru' ? `${uniqueWaterDays} дн. внесено • ср/день` : `${uniqueWaterDays}d logged • avg/day`)
                    : (language === 'uz' ? 'Tavsiya meʼyori' : language === 'ru' ? 'Рекомендация/день' : 'Recommended/day')}
                </p>
              </div>

              {/* Workouts & Movement */}
              <div className="p-2.5 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs text-left">
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-lg bg-[#F7E3DC] border border-[#24201D]/40 flex items-center justify-center">
                    <Dumbbell className="w-3.5 h-3.5 text-[#C25E40]" />
                  </div>
                  <span className="text-[8px] font-black text-[#C25E40] uppercase">
                    {language === 'uz' ? 'Faollik' : language === 'ru' ? 'Активность' : 'Active'}
                  </span>
                </div>
                <p className="text-sm font-black font-mono-num text-[#24201D] mt-1">
                  {totalWorkoutCount > 0
                    ? `${totalWorkoutCount} ${language === 'uz' ? 'ta mashgʻulot' : language === 'ru' ? 'тренировок' : 'sessions'}`
                    : (language === 'uz' ? 'Faol hayot' : language === 'ru' ? 'Активный образ' : 'Active living')}
                </p>
                <p className="text-[9px] font-bold text-[#6B635B] truncate">
                  {totalWorkoutMins > 0
                    ? `${totalWorkoutMins}m • ${totalWorkoutBurned} ${language === 'uz' ? 'kkal' : language === 'ru' ? 'ккал' : 'kcal'}`
                    : (language === 'uz' ? 'Kunlik mashqlar' : language === 'ru' ? 'Ежедневные тренировки' : 'Daily workouts')}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: 7-DAY HARMONY MATRIX */}
          <div className="relative z-10 p-2.5 bg-white border-[1.5px] border-[#24201D] rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-black uppercase text-stone-500 px-1">
              <span>{language === 'uz' ? '7 kunlik aql va tana ritmi' : language === 'ru' ? '7-дневный ритм разума и тела' : '7-Day Mind & Body Rhythm'}</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#3D6B52]" /> {t.focus.title}</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#E09F3E]" /> {t.health.title}</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {daysArray.map((day) => (
                <div
                  key={day.dateStr}
                  className={`py-1.5 px-0.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    day.score >= 60
                      ? 'bg-[#DDE8DE] border-[#24201D] text-[#24201D] shadow-2xs'
                      : day.focusCompleted || day.healthCompleted
                      ? 'bg-[#FAF8F5] border-[#24201D]/50 text-[#24201D]'
                      : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase">{day.dayShort}</span>
                  <span className="text-[10px] font-mono-num font-black mt-0.5">{day.dayNum}</span>
                  <div className="flex items-center gap-0.5 mt-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        day.focusCompleted ? 'bg-[#3D6B52]' : 'bg-stone-200'
                      }`}
                      title={language === 'uz' ? 'Fokus faolligi' : language === 'ru' ? 'Активность фокуса' : 'Focus activity'}
                    />
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        day.healthCompleted ? 'bg-[#E09F3E]' : 'bg-stone-200'
                      }`}
                      title={language === 'uz' ? 'Salomatlik va tana jurnali' : language === 'ru' ? 'Журнал здоровья и тела' : 'Health & Body log'}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Footer */}
          <div className="relative z-10 pt-1 flex items-center justify-between border-t border-[#24201D]/15 text-[8px] font-bold text-[#6B635B]">
            <span>{language === 'uz' ? 'Daily Sumire • Aql, Tana va Fokus' : language === 'ru' ? 'Daily Sumire • Разум, Тело и Фокус' : 'Daily Sumire • Mind, Body & Focus'}</span>
            <span className="font-mono-num">
              {language === 'uz' ? 'Haftalik sertifikatlangan hisobot' : language === 'ru' ? 'Сертифицированная карта недели' : 'Weekly Certified Card'}
            </span>
          </div>
        </div>

        {/* Bottom Actions Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex-1 py-3 px-4 bg-[#FAF8F5] hover:bg-stone-100 border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black text-[#24201D] shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2.25]" />
            <span>{t.modals.downloadImage || (language === 'uz' ? 'Rasmni yuklab olish' : language === 'ru' ? 'Скачать PNG' : 'Download PNG')}</span>
          </button>

          <button
            onClick={handleNativeShare}
            disabled={isExporting}
            className="flex-1 py-3 px-4 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{language === 'uz' ? 'Rasm nusxalandi!' : language === 'ru' ? 'Изображение скопировано!' : 'Copied Image!'}</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 stroke-[2.25]" />
                <span>{language === 'uz' ? 'Kartani ulashish' : language === 'ru' ? 'Поделиться карточкой' : 'Share Card'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
