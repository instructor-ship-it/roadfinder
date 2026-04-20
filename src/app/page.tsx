'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { haversineDistance } from '@/lib/utils';
import { EmergencyLocationModal } from '@/components/EmergencyLocationModal';
import { TrafficCountDetailModal } from '@/components/TrafficCountDetailModal';
import { DebugInfoPopup } from '@/components/DebugInfoPopup';
import { useSetDistance } from '@/hooks/useSetDistance';
import { useOfflineData } from '@/hooks/useOfflineData';
import { useHomeSettings } from '@/hooks/useHomeSettings';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import { useRegions } from '@/hooks/useRegions';
import { useRoads } from '@/hooks/useRoads';
import { useWeather } from '@/hooks/useWeather';
import { usePlaces } from '@/hooks/usePlaces';
import { IncidentsSection } from '@/components/IncidentsSection';
import SpeedZoneLayout from '@/components/SpeedZoneLayout';
import SettingsDrawer, { APP_VERSION } from '@/components/SettingsDrawer';
import { TrafficEventLoggerModal } from '@/components/TrafficEventLoggerModal';
import { Onboarding } from '@/components/Onboarding';
import { SavedLocations } from '@/components/home/SavedLocations';
import { WeatherSection } from '@/components/home/WeatherSection';
import { TrafficSection } from '@/components/home/TrafficSection';
import { AmenitiesSection } from '@/components/home/AmenitiesSection';
import { WorkZoneSummary } from '@/components/home/WorkZoneSummary';
import { SignageCorridorSection } from '@/components/home/SignageCorridorSection';
import { IntersectionsSection } from '@/components/home/IntersectionsSection';
import { RoadWidthBreakdown } from '@/components/home/RoadWidthBreakdown';
import { LaneDirectionDiagram } from '@/components/home/LaneDirectionDiagram';
import { WorkZoneForm } from '@/components/home/WorkZoneForm';
import { TrafficVolumeSection } from '@/components/home/TrafficVolumeSection';
import { useWorkZoneFetch } from '@/hooks/useWorkZoneFetch';
import { WorkZoneReport } from '@/components/WorkZoneReport';
import { SetDistanceControls } from '@/components/SetDistanceControls';
import { GpsLookupDialog } from '@/components/GpsLookupDialog';
import { ReportExportModal } from '@/components/ReportExportModal';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';

import {
  initDB,
  isOfflineDataAvailable,
  getOfflineMetadata,
  storeRegionData,
  storeSpeedZones,
  storeMetadata,
  clearOfflineData,
  getSpeedZones,
  storeRailCrossings,
  storeRegulatorySigns,
  storeWarningSigns,
  storePavementData,
  storeTrafficData,
  storeAllAmenitiesData,
  getAllAmenitiesData,
  findNearestAmenities,
  getSignageInCorridor,
  getDetailedStats,
  storeRoadsData,
  storeSpeedZonesData,
  storeRailCrossingsData,
  storeRegulatorySignsData,
  storeWarningSignsData,
  clearDataset,
  getStoredRegions,
  getRoadsForRegion,
  getWorkZoneOffline,
  cacheWeatherData,
  getCachedWeatherData,
  type SignageItem,
  type DatasetMetadata,
  type ParsedSpeedZone,
} from '@/lib/offline-db';
import { loadStaticData, checkStaticData } from '@/lib/download-roads';
import {
  getRecordsForRoadNearSlk,
  generateShareText,
  formatAusDate,
  type TrafficCountRecord,
} from '@/lib/traffic-counter-storage';
import { WeatherData, WarningItem, WarningData, TrafficData, SavedLocation } from '@/types/shared';
import {
  getSavedLocations as getSavedLocationsFromDB,
  saveLocation as saveLocationToDB,
  deleteSavedLocation as deleteSavedLocationFromDB,
  migrateFromLocalStorage,
} from '@/lib/saved-locations-db';

interface Road {
  road_id: string;
  road_name: string;
  min_slk: number;
  max_slk: number;
  region?: string;
}

interface Position {
  lat: number;
  lon: number;
  speed: string;
  cwy: string;
}

