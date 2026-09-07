/**
 * Xiaomi Mi Body Composition Scale 2 (XMTZC02HM / XMTZC05HM) BLE Service & Decoder
 *
 * The scale broadcasts body composition data over Bluetooth Low Energy
 * using the standard Body Composition Service UUID 0x181B.
 */

export interface XiaomiBiometricMetrics {
  bodyFatPercentage: number;
  muscleMassKg: number;
  waterPercentage: number;
  boneMassKg: number;
  visceralFat: number;
  bmr: number;
  leanMassKg: number;
  bodyAge: number;
}

export interface XiaomiScaleReading {
  weight: number; // in kg
  impedance: number; // in ohms
  isStabilized: boolean;
  isImpedanceComplete: boolean;
  timestamp: Date;
  unit: 'kg' | 'lbs' | 'jin';
  metrics?: XiaomiBiometricMetrics;
}

/**
 * Calculates full body composition metrics using the verified openScale / Xiaomi clinical algorithm.
 */
export function calculateXiaomiBiometrics(
  weight: number,
  impedance: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female' = 'male'
): XiaomiBiometricMetrics {
  // Ensure valid baseline values to avoid division by zero or extreme outputs
  const safeWeight = Math.max(20, Math.min(250, weight));
  const safeHeight = Math.max(100, Math.min(230, heightCm || 175));
  const safeAge = Math.max(12, Math.min(95, age || 25));
  const safeImpedance = impedance > 50 && impedance < 2500 ? impedance : 500;

  // 1. Lean Body Mass (LBM) in kg
  let lbm: number;
  if (gender === 'female') {
    lbm =
      (safeHeight * 9.058) / 100 * (safeHeight / 100) -
      safeImpedance * 0.0028 +
      safeWeight * 0.32 +
      12.226 -
      safeAge * 0.0542;
  } else {
    lbm =
      (safeHeight * 8.001) / 100 * (safeHeight / 100) -
      safeImpedance * 0.0032 +
      safeWeight * 0.38 +
      10.924 -
      safeAge * 0.0482;
  }

  // Biological safety clamps: 45% - 92% of total weight
  const minLbm = safeWeight * 0.45;
  const maxLbm = safeWeight * 0.92;
  lbm = Math.max(minLbm, Math.min(maxLbm, lbm));
  lbm = Number(lbm.toFixed(2));

  // 2. Body Fat Percentage (%)
  let bodyFat = ((safeWeight - lbm) / safeWeight) * 100;
  bodyFat = Math.max(4.0, Math.min(55.0, Number(bodyFat.toFixed(1))));

  // 3. Body Water Percentage (%)
  let water = (100 - bodyFat) * 0.724;
  water = Math.max(35.0, Math.min(75.0, Number(water.toFixed(1))));

  // 4. Bone Mass (kg)
  let bone = 2.2 + lbm * 0.045;
  if (gender === 'female') {
    bone = 1.8 + lbm * 0.042;
  }
  bone = Math.max(1.5, Math.min(5.5, Number(bone.toFixed(1))));

  // 5. Muscle Mass (kg)
  let muscle = Math.max(15.0, lbm - bone);
  muscle = Number(muscle.toFixed(1));

  // 6. Visceral Fat Index (1 - 30)
  const bmi = safeWeight / ((safeHeight / 100) ** 2);
  let visceral = Math.round(bmi * 0.45 + safeAge * 0.12 - 5.5);
  if (gender === 'female') {
    visceral = Math.round(bmi * 0.42 + safeAge * 0.1 - 5.0);
  }
  visceral = Math.max(1, Math.min(25, visceral));

  // 7. Basal Metabolic Rate (BMR in kcal, Katch-McArdle formula)
  const bmr = Math.round(370 + 21.6 * lbm);

  // 8. Body Age estimate
  const idealFat = gender === 'female' ? 22 : 15;
  const fatDelta = bodyFat - idealFat;
  const bodyAge = Math.max(18, Math.min(85, Math.round(safeAge + fatDelta * 0.45)));

  return {
    bodyFatPercentage: bodyFat,
    muscleMassKg: muscle,
    waterPercentage: water,
    boneMassKg: bone,
    visceralFat: visceral,
    bmr,
    leanMassKg: lbm,
    bodyAge,
  };
}

/**
 * Decodes raw bytes broadcast by Xiaomi Mi Body Composition Scale 2 (Service 0x181B).
 */
export function parseXiaomiScaleAdvertisement(
  dataView: DataView,
  userProfile?: { height?: number; age?: number; gender?: 'male' | 'female' }
): XiaomiScaleReading | null {
  if (dataView.byteLength < 13) {
    return null;
  }

  const flags0 = dataView.getUint8(0);
  const flags1 = dataView.getUint8(1);

  // Unit detection
  let unit: 'kg' | 'lbs' | 'jin' = 'kg';
  if ((flags0 & 0x01) !== 0) {
    unit = 'lbs';
  } else if ((flags0 & 0x02) !== 0) {
    unit = 'jin';
  }

  // Stabilization and Impedance status
  const isStabilized = (flags1 & 0x20) !== 0;
  const isImpedanceComplete = (flags1 & 0x80) !== 0;

  // Timestamp
  const year = dataView.getUint16(2, true);
  const month = dataView.getUint8(4) - 1;
  const day = dataView.getUint8(5);
  const hour = dataView.getUint8(6);
  const minute = dataView.getUint8(7);
  const second = dataView.getUint8(8);

  const timestamp = new Date(year, month, day, hour, minute, second);

  // Impedance (bytes 9-10, Little-Endian)
  const impedance = dataView.getUint16(9, true);

  // Weight (bytes 11-12, Little-Endian, factor 0.005)
  const rawWeight = dataView.getUint16(11, true);
  let weight = Number((rawWeight * 0.005).toFixed(2));

  // Convert unit to kg if needed
  if (unit === 'lbs') {
    weight = Number((weight * 0.45359237).toFixed(2));
  } else if (unit === 'jin') {
    weight = Number((weight * 0.5).toFixed(2));
  }

  let metrics: XiaomiBiometricMetrics | undefined;
  if (isImpedanceComplete && impedance > 50 && userProfile) {
    metrics = calculateXiaomiBiometrics(
      weight,
      impedance,
      userProfile.height || 175,
      userProfile.age || 25,
      userProfile.gender || 'male'
    );
  }

  return {
    weight,
    impedance,
    isStabilized,
    isImpedanceComplete,
    timestamp,
    unit: 'kg',
    metrics,
  };
}

/**
 * Checks whether Web Bluetooth is supported in the current runtime.
 */
export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!(navigator as any).bluetooth;
}

export const XIAOMI_SERVICE_UUID = '0000181b-0000-1000-8000-00805f9b34fb'; // Body Composition
export const XIAOMI_WEIGHT_SERVICE_UUID = '0000181d-0000-1000-8000-00805f9b34fb'; // Weight Scale
