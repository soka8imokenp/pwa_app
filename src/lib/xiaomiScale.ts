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
  hasImpedance: boolean;
  isImpedanceComplete: boolean;
  loadRemoved: boolean;
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

  // 1. Lean Body Mass (LBM) in kg via Bioelectrical Impedance Analysis (H^2 / R)
  const impedanceIndex = (safeHeight * safeHeight) / safeImpedance;
  let lbm: number;
  if (gender === 'female') {
    lbm = 0.48 * impedanceIndex + 0.26 * safeWeight + 4.5 - 0.03 * safeAge;
    const minLbm = safeWeight * 0.50;
    const maxLbm = safeWeight * 0.85;
    lbm = Math.max(minLbm, Math.min(maxLbm, lbm));
  } else {
    lbm = 0.52 * impedanceIndex + 0.32 * safeWeight + 4.5 - 0.03 * safeAge;
    const minLbm = safeWeight * 0.55;
    const maxLbm = safeWeight * 0.90;
    lbm = Math.max(minLbm, Math.min(maxLbm, lbm));
  }
  lbm = Number(lbm.toFixed(2));

  // 2. Body Fat Percentage (%)
  let bodyFat = ((safeWeight - lbm) / safeWeight) * 100;
  bodyFat = Math.max(4.0, Math.min(55.0, Number(bodyFat.toFixed(1))));

  // 3. Body Water Percentage (%)
  let water = (100 - bodyFat) * 0.724;
  water = Math.max(35.0, Math.min(75.0, Number(water.toFixed(1))));

  // 4. Bone Mass (kg)
  let bone: number;
  if (gender === 'female') {
    bone = 1.0 + lbm * 0.035;
  } else {
    bone = 1.1 + lbm * 0.035;
  }
  bone = Math.max(1.5, Math.min(4.5, Number(bone.toFixed(1))));

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
 * Decodes raw bytes broadcast by Xiaomi Mi Body Composition Scale 2 (Service 0x181B)
 * and Xiaomi Mi Scale 1 (Service 0x181D).
 */
