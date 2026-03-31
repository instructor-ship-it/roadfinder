import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { haversineDistanceKm } from '@/lib/utils';
import {
  findNearestToilet,
  findToiletsNear,
  getToiletCacheStatus,
  refreshToiletCache,
} from '@/lib/toilet-map';

interface Place {
  name: string;
  distance: string;
  lat: number;
  lon: number;
  phone?: string;
  address?: string;
  suburb?: string;
  googleMapsUrl: string;
  isEmergency?: boolean;
  siteFeatures?: string[];
  // Hospital-specific
  hospitalType?: string;
  hospitalCategory?: string;
  beds?: number;
  // Fuel station-specific
  fuelBrand?: string;
  fuelPrice?: number;
  fuelDate?: string;
  // Toilet-specific (from National Public Toilet Map)
  toiletType?: string;
  openingHours?: string;
  wheelchair?: boolean;
  toiletNote?: string;
  toiletUrl?: string;
  toiletSource?: string;
}

interface PlacesResult {
  hospital: Place | null;
  toilet: Place | null;
  fuelStation: Place | null;
  source?: string;
  // Enhanced source tracking
  hospitalSource?: string;
  fuelSource?: string;
  toiletSource?: string;
}

// Cache for offline amenities data with expiration
interface AmenitiesCache {
  data: {
    hospitals: any[];
    fuelStations: any[];
    toilets: any[];
  } | null;
  loadedAt: number | null;
}

const amenitiesCache: AmenitiesCache = {
  data: null,
  loadedAt: null,
};

// Cache duration in milliseconds (default: 5 minutes)
const CACHE_DURATION_MS = parseInt(process.env.AMENITIES_CACHE_DURATION_MS || '300000', 10);

function isCacheValid(): boolean {
  if (!amenitiesCache.data || !amenitiesCache.loadedAt) {
    return false;
  }
  return Date.now() - amenitiesCache.loadedAt < CACHE_DURATION_MS;
}

function loadOfflineAmenitiesData(forceRefresh: boolean = false) {
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && isCacheValid() && amenitiesCache.data) {
    console.log(
      `Using cached amenities data (age: ${Math.round((Date.now() - (amenitiesCache.loadedAt || 0)) / 1000)}s)`
    );
    return amenitiesCache.data;
  }

  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'amenities.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      amenitiesCache.data = {
        hospitals: data.hospitals || [],
        fuelStations: data.fuelStations || [],
        toilets: data.toilets || [],
      };
      amenitiesCache.loadedAt = Date.now();

      console.log(
        `Refreshed amenities cache: ${amenitiesCache.data.hospitals.length} hospitals, ${amenitiesCache.data.fuelStations.length} fuel stations, ${amenitiesCache.data.toilets.length} toilets`
      );
    }
  } catch (e) {
    console.error('Error loading offline amenities data:', e);
  }

  return amenitiesCache.data || { hospitals: [], fuelStations: [], toilets: [] };
}

// haversineDistanceKm imported from @/lib/utils (was previously reimplemented here)

// Search for places using Overpass API with fallback servers
async function searchOverpass(lat: number, lon: number, query: string): Promise<any[]> {
  const overpassQuery = `
    [out:json][timeout:30];
    (
      ${query}
    );
    out center;
  `;

  // Try multiple Overpass servers
  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const server of servers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(server, {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) continue;

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      continue;
    }
  }

  return [];
}

// ─── Toilet Map → Place converter ─────────────────────────────────────────

