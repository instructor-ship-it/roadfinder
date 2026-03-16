import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STATE_ROAD_URL = "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/24/query";
const TRAFFIC_URL = "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/27/query";

// Cache for offline traffic data
let offlineTrafficData: Map<string, any> | null = null;

function loadOfflineTrafficData(): Map<string, any> {
  if (offlineTrafficData) return offlineTrafficData;
  
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'traffic-data.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      offlineTrafficData = new Map();
      
      // Common WA road name to road_id mappings
      const roadIdMap: Record<string, string> = {
        'Great Eastern Hwy': 'H005',
        'Great Northern Hwy': 'H001',
        'Albany Hwy': 'H009',
        'Brookton Hwy': 'H011',
        'Tonkin Hwy': 'H004',
        'Kwinana Hwy': 'H003',
        'Mitchell Hwy': 'H002',
        'Roe Hwy': 'H006',
        'Leach Hwy': 'H007',
        'Graham Farmer Fwy': 'H008',
        'Mandurah Rd': 'H010',
        'Rockingham Rd': 'H012',
        'West Coast Hwy': 'H013',
        'Marmion Ave': 'H014',
        'Stirling Hwy': 'H015',
        'Canning Hwy': 'H016',
        'Curtin Ave': 'H017',
        'Mounts Bay Rd': 'H018',
        'Riverside Dr': 'H019',
        'Adelaide Tce': 'H020',
        'Hay St': 'H021',
        'Murray St': 'H022',
        'Barrack St': 'H023',
        'William St': 'H024',
        'Wellington St': 'H025',
        'Beaufort St': 'H026',
        'Bulwer St': 'H027',
        'Orrong Rd': 'H028',
        'Kenwick Link': 'H029',
        'Welshpool Rd': 'H030',
        'Armadale Rd': 'H031',
        'Nicholson Rd': 'H032',
        'Warton Rd': 'H033',
        'Hale Rd': 'H034',
        'Whitfords Ave': 'H036',
        'Ocean Reef Rd': 'H037',
        'Wanneroo Rd': 'H038',
        'Marangaroo Dr': 'H039',
        'Joondalup Dr': 'H040',
        'Burns Beach Rd': 'H041',
        'Connolly Dr': 'H042',
        'Pinjar Rd': 'H047',
        'Neerabup Rd': 'H048',
        'Toodyay Rd': 'H058',
        'South Coast Hwy': 'H067',
        'South Western Hwy': 'H068',
        'Vasse Hwy': 'H069',
        'Bussell Hwy': 'H070',
        'Brockman Hwy': 'H071',
        'Collie Rd': 'H073',
        'Donnybrook Rd': 'H079',
        'Capel Rd': 'H081',
        'Caves Rd': 'H085',
        'Mandurah Tce': 'H054',
        'Pinjarra Rd': 'H055',
      };
      
      for (const road of data.traffic || []) {
        // Store by road_name (primary key in data)
        if (road.road_name) {
          offlineTrafficData.set(road.road_name, road);
          
          // Also store by road_id if we have a mapping
          const mappedRoadId = roadIdMap[road.road_name];
          if (mappedRoadId) {
            offlineTrafficData.set(mappedRoadId, road);
          }
        }
      }
      
      console.log(`Loaded ${offlineTrafficData.size} roads with offline traffic data`);
    }
  } catch (e) {
    console.error('Error loading offline traffic data:', e);
  }
  
  return offlineTrafficData || new Map();
}

async function fetchArcGIS(baseUrl: string, params: Record<string, string>, timeoutMs = 5000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.json();
  } catch (e: any) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// Calculate distance between two points in km