interface WorkZoneResult {
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

interface Place {
  name: string;
  distance: string;
  lat: number;
  lon: number;
  phone?: string;
  address?: string;
  googleMapsUrl: string;
  isEmergency?: boolean;
  // Hospital-specific (from WA Health SLIP)
  hospitalType?: string; // 'Public' | 'Private' | 'Nursing Post'
  hospitalCategory?: string; // e.g. 'Acute Hospital', 'Nursing Post'
  beds?: number;
  suburb?: string;
  // Fuel station-specific (from FuelWatch WA)
  fuelBrand?: string;
  fuelPrice?: number; // cents per litre (e.g. 231.3 = $2.313/L)
  fuelDate?: string; // date of price
  siteFeatures?: string[]; // e.g. ['Open 24 hours', 'Toilets', 'ATM']
  // Toilet-specific (from National Public Toilet Map)
  toiletType?: string; // e.g. 'Park or reserve', 'Service station', 'Community building'
  openingHours?: string;
  wheelchair?: boolean;
  toiletNote?: string;
  toiletUrl?: string;
  toiletSource?: string; // 'NationalToiletMap' | 'OpenStreetMap'
}

interface PlacesData {
  hospital: Place | null;
  toilet: Place | null;
  fuelStation: Place | null;
  fromCache?: boolean;
  cachedAt?: number;
  cachedLocation?: { lat: number; lon: number };
  source?: string;
  dataUnavailable?: boolean; // True when offline mode but no cached data available
  // Enhanced source tracking
  hospitalSource?: string; // e.g. 'WA Health SLIP' | 'Overpass API'
  fuelSource?: string; // e.g. 'FuelWatch WA' | 'Overpass API'
}

interface CrossRoad {
  name: string;
  distance: string;
  lat: number;
  lon: number;
  roadType: string;
  googleMapsUrl: string;
  intersectionSlk?: number; // SLK of intersection on main road (from MRWA Layer 6)
}

export default function Home() {
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const selectedRegionRef = useRef<string>('');
  // Keep ref in sync with state to avoid stale closures in async functions
  const updateSelectedRegion = useCallback((region: string) => {
    selectedRegionRef.current = region;
    setSelectedRegion(region);
  }, []);
  const [roads, setRoads] = useState<Road[]>([]);
  const [selectedRoad, setSelectedRoad] = useState<string>('');
  const [startSlk, setStartSlk] = useState<string>('');
  const [endSlk, setEndSlk] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingRegions, setLoadingRegions] = useState<boolean>(true);
  const [loadingRoads, setLoadingRoads] = useState<boolean>(false);
  const [result, setResult] = useState<WorkZoneResult | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [warnings, setWarnings] = useState<WarningData | null>(null);
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [userTrafficCounts, setUserTrafficCounts] = useState<TrafficCountRecord[]>([]);
  const [selectedCountDetail, setSelectedCountDetail] = useState<TrafficCountRecord | null>(null);
  const [userTrafficOverride, setUserTrafficOverride] = useState<TrafficCountRecord | null>(null);
  const [places, setPlaces] = useState<PlacesData | null>(null);
  const [crossRoads, setCrossRoads] = useState<CrossRoad[]>([]);
  const [corridorIntersections, setCorridorIntersections] = useState<CrossRoad[]>([]); // For signage corridor (±700m)
  const [error, setError] = useState<string>('');
  const [roadInfo, setRoadInfo] = useState<Road | null>(null);
  const [isSinglePoint, setIsSinglePoint] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Saved locations hook
  const {
    savedLocations,
    savedLocationsLoaded,
    savedLocationsSort,
    sortedSavedLocations,
    handleSaveLocation: saveLocationBase,
    handleDeleteSavedLocation,
    setSavedLocationsSort,
  } = useSavedLocations();

  // Wrapper for handleSaveLocation that uses current form values
  const handleSaveLocation = async (name: string) => {
    if (!selectedRoad || !startSlk) return;
    await saveLocationBase(
      name,
      selectedRoad,
      roadInfo?.road_name || selectedRoad,
      selectedRegion,
      parseFloat(startSlk),
      endSlk ? parseFloat(endSlk) : null
    );
  };

  const recallLocation = async (loc: SavedLocation) => {
    // Use ref to avoid stale closure — always reads latest region value
    const currentRegion = selectedRegionRef.current;

    // If the region is different, we need to switch regions first.
    // Instead of a fragile setTimeout, we use the same pendingRestoreParams
    // pattern as the sessionStorage restore flow — it waits for the roads
    // useEffect to populate the roads list, then calls getWorkZoneInfo.
    if (loc.region && loc.region !== currentRegion) {
      isRestoring.current = true;
      pendingRestoreParams.current = {
        region: loc.region,
        roadId: loc.road_id,
        startSlk: loc.start_slk.toString(),
        endSlk: loc.end_slk ? loc.end_slk.toString() : '',
      };
      updateSelectedRegion(loc.region);
      // The useEffect watching [roads] will pick up pendingRestoreParams
      // and call getWorkZoneInfo once the road list is loaded.
      return;
    }

    // Same region — directly call getWorkZoneInfo
    await getWorkZoneInfo(
      loc.region || selectedRegionRef.current,
      loc.road_id,
      loc.start_slk.toString(),
      loc.end_slk ? loc.end_slk.toString() : '',
      true
    );
  };

