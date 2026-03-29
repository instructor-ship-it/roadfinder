import { describe, it, expect } from 'vitest';
import {
  calculateMaxHoldTime,
  PREPARE_TO_STOP_DISTANCE_M,
  ADV_QUEUE_WARNING_DISTANCE_M,
} from './max-hold-time';

describe('calculateMaxHoldTime', () => {
  it('should return null for zero VPH', () => {
    expect(calculateMaxHoldTime(0, 10)).toBeNull();
  });

  it('should return null for negative VPH', () => {
    expect(calculateMaxHoldTime(-5, 10)).toBeNull();
  });

  it('should calculate H005 example: 100 VPH/direction, 28.8% heavy', () => {
    const result = calculateMaxHoldTime(100, 28.8);
    expect(result).not.toBeNull();

    // Queue growth rate = (100/60) * ((71.2/100 * 6.0) + (28.8/100 * 20.0))
    // = 1.667 * (4.272 + 5.76) = 1.667 * 10.032 = 16.72 m/min
    // Max hold time = 100 / 16.72 ≈ 5.98 min
    expect(result!.maxHoldTimeMinutes).toBeGreaterThanOrEqual(5.5);
    expect(result!.maxHoldTimeMinutes).toBeLessThanOrEqual(6.5);

    // Recommended stop should be 5 min (since max is between 5 and 10)
    expect(result!.recommendedStopMinutes).toBe(5);

    // Queue at recommended stop (5 min)
    // 16.72 * 5 ≈ 83.6 → 84m
    expect(result!.queueAtRecommendedStop).toBeGreaterThan(70);
    expect(result!.queueAtRecommendedStop).toBeLessThanOrEqual(90);

    expect(result!.vphPerDirection).toBe(100);
    expect(result!.heavyPercent).toBe(28.8);
  });

  it('should calculate with 0% heavy vehicles (pure light)', () => {
    const result = calculateMaxHoldTime(200, 0);
    expect(result).not.toBeNull();

    // Queue growth rate = (200/60) * ((100/100 * 6.0) + (0/100 * 20.0))
    // = 3.333 * 6.0 = 20.0 m/min
    // Max hold = 100 / 20 = 5.0 min
    expect(result!.maxHoldTimeMinutes).toBe(5);
    expect(result!.queueGrowthRate).toBe(20);

    // At 5 min max hold → can't safely do 5, so recommended = 2
    // Actually: maxHoldTimeMinutes <= 5 → recommendedStopMinutes = 2
    expect(result!.recommendedStopMinutes).toBe(2);
  });

  it('should calculate with 100% heavy vehicles (pure heavy)', () => {
    const result = calculateMaxHoldTime(200, 100);
    expect(result).not.toBeNull();

    // Queue growth rate = (200/60) * ((0/100 * 6.0) + (100/100 * 20.0))
    // = 3.333 * 20.0 = 66.67 m/min
    // Max hold = 100 / 66.67 = 1.5 min
    expect(result!.maxHoldTimeMinutes).toBeLessThanOrEqual(2);
    expect(result!.recommendedStopMinutes).toBe(2);
  });

  it('should flag belowMinimum when max hold < 2 minutes', () => {
    // Very high volume: 500 VPH/direction, 100% heavy
    // Queue growth = (500/60) * 20.0 = 166.67 m/min
    // Max hold = 100 / 166.67 ≈ 0.6 min → below minimum
    const result = calculateMaxHoldTime(500, 100);
    expect(result).not.toBeNull();
    expect(result!.maxHoldTimeMinutes).toBeLessThan(2);
    expect(result!.belowMinimum).toBe(true);
    expect(result!.recommendedStopMinutes).toBe(2); // still shows minimum bracket
  });

  it('should not flag belowMinimum when max hold >= 2 minutes', () => {
    const result = calculateMaxHoldTime(100, 28.8);
    expect(result).not.toBeNull();
    expect(result!.maxHoldTimeMinutes).toBeGreaterThanOrEqual(5.5);
    expect(result!.belowMinimum).toBe(false);
  });

  it('should select correct recommended stop bracket for high volume', () => {
    // Low volume: 30 VPH/direction, 10% heavy
    // Queue growth = (30/60) * ((90/100 * 6.0) + (10/100 * 20.0))
    // = 0.5 * (5.4 + 2.0) = 0.5 * 7.4 = 3.7 m/min
    // Max hold = 100 / 3.7 ≈ 27 min → recommended = 10
    const result = calculateMaxHoldTime(30, 10);
    expect(result).not.toBeNull();
    expect(result!.recommendedStopMinutes).toBe(10);
  });

  it('should select 2min bracket for very high volume', () => {
    // High volume: 500 VPH/direction, 10% heavy
    // Queue growth = (500/60) * ((90/100 * 6.0) + (10/100 * 20.0))
    // = 8.333 * (5.4 + 2.0) = 8.333 * 7.4 = 61.67 m/min
    // Max hold = 100 / 61.67 ≈ 1.62 min → recommended = 2
    const result = calculateMaxHoldTime(500, 10);
    expect(result).not.toBeNull();
    expect(result!.recommendedStopMinutes).toBe(2);
    expect(result!.maxHoldTimeMinutes).toBeLessThanOrEqual(2);
  });

  it('should select 5min bracket for medium-high volume', () => {
    // 150 VPH/direction, 10% heavy
    // Queue growth = (150/60) * 7.4 = 2.5 * 7.4 = 18.5 m/min
    // Max hold = 100 / 18.5 ≈ 5.4 min → recommended = 5
    const result = calculateMaxHoldTime(150, 10);
    expect(result).not.toBeNull();
    expect(result!.recommendedStopMinutes).toBe(5);
  });

  it('should use correct vehicle lengths', () => {
    const result = calculateMaxHoldTime(100, 50);
    expect(result).not.toBeNull();
    expect(result!.lightVehicleLengthM).toBe(6.0);
    expect(result!.heavyVehicleLengthM).toBe(20.0);
  });

  it('should export correct sign distance constants', () => {
    expect(PREPARE_TO_STOP_DISTANCE_M).toBe(100);
    expect(ADV_QUEUE_WARNING_DISTANCE_M).toBe(300);
  });
});
