/**
 * Custom hook for work zone state management
 *
 * Manages road search, work zone lookup, and results display.
 *
 * @module hooks/useWorkZone
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { WeatherData, WarningData, TrafficData, SavedLocation } from '@/types/shared';
import {
  getWorkZoneOffline,
  getSpeedZones,
  getSignageInCorridor,
  findNearestAmenities,
  type ParsedSpeedZone,
  type SignageItem,
} from '@/lib/offline-db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Road {
  road_id: string;
  road_name: string;
  region: string;
  road_type: string;
  network_type: string;
  start_slk: number;
  end_slk: number;
}

export interface WorkZoneResult {
  road_id: string;
  road_name: string;
  region: string;
  road_type: string;
  network_type: string;
  work_zone: {
    start_slk: number;
    end_slk: number;
    start_lat: number;
    start_lon: number;
    end_lat: number;
    end_lon: number;
  };
  geometry?: Array<{ lat: number; lon: number; slk: number }>;
}

export interface CrossRoad {
  road_id: string;
  road_name: string;
  intersecting_road_name: string;
  slk: number;
  lat: number;
  lon: number;
  distance_m?: number;
}

export interface PlacesData {
  hospital: { name: string; distance: string; lat: number; lon: number } | null;
  fuelStation: { name: string; distance: string; lat: number; lon: number } | null;
  toilet: { name: string; distance: string; lat: number; lon: number } | null;
  hospitalSource?: string;
  fuelSource?: string;
  toiletSource?: string;
  cachedAt?: number;
  cachedLocation?: { lat: number; lon: number };
  source: string;
  dataUnavailable?: boolean;
}

export interface WorkZoneState {
  regions: string[];
  selectedRegion: string;
  roads: Road[];
  selectedRoad: string;
  startSlk: string;
  endSlk: string;
  loading: boolean;
  loadingRegions: boolean;
  loadingRoads: boolean;
  result: WorkZoneResult | null;
  weather: WeatherData | null;
  warnings: WarningData | null;
  traffic: TrafficData | null;
  places: PlacesData | null;
  crossRoads: CrossRoad[];
  corridorIntersections: CrossRoad[];
  error: string;
  roadInfo: Road | null;
  isSinglePoint: boolean;
  exporting: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkZone() {
  // Region and road selection state
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const selectedRegionRef = useRef<string>('');
  const [roads, setRoads] = useState<Road[]>([]);
  const [selectedRoad, setSelectedRoad] = useState<string>('');
  const [startSlk, setStartSlk] = useState<string>('');
  const [endSlk, setEndSlk] = useState<string>('');

  // Loading states
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingRegions, setLoadingRegions] = useState<boolean>(true);
  const [loadingRoads, setLoadingRoads] = useState<boolean>(false);

  // Results state
  const [result, setResult] = useState<WorkZoneResult | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [warnings, setWarnings] = useState<WarningData | null>(null);
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [places, setPlaces] = useState<PlacesData | null>(null);
  const [crossRoads, setCrossRoads] = useState<CrossRoad[]>([]);
  const [corridorIntersections, setCorridorIntersections] = useState<CrossRoad[]>([]);

  // Error and info state
  const [error, setError] = useState<string>('');
  const [roadInfo, setRoadInfo] = useState<Road | null>(null);
  const [isSinglePoint, setIsSinglePoint] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Signage corridor state
  const [signageCorridor, setSignageCorridor] = useState<SignageItem[]>([]);
  const [signageLoading, setSignageLoading] = useState<boolean>(false);
  const [corridorSpeedZones, setCorridorSpeedZones] = useState<ParsedSpeedZone[]>([]);

  // Saved locations state
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [savedLocationsLoaded, setSavedLocationsLoaded] = useState(false);
  const [savedLocationsSort, setSavedLocationsSort] = useState<'date' | 'road'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('savedLocationsSort') as 'date' | 'road') || 'date';
    }
    return 'date';
  });

  // Sorted saved locations
  const sortedSavedLocations = useMemo(() => {
    if (!savedLocations.length) return [];

    return [...savedLocations].sort((a, b) => {
      if (savedLocationsSort === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.road_name.localeCompare(b.road_name);
    });
  }, [savedLocations, savedLocationsSort]);

  // Update selected region with ref sync
  const updateSelectedRegion = useCallback((region: string) => {
    setSelectedRegion(region);
    selectedRegionRef.current = region;
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setResult(null);
    setWeather(null);
    setWarnings(null);
    setTraffic(null);
    setPlaces(null);
    setCrossRoads([]);
    setCorridorIntersections([]);
    setSignageCorridor([]);
    setCorridorSpeedZones([]);
    setError('');
    setRoadInfo(null);
    setIsSinglePoint(false);
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    clearResults();
    setSelectedRoad('');
    setStartSlk('');
    setEndSlk('');
  }, [clearResults]);

  return {
    // Region/Road state
    regions,
    setRegions,
    selectedRegion,
    setSelectedRegion: updateSelectedRegion,
    selectedRegionRef,
    roads,
    setRoads,
    selectedRoad,
    setSelectedRoad,
    startSlk,
    setStartSlk,
    endSlk,
    setEndSlk,

    // Loading states
    loading,
    setLoading,
    loadingRegions,
    setLoadingRegions,
    loadingRoads,
    setLoadingRoads,

    // Results
    result,
    setResult,
    weather,
    setWeather,
    warnings,
    setWarnings,
    traffic,
    setTraffic,
    places,
    setPlaces,
    crossRoads,
    setCrossRoads,
    corridorIntersections,
    setCorridorIntersections,

    // Signage corridor
    signageCorridor,
    setSignageCorridor,
    signageLoading,
    setSignageLoading,
    corridorSpeedZones,
    setCorridorSpeedZones,

    // Error and info
    error,
    setError,
    roadInfo,
    setRoadInfo,
    isSinglePoint,
    setIsSinglePoint,
    exporting,
    setExporting,

    // Saved locations
    savedLocations,
    setSavedLocations,
    savedLocationsLoaded,
    setSavedLocationsLoaded,
    savedLocationsSort,
    setSavedLocationsSort,
    sortedSavedLocations,

    // Actions
    clearResults,
    resetForm,
  };
}

export default useWorkZone;
