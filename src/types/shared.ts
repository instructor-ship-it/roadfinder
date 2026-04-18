/**
 * Shared Type Definitions
 *
 * Canonical source for interfaces used across multiple components.
 * Import these instead of redefining locally.
 *
 * @module types/shared
 * @version 1.34.0
 */

// ─── Weather Types ───────────────────────────────────────────────────────

/**
 * Current weather conditions
 */
export interface WeatherData {
  location: string;
  current: {
    temp: number;
    humidity: number;
    windSpeed: number;
    windDir: string;
    windGust: number;
    condition: string;
  };
  sun: {
    sunrise: string;
    sunset: string;
    daylightHours: string;
    uvIndex: number;
    uvLevel: string;
  };
  forecast: Array<{
    time: string;
    temp: number;
    windSpeed: number;
    windDir: string;
    condition: string;
  }>;
  fromCache?: boolean;
  cachedAt?: number;
  source?: string;
  dataUnavailable?: boolean;
  cachedLocation?: { lat: number; lon: number };
}

/**
 * Weather warning item
 */
export interface WarningItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  category: string;
  urgency: string;
  severity: string;
}

/**
 * Weather warnings data
 */
export interface WarningData {
  warnings: WarningItem[];
  count: number;
  lastUpdated: string;
  source: string;
}

// ─── Traffic Types ───────────────────────────────────────────────────────

/**
 * Traffic volume data for a road
 */
export interface TrafficData {
  road_id: string;
  road_name?: string;
  aadt: number;
  aadt_year: string;
  heavy_vehicle_percent: number;
  peak_hour_volume: number;
  aadt_weekday?: number;
  peak_hour_volume_weekday?: number;
  heavy_vehicle_weekday_pct?: number;
  source: string;
  distance_to_site?: number;
  nearest_sites?: Array<{
    site_no: string;
    location: string;
    year: string;
    aadt: number;
    heavy_percent: number;
    distance_km: number | null;
  }>;
  note?: string;
  fromCache?: boolean;
  cachedAt?: number;
}

// ─── Saved Location Types ───────────────────────────────────────────────

/**
 * Saved work location
 */
export interface SavedLocation {
  id: string;
  name: string;
  road_id: string;
  road_name: string;
  region: string;
  start_slk: number;
  end_slk: number | null;
  created_at: string;
}

/**
 * Saved location creation input
 */
export interface CreateSavedLocationInput {
  name: string;
  road_id: string;
  road_name: string;
  region: string;
  start_slk: number;
  end_slk?: number | null;
}

// ─── Road Types ───────────────────────────────────────────────────────

/**
 * Basic road information
 */
export interface RoadInfo {
  road_id: string;
  road_name: string;
  road_type?: string;
  region?: string;
  min_slk?: number;
  max_slk?: number;
  network_type?: string;
}

/**
 * Road segment with geometry
 */
export interface RoadSegment {
  road_id: string;
  road_name: string;
  start_slk: number;
  end_slk: number;
  carriageway?: string;
  geometry?: [number, number][];
}

/**
 * Road search result
 */
export interface RoadSearchResult {
  road_id: string;
  road_name: string;
  region: string;
  network_type: string;
  distance_m?: number;
  slk?: number;
}

// ─── Speed Zone Types ───────────────────────────────────────────────

/**
 * Speed zone data
 */
export interface SpeedZone {
  road_id: string;
  road_name: string;
  start_slk: number;
  end_slk: number;
  speed_limit: number;
  carriageway: 'Left' | 'Right' | 'Single';
  is_default?: boolean;
  is_override?: boolean;
  override_id?: string;
  override_note?: string;
  override_source?: 'default' | 'community_verified' | 'mrwa_corrected';
  sign_face_increasing?: number;
  sign_face_decreasing?: number;
}

/**
 * Speed sign override (community verified)
 */
