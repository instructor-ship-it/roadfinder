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
  storeData: (region: string, roads: any[], speedZones: any[]) => Promise<void>,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ totalRoads: number; totalSpeedZones: number; regions: string[] }> {
  
  let totalRoads = 0;
  let totalSpeedZones = 0;
  const loadedRegions: string[] = [];
  
  // Load speed zones first
  onProgress?.({
    stage: 'loading',
    current: 0,
    total: REGIONS.length + 1,
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
  
  // Load each region
  for (let i = 0; i < REGIONS.length; i++) {
    const regionKey = REGIONS[i];
    const regionName = regionKey.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    onProgress?.({
      stage: 'loading',
      current: i + 1,
      total: REGIONS.length + 1,
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
      const regionSpeedZones = speedZones.filter((sz: any) => 
        roads.some((r: any) => r.road_id === sz.road_id)
      );
      
      await storeData(regionName, roads, regionSpeedZones);
      
      totalRoads += roads.length;
      totalSpeedZones += regionSpeedZones.length;
      loadedRegions.push(regionName);
      
      console.log(`Loaded ${regionName}: ${roads.length} roads`);
      
    } catch (error: any) {
      console.error(`Error loading ${regionName}:`, error.message);
    }
  }
  
  return { totalRoads, totalSpeedZones, regions: loadedRegions };
}

/**
 * Get list of available regions
 */
export function getAvailableRegions(): string[] {
  return REGIONS.map(r => r.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
}