function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getOfflineTrafficResponse(roadId: string, targetLat: number | null, targetLon: number | null) {
  const offlineData = loadOfflineTrafficData();
  const roadData = offlineData.get(roadId);
  
  if (!roadData) {
    return {
      road_id: roadId,
      road_name: null,
      aadt: null,
      aadt_year: null,
      heavy_vehicle_percent: null,
      peak_hour_volume: null,
      source: 'Offline: No traffic data available',
      sites: [],
      offline: true
    };
  }
  
  // Process sites
  const sites = (roadData.sites || []).map((site: any) => {
    let distanceKm: number | null = null;
    if (targetLat && targetLon && site.lat && site.lon) {
      distanceKm = calcDistanceKm(targetLat, targetLon, site.lat, site.lon);
    }
    
    return {
      site_no: site.site_no,
      location: site.location_desc,
      year: site.traffic_year,
      aadt: site.aadt || 0,
      heavy_percent: site.heavy_vehicle_pct || 0,
      lat: site.lat,
      lon: site.lon,
      distance_km: distanceKm ? Math.round(distanceKm * 10) / 10 : null
    };
  });
  
  // Sort by distance if target location provided
  if (targetLat && targetLon) {
    sites.sort((a: any, b: any) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
  } else {
    sites.sort((a: any, b: any) => (b.year || 0) - (a.year || 0));
  }
  
  const closest = sites[0];
  
  return {
    road_id: roadId,
    road_name: roadData.road_name,
    aadt: closest?.aadt || null,
    aadt_year: closest?.year || null,
    heavy_vehicle_percent: closest ? Math.round(closest.heavy_percent * 10) / 10 : null,
    peak_hour_volume: closest?.aadt ? Math.round(closest.aadt * 0.1) : null,
    source: closest?.location ? `Offline: MRWA Traffic (${closest.location})` : 'Offline: MRWA Traffic Data',
    distance_to_site: closest?.distance_km || null,
    total_sites: sites.length,
    nearest_sites: sites.slice(0, 5),
    yearly_summaries: [],
    note: "Data loaded from offline storage.",
    offline: true
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roadId = searchParams.get('road_id');
  const targetLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const targetLon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : null;

  if (!roadId) {
    return NextResponse.json({ error: 'road_id required' }, { status: 400 });
  }

  // Check if offline
  const isOffline = process.env.OFFLINE_MODE === 'true';
  
  // Try online API first
  if (!isOffline) {
    try {
      // Step 1: Get road name from road ID
      const roadQuery = {
        where: `ROAD = '${roadId}'`,
        outFields: "ROAD_NAME",
        returnGeometry: "false",
        f: "json",
        resultRecordCount: "1"
      };
      
      const roadResult = await fetchArcGIS(STATE_ROAD_URL, roadQuery, 5000);
      
      if (!roadResult.features || roadResult.features.length === 0) {
        // Fall back to offline data
        return NextResponse.json(getOfflineTrafficResponse(roadId, targetLat, targetLon));
      }
      
      const roadName = roadResult.features[0].attributes.ROAD_NAME;
      
      // Step 2: Search for traffic data by road name
      const trafficQuery = {
        where: `ROAD_NAME = '${roadName.replace(/'/g, "''")}'`,
        outFields: "SITE_NO,ROAD_NAME,LOCATION_DESC,TRAFFIC_YEAR,COLLECTION_TYPE,MON_SUN,MON_FRI,PCT_HEAVY_MON_SUN",
        returnGeometry: "true",
        f: "json",
        resultRecordCount: "100",
        orderByFields: "TRAFFIC_YEAR DESC"
      };
      
      const trafficResult = await fetchArcGIS(TRAFFIC_URL, trafficQuery, 5000);
      
      if (!trafficResult.features || trafficResult.features.length === 0) {
        // Fall back to offline data
        return NextResponse.json(getOfflineTrafficResponse(roadId, targetLat, targetLon));
      }
      
      // Process all sites
      const sites = trafficResult.features.map((f: any) => {
        const attrs = f.attributes;
        const geom = f.geometry;
        let distanceKm: number | null = null;
        
        if (targetLat && targetLon && geom?.x && geom?.y) {
          distanceKm = calcDistanceKm(targetLat, targetLon, geom.y, geom.x);
        }
        
        return {
          site_no: attrs.SITE_NO,
          location: attrs.LOCATION_DESC,
          year: attrs.TRAFFIC_YEAR,
          aadt: attrs.MON_SUN || attrs.MON_FRI || 0,
          heavy_percent: attrs.PCT_HEAVY_MON_SUN || 0,
          lat: geom?.y || null,
          lon: geom?.x || null,
          distance_km: distanceKm ? Math.round(distanceKm * 10) / 10 : null
        };
      });
      
      // Sort by distance if target location provided
      if (targetLat && targetLon) {
        sites.sort((a: any, b: any) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
      }
      
      const closest = sites[0];
      
      // Get latest data by year for summary
      const byYear = new Map<string, { count: number; avgAadt: number; avgHeavy: number }>();
      for (const site of sites) {
        const year = site.year;
        if (!byYear.has(year)) {
          byYear.set(year, { count: 0, avgAadt: 0, avgHeavy: 0 });
        }
        const data = byYear.get(year)!;
        data.count++;
        data.avgAadt += site.aadt;
        data.avgHeavy += site.heavy_percent;
      }
      
      const yearSummaries = Array.from(byYear.entries()).map(([year, data]) => ({
        year,
        site_count: data.count,
        avg_aadt: Math.round(data.avgAadt / data.count),
        avg_heavy_percent: Math.round(data.avgHeavy / data.count * 10) / 10
      })).sort((a, b) => b.year.localeCompare(a.year));
      
      return NextResponse.json({
        road_id: roadId,
        road_name: roadName,
        aadt: closest.aadt,
        aadt_year: closest.year,
        heavy_vehicle_percent: Math.round(closest.heavy_percent * 10) / 10,
        peak_hour_volume: Math.round(closest.aadt * 0.1),
        source: `MRWA Traffic Digest (${closest.location})`,
        distance_to_site: closest.distance_km,
        total_sites: sites.length,
        nearest_sites: sites.slice(0, 5),
        yearly_summaries: yearSummaries.slice(0, 3),
        note: "Peak hour volume is estimated at 10% of AADT.",
        offline: false
      });
      
    } catch (error) {
      console.error('Traffic API error, falling back to offline:', error);
      // Fall back to offline data
      return NextResponse.json(getOfflineTrafficResponse(roadId, targetLat, targetLon));
    }
  }
  
  // Offline mode
  return NextResponse.json(getOfflineTrafficResponse(roadId, targetLat, targetLon));
}
