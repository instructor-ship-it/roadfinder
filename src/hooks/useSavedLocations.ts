/**
 * Custom hook for saved locations management
 *
 * Manages saved locations CRUD operations with IndexedDB persistence.
 *
 * @module hooks/useSavedLocations
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { SavedLocation } from '@/types/shared';
import {
  getSavedLocations as getSavedLocationsFromDB,
  saveLocation as saveLocationToDB,
  deleteSavedLocation as deleteSavedLocationFromDB,
  migrateFromLocalStorage,
} from '@/lib/saved-locations-db';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseSavedLocationsReturn {
  savedLocations: SavedLocation[];
  savedLocationsLoaded: boolean;
  savedLocationsSort: 'date' | 'road';
  sortedSavedLocations: SavedLocation[];
  handleSaveLocation: (
    name: string,
    roadId: string,
    roadName: string,
    region: string,
    startSlk: number,
    endSlk: number | null
  ) => Promise<boolean>;
  handleDeleteSavedLocation: (id: string) => Promise<boolean>;
  setSavedLocationsSort: (sort: 'date' | 'road') => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSavedLocations(): UseSavedLocationsReturn {
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [savedLocationsLoaded, setSavedLocationsLoaded] = useState(false);

  // Sort mode for saved locations: 'date' = most recent first, 'road' = road_id then SLK
  const [savedLocationsSort, setSavedLocationsSort] = useState<'date' | 'road'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('savedLocationsSort') as 'date' | 'road') || 'date';
    }
    return 'date';
  });

  // Sorted saved locations based on sort mode
  const sortedSavedLocations = useMemo(() => {
    const sorted = [...savedLocations];
    if (savedLocationsSort === 'date') {
      // Sort by created_at descending (most recent first)
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // Sort by road_id first, then by start_slk
      sorted.sort((a, b) => {
        const roadCompare = a.road_id.localeCompare(b.road_id);
        if (roadCompare !== 0) return roadCompare;
        return a.start_slk - b.start_slk;
      });
    }
    return sorted;
  }, [savedLocations, savedLocationsSort]);

  // Persist sort preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedLocationsSort', savedLocationsSort);
    }
  }, [savedLocationsSort]);

  // Load saved locations from IndexedDB on mount
  useEffect(() => {
    async function loadSavedLocations() {
      // Migrate from localStorage if needed
      await migrateFromLocalStorage();
      // Load from IndexedDB
      const locations = await getSavedLocationsFromDB();
      setSavedLocations(locations);
      setSavedLocationsLoaded(true);
    }
    loadSavedLocations();
  }, []);

  // Save a new location
  const handleSaveLocation = useCallback(
    async (
      name: string,
      roadId: string,
      roadName: string,
      region: string,
      startSlk: number,
      endSlk: number | null
    ): Promise<boolean> => {
      if (!roadId || isNaN(startSlk)) return false;

      const newLocation: SavedLocation = {
        id: `${roadId}-${startSlk}-${Date.now()}`,
        name: name || `${roadId} @ ${startSlk}`,
        road_id: roadId,
        road_name: roadName,
        region: region,
        start_slk: startSlk,
        end_slk: endSlk,
        created_at: new Date().toISOString(),
      };

      // Save to IndexedDB (no limit - unlimited storage)
      const success = await saveLocationToDB(newLocation);
      if (success) {
        // Update local state
        setSavedLocations((prev) => [newLocation, ...prev]);
      }
      return success;
    },
    []
  );

  // Delete a saved location
  const handleDeleteSavedLocation = useCallback(async (id: string): Promise<boolean> => {
    // Delete from IndexedDB
    const success = await deleteSavedLocationFromDB(id);
    if (success) {
      // Update local state
      setSavedLocations((prev) => prev.filter((loc) => loc.id !== id));
    }
    return success;
  }, []);

  return {
    savedLocations,
    savedLocationsLoaded,
    savedLocationsSort,
    sortedSavedLocations,
    handleSaveLocation,
    handleDeleteSavedLocation,
    setSavedLocationsSort,
  };
}

export default useSavedLocations;
