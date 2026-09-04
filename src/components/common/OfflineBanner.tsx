import React, { useState, useEffect } from 'react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-[#24201D] text-[#DDE8DE] text-xs font-bold py-1.5 px-3 border-b-2 border-[#3D6B52] flex items-center justify-center gap-2 shadow-sm transition-all duration-300 z-50 sticky top-0"
    >
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
      <span>Offline Mode — All changes saved locally & will sync when reconnected</span>
    </div>
  );
};
