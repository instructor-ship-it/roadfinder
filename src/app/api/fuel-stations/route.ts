/**
 * API Route: /api/fuel-stations
 *
 * Find nearest fuel stations using FuelWatch WA RSS feed.
 * Returns station name, address, brand, price, coordinates, phone, and site features.
 *
 * Data Source: FuelWatch WA (WA Government, daily updated)
 * Endpoint: https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS
 */

import { NextResponse } from 'next/server';

interface FuelStation {
  name: string;
  brand: string;
  tradingName: string;
  location: string;
  address: string;
  phone: string | null;
  price: number | null; // cents per litre (null if not available)
  fuelType: string;
  date: string;
  lat: number;
  lon: number;
  distanceKm: number;
  googleMapsUrl: string;
  siteFeatures: string[]; // e.g. ["Open 24 hours", "Toilets", "ATM"]
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

// In-memory cache for FuelWatch data (refreshed every 30 minutes)
interface FuelCache {
  stations: ParsedStation[];
  loadedAt: number | null;
  fuelType: string;
}

const fuelCache: Record<string, FuelCache> = {};
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

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

  // Parse from site-features element
  if (siteFeatures) {
    const parts = siteFeatures
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    features.push(...parts);
  }

  // Check description for "Open 24 hours" (sometimes only there)
  if (description.includes('Open 24 hours') && !features.includes('Open 24 hours')) {
    features.unshift('Open 24 hours');
  }

  return features;
}

async function fetchFuelWatchRSS(fuelType: string = 'U91'): Promise<ParsedStation[]> {
  // Check cache
  if (
    fuelCache[fuelType] &&
    fuelCache[fuelType].stations.length > 0 &&
    fuelCache[fuelType].loadedAt &&
    Date.now() - fuelCache[fuelType].loadedAt < CACHE_DURATION_MS
  ) {
    console.log(
      `Using cached FuelWatch data for ${fuelType} (age: ${Math.round((Date.now() - fuelCache[fuelType].loadedAt!) / 1000)}s, ${fuelCache[fuelType].stations.length} stations)`
    );
    return fuelCache[fuelType].stations;
  }

  try {
    const url = `https://www.fuelwatch.wa.gov.au/fuelwatch/fuelWatchRSS?fuelType=${fuelType}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`FuelWatch RSS returned ${response.status}`);
      return fuelCache[fuelType]?.stations || [];
    }

    const xml = await response.text();
    const stations = parseFuelWatchXML(xml);

    if (stations.length > 0) {
      fuelCache[fuelType] = {
        stations,
        loadedAt: Date.now(),
        fuelType,
      };
      console.log(`Cached ${stations.length} FuelWatch stations for ${fuelType}`);
    }

    return stations;
  } catch (error) {
    console.error('FuelWatch fetch error:', error);
    // Return stale cache if available
    return fuelCache[fuelType]?.stations || [];
  }
}

function parseFuelWatchXML(xml: string): ParsedStation[] {
  const stations: ParsedStation[] = [];

  // Simple XML parser for RSS items
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const getTag = (tag: string): string => {
      const tagMatch = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return tagMatch ? tagMatch[1].trim() : '';
    };

    const lat = parseFloat(getTag('latitude'));
    const lon = parseFloat(getTag('longitude'));
    const price = parseFloat(getTag('price'));

    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      stations.push({
        brand: getTag('brand'),
        tradingName: getTag('trading-name'),
        location: getTag('location'),
        address: getTag('address'),
        phone: getTag('phone'),
        price: isNaN(price) ? 0 : price,
        date: getTag('date'),
        lat,
        lon,
        description: getTag('description'),
        siteFeatures: getTag('site-features'),
      });
    }
  }

  return stations;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const radiusKm = parseFloat(searchParams.get('radius') || '100');
  const fuelType = searchParams.get('fuelType') || 'U91';
  const surrounding = searchParams.get('surrounding') === 'true';

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Parameters required: lat, lon (optional: radius, fuelType)' },
      { status: 400 }
    );
  }

  try {
    // Fetch from FuelWatch
    const allStations = await fetchFuelWatchRSS(fuelType);

    // Filter by distance
    const nearby = allStations
      .map((s) => ({
        ...s,
        distanceKm: haversineDistance(lat, lon, s.lat, s.lon),
      }))
      .filter((s) => s.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // Convert to response format
    const stations: FuelStation[] = nearby.slice(0, 20).map((s) => ({
      name: s.tradingName || s.brand || 'Service Station',
      brand: s.brand,
      tradingName: s.tradingName,
      location: s.location,
      address: s.address,
      phone: s.phone || null,
      price: s.price > 0 ? s.price : null,
      fuelType,
      date: s.date,
      lat: s.lat,
      lon: s.lon,
      distanceKm: Math.round(s.distanceKm * 10) / 10,
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`,
      siteFeatures: parseSiteFeatures(s.description, s.siteFeatures),
    }));

    const nearest = stations[0] || null;

    return NextResponse.json({
      searchCenter: { lat, lon },
      searchRadiusKm: radiusKm,
      fuelType,
      totalStations: nearby.length,
      nearest,
      stations,
      source: 'FuelWatch WA (Government)',
      cachedAt: fuelCache[fuelType]?.loadedAt,
    });
  } catch (error) {
    console.error('Fuel stations query error:', error);
    return NextResponse.json({ error: 'Failed to query fuel stations' }, { status: 500 });
  }
}
