import React, { useState, useEffect } from 'react';
import { X, Scale, FileText, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { calculateBmi, getBmiCategory } from '../../lib/healthFormulas';
import { CustomDatePicker } from './CustomDatePicker';

interface LogWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeight: number;
  heightCm: number;
  selectedDate: string;
  defaultWaist?: number;
  onSaveWeight: (weight: number, note?: string, date?: string, bodyFat?: number, waistCm?: number) => Promise<void>;
}

export const LogWeightModal: React.FC<LogWeightModalProps> = ({
  isOpen,
  onClose,
  currentWeight,
  heightCm,
  selectedDate,
  defaultWaist,
  onSaveWeight,
}) => {
  const [weight, setWeight] = useState<string>(String(currentWeight || 70));
  const [date, setDate] = useState<string>(selectedDate);
  const [note, setNote] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [waist, setWaist] = useState<string>(defaultWaist ? String(defaultWaist) : '');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setWeight(String(currentWeight || 70));
      setDate(selectedDate);
      setNote('');
      setBodyFat('');
      setWaist(defaultWaist ? String(defaultWaist) : '');
      setShowAdvanced(false);
    }
  }, [isOpen, currentWeight, selectedDate, defaultWaist]);

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
    setNote(tag === note ? '' : tag);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numWeight <= 0) return;

    playSuccessChime();
    const numFat = parseFloat(bodyFat);
    const numWaist = parseFloat(waist);

    await onSaveWeight(
      numWeight,
      note.trim() || undefined,
      date,
      !isNaN(numFat) && numFat > 0 ? numFat : undefined,
      !isNaN(numWaist) && numWaist > 0 ? numWaist : undefined
    );
    onClose();
  };

  const notePresets = ['Morning fasting', 'Post-workout', 'Evening', 'Post-meal'];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#24201D]/55 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="w-full max-w-sm bg-white border-[2px] border-[#24201D] rounded-3xl shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        
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
          <div className="p-3.5 bg-[#FAF8F5] border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
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
                className="w-10 h-10 rounded-xl bg-white hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-lg font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
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
                <span className="text-xs font-black text-[#6B635B] ml-1 font-display">
                  KG
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleStep(0.5)}
                className="w-10 h-10 rounded-xl bg-white hover:bg-stone-100 border-[1.5px] border-[#24201D] flex items-center justify-center text-lg font-black text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer"
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
                  className="py-1.5 rounded-lg bg-white hover:bg-stone-100 border border-[#24201D] text-xs font-black font-mono-num text-[#24201D] shadow-2xs cursor-pointer active:scale-95 transition-all"
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

          {/* Optional Body Composition & Measurements Accordion */}
          <div className="border border-[#24201D]/20 rounded-xl overflow-hidden bg-[#FAF8F5]">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowAdvanced(!showAdvanced);
              }}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-[#6B635B] hover:text-[#24201D] cursor-pointer"
            >
              <span>Body Fat % & Waist (Optional)</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-3 bg-white border-t border-[#24201D]/15 grid grid-cols-2 gap-2.5 animate-in fade-in duration-100">
                <div>
                  <label className="text-[9px] font-black uppercase text-[#6B635B] block mb-1 font-display">
                    Body Fat (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 18.5"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#24201D] rounded-lg text-xs font-bold font-mono-num text-[#24201D] focus:outline-none"
                  />
                  <span className="text-[8px] text-stone-400 mt-0.5 block">From smart scale</span>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-[#6B635B] block mb-1 font-display">
                    Waist (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="e.g. 82.0"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#24201D] rounded-lg text-xs font-bold font-mono-num text-[#24201D] focus:outline-none"
                  />
                  <span className="text-[8px] text-stone-400 mt-0.5 block">At navel level</span>
                </div>
              </div>
            )}
          </div>

          {/* Custom Date Picker with Calendar Dropdown */}
          <CustomDatePicker
            selectedDate={date}
            onChangeDate={(newDate) => setDate(newDate)}
            label="Date"
          />

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] flex items-center gap-1 font-display">
              <FileText className="w-3 h-3 text-[#3D6B52]" /> Note
            </label>
            <input
              type="text"
              placeholder="e.g. morning fasting, post-workout..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF8F5] border-[1.5px] border-[#24201D] rounded-xl text-xs font-bold text-[#24201D] placeholder:text-stone-400 shadow-2xs focus:outline-none"
            />

            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {notePresets.map((preset) => {
                const isSelected = note === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickNote(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                      isSelected
                        ? 'bg-[#24201D] text-white border-[#24201D]'
                        : 'bg-white text-[#6B635B] border-[#24201D]/20 hover:border-[#24201D]'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    <span>{preset}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] cursor-pointer active:translate-y-0.5 transition-all font-display uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Scale className="w-4 h-4 stroke-[2.5]" />
              <span>Save Record</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
