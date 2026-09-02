import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Clock,
  Target,
  ArrowRight,
  X,
  Calendar,
  Archive,
  CheckCircle2,
  Zap,
  Leaf,
  Moon,
  Check,
} from 'lucide-react';
import type { Task, HabitWithStats, FocusSession } from '../../types';
import { playSuccessChime, playClickSound, playTaskCheckSound } from '../../lib/sound';
import { shiftDate } from '../../lib/dateUtils';
import confetti from 'canvas-confetti';

interface EveningReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  priorityTasks: Task[];
  allTasks: Task[];
  habits: HabitWithStats[];
  todaysSessions: FocusSession[];
  selectedDate: string;
  onRolloverTask?: (taskId: number, newDate: string) => void;
  onDemoteToBacklog?: (task: Task) => void;
  onToggleComplete?: (task: Task) => void;
  onDataChanged?: () => void;
}

const MOOD_OPTIONS = [
  { id: 'fire', label: 'On Fire', icon: <Flame className="w-3.5 h-3.5 text-[#C25E40] fill-[#F0BB58]" />, color: '#F7E3DC' },
  { id: 'focused', label: 'Focused', icon: <Target className="w-3.5 h-3.5 text-[#3D6B52]" />, color: '#DDE8DE' },
  { id: 'calm', label: 'Calm', icon: <Leaf className="w-3.5 h-3.5 text-[#3D6B52]" />, color: '#DDE8DE' },
  { id: 'energetic', label: 'Energetic', icon: <Zap className="w-3.5 h-3.5 text-[#E09F3E]" />, color: '#FBECCF' },
  { id: 'tired', label: 'Tired', icon: <Moon className="w-3.5 h-3.5 text-[#6B635B]" />, color: '#FAF8F5' },
];

