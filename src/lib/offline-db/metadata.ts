/**
 * Dataset Metadata Operations
 *
 * Contains dataset metadata tracking functions.
 *
 * @module lib/offline-db/metadata
 */

import { initDB } from './db-core';
import type { DatasetMetadata } from './types';

// Re-export DatasetMetadata for backward compatibility
export type { DatasetMetadata } from './types';

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
 * Store dataset metadata after sync
 */
export async function storeDatasetMeta(meta: DatasetMetadata): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('datasetMeta', 'readwrite');
    const store = tx.objectStore('datasetMeta');
    store.put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get metadata for a specific dataset
 */
export async function getDatasetMeta(dataset: string): Promise<DatasetMetadata | null> {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('datasetMeta', 'readonly');
    const store = tx.objectStore('datasetMeta');
    const request = store.get(dataset);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}

/**
 * Get all dataset metadata
 */
export async function getAllDatasetMeta(): Promise<DatasetMetadata[]> {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('datasetMeta', 'readonly');
    const store = tx.objectStore('datasetMeta');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

/**
 * Get detailed stats for all datasets
 */
export async function getDetailedStats(): Promise<{
  roads: { count: number; lastSync: string | null };
  speedZones: { count: number; lastSync: string | null };
  railCrossings: { count: number; lastSync: string | null };
  regulatorySigns: { count: number; lastSync: string | null };
  warningSigns: { count: number; lastSync: string | null };
}> {
  const db = await initDB();

  const countStore = async (storeName: string): Promise<number> => {
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  };

  const [roadsCount, speedZonesCount, railCrossingsCount, regulatorySignsCount, warningSignsCount] =
    await Promise.all([
      countStore('regions'),
      countStore('speedZones'),
      countStore('railCrossings'),
      countStore('regulatorySigns'),
      countStore('warningSigns'),
    ]);

  const allMeta = await getAllDatasetMeta();
  const getSyncDate = (dataset: string) => {
    const meta = allMeta.find((m) => m.dataset === dataset);
    return meta?.lastSync || null;
  };

  return {
    roads: { count: roadsCount, lastSync: getSyncDate('roads') },
    speedZones: { count: speedZonesCount, lastSync: getSyncDate('speedZones') },
    railCrossings: { count: railCrossingsCount, lastSync: getSyncDate('railCrossings') },
    regulatorySigns: { count: regulatorySignsCount, lastSync: getSyncDate('regulatorySigns') },
    warningSigns: { count: warningSignsCount, lastSync: getSyncDate('warningSigns') },
  };
}
