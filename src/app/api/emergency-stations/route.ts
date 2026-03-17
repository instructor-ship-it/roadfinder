/**
 * API Route: /api/emergency-stations
 * 
 * Find nearest emergency stations using WA DFES (Department of Fire and Emergency Services)
 * data from SLIP services.
 * 
 * Provides fire and rescue stations:
 * - BFB: Bush Fire Brigade
 * - VFRS: Volunteer Fire and Rescue Service
 * - PFRS: Permanent Fire and Rescue Service
 * 
 * Note: WA Police station data is NOT available via SLIP API - only as downloadable shapefiles
 * from https://catalogue.data.wa.gov.au/en/dataset/wa-police-stations
 */

import { NextResponse } from 'next/server';

const DFES_STATIONS_URL = "https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Infrastructure_and_Utilities/MapServer/33/query";

interface EmergencyStation {
  name: string;
  type: 'BFB' | 'VFRS' | 'PFRS' | 'Unknown';
  typeDescription: string;
  lgaCode: string | null;
  lat: number;
  lon: number;
  distanceM: number;
  googleMapsUrl: string;
}

const STATION_TYPE_DESCRIPTIONS: Record<string, string> = {
  'BFB': 'Bush Fire Brigade',
  'VFRS': 'Volunteer Fire & Rescue',
  'PFRS': 'Permanent Fire & Rescue',
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const radiusKm = parseFloat(searchParams.get('radius') || '100');
  const stationType = searchParams.get('type') || ''; // Optional filter: BFB, VFRS, PFRS
  
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ 
      error: 'Parameters required: lat, lon (optional: radius in km, type filter)'
    }, { status: 400 });
  }
  
  try {
    // Convert radius to degrees (approximate)
    const radiusDeg = radiusKm / 111; // ~111km per degree
    
    // Build bounding box
    const minLat = lat - radiusDeg;
    const maxLat = lat + radiusDeg;
    const minLon = lon - radiusDeg;
    const maxLon = lon + radiusDeg;
    
    // Query DFES stations
    const params = new URLSearchParams({
      geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'displaynam,type,lgacode',
      returnGeometry: 'true',
      f: 'json',
      resultRecordCount: '50'
    });
    
    const response = await fetch(`${DFES_STATIONS_URL}?${params}`);
    const data = await response.json();
    
    const stations: EmergencyStation[] = [];
    
    if (data.features) {
      for (const f of data.features) {
        const attrs = f.attributes;
        const geom = f.geometry;
        
        if (!geom || !attrs.displaynam) continue;
        
        const sLat = geom.y;
        const sLon = geom.x;
        
        if (isNaN(sLat) || isNaN(sLon)) continue;
        
        const stationTypeCode = attrs.type || 'Unknown';
        
        // Filter by station type if specified
        if (stationType && stationTypeCode !== stationType) continue;
        
        const distanceM = haversineDistance(lat, lon, sLat, sLon) * 1000;
        
        stations.push({
          name: attrs.displaynam,
          type: stationTypeCode as 'BFB' | 'VFRS' | 'PFRS' | 'Unknown',
          typeDescription: STATION_TYPE_DESCRIPTIONS[stationTypeCode] || 'Emergency Station',
          lgaCode: attrs.lgacode || null,
          lat: sLat,
          lon: sLon,
          distanceM: Math.round(distanceM),
          googleMapsUrl: `https://www.google.com/maps?q=${sLat},${sLon}`
        });
      }
    }
    
    // Sort by distance
    stations.sort((a, b) => a.distanceM - b.distanceM);
    
    // Get nearest stations by type
    const nearestPFRS = stations.find(s => s.type === 'PFRS'); // Professional/Permanent
    const nearestVFRS = stations.find(s => s.type === 'VFRS'); // Volunteer Fire Rescue
    const nearestBFB = stations.find(s => s.type === 'BFB');   // Bush Fire Brigade
    const nearestAny = stations[0];
    
    return NextResponse.json({
      stations: stations.slice(0, 10),
      nearest: {
        any: nearestAny || null,
        professional: nearestPFRS || null,  // 24/7 staffed
        volunteer: nearestVFRS || null,      // Volunteer fire rescue
        bushFire: nearestBFB || null         // Bush fire brigade
      },
      stationCounts: {
        total: stations.length,
        pfrs: stations.filter(s => s.type === 'PFRS').length,
        vfrs: stations.filter(s => s.type === 'VFRS').length,
        bfb: stations.filter(s => s.type === 'BFB').length
      },
      searchCenter: { lat, lon },
      searchRadiusKm: radiusKm,
      note: "WA Police station data not available via API. See: https://catalogue.data.wa.gov.au/en/dataset/wa-police-stations"
    });
    
  } catch (error) {
    console.error('Emergency stations query error:', error);
    return NextResponse.json({ 
      error: 'Failed to query emergency stations' 
    }, { status: 500 });
  }
}
