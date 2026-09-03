import React, { useState } from 'react';
import { X, Scale, Calendar, FileText } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { calculateBmi, getBmiCategory } from '../../lib/healthFormulas';

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

  if (!isOpen) return null;

  const numWeight = parseFloat(weight) || 0;
  const bmi = calculateBmi(numWeight, heightCm);
  const { label: bmiLabel, color: bmiColor } = getBmiCategory(bmi);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numWeight <= 0) return;

    playSuccessChime();
    await onSaveWeight(numWeight, note.trim() || undefined, date);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#24201D]/45 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
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
                Track your progress & BMI
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
          {/* Weight Input */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block mb-1">
              Weight (kg)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoFocus
                className="w-full px-3.5 py-3 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-xl text-xl font-black font-mono-num text-[#24201D] shadow-2xs focus:outline-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#6B635B]">
                KG
              </span>
            </div>
          </div>

          {/* Real-time BMI pill */}
          {bmi > 0 && (
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#24201D]/20 flex items-center justify-between">
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

          {/* Date Picker */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] shadow-2xs focus:outline-none"
            />
          </div>

          {/* Note Input */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B635B] block mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. morning fasting, post-workout"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all font-display uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Scale className="w-4 h-4 stroke-[2.5]" />
              <span>Save Weigh-In</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
