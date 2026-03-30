/**
 * API Route: /api/toilets
 *
 * Find public toilets near a location using the National Public Toilet Map
 * of Australia. Data source: ArcGIS Feature Service (NSW Government open
 * data portal) with 2,714+ toilets in Western Australia.
 *
 * Falls back to Overpass API (OSM) if the ArcGIS service is unavailable.
 */

import { NextResponse } from 'next/server';
import {
  findToiletsNear,
  getToiletCacheStatus,
  refreshToiletCache,
  haversineDistance,
} from '@/lib/toilet-map';

// ─── Overpass API (fallback) ───────────────────────────────────────────

interface OverpassToilet {
  name: string;
  facilityType: string;
  address: string;
  town: string;
  state: string;
  lat: number;
  lon: number;
  distanceKm: number;
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
  wheelchair: boolean;
  url: string;
  toiletNote: string;
  source: 'NationalToiletMap' | 'OpenStreetMap';
}

async function fetchOverpassToilets(
  lat: number,
  lon: number,
  radiusM: number = 50000
): Promise<OverpassToilet[]> {
  const toiletQuery = `
    node["amenity"="toilets"](around:${radiusM},${lat},${lon});
    way["amenity"="toilets"](around:${radiusM},${lat},${lon});
    node["toilets"="yes"](around:${radiusM},${lat},${lon});
    way["toilets"="yes"](around:${radiusM},${lat},${lon});
    node["building"="toilets"](around:${radiusM},${lat},${lon});
  `;

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
        body: `data=${encodeURIComponent(`[out:json][timeout:25];(${toiletQuery});out center;`)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) continue;

      const data = await response.json();
      const elements = data.elements || [];

      const toilets: OverpassToilet[] = [];
      const seen = new Set<number>();

      for (const el of elements) {
        if (seen.has(el.id)) continue;
        seen.add(el.id);

        const coords =
          el.lat && el.lon
            ? { lat: el.lat, lon: el.lon }
            : el.center?.lat && el.center?.lon
              ? { lat: el.center.lat, lon: el.center.lon }
              : null;
        if (!coords) continue;

        const tags = el.tags || {};
        const dist = haversineDistance(lat, lon, coords.lat, coords.lon);
        const name = tags.name || tags.operator || '';
        const accessible = tags.wheelchair === 'yes' || tags.wheelchair === 'designated';

        toilets.push({
          name: name || 'Public Toilets',
          facilityType: tags.amenity === 'toilets' ? 'Public Toilet' : tags.amenity || 'Unknown',
          address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb']]
            .filter(Boolean)
            .join(' '),
          town: tags['addr:city'] || tags['addr:suburb'] || '',
          state: '',
          lat: coords.lat,
          lon: coords.lon,
          distanceKm: Math.round(dist * 10) / 10,
          openingHours: '',
          openingHoursNote: '',
          accessible,
          ambulant: false,
          male: false,
          female: false,
          unisex: false,
          allGender: false,
          parking: false,
          parkingAccessible: false,
          babyChange: false,
          shower: false,
          drinkingWater: false,
          wheelchair: accessible,
          url: '',
          toiletNote: '',
          source: 'OpenStreetMap',
        });
      }

      console.log(
        `Overpass returned ${toilets.length} toilets (server: ${server.split('//')[1].split('/')[0]})`
      );
      return toilets;
    } catch {
      continue;
    }
  }

  return [];
}

// ─── GET Handler ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const radiusKm = parseFloat(searchParams.get('radius') || '50');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Parameters required: lat, lon (optional: radius)' },
      { status: 400 }
    );
  }

  try {
    let toilets: any[] = [];
    let source = 'National Public Toilet Map (Australian Government)';

    // 1. Try National Public Toilet Map (ArcGIS) via shared utility
    try {
      const results = await findToiletsNear(lat, lon, radiusKm, 10);
      if (results.length > 0) {
        toilets = results;
      } else {
        console.log('[/api/toilets] No results from National Toilet Map, falling back to Overpass');
      }
    } catch (error) {
      console.error('[/api/toilets] National Toilet Map failed, falling back to Overpass:', error);
    }

    // 2. If no results from National Toilet Map, try Overpass as fallback
    if (toilets.length === 0) {
      toilets = await fetchOverpassToilets(lat, lon, Math.min(radiusKm, 50) * 1000);
      source = 'OpenStreetMap (Overpass API)';
    }

    const nearest = toilets[0] || null;

    return NextResponse.json({
      searchCenter: { lat, lon },
      searchRadiusKm: radiusKm,
      totalFound: toilets.length,
      nearest,
      toilets: toilets.slice(0, 10),
      source,
      cache: getToiletCacheStatus(),
    });
  } catch (error) {
    console.error('Toilet query error:', error);
    return NextResponse.json({ error: 'Failed to query toilets' }, { status: 500 });
  }
}