function toiletMapToPlace(
  toilet: NonNullable<Awaited<ReturnType<typeof findNearestToilet>>>
): Place {
  // Build site features from the rich metadata
  const features: string[] = [];
  if (toilet.openingHours && toilet.openingHours.toLowerCase().includes('24 hour')) {
    features.push('Open 24 hours');
  }
  if (toilet.accessible) features.push('♿ Wheelchair accessible');
  if (toilet.ambulant) features.push('Ambulant accessible');
  if (toilet.parking) features.push('Parking');
  if (toilet.parkingAccessible) features.push('Accessible parking');
  if (toilet.babyChange) features.push('Baby change');
  if (toilet.shower) features.push('Showers');
  if (toilet.drinkingWater) features.push('Drinking water');
  if (toilet.male) features.push('Male');
  if (toilet.female) features.push('Female');
  if (toilet.unisex) features.push('Unisex');
  if (toilet.allGender) features.push('All gender');

  // Build address with suburb
  const addressParts = [toilet.address, toilet.town, toilet.state].filter(Boolean);
  const fullAddress = addressParts.join(', ') || undefined;

  return {
    name: toilet.name,
    distance: toilet.distanceKm.toFixed(1),
    lat: toilet.lat,
    lon: toilet.lon,
    googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lon}`,
    address: fullAddress,
    suburb: toilet.town || undefined,
    siteFeatures: features,
    toiletType: toilet.facilityType || undefined,
    openingHours: toilet.openingHours || undefined,
    wheelchair: toilet.accessible,
    toiletNote: toilet.toiletNote || undefined,
    toiletUrl: toilet.url || undefined,
    toiletSource: 'NationalToiletMap',
  };
}

// Check if facility is a real hospital (not dental, fertility, etc.)
function isRealHospital(tags: Record<string, string>): boolean {
  const name = (tags.name || '').toLowerCase();

  // Exclude non-hospital medical facilities
  const excludeTerms = [
    'dental',
    'dentist',
    'orthodontic',
    'fertility',
    'ivf',
    'day surgery',
    'cosmetic',
    'psychology',
    'counselling',
    'private clinic',
    'eye hospital',
  ];

  if (excludeTerms.some((term) => name.includes(term))) {
    return false;
  }

  return true;
}

// Check if fuel station is legitimate
function isValidFuelStation(tags: Record<string, string>): boolean {
  const name = (tags.name || '').toLowerCase();

  // Exclude obviously non-Australian stations
  const excludeTerms = [
    'e. leclerc',
    'leclerc',
    'carrefour',
    'total',
    'esso',
    'shell france',
    'bp france',
    'intermarché',
  ];

  if (excludeTerms.some((term) => name.includes(term))) {
    return false;
  }

  return true;
}

// Get coordinates from element (handles both nodes and ways with center)
function getCoordinates(el: any): { lat: number; lon: number } | null {
  // Node has direct lat/lon
  if (el.lat && el.lon) {
    return { lat: el.lat, lon: el.lon };
  }

  // Way has center property (from 'out center' query)
  if (el.center && el.center.lat && el.center.lon) {
    return { lat: el.center.lat, lon: el.center.lon };
  }

  return null;
}

// Process and sort places by distance, prioritizing emergency facilities
function processPlaces(
  elements: any[],
  targetLat: number,
  targetLon: number,
  filterType: 'hospital' | 'fuel' | 'other' = 'other'
): Place[] {
  let places: Place[] = elements
    .filter((el: any) => getCoordinates(el))
    .filter((el: any) => {
      const tags = el.tags || {};
      if (filterType === 'hospital') {
        return isRealHospital(tags);
      }
      if (filterType === 'fuel') {
        return isValidFuelStation(tags);
      }
      return true;
    })
    .map((el: any) => {
      const tags = el.tags || {};
      const coords = getCoordinates(el)!;
      const distance = haversineDistanceKm(targetLat, targetLon, coords.lat, coords.lon);

      // Get best available name
      let name = tags.name || tags.operator || tags.official_name || '';
      if (!name) {
        name =
          tags.amenity === 'hospital'
            ? 'Hospital'
            : tags.amenity === 'fuel'
              ? 'Service Station'
              : tags.amenity === 'toilets'
                ? 'Public Toilets'
                : tags.toilets === 'yes'
                  ? 'Public Toilets'
                  : 'Unknown';
      }

      const phone = tags.phone || tags['contact:phone'] || tags['phone:mobile'] || undefined;

      // Build address from available tags
      let address: string | undefined = '';
      if (tags['addr:housenumber']) address += tags['addr:housenumber'] + ' ';
      if (tags['addr:street']) address += tags['addr:street'];
      if (tags['addr:suburb']) address += ', ' + tags['addr:suburb'];
      if (tags['addr:city']) address += ', ' + tags['addr:city'];
      if (tags['addr:postcode']) address += ' ' + tags['addr:postcode'];
      address = address.trim() || undefined;

      const isEmergency = tags.emergency === 'yes';

      return {
        name,
        distance: distance.toFixed(1),
        lat: coords.lat,
        lon: coords.lon,
        phone: phone ? phone.replace(/;/g, ', ') : undefined,
        address,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`,
        isEmergency,
      };
    });

  // For hospitals, prioritize emergency facilities, then sort by distance
  if (filterType === 'hospital') {
    places.sort((a, b) => {
      // Emergency hospitals first
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      // Then by distance
      return parseFloat(a.distance) - parseFloat(b.distance);
    });
  } else {
    places.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  }

  return places;
}

