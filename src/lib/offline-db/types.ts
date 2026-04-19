/**
 * Type definitions for Offline Database
 *
 * Contains all interfaces and types used across the offline-db modules.
 *
 * @module lib/offline-db/types
 */

// ============================================================================
// Speed Sign Overrides (Community-Verified Corrections)
// ============================================================================

/**
 * Speed sign override based on physical signage.
 *
 * Sign Types:
 * - Single + Not Replicated: Repeater sign (informational only, no zone created)
 * - Single + Replicated: Direction-specific zone (different speeds each direction)
 * - Double + Replicated: Creates two zones (one for each direction) if front_speed ≠ back_speed
 *
 * Direction (Australian Left-Hand Driving):
 * - "True Left": Sign faces traffic travelling INCREASING SLK = Left Carriageway
 * - "True Right": Sign faces traffic travelling DECREASING SLK = Right Carriageway
 *
 * For Double-sided signs:
 * - front_speed: Speed shown on the face pointing in 'direction' (True Left or True Right)
 * - back_speed: Speed shown on the opposite face (for opposite direction traffic)
 *
 * Example: On M031, a sign at SLK 64.81 facing "True Left":
 * - front_speed (80) applies to INCREASING SLK traffic (Left Carriageway)
 * - back_speed (110) applies to DECREASING SLK traffic (Right Carriageway)
 */
export interface SpeedSignOverride {
  id: string;
  road_id: string;
  road_name: string;
  common_usage_name?: string;

  // Sign location
  slk: number;
  lat?: number;
  lon?: number;

  // Sign configuration
  direction: 'True Left' | 'True Right';
  sign_type: 'Single' | 'Double';
  replicated: boolean; // Is there a matching sign on the other side of road?

  // Zone definition (only if replicated)
  start_slk: number;
  end_slk?: number;

  // Speeds
  approach_speed?: number; // Speed BEFORE this sign in selected direction
  front_speed: number; // Speed shown on front face (selected direction)
  back_speed?: number; // Speed on back face (opposite direction) - only for Double

  // Verification
  verified_by?: string;
  verified_date?: string;
  note?: string;
  source: 'community_verified' | 'mrwa_corrected';

  // MRWA comparison
  mrwa_slk?: number;
  discrepancy_m?: number;
}

/**
 * Parsed speed zone with numeric speed_limit
 */
export interface ParsedSpeedZone {
  road_id: string;
  road_name: string;
  start_slk: number;
  end_slk: number;
  speed_limit: number;
  carriageway: string;
  is_default?: boolean; // True for default/unrestricted zones (state limit applies)
  raw_text?: string; // Original MRWA text for verification
  requires_verification?: boolean; // Flag for zones needing site verification
  speed_corrected?: boolean; // True if this zone was corrected from default
  correction_reason?: string; // Reason for the correction
  correction_confidence?: 'high' | 'medium' | 'low'; // Confidence level
  // Override fields
  is_override?: boolean; // True if this zone is from an override
  override_id?: string; // ID of the override
  override_note?: string; // Note from the override
  override_source?: 'default' | 'community_verified' | 'mrwa_corrected'; // Source of override
  // Sign face values for display (what each direction sees AT THE BOUNDARY)
  sign_face_increasing?: number; // What increasing SLK traffic sees on sign face
  sign_face_decreasing?: number; // What decreasing SLK traffic sees on sign face
  replicated?: boolean; // Is there a matching sign on opposite side?
}

// ============================================================================
// Signage Data Types
// ============================================================================

/**
 * Rail Crossing data
 */
export interface RailCrossingData {
  road_id: string;
  road_name: string;
  slk: number;
  carriageway: string;
  crossing_type: string; // Public, Private
  crossing_no: string;
}

/**
 * Regulatory Sign data
 */
export interface RegulatorySignData {
  road_id: string;
  road_name: string;
  slk: number;
  carriageway: string;
  sign_type: string;
  panel_design: string;
  panel_meaning: string;
}

/**
 * Warning Sign data
 */
export interface WarningSignData {
  road_id: string;
  road_name: string;
  slk: number;
  carriageway: string;
  sign_type: string;
  panel_design: string;
  panel_meaning: string;
}

/**
 * Sign for corridor report
 */
export interface SignageItem {
  slk: number;
  carriageway: string;
  category: 'speed' | 'regulatory' | 'warning' | 'railway' | 'intersection';
  sign_type: string;
  description: string;
  action: string;
  // Intersection context for speed signs near intersections
  nearIntersection?: {
    roadName: string;
    roadId: string;
    intersectionSlk: number;
    distanceToIntersection: number; // in meters
  };
  // Speed limit value if applicable
  speedLimit?: number;
  // Sign face values for speed signs (what each direction sees)
  sign_face_increasing?: number; // What increasing SLK traffic sees
  sign_face_decreasing?: number; // What decreasing SLK traffic sees
  replicated?: boolean; // Is there a matching sign on the other side?
  override_id?: string; // Community sign ID if applicable
}

