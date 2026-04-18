/**
 * Traffic Volume Data Operations
 *
 * Contains traffic volume data (Layer 27) - AADT, peak hour, heavy vehicles.
 *
 * @module lib/offline-db/traffic
 */

import { initDB } from './db-core';
import type { TrafficSite, TrafficData } from './types';

// Re-export types for backward compatibility
export type { TrafficSite, TrafficData } from './types';

/**
 * Store traffic data in IndexedDB
 * Data is keyed by road_name (lowercase) since Layer 27 doesn't have road_id
 */
export async function storeTrafficData(data: any[]): Promise<void> {
  const db = await initDB();

  const tx = db.transaction('trafficData', 'readwrite');
  const store = tx.objectStore('trafficData');

  for (const item of data) {
    // Key by road_name (lowercase for case-insensitive lookup)
    if (item.road_name) {
      store.put({
        road_name: item.road_name.toLowerCase(),
        sites: item.sites || [],
      });
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get traffic data for a specific road by name
 */
export async function getTrafficData(roadName: string): Promise<TrafficSite[]> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('trafficData', 'readonly');
      const store = tx.objectStore('trafficData');
      const request = store.get(roadName.toLowerCase());

      request.onsuccess = () => {
        const sites: TrafficSite[] = request.result?.sites || [];
        resolve(sites);
      };

      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Get nearest traffic data site for a road by name
 * Returns the first site (most recent data) for the road
 */
export async function getNearestTrafficData(roadName: string): Promise<TrafficSite | null> {
  const sites = await getTrafficData(roadName);
  if (sites.length === 0) return null;

  // Return the first site (sorted by site_no in download script)
  return sites[0];
}

/**
 * Check if traffic data is available
 */
export async function hasTrafficData(): Promise<boolean> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('trafficData', 'readonly');
      const store = tx.objectStore('trafficData');
      const countRequest = store.count();

      countRequest.onsuccess = () => resolve(countRequest.result > 0);
      countRequest.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
