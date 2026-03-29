// Maximum Hold Time Calculator
// Calculates the maximum safe hold time for traffic control based on queue growth rate.
// Used to determine how long traffic can be held before the queue reaches
// the "Prepare to Stop" sign position (100m behind TC).

// Standard sign distances from TC (hard-coded)
export const PREPARE_TO_STOP_DISTANCE_M = 100;
export const ADV_QUEUE_WARNING_DISTANCE_M = 300;

// Vehicle sizes (body + stopped gap)
const LIGHT_VEHICLE_LENGTH_M = 6.0;
const HEAVY_VEHICLE_LENGTH_M = 20.0;

export interface MaxHoldTimeResult {
  maxHoldTimeMinutes: number;
  recommendedStopMinutes: number;
  queueGrowthRate: number; // metres per minute
  queueAtRecommendedStop: number; // metres
  vphPerDirection: number;
  heavyPercent: number;
  lightVehicleLengthM: number;
  heavyVehicleLengthM: number;
}

export function calculateMaxHoldTime(
  vphPerDirection: number,
  heavyPercent: number
): MaxHoldTimeResult | null {
  if (vphPerDirection <= 0) return null;

  const lightPct = (100 - heavyPercent) / 100;
  const heavyPct = heavyPercent / 100;

  const avgVehicleLength = lightPct * LIGHT_VEHICLE_LENGTH_M + heavyPct * HEAVY_VEHICLE_LENGTH_M;
  const arrivalRatePerMin = vphPerDirection / 60;
  const queueGrowthRate = arrivalRatePerMin * avgVehicleLength;

  const maxHoldTimeMinutes = PREPARE_TO_STOP_DISTANCE_M / queueGrowthRate;

  // Recommended stop: round down to nearest standard bracket
  let recommendedStopMinutes: number;
  if (maxHoldTimeMinutes <= 2) {
    recommendedStopMinutes = 2;
  } else if (maxHoldTimeMinutes <= 5) {
    recommendedStopMinutes = 2; // If can't safely do 5, use 2
  } else if (maxHoldTimeMinutes <= 10) {
    recommendedStopMinutes = 5;
  } else {
    recommendedStopMinutes = 10;
  }

  const queueAtRecommendedStop = Math.round(queueGrowthRate * recommendedStopMinutes);

  return {
    maxHoldTimeMinutes: Math.round(maxHoldTimeMinutes * 10) / 10,
    recommendedStopMinutes,
    queueGrowthRate: Math.round(queueGrowthRate * 10) / 10,
    queueAtRecommendedStop,
    vphPerDirection,
    heavyPercent,
    lightVehicleLengthM: LIGHT_VEHICLE_LENGTH_M,
    heavyVehicleLengthM: HEAVY_VEHICLE_LENGTH_M,
  };
}
