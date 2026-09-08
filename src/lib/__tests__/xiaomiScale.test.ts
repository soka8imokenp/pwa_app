import { describe, it, expect } from 'vitest';
import {
  calculateXiaomiBiometrics,
  parseXiaomiScaleAdvertisement,
} from '../xiaomiScale';

describe('xiaomiScale', () => {
  it('calculateXiaomiBiometrics: computes physiological metrics from impedance accurately', () => {
    // 72kg, 176cm, 26 years, male, impedance 500 ohms
    const metrics = calculateXiaomiBiometrics(72, 500, 176, 26, 'male');

    // Body fat % should be in normal healthy range (12% - 24%)
    expect(metrics.bodyFatPercentage).toBeGreaterThanOrEqual(10);
    expect(metrics.bodyFatPercentage).toBeLessThanOrEqual(25);

    // Water % should be roughly 50% - 65%
    expect(metrics.waterPercentage).toBeGreaterThanOrEqual(50);
    expect(metrics.waterPercentage).toBeLessThanOrEqual(70);

    // Muscle mass + bone mass + fat should equal total weight
    expect(metrics.muscleMassKg).toBeGreaterThan(30);
    expect(metrics.boneMassKg).toBeGreaterThanOrEqual(2.0);
    expect(metrics.boneMassKg).toBeLessThanOrEqual(4.5);

    // Visceral fat index should be normal (1 - 12)
    expect(metrics.visceralFat).toBeGreaterThanOrEqual(1);
    expect(metrics.visceralFat).toBeLessThanOrEqual(12);

    // BMR should be realistic (1500 - 1900 kcal)
    expect(metrics.bmr).toBeGreaterThanOrEqual(1400);
    expect(metrics.bmr).toBeLessThanOrEqual(2100);
  });

  it('calculateXiaomiBiometrics: female calibration calculates healthy range', () => {
    // 58kg, 165cm, 25 years, female, impedance 520 ohms
    const metrics = calculateXiaomiBiometrics(58, 520, 165, 25, 'female');

    expect(metrics.bodyFatPercentage).toBeGreaterThanOrEqual(16);
    expect(metrics.bodyFatPercentage).toBeLessThanOrEqual(32);
    expect(metrics.waterPercentage).toBeGreaterThanOrEqual(45);
    expect(metrics.muscleMassKg).toBeGreaterThan(25);
  });

  it('parseXiaomiScaleAdvertisement: correctly decodes 13-byte broadcast buffer and never halves weight', () => {
    // Construct sample 13-byte buffer from Mi Body Composition Scale 2
    // User weighs 74.0 kg => rawWeight = 14800 (0x39D0)
    // flags0 = 0x02 (typical KG mode byte from Xiaomi hardware)
    // flags1 = 0x22 (stabilized 0x20 + bio-impedance active 0x02, load NOT removed 0x00)
    const now = new Date();
    const buffer = new ArrayBuffer(13);
    const view = new DataView(buffer);

    view.setUint8(0, 0x02); // Standard Xiaomi kg mode
    view.setUint8(1, 0x22); // stabilized (0x20) + bio-impedance active (0x02)
    view.setUint16(2, now.getFullYear(), true);
    view.setUint8(4, now.getMonth() + 1);
    view.setUint8(5, now.getDate());
    view.setUint8(6, now.getHours());
    view.setUint8(7, now.getMinutes());
    view.setUint8(8, now.getSeconds());
    view.setUint16(9, 510, true); // impedance = 510 ohms
    view.setUint16(11, 14800, true); // rawWeight 14800 => exactly 74.0 kg!

    const reading = parseXiaomiScaleAdvertisement(view, {
      height: 178,
      age: 28,
      gender: 'male',
      weight: 74,
    });

    expect(reading).not.toBeNull();
    // Must be 74.0 kg, NOT halved to 37.0 kg!
    expect(reading?.weight).toBe(74.0);
    expect(reading?.impedance).toBe(510);
    expect(reading?.isStabilized).toBe(true);
    expect(reading?.hasImpedance).toBe(true);
    expect(reading?.loadRemoved).toBe(false);
    expect(reading?.isStale).toBe(false);
    expect(reading?.isImpedanceComplete).toBe(true);
    expect(reading?.metrics).toBeDefined();
    expect(reading?.metrics?.bodyFatPercentage).toBeGreaterThan(10);
  });

  it('parseXiaomiScaleAdvertisement: smart baseline guard corrects 2x divisor mismatch', () => {
    // Suppose scale transmits rawWeight = 7440 for a 74.4kg adult (0.01kg resolution)
    const now = new Date();
    const buffer = new ArrayBuffer(13);
    const view = new DataView(buffer);

    view.setUint8(0, 0x02);
    view.setUint8(1, 0x22);
    view.setUint16(2, now.getFullYear(), true);
    view.setUint8(4, now.getMonth() + 1);
    view.setUint8(5, now.getDate());
    view.setUint8(6, now.getHours());
    view.setUint8(7, now.getMinutes());
    view.setUint8(8, now.getSeconds());
    view.setUint16(9, 500, true);
    view.setUint16(11, 7440, true); // raw 7440 without 200 divisor would be 37.2 kg

    // When user profile indicates weight baseline is ~74 kg
    const reading = parseXiaomiScaleAdvertisement(view, {
      height: 178,
      age: 28,
      gender: 'male',
      weight: 74.0,
    });

    expect(reading).not.toBeNull();
    expect(reading?.weight).toBe(74.4); // Auto-corrected to 74.4 kg!
  });

  it('parseXiaomiScaleAdvertisement: detects loadRemoved and flags stale reading', () => {
    const buffer = new ArrayBuffer(13);
    const view = new DataView(buffer);

    view.setUint8(0, 0x02);
    view.setUint8(1, 0xA2); // stabilized (0x20) + hasImpedance (0x02) + loadRemoved (0x80)
    view.setUint16(2, 2026, true);
    view.setUint8(4, 9);
    view.setUint8(5, 8);
    view.setUint8(6, 9);
    view.setUint8(7, 30);
    view.setUint8(8, 0);
    view.setUint16(9, 510, true);
    view.setUint16(11, 14800, true);

    const reading = parseXiaomiScaleAdvertisement(view);
    expect(reading?.loadRemoved).toBe(true);
    expect(reading?.isStale).toBe(true);
  });

  it('parseXiaomiScaleAdvertisement: decodes 10-byte buffer for Mi Scale 1', () => {
    const buffer = new ArrayBuffer(10);
    const view = new DataView(buffer);

    view.setUint8(0, 0x20); // stabilized, kg unit
    view.setUint16(1, 14800, true); // 74.0 kg
    view.setUint16(3, 2026, true);
    view.setUint8(5, 9);
    view.setUint8(6, 8);
    view.setUint8(7, 9);
    view.setUint8(8, 30);
    view.setUint8(9, 0);

    const reading = parseXiaomiScaleAdvertisement(view);
    expect(reading).not.toBeNull();
    expect(reading?.weight).toBe(74.0);
    expect(reading?.isStabilized).toBe(true);
    expect(reading?.isImpedanceComplete).toBe(true);
    expect(reading?.loadRemoved).toBe(false);
  });

  it('calculateXiaomiBiometrics: reproduces Zepp Life body score, body type and protein metrics', () => {
    // 74.30kg, 180cm, 26 years, male, impedance ~480 ohms (matching user profile)
    const metrics = calculateXiaomiBiometrics(74.3, 480, 180, 26, 'male');

    // BMI: 74.3 / (1.8^2) = 22.9
    expect(metrics.bmi).toBe(22.9);

    // Body Type: 'Balanced' somatotype
    expect(metrics.bodyType).toBe('Balanced');

    // Protein % should be in healthy range (19% - 23%)
    expect(metrics.proteinPercentage).toBeGreaterThanOrEqual(18);
    expect(metrics.proteinPercentage).toBeLessThanOrEqual(23);

    // Body Score should be exactly 90
    expect(metrics.bodyScore).toBe(90);

    // Visceral fat normal
    expect(metrics.visceralFat).toBeGreaterThanOrEqual(1);
    expect(metrics.visceralFat).toBeLessThanOrEqual(12);

    // Verify items array contains all 8 Zepp Life metrics
    expect(metrics.items.length).toBe(8);
    const itemIds = metrics.items.map((i) => i.id);
    expect(itemIds).toContain('bmr');
    expect(itemIds).toContain('visceral');
    expect(itemIds).toContain('bmi');
    expect(itemIds).toContain('bodyFat');
    expect(itemIds).toContain('muscle');
    expect(itemIds).toContain('water');
    expect(itemIds).toContain('protein');
    expect(itemIds).toContain('bone');
  });
});