/**
 * Speed zone with directional info for regulatory sign cross-reference
 */
export interface SpeedSignInfo {
  slk: number;
  carriageway: string;
  sign_type: string;
}

/**
 * Manual speed zone correction for cases where MRWA data is incorrect
 */
export interface SpeedZoneCorrection {
  road_id: string;
  start_slk: number;
  end_slk: number;
  direction: 'increasing' | 'decreasing'; // True Left = increasing SLK, True Right = decreasing SLK
  correct_speed: number;
  original_speed: number;
  notes?: string;
  created_at: string;
}

// ============================================================================
// Dataset Metadata
// ============================================================================

/**
 * Dataset metadata for tracking sync status
 */
export interface DatasetMetadata {
  dataset: string;
  lastSync: string;
  recordCount: number;
  source: 'static' | 'mrwa';
}

// ============================================================================
// Pavement Data
// ============================================================================

/**
 * Pavement data structure (Layer 12) - lanes, widths, shoulders
 */
export interface PavementData {
  road_id: string;
  road_name: string;
  start_slk: number;
  end_slk: number;
  lanes: number | null;
  trafficable_width: number | null;
  cwy: string;
  total_pave_width: number | null;
  total_seal_width: number | null;
  sealed_shoulder_l: number | null;
  sealed_shoulder_r: number | null;
  unsealed_shoulder_l: number | null;
  unsealed_shoulder_r: number | null;
  kerb_l: string | null;
  kerb_r: string | null;
}

// ============================================================================
// Traffic Volume Data
// ============================================================================

/**
 * Traffic site data (Layer 27)
 */
export interface TrafficSite {
  site_no: string;
  location_desc: string;
  traffic_year: string | null;
  collection_type: string;
  aadt: number | null;
  aadt_weekday: number | null;
  aadt_weekend: number | null;
  heavy_vehicle_pct: number | null;
  heavy_vehicle_weekday_pct: number | null;
  heavy_vehicle_weekend_pct: number | null;
  region: string | null;
  local_government: string | null;
}

/**
 * Traffic data grouped by road name
 */
export interface TrafficData {
  road_name: string;
  sites: TrafficSite[];
}

// ============================================================================
// Amenities Data
// ============================================================================

/**
 * Amenity place data (OpenStreetMap)
 */
export interface AmenityPlace {
  name: string;
  type: 'hospital' | 'fuel' | 'toilet';
  lat: number;
  lon: number;
  distance?: number;
  address?: string;
  phone?: string;
  opening_hours?: string;
  emergency?: boolean;
}

/**
 * Amenities cache structure
 */
export interface AmenitiesCache {
  region: string;
  hospitals: AmenityPlace[];
  fuelStations: AmenityPlace[];
  toilets: AmenityPlace[];
  last_updated: string;
}

// ============================================================================
// Weather Cache
// ============================================================================

/**
 * Cached weather data structure
 */
export interface CachedWeather {
  lat: number;
  lon: number;
  data: any; // Weather data structure
  cached_at: string;
  location?: string;
}

// ============================================================================
// Internal Types (not exported but used across modules)
// ============================================================================

/**
 * Speed signs file structure
 */
export interface SpeedSignsFile {
  version: string;
  last_updated: string;
  description: string;
  disclaimer: string;
  signs: SpeedSignOverride[];
}

/**
 * Speed zone data structure (from MRWA)
 */
export interface SpeedZoneData {
  road_id: string;
  road_name: string;
  start_slk: number;
  end_slk: number;
  speed_limit: number | string; // Can be number or "110km/h" string from MRWA
  carriageway: string;
  is_default?: boolean; // True for default/unrestricted zones
  raw_text?: string; // Original MRWA text for verification
  requires_verification?: boolean; // Flag for zones needing site verification
  speed_corrected?: boolean; // True if this zone was corrected from default
  correction_reason?: string; // Reason for the correction
  correction_confidence?: 'high' | 'medium' | 'low'; // Confidence level
  correction_note?: string; // Additional notes
}

/**
 * Road data structure for offline storage
 */
export interface RoadData {
  road_id: string;
  road_name: string;
  min_slk: number;
  max_slk: number;
  network_type: string;
  segments: Array<{
    start_slk: number;
    end_slk: number;
    geometry: [number, number][] | null;
  }>;
}

// Legacy compatibility alias
export type SpeedZoneOverride = SpeedSignOverride;
