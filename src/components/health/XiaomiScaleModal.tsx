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
  const hasSeenLiveWeightRef = useRef<boolean>(false);
  const stabilizedAtRef = useRef<number | null>(null);
  const lastValidReadingRef = useRef<XiaomiScaleReading | null>(null);
  const impedanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetScanSession = () => {
    if (impedanceTimeoutRef.current) {
      clearTimeout(impedanceTimeoutRef.current);
      impedanceTimeoutRef.current = null;
    }
    hasSeenLiveWeightRef.current = false;
    stabilizedAtRef.current = null;
    lastValidReadingRef.current = null;
  };

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      resetScanSession();
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
    resetScanSession();
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
   * Unified telemetry packet handler for both Native Android and Web Bluetooth
   */
  const handleIncomingReading = (parsed: XiaomiScaleReading | null) => {
    if (!parsed) return;

    // 1. Ghost & Stale Reading Filter:
    // If the scale broadcasts an old cached packet (loadRemoved or >45s old)
    // before the user has stepped onto the scale during this scan session, ignore it completely!
    if ((parsed.loadRemoved || parsed.isStale) && !hasSeenLiveWeightRef.current) {
      return;
    }

    // 2. Ignore noise under 10 kg
    if (parsed.weight < 10.0) {
      return;
    }

    // Mark that a live person is standing on the scale
    hasSeenLiveWeightRef.current = true;
    lastValidReadingRef.current = parsed;
    setLiveWeight(parsed.weight);

    // 3. Scale weight is still settling/fluctuating
    if (!parsed.isStabilized) {
      setStatus('stabilizing');
      if (impedanceTimeoutRef.current) {
        clearTimeout(impedanceTimeoutRef.current);
        impedanceTimeoutRef.current = null;
      }
      stabilizedAtRef.current = null;
      setImpedanceProgress(15);
      return;
    }

    // 4. Scale weight is stabilized
    if (parsed.isStabilized) {
      if (!stabilizedAtRef.current) {
        stabilizedAtRef.current = Date.now();
      }

      // Active fallback timer (3.5 seconds)
      // Guarantees that even if the scale halts BLE transmission after weight lock (e.g. user wearing socks),
      // the interface smoothly auto-finalizes and never hangs at 2 bars!
      if (!impedanceTimeoutRef.current) {
        impedanceTimeoutRef.current = setTimeout(() => {
          if (lastValidReadingRef.current) {
            try {
              (window as any).AndroidBluetoothScale?.stopScan?.();
            } catch (e) {}
            setImpedanceProgress(100);
            completeMeasurement(lastValidReadingRef.current);
          }
        }, 3500);
      }

      // Case A: Bio-impedance is fully completed by hardware!
      if (parsed.isImpedanceComplete) {
        if (impedanceTimeoutRef.current) {
          clearTimeout(impedanceTimeoutRef.current);
          impedanceTimeoutRef.current = null;
        }
        try {
          (window as any).AndroidBluetoothScale?.stopScan?.();
        } catch (e) {}
        setImpedanceProgress(100);
        completeMeasurement(parsed);
        return;
      }

      // Case B: Analyzing impedance (calculating resistance across feet)
      setStatus('analyzing');
      const elapsed = Date.now() - (stabilizedAtRef.current || Date.now());
      if (elapsed < 800) {
        setImpedanceProgress(35);
      } else if (elapsed < 1600) {
        setImpedanceProgress(60);
      } else if (elapsed < 2400) {
        setImpedanceProgress(85);
      } else {
        setImpedanceProgress(100);
      }

      // Case C: If user stepped off after stabilization, finalize immediately
      if (parsed.loadRemoved) {
        if (impedanceTimeoutRef.current) {
          clearTimeout(impedanceTimeoutRef.current);
          impedanceTimeoutRef.current = null;
        }
        try {
          (window as any).AndroidBluetoothScale?.stopScan?.();
        } catch (e) {}
        completeMeasurement(parsed);
      }
    }
  };

  /**
   * Start Bluetooth Scan & scale measurement
   */
  const handleStartScan = async () => {
    playClickSound();
    resetScanSession();
    setErrorMessage('');
    setLiveWeight(0);
    setReading(null);
    setImpedanceProgress(0);
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
            weight: profile.currentWeight,
          });

          handleIncomingReading(parsed);
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
                weight: profile.currentWeight,
              });

              handleIncomingReading(parsed);
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

              {/* Quick Manual Lock Button if user wants to finalize instantly */}
              {liveWeight >= 10 && (
                <button
                  type="button"
                  onClick={() => {
                    if (lastValidReadingRef.current) {
                      stopScanning();
                      completeMeasurement(lastValidReadingRef.current);
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-[#2D503C] hover:bg-[#233F2F] text-white border-[1.75px] border-[#24201D] rounded-xl text-xs font-black shadow-[2px_2px_0px_#24201D] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer font-display uppercase tracking-wider"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Lock in {liveWeight} kg</span>
                </button>
              )}

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
                  {reading.impedance > 0 ? (
                    <span className="text-[10px] font-bold text-[#6B635B] block mt-1 font-mono-num">
                      Impedance: {reading.impedance} Ω
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded border border-[#F59E0B]/30 block mt-1">
                      Weight locked (step barefoot for bio-impedance)
                    </span>
                  )}
                </div>
              </div>

              {/* Zepp Life Clinical Biometrics Breakdown */}
              {reading.metrics && (
                <div className="space-y-3">
                  {/* Hero Summary: Body Score & Body Type */}
                  <div className="p-4 bg-gradient-to-br from-[#FAF8F5] via-white to-[#F5EFE6] border-[1.75px] border-[#24201D] rounded-2xl shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white border-[1.75px] border-[#24201D] flex flex-col items-center justify-center shadow-2xs">
                          <span className="text-2xl font-black font-mono-num text-[#24201D] leading-none">
                            {reading.metrics.bodyScore}
                          </span>
                          <span className="text-[8px] font-black uppercase tracking-wider text-[#6B635B] font-display mt-0.5">
                            SCORE
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B635B] font-display block">
                            Body Score
                          </span>
                          <h4 className="text-sm font-black font-display text-[#24201D] leading-tight">
                            Physique: {reading.metrics.bodyType}
                          </h4>
                          <span className="text-[9px] text-[#2D503C] font-bold block mt-0.5">
                            {reading.metrics.bodyScore >= 85 ? 'Optimal Composition' : 'Good Condition'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right p-2 bg-white/80 border border-[#24201D]/20 rounded-xl">
                        <span className="text-[9px] font-bold text-[#6B635B] uppercase font-display block">Ideal Weight</span>
                        <span className="text-xs font-black font-mono-num text-[#24201D]">
                          ~{reading.metrics.idealWeightKg} kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grouped metrics as in Zepp Life */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black font-display uppercase tracking-wider text-[#24201D]">
                        Body Composition Telemetry
                      </span>
                      <span className="text-[9px] font-bold text-[#2D503C] bg-[#DDE8DE] border border-[#2D503C]/30 px-2.5 py-0.5 rounded-full font-mono-num">
                        10 Parameters
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                      {reading.metrics.items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-white border border-[#24201D]/25 rounded-2xl flex items-center justify-between shadow-2xs text-xs"
                        >
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-black text-[#24201D] font-display text-xs">
                                {item.title}
                              </span>
                              <span className="font-black font-mono-num text-[#24201D] text-xs">
                                {item.valueFormatted}
                              </span>
                              {item.unit && (
                                <span className="text-[10px] font-bold text-[#6B635B]">
                                  {item.unit}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-[#6B635B] font-medium block">
                              Target: {item.normRange}
                            </span>
                          </div>

                          <div>
                            {item.statusType === 'alert' ? (
                              <span className="text-[10px] font-black text-[#991B1B] bg-[#FEE2E2] px-2.5 py-1 rounded-full border border-[#991B1B]/30 shadow-2xs font-display flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
                                <span>{item.statusLabel}</span>
                              </span>
                            ) : item.statusType === 'attention' ? (
                              <span className="text-[10px] font-black text-[#854D0E] bg-[#FBECCF] px-2.5 py-1 rounded-full border border-[#854D0E]/30 shadow-2xs font-display flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0" />
                                <span>{item.statusLabel}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-[#2D503C] bg-[#DDE8DE] px-2.5 py-1 rounded-full border border-[#2D503C]/30 shadow-2xs font-display flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
                                <span>{item.statusLabel}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
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
                  onClick={() => {
                    resetScanSession();
                    setReading(null);
                    setLiveWeight(0);
                    setImpedanceProgress(0);
                    handleStartScan();
                  }}
                  className="py-3 px-3.5 bg-white hover:bg-stone-100 border border-[#24201D] rounded-2xl text-[#24201D] shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold font-display uppercase tracking-wider"
                  title="Weigh In Again"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Weigh In Again</span>
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
