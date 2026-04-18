/**
 * Amenities Data Operations
 *
 * Contains amenities data (OpenStreetMap) - hospitals, fuel, toilets.
 *
 * @module lib/offline-db/amenities
 */

import { initDB } from './db-core';
import { haversineDistance } from '@/lib/utils';
import type { AmenityPlace, AmenitiesCache } from './types';

// Re-export types for backward compatibility
export type { AmenityPlace, AmenitiesCache } from './types';

/**
 * Store amenities data in IndexedDB
 */
export async function storeAmenitiesData(
  region: string,
  data: {
    hospitals: AmenityPlace[];
    fuelStations: AmenityPlace[];
    toilets: AmenityPlace[];
  }
): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('amenitiesData', 'readwrite');
  const store = tx.objectStore('amenitiesData');

  store.put({
    region,
    hospitals: data.hospitals,
    fuelStations: data.fuelStations,
    toilets: data.toilets,
    last_updated: new Date().toISOString(),
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Store all amenities data in IndexedDB (single record for all regions)
 */
export async function storeAllAmenitiesData(data: {
  hospitals: AmenityPlace[];
  fuelStations: AmenityPlace[];
  toilets: AmenityPlace[];
}): Promise<void> {
  console.log('[Amenities] Storing amenities data:', {
    hospitals: data.hospitals?.length || 0,
    fuelStations: data.fuelStations?.length || 0,
    toilets: data.toilets?.length || 0,
  });

  const db = await initDB();
  const tx = db.transaction('amenitiesData', 'readwrite');
  const store = tx.objectStore('amenitiesData');

  const record = {
    region: 'all',
    hospitals: data.hospitals || [],
    fuelStations: data.fuelStations || [],
    toilets: data.toilets || [],
    last_updated: new Date().toISOString(),
  };

  store.put(record);
  console.log('[Amenities] Put record with key "all"');

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log('[Amenities] Transaction complete - data stored successfully');
      resolve();
    };
    tx.onerror = () => {
      console.error('[Amenities] Transaction error:', tx.error);
      reject(tx.error);
    };
  });
}

/**
 * Get amenities data for a region
 */
export async function getAmenitiesData(region: string): Promise<AmenitiesCache | null> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('amenitiesData', 'readonly');
      const store = tx.objectStore('amenitiesData');
      const request = store.get(region);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Get all amenities data (stored under 'all' key)
 */
export async function getAllAmenitiesData(): Promise<AmenitiesCache | null> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('amenitiesData', 'readonly');
      const store = tx.objectStore('amenitiesData');
      const request = store.get('all');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Find nearest amenities to a location
 */
export async function findNearestAmenities(
  lat: number,
  lon: number,
  region?: string,
  radiusKm: number = 30
): Promise<{
  hospital: AmenityPlace | null;
  fuelStation: AmenityPlace | null;
  toilet: AmenityPlace | null;
}> {
  console.log('[Amenities] findNearestAmenities called:', { lat, lon, radiusKm });

  const result = {
    hospital: null as AmenityPlace | null,
    fuelStation: null as AmenityPlace | null,
    toilet: null as AmenityPlace | null,
  };

  try {
    const db = await initDB();

    // Get all amenities data
    const allData = await new Promise<AmenitiesCache[]>((resolve) => {
      const tx = db.transaction('amenitiesData', 'readonly');
      const store = tx.objectStore('amenitiesData');
      const request = store.getAll();
      request.onsuccess = () => {
        console.log('[Amenities] getAll result:', request.result?.length || 0, 'records');
        resolve(request.result || []);
      };
      request.onerror = () => {
        console.error('[Amenities] getAll error');
        resolve([]);
      };
    });

    if (allData.length === 0) {
      console.log('[Amenities] No data found in IndexedDB');
      return result;
    }
    console.log('[Amenities] Found', allData.length, 'data records');

    // Combine all amenities
    const allHospitals: AmenityPlace[] = [];
    const allFuelStations: AmenityPlace[] = [];
    const allToilets: AmenityPlace[] = [];

    for (const data of allData) {
      allHospitals.push(...data.hospitals);
      allFuelStations.push(...data.fuelStations);
      allToilets.push(...data.toilets);
    }

    console.log('[Amenities] Combined data:', {
      hospitals: allHospitals.length,
      fuelStations: allFuelStations.length,
      toilets: allToilets.length,
    });

    // Calculate distances and find nearest
    // Note: haversineDistance returns meters, we convert to km for display
    const withDistance = (places: AmenityPlace[]): AmenityPlace[] => {
      return places
        .map((p) => ({
          ...p,
          distance: haversineDistance(lat, lon, p.lat, p.lon) / 1000, // Convert meters to km
        }))
        .filter((p) => p.distance! <= radiusKm)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    };

    const nearestHospitals = withDistance(allHospitals);
    const nearestFuel = withDistance(allFuelStations);
    const nearestToilets = withDistance(allToilets);

    console.log('[Amenities] Nearest within', radiusKm, 'km:', {
      hospitals: nearestHospitals.length,
      fuelStations: nearestFuel.length,
      toilets: nearestToilets.length,
      firstHospital: nearestHospitals[0]?.name || 'none',
      firstHospitalDist: nearestHospitals[0]?.distance
        ? Math.round(nearestHospitals[0].distance) + 'km'
        : 'N/A',
    });

    result.hospital = nearestHospitals[0] || null;
    result.fuelStation = nearestFuel[0] || null;
    result.toilet = nearestToilets[0] || null;
  } catch (e) {
    console.error('Error finding nearest amenities:', e);
  }

  return result;
}

/**
 * Check if amenities data is available
 */
export async function hasAmenitiesData(): Promise<boolean> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('amenitiesData', 'readonly');
      const store = tx.objectStore('amenitiesData');
      const countRequest = store.count();

      countRequest.onsuccess = () => resolve(countRequest.result > 0);
      countRequest.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
