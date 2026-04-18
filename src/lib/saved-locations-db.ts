/**
 * Saved Locations Database
 *
 * Uses IndexedDB for unlimited storage of saved work locations.
 * Migrates existing localStorage data on first use.
 */

import { SavedLocation } from '@/types/shared';
import { initDB } from './offline-db';

const STORAGE_KEY = 'savedLocations';
const MIGRATION_KEY = 'savedLocationsMigrated';

/**
 * Get all saved locations from IndexedDB
 */
export async function getSavedLocations(): Promise<SavedLocation[]> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('savedLocations', 'readonly');
      const store = tx.objectStore('savedLocations');
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by created_at descending (most recent first)
        const locations = request.result || [];
        locations.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        resolve(locations);
      };

      request.onerror = () => {
        console.error('Failed to get saved locations:', request.error);
        resolve([]);
      };
    });
  } catch (error) {
    console.error('Failed to get saved locations:', error);
    return [];
  }
}

/**
 * Save a new location to IndexedDB
 */
export async function saveLocation(location: SavedLocation): Promise<boolean> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('savedLocations', 'readwrite');
      const store = tx.objectStore('savedLocations');
      const request = store.put(location);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Failed to save location:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Failed to save location:', error);
    return false;
  }
}

/**
 * Delete a saved location from IndexedDB
 */
export async function deleteSavedLocation(id: string): Promise<boolean> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('savedLocations', 'readwrite');
      const store = tx.objectStore('savedLocations');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Failed to delete location:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Failed to delete location:', error);
    return false;
  }
}

/**
 * Get saved locations sorted by date (most recent first)
 */
export async function getSavedLocationsByDate(): Promise<SavedLocation[]> {
  const locations = await getSavedLocations();
  return locations.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Get saved locations sorted by road_id then SLK
 */
export async function getSavedLocationsByRoad(): Promise<SavedLocation[]> {
  const locations = await getSavedLocations();
  return locations.sort((a, b) => {
    const roadCompare = a.road_id.localeCompare(b.road_id);
    if (roadCompare !== 0) return roadCompare;
    return a.start_slk - b.start_slk;
  });
}

/**
 * Migrate existing localStorage data to IndexedDB
 * This should be called once when the app loads
 */
export async function migrateFromLocalStorage(): Promise<number> {
  if (typeof window === 'undefined') return 0;

  // Check if already migrated
  const alreadyMigrated = localStorage.getItem(MIGRATION_KEY);
  if (alreadyMigrated) return 0;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Mark as migrated even if nothing to migrate
      localStorage.setItem(MIGRATION_KEY, 'true');
      return 0;
    }

    const locations: SavedLocation[] = JSON.parse(saved);
    if (!Array.isArray(locations) || locations.length === 0) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      return 0;
    }

    // Migrate each location to IndexedDB
    let migratedCount = 0;
    for (const location of locations) {
      const success = await saveLocation(location);
      if (success) migratedCount++;
    }

    // Mark as migrated
    localStorage.setItem(MIGRATION_KEY, 'true');

    // Keep localStorage data as backup for now (can be removed later)
    // localStorage.removeItem(STORAGE_KEY);

    console.log(`Migrated ${migratedCount} saved locations to IndexedDB`);
    return migratedCount;
  } catch (error) {
    console.error('Failed to migrate saved locations:', error);
    return 0;
  }
}

/**
 * Check if migration has been completed
 */
export function isMigrationComplete(): boolean {
  if (typeof window === 'undefined') return true;
  return !!localStorage.getItem(MIGRATION_KEY);
}

/**
 * Clear all saved locations (for testing/reset)
 */
export async function clearAllSavedLocations(): Promise<boolean> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('savedLocations', 'readwrite');
      const store = tx.objectStore('savedLocations');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Failed to clear saved locations:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Failed to clear saved locations:', error);
    return false;
  }
}

/**
 * Get count of saved locations
 */
export async function getSavedLocationsCount(): Promise<number> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('savedLocations', 'readonly');
      const store = tx.objectStore('savedLocations');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}
