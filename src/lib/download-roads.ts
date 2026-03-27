/**
 * Static data loader for pre-downloaded road data
 * Data is fetched from /public/data/*.json files
 */

const DATA_BASE = '/data';

export interface DownloadProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
  region?: string;
}

const REGIONS = [
  'metropolitan',
  'wheatbelt',
  'south-west',
  'great-southern',
  'kimberley',
  'mid-west-gascoyne',
  'pilbara',
  'unknown',
];

/**
 * Check if static data is available
 */
export async function checkStaticData(): Promise<{ available: boolean; metadata?: any }> {
  try {
    const response = await fetch(`${DATA_BASE}/metadata.json`);
    if (!response.ok) {
      return { available: false };
    }
    const metadata = await response.json();
    return { available: true, metadata };
  } catch {
    return { available: false };
  }
}

/**
 * Load static data into IndexedDB
 */
export async function loadStaticData(
  storeData: (region: string, roads: any[], speedZones: any[], railCrossings?: any[], regulatorySigns?: any[], warningSigns?: any[]) => Promise<void>,
  onProgress?: (progress: DownloadProgress) => void,
  storePavement?: (data: any[]) => Promise<void>,
  storeTraffic?: (data: any[]) => Promise<void>,
  storeAmenities?: (data: { hospitals: any[], fuelStations: any[], toilets: any[] }) => Promise<void>,
): Promise<{ 
  totalRoads: number; 
  totalSpeedZones: number; 
  totalRailCrossings: number; 
  totalRegulatorySigns: number; 
  totalWarningSigns: number;
  totalPavement: number;
  totalTraffic: number;
  totalAmenities: number;
  regions: string[] 
}> {
  
  let totalRoads = 0;
  let totalSpeedZones = 0;
  let totalRailCrossings = 0;
  let totalRegulatorySigns = 0;
  let totalWarningSigns = 0;
  let totalPavement = 0;
  let totalTraffic = 0;
  let totalAmenities = 0;
  const loadedRegions: string[] = [];
  
  const totalSteps = REGIONS.length + 8; // +8 for each data type
  
  // Load speed zones first
  onProgress?.({
    stage: 'loading',
    current: 0,
    total: totalSteps,
    message: 'Loading speed zones...'
  });
  
  let speedZones: any[] = [];
  try {
    const response = await fetch(`${DATA_BASE}/speed-zones.json`);
    if (response.ok) {
      const data = await response.json();
      speedZones = data.speedZones || [];
    }
  } catch (e) {
    console.warn('Could not load speed zones');
  }
  
  // Load rail crossings
  onProgress?.({
    stage: 'loading',
    current: 1,
    total: totalSteps,
    message: 'Loading rail crossings...'
  });
  
  let railCrossings: any[] = [];
  try {
    const response = await fetch(`${DATA_BASE}/rail-crossings.json`);
    if (response.ok) {
      const data = await response.json();
      railCrossings = data.railCrossings || [];
    }
  } catch (e) {
    console.warn('Could not load rail crossings');
  }
  
  // Load regulatory signs
  onProgress?.({
    stage: 'loading',
    current: 2,
    total: totalSteps,
    message: 'Loading regulatory signs...'
  });
  
  let regulatorySigns: any[] = [];
  try {
    const response = await fetch(`${DATA_BASE}/regulatory-signs.json`);
    if (response.ok) {
      const data = await response.json();
      regulatorySigns = data.regulatorySigns || [];
    }
  } catch (e) {
    console.warn('Could not load regulatory signs');
  }
  
  // Load warning signs
  onProgress?.({
    stage: 'loading',
    current: 3,
    total: totalSteps,
    message: 'Loading warning signs...'
  });
  
  let warningSigns: any[] = [];
  try {
    const response = await fetch(`${DATA_BASE}/warning-signs.json`);
    if (response.ok) {
      const data = await response.json();
      warningSigns = data.warningSigns || [];
    }
  } catch (e) {
    console.warn('Could not load warning signs');
  }
  
  // Load pavement data (Layer 12)
  onProgress?.({
    stage: 'loading',
    current: 4,
    total: totalSteps,
    message: 'Loading pavement data (lanes, widths)...'
  });
  
  let pavementData: any[] = [];
  try {
    const response = await fetch(`${DATA_BASE}/pavement-data.json`);
    if (response.ok) {
      const data = await response.json();
      pavementData = data.pavement || [];
      totalPavement = pavementData.length;
      // Store pavement data in IndexedDB
      if (storePavement && pavementData.length > 0) {
        await storePavement(pavementData);
      }
    }
  } catch (e) {
    console.warn('Could not load pavement data');
  }
  
  // Load traffic data (Layer 27)
  onProgress?.({
    stage: 'loading',
    current: 5,
    total: totalSteps,
    message: 'Loading traffic volume data...'
  });
  
  let trafficData: any[] = [];
  try {
    const response = await fetch(`${DATA_BASE}/traffic-data.json`);
    if (response.ok) {
      const data = await response.json();
      trafficData = data.traffic || [];
      totalTraffic = trafficData.length;
      // Store traffic data in IndexedDB
      if (storeTraffic && trafficData.length > 0) {
        await storeTraffic(trafficData);
      }
    }
  } catch (e) {
    console.warn('Could not load traffic data');
  }
  
  // Load amenities data (OpenStreetMap)
  onProgress?.({
    stage: 'loading',
    current: 6,
    total: totalSteps,
    message: 'Loading amenities (hospitals, fuel, toilets)...'
  });
  
  try {
    const response = await fetch(`${DATA_BASE}/amenities.json`);
    if (response.ok) {
      const data = await response.json();
      totalAmenities = (data.hospitals?.length || 0) + (data.fuelStations?.length || 0) + (data.toilets?.length || 0);
      
      // Store amenities data in IndexedDB
      if (storeAmenities && totalAmenities > 0) {
        await storeAmenities({
          hospitals: data.hospitals || [],
          fuelStations: data.fuelStations || [],
          toilets: data.toilets || []
        });
      }
    }
  } catch (e) {
    console.warn('Could not load amenities data');
  }
  
  // Load each region
  for (let i = 0; i < REGIONS.length; i++) {
    const regionKey = REGIONS[i];
    const regionName = regionKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    onProgress?.({
      stage: 'loading',
      current: i + 7,
      total: totalSteps,
      message: `Loading ${regionName}...`,
      region: regionName
    });
    
    try {
      const response = await fetch(`${DATA_BASE}/roads-${regionKey}.json`);
      if (!response.ok) {
        console.warn(`No data for ${regionName}`);
        continue;
      }
      
      const data = await response.json();
      const roads = data.roads || [];
      
      // Filter signage data for this region's roads
      const regionSpeedZones = speedZones.filter((sz: any) => 
        roads.some((r: any) => r.road_id === sz.road_id)
      );
      const regionRailCrossings = railCrossings.filter((rc: any) => 
        roads.some((r: any) => r.road_id === rc.road_id)
      );
      const regionRegulatorySigns = regulatorySigns.filter((rs: any) => 
        roads.some((r: any) => r.road_id === rs.road_id)
      );
      const regionWarningSigns = warningSigns.filter((ws: any) => 
        roads.some((r: any) => r.road_id === ws.road_id)
      );
      
      await storeData(regionName, roads, regionSpeedZones, regionRailCrossings, regionRegulatorySigns, regionWarningSigns);
      
      totalRoads += roads.length;
      totalSpeedZones += regionSpeedZones.length;
      totalRailCrossings += regionRailCrossings.length;
      totalRegulatorySigns += regionRegulatorySigns.length;
      totalWarningSigns += regionWarningSigns.length;
      loadedRegions.push(regionName);
      
      console.log(`Loaded ${regionName}: ${roads.length} roads, ${regionSpeedZones.length} speed zones, ${regionRailCrossings.length} rail crossings, ${regionRegulatorySigns.length} regulatory signs, ${regionWarningSigns.length} warning signs`);
      
    } catch (error: any) {
      console.error(`Error loading ${regionName}:`, error.message);
    }
  }
  
  return { 
    totalRoads, 
    totalSpeedZones, 
    totalRailCrossings,
    totalRegulatorySigns,
    totalWarningSigns,
    totalPavement,
    totalTraffic,
    totalAmenities,
    regions: loadedRegions 
  };
}

/**
 * Get list of available regions
 */
export function getAvailableRegions(): string[] {
  return REGIONS.map(r => r.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
}