export const EveningReviewModal: React.FC<EveningReviewModalProps> = ({
  isOpen,
  onClose,
  priorityTasks,
  allTasks,
  habits,
  todaysSessions,
  selectedDate,
  onRolloverTask,
  onDemoteToBacklog,
  onToggleComplete,
  onDataChanged,
}) => {
  const [selectedMood, setSelectedMood] = useState<string>('focused');
  const [winNote, setWinNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Load existing mood & note if already saved today
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const savedMood = localStorage.getItem(`kairo_daily_mood_${selectedDate}`);
      const savedNote = localStorage.getItem(`kairo_daily_note_${selectedDate}`);
      if (savedMood) setSelectedMood(savedMood);
      if (savedNote) setWinNote(savedNote);
      setIsSaved(false);

      playSuccessChime();
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#3D6B52', '#F0BB58', '#DDE8DE', '#C25E40'],
      });
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const todayTasks = allTasks.filter((t) => t.date === selectedDate);
  const pendingTasks = todayTasks.filter((t) => !t.isCompleted);
  const completedPriorities = priorityTasks.filter((t) => t.isCompleted).length;
  const completedHabits = habits.filter((h) => h.completedToday).length;
  const totalFocusMins = todaysSessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  const score = Math.min(
    100,
    Math.round(
      (priorityTasks.length > 0 ? (completedPriorities / priorityTasks.length) * 50 : 30) +
      (habits.length > 0 ? (completedHabits / habits.length) * 30 : 20) +
      Math.min(totalFocusMins / 3, 20)
    )
  );

  const handleRolloverAll = () => {
    if (!onRolloverTask) return;
    const tomorrow = shiftDate(selectedDate, 1);
    playClickSound();
    pendingTasks.forEach((t) => {
      if (t.id) onRolloverTask(t.id, tomorrow);
    });
    if (onDataChanged) onDataChanged();
  };

  const handleMoveAllToBacklog = () => {
    if (!onDemoteToBacklog) return;
    playClickSound();
    pendingTasks.forEach((t) => {
      onDemoteToBacklog(t);
    });
    if (onDataChanged) onDataChanged();
  };

  const handleSaveAndClose = () => {
    playClickSound();
    localStorage.setItem(`kairo_daily_mood_${selectedDate}`, selectedMood);
    if (winNote.trim()) {
      localStorage.setItem(`kairo_daily_note_${selectedDate}`, winNote.trim());
    }
    setIsSaved(true);

    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header with Trophy and Close */}
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FBECCF] border-[1.75px] border-[#24201D] flex items-center justify-center shadow-2xs shrink-0">
              <Trophy className="w-5 h-5 text-[#854D0E] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#24201D]">
                Evening Debrief
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Daily Wrap-Up • {selectedDate}
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

        {/* 1. Daily Score Banner */}
        <div className="p-3.5 bg-[#DDE8DE] border-[1.75px] border-[#24201D] rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[9px] font-black uppercase text-[#2D503C] block">
              Day Productivity Score
            </span>
            <span className="text-sm font-black text-[#2D503C] font-display">
              {score >= 80 ? 'Exceptional Work!' : score >= 50 ? 'Solid Consistency' : 'Good Recovery Day'}
            </span>
          </div>
          <span className="text-2xl font-black font-mono-num text-[#2D503C]">
            {score}%
          </span>
        </div>

        {/* 2. Three Metric Badges */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl text-center shadow-2xs">
            <Target className="w-4 h-4 text-[#3D6B52] mx-auto stroke-[2.25]" />
            <p className="text-base font-black font-mono-num text-[#24201D] mt-1">
              {completedPriorities}/{priorityTasks.length}
            </p>
            <p className="text-[9px] font-black uppercase text-[#6B635B]">
              Priorities
            </p>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl text-center shadow-2xs">
            <Flame className="w-4 h-4 text-[#C25E40] mx-auto stroke-[2.25]" />
            <p className="text-base font-black font-mono-num text-[#24201D] mt-1">
              {completedHabits}/{habits.length}
            </p>
            <p className="text-[9px] font-black uppercase text-[#6B635B]">
              Habits
            </p>
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl text-center shadow-2xs">
            <Clock className="w-4 h-4 text-[#476C85] mx-auto stroke-[2.25]" />
            <p className="text-base font-black font-mono-num text-[#24201D] mt-1">
              {totalFocusMins}m
            </p>
            <p className="text-[9px] font-black uppercase text-[#6B635B]">
              Deep Flow
            </p>
          </div>
        </div>

        {/* 3. Mood & State Check-In */}
        <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl space-y-2 shadow-2xs">
          <label className="block text-xs font-black uppercase tracking-wider text-[#24201D]">
            How was your day?
          </label>
          
          <div className="grid grid-cols-5 gap-1.5">
            {MOOD_OPTIONS.map((m) => {
              const isSelected = selectedMood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setSelectedMood(m.id);
                  }}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'border-[#24201D] shadow-[2px_2px_0px_#24201D] scale-105'
                      : 'border-stone-200 bg-[#FAF8F5] hover:border-[#24201D]'
                  }`}
                  style={{ backgroundColor: isSelected ? m.color : undefined }}
                >
                  {m.icon}
                  <span className="text-[8px] font-black text-[#24201D] truncate max-w-full">
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Win of the Day Input */}
          <div className="pt-1">
            <label className="block text-[10px] font-black uppercase text-[#6B635B] mb-1">
              Biggest Win or Takeaway
            </label>
            <input
              type="text"
              value={winNote}
              onChange={(e) => setWinNote(e.target.value)}
              placeholder="e.g. Shipped APK update, 2h deep focus code sprint..."
              className="w-full px-3 py-2 bg-[#FAF8F5] text-xs font-bold rounded-xl border border-[#24201D] outline-none placeholder:text-stone-400 shadow-2xs text-[#24201D]"
            />
          </div>
        </div>

        {/* 4. Uncompleted Tasks Action (Rollover / Backlog) */}
        {pendingTasks.length > 0 && (
          <div className="p-3.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#854D0E]">
                {pendingTasks.length} Unfinished Task{pendingTasks.length > 1 ? 's' : ''} Today
              </span>
              <span className="text-[9px] font-bold text-[#854D0E]">
                Choose action
              </span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {pendingTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-2 bg-white border border-[#24201D]/20 rounded-xl flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-bold text-[#24201D] truncate flex-1">{t.title}</span>
                  {t.id && onRolloverTask && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        onRolloverTask(t.id!, shiftDate(selectedDate, 1));
                        if (onDataChanged) onDataChanged();
                      }}
                      title="Move to tomorrow"
                      className="px-2 py-0.5 bg-[#DDE8DE] hover:bg-[#C9DCCB] border border-[#24201D] rounded-lg text-[9px] font-black text-[#2D503C] cursor-pointer shrink-0"
                    >
                      +1 Day
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleRolloverAll}
                className="py-1.5 px-2 bg-white hover:bg-amber-50 border border-[#24201D] rounded-xl text-[10px] font-black text-[#24201D] flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-95"
              >
                <Calendar className="w-3 h-3 text-[#854D0E]" />
                <span>Move All to Tomorrow</span>
              </button>

              <button
                type="button"
                onClick={handleMoveAllToBacklog}
                className="py-1.5 px-2 bg-white hover:bg-stone-100 border border-[#24201D] rounded-xl text-[10px] font-black text-[#24201D] flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-95"
              >
                <Archive className="w-3 h-3 text-[#476C85]" />
                <span>Move to Backlog</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. Complete & Save Button */}
        <button
          type="button"
          onClick={handleSaveAndClose}
          className="w-full py-3 rounded-2xl bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] text-xs font-black shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 transition-all"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Save & Complete Daily Wrap-Up</span>
        </button>

      </div>
    </div>
  );
};
