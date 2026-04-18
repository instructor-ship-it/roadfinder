/**
 * Pavement Data Operations
 *
 * Contains pavement data (Layer 12) - lanes, widths, shoulders.
 *
 * @module lib/offline-db/pavement
 */

import { initDB } from './db-core';
import type { PavementData } from './types';

// Re-export PavementData for backward compatibility
export type { PavementData } from './types';

/**
 * Store pavement data in IndexedDB
 * Handles both pre-grouped format {road_id, segments: []} and flat format
 */
export async function storePavementData(data: any[]): Promise<void> {
  const db = await initDB();

  const tx = db.transaction('pavementData', 'readwrite');
  const store = tx.objectStore('pavementData');

  for (const item of data) {
    // Check if data is already grouped (has segments array)
    if (item.segments && Array.isArray(item.segments)) {
      // Already grouped format: {road_id, segments: [...]}
      store.put({ road_id: item.road_id, segments: item.segments });
    } else {
      // Flat format: group by road_id
      // This shouldn't happen with current data but handles both cases
      console.warn('Unexpected pavement data format, skipping:', item.road_id);
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get pavement data for a specific road and SLK
 */
export async function getPavementData(roadId: string, slk: number): Promise<PavementData | null> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('pavementData', 'readonly');
      const store = tx.objectStore('pavementData');
      const request = store.get(roadId);

      request.onsuccess = () => {
        const segments: PavementData[] = request.result?.segments || [];
        // Find segment containing this SLK
        const segment = segments.find((s) => s.start_slk <= slk && s.end_slk >= slk);
        resolve(segment || null);
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Check if pavement data is available
 */
export async function hasPavementData(): Promise<boolean> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('pavementData', 'readonly');
      const store = tx.objectStore('pavementData');
      const countRequest = store.count();

      countRequest.onsuccess = () => resolve(countRequest.result > 0);
      countRequest.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
