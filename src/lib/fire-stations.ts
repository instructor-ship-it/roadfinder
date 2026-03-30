/**
 * Fire Station Data Module
 *
 * Primary source: WA DFES (Department of Fire and Emergency Services) via SLIP ArcGIS.
 * Enrichment source: Geoscience Australia Emergency Management Facilities (GNAF addresses,
 * operational status).
 *
 * DFES has 561+ fire stations across WA (live, authoritative).
 * GA provides GNAF formatted addresses and operational status (enrichment only, not primary).
 *
 * Station types (DFES):
 * - BFB:  Bush Fire Brigade (volunteer, regional/rural)
 * - VFRS: Volunteer Fire & Rescue Service
 * - CFRS: Career Fire & Rescue Service (permanent, 24/7 staffed)
 * - PFRS: Private Fire & Rescue Service
 * - VFESU: Volunteer Fire & Emergency Service Unit
 * - SESU: State Emergency Service Unit (NOT fire — excluded from results)
 * - DFES: DFES offices (NOT fire — excluded from results)
 * - VMRS: Volunteer Marine Rescue Station (NOT fire — excluded from results)
 */

import { haversineDistanceKm } from './utils';

// ─── Types ────────────────────────────────────────────────────────────────

export interface FireStation {
  name: string;
  type: string; // BFB, VFRS, CFRS, PFRS, VFESU
  typeDescription: string;
  lat: number;
  lon: number;
  distanceKm: number;
  // GNAF enrichment (from Geoscience Australia)
  address?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  operationalStatus?: string;
  buildingName?: string;
  source: 'DFES_SLIP' | 'Geoscience_Australia';
}

interface GAStationRecord {
  facility_name: string;
  gnaf_formatted_address: string | null;
  gnaf_building_name: string | null;
  gnaf_suburb: string | null;
  gnaf_postcode: string | null;
  facility_state: string | null;
  facility_operationalstatus: string | null;
  facility_lat: number;
  facility_long: number;
}

// ─── Constants ────────────────────────────────────────────────────────────

const DFES_URL =
  'https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Infrastructure_and_Utilities/MapServer/33/query';

const GA_BASE =
  'https://services.ga.gov.au/gis/rest/services/Emergency_Management_Facilities/MapServer';

const STATION_TYPE_DESCRIPTIONS: Record<string, string> = {
  BFB: 'Bush Fire Brigade',
  VFRS: 'Volunteer Fire & Rescue',
  CFRS: 'Career Fire & Rescue',
  PFRS: 'Private Fire & Rescue',
  VFESU: 'Volunteer Fire & Emergency Service Unit',
  SESU: 'State Emergency Service',
  DFES: 'DFES Office',
  VMRS: 'Volunteer Marine Rescue',
};

// Fire-relevant station types (exclude SESU, DFES offices, VMRS)
const FIRE_TYPES = new Set(['BFB', 'VFRS', 'CFRS', 'PFRS', 'VFESU']);

// Professional/permanent stations (24/7 staffed — prefer these in emergencies)
const PROFESSIONAL_TYPES = new Set(['CFRS', 'PFRS']);

// ─── DFES SLIP Query ─────────────────────────────────────────────────────

interface DFESFeature {
  attributes: {
    displaynam: string;
    type: string;
    lgacode: string | null;
    omsnumber: number | null;
  };
  geometry: {
    y: number;
    x: number;
  };
}

async function queryDFES(lat: number, lon: number, radiusKm: number): Promise<DFESFeature[]> {
  const radiusDeg = radiusKm / 111;
  const minLon = lon - radiusDeg;
  const minLat = lat - radiusDeg;
  const maxLon = lon + radiusDeg;
  const maxLat = lat + radiusDeg;

  const params = new URLSearchParams({
    geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'displaynam,type,lgacode,omsnumber',
    returnGeometry: 'true',
    f: 'json',
    resultRecordCount: '500',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${DFES_URL}?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[FireStations] DFES API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.features || []) as DFESFeature[];
  } catch (error) {
    console.error('[FireStations] DFES query error:', error);
    return [];
  }
}

// ─── Geoscience Australia Address Enrichment ─────────────────────────────

/**
 * Fetch GNAF address data from GA for matching station names.
 * We query both metro (layer 3) and rural (layer 4) fire layers.
 * The data is from 2018 but addresses are relatively stable.
 */
