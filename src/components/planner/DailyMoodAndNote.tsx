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
    activeBg: 'bg-[#F7E3DC]',
    activeBorder: 'border-[#C25E40]',
    textColor: 'text-[#9A3412]',
  },
  {
    id: 'focused',
    label: 'Focused',
    icon: <Sun className="w-4 h-4" />,
    activeBg: 'bg-[#FBECCF]',
    activeBorder: 'border-[#E09F3E]',
    textColor: 'text-[#854D0E]',
  },
  {
    id: 'cozy',
    label: 'Cozy',
    icon: <Coffee className="w-4 h-4" />,
    activeBg: 'bg-[#DDE8DE]',
    activeBorder: 'border-[#3D6B52]',
    textColor: 'text-[#2D503C]',
  },
  {
    id: 'reflective',
    label: 'Reflective',
    icon: <CloudRain className="w-4 h-4" />,
    activeBg: 'bg-[#DEE8EF]',
    activeBorder: 'border-[#476C85]',
    textColor: 'text-[#2A495E]',
  },
  {
    id: 'rest',
    label: 'Resting',
    icon: <Moon className="w-4 h-4" />,
    activeBg: 'bg-[#E8E0D2]',
    activeBorder: 'border-[#8C7A68]',
    textColor: 'text-[#574B3E]',
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] font-display">
            Daily State
          </span>
          {selectedMood && (
            <span className="text-[10px] font-bold text-[#24201D] capitalize">
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
                className={`py-2 px-1 rounded-xl border-[1.5px] border-[#24201D] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? `${mood.activeBg} ${mood.textColor} shadow-[1.5px_1.5px_0px_#24201D] -translate-y-0.5 font-bold`
                    : 'bg-[#F4F0EA] text-[#6B635B] hover:bg-stone-200 shadow-[1px_1px_0px_#24201D]'
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
      <div className="pt-2 border-t border-stone-200 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#6B635B]">
            <NotebookPen className="w-3.5 h-3.5 stroke-[2]" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">
              Daily Reflection / Thought
            </span>
          </div>

          {isSavedRecently && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#3D6B52] animate-in fade-in">
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
          className="w-full p-2.5 bg-[#F4F0EA] border-[1.5px] border-[#24201D] rounded-xl text-xs font-medium text-[#24201D] placeholder:text-stone-400 outline-none resize-none shadow-[1px_1px_0px_#24201D] focus:bg-white transition-colors"
        />
      </div>
    </div>
  );
};
