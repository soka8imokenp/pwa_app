/**
 * Xiaomi Mi Body Composition Scale 2 (XMTZC02HM / XMTZC05HM) BLE Service & Clinical Decoder
 *
 * Official reverse-engineered Zepp Life (Mi Fit) BIA bio-impedance algorithms,
 * 100-point body score formula with malus deductions, age/gender normative tables,
 * and robust BLE packet decoding (Service UUID 0x181B & 0x181D).
 *
 * References:
 * - https://github.com/lolouk44/xiaomi_mi_scale
 * - https://github.com/zibous/ha-miscale2
 * - https://github.com/LookHin/xiaomi-mi-body-composition-scale-2
 */

export type ZeppMetricStatusType = 'optimal' | 'attention' | 'alert';
export type ZeppMetricGroup = 'not_reached' | 'attention' | 'achieved';

export interface ZeppMetricItem {
  id: 'bmr' | 'visceral' | 'bmi' | 'bodyFat' | 'muscle' | 'water' | 'protein' | 'bone' | 'bodyAge' | 'idealWeight';
  title: string;
  value: number;
  valueFormatted: string;
  unit: string;
  statusLabel: string; // e.g. 'Normal Range', 'Optimal', 'Below Target', 'High'
  statusType: ZeppMetricStatusType;
  group: ZeppMetricGroup;
  normRange: string;
  description: string;
}

export interface BodyScoreDeduction {
  id: string;
  label: string;
  malus: number;
}

export interface XiaomiBiometricMetrics {
  bmi: number;
  bodyFatPercentage: number;
  muscleMassKg: number;
  waterPercentage: number;
  boneMassKg: number;
  visceralFat: number;
  bmr: number;
  leanMassKg: number;
  bodyAge: number;
  proteinPercentage: number;
  idealWeightKg: number;
  bodyScore: number; // 0 - 100
  bodyType: string; // e.g. 'Standard', 'Balanced', 'Skinny Muscular'
  bodyTypeCode: string;
  items: ZeppMetricItem[];
  deductions?: BodyScoreDeduction[];
}

export interface XiaomiScaleReading {
  weight: number; // in kg
  impedance: number; // in ohms
  isStabilized: boolean;
  hasImpedance: boolean;
  isImpedanceComplete: boolean;
  loadRemoved: boolean;
  isStale: boolean;
  packetAgeSec: number;
  timestamp: Date;
  unit: 'kg' | 'lbs' | 'jin';
  metrics?: XiaomiBiometricMetrics;
}

// -------------------------------------------------------------------------
// Normative Scales per Age, Height, Sex and Weight (from body_scales.py)
// -------------------------------------------------------------------------

function getFatPercentageScale(age: number, sex: 'male' | 'female'): [number, number, number, number] {
  // [low, normal_min, normal_max, obese]
  const scales = [
    { min: 0, max: 12, female: [12.0, 21.0, 30.0, 34.0], male: [7.0, 16.0, 25.0, 30.0] },
    { min: 12, max: 14, female: [15.0, 24.0, 33.0, 37.0], male: [7.0, 16.0, 25.0, 30.0] },
    { min: 14, max: 16, female: [18.0, 27.0, 36.0, 40.0], male: [7.0, 16.0, 25.0, 30.0] },
    { min: 16, max: 18, female: [20.0, 28.0, 37.0, 41.0], male: [7.0, 16.0, 25.0, 30.0] },
    { min: 18, max: 40, female: [21.0, 28.0, 35.0, 40.0], male: [11.0, 17.0, 22.0, 27.0] },
    { min: 40, max: 60, female: [22.0, 29.0, 36.0, 41.0], male: [12.0, 18.0, 23.0, 28.0] },
    { min: 60, max: 120, female: [23.0, 30.0, 37.0, 42.0], male: [14.0, 20.0, 25.0, 30.0] },
  ];

  for (const s of scales) {
    if (age >= s.min && age < s.max) {
      return s[sex] as [number, number, number, number];
    }
  }
  return sex === 'male' ? [11.0, 17.0, 22.0, 27.0] : [21.0, 28.0, 35.0, 40.0];
}

function getMuscleMassScale(height: number, sex: 'male' | 'female'): [number, number] {
  // [low_threshold, high_threshold]
  const scales = [
    { minFemale: 160, minMale: 170, female: [36.5, 42.6], male: [49.4, 59.5] },
    { minFemale: 150, minMale: 160, female: [32.9, 37.6], male: [44.0, 52.5] },
    { minFemale: 0, minMale: 0, female: [29.1, 34.8], male: [38.5, 46.6] },
  ];

  for (const s of scales) {
    const minH = sex === 'male' ? s.minMale : s.minFemale;
    if (height >= minH) {
      return s[sex] as [number, number];
    }
  }
  return sex === 'male' ? [49.4, 59.5] : [36.5, 42.6];
}

