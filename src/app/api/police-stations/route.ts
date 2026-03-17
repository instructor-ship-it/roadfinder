/**
 * API Route: /api/police-stations
 * 
 * Find nearest WA Police stations from pre-loaded static data.
 * 
 * Data sourced from WA Police Force Facilities (WAPOL-001)
 * https://catalogue.data.wa.gov.au/en/dataset/wa-police-stations
 * 
 * This data was downloaded and converted to JSON format for the application.
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface PoliceStation {
  name: string;
  address: string;
  suburb: string;
  postcode: string;
  lat: number;
  lon: number;
  status: string;
  type: string;
  distanceM?: number;
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
  const status = searchParams.get('status') || 'OPERATIONAL'; // Filter by operational status
  
  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ 
    error: 'Parameters required: lat, lon (optional: radius in km, status filter)'
  }, { status: 400 });
  }
  
  try {
    // Read stations data from public directory
    const filePath = path.join(process.cwd(), 'public', 'data', 'wa_police_stations.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const stationsData = JSON.parse(fileContent) as PoliceStation[];
    
    // Filter stations
    let filteredStations = stationsData.filter(s => {
      // Skip stations without valid coordinates
      if (isNaN(s.lat) || isNaN(s.lon)) return false;
      
      // Filter by status if specified
      if (status && s.status !== status) return false;
      
      return true;
    });
    
    // Calculate distances
    const stationsWithDistance: PoliceStation[] = filteredStations.map(s => ({
      ...s,
      distanceM: haversineDistance(lat, lon, s.lat, s.lon) * 1000
    }));
    
    // Sort by distance
    stationsWithDistance.sort((a, b) => (a.distanceM || Infinity) - (b.distanceM || Infinity));
    
    // Filter by radius
    const radiusM = radiusKm * 1000;
    const nearbyStations = stationsWithDistance.filter(s => (s.distanceM || 1) <= radiusM);
    
    // Get nearest station
    const nearestStation = nearbyStations[0] || stationsWithDistance[0] || null;
    
    return NextResponse.json({
      stations: nearbyStations.slice(0, 10),
      nearest: nearestStation || null,
      totalFound: nearbyStations.length,
      searchCenter: { lat, lon },
      searchRadiusKm: radiusKm,
      dataSource: 'WA Police Force Facilities (WAPOL-001) - data.wa.gov.au'
    });
    
  } catch (error) {
    console.error('Police stations query error:', error);
    return NextResponse.json({ 
      error: 'Failed to query police stations' 
    }, { status: 500 });
  }
}
