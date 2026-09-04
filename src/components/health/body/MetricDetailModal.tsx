import React from 'react';
import { X } from 'lucide-react';
import { playClickSound } from '../../../lib/sound';

export interface MetricDetailModalInfo {
  title: string;
  value: string;
  category: string;
  description: string;
  formula: string;
  clinicalTip: string;
}

interface MetricDetailModalProps {
  info: MetricDetailModalInfo | null;
  onClose: () => void;
}

export const MetricDetailModal: React.FC<MetricDetailModalProps> = ({ info, onClose }) => {
  if (!info) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#24201D]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white border-[1.75px] border-[#24201D] rounded-3xl shadow-[4px_4px_0px_#24201D] p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-[#24201D]/15 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display">
              Clinical Science & Biometrics
            </span>
            <h3 className="text-base font-black font-display text-[#24201D] mt-0.5">
              {info.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1 rounded-xl bg-[#FAF8F5] hover:bg-stone-200 border border-[#24201D] text-[#24201D] cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-3 bg-[#FAF8F5] border border-[#24201D]/20 rounded-2xl flex items-baseline justify-between">
          <span className="text-xs font-bold text-[#6B635B]">Current Value:</span>
          <div className="text-right">
            <span className="text-xl font-black font-mono-num text-[#24201D] block">
              {info.value}
            </span>
            <span className="text-[10px] font-bold text-[#3D6B52] block">
              {info.category}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs text-[#24201D] leading-relaxed">
          <p>{info.description}</p>
        </div>

        <div className="p-3 bg-[#DDE8DE]/50 border border-[#3D6B52]/30 rounded-2xl space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#2D503C] block font-display">
            Underlying Formula / Protocol:
          </span>
          <span className="text-xs font-mono font-bold text-[#24201D] block">
            {info.formula}
          </span>
        </div>

        <div className="p-3 bg-[#FBECCF] border border-[#E09F3E]/40 rounded-2xl space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#854D0E] block font-display">
            Clinical Recommendation:
          </span>
          <p className="text-xs font-bold text-[#713F12] leading-relaxed">
            {info.clinicalTip}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full py-2.5 bg-[#3D6B52] hover:bg-[#345B45] text-white border border-[#24201D] rounded-xl text-xs font-black shadow-2xs uppercase tracking-wider font-display cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
