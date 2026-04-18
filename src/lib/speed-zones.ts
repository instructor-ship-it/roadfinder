/**
 * Speed Zone Utilities
 *
 * Functions for managing speed zones and community-verified sign overrides.
 * Extracted from offline-db.ts for maintainability.
 *
 * @module lib/speed-zones
 */

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Speed sign override based on physical signage.
 *
 * Sign Types:
 * - Single + Not Replicated: Repeater sign (informational only, no zone created)
 * - Single + Replicated: Direction-specific zone (different speeds each direction)
 * - Double + Replicated: Creates two zones if front_speed ≠ back_speed
 *
 * Direction (Australian Left-Hand Driving):
 * - "True Left": Sign faces traffic travelling INCREASING SLK = Left Carriageway
 * - "True Right": Sign faces traffic travelling DECREASING SLK = Right Carriageway
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
  replicated: boolean;

  // Zone definition (only if replicated)
  start_slk: number;
  end_slk?: number;

  // Speeds
  approach_speed?: number;
  front_speed: number;
  back_speed?: number;

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
  is_default?: boolean;
  raw_text?: string;
  requires_verification?: boolean;
  speed_corrected?: boolean;
  correction_reason?: string;
  correction_confidence?: 'high' | 'medium' | 'low';

  // Override fields
  is_override?: boolean;
  override_id?: string;
  override_note?: string;
  override_source?: 'default' | 'community_verified' | 'mrwa_corrected';

  // Sign face values
  sign_face_increasing?: number;
  sign_face_decreasing?: number;
  replicated?: boolean;
}

/**
 * Manual speed zone correction
 */
export interface SpeedZoneCorrection {
  road_id: string;
  start_slk: number;
  end_slk: number;
  direction: 'increasing' | 'decreasing';
  correct_speed: number;
  original_speed: number;
  notes?: string;
  created_at: string;
}

// ─── Storage Keys ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'speed-sign-overrides';
const CORRECTIONS_KEY = 'speedZoneCorrections';

// ─── Cached Data ────────────────────────────────────────────────────────────

let cachedSigns: SpeedSignOverride[] | null = null;

// ─── Speed Sign Overrides ──────────────────────────────────────────────────

/**
 * Load speed sign overrides from localStorage
 *
 * @returns Array of speed sign overrides
 *
 * @example
 * const signs = await loadSpeedSignOverrides();
 * console.log(`Loaded ${signs.length} overrides`);
 */
export async function loadSpeedSignOverrides(): Promise<SpeedSignOverride[]> {
  if (cachedSigns) {
    return cachedSigns;
  }

  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const signs: SpeedSignOverride[] = data.signs || [];
      cachedSigns = signs;
      return cachedSigns;
    }
  } catch (error) {
    console.error('[SpeedZones] Failed to load speed overrides:', error);
  }

  return [];
}

/**
 * Get speed sign overrides for a specific road
 *
 * @param roadId - Road ID to filter by (empty string for all)
 * @returns Array of speed sign overrides
 *
 * @example
 * const roadSigns = await getSpeedSignOverrides('H001');
 * const allSigns = await getSpeedSignOverrides(''); // All signs
 */
export async function getSpeedSignOverrides(roadId: string): Promise<SpeedSignOverride[]> {
  const signs = await loadSpeedSignOverrides();

  if (!roadId || roadId === '') {
    return signs;
  }

  const normalizedRoadId = roadId.trim().toUpperCase();
  return signs.filter((s) => s.road_id.trim().toUpperCase() === normalizedRoadId);
}

/**
 * Clear the cached signs (call when signs are updated)
 */
export function clearSpeedOverridesCache(): void {
  cachedSigns = null;
}

/**
 * Get metadata about speed overrides
 */
export async function getSpeedOverridesMetadata(): Promise<{
  version: string;
  last_updated: string;
  total_overrides: number;
  roads_affected: string[];
}> {
  if (typeof window === 'undefined') {
    return { version: '0', last_updated: '', total_overrides: 0, roads_affected: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: { version?: string; last_updated?: string; signs?: SpeedSignOverride[] } =
        JSON.parse(stored);
      const roads: string[] = [...new Set((data.signs || []).map((s) => s.road_id))];
      return {
        version: data.version || '0',
        last_updated: data.last_updated || '',
        total_overrides: data.signs?.length || 0,
        roads_affected: roads,
      };
    }
  } catch {
    // Ignore errors
  }

  return { version: '0', last_updated: '', total_overrides: 0, roads_affected: [] };
}

// ─── Sign to Zone Conversion ───────────────────────────────────────────────

