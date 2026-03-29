/**
 * API Route: /api/fuel-stations
 *
 * Find nearest fuel stations by merging two data sources:
 * 1. FuelWatch WA JSON API (daily diesel prices, site features, all WA stations)
 *    Uses the new /api/sites endpoint which properly supports diesel (DSL).
 *    The old RSS feed silently ignored diesel product codes and returned ULP.
 * 2. OpenStreetMap Overpass API (complete station coverage, no prices)
 *
 * Stations within 200m of each other are deduplicated, keeping FuelWatch data
 * (which includes pricing). Overpass-only stations fill gaps where FuelWatch
 * has no price submission for the day.
 *
 * Sort: nearest first. Nearest station is the primary result.
 */

import { NextResponse } from 'next/server';

interface FuelStation {
  name: string;
  brand: string;
  tradingName: string;
  location: string;
  address: string;
  phone: string | null;
  price: number | null; // cents per litre (null if from Overpass, no price available)
  fuelType: string;
  date: string;
  lat: number;
  lon: number;
  distanceKm: number;
  googleMapsUrl: string;
  siteFeatures: string[];
  source: 'FuelWatch' | 'OpenStreetMap'; // which data source this station came from
}

interface ParsedStation {
  brand: string;
  tradingName: string;
  location: string;
  address: string;
  phone: string;
  price: number;
  date: string;
  lat: number;
  lon: number;
  description: string;
  siteFeatures: string;
}

interface OverpassStation {
  name: string;
  brand: string;
  address: string;
  lat: number;
  lon: number;
  phone: string;
}

// In-memory cache for FuelWatch data (refreshed every 30 minutes)
interface FuelCache {
  stations: ParsedStation[];
  loadedAt: number | null;
  fuelType: string;
}

const fuelCache: Record<string, FuelCache> = {};
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const DEDUP_DISTANCE_M = 200; // stations within 200m treated as the same

/**
 * Map our app fuel type codes to FuelWatch JSON API fuel type codes.
 * The JSON API uses DSL for diesel, BDL for brand diesel.
 * Our app historically used DL (from the old RSS feed which didn't work anyway).
 */
