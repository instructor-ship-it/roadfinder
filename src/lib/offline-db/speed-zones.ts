/**
 * Speed Zone Operations
 *
 * Contains speed sign overrides, speed zones, and speed zone corrections.
 *
 * @module lib/offline-db/speed-zones
 */

import { initDB } from './db-core';
import type {
  SpeedSignOverride,
  ParsedSpeedZone,
  SpeedSignInfo,
  SpeedZoneCorrection,
  SpeedZoneData,
  SpeedSignsFile,
} from './types';

// Storage key
const STORAGE_KEY = 'speed-sign-overrides';
const CORRECTIONS_KEY = 'speedZoneCorrections';

// Cached signs
let cachedSigns: SpeedSignOverride[] | null = null;

// ============================================================================
// Speed Sign Overrides (Community-Verified Corrections)
// ============================================================================

/**
 * Load speed sign overrides from localStorage (client) or default data (server)
 */
export async function loadSpeedSignOverrides(): Promise<SpeedSignOverride[]> {
  if (cachedSigns) {
    return cachedSigns;
  }

  // Server-side: return empty, will be loaded client-side
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
    console.error('Failed to load speed overrides:', error);
  }

  return [];
}

/**
 * Get speed sign overrides for a specific road
 * Pass empty string or null to get ALL signs
 */
