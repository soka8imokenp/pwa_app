import React, { useState } from 'react';
import { Flame, Droplets, BookOpen, Activity, Moon, Zap, Target, Check, X } from 'lucide-react';
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
  const [color, setColor] = useState('#3D6B52');
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
    { id: 'stretch', label: 'Movement', icon: <Activity className="w-4 h-4 stroke-[2.25]" /> },
    { id: 'sleep', label: 'Sleep', icon: <Moon className="w-4 h-4 stroke-[2.25]" /> },
    { id: 'target', label: 'Focus', icon: <Target className="w-4 h-4 stroke-[2.25]" /> },
  ];

  const colorOptions = [
    { label: 'Matcha', hex: '#3D6B52' },
    { label: 'Terracotta', hex: '#C25E40' },
    { label: 'Ochre', hex: '#E09F3E' },
    { label: 'Indigo', hex: '#476C85' },
    { label: 'Sage', hex: '#8FA89B' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-md bg-white border-[2px] border-[#24201D] rounded-[2.5rem] shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FBECCF] border-[1.5px] border-[#24201D] flex items-center justify-center shadow-2xs">
              <Flame className="w-5 h-5 text-[#854D0E] fill-[#F0BB58] stroke-[2.25]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                Create Habit Streak
              </h3>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Track daily quantifiable consistency
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#F4F0EA] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#6B635B] mb-1 px-1">
              Habit Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 20 pages or 2L pure water"
              className="w-full px-3.5 py-2.5 bg-[#F4F0EA] text-xs font-bold text-[#24201D] rounded-xl border border-[#24201D] outline-none placeholder:text-[#A89F91] shadow-2xs"
            />
          </div>

          {/* Lucide Icon Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#6B635B] mb-1 px-1">
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
                  className={`h-10 rounded-xl border-[1.5px] flex items-center justify-center transition-all cursor-pointer ${
                    iconKey === item.id
                      ? 'bg-[#DDE8DE] text-[#2D503C] border-[#24201D] shadow-2xs scale-105'
                      : 'bg-[#F4F0EA] text-[#6B635B] border-[#24201D]/20 hover:border-[#24201D]'
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
            <label className="block text-[10px] font-black uppercase tracking-wider text-[#6B635B] mb-1 px-1">
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
                  className={`w-8 h-8 rounded-xl border-[1.5px] border-[#24201D] transition-transform cursor-pointer flex items-center justify-center ${
                    color === c.hex
                      ? 'shadow-[1.5px_1.5px_0px_#24201D] scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                >
                  {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Target Days */}
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B]">
                Frequency
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])}
                  className="text-[10px] font-bold text-[#3D6B52] underline cursor-pointer"
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDays(['mon', 'tue', 'wed', 'thu', 'fri'])}
                  className="text-[10px] font-bold text-[#3D6B52] underline cursor-pointer"
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
                      ? 'bg-[#3D6B52] text-white border-[#24201D] shadow-2xs'
                      : 'bg-[#F4F0EA] text-[#6B635B] border-[#24201D]/20 hover:border-[#24201D]'
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
              className="px-4 py-2 rounded-xl border border-[#24201D]/30 text-xs font-bold text-[#6B635B] hover:bg-[#F4F0EA] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.5px] border-[#24201D] text-xs font-black shadow-[1.5px_1.5px_0px_#24201D] active:translate-y-0.5 cursor-pointer"
            >
              Start Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
