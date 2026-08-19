import React, { useState } from 'react';
import { Flame, Droplets, BookOpen, Activity, Moon, Zap, Target, Heart, Check, X } from 'lucide-react';
import type { Habit } from '../../types';
import { playClickSound, playSuccessChime } from '../../lib/sound';

interface AddHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'archived'>) => void;
}

export const AddHabitModal: React.FC<AddHabitModalProps> = ({
  isOpen,
  onClose,
  onAddHabit,
}) => {
  const [title, setTitle] = useState('');
  const [iconKey, setIconKey] = useState('zap');
  const [color, setColor] = useState('#C084FC');
  const [targetDays, setTargetDays] = useState<string[]>([
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun',
  ]);

  if (!isOpen) return null;

  const iconChoices = [
    { id: 'zap', label: 'Energy', icon: <Zap className="w-4 h-4 stroke-[2.25]" /> },
    { id: 'water', label: 'Water', icon: <Droplets className="w-4 h-4 stroke-[2.25]" /> },
    { id: 'book', label: 'Reading', icon: <BookOpen className="w-4 h-4 stroke-[2.25]" /> },
    { id: 'stretch', label: 'Posture', icon: <Activity className="w-4 h-4 stroke-[2.25]" /> },
    { id: 'sleep', label: 'Sleep', icon: <Moon className="w-4 h-4 stroke-[2.25]" /> },
    { id: 'target', label: 'Quest', icon: <Target className="w-4 h-4 stroke-[2.25]" /> },
  ];

  const colorOptions = [
    { label: 'Lilac', hex: '#C084FC' },
    { label: 'Mint', hex: '#BEF264' },
    { label: 'Peach', hex: '#FED7AA' },
    { label: 'Sky', hex: '#BAE6FD' },
    { label: 'Lemon', hex: '#FEF08A' },
  ];

  const daysList = [
    { id: 'mon', label: 'M' },
    { id: 'tue', label: 'T' },
    { id: 'wed', label: 'W' },
    { id: 'thu', label: 'T' },
    { id: 'fri', label: 'F' },
    { id: 'sat', label: 'S' },
    { id: 'sun', label: 'S' },
  ];

  const toggleDay = (dayId: string) => {
    playClickSound();
    if (targetDays.includes(dayId)) {
      if (targetDays.length > 1) {
        setTargetDays(targetDays.filter((d) => d !== dayId));
      }
    } else {
      setTargetDays([...targetDays, dayId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    playSuccessChime();
    onAddHabit({
      title: title.trim(),
      icon: iconKey,
      color,
      targetDays,
    });

    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/40 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#18181B] rounded-[2.5rem] shadow-[4px_4px_0px_#18181B] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#18181B]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#FEF08A] border-[1.75px] border-[#18181B] flex items-center justify-center shadow-2xs">
              <Flame className="w-5 h-5 text-amber-700 fill-amber-400 stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#18181B]">
                Create Habit Streak
              </h3>
              <p className="text-[10px] font-semibold text-slate-500">
                Track daily quantifiable consistency
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-[#FAF7F2] hover:bg-slate-100 border-[1.5px] border-[#18181B] flex items-center justify-center text-slate-600 hover:text-[#18181B] cursor-pointer shadow-2xs active:scale-95"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
              Habit Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 20 pages or 2L pure water"
              className="w-full px-4 py-2.5 bg-[#FAF7F2] text-xs font-bold rounded-2xl border-[1.75px] border-[#18181B] outline-none placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Lucide Icon Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
              Icon Badge
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {iconChoices.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIconKey(item.id);
                  }}
                  className={`h-10 rounded-2xl border-[1.5px] flex items-center justify-center transition-all cursor-pointer ${
                    iconKey === item.id
                      ? 'bg-[#C084FC] text-[#18181B] border-[#18181B] shadow-2xs scale-105'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-[#18181B]'
                  }`}
                  title={item.label}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Accent */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setColor(c.hex);
                  }}
                  style={{ backgroundColor: c.hex }}
                  className={`w-9 h-9 rounded-2xl border-[1.75px] border-[#18181B] transition-transform cursor-pointer flex items-center justify-center ${
                    color === c.hex
                      ? 'shadow-[2px_2px_0px_#18181B] scale-110'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.label}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-[#18181B] stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Target Days */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                Frequency
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])}
                  className="text-[10px] font-black text-purple-700 underline cursor-pointer"
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDays(['mon', 'tue', 'wed', 'thu', 'fri'])}
                  className="text-[10px] font-black text-purple-700 underline cursor-pointer"
                >
                  Weekdays
                </button>
              </div>
            </div>

            <div className="flex gap-1.5">
              {daysList.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={`flex-1 py-1.5 rounded-xl border-[1.5px] font-black text-xs transition-all cursor-pointer ${
                    targetDays.includes(d.id)
                      ? 'bg-[#BEF264] text-[#18181B] border-[#18181B] shadow-2xs'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-[#18181B]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#BEF264] hover:bg-[#A3E635] text-[#18181B] border-[1.5px] border-[#18181B] text-xs font-black shadow-xs active:translate-y-0.5 cursor-pointer"
            >
              Start Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
