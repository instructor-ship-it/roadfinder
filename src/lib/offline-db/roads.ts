/**
 * Road Data Operations
 *
 * Contains road data storage and GPS lookup functions.
 *
 * @module lib/offline-db/roads
 */

import { initDB } from './db-core';
import { haversineDistance } from '@/lib/utils';
import type { RoadData } from './types';

// Re-export RoadData for backward compatibility
export type { RoadData } from './types';

/**
 * Get road type priority (lower = higher priority)
 * State Roads (M-roads, H-roads) should be prioritized over Local Roads
 * when distances are very close (within 50m)
 */
function getRoadTypePriority(networkType: string, roadId: string): number {
  // State Roads (Main Highways, Highways) - highest priority
  if (networkType === 'State Road') return 1;
  if (roadId.startsWith('M') || roadId.startsWith('H')) return 1;

  // Regional Roads - second priority
  if (networkType === 'Regional Road') return 2;
  if (roadId.startsWith('R')) return 2;

  // Local Roads - third priority
  if (networkType === 'Local Road') return 3;

  // Miscellaneous and unknown - lowest priority
  return 4;
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
 * Store roads data (for MRWA sync - grouped by region)
 */
export async function storeRoadsData(
  roads: any[],
  source: 'static' | 'mrwa' = 'mrwa'
): Promise<number> {
  if (!roads.length) return 0;

  const db = await initDB();

  // Group roads by region
  const byRegion = new Map<string, any[]>();
  for (const road of roads) {
    const region = road.region || 'Unknown';
    if (!byRegion.has(region)) {
      byRegion.set(region, []);
    }
    byRegion.get(region)!.push(road);
  }

  // Store each region
  return new Promise((resolve, reject) => {
    const tx = db.transaction('regions', 'readwrite');
    const store = tx.objectStore('regions');

    for (const [region, regionRoads] of byRegion) {
      // Get existing roads for this region
      const getRequest = store.get(region);
      getRequest.onsuccess = () => {
        const existing = getRequest.result?.roads || [];
        // Merge roads
        const mergedMap = new Map<string, any>();
        for (const r of existing) {
          mergedMap.set(r.road_id, r);
        }
        for (const r of regionRoads) {
          mergedMap.set(r.road_id, r);
        }
        store.put({ region, roads: Array.from(mergedMap.values()) });
      };
    }

    tx.oncomplete = async () => {
      // Store metadata
      // Import storeDatasetMeta from metadata module
      const { storeDatasetMeta } = await import('./metadata');
      await storeDatasetMeta({
        dataset: 'roads',
        lastSync: new Date().toISOString(),
        recordCount: roads.length,
        source,
      });
      resolve(roads.length);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get list of regions stored in IndexedDB
 */
export async function getStoredRegions(): Promise<string[]> {
  try {
    const db = await initDB();

    return new Promise((resolve) => {
      const tx = db.transaction('regions', 'readonly');
      const store = tx.objectStore('regions');
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Get roads for a specific region from IndexedDB
 * Transforms RoadData to Road format for UI compatibility
 * Filters to only return State Roads (H-prefix and M-prefix)
 */
export async function getRoadsForRegion(region: string): Promise<
  {
    road_id: string;
    road_name: string;
    min_slk: number;
    max_slk: number;
    region: string;
  }[]
> {
  try {
    const db = await initDB();

    return new Promise((resolve) => {
      const tx = db.transaction('regions', 'readonly');
      const store = tx.objectStore('regions');
      const request = store.get(region);

      request.onsuccess = () => {
        const roads = request.result?.roads || [];
        // Filter to only State Roads (H-prefix and M-prefix)
        // Transform RoadData to Road format
        const transformed = roads
          .filter((road: RoadData) => road.road_id.startsWith('H') || road.road_id.startsWith('M'))
          .map((road: RoadData) => ({
            road_id: road.road_id,
            road_name: road.road_name,
            min_slk: road.min_slk,
            max_slk: road.max_slk,
            region: region,
          }));
        resolve(transformed);
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
 * Prioritizes State Roads over Local Roads only when distances are very close (within 50m)
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
        // Collect all candidates within range
        const candidates: any[] = [];

        for (const region of request.result) {
          for (const road of region.roads) {
            for (const segment of road.segments) {
              if (!segment.geometry || segment.geometry.length < 2) continue;

              const geometry = segment.geometry;
              const segmentSlkLength = segment.end_slk - segment.start_slk;
              if (segmentSlkLength <= 0) continue;

              // Calculate cumulative distances along the path using Haversine
              let totalPathDist = 0;
              const pathDists: number[] = [0];

              for (let i = 1; i < geometry.length; i++) {
                const [lat1, lon1] = geometry[i - 1];
                const [lat2, lon2] = geometry[i];
                // Haversine gives accurate distance in meters
                const dist = haversineDistance(lat1, lon1, lat2, lon2);
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
                const segmentDistDeg = Math.sqrt(dx * dx + dy * dy);

                if (segmentDistDeg === 0) continue;

                // Project GPS point onto line segment (in degree space for proportional calculation)
                const t = Math.max(
                  0,
                  Math.min(
                    1,
                    ((lat - lat1) * dx + (lon - lon1) * dy) / (segmentDistDeg * segmentDistDeg)
                  )
                );

                const closestLat = lat1 + t * dx;
                const closestLon = lon1 + t * dy;

                // Use Haversine for accurate distance in meters
                const distM = haversineDistance(lat, lon, closestLat, closestLon);
                const maxDistM = maxDistanceKm * 1000;

                if (distM < maxDistM) {
                  // Calculate segment distance in meters using Haversine
                  const segmentDistM = haversineDistance(lat1, lon1, lat2, lon2);
                  // Proportional distance along segment
                  const distAlongSegment = t * segmentDistM;
                  const distAlongPath = pathDists[i - 1] + distAlongSegment;
                  const ratio = distAlongPath / totalPathDist;
                  const slk = segment.start_slk + segmentSlkLength * ratio;

                  candidates.push({
                    road_id: road.road_id,
                    road_name: road.road_name,
                    slk: Math.round(slk * 1000) / 1000, // 3 decimal places for high precision
                    distance_m: Math.round(distM),
                    network_type: road.network_type,
                    priority: getRoadTypePriority(road.network_type, road.road_id),
                  });
                }
              }
            }
          }
        }

        if (candidates.length === 0) {
          resolve(null);
          return;
        }

        // Sort by distance first (closest is usually correct)
        // Then use priority as tiebreaker only when distances are very close (within 50m)
        const PRIORITY_DISTANCE_THRESHOLD = 50; // meters

        candidates.sort((a, b) => {
          const distDiff = Math.abs(a.distance_m - b.distance_m);

          // If distances are very close, use priority to break the tie
          if (distDiff <= PRIORITY_DISTANCE_THRESHOLD && a.priority !== b.priority) {
            return a.priority - b.priority;
          }

          // Otherwise, just use distance (closer is better)
          return a.distance_m - b.distance_m;
        });

        // Return the best match
        resolve({
          road_id: candidates[0].road_id,
          road_name: candidates[0].road_name,
          slk: candidates[0].slk,
          distance_m: candidates[0].distance_m,
          network_type: candidates[0].network_type,
        });
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Get road name by road_id from offline database
 */
export async function getRoadInfoById(roadId: string): Promise<{
  road_id: string;
  road_name: string;
  network_type: string;
} | null> {
  try {
    const db = await initDB();

    return new Promise((resolve) => {
      const tx = db.transaction('regions', 'readonly');
      const store = tx.objectStore('regions');
      const request = store.getAll();

      request.onsuccess = () => {
        const normalizedId = roadId.toUpperCase().trim();

        for (const region of request.result) {
          for (const road of region.roads) {
            if (road.road_id.toUpperCase().trim() === normalizedId) {
              resolve({
                road_id: road.road_id,
                road_name: road.road_name || '',
                network_type: road.network_type || '',
              });
              return;
            }
          }
        }
        resolve(null);
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clear a specific dataset
 */
export async function clearDataset(dataset: string): Promise<void> {
  const db = await initDB();

  const storeMap: Record<string, string> = {
    roads: 'regions',
    speedZones: 'speedZones',
    railCrossings: 'railCrossings',
    regulatorySigns: 'regulatorySigns',
    warningSigns: 'warningSigns',
  };

  const storeName = storeMap[dataset];
  if (!storeName) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName, 'datasetMeta'], 'readwrite');
    tx.objectStore(storeName).clear();
    tx.objectStore('datasetMeta').delete(dataset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
