/**
 * Emergency Location Module
 *
 * Shared functionality for emergency location detection.
 * Used by both the main page and SLK tracking page.
 *
 * Cross road detection uses MRWA Layer 6 (Intersections) for accurate names.
 */

import { haversineDistance, getBearing, getDirectionFromBearing, formatDistance } from './utils';

// ============================================================
// TYPES
// ============================================================

export interface CrossRoad {
  name: string;
  distance: string;
  direction: string;
  distanceM: number;
}

export interface NearestTown {
  name: string;
  distance: string;
  direction: string;
}

export interface NearestHospital {
  name: string;
  distanceM: number;
  type: string;
  hasED: boolean;
  phone: string | null;
  address: string;
  suburb: string;
}

export interface NearestFireStation {
  name: string;
  distanceM: number;
  type: string;
  typeDescription: string;
  lat: number;
  lon: number;
  googleMapsUrl: string;
  address?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  operationalStatus?: string;
  buildingName?: string;
  isProfessional?: boolean;
}

export interface NearestPoliceStation {
  name: string;
  distanceM: number;
  address: string;
  suburb: string;
}

export interface EmergencyData {
  roadName: string;
  crossRoad: CrossRoad | null;
  nearestTown: NearestTown | null;
  lat: number;
  lon: number;
  nearestHospital?: NearestHospital;
  nearestFireStation?: NearestFireStation;
  nearestPoliceStation?: NearestPoliceStation;
}

// ============================================================
// CROSS ROAD DETECTION
// ============================================================

// Interface for API response
interface IntersectionAPI {
  nodeName: string;
  lat: number;
  lon: number;
  nodeType: string;
  distanceM: number;
}

/**
 * Find cross road using Layer 6 (Intersections)
 *
 * IMPROVED LOGIC:
 * 1. Query Layer 6 for nearby intersections
 * 2. Filter to find intersections that CONTAIN the current road name (multiple variations)
 * 3. Extract the cross road (the other road in the intersection)
 * 4. Sort by distance and return the nearest match
 * 5. Fallback: If no intersection contains our road, find nearest valid intersection
 */
export async function findCrossRoad(
  lat: number,
  lon: number,
  currentRoadName: string
): Promise<CrossRoad | null> {
  try {
    // Query Layer 6 for nearby intersections
    const response = await fetch(`/api/nearest-intersections?lat=${lat}&lon=${lon}&radius=2`);
    const data = await response.json();

    if (!data.intersections || data.intersections.length === 0) {
      return null;
    }

    // Extract multiple road name variations for flexible matching
    const roadNameVariations = getRoadNameVariations(currentRoadName);

    // Debug: log road name variations
    console.log(
      `[RC 1.7.28] Cross road search for "${currentRoadName}" - variations:`,
      roadNameVariations
    );

    // Filter out invalid intersections (end/start roads)
    const validIntersections: IntersectionAPI[] = data.intersections.filter(
      (int: IntersectionAPI) => {
        const nodeName = int.nodeName.toLowerCase();
        return !nodeName.includes('end road') && !nodeName.includes('start road');
      }
    );

    // Step 1: Find intersections that CONTAIN our current road (using any variation)
    const matchingIntersections = validIntersections.filter((int: IntersectionAPI) => {
      const nodeName = int.nodeName.toLowerCase();
      return roadNameVariations.some((variation) => nodeName.includes(variation));
    });

    // Debug: log matching intersections
    console.log(
      `[RC 1.7.28] Found ${matchingIntersections.length} matching intersections for "${currentRoadName}":`
    );
    matchingIntersections.slice(0, 5).forEach((int, i) => {
      console.log(`  ${i + 1}. ${int.nodeName} (${int.distanceM}m)`);
    });

    // Step 2: For matching intersections, extract the cross road
    // Return the CLOSEST one (list is sorted by distance)
    for (const intersection of matchingIntersections) {
      const parts = intersection.nodeName.split(' & ');

      // Find parts that are NOT our current road
      const crossParts = parts.filter((p: string) => {
        const partLower = p.toLowerCase();
        return !roadNameVariations.some((variation) => partLower.includes(variation));
      });

      if (crossParts.length > 0) {
        // Found a valid cross road!
        const distanceM = intersection.distanceM;
        const bearing = getBearing(intersection.lat, intersection.lon, lat, lon);
        const direction = getDirectionFromBearing(bearing);

        return {
          name: crossParts[0].trim(),
          distance: formatDistance(distanceM),
          direction,
          distanceM,
        };
      }
    }

    // Step 3: Fallback - find nearest valid intersection
    // Use the closest one and extract cross roads
    for (const intersection of validIntersections) {
      const parts = intersection.nodeName.split(' & ');

      // Find parts that are NOT our current road
      const crossParts = parts.filter((p: string) => {
        const partLower = p.toLowerCase();
        return !roadNameVariations.some((variation) => partLower.includes(variation));
      });

      if (crossParts.length > 0) {
        const distanceM = intersection.distanceM;
        const bearing = getBearing(intersection.lat, intersection.lon, lat, lon);
        const direction = getDirectionFromBearing(bearing);

        return {
          name: crossParts[0].trim(),
          distance: formatDistance(distanceM),
          direction,
          distanceM,
        };
      }
    }

    return null;
  } catch (e) {
    console.error('Failed to find cross road:', e);
    return null;
  }
}

