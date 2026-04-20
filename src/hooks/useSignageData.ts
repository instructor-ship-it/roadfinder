'use client';

import { useState, useCallback } from 'react';
import {
  getSpeedZones,
  getSignageInCorridor,
  type SignageItem,
  type ParsedSpeedZone,
} from '@/lib/offline-db';

interface UseSignageDataParams {
  offlineToggles: { speedZones: boolean };
}

interface UseSignageDataReturn {
  speedLimit: number | null;
  signageCorridor: SignageItem[];
  signageLoading: boolean;
  corridorSpeedZones: ParsedSpeedZone[];
  fetchSpeedLimit: (roadId: string, slk: number) => Promise<void>;
  fetchSignageCorridor: (roadId: string, startSlk: number, endSlk?: number) => Promise<void>;
  resetSignageData: () => void;
}

/**
 * Custom hook for managing speed limit and signage corridor data
 * Handles fetching from offline data sources
 */
export function useSignageData({ offlineToggles }: UseSignageDataParams): UseSignageDataReturn {
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  const [signageCorridor, setSignageCorridor] = useState<SignageItem[]>([]);
  const [signageLoading, setSignageLoading] = useState<boolean>(false);
  const [corridorSpeedZones, setCorridorSpeedZones] = useState<ParsedSpeedZone[]>([]);

  const fetchSpeedLimit = useCallback(
    async (roadId: string, slk: number) => {
      // Check toggle: ON = use offline data, OFF = skip (no online speed limit API)
      if (!offlineToggles.speedZones) {
        setSpeedLimit(null);
        return;
      }

      try {
        const zones = await getSpeedZones(roadId);
        if (zones.length === 0) {
          setSpeedLimit(null);
          return;
        }
        // Find the zone that contains this SLK
        const matchingZone = zones.find((z) => slk >= z.start_slk && slk <= z.end_slk);
        if (matchingZone) {
          setSpeedLimit(matchingZone.speed_limit);
        } else {
          // Find nearest zone if not in any zone
          const sortedZones = [...zones].sort((a, b) => {
            const distA = Math.min(Math.abs(a.start_slk - slk), Math.abs(a.end_slk - slk));
            const distB = Math.min(Math.abs(b.start_slk - slk), Math.abs(b.end_slk - slk));
            return distA - distB;
          });
          if (sortedZones.length > 0) {
            setSpeedLimit(sortedZones[0].speed_limit);
          }
        }
      } catch (err) {
        console.error('Error fetching speed limit:', err);
        setSpeedLimit(null);
      }
    },
    [offlineToggles.speedZones]
  );

  const fetchSignageCorridor = useCallback(
    async (roadId: string, startSlk: number, endSlk?: number) => {
      setSignageLoading(true);
      setSignageCorridor([]);
      setCorridorSpeedZones([]);

      try {
        // Calculate corridor bounds
        // If only start SLK: corridor is start-0.7 to start+0.7
        // If start and end SLK: corridor is start-0.7 to end+0.7
        const corridorStart = startSlk - 0.7;
        const corridorEnd = endSlk && endSlk > startSlk ? endSlk + 0.7 : startSlk + 0.7;

        // Fetch speed zones for the road (combines MRWA + community overrides)
        // This gives us actual zone extents, not just sign positions
        const speedZones = await getSpeedZones(roadId);
        // Filter to zones that overlap with the corridor (with extended margin for context)
        const corridorZones = speedZones.filter(
          (zone) => zone.end_slk > corridorStart - 0.5 && zone.start_slk < corridorEnd + 0.5
        );
        setCorridorSpeedZones(corridorZones);

        // getSignageInCorridor reads from IndexedDB (offline data source)
        // For reports, show ALL signage data regardless of toggles
        // The toggles control the main display, but reports should show everything available
        const signage = await getSignageInCorridor(roadId, corridorStart, corridorEnd);
        setSignageCorridor(signage);
      } catch (err) {
        console.error('Error fetching signage corridor:', err);
        setSignageCorridor([]);
        setCorridorSpeedZones([]);
      } finally {
        setSignageLoading(false);
      }
    },
    []
  );

  const resetSignageData = useCallback(() => {
    setSpeedLimit(null);
    setSignageCorridor([]);
    setCorridorSpeedZones([]);
    setSignageLoading(false);
  }, []);

  return {
    speedLimit,
    signageCorridor,
    signageLoading,
    corridorSpeedZones,
    fetchSpeedLimit,
    fetchSignageCorridor,
    resetSignageData,
  };
}