/**
 * Convert speed signs to parsed speed zones
 *
 * Logic:
 * - Single + Not Replicated: No zone created (repeater sign only)
 * - Single + Replicated: Direction-specific zone
 * - Double + Replicated: Creates zone based on front_speed
 *
 * @param signs - Array of speed sign overrides
 * @returns Array of parsed speed zones
 */
export function signsToSpeedZones(signs: SpeedSignOverride[]): ParsedSpeedZone[] {
  const zones: ParsedSpeedZone[] = [];

  for (const sign of signs) {
    // Skip non-replicated single signs (repeaters don't define zones)
    if (sign.sign_type === 'Single' && !sign.replicated) {
      continue;
    }

    // Must have end_slk if replicated
    if (sign.replicated && !sign.end_slk) {
      console.warn(`[SpeedZones] Sign ${sign.id} is replicated but has no end_slk`);
      continue;
    }

    const zoneStartSlk = sign.start_slk !== undefined ? sign.start_slk : sign.slk;

    if (sign.sign_type === 'Double' && sign.replicated) {
      // Double-sided replicated sign
      const hasBackSpeed = sign.back_speed !== undefined && sign.back_speed !== null;

      let signFaceIncreasing: number;
      let signFaceDecreasing: number;

      if (sign.direction === 'True Right') {
        signFaceDecreasing = sign.front_speed;
        signFaceIncreasing = hasBackSpeed ? sign.back_speed! : sign.front_speed;
      } else {
        signFaceIncreasing = sign.front_speed;
        signFaceDecreasing = hasBackSpeed ? sign.back_speed! : sign.front_speed;
      }

      zones.push({
        road_id: sign.road_id,
        road_name: sign.road_name,
        start_slk: zoneStartSlk,
        end_slk: sign.end_slk!,
        speed_limit: sign.front_speed,
        carriageway: 'Single',
        is_override: true,
        override_id: sign.id,
        override_note: sign.note,
        override_source: sign.source,
        sign_face_increasing: signFaceIncreasing,
        sign_face_decreasing: signFaceDecreasing,
        replicated: true,
      });
    } else if (sign.sign_type === 'Single' && sign.replicated) {
      // Single + Replicated = Direction-specific zone
      const carriageway = sign.direction === 'True Right' ? 'Right' : 'Left';

      const signFaceIncreasing = sign.direction === 'True Left' ? sign.front_speed : undefined;
      const signFaceDecreasing = sign.direction === 'True Right' ? sign.front_speed : undefined;

      zones.push({
        road_id: sign.road_id,
        road_name: sign.road_name,
        start_slk: zoneStartSlk,
        end_slk: sign.end_slk!,
        speed_limit: sign.front_speed,
        carriageway: carriageway,
        is_override: true,
        override_id: sign.id,
        override_note: sign.note,
        override_source: sign.source,
        sign_face_increasing: signFaceIncreasing,
        sign_face_decreasing: signFaceDecreasing,
        replicated: true,
      });
    }
  }

  // Sort by start_slk
  zones.sort((a, b) => a.start_slk - b.start_slk);

  return zones;
}

// ─── Speed Zone Corrections ────────────────────────────────────────────────

/**
 * Get all stored speed zone corrections
 */
export function getSpeedZoneCorrections(): SpeedZoneCorrection[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CORRECTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a speed zone correction
 */
export function addSpeedZoneCorrection(correction: Omit<SpeedZoneCorrection, 'created_at'>): void {
  const corrections = getSpeedZoneCorrections();
  const newCorrection: SpeedZoneCorrection = {
    ...correction,
    created_at: new Date().toISOString(),
  };

  // Remove existing correction for same road/slk range/direction
  const filtered = corrections.filter(
    (c) =>
      !(
        c.road_id === correction.road_id &&
        c.start_slk === correction.start_slk &&
        c.end_slk === correction.end_slk &&
        c.direction === correction.direction
      )
  );

  filtered.push(newCorrection);
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(filtered));
}

/**
 * Remove a speed zone correction
 */
export function removeSpeedZoneCorrection(
  roadId: string,
  startSlk: number,
  endSlk: number,
  direction: 'increasing' | 'decreasing'
): void {
  const corrections = getSpeedZoneCorrections();
  const filtered = corrections.filter(
    (c) =>
      !(
        c.road_id === roadId &&
        c.start_slk === startSlk &&
        c.end_slk === endSlk &&
        c.direction === direction
      )
  );
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(filtered));
}

/**
 * Clear all speed zone corrections
 */