export async function getSpeedSignOverrides(roadId: string): Promise<SpeedSignOverride[]> {
  const signs = await loadSpeedSignOverrides();
  // If roadId is empty or null, return all signs
  if (!roadId || roadId === '') {
    return signs;
  }
  // Normalize road_id for comparison (trim whitespace, uppercase)
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
 * Get all overrides metadata (for display in UI)
 */
export async function getSpeedOverridesMetadata(): Promise<{
  version: string;
  last_updated: string;
  total_overrides: number;
  roads_affected: string[];
}> {
  // Server-side: return defaults
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

/**
 * Convert speed signs to parsed speed zones for use in the app.
 *
 * Logic:
 * - Single + Not Replicated: No zone created (repeater sign only)
 * - Single + Replicated: Direction-specific zone (Left or Right carriageway)
 * - Double + Replicated + Same Speed: Single carriageway zone (same speed both directions)
 * - Double + Replicated + Different Speed: Two directional zones (different speeds each way)
 *
 * Australian Left-Hand Driving:
 * - True Left = sign faces INCREASING SLK traffic
 * - True Right = sign faces DECREASING SLK traffic
 *
 * For Double signs:
 * - Front face = what traffic in the sign's direction sees
 * - Back face = what traffic in the opposite direction sees
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
      console.warn(`Sign ${sign.id} is replicated but has no end_slk`);
      continue;
    }

    // Ensure start_slk defaults to slk if not set (RC 1.7.12)
    // This handles imported signs that might be missing start_slk
    const zoneStartSlk = sign.start_slk !== undefined ? sign.start_slk : sign.slk;

    if (sign.sign_type === 'Double' && sign.replicated) {
      // Double-sided replicated sign on single carriageway road
      // SPEED ZONE BOUNDARY RULE:
      // - front_speed = zone speed (what BOTH directions travel at WITHIN the zone)
      // - back_speed = sign face value only (what opposite direction sees AT BOUNDARY)

      const hasBackSpeed = sign.back_speed !== undefined && sign.back_speed !== null;

      // Calculate sign face values (what each direction sees on the sign)
      let signFaceIncreasing: number;
      let signFaceDecreasing: number;

      if (sign.direction === 'True Right') {
        // Sign faces decreasing SLK traffic
        // Front face = decreasing sees, Back face = increasing sees
        signFaceDecreasing = sign.front_speed;
        signFaceIncreasing = hasBackSpeed ? sign.back_speed! : sign.front_speed;
      } else {
        // Sign faces increasing SLK traffic (True Left)
        // Front face = increasing sees, Back face = decreasing sees
        signFaceIncreasing = sign.front_speed;
        signFaceDecreasing = hasBackSpeed ? sign.back_speed! : sign.front_speed;
      }

      // Create ONE zone - both directions travel at front_speed WITHIN the zone
      zones.push({
        road_id: sign.road_id,
        road_name: sign.road_name,
        start_slk: zoneStartSlk,
        end_slk: sign.end_slk!,
        speed_limit: sign.front_speed, // Zone speed for both directions
        carriageway: 'Single',
        is_override: true,
        override_id: sign.id,
        override_note: sign.note,
        override_source: sign.source,
        // Sign face values for display
        sign_face_increasing: signFaceIncreasing,
        sign_face_decreasing: signFaceDecreasing,
        replicated: true,
      });
    } else if (sign.sign_type === 'Single' && sign.replicated) {
      // Single + Replicated = Direction-specific zone (different signs each side)
      // True Left = INCREASING SLK = Left carriageway
      // True Right = DECREASING SLK = Right carriageway
      const carriageway = sign.direction === 'True Right' ? 'Right' : 'Left';

      // For single signs, the sign face is the same as the zone speed
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

// Legacy compatibility aliases
export const getSpeedOverrides = getSpeedSignOverrides;
export const loadSpeedOverrides = loadSpeedSignOverrides;

// ============================================================================
// Speed Zones (IndexedDB)
// ============================================================================

/**
 * Parse speed limit from various formats (number or "110km/h" string)
 */
function parseSpeedLimit(speedLimit: number | string): number {
  if (typeof speedLimit === 'number') {
    return speedLimit;
  }
  if (typeof speedLimit === 'string') {
    const match = speedLimit.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 100; // Default
}

/**
 * Get speed zones for a road, with sign-based overrides applied
 *
 * Priority:
 * 1. Community-verified signs converted to zones
 * 2. MRWA data from IndexedDB
 */
export async function getSpeedZones(roadId: string): Promise<ParsedSpeedZone[]> {
  try {
    // First, get sign overrides for this road and convert to zones
    const signs = await getSpeedSignOverrides(roadId);
    const overrideZones = signsToSpeedZones(signs);

    // Get MRWA data from IndexedDB
    const db = await initDB();
    const mrwaZones = await new Promise<ParsedSpeedZone[]>((resolve) => {
      const tx = db.transaction('speedZones', 'readonly');
      const store = tx.objectStore('speedZones');
      const request = store.get(roadId);

      request.onsuccess = () => {
        const zones = request.result?.zones || [];
        // Parse speed limits to numbers
        const parsedZones: ParsedSpeedZone[] = zones.map((zone: SpeedZoneData) => ({
          road_id: zone.road_id,
          road_name: zone.road_name,
          start_slk: zone.start_slk,
          end_slk: zone.end_slk,
          speed_limit: parseSpeedLimit(zone.speed_limit),
          carriageway: zone.carriageway,
        }));
        resolve(parsedZones);
      };

      request.onerror = () => resolve([]);
    });

    // If no overrides, just return MRWA data
    if (overrideZones.length === 0) {
      return mrwaZones;
    }

    // Filter out MRWA zones that are superseded by community overrides
    // SLK_THRESHOLD = 0.02 km (~20m) - accounts for GPS/survey discrepancies
    const SLK_THRESHOLD = 0.02;

    const filteredMrwaZones = mrwaZones.filter((mrwa) => {
      for (const override of overrideZones) {
        // If override completely contains the MRWA zone, don't include MRWA zone
        if (override.start_slk <= mrwa.start_slk && override.end_slk >= mrwa.end_slk) {
          return false;
        }
        // If MRWA zone starts within an override, skip it
        if (mrwa.start_slk >= override.start_slk && mrwa.start_slk < override.end_slk) {
          return false;
        }
        // If MRWA zone starts very close to override start (within threshold),
        // the override supersedes it (accounts for survey discrepancies)
        if (Math.abs(mrwa.start_slk - override.start_slk) <= SLK_THRESHOLD) {
          return false;
        }
      }
      return true;
    });

    // Combine filtered MRWA zones with override zones
    const combinedZones = [...filteredMrwaZones, ...overrideZones];

    // Sort by start_slk
    combinedZones.sort((a, b) => a.start_slk - b.start_slk);

    return combinedZones;
  } catch {
    return [];
  }
}

/**
 * Get speed limit considering direction of travel (True Right vs True Left)
 *
 * In WA road terminology:
 * - "True Left" = Left Carriageway = INCREASING SLK direction
 * - "True Right" = Right Carriageway = DECREASING SLK direction
 *
 * For bidirectional zones with different speed limits:
 * - If SLK direction is INCREASING, use Left carriageway speed
 * - If SLK direction is DECREASING, use Right carriageway speed
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
  // Find zones that contain this SLK
  const matchingZones = zones.filter((z) => slk >= z.start_slk && slk <= z.end_slk);

  if (matchingZones.length === 0) {
    return { speedLimit: 100, zone: null, hasDirectionalZones: false, hasCorrection: false };
  }

  // Check if we have directional zones (Right/Left carriageways)
  const rightZones = matchingZones.filter((z) => z.carriageway === 'Right');
  const leftZones = matchingZones.filter((z) => z.carriageway === 'Left');
  const singleZones = matchingZones.filter((z) => z.carriageway === 'Single');

  const hasDirectionalZones = rightZones.length > 0 || leftZones.length > 0;

  let speedLimit: number;
  let zone: ParsedSpeedZone | null = null;

  // If we have directional zones, use them based on travel direction
  if (hasDirectionalZones && slkDirection) {
    // INCREASING SLK = Left carriageway (True Left)
    // DECREASING SLK = Right carriageway (True Right)
    zone =
      slkDirection === 'increasing'
        ? leftZones[0] || rightZones[0] || singleZones[0]
        : rightZones[0] || leftZones[0] || singleZones[0];

    if (zone) {
      // Use sign face values for double-sided signs based on travel direction
      // Double-sided signs have different speeds visible to each direction
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
    // Fall back to Single carriageway zone
    zone = singleZones[0];
    // Check for sign face values even on single zones
    if (slkDirection === 'increasing' && zone.sign_face_increasing !== undefined) {
      speedLimit = zone.sign_face_increasing;
    } else if (slkDirection === 'decreasing' && zone.sign_face_decreasing !== undefined) {
      speedLimit = zone.sign_face_decreasing;
    } else {
      speedLimit = zone.speed_limit;
    }
  } else {
    // Last resort: use first matching zone
    zone = matchingZones[0];
    // Check for sign face values
    if (slkDirection === 'increasing' && zone.sign_face_increasing !== undefined) {
      speedLimit = zone.sign_face_increasing;
    } else if (slkDirection === 'decreasing' && zone.sign_face_decreasing !== undefined) {
      speedLimit = zone.sign_face_decreasing;
    } else {
      speedLimit = zone.speed_limit;
    }
  }

  // Apply manual corrections if roadId is provided
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

/**
 * Get speed signs near a specific SLK for validation
 * Returns regulatory signs within 200m of the given SLK
 */
export async function getSpeedSignsNearSlk(
  roadId: string,
  slk: number,
  radiusKm: number = 0.2
): Promise<SpeedSignInfo[]> {
  try {
    // Import getRegulatorySigns from signage module
    const { getRegulatorySigns } = await import('./signage');
    const signs = await getRegulatorySigns(roadId);

    // Filter to speed restriction signs (R4-1 series)
    const speedSigns = signs.filter(
      (s) => s.panel_design?.startsWith('R4-1') || s.panel_meaning?.toUpperCase().includes('SPEED')
    );

    // Filter to signs within radius
    const nearbySigns = speedSigns.filter((s) => Math.abs(s.slk - slk) <= radiusKm);

    return nearbySigns.map((s) => ({
      slk: s.slk,
      carriageway: s.carriageway,
      sign_type: s.panel_design,
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// Manual Speed Zone Corrections
// ============================================================================

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

  // Remove any existing correction for the same road/SLK range/direction
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
 * Apply speed zone corrections to a road's speed zones
 * Returns the speed limit to use, or null if no correction applies
 */
export function applySpeedZoneCorrections(
  roadId: string,
  slk: number,
  slkDirection: 'increasing' | 'decreasing' | null,
  originalSpeedLimit: number
): number {
  if (!slkDirection) return originalSpeedLimit;

  const corrections = getSpeedZoneCorrections();

  // Find a correction that applies to this location
  const applicableCorrection = corrections.find(
    (c) =>
      c.road_id === roadId && slk >= c.start_slk && slk <= c.end_slk && c.direction === slkDirection
  );

  return applicableCorrection?.correct_speed ?? originalSpeedLimit;
}

// ============================================================================
// Speed Zone Storage
// ============================================================================

/**
 * Store speed zones (merges with existing zones for multi-region roads)
 */
export async function storeSpeedZones(zones: SpeedZoneData[]): Promise<void> {
  if (!zones.length) return;

  const db = await initDB();

  // Group new zones by road_id
  const byRoad = new Map<string, SpeedZoneData[]>();
  for (const zone of zones) {
    if (!byRoad.has(zone.road_id)) {
      byRoad.set(zone.road_id, []);
    }
    byRoad.get(zone.road_id)!.push(zone);
  }

  // First, get all existing zones for these roads (separate transaction)
  const existingZones = new Map<string, SpeedZoneData[]>();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('speedZones', 'readonly');
    const store = tx.objectStore('speedZones');

    let pending = byRoad.size;

    for (const road_id of byRoad.keys()) {
      const request = store.get(road_id);
      request.onsuccess = () => {
        if (request.result?.zones) {
          existingZones.set(road_id, request.result.zones);
        }
        pending--;
        if (pending === 0) resolve();
      };
      request.onerror = () => {
        pending--;
        if (pending === 0) resolve();
      };
    }

    tx.onerror = () => reject(tx.error);

    // Handle case where byRoad is empty
    if (pending === 0) resolve();
  });

  // Now merge and store in a single write transaction
  return new Promise((resolve, reject) => {
    const tx = db.transaction('speedZones', 'readwrite');
    const store = tx.objectStore('speedZones');

    for (const [road_id, newZones] of byRoad) {
      const existing = existingZones.get(road_id) || [];

      // Merge: create a map to dedupe by SLK range
      const mergedMap = new Map<string, SpeedZoneData>();

      // Add existing zones first
      for (const z of existing) {
        const key = `${z.start_slk}-${z.end_slk}-${z.carriageway}`;
        mergedMap.set(key, z);
      }

      // Add/overwrite with new zones
      for (const z of newZones) {
        const key = `${z.start_slk}-${z.end_slk}-${z.carriageway}`;
        mergedMap.set(key, z);
      }

      // Store merged result
      const mergedZones = Array.from(mergedMap.values());
      store.put({ road_id, zones: mergedZones });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Correct default speed zones based on adjacent zones
 * Default zones have text like "50km/h applies in built up areas or 110km/h outside built up areas"
 * Logic:
 *   - If adjacent zones are ≤80 km/h → built-up area → 50 km/h
 *   - If adjacent zones are ≥90 km/h → rural area → 110 km/h
 *   - Validate: no more than 30 km/h speed drop in one step (Australian standard)
 */
export function correctDefaultZones(zones: SpeedZoneData[]): SpeedZoneData[] {
  // Group zones by road for adjacency analysis
  const byRoad = new Map<string, SpeedZoneData[]>();
  for (const zone of zones) {
    if (!byRoad.has(zone.road_id)) {
      byRoad.set(zone.road_id, []);
    }
    byRoad.get(zone.road_id)!.push(zone);
  }

  // Sort each road's zones by SLK
  for (const [_, roadZones] of byRoad) {
    roadZones.sort((a, b) => a.start_slk - b.start_slk);
  }

  const corrected: SpeedZoneData[] = [];

  for (const zone of zones) {
    // Only correct default zones
    if (!zone.is_default) {
      corrected.push(zone);
      continue;
    }

    const roadZones = byRoad.get(zone.road_id) || [];

    // Find adjacent zones (overlapping or nearby SLK ranges)
    const adjacentZones = roadZones.filter(
      (z) =>
        z.road_id === zone.road_id &&
        z.carriageway === zone.carriageway &&
        !z.is_default && // Only use non-default zones for context
        // Zone starts within or adjacent to this zone
        ((z.start_slk >= zone.start_slk - 1 && z.start_slk <= zone.end_slk + 1) ||
          // Zone ends within or adjacent to this zone
          (z.end_slk >= zone.start_slk - 1 && z.end_slk <= zone.end_slk + 1) ||
          // Zone encompasses this zone
          (z.start_slk <= zone.start_slk && z.end_slk >= zone.end_slk))
    );

    if (adjacentZones.length === 0) {
      // No adjacent zones to determine context - keep as 110
      corrected.push({
        ...zone,
        speed_limit: 110,
        correction_note: 'No adjacent zones found - using rural default',
      });
      continue;
    }

    // Count low-speed vs high-speed adjacent zones
    const lowSpeedAdjacents = adjacentZones.filter((z) => {
      const speed = typeof z.speed_limit === 'number' ? z.speed_limit : 110;
      return speed <= 80;
    });
    const highSpeedAdjacents = adjacentZones.filter((z) => {
      const speed = typeof z.speed_limit === 'number' ? z.speed_limit : 110;
      return speed >= 90;
    });

    const avgAdjacentSpeed =
      adjacentZones.reduce((sum, z) => {
        const speed = typeof z.speed_limit === 'number' ? z.speed_limit : 110;
        return sum + speed;
      }, 0) / adjacentZones.length;

    // Determine correct speed
    let correctedSpeed = 110;
    let reason = '';

    if (lowSpeedAdjacents.length > highSpeedAdjacents.length) {
      correctedSpeed = 50;
      reason = `Built-up area: ${lowSpeedAdjacents.length} low-speed (≤80) vs ${highSpeedAdjacents.length} high-speed (≥90) adjacent zones`;
    } else if (highSpeedAdjacents.length > lowSpeedAdjacents.length) {
      correctedSpeed = 110;
      reason = `Rural area: ${highSpeedAdjacents.length} high-speed (≥90) vs ${lowSpeedAdjacents.length} low-speed (≤80) adjacent zones`;
    } else if (avgAdjacentSpeed <= 80) {
      correctedSpeed = 50;
      reason = `Built-up area: avg adjacent speed ${Math.round(avgAdjacentSpeed)} km/h`;
    } else {
      correctedSpeed = 110;
      reason = `Rural area: avg adjacent speed ${Math.round(avgAdjacentSpeed)} km/h`;
    }

    // Validate speed transition (max 30 km/h drop)
    // Check if setting this to 50 would cause an invalid transition
    const prevZone = roadZones.find(
      (z) =>
        z.carriageway === zone.carriageway &&
        z.end_slk <= zone.start_slk + 0.1 &&
        z.end_slk >= zone.start_slk - 0.1
    );
    const nextZone = roadZones.find(
      (z) =>
        z.carriageway === zone.carriageway &&
        z.start_slk <= zone.end_slk + 0.1 &&
        z.start_slk >= zone.end_slk - 0.1
    );

    if (correctedSpeed === 50) {
      // Check if previous zone is high speed (would cause >30 km/h drop)
      const prevSpeed = prevZone?.speed_limit;
      if (prevSpeed && typeof prevSpeed === 'number' && prevSpeed >= 90) {
        // Invalid transition: 90→50 would be 40 km/h drop
        correctedSpeed = 110;
        reason = `Override: prevented invalid ${prevSpeed}→50 transition (max 30 km/h drop)`;
      }
    }

    corrected.push({
      ...zone,
      speed_limit: correctedSpeed,
      speed_corrected: true,
      correction_reason: reason,
      correction_confidence: adjacentZones.length >= 2 ? 'high' : 'medium',
    });
  }

  return corrected;
}

/**
 * Store speed zones data (for MRWA sync)
 * Applies default zone corrections before storing
 */
export async function storeSpeedZonesData(
  zones: any[],
  source: 'static' | 'mrwa' = 'mrwa'
): Promise<number> {
  if (!zones.length) return 0;

  // Apply corrections to default zones before storing
  const correctedZones = correctDefaultZones(zones);

  await storeSpeedZones(correctedZones);

  // Import storeDatasetMeta from metadata module
  const { storeDatasetMeta } = await import('./metadata');
  await storeDatasetMeta({
    dataset: 'speedZones',
    lastSync: new Date().toISOString(),
    recordCount: correctedZones.length,
    source,
  });
  return correctedZones.length;
}