  // GPS location state
  const [gpsLat, setGpsLat] = useState<string>('');
  const [gpsLon, setGpsLon] = useState<string>('');
  const [loadingGps, setLoadingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string>('');
  const [gpsRoadInfo, setGpsRoadInfo] = useState<{
    road_id: string;
    road_name: string;
    network_type: string;
    slk: number;
  } | null>(null);
  const [showGpsDialog, setShowGpsDialog] = useState<boolean>(false);

  // Offline data hook
  const {
    offlineReady,
    defaultRegion,
    downloading,
    downloadProgress,
    offlineStats,
    offlineToggles,
    syncProgress,
    datasetStats,
    mrwaStatus,
    syncingDatasets,
    updateOfflineToggle,
    resetOfflineToggles,
    updateDefaultRegion,
    handleDownloadOfflineData,
    handleClearOfflineData,
    loadDatasetStats,
    fetchMrwaStatus,
    syncDatasetFromMrwa,
    syncAllDatasets,
    setDownloadProgress,
  } = useOfflineData();

  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState<boolean>(false);

  // Home settings hook (GPS settings, wind threshold, afterCare lookahead, speed display)
  const {
    showSpeedDisplay,
    gpsSettings,
    updateGpsSetting,
    windGustThreshold,
    updateWindGustThreshold,
    afterCareLookaheadKm,
    updateAfterCareLookaheadKm,
  } = useHomeSettings();

  // Set Distance hook
  const {
    setDistanceActive,
    setDistanceRefPoint,
    setDistanceCurrentSlk,
    setDistanceCurrentRoad,
    setDistanceDistance,
    setDistanceMarks,
    setDistanceTotalDistance,
    setSetDistanceActive,
    startSetDistance,
    stopSetDistance,
    setSetDistanceReference,
    markSetDistancePosition,
    resetSetDistance,
  } = useSetDistance();

  const [trafficEventLoggerOpen, setTrafficEventLoggerOpen] = useState<boolean>(false);

  // Signage corridor data
  const [signageCorridor, setSignageCorridor] = useState<SignageItem[]>([]);
  const [signageLoading, setSignageLoading] = useState<boolean>(false);
  const [corridorSpeedZones, setCorridorSpeedZones] = useState<ParsedSpeedZone[]>([]);

  // Work zone fetch hook - extracts fetch logic for weather, traffic, places, warnings, cross roads
  const { fetchWeather, fetchTraffic, fetchPlaces, fetchWarnings, fetchCrossRoads } =
    useWorkZoneFetch({
      offlineToggles,
      setWeather,
      setTraffic,
      setPlaces,
      setWarnings,
      setCrossRoads,
      setCorridorIntersections,
    });

  // Collapsible sections state
  const [showTraffic, setShowTraffic] = useState<boolean>(true);
  const [showSignageCorridor, setShowSignageCorridor] = useState<boolean>(true);
  const [showSpeedZoneLayout, setShowSpeedZoneLayout] = useState<boolean>(true);
  const [showTcPositions, setShowTcPositions] = useState<boolean>(true);
  const [showIntersections, setShowIntersections] = useState<boolean>(true);
  const [showWeather, setShowWeather] = useState<boolean>(true);
  const [showAmenities, setShowAmenities] = useState<boolean>(true);

  // Emergency location modal state
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);

  // Ref to track when we're restoring state (prevents fetchRoads from clearing selectedRoad)
  const isRestoring = useRef(false);
  // Ref to store pending restore params (to call getWorkZoneInfo after roads load)
  const pendingRestoreParams = useRef<{
    region: string;
    roadId: string;
    startSlk: string;
    endSlk: string;
  } | null>(null);
  // State to trigger UI re-render during restore (hides inputs)
  const [isRestoringUI, setIsRestoringUI] = useState<boolean>(false);

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore state from sessionStorage when returning from tracking
  useEffect(() => {
    const savedParams = sessionStorage.getItem('workZoneParams');
    if (savedParams) {
      try {
        const params = JSON.parse(savedParams);
        isRestoring.current = true;
        setIsRestoringUI(true); // Trigger UI to hide inputs

        // Store params for later use (after roads load)
        pendingRestoreParams.current = params;

        // Set region to trigger roads fetch
        if (params.region) {
          updateSelectedRegion(params.region);
        }

        // Don't clear params here - keep them until user clicks Reset
        // Clean up old format if it exists
        sessionStorage.removeItem('workZoneState');
      } catch (e) {
        console.error('Failed to restore params:', e);
        isRestoring.current = false;
        setIsRestoringUI(false);
      }
    }
  }, [updateSelectedRegion]);

