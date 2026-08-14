import React, { useState, useEffect } from 'react';
import { Download, WifiOff, Smartphone, X } from 'lucide-react';
import { BrutalButton } from '../common/BrutalButton';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isDismissed && isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-white dark:bg-[#18152B] border-[2.5px] border-[#1E1B4B] dark:border-purple-300 rounded-2xl p-3.5 shadow-[5px_5px_0px_#1E1B4B] dark:shadow-[5px_5px_0px_#A855F7] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E9D5FF] dark:bg-[#381E68] border-2 border-[#1E1B4B] flex items-center justify-center shrink-0">
            {!isOnline ? (
              <WifiOff className="w-5 h-5 text-rose-600" />
            ) : (
              <Smartphone className="w-5 h-5 text-purple-900 dark:text-purple-100" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 dark:text-purple-50">
                {!isOnline ? 'Offline Mode Active' : 'Install KAIRO PWA'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
            </div>
            <p className="text-[11px] font-bold text-slate-600 dark:text-purple-300">
              {!isOnline
                ? 'All features & changes save locally via IndexedDB'
                : 'Add to home screen for 100% offline standalone app'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {deferredPrompt && isOnline && (
            <BrutalButton
              variant="lime"
              size="sm"
              onClick={handleInstallClick}
              className="text-xs py-1 px-2.5 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </BrutalButton>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-purple-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
