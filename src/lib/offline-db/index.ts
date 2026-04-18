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
 * @version 1.34.0
 *
 * @example
 * // Search for a road by GPS coordinates
 * const road = await findRoadNearGps(-31.95, 115.86, 0.5);
 *
 * @example
 * // Get speed zones for a road
 * const zones = await getSpeedZones('H001');
 * const { speedLimit } = getSpeedLimitForDirection(zones, 50.0, 'increasing');
 */

// ============================================================================
// Types
// ============================================================================

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
} from './types';

// ============================================================================
// Database Core
// ============================================================================

export {
  DB_NAME,
  DB_VERSION,
  initDB,
  isOfflineDataAvailable,
  getOfflineMetadata,
  clearOfflineData,
  getOfflineDataStats,
} from './db-core';

// ============================================================================
// Speed Zones
// ============================================================================

export {
  // Speed sign overrides
  loadSpeedSignOverrides,
  getSpeedSignOverrides,
  clearSpeedOverridesCache,
  getSpeedOverridesMetadata,
  signsToSpeedZones,
  // Speed zones
  getSpeedZones,
  getSpeedLimitForDirection,
  getSpeedSignsNearSlk,
  // Speed zone corrections
  getSpeedZoneCorrections,
  addSpeedZoneCorrection,
  removeSpeedZoneCorrection,
  clearSpeedZoneCorrections,
  applySpeedZoneCorrections,
  // Storage
  storeSpeedZones,
  storeSpeedZonesData,
  correctDefaultZones,
  // Legacy aliases
  getSpeedOverrides,
  loadSpeedOverrides,
} from './speed-zones';

// ============================================================================
// Signage
// ============================================================================

export {
  // Rail crossings
  getRailCrossings,
  storeRailCrossings,
  storeRailCrossingsData,
  // Regulatory signs
  getRegulatorySigns,
  storeRegulatorySigns,
  storeRegulatorySignsData,
  // Warning signs
  getWarningSigns,
  storeWarningSigns,
  storeWarningSignsData,
  // Corridor signage
  getSignageInCorridor,
} from './signage';

// ============================================================================
// Roads
// ============================================================================

export {
  storeRegionData,
  storeRoadsData,
  getStoredRegions,
  getRoadsForRegion,
  findRoadNearGps,
  getRoadInfoById,
  clearDataset,
} from './roads';

// ============================================================================
// Work Zone
// ============================================================================

export { getWorkZoneOffline, getWorkZoneFromOfflineDb } from './work-zone';

// ============================================================================
// Pavement
// ============================================================================

export { storePavementData, getPavementData, hasPavementData } from './pavement';

// ============================================================================
// Traffic
// ============================================================================

export { storeTrafficData, getTrafficData, getNearestTrafficData, hasTrafficData } from './traffic';

// ============================================================================
// Amenities
// ============================================================================

export {
  storeAmenitiesData,
  storeAllAmenitiesData,
  getAmenitiesData,
  getAllAmenitiesData,
  findNearestAmenities,
  hasAmenitiesData,
} from './amenities';

// ============================================================================
// Weather Cache
// ============================================================================

export {
  cacheWeatherData,
  getCachedWeatherData,
  clearWeatherCache,
  WEATHER_CACHE_KEY,
  WEATHER_CACHE_DURATION,
} from './weather-cache';

// ============================================================================
// Metadata
// ============================================================================

export {
  storeMetadata,
  storeDatasetMeta,
  getDatasetMeta,
  getAllDatasetMeta,
  getDetailedStats,
} from './metadata';
