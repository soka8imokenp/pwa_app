import React from 'react';
import { X, FileText, AlertTriangle, Sparkles, Scale } from 'lucide-react';
import { BrutalButton } from '../common/BrutalButton';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-[#F4F0EA] border-3 border-[#24201D] rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-[6px_6px_0px_#24201D] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b-2 border-[#24201D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEF08A] border border-[#24201D] flex items-center justify-center text-[#24201D]">
              <FileText className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#24201D]">
                Terms of Service
              </h2>
              <span className="text-[10px] font-semibold text-[#6B635B]">
                Daily Sumire — Service Guidelines & Disclaimers
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-[#24201D] bg-[#F4F0EA] hover:bg-stone-200 transition-all cursor-pointer shadow-2xs"
          >
            <X className="w-4 h-4 text-[#24201D]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#24201D] leading-relaxed">
          <div className="p-3 bg-white border border-[#24201D] rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 font-black text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              <span>1. Medical & Health Disclaimer</span>
            </div>
            <p className="text-[#6B635B]">
              Daily Sumire is designed exclusively for personal organizational and informational wellness tracking. Nutritional calculations, calorie budgets, and AI recommendations do NOT constitute clinical medical advice, dietetic diagnosis, or medical prescription. Always consult a qualified physician or licensed healthcare provider before undertaking significant dietary or exercise changes.
            </p>
          </div>

          <div className="p-3 bg-white border border-[#24201D] rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 font-black text-[#2D503C]">
              <Sparkles className="w-4 h-4" />
              <span>2. Artificial Intelligence Estimates</span>
            </div>
            <p className="text-[#6B635B]">
              Nutrition vision and coach interactions use large language models (Google Gemini). While our heuristics and prompt constraints strive for high accuracy, AI estimates are approximations and should be treated as guidance rather than laboratory-exact measurements.
            </p>
          </div>

          <div className="p-3 bg-white border border-[#24201D] rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 font-black text-[#2D503C]">
              <Scale className="w-4 h-4" />
              <span>3. Personal Data Responsibility</span>
            </div>
            <p className="text-[#6B635B]">
              Because Daily Sumire emphasizes offline storage, users are encouraged to utilize the "Export JSON" feature periodically to maintain independent backups of their productivity history.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t-2 border-[#24201D] flex justify-end">
          <BrutalButton variant="primary" size="sm" onClick={onClose}>
            I Agree 👍
          </BrutalButton>
        </div>
      </div>
    </div>
  );
};
