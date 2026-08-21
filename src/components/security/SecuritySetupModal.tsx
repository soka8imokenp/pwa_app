import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Lock,
  Unlock,
  ShieldCheck,
  Fingerprint,
  CheckCircle2,
  Delete,
  AlertCircle,
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
            setErrorMsg('Неверный текущий PIN');
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
              colors: ['#BEF264', '#FFE873', '#E8DCFF', '#18181B'],
            });
            setPinExists(true);
            setStep('success');
            onSecurityUpdated();
          } else {
            setIsError(true);
            setErrorMsg('PIN-коды не совпадают. Попробуйте снова.');
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
    if (confirm('Вы действительно хотите отключить PIN-код и биометрию?')) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18181B]/50 backdrop-blur-sm animate-in fade-in duration-150 font-body select-none">
      <div className="bg-[#FAF7F2] border-[2px] border-[#18181B] rounded-3xl w-full max-w-sm overflow-hidden shadow-[4px_4px_0px_#18181B] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#18181B]/10 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FFE873] border border-[#18181B] flex items-center justify-center shadow-2xs">
              <Lock className="w-4 h-4 text-[#18181B] stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                {pinExists ? 'Управление защитой' : 'Установка PIN-кода'}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold">100% локальная защита устройства</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-slate-100 border border-[#18181B] flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs active:scale-95 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 flex flex-col items-center justify-between space-y-4">
          {step === 'success' ? (
            /* Success State */
            <div className="py-6 text-center space-y-4 w-full">
              <div className="w-16 h-16 rounded-3xl bg-[#D1FBE4] border-[2px] border-[#18181B] flex items-center justify-center mx-auto shadow-2xs">
                <ShieldCheck className="w-8 h-8 text-emerald-800 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-black font-display text-[#18181B]">
                  PIN-код успешно установлен!
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-xs mx-auto">
                  Ваши задачи, рефлексии и дневник теперь защищены.
                </p>
              </div>

              {/* Biometrics Option */}
              {biometricsAvailable && (
                <div className="p-3.5 bg-white border-[1.75px] border-[#18181B] rounded-2xl flex items-center justify-between shadow-2xs text-left mt-3">
                  <div className="flex items-center gap-2.5">
                    <Fingerprint className="w-5 h-5 text-purple-700 stroke-[2.25]" />
                    <div>
                      <span className="text-xs font-black text-[#18181B] block">
                        Вход по отпечатку пальца
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        Face ID / Fingerprint
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleBiometrics}
                    className={`px-3 py-1 rounded-full text-xs font-black border-[1.5px] border-[#18181B] transition-all cursor-pointer ${
                      biometricsActive
                        ? 'bg-[#BEF264] text-[#18181B] shadow-2xs'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {biometricsActive ? 'Включено' : 'Выключено'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="w-full py-2.5 bg-[#FFE873] hover:bg-[#FED7AA] border-[1.75px] border-[#18181B] rounded-xl text-xs font-black text-[#18181B] shadow-[2px_2px_0px_#18181B] active:translate-y-0.5 cursor-pointer mt-2"
              >
                Готово
              </button>
            </div>
          ) : (
            /* PIN Input Step */
            <>
              <div className="text-center space-y-1.5">
                <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#18181B]">
                  {step === 'verify_current'
                    ? 'Введите текущий PIN'
                    : step === 'enter_new'
                    ? 'Придумайте 4-значный PIN'
                    : 'Повторите новый PIN'}
                </h4>
                <p className="text-[11px] font-semibold text-slate-500">
                  {errorMsg ||
                    (step === 'verify_current'
                      ? 'Для подтверждения вашей личности'
                      : step === 'enter_new'
                      ? 'Код для разблокировки приложения'
                      : 'Для проверки правильности ввода')}
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
                      className={`w-3.5 h-3.5 rounded-full border-[1.75px] border-[#18181B] transition-all duration-150 ${
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

              {/* Numpad */}
              <div className="w-full max-w-[240px] grid grid-cols-3 gap-2 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitPress(digit)}
                    className="h-11 rounded-xl bg-white hover:bg-[#FAF7F2] active:bg-[#FFE873] border-[1.5px] border-[#18181B] text-base font-black font-display text-[#18181B] shadow-2xs active:translate-y-0.5 cursor-pointer flex items-center justify-center transition-all"
                  >
                    {digit}
                  </button>
                ))}

                <div className="h-11" />

                <button
                  type="button"
                  onClick={() => handleDigitPress('0')}
                  className="h-11 rounded-xl bg-white hover:bg-[#FAF7F2] active:bg-[#FFE873] border-[1.5px] border-[#18181B] text-base font-black font-display text-[#18181B] shadow-2xs active:translate-y-0.5 cursor-pointer flex items-center justify-center transition-all"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-11 rounded-xl bg-white hover:bg-rose-50 active:bg-rose-100 border-[1.5px] border-[#18181B] text-slate-700 hover:text-rose-700 shadow-2xs active:translate-y-0.5 cursor-pointer flex items-center justify-center transition-all"
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
                  Отключить защиту и удалить PIN
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