export interface SpeedSignOverride {
  id: string;
  road_id: string;
  road_name: string;
  common_usage_name?: string;
  slk: number;
  lat?: number;
  lon?: number;
  direction: 'True Left' | 'True Right';
  sign_type: 'Single' | 'Double';
  replicated: boolean;
  start_slk: number;
  end_slk?: number;
  approach_speed?: number;
  front_speed: number;
  back_speed?: number;
  verified_by?: string;
  verified_date?: string;
  note?: string;
  source: 'community_verified' | 'mrwa_corrected';
}

// ─── GPS Types ───────────────────────────────────────────────────────

/**
 * GPS position data
 */
export interface GpsPosition {
  lat: number;
  lon: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

/**
 * GPS tracking state
 */
export interface GpsTrackingState {
  position: GpsPosition | null;
  roadInfo: RoadSearchResult | null;
  currentSpeed: number;
  speedLimit: number;
  isSpeeding: boolean;
  isTracking: boolean;
  error: string | null;
}

// ─── API Response Types ───────────────────────────────────────────────

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  fromCache?: boolean;
  cachedAt?: number;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── UI Component Types ───────────────────────────────────────────────

/**
 * Select option for dropdowns
 */
export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

/**
 * Form field error
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Toast notification type
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

// ─── Settings Types ───────────────────────────────────────────────

/**
 * User application settings
 */
export interface UserSettings {
  // Display
  theme: 'light' | 'dark' | 'system';
  units: 'metric' | 'imperial';

  // GPS
  gpsHighAccuracy: boolean;
  gpsUpdateInterval: number;

  // Offline
  autoDownloadOfflineData: boolean;
  offlineDataRegions: string[];

  // AI Features
  aiApiKey?: string;
  aiModel?: string;

  // Sync
  googleSheetsUrl?: string;
  autoSync: boolean;
}

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'system',
  units: 'metric',
  gpsHighAccuracy: true,
  gpsUpdateInterval: 500,
  autoDownloadOfflineData: false,
  offlineDataRegions: [],
  autoSync: false,
};

// ─── Signage Types ───────────────────────────────────────────────

/**
 * Signage item for corridor report
 */
export interface SignageItem {
  slk: number;
  carriageway: string;
  category: 'speed' | 'regulatory' | 'warning' | 'railway' | 'intersection';
  sign_type: string;
  description: string;
  action: string;
  nearIntersection?: {
    roadName: string;
    roadId: string;
    intersectionSlk: number;
    distanceToIntersection: number;
  };
  speedLimit?: number;
  sign_face_increasing?: number;
  sign_face_decreasing?: number;
  replicated?: boolean;
  override_id?: string;
}

// ─── Document Library Types ───────────────────────────────────────────────

/**
 * Library document metadata
 */
export interface LibraryDocument {
  id: string;
  title: string;
  category: string;
  filename: string;
  size: number;
  lastModified: string;
  offlineAvailable: boolean;
  url: string;
}

/**
 * Library category
 */
export interface LibraryCategory {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
}

// ─── Event Logger Types ───────────────────────────────────────────────

/**
 * Traffic event log entry
 */
export interface TrafficEventLog {
  id: string;
  timestamp: string;
  eventType: string;
  location?: {
    road_id: string;
    road_name: string;
    slk: number;
  };
  notes?: string;
  weather?: string;
}

// ─── Aftercare Types ───────────────────────────────────────────────

/**
 * Signage record for aftercare
 */
export interface SignageRecord {
  id: string;
  road_id: string;
  road_name: string;
  slk: number;
  sign_type: string;
  condition: 'good' | 'fair' | 'poor' | 'missing';
  installed_date?: string;
  inspected_date?: string;
  notes?: string;
  photo_url?: string;
}

// ─── Utility Types ───────────────────────────────────────────────

/**
 * Geographic coordinate
 */
export interface Coordinate {
  lat: number;
  lon: number;
}

/**
 * Bounding box
 */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Distance with unit
 */
export interface Distance {
  value: number;
  unit: 'm' | 'km';
}

/**
 * Time duration
 */
export interface Duration {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours';
}

/**
 * Makes all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the type of array elements
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
