import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Fingerprint, Delete, ShieldCheck } from 'lucide-react';
import {
  verifyPin,
  isBiometricsEnabled,
  authenticateWithBiometrics,
  setAppLocked,
} from '../../lib/securityService';
import { playClickSound, playSuccessChime } from '../../lib/sound';

interface SecurityLockScreenProps {
  onUnlock: () => void;
  userName?: string;
}

export const SecurityLockScreen: React.FC<SecurityLockScreenProps> = ({ onUnlock, userName }) => {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);

  // Check if biometrics is enabled
  useEffect(() => {
    const bioEnabled = isBiometricsEnabled();
    setBioAvailable(bioEnabled);

    // Auto-trigger biometric prompt on first render if enabled
    if (bioEnabled) {
      handleBiometricUnlock();
    }
  }, []);

  const handleBiometricUnlock = async () => {
    if (isAuthenticatingBio) return;
    setIsAuthenticatingBio(true);
    try {
      const ok = await authenticateWithBiometrics();
      if (ok) {
        playSuccessChime();
        setAppLocked(false);
        onUnlock();
      }
    } catch (e) {
      console.warn('Biometric auth failed', e);
    } finally {
      setIsAuthenticatingBio(false);
    }
  };

  const handleDigitPress = useCallback(
    async (digit: string) => {
      if (pin.length >= 4) return;
      playClickSound();
      setIsError(false);
      setErrorMessage(null);

      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 4) {
        // Validate PIN
        const isValid = await verifyPin(nextPin);
        if (isValid) {
          playSuccessChime();
          setAppLocked(false);
          onUnlock();
        } else {
          setIsError(true);
          setErrorMessage('Неверный PIN-код');
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          setTimeout(() => {
            setPin('');
            setIsError(false);
          }, 600);
        }
      }
    },
    [pin, onUnlock]
  );

  const handleDelete = () => {
    if (pin.length === 0) return;
    playClickSound();
    setPin((prev) => prev.slice(0, -1));
    setIsError(false);
    setErrorMessage(null);
  };

  // Keyboard listener for desktop/hardware keyboards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigitPress, pin]);

  return (
    <div className="fixed inset-0 z-[999] bg-[#FAF7F2] select-none flex flex-col items-center justify-between p-6 sm:p-8 font-body overflow-hidden animate-in fade-in duration-200">
      {/* Top Brand / Header */}
      <div className="w-full flex items-center justify-center pt-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-white border-[1.5px] border-[#18181B] rounded-full shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
          <span className="text-[11px] font-black uppercase tracking-wider text-[#18181B]">
            Daily Sumire Security
          </span>
        </div>
      </div>

      {/* Center Lock Capsule & PIN Dots */}
      <div className="flex flex-col items-center text-center max-w-xs w-full space-y-4">
        {/* Animated Lock Icon Badge */}
        <div className="w-16 h-16 rounded-3xl bg-[#FFE873] border-[2px] border-[#18181B] flex items-center justify-center shadow-[3px_3px_0px_#18181B] animate-neo-float">
          <Lock className="w-8 h-8 text-[#18181B] stroke-[2.5]" />
        </div>

        <div>
          <h2 className="text-lg font-black font-display text-[#18181B]">
            {userName ? `Привет, ${userName}` : 'Приложение заблокировано'}
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            {errorMessage || 'Введите 4-значный PIN-код'}
          </p>
        </div>

        {/* 4 PIN Dots */}
        <div
          className={`flex items-center justify-center gap-4 py-2 ${
            isError ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-[2px] border-[#18181B] transition-all duration-150 ${
                  isError
                    ? 'bg-rose-500 border-rose-900 scale-110 shadow-2xs'
                    : isFilled
                    ? 'bg-[#BEF264] scale-125 shadow-2xs'
                    : 'bg-white'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Numeric Keypad Grid */}
      <div className="w-full max-w-[280px] pb-6 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="h-14 rounded-2xl bg-white hover:bg-[#FAF7F2] active:bg-[#FFE873] border-[1.75px] border-[#18181B] text-lg font-black font-display text-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center transition-all"
            >
              {digit}
            </button>
          ))}

          {/* Row 4: Biometric button, '0', Delete button */}
          {bioAvailable ? (
            <button
              type="button"
              onClick={handleBiometricUnlock}
              className="h-14 rounded-2xl bg-[#E8DCFF] hover:bg-[#DDD0FC] active:bg-[#C4B5FD] border-[1.75px] border-[#18181B] text-purple-950 shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center transition-all"
              title="Отпечаток пальца / Face Unlock"
            >
              <Fingerprint className="w-6 h-6 stroke-[2.25]" />
            </button>
          ) : (
            <div className="h-14" />
          )}

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="h-14 rounded-2xl bg-white hover:bg-[#FAF7F2] active:bg-[#FFE873] border-[1.75px] border-[#18181B] text-lg font-black font-display text-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center transition-all"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-white hover:bg-rose-50 active:bg-rose-100 border-[1.75px] border-[#18181B] text-slate-700 hover:text-rose-700 shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center transition-all"
            title="Стереть"
          >
            <Delete className="w-5 h-5 stroke-[2.25]" />
          </button>
        </div>
      </div>
    </div>
  );
};
