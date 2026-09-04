import React, { useState, useEffect } from 'react';

export type ToastType = 'success' | 'info' | 'warn' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function showToast(message: string, type: ToastType = 'info', duration = 3000) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('sumire:toast', {
      detail: {
        id: `${Date.now()}_${Math.random()}`,
        message,
        type,
        duration,
      },
    });
    window.dispatchEvent(event);
  }
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const newToast: ToastItem = e.detail;
      if (!newToast) return;

      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, newToast.duration || 3000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('sumire:toast', handleToast);
    return () => window.removeEventListener('sumire:toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-xs px-4"
    >
      {toasts.map((toast) => {
        let bgStyle = 'bg-white text-[#24201D] border-[#24201D]';
        let icon = '🍵';

        if (toast.type === 'success') {
          bgStyle = 'bg-[#DDE8DE] text-[#2D503C] border-[#24201D]';
          icon = '✨';
        } else if (toast.type === 'warn') {
          bgStyle = 'bg-[#FEF08A] text-[#24201D] border-[#24201D]';
          icon = '⚠️';
        } else if (toast.type === 'error') {
          bgStyle = 'bg-[#F9E2E5] text-[#8C2B39] border-[#24201D]';
          icon = '💥';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 shadow-[3px_3px_0px_#24201D] text-xs font-black transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 ${bgStyle}`}
          >
            <span>{icon}</span>
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
