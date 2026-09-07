import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bluetooth,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playClickSound, playSuccessChime, playTaskCheckSound } from '../../lib/sound';
import type { HealthProfile } from '../../types/health';
import {
  parseXiaomiScaleAdvertisement,
  isWebBluetoothAvailable,
  XIAOMI_SERVICE_UUID,
  XIAOMI_WEIGHT_SERVICE_UUID,
  type XiaomiScaleReading,
  type XiaomiBiometricMetrics,
} from '../../lib/xiaomiScale';

interface XiaomiScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: HealthProfile;
  onSaveReading: (
    weight: number,
    bodyFat?: number,
    metrics?: XiaomiBiometricMetrics
  ) => Promise<void>;
}

type ScanStatus = 'idle' | 'scanning' | 'stabilizing' | 'analyzing' | 'completed' | 'error';

export const XiaomiScaleModal: React.FC<XiaomiScaleModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveReading,
}) => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [liveWeight, setLiveWeight] = useState<number>(0);
  const [impedanceProgress, setImpedanceProgress] = useState<number>(0);
  const [reading, setReading] = useState<XiaomiScaleReading | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const scanAbortController = useRef<AbortController | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMessage('');
      setLiveWeight(0);
      setReading(null);
      setImpedanceProgress(0);
    } else {
      stopScanning();
    }
  }, [isOpen]);

  const stopScanning = () => {
    if (typeof window !== 'undefined' && (window as any).AndroidBluetoothScale) {
      try {
        (window as any).AndroidBluetoothScale.stopScan();
      } catch (e) {}
      delete (window as any).__onNativeScaleData;
      delete (window as any).__onNativeScaleError;
      delete (window as any).__onNativeScaleStatus;
    }
    if (scanAbortController.current) {
      scanAbortController.current.abort();
      scanAbortController.current = null;
    }
  };

  /**
   * Start Bluetooth Scan & scale measurement
   */
  const handleStartScan = async () => {
    playClickSound();
    setErrorMessage('');
    setLiveWeight(0);
    setStatus('scanning');

    const isNativeBt =
      typeof window !== 'undefined' &&
      Boolean((window as any).AndroidBluetoothScale?.isAvailable?.());
    const isWebBt = isWebBluetoothAvailable();

    if (!isNativeBt && !isWebBt) {
      setErrorMessage(
        'Bluetooth is not supported in this browser view. Please open the Daily Sumire Android app or Google Chrome with Bluetooth enabled.'
      );
      setStatus('error');
      return;
    }

    // 1. Android Native Bluetooth Low Energy Bridge
    if (isNativeBt) {
      (window as any).__onNativeScaleData = (base64Payload: string) => {
        try {
          const binaryStr = atob(base64Payload);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const view = new DataView(bytes.buffer);
          const parsed = parseXiaomiScaleAdvertisement(view, {
            height: profile.height,
            age: profile.age,
            gender: profile.gender,
          });

          if (parsed && parsed.weight >= 10.0) {
            setLiveWeight(parsed.weight);
            if (!parsed.isStabilized) {
              setStatus('stabilizing');
            } else if (parsed.isStabilized && !parsed.isImpedanceComplete) {
              setStatus('analyzing');
              setImpedanceProgress(65);
            } else if (parsed.isStabilized && parsed.isImpedanceComplete) {
              try {
                (window as any).AndroidBluetoothScale?.stopScan?.();
              } catch (e) {}
              completeMeasurement(parsed);
            }
          }
        } catch (err) {
          console.error('Failed to parse native scale packet:', err);
        }
      };

      (window as any).__onNativeScaleError = (msg: string) => {
        setErrorMessage(msg);
        setStatus('error');
      };

      (window as any).__onNativeScaleStatus = (statusStr: string) => {
        if (statusStr === 'scanning') {
          setStatus('scanning');
        }
      };

      try {
        (window as any).AndroidBluetoothScale.startScan();
      } catch (nativeErr: any) {
        setErrorMessage(nativeErr?.message || 'Could not start Bluetooth scan.');
        setStatus('error');
      }
      return;
    }

    // 2. Standard Web Bluetooth API (Google Chrome fallback)
    try {
      const navBt = (navigator as any).bluetooth;

      // Request device with Smart Scale filters
      const device = await navBt.requestDevice({
        filters: [
          { namePrefix: 'MIBFS' },
          { namePrefix: 'MI_SCALE' },
          { namePrefix: 'MIBody' },
          { namePrefix: 'MI Scale' },
          { services: ['body_composition', XIAOMI_SERVICE_UUID, 0x181b] },
          { services: ['weight_scale', XIAOMI_WEIGHT_SERVICE_UUID, 0x181d] },
        ],
        optionalServices: [
          'body_composition',
          'weight_scale',
          XIAOMI_SERVICE_UUID,
          XIAOMI_WEIGHT_SERVICE_UUID,
        ],
      });

      if (!device) {
        setStatus('idle');
        return;
      }

      setStatus('stabilizing');
      const server = await device.gatt?.connect();
      if (server) {
        try {
          const service = await server.getPrimaryService(XIAOMI_SERVICE_UUID);
          const characteristic = await service.getCharacteristic(
            '00002a9c-0000-1000-8000-00805f9b34fb' // Body Composition Measurement
          );

          await characteristic.startNotifications();
          characteristic.addEventListener(
            'characteristicvaluechanged',
            (event: any) => {
              const value = event.target.value as DataView;
              const parsed = parseXiaomiScaleAdvertisement(value, {
                height: profile.height,
                age: profile.age,
                gender: profile.gender,
              });

              if (parsed && parsed.weight >= 10.0) {
                setLiveWeight(parsed.weight);
                if (!parsed.isStabilized) {
                  setStatus('stabilizing');
                } else if (parsed.isStabilized && !parsed.isImpedanceComplete) {
                  setStatus('analyzing');
                  setImpedanceProgress(65);
                } else if (parsed.isStabilized && parsed.isImpedanceComplete) {
                  completeMeasurement(parsed);
                }
              }
            }
          );
        } catch (subErr) {
          console.warn('GATT notification error:', subErr);
          setErrorMessage('Could not read scale sensors. Please step on the scale and try again.');
          setStatus('error');
        }
      }
    } catch (err: any) {
      console.warn('Bluetooth connection error:', err);
      if (err?.name === 'NotFoundError') {
        setStatus('idle');
      } else {
        setErrorMessage(
          err?.message || 'Bluetooth connection was cancelled or timed out.'
        );
        setStatus('error');
      }
    }
  };

  const completeMeasurement = (res: XiaomiScaleReading) => {
    setReading(res);
    setLiveWeight(res.weight);
    setStatus('completed');
    playSuccessChime();

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#3D6B52', '#60A5FA', '#F59E0B', '#10B981'],
    });
  };

  const handleSave = async () => {
    if (!reading) return;
    setIsSaving(true);
    playTaskCheckSound();

    try {
      await onSaveReading(reading.weight, reading.metrics?.bodyFatPercentage, reading.metrics);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#24201D]/60 backdrop-blur-xs animate-fadeIn select-none font-body">
      <div className="relative w-full max-w-md bg-[#FAF8F5] border-[2px] border-[#24201D] rounded-3xl shadow-[4px_4px_0px_#24201D] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Clean, without redundant tags */}
        <div className="p-4 bg-white border-b-[1.75px] border-[#24201D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] border border-[#24201D] flex items-center justify-center shadow-2xs">
              <Bluetooth className="w-4 h-4 text-[#4F46E5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#4F46E5] font-display block leading-none">
                Smart Scale
              </span>
              <h3 className="text-sm font-black font-display text-[#24201D] leading-tight mt-0.5">
                Bio-Impedance Sync
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-stone-100 border border-[#24201D] text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status Display Area */}
          {status === 'idle' && (
            <div className="space-y-4 text-center py-2">
              {/* Scale visual representation with 4 electrodes */}
              <div className="relative w-40 h-40 mx-auto bg-white border-[2px] border-[#24201D] rounded-3xl shadow-[3px_3px_0px_#24201D] flex items-center justify-center p-3">
                {/* 4 metal electrode pads */}
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full border-[1.5px] border-[#24201D] bg-[#E8E4DD]" />
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full border-[1.5px] border-[#24201D] bg-[#E8E4DD]" />
                <div className="absolute bottom-3 left-3 w-8 h-8 rounded-full border-[1.5px] border-[#24201D] bg-[#E8E4DD]" />
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full border-[1.5px] border-[#24201D] bg-[#E8E4DD]" />

                {/* Central LED Screen Display */}
                <div className="w-24 h-12 rounded-xl bg-[#24201D] flex flex-col items-center justify-center text-white font-mono-num shadow-inner">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">
                    READY
                  </span>
                  <span className="text-sm font-black tracking-tight text-white">
                    0.00 kg
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-black text-[#24201D] font-display uppercase tracking-wide">
                  Step on Barefoot
                </h4>
                <p className="text-xs text-[#6B635B] max-w-xs mx-auto leading-relaxed">
                  Make sure both feet touch the silver electrode circles to allow the bio-impedance measurement.
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="w-full py-3 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer font-display uppercase tracking-wider"
                >
                  <Bluetooth className="w-4 h-4 stroke-[2.5]" />
                  <span>Connect</span>
                </button>
              </div>
            </div>
          )}

          {/* Measuring / Stabilizing / Analyzing State */}
          {(status === 'scanning' || status === 'stabilizing' || status === 'analyzing') && (
            <div className="space-y-5 text-center py-4">
              {/* Radar pulse animation */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#4F46E5]/10 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-[#4F46E5]/15 animate-pulse" />
                <div className="relative w-28 h-28 rounded-full bg-white border-[2px] border-[#24201D] shadow-[2px_2px_0px_#24201D] flex flex-col items-center justify-center">
                  <Bluetooth className="w-6 h-6 text-[#4F46E5] animate-bounce" />
                  <span className="text-[10px] font-black font-display uppercase tracking-wider text-[#4F46E5] mt-1">
                    {status === 'scanning' ? 'Searching...' : 'Measuring...'}
                  </span>
                </div>
              </div>

              {/* Live Weight Readout */}
              <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                  Current Scale Telemetry
                </span>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-4xl font-black font-mono-num text-[#24201D] tracking-tight">
                    {liveWeight > 0 ? liveWeight : '—.—'}
                  </span>
                  <span className="text-sm font-black text-[#6B635B] uppercase font-display">
                    kg
                  </span>
                </div>
                {liveWeight === 0 && (
                  <p className="text-[11px] text-[#6B635B] font-medium pt-1">
                    Step onto your scale barefoot to start measuring
                  </p>
                )}

                {/* Impedance bars */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[9px] font-bold text-[#6B635B] mb-1">
                    <span>Bio-Impedance Sensors</span>
                    <span>{status === 'analyzing' ? 'Analyzing...' : 'Stand still'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-2">
                    {[1, 2, 3, 4].map((bar) => {
                      const isActive =
                        status === 'analyzing' && impedanceProgress >= bar * 25;
                      return (
                        <div
                          key={bar}
                          className={`h-full rounded-full border border-[#24201D]/40 transition-all duration-300 ${
                            isActive ? 'bg-[#4F46E5]' : 'bg-stone-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopScanning();
                  setStatus('idle');
                }}
                className="py-1.5 px-3 rounded-xl bg-white hover:bg-stone-100 border border-[#24201D] text-xs font-bold text-[#6B635B] shadow-2xs cursor-pointer"
              >
                Cancel Scan
              </button>
            </div>
          )}

          {/* Completed State */}
          {status === 'completed' && reading && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Primary Weight Card */}
              <div className="p-4 bg-white border-[1.75px] border-[#24201D] rounded-2xl shadow-[2px_2px_0px_#24201D] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] block font-display">
                    Verified Scale Weight
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-4xl font-black font-mono-num text-[#24201D]">
                      {reading.weight}
                    </span>
                    <span className="text-sm font-black text-[#6B635B] uppercase font-display">
                      kg
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-[#2D503C] bg-[#DDE8DE] border border-[#24201D] px-2 py-0.5 rounded-full shadow-2xs">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Locked</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#6B635B] block mt-1 font-mono-num">
                    Impedance: {reading.impedance} Ω
                  </span>
                </div>
              </div>

              {/* 6 Biometrics Grid from Bio-Impedance Algorithm */}
              {reading.metrics && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                      Decoded Body Composition
                    </span>
                    <span className="text-[9px] font-bold text-[#4F46E5] bg-[#EEF2FF] border border-[#4F46E5]/30 px-1.5 py-0.2 rounded font-mono-num">
                      Clinical Bio-Impedance
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Body Fat % */}
                    <div className="p-2.5 bg-white border border-[#24201D] rounded-xl shadow-2xs space-y-0.5">
                      <span className="text-[9px] font-bold uppercase text-[#6B635B] block font-display">
                        Body Fat
                      </span>
                      <span className="text-base font-black font-mono-num text-[#24201D] block">
                        {reading.metrics.bodyFatPercentage}%
                      </span>
                      <span className="text-[8px] text-stone-400 font-bold">Adipose ratio</span>
                    </div>

                    {/* Muscle Mass */}
                    <div className="p-2.5 bg-white border border-[#24201D] rounded-xl shadow-2xs space-y-0.5">
                      <span className="text-[9px] font-bold uppercase text-[#6B635B] block font-display">
                        Muscle
                      </span>
                      <span className="text-base font-black font-mono-num text-[#24201D] block">
                        {reading.metrics.muscleMassKg} <span className="text-[9px]">kg</span>
                      </span>
                      <span className="text-[8px] text-stone-400 font-bold">Active tissue</span>
                    </div>

                    {/* Hydration */}
                    <div className="p-2.5 bg-white border border-[#24201D] rounded-xl shadow-2xs space-y-0.5">
                      <span className="text-[9px] font-bold uppercase text-[#6B635B] block font-display">
                        Water
                      </span>
                      <span className="text-base font-black font-mono-num text-[#24201D] block">
                        {reading.metrics.waterPercentage}%
                      </span>
                      <span className="text-[8px] text-stone-400 font-bold">Hydration</span>
                    </div>

                    {/* Bone Mass */}
                    <div className="p-2.5 bg-white border border-[#24201D] rounded-xl shadow-2xs space-y-0.5">
                      <span className="text-[9px] font-bold uppercase text-[#6B635B] block font-display">
                        Bone Mass
                      </span>
                      <span className="text-base font-black font-mono-num text-[#24201D] block">
                        {reading.metrics.boneMassKg} <span className="text-[9px]">kg</span>
                      </span>
                      <span className="text-[8px] text-stone-400 font-bold">Mineral index</span>
                    </div>

                    {/* Visceral Fat */}
                    <div className="p-2.5 bg-white border border-[#24201D] rounded-xl shadow-2xs space-y-0.5">
                      <span className="text-[9px] font-bold uppercase text-[#6B635B] block font-display">
                        Visceral
                      </span>
                      <span className="text-base font-black font-mono-num text-[#24201D] block">
                        Level {reading.metrics.visceralFat}
                      </span>
                      <span className="text-[8px] text-stone-400 font-bold">Abdominal</span>
                    </div>

                    {/* BMR */}
                    <div className="p-2.5 bg-white border border-[#24201D] rounded-xl shadow-2xs space-y-0.5">
                      <span className="text-[9px] font-bold uppercase text-[#6B635B] block font-display">
                        BMR
                      </span>
                      <span className="text-base font-black font-mono-num text-[#24201D] block">
                        {reading.metrics.bmr} <span className="text-[9px]">kcal</span>
                      </span>
                      <span className="text-[8px] text-stone-400 font-bold">Basal burn</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 bg-[#3D6B52] hover:bg-[#345B45] text-white border-[1.75px] border-[#24201D] rounded-2xl text-xs font-black shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer font-display uppercase tracking-wider disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSaving ? 'Saving...' : 'Save to Health Diary'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="p-3 bg-white hover:bg-stone-100 border border-[#24201D] rounded-2xl text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer"
                  title="Re-scan"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="space-y-4 text-center py-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FEE2E2] border border-[#DC2626] flex items-center justify-center text-[#DC2626] shadow-2xs">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-black text-[#24201D] font-display uppercase tracking-wide">
                  Connection Notice
                </h4>
                <p className="text-xs text-[#DC2626] max-w-xs mx-auto leading-relaxed font-medium">
                  {errorMessage || 'Unable to communicate with the scale.'}
                </p>
              </div>

              <div className="p-3 bg-white border border-[#24201D]/20 rounded-xl text-left space-y-1 text-xs text-[#6B635B]">
                <div className="font-bold text-[#24201D] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#4F46E5]" />
                  <span>Troubleshooting tips:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Ensure Bluetooth and Location are enabled on your Android phone.</li>
                  <li>Step onto the scale to wake it up before clicking scan.</li>
                  <li>Keep both feet barefoot on the metal sensor electrodes.</li>
                </ul>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleStartScan}
                  className="w-full py-2.5 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white border border-[#24201D] rounded-xl text-xs font-black shadow-2xs active:translate-y-0.5 transition-all cursor-pointer font-display uppercase tracking-wider"
                >
                  Connect Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