async function fetchGAAddresses(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<Map<string, GAStationRecord>> {
  const radiusDeg = radiusKm / 111;
  const minLon = lon - radiusDeg;
  const minLat = lat - radiusDeg;
  const maxLon = lon + radiusDeg;
  const maxLat = lat + radiusDeg;

  const addressMap = new Map<string, GAStationRecord>();

  // Query both metro and rural fire layers
  const layers = [3, 4]; // 3 = Metro Fire, 4 = Rural Fire

  await Promise.all(
    layers.map(async (layer) => {
      try {
        const params = new URLSearchParams({
          geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
          geometryType: 'esriGeometryEnvelope',
          inSR: '4326',
          spatialRel: 'esriSpatialRelIntersects',
          outFields:
            'facility_name,gnaf_formatted_address,gnaf_building_name,gnaf_suburb,gnaf_postcode,facility_state,facility_operationalstatus,facility_lat,facility_long',
          returnGeometry: 'false',
          f: 'json',
          resultRecordCount: '500',
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${GA_BASE}/${layer}/query?${params}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) return;

        const data = await response.json();
        const features = data.features || [];

        for (const f of features) {
          const a = f.attributes;
          const name = (a.facility_name || '').toUpperCase().trim();
          if (!name) continue;

          // Store by name (first match wins)
          if (!addressMap.has(name)) {
            addressMap.set(name, {
              facility_name: name,
              gnaf_formatted_address: a.gnaf_formatted_address,
              gnaf_building_name: a.gnaf_building_name,
              gnaf_suburb: a.gnaf_suburb,
              gnaf_postcode: a.gnaf_postcode,
              facility_state: a.facility_state,
              facility_operationalstatus: a.facility_operationalstatus,
              facility_lat: a.facility_lat,
              facility_long: a.facility_long,
            });
          }
        }

        console.log(
          `[FireStations] GA Layer ${layer === 3 ? 'Metro' : 'Rural'}: ${features.length} address records`
        );
      } catch (error) {
        console.error(`[FireStations] GA Layer ${layer} error:`, error);
      }
    })
  );

  return addressMap;
}

// ─── Name Matching ───────────────────────────────────────────────────────

/**
 * Match a DFES station name to a GA record.
 * DFES names are UPPERCASE, GA names may have different casing.
 * Try exact match first, then partial matches.
 */
function matchGAAddress(
  dfesName: string,
  gaMap: Map<string, GAStationRecord>
): GAStationRecord | null {
  const upper = dfesName.toUpperCase().trim();

  // 1. Exact match
  if (gaMap.has(upper)) {
    return gaMap.get(upper)!;
  }

  // 2. Check if any GA name starts with our DFES name (e.g., "NORTHAM CENTRAL" matches "NORTHAM")
  for (const [gaName, record] of gaMap) {
    if (gaName.startsWith(upper) || upper.startsWith(gaName)) {
      return record;
    }
  }

  // 3. Check if either name contains the other
  for (const [gaName, record] of gaMap) {
    if (gaName.includes(upper) || upper.includes(gaName)) {
      return record;
    }
  }

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Find fire stations near a coordinate.
 *
 * @param lat Center latitude
 * @param lon Center longitude
 * @param radiusKm Search radius in km (default 100)
 * @param limit Maximum results (default 20)
 * @returns Fire stations sorted by distance, with address enrichment
 */
export async function findFireStationsNear(
  lat: number,
  lon: number,
  radiusKm: number = 100,
  limit: number = 20
): Promise<FireStation[]> {
  // Run DFES and GA queries in parallel
  const [dfesFeatures, gaAddresses] = await Promise.all([
    queryDFES(lat, lon, radiusKm),
    fetchGAAddresses(lat, lon, radiusKm),
  ]);

  console.log(
    `[FireStations] DFES: ${dfesFeatures.length} features, GA: ${gaAddresses.size} address records`
  );

  // Process DFES results and enrich with GA addresses
  const stations: FireStation[] = [];

  for (const f of dfesFeatures) {
    const attrs = f.attributes;
    const geom = f.geometry;

    if (!geom?.y || !geom?.x || !attrs.displaynam) continue;

    // Filter to fire-relevant types only
    const stationType = attrs.type || 'Unknown';
    if (!FIRE_TYPES.has(stationType)) continue;

    const distanceKm = haversineDistanceKm(lat, lon, geom.y, geom.x);

    // Try to match GA address
    const gaRecord = matchGAAddress(attrs.displaynam, gaAddresses);

    stations.push({
      name: attrs.displaynam,
      type: stationType,
      typeDescription: STATION_TYPE_DESCRIPTIONS[stationType] || 'Emergency Station',
      lat: geom.y,
      lon: geom.x,
      distanceKm: Math.round(distanceKm * 10) / 10,
      // GNAF enrichment
      address: gaRecord?.gnaf_formatted_address || undefined,
      suburb: gaRecord?.gnaf_suburb || undefined,
      postcode: gaRecord?.gnaf_postcode || undefined,
      state: gaRecord?.facility_state || 'WA',
      operationalStatus: gaRecord?.facility_operationalstatus || undefined,
      buildingName: gaRecord?.gnaf_building_name || undefined,
      source: 'DFES_SLIP',
    });
  }

  // Sort: professional stations first, then by distance
  stations.sort((a, b) => {
    const aProf = PROFESSIONAL_TYPES.has(a.type) ? 0 : 1;
    const bProf = PROFESSIONAL_TYPES.has(b.type) ? 0 : 1;
    if (aProf !== bProf) return aProf - bProf;
    return a.distanceKm - b.distanceKm;
  });

  const enriched = stations.filter((s) => s.address);
  console.log(
    `[FireStations] Found ${stations.length} fire stations (${enriched.length} with GNAF addresses). Nearest: ${stations[0]?.name || 'none'} (${stations[0]?.distanceKm}km, ${stations[0]?.type})`
  );

  return stations.slice(0, limit);
}

/**
 * Find the nearest fire station, preferring professional (24/7 staffed) stations.
 */
export async function findNearestFireStation(
  lat: number,
  lon: number,
  radiusKm: number = 100
): Promise<FireStation | null> {
  const stations = await findFireStationsNear(lat, lon, radiusKm, 1);
  return stations[0] || null;
}

/**
 * Find nearest professional fire station (CFRS/PFRS — 24/7 staffed).
 */
export async function findNearestProfessionalFireStation(
  lat: number,
  lon: number,
  radiusKm: number = 100
): Promise<FireStation | null> {
  const stations = await findFireStationsNear(lat, lon, radiusKm, 50);
  return stations.find((s) => PROFESSIONAL_TYPES.has(s.type)) || null;
}
