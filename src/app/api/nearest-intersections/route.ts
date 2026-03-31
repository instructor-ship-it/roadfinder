/**
 * API Route: /api/nearest-intersections
 *
 * Find nearest intersections using MRWA Intersections Layer (Layer 6)
 * This provides accurate intersection names instead of confusing road network node names
 */

import { NextResponse } from 'next/server';

const INTERSECTIONS_URL =
  'https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/6/query';

interface IntersectionResult {
  nodeName: string;
  lat: number;
  lon: number;
  nodeType: string;
  distanceM: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const radiusKm = parseFloat(searchParams.get('radius') || '2');

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      {
        error: 'Parameters required: lat, lon (optional: radius in km, default 2)',
      },
      { status: 400 }
    );
  }

  try {
    // Convert radius to degrees (approximate)
    const radiusDeg = radiusKm / 111; // ~111km per degree

    // Build bounding box
    const minLat = lat - radiusDeg;
    const maxLat = lat + radiusDeg;
    const minLon = lon - radiusDeg;
    const maxLon = lon + radiusDeg;

    const params = new URLSearchParams({
      geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'NODE_DESCR,NODE_TYPE',
      returnGeometry: 'true',
      f: 'json',
      resultRecordCount: '200',
    });

    const response = await fetch(`${INTERSECTIONS_URL}?${params}`);
    const result = await response.json();

    if (!result.features || result.features.length === 0) {
      return NextResponse.json({
        intersections: [],
        count: 0,
        searchCenter: { lat, lon },
        searchRadiusKm: radiusKm,
      });
    }

    // Calculate distance to each intersection and sort
    const intersections: IntersectionResult[] = [];

    for (const f of result.features) {
      const attrs = f.attributes;
      const geom = f.geometry;

      if (!geom || !attrs.NODE_DESCR) continue;

      const intLat = geom.y;
      const intLon = geom.x;

      // Calculate distance using Haversine formula
      const distanceM = haversineDistance(lat, lon, intLat, intLon) * 1000;

      intersections.push({
        nodeName: attrs.NODE_DESCR,
        lat: intLat,
        lon: intLon,
        nodeType: attrs.NODE_TYPE || 'Unknown',
        distanceM: Math.round(distanceM),
      });
    }

    // Sort by distance
    intersections.sort((a, b) => a.distanceM - b.distanceM);

    // Debug logging for emergency cross road detection
    console.log(
      `[Intersections] Nearest intersections for (${lat.toFixed(6)}, ${lon.toFixed(6)}):`
    );
    intersections.slice(0, 10).forEach((int, i) => {
      console.log(`  ${i + 1}. ${int.nodeName} (${int.distanceM}m)`);
    });

    return NextResponse.json({
      intersections,
      count: intersections.length,
      searchCenter: { lat, lon },
      searchRadiusKm: radiusKm,
    });
  } catch (error) {
    console.error('Nearest intersections error:', error);
    return NextResponse.json(
      {
        error: 'Failed to find nearest intersections',
      },
      { status: 500 }
    );
  }
}
