/**
 * API Route: /api/nearest-hospital
 * 
 * Find nearest hospitals and nursing posts using WA Health SLIP services
 * Provides accurate hospital data including Emergency Department status,
 * phone numbers, and bed counts.
 * 
 * Layers:
 * - Layer 7: Hospitals (with ED indicator)
 * - Layer 6: Nursing Posts (rural/remote medical facilities)
 */

import { NextResponse } from 'next/server';

const HEALTH_SERVICE_URL = "https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Health/MapServer";

interface Hospital {
  name: string;
  address: string;
  suburb: string;
  phone: string | null;
  category: string;
  type: 'Public' | 'Private' | 'Unknown';
  hasED: boolean;
  beds: number | null;
  lat: number;
  lon: number;
  distanceM: number;
  googleMapsUrl: string;
}

interface NursingPost {
  name: string;
  address: string;
  suburb: string;
  phone: string | null;
  lat: number;
  lon: number;
  distanceM: number;
  googleMapsUrl: string;
}

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
  const radiusKm = parseFloat(searchParams.get('radius') || '100'); // Default 100km radius
  const includeNursingPosts = searchParams.get('nursingPosts') !== 'false';
  
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ 
      error: 'Parameters required: lat, lon (optional: radius in km, nursingPosts)'
    }, { status: 400 });
  }
  
  try {
    // Convert radius to degrees (approximate for WA latitude)
    const radiusDeg = radiusKm / 111;
    
    // Build bounding box
    const minLat = lat - radiusDeg;
    const maxLat = lat + radiusDeg;
    const minLon = lon - radiusDeg;
    const maxLon = lon + radiusDeg;
    
    const hospitals: Hospital[] = [];
    const nursingPosts: NursingPost[] = [];
    
    // Query Hospitals (Layer 7)
    const hospitalParams = new URLSearchParams({
      geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'establishm,address,suburb,telephone,category,est,ed_reporti,no_of_beds,longitude,latitude',
      returnGeometry: 'true',
      f: 'json',
      resultRecordCount: '100'
    });
    
    const hospitalResponse = await fetch(`${HEALTH_SERVICE_URL}/7/query?${hospitalParams}`);
    const hospitalData = await hospitalResponse.json();
    
    if (hospitalData.features && hospitalData.features.length > 0) {
      for (const f of hospitalData.features) {
        const attrs = f.attributes;
        const geom = f.geometry;
        
        if (!geom || !attrs.establishm) continue;
        
        const hLat = geom.y;
        const hLon = geom.x;
        
        // Calculate distance
        const distanceM = haversineDistance(lat, lon, hLat, hLon) * 1000;
        
        hospitals.push({
          name: attrs.establishm,
          address: attrs.address || '',
          suburb: attrs.suburb || '',
          phone: attrs.telephone || null,
          category: attrs.category || 'Hospital',
          type: attrs.est === 'Public' ? 'Public' : attrs.est === 'Private' ? 'Private' : 'Unknown',
          hasED: attrs.ed_reporti === 'Y',
          beds: attrs.no_of_beds || null,
          lat: hLat,
          lon: hLon,
          distanceM: Math.round(distanceM),
          googleMapsUrl: `https://www.google.com/maps?q=${hLat},${hLon}`
        });
      }
    }
    
    // Query Nursing Posts (Layer 6) if requested
    if (includeNursingPosts) {
      const nursingParams = new URLSearchParams({
        geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
        geometryType: 'esriGeometryEnvelope',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'establishm,address,suburb,telephone,category,longitude,latitude',
        returnGeometry: 'true',
        f: 'json',
        resultRecordCount: '50'
      });
      
      const nursingResponse = await fetch(`${HEALTH_SERVICE_URL}/6/query?${nursingParams}`);
      const nursingData = await nursingResponse.json();
      
      if (nursingData.features && nursingData.features.length > 0) {
        for (const f of nursingData.features) {
          const attrs = f.attributes;
          const geom = f.geometry;
          
          if (!geom || !attrs.establishm) continue;
          
          const nLat = geom.y;
          const nLon = geom.x;
          
          // Calculate distance
          const distanceM = haversineDistance(lat, lon, nLat, nLon) * 1000;
          
          nursingPosts.push({
            name: attrs.establishm,
            address: attrs.address || '',
            suburb: attrs.suburb || '',
            phone: attrs.telephone || null,
            lat: nLat,
            lon: nLon,
            distanceM: Math.round(distanceM),
            googleMapsUrl: `https://www.google.com/maps?q=${nLat},${nLon}`
          });
        }
      }
    }
    
    // Sort by distance
    hospitals.sort((a, b) => a.distanceM - b.distanceM);
    nursingPosts.sort((a, b) => a.distanceM - b.distanceM);
    
    // Find nearest hospital with ED
    const nearestWithED = hospitals.find(h => h.hasED);
    
    // Find nearest public hospital with ED (usually better for emergencies)
    const nearestPublicWithED = hospitals.find(h => h.hasED && h.type === 'Public');
    
    return NextResponse.json({
      searchCenter: { lat, lon },
      searchRadiusKm: radiusKm,
      
      // Primary result - nearest hospital with ED (prefer public)
      nearestHospital: nearestPublicWithED || nearestWithED || (hospitals.length > 0 ? hospitals[0] : null),
      
      // All hospitals sorted by distance
      hospitals: hospitals.slice(0, 10), // Top 10 nearest
      
      // Hospitals with Emergency Departments only
      hospitalsWithED: hospitals.filter(h => h.hasED).slice(0, 5),
      
      // Nursing posts (useful in remote areas)
      nursingPosts: nursingPosts.slice(0, 5),
      
      // Counts
      totalCounts: {
        hospitals: hospitals.length,
        hospitalsWithED: hospitals.filter(h => h.hasED).length,
        nursingPosts: nursingPosts.length
      },
      
      // Data source
      source: 'WA Health SLIP Services'
    });
    
  } catch (error) {
    console.error('Nearest hospital error:', error);
    return NextResponse.json({ 
      error: 'Failed to find nearest hospitals' 
    }, { status: 500 });
  }
}