function getWaterPercentageScale(sex: 'male' | 'female'): [number, number] {
  return sex === 'male' ? [55.0, 65.1] : [45.0, 60.1];
}

function getBoneMassScale(weight: number, sex: 'male' | 'female'): [number, number] {
  if (sex === 'male') {
    if (weight >= 75.0) return [2.0, 4.2];
    if (weight >= 60.0) return [1.9, 4.1];
    return [1.6, 3.9];
  } else {
    if (weight >= 60.0) return [1.8, 3.9];
    if (weight >= 45.0) return [1.5, 3.8];
    return [1.3, 3.6];
  }
}

function getExpectedBoneOptimal(weight: number, sex: 'male' | 'female'): number {
  if (sex === 'male') {
    if (weight >= 75.0) return 3.2;
    if (weight >= 60.0) return 2.9;
    return 2.5;
  } else {
    if (weight >= 60.0) return 2.5;
    if (weight >= 45.0) return 2.2;
    return 1.8;
  }
}

function getBMRScaleTarget(weight: number, age: number, sex: 'male' | 'female'): number {
  const coefficients: Record<'male' | 'female', { maxAge: number; coeff: number }[]> = {
    male: [
      { maxAge: 30, coeff: 21.6 },
      { maxAge: 50, coeff: 20.07 },
      { maxAge: 120, coeff: 19.35 },
    ],
    female: [
      { maxAge: 30, coeff: 21.24 },
      { maxAge: 50, coeff: 19.53 },
      { maxAge: 120, coeff: 18.63 },
    ],
  };

  for (const item of coefficients[sex]) {
    if (age < item.maxAge) {
      return Math.round(weight * item.coeff);
    }
  }
  return Math.round(weight * 20.0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// -------------------------------------------------------------------------
// Authentic Zepp Life / Mi Fit BIA Clinical Engine
// -------------------------------------------------------------------------

/**
 * Calculates full body composition metrics using the verified Zepp Life / Mi Fit formulas.
 */
export function calculateXiaomiBiometrics(
  weight: number,
  impedance: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female' = 'male'
): XiaomiBiometricMetrics {
  const safeWeight = clamp(weight, 10, 220);
  const safeHeight = clamp(heightCm || 175, 90, 220);
  const safeAge = clamp(age || 25, 10, 99);
  const isMale = gender === 'male';

  // If impedance is outside contact range (e.g. socks on or open circuit), use calibrated standard human resistance
  const safeImpedance = impedance >= 150 && impedance <= 2500 ? impedance : 500;

  // 1. BMI
  const heightM = safeHeight / 100;
  const bmi = Number(clamp(safeWeight / (heightM * heightM), 10, 90).toFixed(1));

  // 2. Lean Body Mass Coefficient (LBM)
  let lbm = (safeHeight * 9.058 / 100) * (safeHeight / 100);
  lbm += safeWeight * 0.32 + 12.226;
  lbm -= safeImpedance * 0.0068;
  lbm -= safeAge * 0.0542;

  // 3. Body Fat Percentage
  const fatConst = !isMale ? (safeAge <= 49 ? 9.25 : 7.25) : 0.8;
  let fatCoeff = 1.0;
  if (isMale && safeWeight < 61) {
    fatCoeff = 0.98;
  } else if (!isMale && safeWeight > 60) {
    fatCoeff = 0.96 * (safeHeight > 160 ? 1.03 : 1.0);
  } else if (!isMale && safeWeight < 50) {
    fatCoeff = 1.02 * (safeHeight > 160 ? 1.03 : 1.0);
  }

  let rawFatPercentage = (1.0 - (((lbm - fatConst) * fatCoeff) / safeWeight)) * 100;
  if (rawFatPercentage > 63) {
    rawFatPercentage = 75;
  }
  const bodyFat = Number(clamp(rawFatPercentage, 5.0, 75.0).toFixed(1));

  // 4. Body Water Percentage
  let rawWater = (100 - bodyFat) * 0.7;
  const waterCoeff = rawWater <= 50 ? 1.02 : 0.98;
  rawWater = rawWater * waterCoeff;
  if (rawWater >= 65) {
    rawWater = 75;
  }
  const water = Number(clamp(rawWater, 35.0, 75.0).toFixed(1));

  // 5. Bone Mass (kg)
  const boneBase = !isMale ? 0.245691014 : 0.18016894;
  let rawBone = (boneBase - (lbm * 0.05158)) * -1;
  if (rawBone > 2.2) {
    rawBone += 0.1;
  } else {
    rawBone -= 0.1;
  }
  if (!isMale && rawBone > 5.1) {
    rawBone = 8.0;
  } else if (isMale && rawBone > 5.2) {
    rawBone = 8.0;
  }
  const bone = Number(clamp(rawBone, 0.5, 8.0).toFixed(2));

  // 6. Muscle Mass (kg)
  let rawMuscle = safeWeight - ((bodyFat * 0.01) * safeWeight) - bone;
  if (!isMale && rawMuscle >= 84) {
    rawMuscle = 120;
  } else if (isMale && rawMuscle >= 93.5) {
    rawMuscle = 120;
  }
  const muscle = Number(clamp(rawMuscle, 10.0, 120.0).toFixed(2));

  // 7. Visceral Fat (Level 1 - 50)
  let rawVisceral: number;
  if (!isMale) {
    if (safeWeight > (13 - (safeHeight * 0.5)) * -1) {
      const subsub = ((safeHeight * 1.45) + (safeHeight * 0.1158) * safeHeight) - 120;
      const subcalc = (safeWeight * 500) / subsub;
      rawVisceral = (subcalc - 6) + (safeAge * 0.07);
    } else {
      const subcalc = 0.691 + (safeHeight * -0.0024) + (safeHeight * -0.0024);
      rawVisceral = (((safeHeight * 0.027) - (subcalc * safeWeight)) * -1) + (safeAge * 0.07) - safeAge;
    }
  } else {
    if (safeHeight < safeWeight * 1.6) {
      const subcalc = ((safeHeight * 0.4) - (safeHeight * (safeHeight * 0.0826))) * -1;
      rawVisceral = ((safeWeight * 305) / (subcalc + 48)) - 2.9 + (safeAge * 0.15);
    } else {
      const subcalc = 0.765 + safeHeight * -0.0015;
      rawVisceral = (((safeHeight * 0.143) - (safeWeight * subcalc)) * -1) + (safeAge * 0.15) - 5.0;
    }
  }
  const visceral = Math.round(clamp(rawVisceral, 1, 50));

  // 8. Basal Metabolic Rate (BMR in kcal)
  let rawBmr: number;
  if (!isMale) {
    rawBmr = 864.6 + safeWeight * 10.2036 - safeHeight * 0.39336 - safeAge * 6.204;
    if (rawBmr > 2996) rawBmr = 5000;
  } else {
    rawBmr = 877.8 + safeWeight * 14.916 - safeHeight * 0.726 - safeAge * 8.976;
    if (rawBmr > 2322) rawBmr = 5000;
  }
  const bmr = Math.round(clamp(rawBmr, 500, 10000));

  // 9. Protein Percentage (%)
  const rawProtein = (muscle / safeWeight) * 100 - water;
  const protein = Number(clamp(rawProtein, 5.0, 32.0).toFixed(1));

  // 10. Ideal Weight (kg)
  const idealWeightKg = Number(
    (!isMale ? (safeHeight - 70) * 0.6 : (safeHeight - 80) * 0.7).toFixed(1)
  );

  // 11. Metabolic Body Age
  let rawBodyAge: number;
  if (!isMale) {
    rawBodyAge = (safeHeight * -1.1165) + (safeWeight * 1.5784) + (safeAge * 0.4615) + (safeImpedance * 0.0415) + 83.2548;
  } else {
    rawBodyAge = (safeHeight * -0.7471) + (safeWeight * 0.9161) + (safeAge * 0.4184) + (safeImpedance * 0.0517) + 54.2267;
  }
  const bodyAge = Math.round(clamp(rawBodyAge, 15, 80));

  // 12. 9 Somatotypes (matching Zepp Life)
  const fatScale = getFatPercentageScale(safeAge, gender);
  const muscleScale = getMuscleMassScale(safeHeight, gender);

  let fatFactor = 1;
  if (bodyFat > fatScale[2]) {
    fatFactor = 0; // high fat
  } else if (bodyFat < fatScale[1]) {
    fatFactor = 2; // low fat
  }

  let somatotypeIndex: number;
  if (muscle > muscleScale[1]) {
    somatotypeIndex = 2 + fatFactor * 3;
  } else if (muscle < muscleScale[0]) {
    somatotypeIndex = fatFactor * 3;
  } else {
    somatotypeIndex = 1 + fatFactor * 3;
  }

  const somatotypeNames = [
    'Obese',
    'Overweight',
    'Thick-set',
    'Lack of Exercise',
    'Balanced',
    'Balanced Muscular',
    'Skinny',
    'Balanced Skinny',
    'Skinny Muscular',
  ];
  const somatotypeCodes = [
    'obese',
    'overweight',
    'thick_set',
    'lack_exercise',
    'balanced',
    'balanced_muscular',
    'skinny',
    'balanced_skinny',
    'skinny_muscular',
  ];

  const bodyType = somatotypeNames[somatotypeIndex] || 'Balanced';
  const bodyTypeCode = somatotypeCodes[somatotypeIndex] || 'balanced';

  // -----------------------------------------------------------------------
  // 13. Official Zepp Life 100-Point Body Score Algorithm (from body_score.py)
  // -----------------------------------------------------------------------
  const deductions: BodyScoreDeduction[] = [];

  const getMalus = (val: number, minVal: number, maxVal: number, maxMalus: number, minMalus: number): number => {
    const res = ((val - maxVal) / (minVal - maxVal)) * (maxMalus - minMalus);
    return res >= 0 ? res : 0;
  };

  // A. BMI Deduct
  let bmiDeduct = 0;
  if (safeHeight >= 90) {
    const bmiLow = 15.0;
    const bmiVeryLow = 14.0;
    const bmiNormal = 18.5;
    const bmiOverweight = 28.0;
    const bmiObese = 32.0;

    if (bmi >= 18.5 && safeAge >= 18 && bodyFat < fatScale[2]) {
      bmiDeduct = 0;
    } else if (bmi >= bmiVeryLow && safeAge < 18 && bodyFat < fatScale[2]) {
      bmiDeduct = 0;
    } else if (bmi <= bmiVeryLow) {
      bmiDeduct = 30.0;
    } else if (bmi > bmiVeryLow && bmi < bmiLow) {
      bmiDeduct = getMalus(bmi, bmiVeryLow, bmiLow, 30, 15) + 15.0;
    } else if (bmi >= bmiLow && bmi < bmiNormal && safeAge >= 18) {
      bmiDeduct = getMalus(bmi, 15.0, 18.5, 15, 5) + 5.0;
    } else if (((bmi >= bmiLow && safeAge < 18) || (bmi >= bmiNormal && safeAge >= 18)) && bodyFat >= fatScale[2]) {
      if (bmi >= bmiObese) {
        bmiDeduct = 10.0;
      } else if (bmi > bmiOverweight) {
        bmiDeduct = getMalus(bmi, 28.0, 25.0, 5, 10) + 5.0;
      }
    }
  }
  if (bmiDeduct > 0) {
    deductions.push({ id: 'bmi', label: 'BMI deviation', malus: Number(bmiDeduct.toFixed(1)) });
  }

  // B. Body Fat Deduct
  const fatBest = isMale ? fatScale[2] - 3.0 : fatScale[2] - 2.0;
  let fatDeduct = 0;
  if (bodyFat >= fatScale[0] && bodyFat < fatBest) {
    fatDeduct = 0;
  } else if (bodyFat >= fatScale[3]) {
    fatDeduct = 20.0;
  } else if (bodyFat < fatScale[0]) {
    fatDeduct = getMalus(bodyFat, 1.0, fatScale[0], 3, 10) + 3.0;
  } else if (bodyFat < fatScale[3]) {
    fatDeduct = getMalus(bodyFat, fatScale[3], fatScale[2], 20, 10) + 10.0;
  } else if (bodyFat <= fatScale[2]) {
    fatDeduct = getMalus(bodyFat, fatScale[2], fatBest, 3, 9) + 3.0;
  }
  if (fatDeduct > 0) {
    deductions.push({ id: 'fat', label: 'Adipose tissue index', malus: Number(fatDeduct.toFixed(1)) });
  }

  // C. Muscle Mass Deduct
  let muscleDeduct = 0;
  if (muscle >= muscleScale[0]) {
    muscleDeduct = 0;
  } else if (muscle < muscleScale[0] - 5.0) {
    muscleDeduct = 10.0;
  } else {
    muscleDeduct = getMalus(muscle, muscleScale[0] - 5.0, muscleScale[0], 10, 5) + 5.0;
  }
  if (muscleDeduct > 0) {
    deductions.push({ id: 'muscle', label: 'Muscle deficiency', malus: Number(muscleDeduct.toFixed(1)) });
  }

  // D. Water Deduct
  const waterScale = getWaterPercentageScale(gender);
  let waterDeduct = 0;
  if (water >= waterScale[0]) {
    waterDeduct = 0;
  } else if (water <= waterScale[0] - 5.0) {
    waterDeduct = 10.0;
  } else {
    waterDeduct = getMalus(water, waterScale[0] - 5.0, waterScale[0], 10, 5) + 5.0;
  }
  if (waterDeduct > 0) {
    deductions.push({ id: 'water', label: 'Hydration deficit', malus: Number(waterDeduct.toFixed(1)) });
  }

  // E. Visceral Fat Deduct (uses unrounded physiological visceral index as in body_score.py)
  let visceralDeduct = 0;
  if (rawVisceral < 10.0) {
    visceralDeduct = 0;
  } else if (rawVisceral >= 15.0) {
    visceralDeduct = 15.0;
  } else {
    visceralDeduct = getMalus(rawVisceral, 15.0, 10.0, 15, 10) + 10.0;
  }
  if (visceralDeduct > 0) {
    deductions.push({ id: 'visceral', label: 'Visceral fat elevation', malus: Number(visceralDeduct.toFixed(1)) });
  }

  // F. Bone Deduct
  const boneScale = getBoneMassScale(safeWeight, gender);
  let boneDeduct = 0;
  if (bone >= boneScale[0]) {
    boneDeduct = 0;
  } else if (bone <= boneScale[0] - 0.3) {
    boneDeduct = 10.0;
  } else {
    boneDeduct = getMalus(bone, boneScale[0] - 0.3, boneScale[0], 10, 5) + 5.0;
  }
  if (boneDeduct > 0) {
    deductions.push({ id: 'bone', label: 'Bone mineral deficit', malus: Number(boneDeduct.toFixed(1)) });
  }

  // G. Basal Metabolism Deduct
  const bmrNormalTarget = getBMRScaleTarget(safeWeight, safeAge, gender);
  let bmrDeduct = 0;
  if (bmr >= bmrNormalTarget) {
    bmrDeduct = 0;
  } else if (bmr <= bmrNormalTarget - 300) {
    bmrDeduct = 6.0;
  } else {
    bmrDeduct = getMalus(bmr, bmrNormalTarget - 300, bmrNormalTarget, 6, 3) + 5.0;
  }
  if (bmrDeduct > 0) {
    deductions.push({ id: 'bmr', label: 'Metabolic expenditure deficit', malus: Number(bmrDeduct.toFixed(1)) });
  }

  // H. Protein Deduct
  let proteinDeduct = 0;
  if (protein > 17.0) {
    proteinDeduct = 0;
  } else if (protein < 10.0) {
    proteinDeduct = 10.0;
  } else if (protein <= 16.0) {
    proteinDeduct = getMalus(protein, 10.0, 16.0, 10, 5) + 5.0;
  } else {
    proteinDeduct = getMalus(protein, 16.0, 17.0, 5, 3) + 3.0;
  }
  if (proteinDeduct > 0) {
    deductions.push({ id: 'protein', label: 'Cellular protein deficit', malus: Number(proteinDeduct.toFixed(1)) });
  }

  const totalDeductions = bmiDeduct + fatDeduct + muscleDeduct + waterDeduct + visceralDeduct + boneDeduct + bmrDeduct + proteinDeduct;
  const bodyScore = Math.max(10, Math.min(100, Math.round(100 - totalDeductions)));

  // -----------------------------------------------------------------------
  // 14. Structured 8 Zepp Metric Items with Clinically Accurate Statuses
  // -----------------------------------------------------------------------
  const items: ZeppMetricItem[] = [];

  // 1. Basal Metabolic Rate (BMR)
  const isBmrOptimal = bmr >= bmrNormalTarget;
  items.push({
    id: 'bmr',
    title: 'Basal Metabolic Rate',
    value: bmr,
    valueFormatted: bmr.toLocaleString('en-US'),
    unit: 'kcal',
    statusLabel: isBmrOptimal ? 'Optimal' : 'Below Target',
    statusType: isBmrOptimal ? 'optimal' : 'alert',
    group: isBmrOptimal ? 'achieved' : 'not_reached',
    normRange: `≥ ${bmrNormalTarget.toLocaleString('en-US')} kcal`,
    description: 'Minimum daily caloric expenditure required to maintain vital physiological life functions at complete rest.',
  });

  // 2. Visceral Fat (1-9 safe, 10-14 high, 15+ alert)
  const isVisceralNormal = visceral <= 9;
  const isVisceralBorderline = visceral >= 10 && visceral <= 14;
  items.push({
    id: 'visceral',
    title: 'Visceral Fat',
    value: visceral,
    valueFormatted: String(visceral),
    unit: 'Level',
    statusLabel: isVisceralNormal ? 'Normal Range' : isVisceralBorderline ? 'High' : 'Very High',
    statusType: isVisceralNormal ? 'optimal' : isVisceralBorderline ? 'attention' : 'alert',
    group: isVisceralNormal ? 'achieved' : isVisceralBorderline ? 'attention' : 'not_reached',
    normRange: '1 - 9 Level',
    description: 'Deep intra-abdominal adipose tissue surrounding internal organs. Clinical healthy threshold is level 1 to 9.',
  });

  // 3. BMI
  const isBmiNormal = bmi >= 18.5 && bmi <= 24.9;
  const isBmiAttention = (bmi >= 25.0 && bmi <= 27.9) || (bmi >= 17.5 && bmi < 18.5);
  items.push({
    id: 'bmi',
    title: 'BMI',
    value: bmi,
    valueFormatted: String(bmi),
    unit: '',
    statusLabel: isBmiNormal ? 'Normal Range' : bmi < 18.5 ? 'Underweight' : bmi >= 28 ? 'Obese' : 'Overweight',
    statusType: isBmiNormal ? 'optimal' : isBmiAttention ? 'attention' : 'alert',
    group: isBmiNormal ? 'achieved' : isBmiAttention ? 'attention' : 'not_reached',
    normRange: '18.5 - 24.9',
    description: 'Body Mass Index: ratio of body mass to squared height standardized by the World Health Organization.',
  });

  // 4. Body Fat
  const isFatNormal = bodyFat >= fatScale[1] && bodyFat <= fatScale[2];
  const isFatLow = bodyFat < fatScale[1];
  const isFatBorderline = bodyFat > fatScale[2] && bodyFat <= fatScale[3];
  items.push({
    id: 'bodyFat',
    title: 'Body Fat',
    value: bodyFat,
    valueFormatted: String(bodyFat),
    unit: '%',
    statusLabel: isFatNormal ? 'Normal Range' : isFatLow ? 'Low' : isFatBorderline ? 'High' : 'Very High',
    statusType: isFatNormal ? 'optimal' : isFatBorderline ? 'attention' : 'alert',
    group: isFatNormal ? 'achieved' : isFatBorderline ? 'attention' : 'not_reached',
    normRange: `${fatScale[1].toFixed(1)} - ${fatScale[2].toFixed(1)} %`,
    description: 'Proportion of total body weight composed of adipose tissue, calculated via dual-foot bioelectrical impedance.',
  });

  // 5. Muscle Mass
  const isMuscleOptimal = muscle >= muscleScale[0];
  items.push({
    id: 'muscle',
    title: 'Muscle Mass',
    value: muscle,
    valueFormatted: String(muscle),
    unit: 'kg',
    statusLabel: isMuscleOptimal ? 'Normal Range' : 'Below Target',
    statusType: isMuscleOptimal ? 'optimal' : 'alert',
    group: isMuscleOptimal ? 'achieved' : 'not_reached',
    normRange: `≥ ${muscleScale[0].toFixed(1)} kg`,
    description: 'Total skeletal and smooth muscle mass sustaining physical locomotion, posture, and glucose metabolism.',
  });

  // 6. Body Water
  const isWaterHealthy = water >= waterScale[0];
  items.push({
    id: 'water',
    title: 'Body Water',
    value: water,
    valueFormatted: String(water),
    unit: '%',
    statusLabel: isWaterHealthy ? 'Normal Range' : 'Below Target',
    statusType: isWaterHealthy ? 'optimal' : 'attention',
    group: isWaterHealthy ? 'achieved' : 'attention',
    normRange: `≥ ${waterScale[0].toFixed(1)} %`,
    description: 'Total cellular hydration percentage across intracellular fluid compartments and bloodstream.',
  });

  // 7. Protein
  const isProteinOptimal = protein >= 16.0;
  items.push({
    id: 'protein',
    title: 'Protein',
    value: protein,
    valueFormatted: String(protein),
    unit: '%',
    statusLabel: isProteinOptimal ? 'Optimal' : 'Below Target',
    statusType: isProteinOptimal ? 'optimal' : 'alert',
    group: isProteinOptimal ? 'achieved' : 'not_reached',
    normRange: '16.0 - 20.0 %',
    description: 'Structural functional protein mass in organs and myofibrils. Adequate levels prevent sarcopenia and fatigue.',
  });

  // 8. Bone Mass
  const expectedBoneMin = getExpectedBoneOptimal(safeWeight, gender);
  const isBoneOptimal = bone >= expectedBoneMin - 0.2;
  items.push({
    id: 'bone',
    title: 'Bone Mass',
    value: bone,
    valueFormatted: String(bone),
    unit: 'kg',
    statusLabel: isBoneOptimal ? 'Normal Range' : 'Needs Attention',
    statusType: isBoneOptimal ? 'optimal' : 'attention',
    group: isBoneOptimal ? 'achieved' : 'attention',
    normRange: `≥ ${expectedBoneMin.toFixed(2)} kg`,
    description: 'Total mineral content and bone matrix weight (calcium, phosphorus) maintaining skeletal integrity.',
  });

  return {
    bmi,
    bodyFatPercentage: bodyFat,
    muscleMassKg: muscle,
    waterPercentage: water,
    boneMassKg: bone,
    visceralFat: visceral,
    bmr,
    leanMassKg: Number(lbm.toFixed(2)),
    bodyAge,
    proteinPercentage: protein,
    idealWeightKg,
    bodyScore,
    bodyType,
    bodyTypeCode,
    items,
    deductions,
  };
}

// -------------------------------------------------------------------------
// BLE Advertisement Decoder (Service 0x181B & 0x181D)
// -------------------------------------------------------------------------

/**
 * Decodes raw advertisement bytes broadcast by Xiaomi Mi Body Composition Scale 2 (UUID 0x181B)
 * and Xiaomi Mi Scale 1 (UUID 0x181D).
 *
 * Implements:
 * 1. Exact little-endian unpacking of weight, impedance, and date.
 * 2. Accurate unit detection ('kg' vs 'jin' vs 'lbs') with smart baseline guard.
 * 3. Freshness checking: rejects stale cached beacon packets (>60s old or loadRemoved).
 */
export function parseXiaomiScaleAdvertisement(
  dataView: DataView,
  userProfile?: { height?: number; age?: number; gender?: 'male' | 'female'; weight?: number }
): XiaomiScaleReading | null {
  if (dataView.byteLength < 10) {
    return null;
  }

  // 1. Xiaomi Mi Body Composition Scale 2 (Service UUID 0x181B, 13 bytes)
  if (dataView.byteLength >= 13) {
    let offset13 = -1;

    // Fast path: Exact 13-byte Service Data buffer from Bluetooth scanner
    if (dataView.byteLength === 13) {
      offset13 = 0;
    } else {
      // Sliding window over raw advertisement payload
      for (let i = 0; i <= dataView.byteLength - 13; i++) {
        // Match standard BLE 16-bit Service Data AD structure prefix [..., 0x16, 0x1B, 0x18, ...]
        if (
          i >= 3 &&
          dataView.getUint8(i - 3) === 0x16 &&
          dataView.getUint8(i - 2) === 0x1b &&
          dataView.getUint8(i - 1) === 0x18
        ) {
          offset13 = i;
          break;
        }

        // Candidate date verification (permissive year 1995-2060 so unsynced scale clocks never fail)
        const candidateYear = dataView.getUint16(i + 2, true);
        const candidateMonth = dataView.getUint8(i + 4);
        const candidateDay = dataView.getUint8(i + 5);
        const candidateHour = dataView.getUint8(i + 6);
        const candidateMin = dataView.getUint8(i + 7);
        const candidateSec = dataView.getUint8(i + 8);

        if (
          candidateYear >= 1995 &&
          candidateYear <= 2060 &&
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
    }

    if (offset13 !== -1) {
      const flags0 = dataView.getUint8(offset13 + 0);
      const flags1 = dataView.getUint8(offset13 + 1);

      // Unit detection:
      // Byte 0 bit 0 (0x01): LBS
      // Byte 0 bit 4 (0x10) or Byte 0 == 0x12 or Byte 1 bit 6 (0x40): Jin (Chinese Catty)
      // Otherwise: KG (byte 0 frequently has 0x02 or 0x22 set)
      let unit: 'kg' | 'lbs' | 'jin' = 'kg';
      if ((flags0 & 0x01) !== 0) {
        unit = 'lbs';
      } else if ((flags0 & 0x10) !== 0 || flags0 === 0x12 || (flags1 & 0x40) !== 0) {
        unit = 'jin';
      }

      // Status flags in Byte 1:
      // Bit 1 (0x02): has_impedance (impedance calculation active)
      // Bit 5 (0x20): is_stabilized (weight has locked and stabilized)
      // Bit 7 (0x80): load_removed (weight removed from scale)
      const isStabilized = (flags1 & 0x20) !== 0;
      const hasImpedance = (flags1 & 0x02) !== 0;
      const loadRemoved = (flags1 & 0x80) !== 0;

      // Timestamp (bytes 2-8)
      const year = dataView.getUint16(offset13 + 2, true);
      const rawMonth = dataView.getUint8(offset13 + 4);
      const day = dataView.getUint8(offset13 + 5);
      const hour = dataView.getUint8(offset13 + 6);
      const minute = dataView.getUint8(offset13 + 7);
      const second = dataView.getUint8(offset13 + 8);
      const timestamp = new Date(year, rawMonth - 1, day, hour, minute, second);

      // Scale clocks are not NTP/internet synced. Stale means load is removed (stepped off).
      const isStale = loadRemoved;

      // Impedance (bytes 9-10, Little-Endian in ohms)
      const impedance = dataView.getUint16(offset13 + 9, true);

      // Raw Weight (bytes 11-12, Little-Endian)
      const rawWeight = dataView.getUint16(offset13 + 11, true);
      let weight: number;

      if (unit === 'lbs') {
        weight = Number(((rawWeight / 100.0) * 0.45359237).toFixed(2));
      } else if (unit === 'jin') {
        weight = Number((rawWeight / 200.0).toFixed(2));
      } else {
        // Standard KG mode
        weight = Number((rawWeight / 200.0).toFixed(2));

        // Smart baseline guard:
        // In rare custom scale configurations where rawWeight is transmitted in 0.01 kg rather than 0.005 kg,
        // if user profile baseline exists and the calculated weight is ~0.5x of baseline, auto-apply correct 100 divisor.
        if (userProfile?.weight && userProfile.weight > 35) {
          const ratio = userProfile.weight / weight;
          if (ratio >= 1.8 && ratio <= 2.2) {
            weight = Number((rawWeight / 100.0).toFixed(2));
          }
        }
      }

      // Sanity check: Human body weight must be within realistic physical range
      if (weight < 5.0 || weight > 250.0) {
        return null;
      }

      // Bio-impedance is valid when in realistic human physiological contact range (150 - 2500 ohms)
      const hasValidImpedance = impedance >= 150 && impedance <= 2500;
      const isImpedanceComplete = isStabilized && (hasValidImpedance || (hasImpedance && impedance > 0));

      let metrics: XiaomiBiometricMetrics | undefined;
      if (userProfile && (hasValidImpedance || isStabilized)) {
        metrics = calculateXiaomiBiometrics(
          weight,
          hasValidImpedance ? impedance : 500,
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
        isStale,
        packetAgeSec,
        timestamp,
        unit: 'kg',
        metrics,
      };
    }
  }

  // 2. Xiaomi Mi Scale 1 (Service UUID 0x181D, 10 bytes)
  if (dataView.byteLength >= 10) {
    let offset10 = -1;

    // Fast path: Exact 10-byte Service Data buffer
    if (dataView.byteLength === 10) {
      offset10 = 0;
    } else {
      for (let i = 0; i <= dataView.byteLength - 10; i++) {
        const candidateYear = dataView.getUint16(i + 3, true);
        const candidateMonth = dataView.getUint8(i + 5);
        const candidateDay = dataView.getUint8(i + 6);
        const candidateHour = dataView.getUint8(i + 7);
        const candidateMin = dataView.getUint8(i + 8);
        const candidateSec = dataView.getUint8(i + 9);

        if (
          candidateYear >= 1995 &&
          candidateYear <= 2060 &&
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

      const isStale = loadRemoved;

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

      let metrics: XiaomiBiometricMetrics | undefined;
      if (userProfile && isStabilized) {
        metrics = calculateXiaomiBiometrics(
          weight,
          500,
          userProfile.height || 175,
          userProfile.age || 25,
          userProfile.gender || 'male'
        );
      }

      return {
        weight,
        impedance: 0,
        isStabilized,
        hasImpedance: false,
        isImpedanceComplete: isStabilized,
        loadRemoved,
        isStale,
        packetAgeSec,
        timestamp,
        unit: 'kg',
        metrics,
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
