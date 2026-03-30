/**
 * National Public Toilet Map — ArcGIS Feature Service Client
 *
 * Data source: Australian Government National Public Toilet Map,
 * hosted as an ArcGIS Feature Service on the NSW Government open data portal.
 * Provides 2,714+ toilets in Western Australia with rich metadata including
 * opening hours, wheelchair access, baby change, showers, parking, and more.
 *
 * Strategy: On first call, fetch ALL WA toilets and cache in memory for 6 hours.
 * Subsequent calls filter the cached list by distance — no network request needed.
 * This avoids per-query API calls and ensures consistent performance.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface ToiletMapEntry {
  id: number;
  name: string;
  facilityType: string;
  address: string;
  town: string;
  state: string;
  lat: number;
  lon: number;
  openingHours: string;
  openingHoursNote: string;
  accessible: boolean;
  ambulant: boolean;
  male: boolean;
  female: boolean;
  unisex: boolean;
  allGender: boolean;
  parking: boolean;
  parkingAccessible: boolean;
  babyChange: boolean;
  shower: boolean;
  drinkingWater: boolean;
  toiletNote: string;
  url: string;
}

interface RawToiletRecord {
  id: number;
  lat: number;
  lon: number;
  attr: Record<string, unknown>;
}

// ─── Cache ────────────────────────────────────────────────────────────────

interface ToiletCache {
  toilets: RawToiletRecord[];
  loadedAt: number | null;
}

const toiletCache: ToiletCache = { toilets: [], loadedAt: null };
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours — toilet data changes infrequently

const ARCGIS_BASE =
  'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/National_Public_Toilet_Map/FeatureServer/0/query';

// ─── Haversine ────────────────────────────────────────────────────────────

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Fetch all WA toilets from ArcGIS ─────────────────────────────────────

async function fetchAllWAToilets(): Promise<RawToiletRecord[]> {
  // Return cached data if still valid
  if (
    toiletCache.loadedAt &&
    Date.now() - toiletCache.loadedAt < CACHE_DURATION_MS &&
    toiletCache.toilets.length > 0
  ) {
    console.log(
      `[ToiletMap] Using cached data (${toiletCache.toilets.length} toilets, age: ${Math.round((Date.now() - toiletCache.loadedAt) / 60000)}min)`
    );
    return toiletCache.toilets;
  }

  console.log('[ToiletMap] Fetching all WA toilets from ArcGIS Feature Service...');

  try {
    const allToilets: RawToiletRecord[] = [];
    let offset = 0;
    const batchSize = 2000;

    while (true) {
      const params = new URLSearchParams({
        where: "state='WA'",
        outFields: '*',
        outSR: '4326',
        returnGeometry: 'true',
        orderByFields: 'facilityid',
        resultRecordCount: String(batchSize),
        resultOffset: String(offset),
        f: 'json',
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${ARCGIS_BASE}?${params}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[ToiletMap] ArcGIS returned ${response.status}`);
        break;
      }

      const data = await response.json();
      const features = data.features || [];

      for (const f of features) {
        const attr = f.attributes as Record<string, unknown>;
        const geom = f.geometry;
        if (geom?.y && geom?.x) {
          allToilets.push({
            id: attr.objectid as number,
            lat: geom.y as number,
            lon: geom.x as number,
            attr,
          });
        }
      }

      // Check if there are more pages
      if (features.length < batchSize) break;
      offset += batchSize;
    }

    if (allToilets.length > 0) {
      toiletCache.toilets = allToilets;
      toiletCache.loadedAt = Date.now();
      console.log(
        `[ToiletMap] Cached ${allToilets.length} WA toilets from National Public Toilet Map`
      );
    }

    return allToilets;
  } catch (error) {
    console.error('[ToiletMap] Fetch error:', error);
    // Return stale cache if available
    return toiletCache.toilets.length > 0 ? toiletCache.toilets : [];
  }
}

// ─── Map raw record to ToiletMapEntry ─────────────────────────────────────

function mapRecord(t: RawToiletRecord, searchLat: number, searchLon: number): ToiletMapEntry {
  const a = t.attr;
  return {
    id: t.id,
    name: (a.name as string) || 'Public Toilet',
    facilityType: (a.facilitytype as string) || '',
    address: (a.address1 as string) || '',
    town: (a.town as string) || '',
    state: (a.state as string) || 'WA',
    lat: t.lat,
    lon: t.lon,
    openingHours: (a.openinghours as string) || '',
    openingHoursNote: (a.openinghoursnote as string) || '',
    accessible: a.accessible === 'TRUE',
    ambulant: a.ambulant === 'TRUE',
    male: a.male === 'TRUE',
    female: a.female === 'TRUE',
    unisex: a.unisex === 'TRUE',
    allGender: a.allgender === 'TRUE',
    parking: a.parking === 'TRUE',
    parkingAccessible: a.parkingaccessible === 'TRUE',
    babyChange: a.babychange === 'TRUE',
    shower: a.shower === 'TRUE',
    drinkingWater: a.drinkingwater === 'TRUE',
    toiletNote: (a.toiletnote as string) || '',
    url: (a.url as string) || '',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Find toilets near a given coordinate.
 * @param lat Center latitude
 * @param lon Center longitude
 * @param radiusKm Search radius in km (default 100)
 * @param limit Maximum results to return (default 10)
 * @returns Array of toilets sorted by distance, empty array on failure
 */
