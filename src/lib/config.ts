/**
 * Application Configuration
 *
 * Centralized configuration constants including storage keys,
 * API endpoints, and other application settings.
 *
 * @module lib/config
 * @version 1.35.0
 */

// ─── Application Info ─────────────────────────────────────────────────────

export const APP_CONFIG = {
  name: 'TC Work Zone Locator',
  version: '1.35.0',
  description: 'Traffic Control Work Zone Locator for Western Australia',
  author: 'TC Work Zone Locator Team',
} as const;

// ─── IndexedDB Configuration ───────────────────────────────────────────────

export const DB_CONFIG = {
  name: 'RoadFinderDB',
  version: 7,
  stores: {
    regions: 'regions',
    speedZones: 'speedZones',
    metadata: 'metadata',
    railCrossings: 'railCrossings',
    regulatorySigns: 'regulatorySigns',
    warningSigns: 'warningSigns',
    datasetMeta: 'datasetMeta',
    pavementData: 'pavementData',
    trafficData: 'trafficData',
    amenitiesData: 'amenitiesData',
    savedLocations: 'savedLocations',
  },
} as const;

// ─── localStorage Keys ─────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  // Speed Zone Overrides
  speedOverrides: 'speed-sign-overrides',
  speedZoneCorrections: 'speedZoneCorrections',
  speedSignSelection: 'speed-sign-selection',

  // Saved Locations
  savedLocations: 'savedLocations',
  savedLocationsMigrated: 'savedLocationsMigrated',

  // User Settings
  gpsTrackingConfig: 'gpsTrackingConfig',
  theme: 'theme',
  offlineDataRegions: 'offlineDataRegions',
  dataSourceToggles: 'dataSourceToggles',

  // Traffic Event Logger
  trafficEvents: 'trafficEvents',
  eventLoggerConfig: 'eventLoggerConfig',
  cloudSyncUrl: 'cloudSyncUrl',
  cloudSyncSecret: 'cloudSyncSecret',

  // AfterCare
  aftercareJobs: 'aftercare-jobs',
  aftercareSelection: 'aftercare-selection',

  // Q&A
  qaHistory: 'qa-history',
  qaFavorites: 'qa-favorites',

  // Contacts
  contacts: 'contacts',

  // Other
  lastViewedOnboarding: 'lastViewedOnboarding',
  maxHoldTimeHistory: 'maxHoldTimeHistory',
  cycleTimerHistory: 'cycleTimerHistory',
  downloadFolder: 'downloadFolder',
  cachedDocs: 'cachedDocs',
  deletedCaches: 'deletedCaches',
} as const;

// ─── Cache Keys ────────────────────────────────────────────────────────────

export const CACHE_KEYS = {
  weatherPrefix: 'weatherCache_',
  geocodePrefix: 'geocodeCache_',
  placesPrefix: 'placesCache_',
} as const;

// ─── Cache Durations (in milliseconds) ─────────────────────────────────────

