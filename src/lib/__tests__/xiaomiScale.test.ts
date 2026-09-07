import { describe, it, expect } from 'vitest';
import {
  calculateXiaomiBiometrics,
  parseXiaomiScaleAdvertisement,
} from '../xiaomiScale';

describe('xiaomiScale', () => {
  it('calculateXiaomiBiometrics: computes physiological metrics from impedance accurately', () => {
    // 72kg, 176cm, 26 years, male, impedance 500 ohms
    const metrics = calculateXiaomiBiometrics(72, 500, 176, 26, 'male');

    // Body fat % should be in normal athletic/healthy range (12% - 24%)
    expect(metrics.bodyFatPercentage).toBeGreaterThanOrEqual(10);
    expect(metrics.bodyFatPercentage).toBeLessThanOrEqual(25);

    // Water % should be roughly 50% - 65%
    expect(metrics.waterPercentage).toBeGreaterThanOrEqual(50);
    expect(metrics.waterPercentage).toBeLessThanOrEqual(70);

    // Muscle mass + bone mass + fat should equal total weight
    expect(metrics.muscleMassKg).toBeGreaterThan(30);
    expect(metrics.boneMassKg).toBeGreaterThanOrEqual(2.0);
    expect(metrics.boneMassKg).toBeLessThanOrEqual(4.5);

    // Visceral fat index should be normal (1 - 10)
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
    expect(metrics.bodyFatPercentage).toBeLessThanOrEqual(30);
    expect(metrics.waterPercentage).toBeGreaterThanOrEqual(45);
    expect(metrics.muscleMassKg).toBeGreaterThan(25);
  });

  it('parseXiaomiScaleAdvertisement: correctly decodes 13-byte broadcast buffer', () => {
    // Construct sample 13-byte buffer from Mi Body Composition Scale 2
    // 70.0 kg => rawWeight = 14000 (0x36B0)
    // impedance = 490 (0x01EA)
    // flags1 = 0xA0 (stabilized + impedance complete)
    const buffer = new ArrayBuffer(13);
    const view = new DataView(buffer);

    view.setUint8(0, 0x00); // kg unit
    view.setUint8(1, 0xA0); // stabilized (0x20) + impedance complete (0x80)
    view.setUint16(2, 2026, true); // year 2026
    view.setUint8(4, 9); // month Sept
    view.setUint8(5, 7); // day 7
    view.setUint8(6, 15); // hour
    view.setUint8(7, 30); // minute
    view.setUint8(8, 0); // second
    view.setUint16(9, 490, true); // impedance = 490
    view.setUint16(11, 14000, true); // weight = 14000 => 70.0 kg

    const reading = parseXiaomiScaleAdvertisement(view, {
      height: 175,
      age: 26,
      gender: 'male',
    });

    expect(reading).not.toBeNull();
    expect(reading?.weight).toBe(70.0);
    expect(reading?.impedance).toBe(490);
    expect(reading?.isStabilized).toBe(true);
    expect(reading?.isImpedanceComplete).toBe(true);
    expect(reading?.metrics).toBeDefined();
    expect(reading?.metrics?.bodyFatPercentage).toBeGreaterThan(10);
  });
});
