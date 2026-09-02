import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Fingerprint, Delete, Shield } from 'lucide-react';
import {
  verifyPin,
  isBiometricsEnabled,
  authenticateWithBiometrics,
  setAppLocked,
} from '../../lib/securityService';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import { getAvatarById } from '../../data/avatars';

interface SecurityLockScreenProps {
  onUnlock: () => void;
  userName?: string;
}

const KEYPAD_DIGITS = [
  { num: '1', letters: '' },
  { num: '2', letters: 'ABC' },
  { num: '3', letters: 'DEF' },
  { num: '4', letters: 'GHI' },
  { num: '5', letters: 'JKL' },
  { num: '6', letters: 'MNO' },
  { num: '7', letters: 'PQRS' },
  { num: '8', letters: 'TUV' },
  { num: '9', letters: 'WXYZ' },
];

export const SecurityLockScreen: React.FC<SecurityLockScreenProps> = ({ onUnlock, userName }) => {
  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);
  const [avatarId, setAvatarId] = useState<string>('sumire-scout');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAvatar = localStorage.getItem('kairo_selected_avatar');
      if (savedAvatar) setAvatarId(savedAvatar);
    }
  }, []);

  const activeAvatar = getAvatarById(avatarId);

  // Auto-attempt biometrics on mount if enabled
  useEffect(() => {
    if (isBiometricsEnabled()) {
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleBiometricUnlock = async () => {
    if (isAuthenticatingBio) return;
    playClickSound();
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
          setErrorMessage('Incorrect PIN code');
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
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
    <div className="fixed inset-0 z-[999] bg-[#F4F0EA] select-none flex flex-col items-center justify-between pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-[calc(env(safe-area-inset-bottom,0px)+44px)] px-6 sm:px-8 font-body overflow-y-auto animate-in fade-in duration-300">
      
      {/* Subtle Japanese Washi Aura */}
      <div className="absolute top-1/3 -left-32 w-80 h-80 bg-[#3D6B52]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#E09F3E]/8 rounded-full blur-3xl pointer-events-none" />

      {/* Top Security Status Header */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border-[1.5px] border-[#24201D] rounded-full shadow-[1.5px_1.5px_0px_#24201D]">
          <Shield className="w-3.5 h-3.5 text-[#3D6B52] stroke-[2.5]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#24201D] font-display">
            Secure Vault
          </span>
        </div>
      </div>

      {/* Center Hero: Avatar Medallion, PIN Dots & Biometric Button */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xs w-full space-y-3.5 my-auto py-2">
        
        {/* Avatar / Lock Medallion */}
        <div className="relative">
          <div
            className="w-16 h-16 rounded-[1.5rem] border-[2px] border-[#24201D] flex items-center justify-center shadow-[3px_3px_0px_#24201D] p-1.5 animate-neo-float relative"
            style={{ backgroundColor: activeAvatar.bg }}
          >
            {activeAvatar.renderSvg('w-full h-full')}
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-[#3D6B52] text-white border-[1.5px] border-[#24201D] rounded-lg shadow-[1px_1px_0px_#24201D]">
            <Lock className="w-3 h-3 stroke-[2.5]" />
          </div>
        </div>

        {/* User Greeting & Error Status */}
        <div className="space-y-0.5">
          <h2 className="text-lg font-black font-display text-[#24201D] tracking-tight">
            {userName ? `Welcome back, ${userName}` : 'Unlock Vault'}
          </h2>
          <p
            className={`text-xs font-bold transition-colors ${
              errorMessage ? 'text-rose-600 animate-shake' : 'text-[#6B635B]'
            }`}
          >
            {errorMessage || 'Enter 4-digit PIN or Touch ID'}
          </p>
        </div>

        {/* 4 Tactile PIN Dots */}
        <div
          className={`flex items-center justify-center gap-4.5 py-2 ${
            isError ? 'animate-shake' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4.5 h-4.5 rounded-full border-[1.75px] border-[#24201D] transition-all duration-200 ${
                  isError
                    ? 'bg-rose-500 border-rose-900 scale-110 shadow-[1px_1px_0px_#9F1239]'
                    : isFilled
                    ? 'bg-[#3D6B52] scale-125 shadow-[1.5px_1.5px_0px_#24201D]'
                    : 'bg-white shadow-[1px_1px_0px_#24201D]'
                }`}
              />
            );
          })}
        </div>

        {/* Dedicated Quick Biometric Access Banner */}
        <button
          type="button"
          onClick={handleBiometricUnlock}
          disabled={isAuthenticatingBio}
          className="w-full py-2.5 px-4 bg-[#DDE8DE] hover:bg-[#C9DCCB] active:bg-[#3D6B52] active:text-white text-[#2D503C] border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 group mt-1"
        >
          <Fingerprint className="w-4 h-4 stroke-[2.5] group-hover:scale-110 transition-transform text-[#3D6B52] group-active:text-white" />
          <span className="text-xs font-black font-display uppercase tracking-wider">
            {isAuthenticatingBio ? 'Scanning...' : 'Unlock with Fingerprint'}
          </span>
        </button>
      </div>

      {/* Luxury Tactile Keypad Grid with Generous Bottom Buffer */}
      <div className="relative z-10 w-full max-w-[290px] mb-2 space-y-2.5">
        <div className="grid grid-cols-3 gap-2.5">
          {KEYPAD_DIGITS.map(({ num, letters }) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitPress(num)}
              className="h-13 sm:h-14 rounded-2xl bg-white hover:bg-[#FAF8F5] active:bg-[#F0BB58] border-[1.75px] border-[#24201D] shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 active:shadow-none cursor-pointer flex flex-col items-center justify-center transition-all group"
            >
              <span className="text-xl font-black font-display text-[#24201D] leading-none group-active:scale-95 transition-transform">
                {num}
              </span>
              {letters && (
                <span className="text-[8px] font-extrabold tracking-widest text-[#6B635B] mt-0.5 font-display">
                  {letters}
                </span>
              )}
            </button>
          ))}

          {/* Row 4: Biometric Scanner Button (Always Present), '0', Delete Button */}
          <button
            type="button"
            onClick={handleBiometricUnlock}
            disabled={isAuthenticatingBio}
            className="h-13 sm:h-14 rounded-2xl bg-[#DDE8DE] hover:bg-[#C9DCCB] active:bg-[#3D6B52] active:text-white border-[1.75px] border-[#24201D] text-[#2D503C] shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 active:shadow-none cursor-pointer flex flex-col items-center justify-center transition-all group"
            title="Biometric Fingerprint / Touch ID"
          >
            <Fingerprint className="w-5 h-5 stroke-[2.25] group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-extrabold tracking-wider uppercase mt-0.5">
              Touch ID
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="h-13 sm:h-14 rounded-2xl bg-white hover:bg-[#FAF8F5] active:bg-[#F0BB58] border-[1.75px] border-[#24201D] shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 active:shadow-none cursor-pointer flex flex-col items-center justify-center transition-all"
          >
            <span className="text-xl font-black font-display text-[#24201D] leading-none">
              0
            </span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-13 sm:h-14 rounded-2xl bg-white hover:bg-rose-50 active:bg-rose-100 border-[1.75px] border-[#24201D] text-[#6B635B] hover:text-rose-700 shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 active:shadow-none cursor-pointer flex items-center justify-center transition-all"
            title="Delete digit"
          >
            <Delete className="w-5 h-5 stroke-[2.25]" />
          </button>
        </div>
      </div>
    </div>
  );
};
