'use client';

import { useState, useCallback } from 'react';
import { getWorkZoneOffline, getSpeedZones, getSignageInCorridor } from '@/lib/offline-db';
import type { SignageItem, ParsedSpeedZone } from '@/lib/offline-db';

export interface Position {
  lat: number;
  lon: number;
  speed: string;
  cwy: string;
}

export interface WorkZoneResult {
  road_id: string;
  road_name: string;
  network_type?: string;
  work_zone: {
    start_slk: number;
    end_slk: number;
    length_m: number;
    start: Position | null;
    end: Position | null;
  };
  tc_positions: {
    start_slk: number;
    end_slk: number;
    start: Position | null;
    end: Position | null;
    tc_length_m?: number;
  };
  approach_signs: {
    start_slk: number;
    end_slk: number;
    start: Position | null;
    end: Position | null;
  };
  speed_zones: {
    approach_start: string;
    tc_start: string;
    work_zone_start: string;
    work_zone_end: string;
    tc_end: string;
    approach_end: string;
  };
  carriageway: string;
  pavement?: {
    lanes: number | null;
    width_m: number | null;
    cwy: string;
    total_pave_width: number | null;
    total_seal_width: number | null;
    sealed_shoulder_l: number | null;
    sealed_shoulder_r: number | null;
    unsealed_shoulder_l: number | null;
    unsealed_shoulder_r: number | null;
    kerb_l: string | null;
    kerb_r: string | null;
  };
  midpoint: { lat: number; lon: number; slk: number } | null;
  google_maps: {
    work_zone_start: string | null;
    work_zone_end: string | null;
    tc_start: string | null;
    tc_end: string | null;
  };
}

interface UseWorkZoneDataReturn {
  result: WorkZoneResult | null;
  loading: boolean;
  error: string;
  speedLimit: number | null;
  signageCorridor: SignageItem[];
  corridorSpeedZones: ParsedSpeedZone[];
  signageLoading: boolean;
  isSinglePoint: boolean;
  getWorkZoneInfo: (
    region: string,
    roadId: string,
    startSlkVal: string,
    endSlkVal: string,
    keepInfo?: boolean
  ) => Promise<WorkZoneResult | null>;
  fetchSpeedLimit: (roadId: string, slk: number) => Promise<void>;
  fetchSignageCorridor: (roadId: string, startSlk: number, endSlk?: number) => Promise<void>;
  setResult: (result: WorkZoneResult | null) => void;
  setError: (error: string) => void;
  setSpeedLimit: (limit: number | null) => void;
  reset: () => void;
}

/**
 * Custom hook for managing work zone data fetching and caching
 */
export function useWorkZoneData(
  offlineToggles: { workZoneLookup: boolean; speedZones: boolean },
  onUpdateSelectedRegion?: (region: string) => void,
  onSetSelectedRoad?: (roadId: string) => void,
  onSetStartSlk?: (slk: string) => void,
  onSetEndSlk?: (slk: string) => void
): UseWorkZoneDataReturn {
  const [result, setResult] = useState<WorkZoneResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  const [signageCorridor, setSignageCorridor] = useState<SignageItem[]>([]);
  const [corridorSpeedZones, setCorridorSpeedZones] = useState<ParsedSpeedZone[]>([]);
  const [signageLoading, setSignageLoading] = useState<boolean>(false);
  const [isSinglePoint, setIsSinglePoint] = useState<boolean>(false);

  // Look up speed limit for a road at a specific SLK
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

  // Fetch signage corridor data for work zone
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

  // Main function to get work zone info
  const getWorkZoneInfo = useCallback(
    async (
      region: string,
      roadId: string,
      startSlkVal: string,
      endSlkVal: string,
      keepInfo: boolean = false
    ): Promise<WorkZoneResult | null> => {
      if (!roadId) {
        setError('Select a road');
        return null;
      }
      if (!startSlkVal) {
        setError('Enter Start SLK');
        return null;
      }

      // Save parameters to sessionStorage if keepInfo is true
      if (keepInfo) {
        sessionStorage.setItem(
          'workZoneParams',
          JSON.stringify({
            region,
            roadId,
            startSlk: startSlkVal,
            endSlk: endSlkVal,
          })
        );
      }

      // Set state variables via callbacks
      if (region && onUpdateSelectedRegion) {
        onUpdateSelectedRegion(region);
      }
      if (onSetSelectedRoad) onSetSelectedRoad(roadId);
      if (onSetStartSlk) onSetStartSlk(startSlkVal);
      if (onSetEndSlk) onSetEndSlk(endSlkVal);

      setLoading(true);
      setError('');
      setResult(null);

      // Track if this is a single point lookup (no end SLK provided)
      const singlePoint = !endSlkVal || endSlkVal === '';
      setIsSinglePoint(singlePoint);

      try {
        // Use end_slk if provided, otherwise same as start (single point)
        const endSlkValue = endSlkVal || startSlkVal;
        const startSlkNum = parseFloat(startSlkVal);
        const endSlkNum = parseFloat(endSlkValue);

        let data: WorkZoneResult | null = null;

        // Check toggle: ON = offline mode (try offline first, fallback to online)
        // OFF = online mode (try online first, fallback to offline)
        if (offlineToggles.workZoneLookup) {
          // OFFLINE MODE: Try IndexedDB first, fall back to API if not found
          data = await getWorkZoneOffline(roadId, startSlkNum, endSlkNum);

          if (!data) {
            // No offline data, fall back to online API
            console.log('Road not found in offline data, falling back to online API');
            try {
              const response = await fetch('/api/roads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  road_id: roadId,
                  start_slk: startSlkNum,
                  end_slk: endSlkNum,
                }),
              });

              if (response.ok) {
                data = await response.json();
              }
            } catch {
              // Both offline and online failed
            }
          }
        } else {
          // ONLINE MODE: Try API first, fall back to IndexedDB
          try {
            const response = await fetch('/api/roads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                road_id: roadId,
                start_slk: startSlkNum,
                end_slk: endSlkNum,
              }),
            });

            if (response.ok) {
              data = await response.json();
            } else {
              // API returned error, try offline fallback
              data = await getWorkZoneOffline(roadId, startSlkNum, endSlkNum);
            }
          } catch {
            // API failed, try offline fallback
            data = await getWorkZoneOffline(roadId, startSlkNum, endSlkNum);
          }
        }

        if (!data) {
          setError('Road not found');
          setLoading(false);
          return null;
        }

        setResult(data);

        // Fetch speed limit for this road at the start SLK
        fetchSpeedLimit(roadId, parseFloat(startSlkVal));

        // Fetch signage corridor for work zone
        fetchSignageCorridor(
          roadId,
          parseFloat(startSlkVal),
          endSlkValue ? parseFloat(endSlkValue) : undefined
        );

        return data;
      } catch (err) {
        setError('Failed to get location');
        setLoading(false);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      offlineToggles.workZoneLookup,
      onUpdateSelectedRegion,
      onSetSelectedRoad,
      onSetStartSlk,
      onSetEndSlk,
      fetchSpeedLimit,
      fetchSignageCorridor,
    ]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError('');
    setSpeedLimit(null);
    setSignageCorridor([]);
    setCorridorSpeedZones([]);
    setIsSinglePoint(false);
  }, []);

  return {
    result,
    loading,
    error,
    speedLimit,
    signageCorridor,
    corridorSpeedZones,
    signageLoading,
    isSinglePoint,
    getWorkZoneInfo,
    fetchSpeedLimit,
    fetchSignageCorridor,
    setResult,
    setError,
    setSpeedLimit,
    reset,
  };
}
