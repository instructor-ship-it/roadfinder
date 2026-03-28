/**
 * API Route: /api/hospitals
 * 
 * Find nearest hospitals using WA Health SLIP services
 * Provides accurate hospital data including Emergency Department status
 * 
 * Layer 7: Hospitals (with ED reporting)
 * Layer 6: Nursing Posts (rural/remote areas)
 */

import { NextResponse } from 'next/server';

const HEALTH_URL = "https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Health/MapServer/7/query";
const NURSING_POSTS_URL = "https://public-services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Health/MapServer/6/query";

interface Hospital {
  name: string;
  address: string;
  suburb: string;
  telephone: string;
  category: string;
  type: 'Public' | 'Private';
  hasEmergency: boolean;
  beds: number;
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
  const radiusKm = parseFloat(searchParams.get('radius') || '100');
  const edOnly = searchParams.get('edOnly') === 'true';
  
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ 
      error: 'Parameters required: lat, lon (optional: radius in km, edOnly)'
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
    
    // Query hospitals
    const hospitalParams = new URLSearchParams({
      geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'establishm,address,suburb,telephone,category,est,ed_reporti,no_of_beds,longitude,latitude',
      returnGeometry: 'true',
      f: 'json',
      resultRecordCount: '50'
    });
    
    const hospitalResponse = await fetch(`${HEALTH_URL}?${hospitalParams}`);
    const hospitalData = await hospitalResponse.json();
    
    const hospitals: Hospital[] = [];
    
    // Process hospitals
    if (hospitalData.features) {
      for (const f of hospitalData.features) {
        const attrs = f.attributes;
        const geom = f.geometry;
        
        if (!geom || !attrs.establishm) continue;
        
        const hLat = geom.y || attrs.latitude;
        const hLon = geom.x || attrs.longitude;
        
        if (isNaN(hLat) || isNaN(hLon)) continue;
        
        const hasEmergency = attrs.ed_reporti === 'Y';
        
        // Filter by ED only if requested
        if (edOnly && !hasEmergency) continue;
        
        const distanceM = haversineDistance(lat, lon, hLat, hLon) * 1000;
        
        hospitals.push({
          name: attrs.establishm,
          address: attrs.address || '',
          suburb: attrs.suburb || '',
          telephone: attrs.telephone || '',
          category: attrs.category || 'Hospital',
          type: attrs.est === 'Private' ? 'Private' : 'Public',
          hasEmergency,
          beds: attrs.no_of_beds || 0,
          lat: hLat,
          lon: hLon,
          distanceM: Math.round(distanceM),
          googleMapsUrl: `https://www.google.com/maps?q=${hLat},${hLon}`
        });
      }
    }
    
    // Sort by distance
    hospitals.sort((a, b) => a.distanceM - b.distanceM);
    
    // If no hospitals with ED found nearby, query nursing posts for remote areas
    let nursingPosts: Hospital[] = [];
    if (hospitals.filter(h => h.hasEmergency).length === 0 || !edOnly) {
      const nursingParams = new URLSearchParams({
        geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
        geometryType: 'esriGeometryEnvelope',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'establishm,address,suburb,telephone,category,longitude,latitude',
        returnGeometry: 'true',
        f: 'json',
        resultRecordCount: '20'
      });
      
      try {
        const nursingResponse = await fetch(`${NURSING_POSTS_URL}?${nursingParams}`);
        const nursingData = await nursingResponse.json();
        
        if (nursingData.features) {
          for (const f of nursingData.features) {
            const attrs = f.attributes;
            const geom = f.geometry;
            
            if (!geom || !attrs.establishm) continue;
            
            const nLat = geom.y || attrs.latitude;
            const nLon = geom.x || attrs.longitude;
            
            if (isNaN(nLat) || isNaN(nLon)) continue;
            
            const distanceM = haversineDistance(lat, lon, nLat, nLon) * 1000;
            
            nursingPosts.push({
              name: attrs.establishm,
              address: attrs.address || '',
              suburb: attrs.suburb || '',
              telephone: attrs.telephone || '',
              category: 'Nursing Post',
              type: 'Public',
              hasEmergency: false,
              beds: 0,
              lat: nLat,
              lon: nLon,
              distanceM: Math.round(distanceM),
              googleMapsUrl: `https://www.google.com/maps?q=${nLat},${nLon}`
            });
          }
        }
        
        nursingPosts.sort((a, b) => a.distanceM - b.distanceM);
      } catch (e) {
        console.error('Failed to fetch nursing posts:', e);
      }
    }
    
    // Get nearest hospital with ED
    const nearestWithED = hospitals.find(h => h.hasEmergency);
    
    // Get nearest hospital overall
    const nearestHospital = hospitals[0];
    
    // Get nearest nursing post (for remote areas)
    const nearestNursingPost = nursingPosts[0];
    
    return NextResponse.json({
      hospitals: hospitals.slice(0, 10),
      nursingPosts: nursingPosts.slice(0, 5),
      nearest: {
        hospital: nearestHospital || null,
        hospitalWithED: nearestWithED || null,
        nursingPost: nearestNursingPost || null
      },
      searchCenter: { lat, lon },
      searchRadiusKm: radiusKm
    });
    
  } catch (error) {
    console.error('Hospitals query error:', error);
    return NextResponse.json({ 
      error: 'Failed to query hospitals' 
    }, { status: 500 });
  }
}
