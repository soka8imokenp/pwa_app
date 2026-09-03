import React, { useState, useEffect } from 'react';
import { X, Scale, Calendar, FileText, Plus, Minus, Check } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { calculateBmi, getBmiCategory } from '../../lib/healthFormulas';
import { getTodayString } from '../../lib/dateUtils';

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeight: number;
  heightCm: number;
  selectedDate: string;
  onSaveWeight: (weight: number, note?: string, date?: string) => Promise<void>;
}

export const LogWeightModal: React.FC<LogWeightModalProps> = ({
  isOpen,
  onClose,
  currentWeight,
  heightCm,
  selectedDate,
  onSaveWeight,
}) => {
  const [weight, setWeight] = useState<string>(String(currentWeight || 70));
  const [date, setDate] = useState<string>(selectedDate);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setWeight(String(currentWeight || 70));
      setDate(selectedDate);
      setNote('');
    }
  }, [isOpen, currentWeight, selectedDate]);

  if (!isOpen) return null;

  const numWeight = parseFloat(weight) || 0;
  const bmi = calculateBmi(numWeight, heightCm);
  const { label: bmiLabel, color: bmiColor } = getBmiCategory(bmi);

  const diffFromCurrent = Number((numWeight - currentWeight).toFixed(1));

  const handleStep = (delta: number) => {
    playClickSound();
    const updated = Math.max(30, Math.min(250, Number((numWeight + delta).toFixed(1))));
    setWeight(String(updated));
  };

  const handleQuickNote = (tag: string) => {
    playClickSound();
    setNote(tag);
  };

  const todayStr = getTodayString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const handleSetQuickDate = (d: string) => {
    playClickSound();
    setDate(d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numWeight <= 0) return;

    playSuccessChime();
    await onSaveWeight(numWeight, note.trim() || undefined, date);
    onClose();
  };

  const notePresets = ['Morning fasting', 'Post-workout', 'Evening', 'Post-meal'];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#24201D]/50 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-sm bg-white border-[2px] border-[#24201D] rounded-3xl shadow-[4px_4px_0px_#24201D] p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#24201D]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Scale className="w-4 h-4 text-[#2D503C]" />
            </div>
            <div>
              <h2 className="text-sm font-black font-display uppercase tracking-wider text-[#24201D]">
                Log Body Weight
              </h2>
              <p className="text-[10px] font-bold text-[#6B635B]">
                Precision weigh-in & BMI calculation
              </p>
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
          
          {/* Main LCD-style Weight Input */}
          <div className="p-3 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B]">
                Scale Reading (kg)
              </span>
              {diffFromCurrent !== 0 && (
                <span className={`text-[10px] font-black font-mono-num ${diffFromCurrent < 0 ? 'text-[#3D6B52]' : 'text-[#DC2626]'}`}>
                  {diffFromCurrent > 0 ? `+${diffFromCurrent}` : diffFromCurrent} kg vs last
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleStep(-0.5)}
                className="w-10 h-10 rounded-xl bg-white hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
              >
                -
              </button>

              <div className="relative flex items-center justify-center">
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  autoFocus
                  className="w-32 py-1 bg-transparent text-center text-3xl font-black font-mono-num text-[#24201D] focus:outline-none"
                />
                <span className="text-xs font-black text-[#6B635B] ml-1">
                  KG
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleStep(0.5)}
                className="w-10 h-10 rounded-xl bg-white hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-base font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Micro Stepper Pills */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[-1.0, -0.1, 0.1, 1.0].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleStep(step)}
                  className="py-1 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] text-[11px] font-black font-mono-num text-[#24201D] shadow-2xs cursor-pointer active:scale-95 transition-all"
                >
                  {step > 0 ? `+${step}` : step}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time BMI Indicator */}
          {bmi > 0 && (
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center justify-between shadow-2xs">
              <span className="text-xs font-bold text-[#6B635B]">Calculated BMI:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black font-mono-num text-[#24201D]">{bmi}</span>
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white shadow-2xs"
                  style={{ backgroundColor: bmiColor }}
                >
                  {bmiLabel}
                </span>
              </div>
            </div>
          )}

          {/* Date Picker with Quick Date Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Weigh-In Date
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(todayStr)}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
                    date === todayStr
                      ? 'bg-[#24201D] text-white'
                      : 'bg-[#FAF8F5] text-[#6B635B] border border-[#24201D]/20'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate(yesterdayStr)}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${
                    date === yesterdayStr
                      ? 'bg-[#24201D] text-white'
                      : 'bg-[#FAF8F5] text-[#6B635B] border border-[#24201D]/20'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] shadow-2xs focus:outline-none"
            />
          </div>

          {/* Context Note with Presets */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] flex items-center gap-1">
              <FileText className="w-3 h-3" /> Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. morning fasting, post-workout..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
            />

            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {notePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickNote(preset)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    note === preset
                      ? 'bg-[#24201D] text-white border-[#24201D]'
                      : 'bg-white text-[#6B635B] border-[#24201D]/20 hover:border-[#24201D]'
                  }`}
                >
                  {note === preset && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  <span>{preset}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all font-display uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Scale className="w-4 h-4 stroke-[2.5]" />
              <span>Save Weigh-In Record</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
