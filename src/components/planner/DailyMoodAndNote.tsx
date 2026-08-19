import React, { useState, useEffect } from 'react';
import {
  Flame,
  Sun,
  Coffee,
  CloudRain,
  Moon,
  NotebookPen,
  Check,
} from 'lucide-react';
import { playClickSound } from '../../lib/sound';

interface DailyMoodAndNoteProps {
  selectedDate: string;
}

interface MoodOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeBg: string;
  activeBorder: string;
  textColor: string;
}

const MOODS: MoodOption[] = [
  {
    id: 'energized',
    label: 'Energized',
    icon: <Flame className="w-4 h-4" />,
    activeBg: 'bg-[#FFEDD5]',
    activeBorder: 'border-[#EA580C]',
    textColor: 'text-[#9A3412]',
  },
  {
    id: 'focused',
    label: 'Focused',
    icon: <Sun className="w-4 h-4" />,
    activeBg: 'bg-[#FEF9C3]',
    activeBorder: 'border-[#CA8A04]',
    textColor: 'text-[#854D0E]',
  },
  {
    id: 'cozy',
    label: 'Cozy',
    icon: <Coffee className="w-4 h-4" />,
    activeBg: 'bg-[#FED7AA]',
    activeBorder: 'border-[#C2410C]',
    textColor: 'text-[#7C2D12]',
  },
  {
    id: 'reflective',
    label: 'Reflective',
    icon: <CloudRain className="w-4 h-4" />,
    activeBg: 'bg-[#E0F2FE]',
    activeBorder: 'border-[#0284C7]',
    textColor: 'text-[#075985]',
  },
  {
    id: 'rest',
    label: 'Resting',
    icon: <Moon className="w-4 h-4" />,
    activeBg: 'bg-[#EDE9FE]',
    activeBorder: 'border-[#7C3AED]',
    textColor: 'text-[#5B21B6]',
  },
];

export const DailyMoodAndNote: React.FC<DailyMoodAndNoteProps> = ({ selectedDate }) => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [dailyNote, setDailyNote] = useState<string>('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Load from localStorage for the given date
  useEffect(() => {
    const savedMood = localStorage.getItem(`sumire_mood_${selectedDate}`);
    const savedNote = localStorage.getItem(`sumire_note_${selectedDate}`) || '';
    setSelectedMood(savedMood || null);
    setDailyNote(savedNote);
    setIsSavedRecently(false);
  }, [selectedDate]);

  const handleSelectMood = (moodId: string) => {
    playClickSound();
    const nextMood = selectedMood === moodId ? null : moodId;
    setSelectedMood(nextMood);
    if (nextMood) {
      localStorage.setItem(`sumire_mood_${selectedDate}`, nextMood);
    } else {
      localStorage.removeItem(`sumire_mood_${selectedDate}`);
    }
  };

  const handleNoteChange = (text: string) => {
    setDailyNote(text);
    localStorage.setItem(`sumire_note_${selectedDate}`, text);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  return (
    <div className="neo-card p-4 bg-white space-y-3.5 select-none font-body">
      {/* 1. Mood Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-display">
            Daily State
          </span>
          {selectedMood && (
            <span className="text-[10px] font-bold text-slate-700 capitalize">
              {MOODS.find((m) => m.id === selectedMood)?.label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood.id;
            return (
              <button
                key={mood.id}
                onClick={() => handleSelectMood(mood.id)}
                title={mood.label}
                className={`py-2 px-1 rounded-xl border-[1.5px] border-[#18181B] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? `${mood.activeBg} ${mood.textColor} shadow-[1.5px_1.5px_0px_#18181B] -translate-y-0.5 font-bold`
                    : 'bg-[#FAF7F2] text-slate-500 hover:bg-slate-100 shadow-[1px_1px_0px_#18181B]'
                }`}
              >
                {mood.icon}
                <span className="text-[9px] font-bold tracking-tight">{mood.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Micro Note / Reflection */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-600">
            <NotebookPen className="w-3.5 h-3.5 stroke-[2]" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">
              Daily Reflection / Thought
            </span>
          </div>

          {isSavedRecently && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 animate-in fade-in">
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Saved</span>
            </div>
          )}
        </div>

        <textarea
          rows={2}
          value={dailyNote}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Capture a thought, win, or idea for today..."
          className="w-full p-2.5 bg-[#FAF7F2] border-[1.5px] border-[#18181B] rounded-xl text-xs font-medium text-[#18181B] placeholder:text-slate-400 outline-none resize-none shadow-[1px_1px_0px_#18181B] focus:bg-white transition-colors"
        />
      </div>
    </div>
  );
};
