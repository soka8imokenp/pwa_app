import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { BrutalButton } from './BrutalButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1E1B4B]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={`relative z-10 w-full ${maxWidth} bg-[#FAF7F2] dark:bg-[#161424] border-[3px] border-[#1E1B4B] dark:border-purple-300 rounded-3xl shadow-[8px_8px_0px_#1E1B4B] dark:shadow-[8px_8px_0px_#A855F7] p-6 max-h-[90vh] overflow-y-auto transform animate-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b-2 border-[#1E1B4B]/15 dark:border-purple-300/20">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2.5 bg-[#E9D5FF] dark:bg-[#381E68] border-2 border-[#1E1B4B] dark:border-purple-300 rounded-xl shadow-[2px_2px_0px_#1E1B4B] dark:shadow-[2px_2px_0px_#A855F7]">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-purple-50 tracking-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs font-semibold text-slate-600 dark:text-purple-200 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <BrutalButton
            variant="secondary"
            size="icon"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9"
          >
            <X className="w-4 h-4 text-slate-900 dark:text-white" />
          </BrutalButton>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
};