/**
 * Generate multiple road name variations for flexible matching
 * e.g., "Warnbro Sound Av" -> ["warnbro", "warnbro sound", "warnbro sound av"]
 * e.g., "Dawson St" -> ["dawson", "dawson st"]
 */
function getRoadNameVariations(roadName: string): string[] {
  const variations: string[] = [];
  const lower = roadName.toLowerCase();
  const words = lower.split(' ').filter((w) => w.length > 0);

  // Add full name (most specific)
  variations.push(lower);

  // Add name without suffix (e.g., "Warnbro Sound" from "Warnbro Sound Av")
  if (words.length > 1) {
    const withoutSuffix = words.slice(0, -1).join(' ');
    if (withoutSuffix.length > 2) {
      variations.push(withoutSuffix);
    }
  }

  // Add first word (e.g., "warnbro") - for roads with multiple words
  if (words.length > 1 && words[0].length > 2) {
    variations.push(words[0]);
  }

  // Add first two words (e.g., "warnbro sound")
  if (words.length > 2) {
    const firstTwo = words.slice(0, 2).join(' ');
    if (firstTwo.length > 2) {
      variations.push(firstTwo);
    }
  }

  // Add name with common abbreviations expanded
  const expanded = lower
    .replace(/\bav\b/g, 'avenue')
    .replace(/\bst\b/g, 'street')
    .replace(/\brd\b/g, 'road')
    .replace(/\bdr\b/g, 'drive')
    .replace(/\bcr\b/g, 'crescent')
    .replace(/\bpl\b/g, 'place')
    .replace(/\bcl\b/g, 'close')
    .replace(/\bwy\b/g, 'way');

  if (expanded !== lower) {
    variations.push(expanded);
  }

  // Add name with abbreviations (reverse)
  const abbreviated = lower
    .replace(/\bavenue\b/g, 'av')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bcrescent\b/g, 'cr')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bclose\b/g, 'cl')
    .replace(/\bway\b/g, 'wy');

  if (abbreviated !== lower) {
    variations.push(abbreviated);
  }

  // Remove duplicates and return
  return [...new Set(variations)];
}

// ============================================================
// EMERGENCY SERVICES LOOKUPS
// ============================================================

/**
 * Find nearest town using OSM Nominatim
 */
