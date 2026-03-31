/**
 * Traffic Calculation Utilities
 *
 * Shared functions for shuttle flow length, lane capacity, and reduction factors.
 * Based on AGTTM Part 2 Tables 3.1 & 3.5 and MRWA COP Table 15.
 *
 * Canonical source — used by TrafficSection.tsx and page.tsx.
 */

/**
 * Get shuttle flow length and risk flag based on VPH (both directions).
 * Based on AGTTM Part 2, Table 3.5 & MRWA COP Table 15.
 *
 * @param vph - Combined VPH for both directions
 * @returns Object with length string and risk flag
 */
export function getShuttleFlowLength(vph: number): { length: string; risk: boolean } {
  if (vph >= 701) return { length: '70m', risk: false };
  if (vph >= 601) return { length: '100m', risk: false };
  if (vph >= 501) return { length: '150m', risk: false };
  if (vph >= 401) return { length: '250m', risk: false };
  if (vph >= 351) return { length: '400m', risk: false };
  if (vph >= 301) return { length: '600m', risk: false }; // AGTTM Table 3.5: ≤300 VPH → 800m
  if (vph >= 251) return { length: '800m', risk: false };
  if (vph >= 201) return { length: '1200m', risk: true }; // MRWA COP Table 15: exceeds AGTTM
  if (vph >= 151) return { length: '1600m', risk: true }; // MRWA COP Table 15: exceeds AGTTM
  return { length: '2200m', risk: true }; // MRWA COP Table 15: exceeds AGTTM
}

/**
 * Get required lane count based on VPH (one direction, near intersection).
 * Based on AGTTM Part 2, Table 3.1.
 *
 * @param vph - VPH for one direction
 * @returns Lane count string
 */
export function getLaneCapacity(vph: number): string {
  if (vph <= 1000) return '1 lane';
  if (vph <= 2000) return '2 lanes';
  if (vph <= 3000) return '3 lanes';
  return '4+ lanes';
}

/**
 * Apply heavy vehicle reduction factor.
 * MRWA COP: >10% heavy vehicles → 20% reduction.
 *
 * @param heavyVehiclePercent - Heavy vehicle percentage (0-100)
 * @returns Reduction factor (0.8 or 1.0)
 */
export function getHeavyVehicleReductionFactor(heavyVehiclePercent: number): number {
  return heavyVehiclePercent > 10 ? 0.8 : 1;
}
