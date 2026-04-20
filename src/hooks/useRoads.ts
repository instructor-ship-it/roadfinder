'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRoadsForRegion } from '@/lib/offline-db';
import type { Road } from '@/types/shared';

export type { Road };

interface UseRoadsReturn {
  roads: Road[];
  loadingRoads: boolean;
  error: string;
  fetchRoads: (region: string) => Promise<void>;
}

/**
 * Custom hook for managing roads loading for a region
 * Handles offline fallback and caching
 */
export function useRoads(
  selectedRegion: string,
  offlineToggles: { roadsList: boolean }
): UseRoadsReturn {
  const [roads, setRoads] = useState<Road[]>([]);
  const [loadingRoads, setLoadingRoads] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const isRestoring = useRef(false);

  const fetchRoads = useCallback(
    async (region: string) => {
      setLoadingRoads(true);
      // Only reset road selection if we're not restoring state
      if (!isRestoring.current) {
        // Road selection is handled by parent component
      }
      try {
        // Check toggle: ON = offline mode (try offline first, fallback to online)
        // OFF = online mode (try online first, fallback to offline)
        if (offlineToggles.roadsList) {
          // OFFLINE MODE: Try IndexedDB first, fall back to API if not available
          const storedRoads = await getRoadsForRegion(region);
          if (storedRoads && storedRoads.length > 0) {
            setRoads(storedRoads);
          } else {
            // No offline data - check if we're online before trying API
            if (!navigator.onLine) {
              console.log('Offline: No roads data available');
              setError('No offline roads data. Download data first or connect to internet.');
              setRoads([]);
            } else {
              // Online: Try API with timeout
              console.log('No offline roads data, falling back to online API');
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

              try {
                const response = await fetch(
                  `/api/roads?action=list&region=${encodeURIComponent(region)}`,
                  { signal: controller.signal }
                );
                clearTimeout(timeoutId);
                if (response.ok) {
                  const data = await response.json();
                  setRoads(data.roads || []);
                } else {
                  setError('No roads data available (offline or online)');
                  setRoads([]);
                }
              } catch {
                clearTimeout(timeoutId);
                setError('Failed to load roads - offline data not available and API unreachable');
                setRoads([]);
              }
            }
          }
        } else {
          // ONLINE MODE: Try API first (with timeout), fall back to IndexedDB
          if (!navigator.onLine) {
            // Offline: Go straight to IndexedDB
            console.log('Offline: Loading roads from IndexedDB');
            const storedRoads = await getRoadsForRegion(region);
            if (storedRoads && storedRoads.length > 0) {
              setRoads(storedRoads);
            } else {
              setError('No offline roads data. Download data first or connect to internet.');
              setRoads([]);
            }
          } else {
            // Online: Try API with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            try {
              const response = await fetch(
                `/api/roads?action=list&region=${encodeURIComponent(region)}`,
                { signal: controller.signal }
              );
              clearTimeout(timeoutId);
              if (response.ok) {
                const data = await response.json();
                setRoads(data.roads || []);
              } else {
                // API failed, try IndexedDB fallback
                const storedRoads = await getRoadsForRegion(region);
                setRoads(storedRoads || []);
              }
            } catch {
              clearTimeout(timeoutId);
              // API failed, try IndexedDB fallback
              const storedRoads = await getRoadsForRegion(region);
              setRoads(storedRoads || []);
            }
          }
        }
      } catch (err) {
        setError('Failed to load roads');
      } finally {
        setLoadingRoads(false);
      }
    },
    [offlineToggles.roadsList]
  );

  // Fetch roads when region changes
  useEffect(() => {
    if (selectedRegion) {
      fetchRoads(selectedRegion);
    }
  }, [selectedRegion, fetchRoads]);

  return {
    roads,
    loadingRoads,
    error,
    fetchRoads,
  };
}

/**
 * Hook for managing the restoring state ref
 */
export function useRoadsRestore() {
  const isRestoring = useRef(false);
  const pendingRestoreParams = useRef<{
    region: string;
    roadId: string;
    startSlk: string;
    endSlk: string;
  } | null>(null);

  return {
    isRestoring,
    pendingRestoreParams,
    setRestoring: (value: boolean) => {
      isRestoring.current = value;
    },
    setPendingParams: (params: typeof pendingRestoreParams.current) => {
      pendingRestoreParams.current = params;
    },
  };
}