export async function findNearestTown(
  lat: number,
  lon: number,
  locality: string | null
): Promise<NearestTown | null> {
  if (!locality) return null;

  try {
    const osmResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locality + ', Western Australia, Australia')}&format=json&limit=5&addressdetails=1`
    );
    const osmData = await osmResponse.json();

    if (osmData && osmData.length > 0) {
      // Find the actual town (has address.town), not the shire boundary
      const townPlace =
        osmData.find((p: { address?: { town?: string } }) => p.address?.town) || osmData[0];

      const townLat = parseFloat(townPlace.lat);
      const townLon = parseFloat(townPlace.lon);

      // Distance in meters
      const distM = haversineDistance(lat, lon, townLat, townLon);

      if (distM < 100000) {
        // Within 100km
        // Calculate bearing FROM town TO emergency (where emergency is FROM town)
        // NOT FROM emergency TO town (which was the bug)
        const bearing = getBearing(townLat, townLon, lat, lon);
        const direction = getDirectionFromBearing(bearing);

        // Use town name from address if available, otherwise locality name
        const townName = townPlace.address?.town || locality;

        return {
          name: townName,
          distance: formatDistance(distM),
          direction,
        };
      }
    }
  } catch (e) {
    console.error('Failed to find nearest town:', e);
  }
  return null;
}

/**
 * Find nearest hospital with Emergency Department
 */
export async function findNearestHospital(
  lat: number,
  lon: number
): Promise<NearestHospital | null> {
  try {
    const response = await fetch(`/api/hospitals?lat=${lat}&lon=${lon}&radius=150&edOnly=true`);
    const data = await response.json();

    if (data.nearest?.hospitalWithED) {
      const h = data.nearest.hospitalWithED;
      return {
        name: h.name,
        distanceM: h.distanceM,
        type: h.type,
        hasED: h.hasEmergency,
        phone: h.telephone || null,
        address: h.address,
        suburb: h.suburb,
      };
    } else if (data.nearest?.hospital) {
      const h = data.nearest.hospital;
      return {
        name: h.name,
        distanceM: h.distanceM,
        type: h.type,
        hasED: h.hasEmergency,
        phone: h.telephone || null,
        address: h.address,
        suburb: h.suburb,
      };
    } else if (data.nearest?.nursingPost) {
      const n = data.nearest.nursingPost;
      return {
        name: n.name,
        distanceM: n.distanceM,
        type: 'Nursing Post',
        hasED: false,
        phone: n.telephone || null,
        address: n.address,
        suburb: n.suburb,
      };
    }
  } catch (e) {
    console.error('Failed to find nearest hospital:', e);
  }
  return null;
}

/**
 * Find nearest fire/emergency station from DFES data
 * with GNAF address enrichment from Geoscience Australia.
 */
export async function findNearestFireStation(
  lat: number,
  lon: number
): Promise<NearestFireStation | null> {
  try {
    const response = await fetch(`/api/emergency-stations?lat=${lat}&lon=${lon}&radius=100`);
    const data = await response.json();

    // Prefer professional (24/7 staffed) stations, then volunteer, then any
    const s = data.nearest?.professional || data.nearest?.volunteer || data.nearest?.any;

    if (s) {
      return {
        name: s.name,
        distanceM: s.distanceM,
        type: s.type,
        typeDescription: s.typeDescription,
        lat: s.lat,
        lon: s.lon,
        googleMapsUrl: s.googleMapsUrl,
        address: s.address,
        suburb: s.suburb,
        postcode: s.postcode,
        state: s.state,
        operationalStatus: s.operationalStatus,
        buildingName: s.buildingName,
        isProfessional: s.isProfessional,
      };
    }
  } catch (e) {
    console.error('Failed to find nearest fire station:', e);
  }
  return null;
}

/**
 * Find nearest WA Police station
 */
export async function findNearestPoliceStation(
  lat: number,
  lon: number
): Promise<NearestPoliceStation | null> {
  try {
    const response = await fetch(`/api/police-stations?lat=${lat}&lon=${lon}&radius=150`);
    const data = await response.json();

    if (data.nearest) {
      const p = data.nearest;
      return {
        name: p.name,
        distanceM: p.distanceM,
        address: p.address,
        suburb: p.suburb,
      };
    }
  } catch (e) {
    console.error('Failed to find nearest police station:', e);
  }
  return null;
}