function toFuelWatchApiCode(fuelType: string): string {
  const map: Record<string, string> = {
    DL: 'DSL', // Diesel
    DSL: 'DSL', // Diesel (already correct)
    BDL: 'BDL', // Brand Diesel
    ULP: 'ULP', // Unleaded Petrol
    PULP: 'PUP', // Premium Unleaded
    '98R': '98R', // 98 RON
    LPG: 'LPG', // LPG
    E85: 'E85', // E85
  };
  return map[fuelType] || 'DSL'; // default to diesel
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function parseSiteFeatures(description: string, siteFeatures: string): string[] {
  const features: string[] = [];

  if (siteFeatures) {
    const parts = siteFeatures
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    features.push(...parts);
  }

  if (description.includes('Open 24 hours') && !features.includes('Open 24 hours')) {
    features.unshift('Open 24 hours');
  }

  return features;
}

// ─── FuelWatch WA JSON API ──────────────────────────────────────────────

interface FuelWatchSite {
  id: number;
  siteName: string;
  address: {
    id: number;
    line1: string;
    location: string;
    postCode: number;
    state: string;
    latitude: number;
    longitude: number;
  };
  product: {
    shortName: string;
    isTruckStop: boolean;
    priceToday: number | null;
  };
  productFuelType: string;
  brandName: string;
  isClosedNow: boolean;
  isClosedAllDayTomorrow: boolean;
  drivewayService: string;
  manned: boolean;
  operates247: boolean;
  membershipRequired: boolean;
  currentPricingOrder: number;
}

async function fetchFuelWatchJSON(fuelType: string = 'DL'): Promise<ParsedStation[]> {
  if (
    fuelCache[fuelType] &&
    fuelCache[fuelType].stations.length > 0 &&
    fuelCache[fuelType].loadedAt &&
    Date.now() - fuelCache[fuelType].loadedAt < CACHE_DURATION_MS
  ) {
    console.log(
      `Using cached FuelWatch JSON data for ${fuelType} (age: ${Math.round((Date.now() - fuelCache[fuelType].loadedAt!) / 1000)}s, ${fuelCache[fuelType].stations.length} stations)`
    );
    return fuelCache[fuelType].stations;
  }

  try {
    const apiFuelType = toFuelWatchApiCode(fuelType);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const url = `https://www.fuelwatch.wa.gov.au/api/sites?fuelType=${apiFuelType}&effectiveAt=${today}`;
    console.log(`Fetching FuelWatch JSON API: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`FuelWatch JSON API returned ${response.status}`);
      return fuelCache[fuelType]?.stations || [];
    }

    const sites: FuelWatchSite[] = await response.json();

    // Map JSON response to our ParsedStation format
    const stations: ParsedStation[] = sites
      .filter((site) => {
        // Must have valid coordinates and a price
        if (!site.address?.latitude || !site.address?.longitude) return false;
        if (site.address.latitude === 0 && site.address.longitude === 0) return false;
        if (!site.product?.priceToday || site.product.priceToday <= 0) return false;
        return true;
      })
      .map((site) => {
        // priceToday is in cents per litre (e.g., 299.2 = $2.992/L for diesel)
        // Same format as the old RSS <price> field
        const priceCentsPerLitre = site.product?.priceToday ?? 0;

        const fullAddress = [
          site.address.line1,
          site.address.location,
          site.address.state,
          site.address.postCode,
        ]
          .filter(Boolean)
          .join(', ');

        // Build features from site properties
        const features: string[] = [];
        if (site.operates247) features.push('Open 24 hours');
        if (site.drivewayService && site.drivewayService !== 'None')
          features.push(site.drivewayService);
        if (site.manned) features.push('Manned');
        if (site.membershipRequired) features.push('Membership Required');
        if (site.product.isTruckStop) features.push('Truck Stop');

        return {
          brand: site.brandName || '',
          tradingName: site.siteName || site.brandName || 'Service Station',
          location: site.address.location || '',
          address: fullAddress,
          phone: '', // JSON API list endpoint doesn't include phone
          price: Math.round(priceCentsPerLitre * 10) / 10, // cents per litre, 1 decimal
          date: today,
          lat: site.address.latitude,
          lon: site.address.longitude,
          description: site.operates247 ? 'Open 24 hours' : '',
          siteFeatures: features.join(', '),
        };
      });

    if (stations.length > 0) {
      fuelCache[fuelType] = { stations, loadedAt: Date.now(), fuelType };
      console.log(
        `Cached ${stations.length} FuelWatch JSON stations for ${fuelType} (${apiFuelType})`
      );
    } else {
      console.warn(`FuelWatch JSON API returned 0 stations for ${fuelType} (${apiFuelType})`);
    }

    return stations;
  } catch (error) {
    console.error('FuelWatch JSON fetch error:', error);
    return fuelCache[fuelType]?.stations || [];
  }
}

// ─── Overpass API (for complete fuel station coverage) ─────────────────

async function fetchOverpassFuelStations(
  lat: number,
  lon: number,
  radiusM: number = 20000 // 20 km default for Overpass
): Promise<OverpassStation[]> {
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="fuel"](around:${radiusM},${lat},${lon});
      way["amenity"="fuel"](around:${radiusM},${lat},${lon});
    );
    out center;
  `;

  const servers = [
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const server of servers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(server, {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) continue;

      const data = await response.json();
      const elements = data.elements || [];

      const stations: OverpassStation[] = [];
      for (const el of elements) {
        const coords =
          el.lat && el.lon
            ? { lat: el.lat, lon: el.lon }
            : el.center?.lat && el.center?.lon
              ? { lat: el.center.lat, lon: el.center.lon }
              : null;
        if (!coords) continue;

        const tags = el.tags || {};
        const name =
          tags.name || tags.operator || tags.brand || tags['trading-name'] || 'Service Station';

        stations.push({
          name,
          brand: tags.brand || '',
          address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb']]
            .filter(Boolean)
            .join(' '),
          lat: coords.lat,
          lon: coords.lon,
          phone: tags.phone || tags['contact:phone'] || '',
        });
      }

      console.log(
        `Overpass returned ${stations.length} fuel stations (server: ${server.split('//')[1].split('/')[0]})`
      );
      return stations;
    } catch {
      continue;
    }
  }

  return [];
}

// ─── Merge: FuelWatch + Overpass ───────────────────────────────────────

function mergeStations(
  fuelWatch: { station: ParsedStation; distanceKm: number }[],
  overpass: { station: OverpassStation; distanceKm: number }[]
): FuelStation[] {
  const merged: FuelStation[] = [];

  // Track which Overpass stations have been matched (deduped with FuelWatch)
  const overpassMatched = new Set<number>();

  // 1. Add all FuelWatch stations (they have price data)
  for (const fw of fuelWatch) {
    merged.push({
      name: fw.station.tradingName || fw.station.brand || 'Service Station',
      brand: fw.station.brand,
      tradingName: fw.station.tradingName,
      location: fw.station.location,
      address: fw.station.address,
      phone: fw.station.phone || null,
      price: fw.station.price > 0 ? fw.station.price : null,
      fuelType: '',
      date: fw.station.date,
      lat: fw.station.lat,
      lon: fw.station.lon,
      distanceKm: Math.round(fw.distanceKm * 10) / 10,
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${fw.station.lat},${fw.station.lon}`,
      siteFeatures: parseSiteFeatures(fw.station.description, fw.station.siteFeatures),
      source: 'FuelWatch',
    });
  }

  // 2. Add Overpass stations that aren't duplicates of FuelWatch stations
  for (let i = 0; i < overpass.length; i++) {
    const os = overpass[i];
    let isDuplicate = false;

    for (const fw of fuelWatch) {
      const dist = haversineDistance(
        os.station.lat,
        os.station.lon,
        fw.station.lat,
        fw.station.lon
      );
      if (dist * 1000 < DEDUP_DISTANCE_M) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      merged.push({
        name: os.station.name,
        brand: os.station.brand,
        tradingName: os.station.name,
        location: '',
        address: os.station.address || '',
        phone: os.station.phone || null,
        price: null, // no price from Overpass
        fuelType: '',
        date: '',
        lat: os.station.lat,
        lon: os.station.lon,
        distanceKm: Math.round(os.distanceKm * 10) / 10,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${os.station.lat},${os.station.lon}`,
        siteFeatures: [],
        source: 'OpenStreetMap',
      });
    }
  }

  // 3. Sort by distance (nearest first)
  merged.sort((a, b) => a.distanceKm - b.distanceKm);

  return merged;
}

// ─── GET Handler ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const radiusKm = parseFloat(searchParams.get('radius') || '100');
  const fuelType = searchParams.get('fuelType') || 'DL';

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Parameters required: lat, lon (optional: radius, fuelType)' },
      { status: 400 }
    );
  }

  try {
    // Fetch both data sources in parallel
    const [fuelWatchStations, overpassStations] = await Promise.all([
      fetchFuelWatchJSON(fuelType).then((stations) =>
        stations
          .map((s) => ({
            station: s,
            distanceKm: haversineDistance(lat, lon, s.lat, s.lon),
          }))
          .filter((s) => s.distanceKm <= radiusKm)
          .sort((a, b) => a.distanceKm - b.distanceKm)
      ),
      fetchOverpassFuelStations(lat, lon, Math.min(radiusKm, 50) * 1000).then((stations) =>
        stations
          .map((s) => ({
            station: s,
            distanceKm: haversineDistance(lat, lon, s.lat, s.lon),
          }))
          .filter((s) => s.distanceKm <= radiusKm)
          .sort((a, b) => a.distanceKm - b.distanceKm)
      ),
    ]);

    // Merge and deduplicate
    const allStations = mergeStations(fuelWatchStations, overpassStations);

    const nearest = allStations[0] || null;
    const withPrice = allStations.filter((s) => s.price !== null);
    const cheapest =
      withPrice.length > 0 ? withPrice.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0] : null;

    return NextResponse.json({
      searchCenter: { lat, lon },
      searchRadiusKm: radiusKm,
      fuelType,
      totalStations: allStations.length,
      fuelWatchCount: fuelWatchStations.length,
      overpassCount: overpassStations.length,
      nearest,
      cheapest: cheapest && cheapest !== nearest ? cheapest : null, // only if different from nearest
      stations: allStations.slice(0, 20),
      source: `FuelWatch JSON API (${fuelWatchStations.length}) + OpenStreetMap (${overpassStations.length})`,
      cachedAt: fuelCache[fuelType]?.loadedAt,
    });
  } catch (error) {
    console.error('Fuel stations query error:', error);
    return NextResponse.json({ error: 'Failed to query fuel stations' }, { status: 500 });
  }
}