export const CACHE_DURATIONS = {
  weather: 30 * 60 * 1000, // 30 minutes
  geocode: 24 * 60 * 60 * 1000, // 24 hours
  places: 60 * 60 * 1000, // 1 hour
  traffic: 60 * 60 * 1000, // 1 hour
  amenities: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// ─── API Configuration ─────────────────────────────────────────────────────

export const API_CONFIG = {
  // MRWA ArcGIS
  mrwaBaseUrl: 'https://portal-mainroads.opendata.arcgis.com',
  mrwaRoadsLayer: 17,
  mrwaSpeedZonesLayer: 8,
  mrwaIntersectionsLayer: 6,
  mrwaRailCrossingsLayer: 22,
  mrwaRegulatorySignsLayer: 20,
  mrwaWarningSignsLayer: 21,
  mrwaPavementLayer: 12,
  mrwaTrafficLayer: 27,

  // Open-Meteo Weather
  weatherBaseUrl: 'https://api.open-meteo.com/v1',

  // Overpass (OpenStreetMap)
  overpassBaseUrl: 'https://overpass-api.de/api/interpreter',

  // Nominatim (Geocoding)
  nominatimBaseUrl: 'https://nominatim.openstreetmap.org',

  // Request Timeouts
  defaultTimeout: 5000, // 5 seconds
  longTimeout: 30000, // 30 seconds
  gpsTimeout: 10000, // 10 seconds
} as const;

// ─── GPS Configuration ─────────────────────────────────────────────────────

export const GPS_CONFIG = {
  // Default tracking options
  enableHighAccuracy: true,
  maximumAge: 500, // 500ms
  timeout: 10000, // 10 seconds

  // EKF settings
  maxPredictionTime: 30000, // 30 seconds
  stationaryThreshold: 2, // km/h

  // Update intervals
  defaultUpdateInterval: 500, // 500ms
  slowUpdateInterval: 2000, // 2 seconds

  // Throttle intervals by speed
  throttleIntervals: {
    high: 2000, // > 80 km/h
    medium: 1000, // 40-80 km/h
    low: 750, // 10-40 km/h
    stopped: 1500, // < 10 km/h
  },
} as const;

// ─── Traffic Control Defaults ──────────────────────────────────────────────

export const TC_DEFAULTS = {
  // TC Position offset from work zone
  positionOffset: 100, // meters

  // Signage corridor range
  signageCorridorRange: 700, // meters

  // Speed zone threshold for survey discrepancies
  slkThreshold: 0.02, // km (~20m)

  // Maximum speed drop per transition
  maxSpeedDrop: 30, // km/h

  // State speed limits
  defaultUrbanLimit: 50, // km/h
  defaultRuralLimit: 110, // km/h
} as const;

// ─── Map Configuration ─────────────────────────────────────────────────────

export const MAP_CONFIG = {
  // Default center (Perth, WA)
  defaultCenter: {
    lat: -31.9505,
    lon: 115.8605,
  },
  defaultZoom: 13,

  // Tile layer
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '© OpenStreetMap contributors',

  // Google Maps
  googleMapsBaseUrl: 'https://www.google.com/maps',
  streetViewBaseUrl: 'https://www.google.com/maps/@?api=1&map_action=pano',
} as const;

// ─── Feature Flags ─────────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  enableEKF: true,
  enableOfflineMode: true,
  enableCloudSync: true,
  enableAIAssistant: true,
  enableAfterCare: true,
} as const;

// ─── Limits ────────────────────────────────────────────────────────────────

export const LIMITS = {
  // Saved locations (now unlimited with IndexedDB, kept for compatibility)
  maxSavedLocations: Infinity,

  // Q&A history
  maxQAHistory: 100,

  // Event logger
  maxEvents: 1000,

  // Search results
  maxSearchResults: 100,

  // Input lengths
  maxRoadNameLength: 200,
  maxNotesLength: 2000,
  maxLocationNameLength: 100,
} as const;

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Get a storage key with optional prefix
 */
export function getStorageKey(key: keyof typeof STORAGE_KEYS, prefix?: string): string {
  return prefix ? `${prefix}_${STORAGE_KEYS[key]}` : STORAGE_KEYS[key];
}

/**
 * Get a cache key with location parameters
 */
export function getWeatherCacheKey(lat: number, lon: number): string {
  return `${CACHE_KEYS.weatherPrefix}${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

/**
 * Get a geocode cache key
 */
export function getGeocodeCacheKey(lat: number, lon: number): string {
  return `${CACHE_KEYS.geocodePrefix}${lat.toFixed(4)}_${lon.toFixed(4)}`;
}

/**
 * Check if cache is expired
 */
export function isCacheExpired(cachedAt: number, duration: number): boolean {
  return Date.now() - cachedAt > duration;
}

const config = {
  APP_CONFIG,
  DB_CONFIG,
  STORAGE_KEYS,
  CACHE_KEYS,
  CACHE_DURATIONS,
  API_CONFIG,
  GPS_CONFIG,
  TC_DEFAULTS,
  MAP_CONFIG,
  FEATURE_FLAGS,
  LIMITS,
};

export default config;