export function parseXiaomiScaleAdvertisement(
  dataView: DataView,
  userProfile?: { height?: number; age?: number; gender?: 'male' | 'female' }
): XiaomiScaleReading | null {
  if (dataView.byteLength < 10) {
    return null;
  }

  // Check for 13-byte Body Composition packet (Service 0x181B)
  if (dataView.byteLength >= 13) {
    let offset13 = -1;
    for (let i = 0; i <= dataView.byteLength - 13; i++) {
      const candidateYear = dataView.getUint16(i + 2, true);
      const candidateMonth = dataView.getUint8(i + 4);
      const candidateDay = dataView.getUint8(i + 5);
      const candidateHour = dataView.getUint8(i + 6);
      const candidateMin = dataView.getUint8(i + 7);
      const candidateSec = dataView.getUint8(i + 8);

      if (
        candidateYear >= 2018 &&
        candidateYear <= 2035 &&
        candidateMonth >= 1 &&
        candidateMonth <= 12 &&
        candidateDay >= 1 &&
        candidateDay <= 31 &&
        candidateHour <= 23 &&
        candidateMin <= 59 &&
        candidateSec <= 59
      ) {
        offset13 = i;
        break;
      }
    }

    if (offset13 !== -1) {
      const flags0 = dataView.getUint8(offset13 + 0);
      const flags1 = dataView.getUint8(offset13 + 1);

      // Unit detection:
      // Byte 0 bit 0 (0x01): LBS
      // Byte 0 bit 4 (0x10) or Byte 1 bit 6 (0x40): Jin (Chinese Catty)
      // Otherwise: KG (byte 0 frequently has bit 1 (0x02) set in standard kg mode)
      let unit: 'kg' | 'lbs' | 'jin' = 'kg';
      if ((flags0 & 0x01) !== 0) {
        unit = 'lbs';
      } else if ((flags0 & 0x10) !== 0 || (flags1 & 0x40) !== 0) {
        unit = 'jin';
      }

      // Status flags in Byte 1:
      // Bit 1 (0x02): has_impedance (bio-impedance measurement circuit active)
      // Bit 5 (0x20): is_stabilized (weight has locked and stabilized)
      // Bit 7 (0x80): load_removed (weight removed from scale)
      const isStabilized = (flags1 & 0x20) !== 0;
      const hasImpedance = (flags1 & 0x02) !== 0;
      const loadRemoved = (flags1 & 0x80) !== 0;

      // Timestamp
      const year = dataView.getUint16(offset13 + 2, true);
      const rawMonth = dataView.getUint8(offset13 + 4);
      const day = dataView.getUint8(offset13 + 5);
      const hour = dataView.getUint8(offset13 + 6);
      const minute = dataView.getUint8(offset13 + 7);
      const second = dataView.getUint8(offset13 + 8);
      const timestamp = new Date(year, rawMonth - 1, day, hour, minute, second);

      // Impedance (bytes 9-10, Little-Endian in ohms)
      const impedance = dataView.getUint16(offset13 + 9, true);

      // Weight (bytes 11-12, Little-Endian)
      // Xiaomi scale resolution is rawWeight / 200.0 (factor 0.005) for both KG and Jin (1 jin = 0.5 kg).
      // For LBS mode: rawWeight / 100.0 is lbs => converted by 0.45359237 to kg.
      const rawWeight = dataView.getUint16(offset13 + 11, true);
      let weight: number;
      if (unit === 'lbs') {
        weight = Number(((rawWeight / 100.0) * 0.45359237).toFixed(2));
      } else {
        weight = Number((rawWeight / 200.0).toFixed(2));
      }

      // Sanity check: Human body weight must be within realistic physical range
      if (weight < 5.0 || weight > 250.0) {
        return null;
      }

      // Bio-impedance is valid when in realistic human physiological range (50 - 2500 ohms)
      const hasValidImpedance = impedance >= 50 && impedance <= 2500;
      const isImpedanceComplete = isStabilized && (hasValidImpedance || (hasImpedance && impedance > 0));

      let metrics: XiaomiBiometricMetrics | undefined;
      if (isImpedanceComplete && hasValidImpedance && userProfile) {
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
        hasImpedance,
        isImpedanceComplete,
        loadRemoved,
        timestamp,
        unit: 'kg',
        metrics,
      };
    }
  }

  // Check for 10-byte Weight Scale packet (Mi Scale 1, Service 0x181D)
  if (dataView.byteLength >= 10) {
    let offset10 = -1;
    for (let i = 0; i <= dataView.byteLength - 10; i++) {
      const candidateYear = dataView.getUint16(i + 3, true);
      const candidateMonth = dataView.getUint8(i + 5);
      const candidateDay = dataView.getUint8(i + 6);
      const candidateHour = dataView.getUint8(i + 7);
      const candidateMin = dataView.getUint8(i + 8);
      const candidateSec = dataView.getUint8(i + 9);

      if (
        candidateYear >= 2018 &&
        candidateYear <= 2035 &&
        candidateMonth >= 1 &&
        candidateMonth <= 12 &&
        candidateDay >= 1 &&
        candidateDay <= 31 &&
        candidateHour <= 23 &&
        candidateMin <= 59 &&
        candidateSec <= 59
      ) {
        offset10 = i;
        break;
      }
    }

    if (offset10 !== -1) {
      const flags = dataView.getUint8(offset10 + 0);
      const unit: 'kg' | 'lbs' | 'jin' =
        (flags & 0x01) !== 0 ? 'lbs' : (flags & 0x10) !== 0 ? 'jin' : 'kg';

      const isStabilized = (flags & 0x20) !== 0;
      const loadRemoved = (flags & 0x80) !== 0;

      const year = dataView.getUint16(offset10 + 3, true);
      const rawMonth = dataView.getUint8(offset10 + 5);
      const day = dataView.getUint8(offset10 + 6);
      const hour = dataView.getUint8(offset10 + 7);
      const minute = dataView.getUint8(offset10 + 8);
      const second = dataView.getUint8(offset10 + 9);
      const timestamp = new Date(year, rawMonth - 1, day, hour, minute, second);

      const rawWeight = dataView.getUint16(offset10 + 1, true);
      let weight: number;
      if (unit === 'lbs') {
        weight = Number(((rawWeight / 100.0) * 0.45359237).toFixed(2));
      } else {
        weight = Number((rawWeight / 200.0).toFixed(2));
      }

      if (weight < 5.0 || weight > 250.0) {
        return null;
      }

      return {
        weight,
        impedance: 0,
        isStabilized,
        hasImpedance: false,
        isImpedanceComplete: isStabilized,
        loadRemoved,
        timestamp,
        unit: 'kg',
      };
    }
  }

  return null;
}

/**
 * Checks whether Bluetooth scale support is available (via native Android bridge or Web Bluetooth).
 */
export function isWebBluetoothAvailable(): boolean {
  if (typeof window !== 'undefined' && Boolean((window as any).AndroidBluetoothScale?.isAvailable?.())) {
    return true;
  }
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!(navigator as any).bluetooth;
}

export const XIAOMI_SERVICE_UUID = '0000181b-0000-1000-8000-00805f9b34fb'; // Body Composition
export const XIAOMI_WEIGHT_SERVICE_UUID = '0000181d-0000-1000-8000-00805f9b34fb'; // Weight Scale