export async function findToiletsNear(
  lat: number,
  lon: number,
  radiusKm: number = 100,
  limit: number = 10
): Promise<(ToiletMapEntry & { distanceKm: number })[]> {
  try {
    const allToilets = await fetchAllWAToilets();

    if (allToilets.length === 0) {
      console.log('[ToiletMap] No WA toilets available (cache empty, fetch failed)');
      return [];
    }

    const results = allToilets
      .map((t) => {
        const entry = mapRecord(t, lat, lon);
        const distanceKm = Math.round(haversineDistance(lat, lon, t.lat, t.lon) * 10) / 10;
        return { ...entry, distanceKm };
      })
      .filter((t) => t.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    console.log(
      `[ToiletMap] Found ${results.length} toilets within ${radiusKm}km (nearest: ${results[0]?.name || 'none'} at ${results[0]?.distanceKm || '?'}km)`
    );

    return results.slice(0, limit);
  } catch (error) {
    console.error('[ToiletMap] findToiletsNear error:', error);
    return [];
  }
}

/**
 * Find the single nearest toilet.
 * @param lat Center latitude
 * @param lon Center longitude
 * @param radiusKm Search radius in km (default 100)
 * @returns Nearest toilet or null
 */
export async function findNearestToilet(
  lat: number,
  lon: number,
  radiusKm: number = 100
): Promise<(ToiletMapEntry & { distanceKm: number }) | null> {
  const results = await findToiletsNear(lat, lon, radiusKm, 1);
  return results[0] || null;
}

/**
 * Get cache status for monitoring.
 */
export function getToiletCacheStatus(): {
  loaded: boolean;
  valid: boolean;
  count: number;
  loadedAt: string | null;
  ageMinutes: number | null;
} {
  const loaded = toiletCache.toilets.length > 0;
  const valid =
    loaded &&
    toiletCache.loadedAt !== null &&
    Date.now() - toiletCache.loadedAt < CACHE_DURATION_MS;
  return {
    loaded,
    valid,
    count: toiletCache.toilets.length,
    loadedAt: toiletCache.loadedAt ? new Date(toiletCache.loadedAt).toISOString() : null,
    ageMinutes: toiletCache.loadedAt
      ? Math.round((Date.now() - toiletCache.loadedAt) / 60000)
      : null,
  };
}

/**
 * Force refresh the toilet cache (e.g., on user request).
 */
export async function refreshToiletCache(): Promise<number> {
  toiletCache.toilets = [];
  toiletCache.loadedAt = null;
  const toilets = await fetchAllWAToilets();
  return toilets.length;
}
