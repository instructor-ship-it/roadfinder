/**
 * Client-side Offline Database
 *
 * Uses IndexedDB to store road data for fast offline access.
 * This module provides functions for:
 * - Road network data (search, lookup by GPS, SLK calculations)
 * - Speed zones and community-verified overrides
 * - Traffic signage (regulatory, warning, rail crossings)
 * - Amenities (hospitals, fuel, toilets)
 * - Weather caching
 *
 * @module lib/offline-db
 * @version 1.35.0
 *
 * @example
 * // Search for a road by GPS coordinates
 * const road = await findRoadNearGps(-31.95, 115.86, 0.5);
 *
 * @example
 * // Get speed zones for a road
 * const zones = await getSpeedZones('H001');
 * const { speedLimit } = getSpeedLimitForDirection(zones, 50.0, 'increasing');
 *
 * @deprecated This file is now a re-export module. Import from '@/lib/offline-db' still works.
 * The actual implementation is in the './offline-db' directory modules.
 */

// ============================================================================
// Re-export everything from the modular structure
// ============================================================================

// Types
export type {
  SpeedSignOverride,
  ParsedSpeedZone,
  RailCrossingData,
  RegulatorySignData,
  WarningSignData,
  SignageItem,
  SpeedSignInfo,
  SpeedZoneCorrection,
  DatasetMetadata,
  PavementData,
  TrafficSite,
  TrafficData,
  AmenityPlace,
  AmenitiesCache,
  CachedWeather,
  SpeedZoneOverride,
  RoadData,
} from './offline-db/types';

// Database Core
export {
  DB_NAME,
  DB_VERSION,
  initDB,
  isOfflineDataAvailable,
  getOfflineMetadata,
  clearOfflineData,
  getOfflineDataStats,
} from './offline-db/db-core';

// Speed Zones
export {
  loadSpeedSignOverrides,
  getSpeedSignOverrides,
  clearSpeedOverridesCache,
  getSpeedOverridesMetadata,
  signsToSpeedZones,
  getSpeedZones,
  getSpeedLimitForDirection,
  getSpeedSignsNearSlk,
  getSpeedZoneCorrections,
  addSpeedZoneCorrection,
  removeSpeedZoneCorrection,
  clearSpeedZoneCorrections,
  applySpeedZoneCorrections,
  storeSpeedZones,
  storeSpeedZonesData,
  correctDefaultZones,
  getSpeedOverrides,
  loadSpeedOverrides,
} from './offline-db/speed-zones';

// Signage
export {
  getRailCrossings,
  storeRailCrossings,
  storeRailCrossingsData,
  getRegulatorySigns,
  storeRegulatorySigns,
  storeRegulatorySignsData,
  getWarningSigns,
  storeWarningSigns,
  storeWarningSignsData,
  getSignageInCorridor,
} from './offline-db/signage';

// Roads
export {
  storeRegionData,
  storeRoadsData,
  getStoredRegions,
  getRoadsForRegion,
  findRoadNearGps,
  getRoadInfoById,
  clearDataset,
} from './offline-db/roads';

// Work Zone
export { getWorkZoneOffline } from './offline-db/work-zone';

// Pavement
export { storePavementData, getPavementData, hasPavementData } from './offline-db/pavement';

// Traffic
export {
  storeTrafficData,
  getTrafficData,
  getNearestTrafficData,
  hasTrafficData,
} from './offline-db/traffic';

// Amenities
export {
  storeAmenitiesData,
  storeAllAmenitiesData,
  getAmenitiesData,
  getAllAmenitiesData,
  findNearestAmenities,
  hasAmenitiesData,
} from './offline-db/amenities';

// Weather Cache
export {
  cacheWeatherData,
  getCachedWeatherData,
  clearWeatherCache,
  WEATHER_CACHE_KEY,
  WEATHER_CACHE_DURATION,
} from './offline-db/weather-cache';

// Metadata
export {
  storeMetadata,
  storeDatasetMeta,
  getDatasetMeta,
  getAllDatasetMeta,
  getDetailedStats,
} from './offline-db/metadata';
