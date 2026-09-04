import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { BrutalButton } from './BrutalButton';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
    >
      <div className="bg-[#F4F0EA] border-3 border-[#24201D] rounded-3xl w-full max-w-sm flex flex-col shadow-[6px_6px_0px_#24201D] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b-2 border-[#24201D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl border border-[#24201D] flex items-center justify-center ${
                isDanger ? 'bg-[#F9E2E5] text-[#8C2B39]' : 'bg-[#FEF08A] text-[#24201D]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 stroke-[2.25]" />
            </div>
            <h3 className="text-sm font-black text-[#24201D] uppercase tracking-wider">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl border border-[#24201D] bg-[#F4F0EA] hover:bg-stone-200 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-[#24201D]" />
          </button>
        </div>

        {/* Message */}
        <div className="p-5 text-xs font-semibold text-[#24201D] leading-relaxed">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t-2 border-[#24201D] flex gap-2.5 justify-end">
          <BrutalButton variant="secondary" size="sm" onClick={onClose}>
            {cancelText}
          </BrutalButton>
          <BrutalButton
            variant={isDanger ? 'danger' : 'primary'}
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </BrutalButton>
        </div>
      </div>
    </div>
  );
};