// Process offline amenities data
function processOfflineAmenities(amenities: any[], targetLat: number, targetLon: number): Place[] {
  return amenities
    .filter((a: any) => a.lat && a.lon)
    .map((a: any) => {
      const distance = haversineDistanceKm(targetLat, targetLon, a.lat, a.lon);

      return {
        name: a.name || 'Unknown',
        distance: distance.toFixed(1),
        lat: a.lat,
        lon: a.lon,
        phone: a.phone,
        address: a.address,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lon}`,
        isEmergency: a.emergency || false,
      };
    })
    .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
}

// Get offline places fallback
function getOfflinePlaces(
  targetLat: number,
  targetLon: number,
  forceRefresh: boolean = false
): PlacesResult {
  const offlineData = loadOfflineAmenitiesData(forceRefresh);

  const hospitals = processOfflineAmenities(offlineData.hospitals, targetLat, targetLon);
  const fuelStations = processOfflineAmenities(offlineData.fuelStations, targetLat, targetLon);
  const toilets = processOfflineAmenities(offlineData.toilets, targetLat, targetLon);

  return {
    hospital: hospitals[0] || null,
    toilet: toilets[0] || null,
    fuelStation: fuelStations[0] || null,
    source: 'Offline: OpenStreetMap cached data',
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const refresh = searchParams.get('refresh') === 'true';

  // Handle cache status request
  if (action === 'status') {
    const cacheAge = amenitiesCache.loadedAt
      ? Math.round((Date.now() - amenitiesCache.loadedAt) / 1000)
      : null;
    const cacheValid = isCacheValid();
    const toiletCacheStatus = getToiletCacheStatus();

    return NextResponse.json({
      cacheStatus: {
        loaded: !!amenitiesCache.data,
        valid: cacheValid,
        loadedAt: amenitiesCache.loadedAt ? new Date(amenitiesCache.loadedAt).toISOString() : null,
        ageSeconds: cacheAge,
        expiresInSeconds: cacheValid
          ? Math.round((CACHE_DURATION_MS - (Date.now() - (amenitiesCache.loadedAt || 0))) / 1000)
          : 0,
        cacheDurationMs: CACHE_DURATION_MS,
        counts: amenitiesCache.data
          ? {
              hospitals: amenitiesCache.data.hospitals.length,
              fuelStations: amenitiesCache.data.fuelStations.length,
              toilets: amenitiesCache.data.toilets.length,
            }
          : null,
      },
      toiletCache: toiletCacheStatus,
    });
  }

  // Handle cache refresh request
  if (action === 'refresh') {
    loadOfflineAmenitiesData(true); // Force refresh
    const toiletCount = await refreshToiletCache();
    const cacheAge = amenitiesCache.loadedAt
      ? Math.round((Date.now() - amenitiesCache.loadedAt) / 1000)
      : null;

    return NextResponse.json({
      message: 'Cache refreshed',
      toiletCacheRefreshed: true,
      toiletCount,
      cacheStatus: {
        loaded: !!amenitiesCache.data,
        loadedAt: amenitiesCache.loadedAt ? new Date(amenitiesCache.loadedAt).toISOString() : null,
        ageSeconds: cacheAge,
        counts: amenitiesCache.data
          ? {
              hospitals: amenitiesCache.data.hospitals.length,
              fuelStations: amenitiesCache.data.fuelStations.length,
              toilets: amenitiesCache.data.toilets.length,
            }
          : null,
      },
    });
  }

  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  const targetLat = parseFloat(lat);
  const targetLon = parseFloat(lon);
  const radius = 100000; // 100km radius for rural WA

  // Check if offline mode
  const isOffline = process.env.OFFLINE_MODE === 'true';

  // Force refresh cache if requested
  if (refresh) {
    loadOfflineAmenitiesData(true);
  }

  if (!isOffline) {
    try {
      // ─── Toilets: National Public Toilet Map via ArcGIS (primary) ─────
      // Australian Government database with 2,714+ WA toilets.
      // Uses shared utility that fetches all WA toilets and caches in memory.
      // Falls back to Overpass API if unavailable.
      let toiletPlace: Place | null = null;
      let toiletSrc = 'Overpass API';

      try {
        const nearestToilet = await findNearestToilet(targetLat, targetLon, 100);
        if (nearestToilet) {
          toiletPlace = toiletMapToPlace(nearestToilet);
          toiletSrc = 'National Public Toilet Map (Australian Government)';
        }
      } catch (e) {
        console.log(
          '[Places] National Toilet Map (ArcGIS) failed, using Overpass fallback for toilets:',
          e
        );
      }

      // ─── Overpass: hospitals and fuel (primary source for these) ─────
      const hospitalQuery = `
        node["amenity"="hospital"](around:${radius},${targetLat},${targetLon});
        way["amenity"="hospital"](around:${radius},${targetLat},${targetLon});
        node["healthcare"="hospital"](around:${radius},${targetLat},${targetLon});
        way["healthcare"="hospital"](around:${radius},${targetLat},${targetLon});
      `;

      const fuelQuery = `
        node["amenity"="fuel"](around:${radius},${targetLat},${targetLon});
        way["amenity"="fuel"](around:${radius},${targetLat},${targetLon});
      `;

      // ─── Overpass: toilets fallback (only if Toilet Map failed) ──────
      // Uses expanded search: amenity=toilets, toilets=yes, building=toilets
      const toiletQuery = `
        node["amenity"="toilets"](around:${radius},${targetLat},${targetLon});
        way["amenity"="toilets"](around:${radius},${targetLat},${targetLon});
        node["toilets"="yes"](around:${radius},${targetLat},${targetLon});
        way["toilets"="yes"](around:${radius},${targetLat},${targetLon});
        node["building"="toilets"](around:${radius},${targetLat},${targetLon});
      `;

      // Run Overpass searches in parallel (hospital + fuel + toilet fallback)
      const [hospitalElements, fuelElements, toiletElements] = await Promise.all([
        searchOverpass(targetLat, targetLon, hospitalQuery),
        searchOverpass(targetLat, targetLon, fuelQuery),
        toiletPlace ? Promise.resolve([]) : searchOverpass(targetLat, targetLon, toiletQuery),
      ]);

      // If all searches returned empty, fall back to offline
      if (
        hospitalElements.length === 0 &&
        toiletElements.length === 0 &&
        fuelElements.length === 0 &&
        !toiletPlace
      ) {
        return NextResponse.json(getOfflinePlaces(targetLat, targetLon, refresh));
      }

      const hospitals = processPlaces(hospitalElements, targetLat, targetLon, 'hospital');
      const fuelStations = processPlaces(fuelElements, targetLat, targetLon, 'fuel');
      const overpassToilets = processPlaces(toiletElements, targetLat, targetLon, 'other');

      // Use Toilet Map result if available, otherwise Overpass result
      const toilet = toiletPlace || overpassToilets[0] || null;
      if (!toiletPlace && overpassToilets[0]) {
        toiletSrc = 'OpenStreetMap (Overpass API)';
      }

      const result: PlacesResult = {
        hospital: hospitals[0] || null,
        toilet: toilet || null,
        fuelStation: fuelStations[0] || null,
        source: 'Online',
        hospitalSource: hospitals.length > 0 ? 'OpenStreetMap (Overpass API)' : 'Not found',
        fuelSource: fuelStations.length > 0 ? 'OpenStreetMap (Overpass API)' : 'Not found',
        toiletSource: toilet ? toiletSrc : 'Not found',
      };

      return NextResponse.json(result);
    } catch (error) {
      console.error('Places API error, falling back to offline:', error);
      return NextResponse.json(getOfflinePlaces(targetLat, targetLon, refresh));
    }
  }

  // Offline mode - use cached data
  return NextResponse.json(getOfflinePlaces(targetLat, targetLon, refresh));
}
