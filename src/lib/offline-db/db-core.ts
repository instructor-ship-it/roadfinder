/**
 * Core Database Operations
 *
 * Contains the core IndexedDB initialization and management functions.
 *
 * @module lib/offline-db/db-core
 */

export const DB_NAME = 'RoadFinderDB';
export const DB_VERSION = 7; // Incremented to add savedLocations store

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

      // New object stores for signage data
      if (!db.objectStoreNames.contains('railCrossings')) {
        db.createObjectStore('railCrossings', { keyPath: 'road_id' });
      }

      if (!db.objectStoreNames.contains('regulatorySigns')) {
        db.createObjectStore('regulatorySigns', { keyPath: 'road_id' });
      }

      if (!db.objectStoreNames.contains('warningSigns')) {
        db.createObjectStore('warningSigns', { keyPath: 'road_id' });
      }

      // Dataset sync metadata
      if (!db.objectStoreNames.contains('datasetMeta')) {
        db.createObjectStore('datasetMeta', { keyPath: 'dataset' });
      }

      // Pavement data (Layer 12) - lanes, widths, shoulders
      if (!db.objectStoreNames.contains('pavementData')) {
        db.createObjectStore('pavementData', { keyPath: 'road_id' });
      }

      // Traffic volume data (Layer 27) - AADT, peak hour, heavy vehicles
      // Key changed from road_id to road_name in DB_VERSION 5
      if (db.objectStoreNames.contains('trafficData')) {
        db.deleteObjectStore('trafficData');
      }
      db.createObjectStore('trafficData', { keyPath: 'road_name' });

      // Amenities data (OpenStreetMap) - hospitals, fuel, toilets
      // Delete and recreate to ensure correct structure in DB_VERSION 6
      if (db.objectStoreNames.contains('amenitiesData')) {
        db.deleteObjectStore('amenitiesData');
      }
      db.createObjectStore('amenitiesData', { keyPath: 'region' });

      // Saved locations (user's saved work locations) - unlimited storage
      if (!db.objectStoreNames.contains('savedLocations')) {
        const savedLocationsStore = db.createObjectStore('savedLocations', { keyPath: 'id' });
        savedLocationsStore.createIndex('road_id', 'road_id', { unique: false });
        savedLocationsStore.createIndex('created_at', 'created_at', { unique: false });
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
 * Get offline data metadata (download date, total roads)
 */
export async function getOfflineMetadata(): Promise<{
  download_date: string;
  total_roads: number;
  regions: string[];
} | null> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');

      const dateRequest = store.get('download_date');
      const roadsRequest = store.get('total_roads');
      const regionsRequest = store.get('regions');

      let download_date = '';
      let total_roads = 0;
      let regions: string[] = [];

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 3) {
          if (download_date) {
            resolve({ download_date, total_roads, regions });
          } else {
            resolve(null);
          }
        }
      };

      dateRequest.onsuccess = () => {
        download_date = dateRequest.result?.value || '';
        checkComplete();
      };
      roadsRequest.onsuccess = () => {
        total_roads = roadsRequest.result?.value || 0;
        checkComplete();
      };
      regionsRequest.onsuccess = () => {
        regions = regionsRequest.result?.value || [];
        checkComplete();
      };

      dateRequest.onerror = () => checkComplete();
      roadsRequest.onerror = () => checkComplete();
      regionsRequest.onerror = () => checkComplete();
    });
  } catch {
    return null;
  }
}

/**
 * Clear all offline data
 */
export async function clearOfflineData(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [
        'regions',
        'speedZones',
        'metadata',
        'railCrossings',
        'regulatorySigns',
        'warningSigns',
        'datasetMeta',
        'pavementData',
        'trafficData',
        'amenitiesData',
      ],
      'readwrite'
    );

    tx.objectStore('regions').clear();
    tx.objectStore('speedZones').clear();
    tx.objectStore('metadata').clear();
    tx.objectStore('railCrossings').clear();
    tx.objectStore('regulatorySigns').clear();
    tx.objectStore('warningSigns').clear();
    tx.objectStore('datasetMeta').clear();
    tx.objectStore('pavementData').clear();
    tx.objectStore('trafficData').clear();
    tx.objectStore('amenitiesData').clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all offline data stats
 */
export async function getOfflineDataStats(): Promise<{
  hasRoads: boolean;
  hasSpeedZones: boolean;
  hasPavement: boolean;
  hasTraffic: boolean;
  hasAmenities: boolean;
  hasWeatherCache: boolean;
  totalRoads: number;
  regions: string[];
}> {
  const stats = {
    hasRoads: false,
    hasSpeedZones: false,
    hasPavement: false,
    hasTraffic: false,
    hasAmenities: false,
    hasWeatherCache: false,
    totalRoads: 0,
    regions: [] as string[],
  };

  try {
    const db = await initDB();

    // Check each store
    stats.hasRoads = await new Promise((resolve) => {
      const tx = db.transaction('regions', 'readonly');
      const store = tx.objectStore('regions');
      const countRequest = store.count();
      countRequest.onsuccess = () => resolve(countRequest.result > 0);
      countRequest.onerror = () => resolve(false);
    });

    stats.hasSpeedZones = await new Promise((resolve) => {
      const tx = db.transaction('speedZones', 'readonly');
      const store = tx.objectStore('speedZones');
      const countRequest = store.count();
      countRequest.onsuccess = () => resolve(countRequest.result > 0);
      countRequest.onerror = () => resolve(false);
    });

    // Import these functions to avoid circular dependencies
    const { hasPavementData } = await import('./pavement');
    const { hasTrafficData } = await import('./traffic');
    const { hasAmenitiesData } = await import('./amenities');
    const { WEATHER_CACHE_KEY } = await import('./weather-cache');

    stats.hasPavement = await hasPavementData();
    stats.hasTraffic = await hasTrafficData();
    stats.hasAmenities = await hasAmenitiesData();

    // Get metadata
    const meta = await getOfflineMetadata();
    if (meta) {
      stats.totalRoads = meta.total_roads;
      stats.regions = meta.regions;
    }

    // Check weather cache
    if (typeof window !== 'undefined') {
      stats.hasWeatherCache = localStorage.getItem(WEATHER_CACHE_KEY) !== null;
    }
  } catch (e) {
    console.error('Error getting offline data stats:', e);
  }

  return stats;
}