  // Fetch roads when region changes
  useEffect(() => {
    if (selectedRegion) {
      fetchRoads(selectedRegion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion]);

  const generateDebugInfo = async () => {
    const lines: string[] = [];
    lines.push('=== TC Work Zone Locator Debug Info ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Version: 4.0`);
    lines.push('');
    lines.push('=== Offline Data Status ===');
    lines.push(`Offline Ready: ${offlineReady}`);
    lines.push(`Offline Stats: ${JSON.stringify(offlineStats)}`);
    lines.push('');
    lines.push('=== Current Selection ===');
    lines.push(`Region: ${selectedRegion}`);
    lines.push(`Road ID: ${selectedRoad}`);
    lines.push(`Road Info: ${JSON.stringify(roadInfo)}`);
    lines.push(`Start SLK: ${startSlk}`);
    lines.push(`End SLK: ${endSlk}`);
    lines.push('');
    lines.push('=== GPS Location ===');
    lines.push(`GPS Lat: ${gpsLat}`);
    lines.push(`GPS Lon: ${gpsLon}`);
    lines.push(`GPS Road Info: ${JSON.stringify(gpsRoadInfo)}`);
    lines.push('');
    lines.push('=== Result ===');
    if (result) {
      lines.push(`Road ID: ${result.road_id}`);
      lines.push(`Road Name: ${result.road_name}`);
      lines.push(`Network Type: ${result.network_type}`);
      lines.push(`Work Zone: SLK ${result.work_zone.start_slk} - ${result.work_zone.end_slk}`);
      lines.push(`Carriageway: ${result.carriageway}`);
      if (result.pavement) {
        lines.push(`Lanes: ${result.pavement.lanes || 'Unknown'}`);
        lines.push(
          `Road Width: ${result.pavement.width_m ? result.pavement.width_m + ' m' : 'Unknown'}`
        );
      }
      lines.push(`Speed Zones: ${JSON.stringify(result.speed_zones)}`);
    } else {
      lines.push('No result');
    }
    lines.push('');
    lines.push('=== Error ===');
    lines.push(`Error: ${error || 'None'}`);
    lines.push('');
    lines.push('=== Weather ===');
    lines.push(JSON.stringify(weather, null, 2));
    lines.push('');
    lines.push('=== Traffic ===');
    lines.push(JSON.stringify(traffic, null, 2));

    setDebugInfo(lines.join('\n'));
    setShowDebug(true);
  };

  const fetchRegions = async () => {
    try {
      // Try IndexedDB first (works offline)
      const storedRegions = await getStoredRegions();
      if (storedRegions && storedRegions.length > 0) {
        setRegions(storedRegions);
        // Check for saved default region first
        const savedDefault = localStorage.getItem('defaultRegion');
        if (savedDefault && storedRegions.includes(savedDefault)) {
          updateSelectedRegion(savedDefault);
        } else if (storedRegions.includes('Wheatbelt')) {
          updateSelectedRegion('Wheatbelt');
        } else {
          updateSelectedRegion(storedRegions[0]);
        }
        setLoadingRegions(false);
        return; // Exit early, no need to fetch from API
      }

      // OFFLINE CHECK: Skip API entirely if no internet connection
      // This prevents the app from hanging while waiting for network timeout
      if (!navigator.onLine) {
        console.log('Offline: Loading regions from static metadata.json');
        const metaResponse = await fetch('/data/metadata.json');
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          if (metaData.regions && metaData.regions.length > 0) {
            setRegions(metaData.regions);
            const savedDefault = localStorage.getItem('defaultRegion');
            if (savedDefault && metaData.regions.includes(savedDefault)) {
              updateSelectedRegion(savedDefault);
            } else if (metaData.regions.includes('Wheatbelt')) {
              updateSelectedRegion('Wheatbelt');
            } else {
              updateSelectedRegion(metaData.regions[0]);
            }
          }
        }
        return;
      }

      // Online: Try API with timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch('/api/roads?action=regions', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        // Check for API error response
        if (data.error) {
          console.error('API error fetching regions:', data.error);
          // Try to get regions from static metadata as fallback
          const metaResponse = await fetch('/data/metadata.json');
          if (metaResponse.ok) {
            const metaData = await metaResponse.json();
            if (metaData.regions && metaData.regions.length > 0) {
              setRegions(metaData.regions);
              const savedDefault = localStorage.getItem('defaultRegion');
              if (savedDefault && metaData.regions.includes(savedDefault)) {
                updateSelectedRegion(savedDefault);
              } else {
                updateSelectedRegion(metaData.regions[0]);
              }
            }
          }
          return;
        }

        if (data.regions && data.regions.length > 0) {
          setRegions(data.regions);
          // Check for saved default region first
          const savedDefault = localStorage.getItem('defaultRegion');
          if (savedDefault && data.regions.includes(savedDefault)) {
            updateSelectedRegion(savedDefault);
          } else if (data.regions.includes('Wheatbelt')) {
            updateSelectedRegion('Wheatbelt');
          } else {
            updateSelectedRegion(data.regions[0]);
          }
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        // API timed out or failed - fall back to static metadata
        console.log('API fetch failed, loading regions from static metadata.json');
        const metaResponse = await fetch('/data/metadata.json');
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          if (metaData.regions && metaData.regions.length > 0) {
            setRegions(metaData.regions);
            const savedDefault = localStorage.getItem('defaultRegion');
            if (savedDefault && metaData.regions.includes(savedDefault)) {
              updateSelectedRegion(savedDefault);
            } else if (metaData.regions.includes('Wheatbelt')) {
              updateSelectedRegion('Wheatbelt');
            } else {
              updateSelectedRegion(metaData.regions[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load regions:', err);
      setError('Failed to load regions');
      // Try static metadata as last resort
      try {
        const metaResponse = await fetch('/data/metadata.json');
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          if (metaData.regions && metaData.regions.length > 0) {
            setRegions(metaData.regions);
            updateSelectedRegion(metaData.regions[0]);
          }
        }
      } catch {
        // No regions available - user will only see Local option
      }
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchRoads = async (region: string) => {
    setLoadingRoads(true);
    // Only reset road selection if we're not restoring state
    if (!isRestoring.current) {
      setSelectedRoad('');
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
  };

  useEffect(() => {
    if (selectedRoad) {
      const road = roads.find((r) => r.road_id === selectedRoad);
      setRoadInfo(road || null);
    } else {
      setRoadInfo(null);
    }
    // Only clear results if not restoring
    if (!isRestoring.current) {
      setResult(null);
      setWeather(null);
      setWarnings(null);
      setTraffic(null);
      setPlaces(null);
      setCrossRoads([]);
      setError('');
    }
  }, [selectedRoad, roads]);

  // When roads are loaded during restore, call getWorkZoneInfo
  useEffect(() => {
    if (pendingRestoreParams.current && roads.length > 0) {
      const params = pendingRestoreParams.current;
      pendingRestoreParams.current = null;

      // Small delay to ensure state is settled
      setTimeout(async () => {
        isRestoring.current = false;
        await getWorkZoneInfo(params.region, params.roadId, params.startSlk, params.endSlk, false);
        setIsRestoringUI(false); // Show inputs are hidden by result now
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roads]);

  // Main function to get work zone info - can be called with parameters or from UI
  const getWorkZoneInfo = async (
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

    // Set state variables
    if (region && region !== selectedRegion) {
      updateSelectedRegion(region);
    }
    setSelectedRoad(roadId);
    setStartSlk(startSlkVal);
    setEndSlk(endSlkVal);

    setLoading(true);
    setError('');
    setResult(null);
    setWeather(null);
    setWarnings(null);
    setTraffic(null);
    setUserTrafficCounts([]);
    setUserTrafficOverride(null);
    setPlaces(null);
    setCrossRoads([]);

    // Track if this is a single point lookup (no end SLK provided)
    const singlePoint = !endSlkVal || endSlkVal === '';
    setIsSinglePoint(singlePoint);

    try {
      // Use end_slk if provided, otherwise same as start (single point)
      const endSlkValue = endSlkVal || startSlkVal;
      const startSlkNum = parseFloat(startSlkVal);
      const endSlkNum = parseFloat(endSlkValue);

      let data: any = null;

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
  };

  // Handle search from UI button - uses current state
  const handleSearch = async () => {
    await getWorkZoneInfo(selectedRegion, selectedRoad, startSlk, endSlk, true);
  };

  // Reset work zone info and return to default state
  const handleReset = () => {
    // Clear saved params from sessionStorage
    sessionStorage.removeItem('workZoneParams');
    sessionStorage.removeItem('workZoneState');

    // Reset all state
    setResult(null);
    setWeather(null);
    setWarnings(null);
    setTraffic(null);
    setUserTrafficCounts([]);
    setUserTrafficOverride(null);
    setPlaces(null);
    setCrossRoads([]);
    setError('');
    updateSelectedRegion('');
    setSelectedRoad('');
    setStartSlk('');
    setEndSlk('');
    setSpeedLimit(null);
    setIsSinglePoint(false);
    setGpsRoadInfo(null);
    setSignageCorridor([]);
    setCorridorSpeedZones([]);
    isRestoring.current = false;
    pendingRestoreParams.current = null;
    setIsRestoringUI(false);
  };

  // Look up speed limit for a road at a specific SLK
  const fetchSpeedLimit = async (roadId: string, slk: number) => {
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
  };

  // Fetch signage corridor data for work zone
  const fetchSignageCorridor = async (roadId: string, startSlk: number, endSlk?: number) => {
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
  };

  // Get current GPS location from device
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by this browser');
      return;
    }

    setLoadingGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLat(position.coords.latitude.toFixed(6));
        setGpsLon(position.coords.longitude.toFixed(6));
        setLoadingGps(false);
        // Auto-lookup the location
        lookupGpsLocation(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        setLoadingGps(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError('Location permission denied. Please allow location access.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError('Location information unavailable');
            break;
          case err.TIMEOUT:
            setGpsError('Location request timed out');
            break;
          default:
            setGpsError('An unknown error occurred');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Lookup road info from GPS coordinates
  const lookupGpsLocation = async (lat?: number, lon?: number) => {
    const latitude = lat ?? parseFloat(gpsLat);
    const longitude = lon ?? parseFloat(gpsLon);

    if (isNaN(latitude) || isNaN(longitude)) {
      setGpsError('Please enter valid coordinates');
      return;
    }

    setLoadingGps(true);
    setGpsError('');

    try {
      const response = await fetch(`/api/gps?lat=${latitude}&lon=${longitude}`);
      const data = await response.json();

      if (!response.ok) {
        setGpsError(data.error || 'Location not found');
        setGpsRoadInfo(null);
      } else {
        // Store GPS road info
        setGpsRoadInfo({
          road_id: data.road_id,
          road_name: data.road_name,
          network_type: data.network_type,
          slk: data.slk,
        });

        // Set the road and SLK from GPS lookup
        setSelectedRoad(data.road_id);
        setStartSlk(data.slk.toString());
        setEndSlk(''); // Clear end SLK for single point

        // Set region based on road type and region from GPS response
        if (data.network_type === 'Local Road') {
          updateSelectedRegion('Local');
        } else if (data.region) {
          // Use the region (RA_NAME) returned by the GPS API for State/Regional roads.
          // This ensures the road appears in the correct region's road list.
          updateSelectedRegion(data.region);
        }

        // Clear any previous error
        setGpsError('');
      }
    } catch (err) {
      setGpsError('Failed to lookup location');
      setGpsRoadInfo(null);
    } finally {
      setLoadingGps(false);
    }
  };

  const openGoogleMaps = (url: string | null) => {
    if (url) window.open(url, '_blank');
  };

  const openStreetView = (lat: number, lon: number) => {
    window.open(
      `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
      '_blank'
    );
  };

  const exportReport = async () => {
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
  };

  // Generate work zone report (opens the report modal)
  const generateWorkZoneReport = () => {
    setReportGenerating(true);
    setShowReportModal(true);
    setReportGenerating(false);
  };

  // Get UV level color
  const getUvColor = (level: string): string => {
    switch (level) {
      case 'Low':
        return 'text-green-400';
      case 'Moderate':
        return 'text-yellow-400';
      case 'High':
        return 'text-orange-400';
      case 'Very High':
        return 'text-red-400';
      case 'Extreme':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  // Start SLK tracking with autostart
  const startSlkTracking = () => {
    // Save current params to sessionStorage before navigating (if road is selected)
    if (selectedRoad && startSlk) {
      sessionStorage.setItem(
        'workZoneParams',
        JSON.stringify({
          region: selectedRegion,
          roadId: selectedRoad,
          startSlk: startSlk,
          endSlk: endSlk,
        })
      );
    }

    const params = new URLSearchParams();
    if (selectedRoad) {
      params.set('road_id', selectedRoad);
      params.set('road_name', roadInfo?.road_name || '');
      if (startSlk) params.set('slk', startSlk);
    }
    params.set('autostart', 'true');
    window.location.href = `/drive?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white" role="application">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-1" role="banner">
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg bg-red-600 hover:bg-red-700"
            title="Emergency Location (000)"
            aria-label="Get emergency location for 000 call"
          >
            🆘
          </button>
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold">TC Work Zone Locator</h1>
            <p className="text-xs text-gray-400">
              v{APP_VERSION}{' '}
              {offlineReady && <span className="text-green-400">• Offline Ready</span>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <SettingsDrawer
              variant="home"
              offlineStats={offlineStats}
              downloading={downloading}
              downloadProgress={downloadProgress}
              onDownloadData={handleDownloadOfflineData}
              onClearData={handleClearOfflineData}
              gpsSettings={gpsSettings}
              onUpdateGpsSetting={updateGpsSetting}
              defaultRegion={defaultRegion}
              regions={regions}
              onUpdateRegion={(region) => {
                updateDefaultRegion(region);
              }}
              windGustThreshold={windGustThreshold}
              onUpdateWindGustThreshold={updateWindGustThreshold}
              result={result}
              setDistanceActive={setDistanceActive}
              onStartSetDistance={startSetDistance}
              onOpenTrafficEventLogger={() => setTrafficEventLoggerOpen(true)}
              onExportReport={exportReport}
              exporting={exporting}
              mrwaStatus={mrwaStatus}
              datasetStats={datasetStats}
              syncProgress={syncProgress}
              syncingDatasets={syncingDatasets}
              onSyncAll={syncAllDatasets}
              onSyncDataset={syncDatasetFromMrwa}
              onGenerateDebug={generateDebugInfo}
              offlineToggles={offlineToggles}
              onUpdateOfflineToggle={updateOfflineToggle}
              onResetOfflineToggles={resetOfflineToggles}
              offlineReady={offlineReady}
            />
          </div>
        </header>

        {/* Debug Info Popup */}
        <DebugInfoPopup
          show={showDebug}
          debugInfo={debugInfo}
          onClose={() => setShowDebug(false)}
          onCopyFeedback={setDownloadProgress}
        />

        {/* Quick Start SLK Tracking Button - only show when no results displayed */}
        {!result && !isRestoringUI && (
          <div className="mb-4">
            <Button
              onClick={startSlkTracking}
              className="w-full h-12 text-lg bg-blue-800 hover:bg-blue-900"
            >
              📍 Start SLK Tracking
            </Button>
            <p className="text-xs text-gray-500 text-center mt-1">
              Auto-start GPS tracking for real-time SLK updates
            </p>
          </div>
        )}

        {/* Input sections - hide when results are displayed or during restore */}
        {!result && !isRestoringUI && (
          <WorkZoneForm
            // GPS state
            showGpsDialog={showGpsDialog}
            onToggleGpsDialog={() => setShowGpsDialog(!showGpsDialog)}
            gpsLat={gpsLat}
            onGpsLatChange={setGpsLat}
            gpsLon={gpsLon}
            onGpsLonChange={setGpsLon}
            loadingGps={loadingGps}
            gpsError={gpsError}
            gpsRoadInfo={gpsRoadInfo}
            // GPS actions
            onGetCurrentLocation={getCurrentLocation}
            onLookupGpsLocation={() => lookupGpsLocation()}
            // Region state
            regions={regions}
            selectedRegion={selectedRegion}
            onSelectRegion={updateSelectedRegion}
            loadingRegions={loadingRegions}
            // Road state
            roads={roads}
            selectedRoad={selectedRoad}
            onSelectRoad={setSelectedRoad}
            loadingRoads={loadingRoads}
            roadInfo={roadInfo}
            // SLK state
            startSlk={startSlk}
            onStartSlkChange={setStartSlk}
            endSlk={endSlk}
            onEndSlkChange={setEndSlk}
            // Form actions
            loading={loading}
            onSearch={handleSearch}
            // Save location
            onSaveLocation={handleSaveLocation}
            // Saved locations
            savedLocations={savedLocations}
            sortedSavedLocations={sortedSavedLocations}
            savedLocationsSort={savedLocationsSort}
            onSetSavedLocationsSort={setSavedLocationsSort}
            onRecallLocation={recallLocation}
            onDeleteSavedLocation={handleDeleteSavedLocation}
            // Clear actions
            onClearGpsRoadInfo={() => setGpsRoadInfo(null)}
            onClearForm={() => {
              setSelectedRoad('');
              setStartSlk('');
              setEndSlk('');
            }}
          />
        )}

        {/* Loading indicator during restore */}
        {isRestoringUI && !result && (
          <div className="text-center py-8">
            <p className="text-gray-400">Restoring work zone info...</p>
          </div>
        )}

        {/* Reset Button - show when results are displayed */}
        {result && (
          <Button
            onClick={handleReset}
            className="w-full h-12 text-lg bg-gray-600 hover:bg-gray-500 mb-4"
          >
            🔄 Reset Work Zone Info
          </Button>
        )}

        {/* Error */}
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* Work Zone Summary */}
            <SectionErrorBoundary sectionName="Work Zone Summary">
              <WorkZoneSummary
                result={result}
                isSinglePoint={isSinglePoint}
                onOpenStreetView={openStreetView}
                onOpenGoogleMaps={(url) => openGoogleMaps(url)}
                onStartSlkTracking={startSlkTracking}
              />
            </SectionErrorBoundary>

            {/* Speed Zone Layout Diagram */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => setShowSpeedZoneLayout(!showSpeedZoneLayout)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <h3 className="text-sm font-semibold text-blue-400">
                  📊 Speed Zone Layout (±850m)
                </h3>
                <span className="text-gray-400 text-lg">{showSpeedZoneLayout ? '−' : '+'}</span>
              </button>
              {showSpeedZoneLayout && (
                <div className="px-4 pb-4">
                  <SpeedZoneLayout
                    workZoneStart={result.work_zone.start_slk}
                    workZoneEnd={result.work_zone.end_slk || result.work_zone.start_slk}
                    signageCorridor={signageCorridor}
                    speedZones={corridorSpeedZones}
                    intersections={crossRoads
                      .filter((road) => road.name.toLowerCase() !== result.road_name.toLowerCase())
                      .map((road) => ({
                        name: road.name,
                        slk:
                          road.intersectionSlk ??
                          parseFloat(road.distance) + result.work_zone.start_slk,
                        roadType: road.roadType,
                      }))}
                    corridorMargin={0.85}
                  />
                </div>
              )}
            </div>

            {/* Intersecting Roads */}
            <IntersectionsSection
              crossRoads={crossRoads}
              roadName={result.road_name}
              defaultExpanded={showIntersections}
            />

            {/* Signage Corridor Report */}
            {/* Signage Corridor */}
            <SectionErrorBoundary sectionName="Signage Corridor">
              <SignageCorridorSection
                workZone={result.work_zone}
                signageCorridor={signageCorridor}
                signageLoading={signageLoading}
              />
            </SectionErrorBoundary>

            {/* Traffic Volume */}
            <SectionErrorBoundary sectionName="Traffic Volume">
              <TrafficVolumeSection
                traffic={traffic}
                userTrafficCounts={userTrafficCounts}
                userTrafficOverride={userTrafficOverride}
                selectedRoad={selectedRoad}
                selectedRegion={selectedRegion}
                startSlk={startSlk}
                roadName={result?.road_name || ''}
                tcLengthM={result?.tc_positions?.tc_length_m}
                onSetUserTrafficOverride={setUserTrafficOverride}
                onSelectCountDetail={setSelectedCountDetail}
                defaultExpanded={showTraffic}
              />
            </SectionErrorBoundary>

            {/* Weather with Sun Data */}
            <SectionErrorBoundary sectionName="Weather">
              <WeatherSection
                weather={weather}
                warnings={warnings}
                windGustThreshold={windGustThreshold}
                showWeather={showWeather}
                onToggle={() => setShowWeather(!showWeather)}
                getUvColor={getUvColor}
              />
            </SectionErrorBoundary>

            {/* Road Incidents - Live from WebEOC */}
            <SectionErrorBoundary sectionName="Road Incidents">
              <IncidentsSection
                roadId={result.road_id}
                roadName={result.road_name}
                enabled={true}
              />
            </SectionErrorBoundary>

            {/* Nearby Amenities */}
            <SectionErrorBoundary sectionName="Amenities">
              <AmenitiesSection
                places={places}
                showAmenities={showAmenities}
                onToggle={() => setShowAmenities(!showAmenities)}
                onOpenGoogleMaps={(url) => openGoogleMaps(url)}
                onOpenStreetView={openStreetView}
              />
            </SectionErrorBoundary>

            {/* Generate Report Button */}
            {result && (
              <div className="mt-6 bg-gray-800 rounded-lg p-4">
                <Button
                  onClick={generateWorkZoneReport}
                  disabled={reportGenerating}
                  className="w-full bg-purple-700 hover:bg-purple-600 h-12 text-base font-medium"
                >
                  {reportGenerating ? (
                    <>⏳ Generating Report...</>
                  ) : (
                    <>📋 Generate Work Zone Report</>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Creates a comprehensive report with all work zone information
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportExportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        result={result}
        weather={weather}
        warnings={warnings}
        traffic={traffic}
        places={places}
        crossRoads={crossRoads}
        signageCorridor={signageCorridor}
        corridorIntersections={corridorIntersections}
        userTrafficCounts={userTrafficCounts}
        selectedCountDetail={selectedCountDetail}
        corridorSpeedZones={corridorSpeedZones}
        windGustThreshold={windGustThreshold}
        onOpenStreetView={openStreetView}
        onOpenGoogleMaps={openGoogleMaps}
      />

      {/* Emergency Location Modal */}
      <EmergencyLocationModal
        open={showEmergencyModal}
        onOpenChange={setShowEmergencyModal}
        roadInfo={
          result && result.work_zone.start
            ? {
                roadId: result.road_id,
                roadName: result.road_name,
                slk: result.work_zone.start_slk,
                lat: result.work_zone.start.lat,
                lon: result.work_zone.start.lon,
              }
            : null
        }
      />

      {/* Set Distance Full Screen Modal */}
      <SetDistanceControls
        active={setDistanceActive}
        distance={setDistanceDistance}
        totalDistance={setDistanceTotalDistance}
        marks={setDistanceMarks}
        currentSlk={setDistanceCurrentSlk}
        currentRoad={setDistanceCurrentRoad}
        refPoint={setDistanceRefPoint}
        onStop={stopSetDistance}
        onSetReference={setSetDistanceReference}
        onMark={markSetDistancePosition}
        onReset={resetSetDistance}
      />

      {/* Traffic Count Detail Modal */}
      <TrafficCountDetailModal
        selectedCountDetail={selectedCountDetail}
        onClose={() => setSelectedCountDetail(null)}
        onUseCount={setUserTrafficOverride}
      />

      {/* Traffic Event Logger Modal */}
      <TrafficEventLoggerModal
        open={trafficEventLoggerOpen}
        onOpenChange={setTrafficEventLoggerOpen}
        roadId={selectedRoad}
        roadName={roadInfo?.road_name}
        slk={startSlk}
      />

      {/* First-run Onboarding */}
      <Onboarding />
    </div>
  );
}
