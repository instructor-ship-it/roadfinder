/**
 * API Route: /api/emergency-stations
 *
 * Find nearest fire/emergency stations using WA DFES data (SLIP ArcGIS)
 * with GNAF address enrichment from Geoscience Australia.
 *
 * Uses shared utility lib/fire-stations.ts for:
 * - DFES SLIP primary data (561+ WA fire stations, live)
 * - Geoscience Australia GNAF addresses (formatted address, suburb, operational status)
 * - Professional stations prioritized (CFRS/PFRS = 24/7 staffed)
 */

import { NextResponse } from 'next/server';
import {
  findFireStationsNear,
  findNearestFireStation,
  findNearestProfessionalFireStation,
  FireStation,
} from '@/lib/fire-stations';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const radiusKm = parseFloat(searchParams.get('radius') || '100');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Parameters required: lat, lon (optional: radius in km)' },
      { status: 400 }
    );
  }

  try {
    const stations = await findFireStationsNear(lat, lon, radiusKm, 50);

    // Categorize nearest stations
    const nearestAny = stations[0] || null;
    const nearestProfessional = stations.find((s) => ['CFRS', 'PFRS'].includes(s.type)) || null;
    const nearestVolunteer = stations.find((s) => ['VFRS', 'VFESU'].includes(s.type)) || null;
    const nearestBushFire = stations.find((s) => s.type === 'BFB') || null;

    // Convert to simpler format for API response
    const stationResults = stations.map((s: FireStation) => ({
      name: s.name,
      type: s.type,
      typeDescription: s.typeDescription,
      distanceKm: s.distanceKm,
      lat: s.lat,
      lon: s.lon,
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`,
      address: s.address,
      suburb: s.suburb,
      postcode: s.postcode,
      state: s.state,
      operationalStatus: s.operationalStatus,
      buildingName: s.buildingName,
      isProfessional: ['CFRS', 'PFRS'].includes(s.type),
    }));

    return NextResponse.json({
      stations: stationResults,
      nearest: {
        any: nearestAny
          ? {
              ...formatStation(nearestAny),
              isProfessional: ['CFRS', 'PFRS'].includes(nearestAny.type),
            }
          : null,
        professional: nearestProfessional
          ? { ...formatStation(nearestProfessional), isProfessional: true }
          : null,
        volunteer: nearestVolunteer
          ? { ...formatStation(nearestVolunteer), isProfessional: false }
          : null,
        bushFire: nearestBushFire
          ? { ...formatStation(nearestBushFire), isProfessional: false }
          : null,
      },
      stationCounts: {
        total: stations.length,
        professional: stations.filter((s) => ['CFRS', 'PFRS'].includes(s.type)).length,
        volunteer: stations.filter((s) => ['VFRS', 'VFESU'].includes(s.type)).length,
        bushFire: stations.filter((s) => s.type === 'BFB').length,
        withAddresses: stations.filter((s) => s.address).length,
      },
      searchCenter: { lat, lon },
      searchRadiusKm: radiusKm,
      dataSources: {
        primary: 'WA DFES via SLIP ArcGIS',
        enrichment: 'Geoscience Australia GNAF (addresses)',
      },
    });
  } catch (error) {
    console.error('Emergency stations query error:', error);
    return NextResponse.json({ error: 'Failed to query emergency stations' }, { status: 500 });
  }
}

function formatStation(s: FireStation) {
  return {
    name: s.name,
    distanceM: Math.round(s.distanceKm * 1000),
    distanceKm: s.distanceKm,
    type: s.type,
    typeDescription: s.typeDescription,
    lat: s.lat,
    lon: s.lon,
    googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`,
    address: s.address,
    suburb: s.suburb,
    postcode: s.postcode,
    state: s.state,
    operationalStatus: s.operationalStatus,
    buildingName: s.buildingName,
  };
}
