import React from 'react';
import { X, ShieldCheck, Lock, EyeOff, Server, Trash2 } from 'lucide-react';
import { BrutalButton } from '../common/BrutalButton';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
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
            <div className="w-8 h-8 rounded-xl bg-[#DDE8DE] border border-[#24201D] flex items-center justify-center text-[#2D503C]">
              <ShieldCheck className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-[#24201D]">
                Privacy Policy
              </h2>
              <span className="text-[10px] font-semibold text-[#6B635B]">
                Daily Sumire — Mindful & Transparent
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
            <div className="flex items-center gap-2 font-black text-[#2D503C]">
              <Lock className="w-4 h-4" />
              <span>1. Offline-First Storage</span>
            </div>
            <p className="text-[#6B635B]">
              Your planner data (tasks, habits, focus logs) and health measurements (meals, calories, weight, water) are stored locally in your browser/device database (IndexedDB). You own 100% of your data.
            </p>
          </div>

          <div className="p-3 bg-white border border-[#24201D] rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 font-black text-[#2D503C]">
              <Server className="w-4 h-4" />
              <span>2. Cloud Synchronization</span>
            </div>
            <p className="text-[#6B635B]">
              If you choose to create an account, data is transmitted over encrypted TLS connections to your private cloud storage. Synchronization uses Last-Write-Wins timestamps and cryptographic tokens.
            </p>
          </div>

          <div className="p-3 bg-white border border-[#24201D] rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 font-black text-[#2D503C]">
              <EyeOff className="w-4 h-4" />
              <span>3. Zero Commercial Tracking</span>
            </div>
            <p className="text-[#6B635B]">
              Daily Sumire does not contain third-party ad trackers, surveillance telemetry, or marketing cookies. We will never sell or monetize your personal health or productivity data.
            </p>
          </div>

          <div className="p-3 bg-white border border-[#24201D] rounded-2xl shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 font-black text-[#2D503C]">
              <Trash2 className="w-4 h-4" />
              <span>4. GDPR & Data Sovereignty</span>
            </div>
            <p className="text-[#6B635B]">
              Under GDPR, you have the right to portability (Export JSON in Settings) and the right to be forgotten (Delete All Data button in Settings immediately purges all local and remote records).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t-2 border-[#24201D] flex justify-end">
          <BrutalButton variant="primary" size="sm" onClick={onClose}>
            Understood 👍
          </BrutalButton>
        </div>
      </div>
    </div>
  );
};
