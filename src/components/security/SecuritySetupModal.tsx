import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  Fingerprint,
  Delete,
} from 'lucide-react';
import {
  isPinSet,
  savePin,
  verifyPin,
  removePin,
  isBiometricsSupported,
  isBiometricsEnabled,
  setBiometricsEnabled,
  registerBiometrics,
} from '../../lib/securityService';
import { playClickSound, playSuccessChime } from '../../lib/sound';
import confetti from 'canvas-confetti';

interface SecuritySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSecurityUpdated: () => void;
}

type SetupStep = 'verify_current' | 'enter_new' | 'confirm_new' | 'success';

export const SecuritySetupModal: React.FC<SecuritySetupModalProps> = ({
  isOpen,
  onClose,
  onSecurityUpdated,
}) => {
  const [pinExists, setPinExists] = useState(false);
  const [step, setStep] = useState<SetupStep>('enter_new');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsActive, setBiometricsActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const exists = isPinSet();
      setPinExists(exists);
      setStep(exists ? 'verify_current' : 'enter_new');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setErrorMsg(null);
      setIsError(false);

      isBiometricsSupported().then((supported) => {
        setBiometricsAvailable(supported);
      });
      setBiometricsActive(isBiometricsEnabled());
    }
  }, [isOpen]);

  const handleDigitPress = useCallback(
    async (digit: string) => {
      playClickSound();
      setIsError(false);
      setErrorMsg(null);

      if (step === 'verify_current') {
        if (currentPinInput.length >= 4) return;
        const next = currentPinInput + digit;
        setCurrentPinInput(next);
        if (next.length === 4) {
          const isValid = await verifyPin(next);
          if (isValid) {
            playSuccessChime();
            setStep('enter_new');
          } else {
            setIsError(true);
            setErrorMsg('Incorrect current PIN');
            setTimeout(() => {
              setCurrentPinInput('');
              setIsError(false);
            }, 600);
          }
        }
      } else if (step === 'enter_new') {
        if (newPinInput.length >= 4) return;
        const next = newPinInput + digit;
        setNewPinInput(next);
        if (next.length === 4) {
          playClickSound();
          setStep('confirm_new');
        }
      } else if (step === 'confirm_new') {
        if (confirmPinInput.length >= 4) return;
        const next = confirmPinInput + digit;
        setConfirmPinInput(next);
        if (next.length === 4) {
          if (next === newPinInput) {
            await savePin(next);
            playSuccessChime();
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#3D6B52', '#E09F3E', '#F0BB58', '#24201D'],
            });
            setPinExists(true);
            setStep('success');
            onSecurityUpdated();
          } else {
            setIsError(true);
            setErrorMsg('PINs do not match. Please try again.');
            setTimeout(() => {
              setConfirmPinInput('');
              setIsError(false);
            }, 600);
          }
        }
      }
    },
    [step, currentPinInput, newPinInput, confirmPinInput, onSecurityUpdated]
  );

  const handleDelete = () => {
    playClickSound();
    setIsError(false);
    setErrorMsg(null);
    if (step === 'verify_current') {
      setCurrentPinInput((prev) => prev.slice(0, -1));
    } else if (step === 'enter_new') {
      setNewPinInput((prev) => prev.slice(0, -1));
    } else if (step === 'confirm_new') {
      setConfirmPinInput((prev) => prev.slice(0, -1));
    }
  };

  const handleRemovePin = async () => {
    if (confirm('Are you sure you want to disable PIN and biometrics protection?')) {
      playClickSound();
      removePin();
      setPinExists(false);
      setBiometricsActive(false);
      onSecurityUpdated();
      onClose();
    }
  };

  const handleToggleBiometrics = async () => {
    playClickSound();
    if (!biometricsActive) {
      const ok = await registerBiometrics();
      if (ok) {
        setBiometricsActive(true);
        playSuccessChime();
        onSecurityUpdated();
      }
    } else {
      setBiometricsEnabled(false);
      setBiometricsActive(false);
      onSecurityUpdated();
    }
  };

  const activeDotsLength =
    step === 'verify_current'
      ? currentPinInput.length
      : step === 'enter_new'
      ? newPinInput.length
      : confirmPinInput.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/50 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="bg-[#F4F0EA] border-[2px] border-[#24201D] rounded-3xl w-full max-w-sm overflow-hidden shadow-[4px_4px_0px_#24201D] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-[#24201D]/10 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F0BB58] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Lock className="w-4 h-4 text-[#24201D] stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                {pinExists ? 'Security Settings' : 'Set Master PIN'}
              </h3>
              <p className="text-[10px] text-[#6B635B] font-bold">100% local device security</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#F4F0EA] hover:bg-stone-200 border border-[#24201D] flex items-center justify-center text-[#24201D] cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 flex flex-col items-center justify-between space-y-4">
          {step === 'success' ? (
            /* Success State */
            <div className="py-6 text-center space-y-4 w-full">
              <div className="w-16 h-16 rounded-3xl bg-[#DDE8DE] border-[2px] border-[#24201D] flex items-center justify-center mx-auto shadow-2xs">
                <ShieldCheck className="w-8 h-8 text-[#2D503C] stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-black font-display text-[#24201D]">
                  PIN Configured Successfully!
                </h4>
                <p className="text-xs text-[#6B635B] font-medium mt-1 max-w-xs mx-auto">
                  Your daily tasks, reflections, and habits are now securely locked.
                </p>
              </div>

              {/* Biometrics Option */}
              {biometricsAvailable && (
                <div className="p-3.5 bg-white border-[1.75px] border-[#24201D] rounded-2xl flex items-center justify-between shadow-2xs text-left mt-3">
                  <div className="flex items-center gap-2.5">
                    <Fingerprint className="w-5 h-5 text-[#3D6B52] stroke-[2.25]" />
                    <div>
                      <span className="text-xs font-black text-[#24201D] block">
                        Biometric Unlock
                      </span>
                      <span className="text-[10px] text-[#6B635B] font-bold">
                        Face ID / Fingerprint
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleBiometrics}
                    className={`px-3 py-1 rounded-full text-xs font-black border-[1.5px] border-[#24201D] transition-all cursor-pointer ${
                      biometricsActive
                        ? 'bg-[#3D6B52] text-white shadow-2xs'
                        : 'bg-stone-100 text-[#6B635B]'
                    }`}
                  >
                    {biometricsActive ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="w-full py-2.5 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-black shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 cursor-pointer mt-2"
              >
                Done
              </button>
            </div>
          ) : (
            /* PIN Input Step */
            <>
              <div className="text-center space-y-1.5">
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                  {step === 'verify_current'
                    ? 'Enter Current PIN'
                    : step === 'enter_new'
                    ? 'Create 4-Digit PIN'
                    : 'Confirm New PIN'}
                </h4>
                <p className="text-[11px] font-semibold text-[#6B635B]">
                  {errorMsg ||
                    (step === 'verify_current'
                      ? 'Confirm your identity to proceed'
                      : step === 'enter_new'
                      ? 'Choose a memorable 4-digit code'
                      : 'Re-enter your PIN to verify')}
                </p>
              </div>

              {/* 4 Dots Indicator */}
              <div
                className={`flex items-center justify-center gap-3.5 py-1 ${
                  isError ? 'animate-shake' : ''
                }`}
              >
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = activeDotsLength > index;
                  return (
                    <div
                      key={index}
                      className={`w-3.5 h-3.5 rounded-full border-[1.75px] border-[#24201D] transition-all duration-150 ${
                        isError
                          ? 'bg-rose-500 border-rose-900 scale-110 shadow-2xs'
                          : isFilled
                          ? 'bg-[#3D6B52] scale-125 shadow-2xs'
                          : 'bg-white'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Numpad */}
              <div className="w-full max-w-[240px] grid grid-cols-3 gap-2 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitPress(digit)}
                    className="h-11 rounded-xl bg-white hover:bg-[#FAF8F5] active:bg-[#F0BB58] border-[1.5px] border-[#24201D] text-base font-black font-display text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer flex items-center justify-center transition-all"
                  >
                    {digit}
                  </button>
                ))}

                <div className="h-11" />

                <button
                  type="button"
                  onClick={() => handleDigitPress('0')}
                  className="h-11 rounded-xl bg-white hover:bg-[#FAF8F5] active:bg-[#F0BB58] border-[1.5px] border-[#24201D] text-base font-black font-display text-[#24201D] shadow-2xs active:translate-y-0.5 cursor-pointer flex items-center justify-center transition-all"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-11 rounded-xl bg-white hover:bg-rose-50 active:bg-rose-100 border-[1.5px] border-[#24201D] text-[#6B635B] hover:text-rose-700 shadow-2xs active:translate-y-0.5 cursor-pointer flex items-center justify-center transition-all"
                  title="Delete"
                >
                  <Delete className="w-4 h-4 stroke-[2.25]" />
                </button>
              </div>

              {/* Option to remove PIN if already set and on step 1 */}
              {pinExists && step === 'verify_current' && (
                <button
                  type="button"
                  onClick={handleRemovePin}
                  className="text-[11px] font-bold text-rose-700 hover:underline pt-1 cursor-pointer"
                >
                  Disable Security & Remove PIN
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
