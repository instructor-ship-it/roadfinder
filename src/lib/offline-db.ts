/**
 * Client-side Offline Database
 * Uses IndexedDB to store road data for fast offline access
 */

const DB_NAME = 'RoadFinderDB';
const DB_VERSION = 1;

interface RoadData {
  road_id: string;
  road_name: string;
  min_slk: number;
  max_slk: number;
  network_type: string;
  segments: Array<{
    start_slk: number;
    end_slk: number;
    geometry: [number, number][] | null;
  }>;
}

interface SpeedZoneData {
  road_id: string;
  road_name: string;
  start_slk: number;
  end_slk: number;
  speed_limit: number | string; // Can be number or "110km/h" string from MRWA
  carriageway: string;
}

// Parsed speed zone with numeric speed_limit
export interface ParsedSpeedZone {
  road_id: string;
  road_name: string;
  start_slk: number;
  end_slk: number;
  speed_limit: number;
  carriageway: string;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('regions')) {
        db.createObjectStore('regions', { keyPath: 'region' });
      }

      if (!db.objectStoreNames.contains('speedZones')) {
        db.createObjectStore('speedZones', { keyPath: 'road_id' });
      }

      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });
}

/**
 * Check if offline data is available
 */
export async function isOfflineDataAvailable(): Promise<boolean> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      const request = store.get('download_date');

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Parse speed limit from various formats (number or "110km/h" string)
 */
function parseSpeedLimit(speedLimit: number | string): number {
  if (typeof speedLimit === 'number') {
    return speedLimit;
  }
  if (typeof speedLimit === 'string') {
    const match = speedLimit.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 100; // Default
}

/**
 * Get speed zones for a road
 */
export async function getSpeedZones(roadId: string): Promise<ParsedSpeedZone[]> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('speedZones', 'readonly');
      const store = tx.objectStore('speedZones');
      const request = store.get(roadId);

      request.onsuccess = () => {
        const zones = request.result?.zones || [];
        // Parse speed limits to numbers
        const parsedZones: ParsedSpeedZone[] = zones.map((zone: SpeedZoneData) => ({
          road_id: zone.road_id,
          road_name: zone.road_name,
          start_slk: zone.start_slk,
          end_slk: zone.end_slk,
          speed_limit: parseSpeedLimit(zone.speed_limit),
          carriageway: zone.carriageway
        }));
        resolve(parsedZones);
      };

      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Find road near GPS coordinates
 * Uses projection math for accurate SLK calculation
 */
export async function findRoadNearGps(
  lat: number,
  lon: number,
  maxDistanceKm: number = 0.5
): Promise<{
  road_id: string;
  road_name: string;
  slk: number;
  distance_m: number;
  network_type: string;
} | null> {
  try {
    const db = await initDB();

    return new Promise((resolve) => {
      const tx = db.transaction('regions', 'readonly');
      const store = tx.objectStore('regions');
      const request = store.getAll();

      request.onsuccess = () => {
        let closest: any = null;
        const maxDistDeg = maxDistanceKm / 111;

        for (const region of request.result) {
          for (const road of region.roads) {
            for (const segment of road.segments) {
              if (!segment.geometry || segment.geometry.length < 2) continue;

              const geometry = segment.geometry;
              const segmentSlkLength = segment.end_slk - segment.start_slk;
              if (segmentSlkLength <= 0) continue;

              // Calculate cumulative distances along the path
              let totalPathDist = 0;
              const pathDists: number[] = [0];

              for (let i = 1; i < geometry.length; i++) {
                const [lat1, lon1] = geometry[i - 1];
                const [lat2, lon2] = geometry[i];
                const dist = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
                totalPathDist += dist;
                pathDists.push(totalPathDist);
              }

              if (totalPathDist === 0) continue;

              // Find closest point on each line segment
              for (let i = 1; i < geometry.length; i++) {
                const [lat1, lon1] = geometry[i - 1];
                const [lat2, lon2] = geometry[i];

                const dx = lat2 - lat1;
                const dy = lon2 - lon1;
                const segmentDist = Math.sqrt(dx * dx + dy * dy);

                if (segmentDist === 0) continue;

                // Project GPS point onto line segment
                const t = Math.max(0, Math.min(1,
                  ((lat - lat1) * dx + (lon - lon1) * dy) / (segmentDist * segmentDist)
                ));

                const closestLat = lat1 + t * dx;
                const closestLon = lon1 + t * dy;

                const distDeg = Math.sqrt(
                  Math.pow(lat - closestLat, 2) + Math.pow(lon - closestLon, 2)
                );

                if (distDeg < maxDistDeg) {
                  const distM = distDeg * 111 * 1000;

                  if (!closest || distM < closest.distance_m) {
                    const distAlongSegment = t * segmentDist;
                    const distAlongPath = pathDists[i - 1] + distAlongSegment;
                    const ratio = distAlongPath / totalPathDist;
                    const slk = segment.start_slk + segmentSlkLength * ratio;

                    closest = {
                      road_id: road.road_id,
                      road_name: road.road_name,
                      slk: Math.round(slk * 100) / 100,
                      distance_m: Math.round(distM),
                      network_type: road.network_type
                    };
                  }
                }
              }
            }
          }
        }

        resolve(closest);
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Store region data
 */
export async function storeRegionData(region: string, roads: RoadData[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('regions', 'readwrite');
    const store = tx.objectStore('regions');
    store.put({ region, roads });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Store speed zones (merges with existing zones for multi-region roads)
 */
export async function storeSpeedZones(zones: SpeedZoneData[]): Promise<void> {
  const db = await initDB();
  
  // Group new zones by road_id
  const byRoad = new Map<string, SpeedZoneData[]>();
  for (const zone of zones) {
    if (!byRoad.has(zone.road_id)) {
      byRoad.set(zone.road_id, []);
    }
    byRoad.get(zone.road_id)!.push(zone);
  }

  // Now merge with existing zones in IndexedDB
  return new Promise((resolve, reject) => {
    const tx = db.transaction('speedZones', 'readwrite');
    const store = tx.objectStore('speedZones');

    for (const [road_id, newZones] of byRoad) {
      // Get existing zones for this road
      const getRequest = store.get(road_id);
      
      getRequest.onsuccess = () => {
        const existing = getRequest.result?.zones || [];
        
        // Merge: create a map to dedupe by SLK range
        const mergedMap = new Map<string, SpeedZoneData>();
        
        // Add existing zones
        for (const z of existing) {
          const key = `${z.start_slk}-${z.end_slk}-${z.carriageway}`;
          mergedMap.set(key, z);
        }
        
        // Add/overwrite with new zones
        for (const z of newZones) {
          const key = `${z.start_slk}-${z.end_slk}-${z.carriageway}`;
          mergedMap.set(key, z);
        }
        
        // Store merged result
        const mergedZones = Array.from(mergedMap.values());
        store.put({ road_id, zones: mergedZones });
      };
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Store metadata
 */
export async function storeMetadata(data: {
  download_date: string;
  total_roads: number;
  regions: string[];
}): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');

    store.put({ key: 'download_date', value: data.download_date });
    store.put({ key: 'total_roads', value: data.total_roads });
    store.put({ key: 'regions', value: data.regions });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clear all offline data
 */
export async function clearOfflineData(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['regions', 'speedZones', 'metadata'], 'readwrite');

    tx.objectStore('regions').clear();
    tx.objectStore('speedZones').clear();
    tx.objectStore('metadata').clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
