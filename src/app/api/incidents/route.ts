import { NextRequest, NextResponse } from 'next/server';

// WebEOC ArcGIS Feature Service URLs (Main Roads WA)
const INCIDENTS_URL = 'https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/WebEoc_RoadIncidents/FeatureServer/1/query';
const CLOSURES_URL = 'https://services2.arcgis.com/cHGEnmsJ165IBJRM/arcgis/rest/services/WebEoc_RoadClosures/FeatureServer/4/query';

export interface RoadIncident {
  fid: number;
  id: number;
  location: string;
  incidentType: string;
  closureType: string;
  trafficCondition: string;
  trafficImpact: string;
  road: string;
  region: string;
  suburb: string;
  entryDate: string;
  updateDate: string;
  seeMoreUrl: string | null;
  localRoadName: string;
  latitude: number;
  longitude: number;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
}

export interface RoadClosure {
  fid: number;
  id: number;
  location: string;
  incidentType: string;
  closureType: string;
  trafficImpact: string;
  road: string;
  region: string;
  suburb: string;
  entryDate: string;
  updateDate: string;
  seeMoreUrl: string | null;
  localRoadName: string;
  geometry: number[][]; // Polyline paths [lon, lat]
}

// Convert Web Mercator (EPSG:3857) to WGS84 (EPSG:4326)
function mercatorToWgs84(x: number, y: number): { lat: number; lon: number } {
  const lon = (x / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
  return { lat, lon };
}

// Determine severity from closure/incident type
function getSeverity(incidentType: string, closureType: string, trafficCondition: string): 'critical' | 'major' | 'moderate' | 'minor' {
  const type = (incidentType + ' ' + closureType + ' ' + trafficCondition).toLowerCase();

  if (type.includes('road closed') || type.includes('road closure') || type.includes('flooding') || type.includes('bushfire')) {
    return 'critical';
  }
  if (type.includes('caution') || type.includes('crash') || type.includes('breakdown')) {
    return 'major';
  }
  if (type.includes('lane') || type.includes('pothole') || type.includes('debris') || type.includes('surface')) {
    return 'moderate';
  }
  return 'minor';
}

// Parse date string like "13/03/2026 00:11:20"
function parseDate(dateStr: string): number {
  if (!dateStr) return 0;
  try {
    const [datePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    return new Date(year, month - 1, day).getTime();
  } catch {
    return 0;
  }
}

// Transform ArcGIS incident feature to our format
function transformIncident(feature: any): RoadIncident {
  const attrs = feature.attributes;
  const geom = feature.geometry;

  const { lat, lon } = mercatorToWgs84(geom.x, geom.y);

  return {
    fid: attrs.FID,
    id: attrs.Id,
    location: attrs.Location || '',
    incidentType: attrs.IncidentTy || 'Unknown',
    closureType: attrs.ClosureTyp || '',
    trafficCondition: attrs.TrafficCon || 'All Lanes Open',
    trafficImpact: attrs.TrafficImp || '',
    road: attrs.Road || '',
    region: attrs.Region || '',
    suburb: attrs.Suburb || '',
    entryDate: attrs.EntryDate || '',
    updateDate: attrs.UpdateDate || '',
    seeMoreUrl: attrs.SeeMoreUrl || null,
    localRoadName: attrs.LocalRoadName || '',
    latitude: lat,
    longitude: lon,
    severity: getSeverity(attrs.IncidentTy || '', attrs.ClosureTyp || '', attrs.TrafficCon || '')
  };
}

// Transform ArcGIS closure feature to our format
function transformClosure(feature: any): RoadClosure {
  const attrs = feature.attributes;
  const geom = feature.geometry;

  // Convert all path coordinates from Mercator to WGS84
  const paths = geom.paths?.[0] || [];
  const geometry = paths.map((point: number[]) => {
    const { lon, lat } = mercatorToWgs84(point[0], point[1]);
    return [lon, lat];
  });

  return {
    fid: attrs.FID,
    id: attrs.Id,
    location: attrs.Location || '',
    incidentType: attrs.IncidentTy || 'Unknown',
    closureType: attrs.ClosureTyp || '',
    trafficImpact: attrs.TrafficImp || '',
    road: attrs.Road || '',
    region: attrs.Region || '',
    suburb: attrs.Suburb || '',
    entryDate: attrs.EntryDate || '',
    updateDate: attrs.UpdateDate || '',
    seeMoreUrl: attrs.SeeMoreUrl || null,
    localRoadName: attrs.LocalRoadName || '',
    geometry
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'all';
  const roadId = searchParams.get('road_id');
  const region = searchParams.get('region');
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    // Build where clause
    let whereClause = "publishExt = 'Yes'";

    if (roadId) {
      whereClause += ` AND Road = '${roadId.toUpperCase()}'`;
    }

    if (region) {
      whereClause += ` AND Region = '${region}'`;
    }

    if (action === 'all' || action === 'incidents') {
      // Fetch road incidents (points)
      const incidentsParams = new URLSearchParams({
        where: whereClause,
        outFields: '*',
        returnGeometry: 'true',
        resultRecordCount: limit.toString(),
        orderByFields: 'UpdateDate DESC',
        f: 'json'
      });

      const incidentsResponse = await fetch(`${INCIDENTS_URL}?${incidentsParams}`, {
        headers: {
          'User-Agent': 'TCWorkZoneLocator/1.6 (WA Traffic Control Application)'
        }
      });

      const incidentsData = await incidentsResponse.json();
      const incidents = (incidentsData.features || []).map(transformIncident);

      if (action === 'incidents') {
        return NextResponse.json({
          success: true,
          count: incidents.length,
          incidents,
          lastUpdated: new Date().toISOString()
        });
      }

      // Fetch road closures (lines)
      const closuresParams = new URLSearchParams({
        where: whereClause,
        outFields: '*',
        returnGeometry: 'true',
        resultRecordCount: limit.toString(),
        orderByFields: 'UpdateDate DESC',
        f: 'json'
      });

      const closuresResponse = await fetch(`${CLOSURES_URL}?${closuresParams}`, {
        headers: {
          'User-Agent': 'TCWorkZoneLocator/1.6 (WA Traffic Control Application)'
        }
      });

      const closuresData = await closuresResponse.json();
      const closures = (closuresData.features || []).map(transformClosure);

      // Combine and deduplicate by road+location
      const allIncidents: RoadIncident[] = [...incidents];
      const seenLocations = new Set(incidents.map(i => `${i.road}-${i.location}`));

      for (const closure of closures) {
        const key = `${closure.road}-${closure.location}`;
        if (!seenLocations.has(key)) {
          // Convert closure to incident format for display
          const severity = getSeverity(closure.incidentType, closure.closureType, closure.closureType.includes('closed') ? 'Road Closure' : 'Lane Closure');
          allIncidents.push({
            fid: closure.fid,
            id: closure.id,
            location: closure.location,
            incidentType: closure.incidentType,
            closureType: closure.closureType,
            trafficCondition: closure.closureType.includes('closed') ? 'Road Closure' : 'Lane Closure',
            trafficImpact: closure.trafficImpact,
            road: closure.road,
            region: closure.region,
            suburb: closure.suburb,
            entryDate: closure.entryDate,
            updateDate: closure.updateDate,
            seeMoreUrl: closure.seeMoreUrl,
            localRoadName: closure.localRoadName,
            // Use first point of geometry as representative location
            latitude: closure.geometry[0]?.[1] || 0,
            longitude: closure.geometry[0]?.[0] || 0,
            severity
          });
          seenLocations.add(key);
        }
      }

      // Sort by update date (most recent first)
      allIncidents.sort((a, b) => parseDate(b.updateDate) - parseDate(a.updateDate));

      // Group by severity
      const bySeverity = {
        critical: allIncidents.filter(i => i.severity === 'critical'),
        major: allIncidents.filter(i => i.severity === 'major'),
        moderate: allIncidents.filter(i => i.severity === 'moderate'),
        minor: allIncidents.filter(i => i.severity === 'minor')
      };

      return NextResponse.json({
        success: true,
        count: allIncidents.length,
        incidents: allIncidents.slice(0, limit),
        bySeverity,
        lastUpdated: new Date().toISOString()
      });
    }

    if (action === 'closures') {
      const closuresParams = new URLSearchParams({
        where: whereClause,
        outFields: '*',
        returnGeometry: 'true',
        resultRecordCount: limit.toString(),
        orderByFields: 'UpdateDate DESC',
        f: 'json'
      });

      const closuresResponse = await fetch(`${CLOSURES_URL}?${closuresParams}`, {
        headers: {
          'User-Agent': 'TCWorkZoneLocator/1.6 (WA Traffic Control Application)'
        }
      });

      const closuresData = await closuresResponse.json();
      const closures = (closuresData.features || []).map(transformClosure);

      return NextResponse.json({
        success: true,
        count: closures.length,
        closures,
        lastUpdated: new Date().toISOString()
      });
    }

    if (action === 'regions') {
      // Get all incidents and extract unique regions
      const params = new URLSearchParams({
        where: "publishExt = 'Yes'",
        outFields: 'Region',
        resultRecordCount: '1000',
        f: 'json'
      });

      const response = await fetch(`${INCIDENTS_URL}?${params}`, {
        headers: {
          'User-Agent': 'TCWorkZoneLocator/1.6 (WA Traffic Control Application)'
        }
      });

      const data = await response.json();
      const regionSet = new Set<string>();
      (data.features || []).forEach((f: any) => {
        if (f.attributes.Region) {
          regionSet.add(f.attributes.Region);
        }
      });
      const regions = Array.from(regionSet).sort();

      return NextResponse.json({
        success: true,
        regions
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: all, incidents, closures, or regions'
    }, { status: 400 });

  } catch (error) {
    console.error('Incidents API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch incident data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