export function clearSpeedZoneCorrections(): void {
  localStorage.removeItem(CORRECTIONS_KEY);
}

/**
 * Apply speed zone corrections to determine the correct speed
 *
 * @param roadId - Road ID
 * @param slk - Current SLK position
 * @param slkDirection - Direction of travel
 * @param originalSpeedLimit - Original speed limit from zone
 * @returns Corrected speed limit if applicable
 */
export function applySpeedZoneCorrections(
  roadId: string,
  slk: number,
  slkDirection: 'increasing' | 'decreasing' | null,
  originalSpeedLimit: number
): number {
  if (!slkDirection) return originalSpeedLimit;

  const corrections = getSpeedZoneCorrections();

  const applicableCorrection = corrections.find(
    (c) =>
      c.road_id === roadId && slk >= c.start_slk && slk <= c.end_slk && c.direction === slkDirection
  );

  return applicableCorrection?.correct_speed ?? originalSpeedLimit;
}

// ─── Speed Limit Lookup ────────────────────────────────────────────────────

/**
 * Get speed limit considering direction of travel
 *
 * In WA road terminology:
 * - "True Left" = Left Carriageway = INCREASING SLK direction
 * - "True Right" = Right Carriageway = DECREASING SLK direction
 *
 * @param zones - Array of speed zones
 * @param slk - Current SLK position
 * @param slkDirection - Direction of travel
 * @param roadId - Optional road ID for corrections
 * @returns Speed limit info including zone and directional flags
 */
export function getSpeedLimitForDirection(
  zones: ParsedSpeedZone[],
  slk: number,
  slkDirection: 'increasing' | 'decreasing' | null,
  roadId?: string
): {
  speedLimit: number;
  zone: ParsedSpeedZone | null;
  hasDirectionalZones: boolean;
  hasCorrection: boolean;
} {
  const matchingZones = zones.filter((z) => slk >= z.start_slk && slk <= z.end_slk);

  if (matchingZones.length === 0) {
    return { speedLimit: 100, zone: null, hasDirectionalZones: false, hasCorrection: false };
  }

  const rightZones = matchingZones.filter((z) => z.carriageway === 'Right');
  const leftZones = matchingZones.filter((z) => z.carriageway === 'Left');
  const singleZones = matchingZones.filter((z) => z.carriageway === 'Single');

  const hasDirectionalZones = rightZones.length > 0 || leftZones.length > 0;

  let speedLimit: number;
  let zone: ParsedSpeedZone | null = null;

  if (hasDirectionalZones && slkDirection) {
    zone =
      slkDirection === 'increasing'
        ? leftZones[0] || rightZones[0] || singleZones[0]
        : rightZones[0] || leftZones[0] || singleZones[0];

    if (zone) {
      if (slkDirection === 'increasing' && zone.sign_face_increasing !== undefined) {
        speedLimit = zone.sign_face_increasing;
      } else if (slkDirection === 'decreasing' && zone.sign_face_decreasing !== undefined) {
        speedLimit = zone.sign_face_decreasing;
      } else {
        speedLimit = zone.speed_limit;
      }
    } else {
      speedLimit = 100;
    }
  } else if (singleZones.length > 0) {
    zone = singleZones[0];
    if (slkDirection === 'increasing' && zone.sign_face_increasing !== undefined) {
      speedLimit = zone.sign_face_increasing;
    } else if (slkDirection === 'decreasing' && zone.sign_face_decreasing !== undefined) {
      speedLimit = zone.sign_face_decreasing;
    } else {
      speedLimit = zone.speed_limit;
    }
  } else {
    zone = matchingZones[0];
    if (slkDirection === 'increasing' && zone.sign_face_increasing !== undefined) {
      speedLimit = zone.sign_face_increasing;
    } else if (slkDirection === 'decreasing' && zone.sign_face_decreasing !== undefined) {
      speedLimit = zone.sign_face_decreasing;
    } else {
      speedLimit = zone.speed_limit;
    }
  }

  let hasCorrection = false;
  if (roadId && slkDirection) {
    const correctedSpeed = applySpeedZoneCorrections(roadId, slk, slkDirection, speedLimit);
    if (correctedSpeed !== speedLimit) {
      hasCorrection = true;
      speedLimit = correctedSpeed;
    }
  }

  return { speedLimit, zone, hasDirectionalZones, hasCorrection };
}

// ─── Legacy Aliases ────────────────────────────────────────────────────────

export type SpeedZoneOverride = SpeedSignOverride;
export const getSpeedOverrides = getSpeedSignOverrides;
export const loadSpeedOverrides = loadSpeedSignOverrides;
