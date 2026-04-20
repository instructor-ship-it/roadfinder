/**
 * Custom hook for work zone lookup logic
 *
 * Extracts the core work zone search, lookup, and export functionality
 * from page.tsx. Manages result, loading, error, and export states.
 *
 * @module hooks/useWorkZoneLookup
 */

import { useState, useCallback } from 'react';
import {
  WorkZoneResult,
  WeatherData,
  WarningData,
  TrafficData,
  PlacesData,
  CrossRoad,
} from '@/types/shared';
import { getWorkZoneOffline } from '@/lib/offline-db';
import { getRecordsForRoadNearSlk, type TrafficCountRecord } from '@/lib/traffic-counter-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseWorkZoneLookupParams {
  offlineToggles: { workZoneLookup: boolean };
  fetchSpeedLimit: (roadId: string, slk: number) => Promise<void>;
  fetchSignageCorridor: (roadId: string, startSlk: number, endSlk?: number) => Promise<void>;
  fetchWeather: (lat: number, lon: number) => Promise<void>;
  fetchTraffic: (roadId: string, lat: number, lon: number) => Promise<void>;
  fetchPlaces: (lat: number, lon: number) => Promise<void>;
  fetchWarnings: () => Promise<void>;
  fetchCrossRoads: (data: WorkZoneResult) => Promise<void>;
  /** Called when form fields need to be set (region, road, SLK) */
  onSetFormFields: (fields: {
    region?: string;
    roadId: string;
    startSlk: string;
    endSlk: string;
  }) => void;
  /** Current selected region — used to check if region change is needed */
  selectedRegion: string;
  /** Called to update the selected region if it differs */
  onUpdateSelectedRegion: (region: string) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkZoneLookup({
  offlineToggles,
  fetchSpeedLimit,
  fetchSignageCorridor,
  fetchWeather,
  fetchTraffic,
  fetchPlaces,
  fetchWarnings,
  fetchCrossRoads,
  onSetFormFields,
  selectedRegion,
  onUpdateSelectedRegion,
}: UseWorkZoneLookupParams) {
  const [result, setResult] = useState<WorkZoneResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isSinglePoint, setIsSinglePoint] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [userTrafficCounts, setUserTrafficCounts] = useState<TrafficCountRecord[]>([]);

  // Main function to get work zone info - can be called with parameters or from UI
  const getWorkZoneInfo = useCallback(
    async (
      region: string,
      roadId: string,
      startSlkVal: string,
      endSlkVal: string,
      keepInfo: boolean = false
    ) => {
      if (!roadId) {
        setError('Select a road');
        return;
      }
      if (!startSlkVal) {
        setError('Enter Start SLK');
        return;
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

      // Set form fields via callback
      if (region && region !== selectedRegion) {
        onUpdateSelectedRegion(region);
      }
      onSetFormFields({ region, roadId, startSlk: startSlkVal, endSlk: endSlkVal });

      setLoading(true);
      setError('');
      setResult(null);
      setUserTrafficCounts([]);

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
          return;
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

        // Fetch additional data using midpoint (only if online)
        if (data.midpoint) {
          fetchWeather(data.midpoint.lat, data.midpoint.lon);
          fetchWarnings(); // BOM weather warnings for WA
          fetchTraffic(roadId, data.midpoint.lat, data.midpoint.lon);
          fetchPlaces(data.midpoint.lat, data.midpoint.lon);
        }
        // Look up user-saved traffic counts for this road near the work zone
        try {
          const startSlkNum = parseFloat(startSlkVal);
          const nearCounts = getRecordsForRoadNearSlk(roadId, startSlkNum);
          setUserTrafficCounts(nearCounts);
        } catch {
          setUserTrafficCounts([]);
        }
        // Fetch cross roads using TC corridor
        fetchCrossRoads(data);
      } catch (err) {
        setError('Failed to get location');
      } finally {
        setLoading(false);
      }
    },
    [
      offlineToggles.workZoneLookup,
      fetchSpeedLimit,
      fetchSignageCorridor,
      fetchWeather,
      fetchTraffic,
      fetchPlaces,
      fetchWarnings,
      fetchCrossRoads,
      onSetFormFields,
      selectedRegion,
      onUpdateSelectedRegion,
    ]
  );

  // Export work zone report as PDF
  const exportReport = useCallback(
    async (
      result: WorkZoneResult,
      weather: WeatherData | null,
      traffic: TrafficData | null,
      crossRoads: CrossRoad[],
      places: PlacesData | null
    ) => {
      if (!result) return;

      setExporting(true);
      try {
        const response = await fetch('/api/export-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            road_id: result.road_id,
            road_name: result.road_name,
            work_zone: result.work_zone,
            tc_positions: result.tc_positions,
            speed_zones: result.speed_zones,
            carriageway: result.carriageway,
            weather: weather,
            traffic: traffic,
            side_roads: crossRoads.filter(
              (road) => road.name.toLowerCase() !== result.road_name.toLowerCase()
            ),
            amenities: places,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `work-zone-${result.road_id}-${result.work_zone.start_slk.toFixed(2)}.txt`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setExporting(false);
      }
    },
    []
  );

  // Clear lookup results (used by handleReset in page.tsx)
  const clearLookupResults = useCallback(() => {
    setResult(null);
    setError('');
    setIsSinglePoint(false);
    setUserTrafficCounts([]);
  }, []);

  return {
    result,
    setResult,
    error,
    setError,
    loading,
    isSinglePoint,
    exporting,
    userTrafficCounts,
    setUserTrafficCounts,
    getWorkZoneInfo,
    exportReport,
    clearLookupResults,
  };
}

export default useWorkZoneLookup;
