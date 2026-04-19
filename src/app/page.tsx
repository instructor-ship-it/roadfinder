'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { WarningsSection } from '@/components/WarningsSection';
import SpeedZoneLayout from '@/components/SpeedZoneLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { WorkZoneReport } from '@/components/WorkZoneReport';
import { SetDistanceControls } from '@/components/SetDistanceControls';
import { GpsLookupDialog } from '@/components/GpsLookupDialog';
import { ReportExportModal } from '@/components/ReportExportModal';
import {
  calculateMaxHoldTime,
  PREPARE_TO_STOP_DISTANCE_M,
  ADV_QUEUE_WARNING_DISTANCE_M,
} from '@/lib/max-hold-time';
import { getShuttleFlowLength, getLaneCapacity } from '@/lib/traffic-calculations';
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

    // If the region is different, we need to switch regions first
    if (loc.region && loc.region !== currentRegion) {
      updateSelectedRegion(loc.region);
      // The roads will be loaded by the useEffect that watches selectedRegion
      // We need to wait for the roads to load
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Directly call getWorkZoneInfo — fills the form AND loads the work zone
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

  // Helper to get weather from cache (used for offline fallback)
  const getWeatherFromCache = (lat: number, lon: number): WeatherData | null => {
    // Try the utility function first (uses 'weatherCache' key)
    const cachedData = getCachedWeatherData(lat, lon, 24 * 60 * 60 * 1000); // Accept up to 24 hours old
    if (cachedData && cachedData.data) {
      return {
        ...cachedData.data,
        fromCache: true,
        cachedAt: cachedData.cached_at ? new Date(cachedData.cached_at).getTime() : undefined,
      };
    }
    // Fallback to the old cache key for backwards compatibility
    const legacyCached = localStorage.getItem('cachedWeather');
    if (legacyCached) {
      try {
        const cachedData = JSON.parse(legacyCached);
        // Check if location is reasonably close (within 50km)
        if (cachedData.cachedLocation) {
          const dist = haversineDistance(
            lat,
            lon,
            cachedData.cachedLocation.lat,
            cachedData.cachedLocation.lon
          );
          if (dist > 50) return null; // Too far from cached location
        }
        return { ...cachedData, fromCache: true };
      } catch {
        return null;
      }
    }
    return null;
  };

  const fetchWeather = async (lat: number, lon: number) => {
    // Check offline toggle first - ON = offline mode (use cached data only)
    if (offlineToggles.workZoneLookup) {
      // OFFLINE MODE: Use cached data only
      const cachedWeather = getWeatherFromCache(lat, lon);
      if (cachedWeather) {
        setWeather({
          ...cachedWeather,
          source: 'Offline: Cached weather data',
        });
      } else {
        // No cached weather available - show clear indicator
        setWeather({
          location: 'Offline Mode',
          current: {
            temp: 0,
            humidity: 0,
            windSpeed: 0,
            windDir: '',
            windGust: 0,
            condition: 'No cached weather data - download required',
          },
          sun: {
            sunrise: 'N/A',
            sunset: 'N/A',
            daylightHours: 'N/A',
            uvIndex: 0,
            uvLevel: 'N/A',
          },
          forecast: [],
          fromCache: true,
          dataUnavailable: true,
          source: 'Offline: No cached data available',
        });
      }
      return;
    }

    // ONLINE MODE: Fetch from API, fall back to cache
    // Also check navigator.onLine as a safety net
    if (!navigator.onLine) {
      const cachedWeather = getWeatherFromCache(lat, lon);
      if (cachedWeather) {
        setWeather({
          ...cachedWeather,
          source: 'Offline: Cached weather data (browser offline)',
        });
      } else {
        setWeather({
          location: 'Offline Mode',
          current: {
            temp: 0,
            humidity: 0,
            windSpeed: 0,
            windDir: '',
            windGust: 0,
            condition: 'Browser offline - no cached data',
          },
          sun: {
            sunrise: 'N/A',
            sunset: 'N/A',
            daylightHours: 'N/A',
            uvIndex: 0,
            uvLevel: 'N/A',
          },
          forecast: [],
          fromCache: true,
          dataUnavailable: true,
          source: 'Offline: Browser offline, no cached data',
        });
      }
      return;
    }

    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const data = await response.json();
      if (response.ok) {
        // Cache weather data using the utility function
        cacheWeatherData(lat, lon, data, data.location);
        // Also cache in the old format for backwards compatibility
        data.cachedAt = Date.now();
        data.cachedLocation = { lat, lon };
        localStorage.setItem('cachedWeather', JSON.stringify(data));
        setWeather({
          ...data,
          source: 'Online: Open-Meteo API',
        });
      } else {
        // Try cached weather on API failure
        const cachedWeather = getWeatherFromCache(lat, lon);
        if (cachedWeather) {
          setWeather({
            ...cachedWeather,
            source: 'Cached (API unavailable)',
          });
        } else {
          setWeather({
            location: 'API Error',
            current: {
              temp: 0,
              humidity: 0,
              windSpeed: 0,
              windDir: '',
              windGust: 0,
              condition: 'Weather API unavailable - no cached data',
            },
            sun: {
              sunrise: 'N/A',
              sunset: 'N/A',
              daylightHours: 'N/A',
              uvIndex: 0,
              uvLevel: 'N/A',
            },
            forecast: [],
            dataUnavailable: true,
            source: 'Error: API unavailable, no cached data',
          });
        }
      }
    } catch (err) {
      // Try cached weather on network error
      const cachedWeather = getWeatherFromCache(lat, lon);
      if (cachedWeather) {
        setWeather({
          ...cachedWeather,
          source: 'Cached (network error)',
        });
      } else {
        setWeather({
          location: 'Network Error',
          current: {
            temp: 0,
            humidity: 0,
            windSpeed: 0,
            windDir: '',
            windGust: 0,
            condition: 'Network error - no cached data',
          },
          sun: {
            sunrise: 'N/A',
            sunset: 'N/A',
            daylightHours: 'N/A',
            uvIndex: 0,
            uvLevel: 'N/A',
          },
          forecast: [],
          dataUnavailable: true,
          source: 'Error: Network error, no cached data',
        });
      }
    }
  };

  const fetchTraffic = async (roadId: string, lat?: number, lon?: number) => {
    try {
      let url = `/api/traffic?road_id=${roadId}`;
      if (lat && lon) {
        url += `&lat=${lat}&lon=${lon}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        // Cache traffic data
        data.cachedAt = Date.now();
        localStorage.setItem(`traffic_${roadId}`, JSON.stringify(data));
        setTraffic(data);
      } else {
        // Try cached traffic on API failure
        const cached = localStorage.getItem(`traffic_${roadId}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          cachedData.fromCache = true;
          setTraffic(cachedData);
        }
      }
    } catch (err) {
      // Try cached traffic on network error
      const cached = localStorage.getItem(`traffic_${roadId}`);
      if (cached) {
        const cachedData = JSON.parse(cached);
        cachedData.fromCache = true;
        setTraffic(cachedData);
      }
    }
  };

  // Helper to get places from IndexedDB (used for offline fallback)
  const getPlacesFromIndexedDB = async (lat: number, lon: number): Promise<PlacesData | null> => {
    try {
      // Use 100km radius for rural WA (matching the online API behavior)
      const amenities = await findNearestAmenities(lat, lon, undefined, 100);
      if (amenities.hospital || amenities.fuelStation || amenities.toilet) {
        return {
          hospital: amenities.hospital
            ? {
                name: amenities.hospital.name,
                distance: amenities.hospital.distance?.toFixed(1) || '',
                lat: amenities.hospital.lat,
                lon: amenities.hospital.lon,
                phone: amenities.hospital.phone,
                address: amenities.hospital.address,
                googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${amenities.hospital.lat},${amenities.hospital.lon}`,
                isEmergency: amenities.hospital.emergency,
              }
            : null,
          fuelStation: amenities.fuelStation
            ? {
                name: amenities.fuelStation.name,
                distance: amenities.fuelStation.distance?.toFixed(1) || '',
                lat: amenities.fuelStation.lat,
                lon: amenities.fuelStation.lon,
                phone: amenities.fuelStation.phone,
                address: amenities.fuelStation.address,
                googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${amenities.fuelStation.lat},${amenities.fuelStation.lon}`,
                isEmergency: false,
              }
            : null,
          toilet: amenities.toilet
            ? {
                name: amenities.toilet.name,
                distance: amenities.toilet.distance?.toFixed(1) || '',
                lat: amenities.toilet.lat,
                lon: amenities.toilet.lon,
                phone: amenities.toilet.phone,
                address: amenities.toilet.address,
                googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${amenities.toilet.lat},${amenities.toilet.lon}`,
                isEmergency: false,
              }
            : null,
          source: 'Offline: IndexedDB cached data',
          fromCache: true,
        };
      }
    } catch (err) {
      console.log('Could not load amenities from IndexedDB:', err);
    }
    return null;
  };

  const fetchPlaces = async (lat: number, lon: number) => {
    // Helper: return cached data from localStorage or IndexedDB
    const getCachedPlaces = async (): Promise<PlacesData | null> => {
      const indexedDBPlaces = await getPlacesFromIndexedDB(lat, lon);
      if (indexedDBPlaces) return indexedDBPlaces;
      const cached = localStorage.getItem('cachedPlaces');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
      return null;
    };

    const setOfflineUnavailable = () => {
      setPlaces({
        hospital: null,
        toilet: null,
        fuelStation: null,
        fromCache: true,
        dataUnavailable: true,
        source: 'Offline: No cached amenities data - download required',
      });
    };

    // OFFLINE MODE: Use cached data only
    if (offlineToggles.amenities || !navigator.onLine) {
      const cached = await getCachedPlaces();
      if (cached) {
        setPlaces({
          ...cached,
          fromCache: true,
          source: offlineToggles.amenities
            ? 'Offline: Cached data'
            : 'Offline: Cached data (browser offline)',
        });
      } else {
        setOfflineUnavailable();
      }
      return;
    }

    // ONLINE MODE: Fetch from three sources in parallel
    let hospital: Place | null = null;
    let hospitalSource = '';
    let fuelStation: Place | null = null;
    let fuelSource = '';
    let toilet: Place | null = null;
    let toiletSource = '';

    try {
      // 1. Hospital from WA Health SLIP Services
      try {
        const hospRes = await fetch(`/api/nearest-hospital?lat=${lat}&lon=${lon}&radius=100`);
        if (hospRes.ok) {
          const hospData = await hospRes.json();
          const h = hospData.nearestHospital;
          if (h) {
            hospital = {
              name: h.name,
              distance: (h.distanceM / 1000).toFixed(1),
              lat: h.lat,
              lon: h.lon,
              phone: h.phone || undefined,
              address: h.address ? `${h.address}${h.suburb ? `, ${h.suburb}` : ''}` : undefined,
              googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`,
              isEmergency: h.hasED,
              hospitalType: h.type === 'Nursing Post' ? 'Nursing Post' : h.type,
              hospitalCategory: h.category || undefined,
              beds: h.beds || undefined,
              suburb: h.suburb || undefined,
            };
            hospitalSource = 'WA Health SLIP';
          }
        }
      } catch (e) {
        console.log('WA Health SLIP hospital query failed, will try Overpass fallback:', e);
      }

      // 2. Fuel station from FuelWatch WA + Overpass merge
      try {
        const fuelRes = await fetch(`/api/fuel-stations?lat=${lat}&lon=${lon}&radius=100`);
        if (fuelRes.ok) {
          const fuelData = await fuelRes.json();
          const f = fuelData.nearest;
          if (f) {
            fuelStation = {
              name: f.name,
              distance: String(f.distanceKm),
              lat: f.lat,
              lon: f.lon,
              phone: f.phone || undefined,
              address: [f.address, f.location].filter(Boolean).join(', ') || undefined,
              googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lon}`,
              fuelBrand: f.brand || undefined,
              fuelPrice: f.price || undefined,
              fuelDate: f.date || undefined,
              siteFeatures: f.siteFeatures || [],
            };
            fuelSource = f.source === 'OpenStreetMap' ? 'OpenStreetMap' : 'FuelWatch WA';
          }
        }
      } catch (e) {
        console.log('Fuel station query failed:', e);
      }

      // 3. Toilets from National Public Toilet Map (Australian Government data)
      // Falls back to Overpass API if the map service is unavailable
      try {
        const toiletRes = await fetch(`/api/toilets?lat=${lat}&lon=${lon}`);
        if (toiletRes.ok) {
          const toiletData = await toiletRes.json();
          if (toiletData.nearest) {
            const t = toiletData.nearest;
            toilet = {
              name: t.name,
              distance: String(t.distanceKm),
              lat: t.lat,
              lon: t.lon,
              googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}`,
              toiletType: t.facilityType,
              openingHours: t.openingHours || undefined,
              wheelchair: t.accessible || t.wheelchair || false,
              toiletNote: t.toiletNote || undefined,
              toiletUrl: t.url || undefined,
              toiletSource: t.source || 'NationalToiletMap',
            };
            toiletSource =
              t.source === 'NationalToiletMap' ? 'National Toilet Map' : 'OpenStreetMap';
          }
        }
      } catch (e) {
        console.log('Toilet map query failed:', e);
        // Fallback to Overpass via /api/places
        try {
          const placesRes = await fetch(`/api/places?lat=${lat}&lon=${lon}`);
          if (placesRes.ok) {
            const placesData = await placesRes.json();
            if (!toilet && placesData.toilet) {
              toilet = placesData.toilet;
              toiletSource = 'OpenStreetMap (fallback)';
            }
            // Use Overpass as fallback for hospital if SLIP failed
            if (!hospital && placesData.hospital) {
              hospital = placesData.hospital;
              hospitalSource = 'OpenStreetMap';
            }
          }
        } catch (e2) {
          console.log('Overpass toilet fallback failed:', e2);
        }
      }

      // If all three sources failed, try cache
      if (!hospital && !fuelStation && !toilet) {
        const cached = await getCachedPlaces();
        if (cached) {
          setPlaces({ ...cached, source: 'Cached (all APIs unavailable)' });
          return;
        }
        setPlaces({
          hospital: null,
          toilet: null,
          fuelStation: null,
          dataUnavailable: true,
          source: 'Error: All data sources unavailable, no cached data',
        });
        return;
      }

      // Build source string
      const sources: string[] = [];
      if (hospitalSource) sources.push(`Hospital: ${hospitalSource}`);
      if (fuelSource) sources.push(`Fuel: ${fuelSource}`);
      if (toiletSource) sources.push(`Toilet: ${toiletSource}`);

      const result: PlacesData = {
        hospital,
        fuelStation,
        toilet,
        hospitalSource,
        fuelSource,
        cachedAt: Date.now(),
        cachedLocation: { lat, lon },
        source: sources.length > 0 ? `Online: ${sources.join(' | ')}` : 'Online',
      };

      // Cache the result
      localStorage.setItem('cachedPlaces', JSON.stringify(result));
      setPlaces(result);
    } catch (err) {
      // Last resort: cache
      const cached = await getCachedPlaces();
      if (cached) {
        setPlaces({ ...cached, source: 'Cached (error)' });
      } else {
        setPlaces({
          hospital: null,
          toilet: null,
          fuelStation: null,
          dataUnavailable: true,
          source: 'Error: Network error, no cached data',
        });
      }
    }
  };

  const fetchWarnings = async () => {
    try {
      const response = await fetch('/api/warnings');
      const data = await response.json();
      if (response.ok) setWarnings(data);
    } catch (err) {
      // Graceful degradation - warnings not critical
    }
  };

  const fetchCrossRoads = async (result: WorkZoneResult) => {
    try {
      // Fetch intersections for TC zone (±100m) - used in TC POSITIONS section
      const tcResponse = await fetch(
        `/api/intersections?road_id=${result.road_id}&slk_start=${result.work_zone.start_slk}&slk_end=${result.work_zone.end_slk}&range=0.1`
      );
      const tcData = await tcResponse.json();
      if (tcResponse.ok) setCrossRoads(tcData.crossRoads || []);

      // Also fetch intersections for signage corridor (±700m) - used in SIGNAGE CORRIDOR section
      const corridorResponse = await fetch(
        `/api/intersections?road_id=${result.road_id}&slk_start=${result.work_zone.start_slk}&slk_end=${result.work_zone.end_slk}&range=0.7`
      );
      const corridorData = await corridorResponse.json();
      if (corridorResponse.ok) setCorridorIntersections(corridorData.crossRoads || []);
    } catch (err) {
      // Graceful degradation - intersection data not critical for core functionality
      console.warn('[fetchCrossRoads] Failed to fetch intersections:', err);
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

        // Set region based on road type
        if (data.network_type === 'Local Road') {
          updateSelectedRegion('Local');
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
          <>
            {/* GPS Location Section - Collapsible */}
            <GpsLookupDialog
              isOpen={showGpsDialog}
              onToggle={() => setShowGpsDialog(!showGpsDialog)}
              lat={gpsLat}
              onLatChange={setGpsLat}
              lon={gpsLon}
              onLonChange={setGpsLon}
              loading={loadingGps}
              error={gpsError}
              roadInfo={gpsRoadInfo}
              onGetCurrentLocation={getCurrentLocation}
              onLookup={() => lookupGpsLocation()}
            />

            <div className="text-center text-gray-600 text-xs mb-4">— or select manually —</div>

            {/* Region Selection */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Region</label>
              <Select
                value={selectedRegion}
                onValueChange={(value) => {
                  updateSelectedRegion(value);
                  // Clear GPS road info if manually changing region
                  if (value !== 'Local' || !gpsRoadInfo) {
                    setGpsRoadInfo(null);
                    setSelectedRoad('');
                    setStartSlk('');
                    setEndSlk('');
                  }
                }}
                disabled={loadingRegions}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-12 text-base">
                  <SelectValue
                    placeholder={loadingRegions ? 'Loading regions...' : 'Select region'}
                  />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 max-h-64">
                  {/* Local option at top */}
                  <SelectItem value="Local" className="text-amber-400 focus:bg-gray-700 py-3">
                    📍 Local Roads
                  </SelectItem>
                  {regions.map((region) => (
                    <SelectItem
                      key={region}
                      value={region}
                      className="text-white focus:bg-gray-700 py-3"
                    >
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Road Selection - different behavior for Local */}
            {selectedRegion === 'Local' ? (
              // Local road - allow manual entry
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Road ID</label>
                {gpsRoadInfo ? (
                  // GPS found a local road
                  <div className="bg-gray-800 border border-green-600 rounded-lg p-3">
                    <p className="font-mono text-green-400 text-lg">{gpsRoadInfo.road_id}</p>
                    <p className="text-sm text-gray-300">{gpsRoadInfo.road_name}</p>
                    <p className="text-xs text-gray-500 mt-1">📍 Found via GPS lookup</p>
                  </div>
                ) : (
                  // Manual entry for local road
                  <div>
                    <Input
                      type="text"
                      placeholder="Enter local road ID"
                      value={selectedRoad}
                      onChange={(e) => setSelectedRoad(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white h-12 text-base font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter local road ID manually or use GPS lookup above
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // State road - normal dropdown
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Road ID</label>
                <Select
                  value={selectedRoad}
                  onValueChange={setSelectedRoad}
                  disabled={loadingRoads}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-12 text-base">
                    <SelectValue placeholder={loadingRoads ? 'Loading...' : 'Select road'} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 max-h-64">
                    {roads.map((road) => (
                      <SelectItem
                        key={road.road_id}
                        value={road.road_id}
                        className="text-white focus:bg-gray-700 py-3"
                      >
                        <span className="font-mono text-blue-400">{road.road_id}</span>
                        <span className="ml-2">{road.road_name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {roadInfo && (
                  <p className="text-xs text-gray-500 mt-1">
                    Valid SLK: {roadInfo.min_slk.toFixed(1)} – {roadInfo.max_slk.toFixed(1)} km
                  </p>
                )}
              </div>
            )}

            {/* SLK Inputs */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start SLK (km)</label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="e.g. 100.0"
                  value={startSlk}
                  onChange={(e) => setStartSlk(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white h-12 text-base"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End SLK (km)</label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="e.g. 100.5"
                  value={endSlk}
                  onChange={(e) => setEndSlk(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white h-12 text-base"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Leave End SLK blank for single point lookup
            </p>

            <Button
              onClick={handleSearch}
              disabled={loading || !selectedRoad}
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Searching...' : 'Get Work Zone Info'}
            </Button>

            {/* Save Location Button */}
            {selectedRoad && startSlk && (
              <Button
                onClick={() => {
                  const name = prompt(
                    'Enter a name for this location (optional):',
                    `${selectedRoad} @ ${startSlk}`
                  );
                  if (name !== null) {
                    handleSaveLocation(name);
                  }
                }}
                className="w-full h-10 text-sm bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                💾 Save Location
              </Button>
            )}

            {/* Saved Locations */}
            {savedLocations.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-3 mt-4 overflow-hidden">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <h4 className="text-sm font-semibold text-purple-400">
                    📌 Saved Locations ({savedLocations.length})
                  </h4>
                  <div className="flex gap-1 items-center">
                    <Link
                      href="/saved-locations/map"
                      className="px-2 py-0.5 text-xs rounded bg-gray-700 text-cyan-400 hover:bg-gray-600 transition-colors"
                      title="View all on map"
                    >
                      🗺️ Map
                    </Link>
                    <button
                      onClick={() => setSavedLocationsSort('date')}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        savedLocationsSort === 'date'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                      title="Sort by date"
                    >
                      📅 Date
                    </button>
                    <button
                      onClick={() => setSavedLocationsSort('road')}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        savedLocationsSort === 'road'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:text-white'
                      }`}
                      title="Sort by road ID then SLK"
                    >
                      🛣️ Road
                    </button>
                  </div>
                </div>
                <div
                  className="space-y-2 max-h-48 overflow-y-auto overscroll-contain pr-1"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {sortedSavedLocations.map((loc) => {
                    // Format the saved date
                    const savedDate = loc.created_at ? new Date(loc.created_at) : null;
                    const dateStr = savedDate
                      ? savedDate.toLocaleDateString('en-AU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })
                      : '';
                    const timeStr = savedDate
                      ? savedDate.toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={loc.id}
                        className="flex items-center gap-2 bg-gray-700 rounded p-2 hover:bg-gray-600/50 transition-colors shrink-0"
                      >
                        <button
                          onClick={() => recallLocation(loc)}
                          className="flex-1 text-left px-2 py-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-green-400 text-sm font-semibold">
                              {loc.road_id}
                            </span>
                            <span className="text-xs text-gray-500">
                              SLK {loc.start_slk}
                              {loc.end_slk ? ` - ${loc.end_slk}` : ''}
                            </span>
                          </div>
                          {loc.road_name && (
                            <div className="text-xs text-gray-400 truncate mt-0.5">
                              {loc.road_name}
                            </div>
                          )}
                          <div className="text-xs text-gray-300 truncate">{loc.name}</div>
                          {savedDate && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              📅 {dateStr} at {timeStr}
                            </div>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteSavedLocation(loc.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded text-lg shrink-0"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
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
            <WorkZoneSummary
              result={result}
              isSinglePoint={isSinglePoint}
              onOpenStreetView={openStreetView}
              onOpenGoogleMaps={(url) => openGoogleMaps(url)}
              onStartSlkTracking={startSlkTracking}
            />

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
            {crossRoads.filter((road) => road.name.toLowerCase() !== result.road_name.toLowerCase())
              .length > 0 && (
              <div className="bg-gray-800 rounded-lg">
                <button
                  onClick={() => setShowIntersections(!showIntersections)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-blue-400">
                    🔀 Intersecting Roads in TC Zone
                  </h3>
                  <span className="text-gray-400 text-lg">{showIntersections ? '−' : '+'}</span>
                </button>
                {showIntersections && (
                  <div className="px-4 pb-4">
                    <div className="space-y-2 text-sm">
                      {crossRoads
                        .filter(
                          (road) => road.name.toLowerCase() !== result.road_name.toLowerCase()
                        )
                        .map((road, i) => {
                          // Intersection colors matching SpeedZoneLayout
                          const intColors = [
                            '#a855f7',
                            '#ec4899',
                            '#14b8a6',
                            '#f97316',
                            '#06b6d4',
                            '#84cc16',
                            '#ef4444',
                            '#8b5cf6',
                          ];
                          const color = intColors[i % intColors.length];
                          return (
                            <div
                              key={i}
                              className="flex justify-between items-center py-1 border-b border-gray-700/50"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {/* Colored vertical line indicator */}
                                <span
                                  className="w-0.5 h-8 border-l-2 rounded-sm"
                                  style={{ borderLeftColor: color }}
                                ></span>
                                <div>
                                  <span className="font-medium">{road.name}</span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({road.roadType})
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-400">{road.distance} km</span>
                                <span className="text-xs text-gray-500 block">from TC start</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    <p className="text-xs text-amber-400 mt-3">
                      ⚠️ Consider TC coverage for these intersecting roads
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Signage Corridor Report */}
            {/* Signage Corridor */}
            <SignageCorridorSection
              workZone={result.work_zone}
              signageCorridor={signageCorridor}
              signageLoading={signageLoading}
            />

            {/* Traffic Volume */}
            {traffic &&
              (() => {
                // Determine if traffic data has real values (API always returns object, may have null values)
                const hasRealTrafficData = traffic && (traffic.aadt || traffic.peak_hour_volume);

                // Build the "Count Traffic" button URL with pre-filled params
                const countTrafficUrl = selectedRoad
                  ? `/traffic-counter?road_id=${selectedRoad}&road_name=${encodeURIComponent(result?.road_name || '')}&slk=${startSlk}&region=${encodeURIComponent(selectedRegion)}`
                  : '/traffic-counter';

                return (
                  <div className="bg-gray-800 rounded-lg">
                    <button
                      onClick={() => setShowTraffic(!showTraffic)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <h3 className="text-sm font-semibold text-blue-400">
                        🚗 Traffic Volume
                        {traffic.fromCache && (
                          <span className="ml-2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
                            Cached{' '}
                            {traffic.cachedAt
                              ? new Date(traffic.cachedAt).toLocaleTimeString()
                              : ''}
                          </span>
                        )}
                      </h3>
                      <span className="text-gray-400 text-lg">{showTraffic ? '−' : '+'}</span>
                    </button>
                    {showTraffic && (
                      <div className="px-4 pb-4">
                        {!hasRealTrafficData && userTrafficCounts.length === 0 ? (
                          /* STATE 3: No data at all */
                          <div className="text-center py-4">
                            <p className="text-gray-400 text-sm mb-1">No traffic data available</p>
                            <p className="text-gray-500 text-xs mb-3">
                              {traffic.source || 'No MRWA data for this road'}
                            </p>
                            <Link href={countTrafficUrl}>
                              <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                                📊 Count Traffic
                              </Button>
                            </Link>
                          </div>
                        ) : !hasRealTrafficData && userTrafficCounts.length > 0 ? (
                          /* STATE 2: No MRWA data, user counts exist — user counts as primary with full calculations */
                          (() => {
                            const primaryCount = userTrafficCounts[0]; // Closest match (already sorted)
                            const vphOneDir = primaryCount.vph_one_direction || 0;
                            const vphBothDir =
                              primaryCount.direction_mode === 'both-ways'
                                ? primaryCount.vph_combined || vphOneDir * 2
                                : vphOneDir * 2;
                            const heavyPct = primaryCount.heavy_percentage || 0;
                            const reductionFactor = heavyPct > 10 ? 0.8 : 1;
                            const reducedVph = Math.round(vphBothDir * reductionFactor);

                            return (
                              <>
                                {/* User count header */}
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    User Counted
                                  </span>
                                  <button
                                    className="text-xs text-gray-400 hover:text-white transition-colors"
                                    onClick={() => setSelectedCountDetail(primaryCount)}
                                  >
                                    {new Date(primaryCount.date).toLocaleDateString('en-AU')} •{' '}
                                    {primaryCount.duration_minutes}min
                                    {primaryCount.slk && startSlk
                                      ? ` • SLK ${primaryCount.slk.toFixed(2)}`
                                      : ''}
                                  </button>
                                  <Link href={countTrafficUrl} className="ml-auto">
                                    <Button className="text-xs h-6 px-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300">
                                      📊 New Count
                                    </Button>
                                  </Link>
                                </div>

                                {/* Traffic stats from user count */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-400">Combined VPH</p>
                                    <p className="font-medium text-lg">{vphBothDir}</p>
                                    <p className="text-xs text-gray-500">
                                      {primaryCount.direction_mode === 'both-ways'
                                        ? 'both directions'
                                        : 'one direction'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Heavy Vehicles</p>
                                    <p className="font-medium text-lg">{heavyPct.toFixed(1)}%</p>
                                    <p className="text-xs text-gray-500">
                                      {primaryCount.total_heavy}/{primaryCount.total_vehicles}{' '}
                                      counted
                                    </p>
                                  </div>
                                  {primaryCount.direction_mode === 'both-ways' && (
                                    <>
                                      <div>
                                        <p className="text-gray-400">True Left</p>
                                        <p className="font-medium text-lg">
                                          {primaryCount.vph_true_left} VPH
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {primaryCount.true_left_light +
                                            primaryCount.true_left_heavy}{' '}
                                          vehicles
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400">True Right</p>
                                        <p className="font-medium text-lg">
                                          {primaryCount.vph_true_right} VPH
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {primaryCount.true_right_light +
                                            primaryCount.true_right_heavy}{' '}
                                          vehicles
                                        </p>
                                      </div>
                                    </>
                                  )}
                                  <div>
                                    <p className="text-gray-400">Worst Dir VPH</p>
                                    <p className="font-medium text-lg">{vphOneDir}</p>
                                    <p className="text-xs text-gray-500">
                                      {primaryCount.total_vehicles} vehicles in{' '}
                                      {primaryCount.duration_minutes}min
                                    </p>
                                  </div>
                                </div>

                                {/* Calculated Values, Shuttle Flow, Max Hold Time — same as MRWA */}
                                {(() => {
                                  const shuttleFlow = getShuttleFlowLength(reducedVph);
                                  const laneCapacity = getLaneCapacity(
                                    Math.round(vphOneDir * reductionFactor)
                                  );
                                  const maxHold = calculateMaxHoldTime(vphOneDir, heavyPct);
                                  const tcLengthM = result?.tc_positions?.tc_length_m;

                                  return (
                                    <>
                                      {/* Calculated Values */}
                                      {vphBothDir > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-700">
                                          <h4 className="text-xs font-semibold text-green-400 mb-2">
                                            📊 Calculated Values
                                          </h4>
                                          <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="bg-gray-900 rounded p-2">
                                              <p className="text-gray-400 text-xs">
                                                Est. VPH (both dir)
                                              </p>
                                              <p className="font-medium text-white">
                                                {vphBothDir.toLocaleString()}
                                              </p>
                                              {heavyPct > 10 && (
                                                <p className="text-xs text-amber-400">
                                                  → {reducedVph.toLocaleString()} (reduced)
                                                </p>
                                              )}
                                            </div>
                                            <div className="bg-gray-900 rounded p-2">
                                              <p className="text-gray-400 text-xs">Lane Capacity</p>
                                              <p className="font-medium text-white">
                                                {laneCapacity}
                                              </p>
                                              <p className="text-xs text-gray-500">one direction</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Shuttle Flow */}
                                      {vphBothDir > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-700">
                                          <h4 className="text-xs font-semibold text-purple-400 mb-2">
                                            🚦 Shuttle Flow Max Length
                                          </h4>
                                          <div className="bg-gray-900 rounded p-3">
                                            <div className="flex items-center justify-between">
                                              <span className="text-gray-300">
                                                Max single lane section:
                                              </span>
                                              <span
                                                className={`font-bold text-lg ${shuttleFlow.risk ? 'text-amber-400' : 'text-green-400'}`}
                                              >
                                                {shuttleFlow.length}
                                              </span>
                                            </div>
                                            {shuttleFlow.risk && (
                                              <p className="text-xs text-amber-400 mt-1">
                                                ⚠️ Exceeds AGTTM limits — risk assessment required
                                                to the satisfaction of the relevant road authority
                                                (MRWA COP Section 6.8.7)
                                              </p>
                                            )}
                                            {heavyPct > 10 && (
                                              <p className="text-xs text-amber-400 mt-1">
                                                ⚠️ Heavy vehicles &gt;10%: 20% volume reduction
                                                applied
                                              </p>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2">
                                              Based on {reducedVph.toLocaleString()} VPH (both
                                              directions)
                                            </p>
                                          </div>

                                          <details className="mt-2">
                                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                                              📖 Reference Table (AGTTM Part 2, Table 3.5 & MRWA COP
                                              Table 15)
                                            </summary>
                                            <div className="mt-2 text-xs bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
                                              <table className="w-full">
                                                <thead className="text-gray-400">
                                                  <tr>
                                                    <th className="text-left pr-2">
                                                      VPH (both dir)
                                                    </th>
                                                    <th className="text-left">Max Length</th>
                                                    <th className="text-left">Source</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="text-gray-300">
                                                  <tr
                                                    className={
                                                      reducedVph >= 701 ? 'bg-blue-900/30' : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">701-800</td>
                                                    <td>70m</td>
                                                    <td className="text-gray-500">AGTTM</td>
                                                  </tr>
                                                  <tr
                                                    className={
                                                      reducedVph >= 601 && reducedVph <= 700
                                                        ? 'bg-blue-900/30'
                                                        : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">601-700</td>
                                                    <td>100m</td>
                                                    <td className="text-gray-500">AGTTM</td>
                                                  </tr>
                                                  <tr
                                                    className={
                                                      reducedVph >= 501 && reducedVph <= 600
                                                        ? 'bg-blue-900/30'
                                                        : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">501-600</td>
                                                    <td>150m</td>
                                                    <td className="text-gray-500">AGTTM</td>
                                                  </tr>
                                                  <tr
                                                    className={
                                                      reducedVph >= 401 && reducedVph <= 500
                                                        ? 'bg-blue-900/30'
                                                        : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">401-500</td>
                                                    <td>250m</td>
                                                    <td className="text-gray-500">AGTTM</td>
                                                  </tr>
                                                  <tr
                                                    className={
                                                      reducedVph >= 351 && reducedVph <= 400
                                                        ? 'bg-blue-900/30'
                                                        : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">351-400</td>
                                                    <td>400m</td>
                                                    <td className="text-gray-500">AGTTM</td>
                                                  </tr>
                                                  <tr
                                                    className={
                                                      reducedVph >= 301 && reducedVph <= 350
                                                        ? 'bg-blue-900/30'
                                                        : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">301-350</td>
                                                    <td>600m</td>
                                                    <td className="text-gray-500">AGTTM</td>
                                                  </tr>
                                                  <tr
                                                    className={
                                                      reducedVph >= 251 && reducedVph <= 300
                                                        ? 'bg-blue-900/30'
                                                        : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">≤300</td>
                                                    <td>800m</td>
                                                    <td className="text-gray-500">AGTTM</td>
                                                  </tr>
                                                  <tr
                                                    className={
                                                      reducedVph >= 201 && reducedVph <= 250
                                                        ? 'bg-blue-900/30'
                                                        : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">201-250</td>
                                                    <td>1200m</td>
                                                    <td className="text-amber-500">MRWA COP</td>
                                                  </tr>
                                                  <tr
                                                    className={
                                                      reducedVph >= 151 && reducedVph <= 200
                                                        ? 'bg-blue-900/30'
                                                        : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">151-200</td>
                                                    <td>1600m</td>
                                                    <td className="text-amber-500">MRWA COP</td>
                                                  </tr>
                                                  <tr
                                                    className={
                                                      reducedVph < 151 ? 'bg-blue-900/30' : ''
                                                    }
                                                  >
                                                    <td className="pr-2 py-0.5">≤150</td>
                                                    <td>2200m</td>
                                                    <td className="text-amber-500">MRWA COP</td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                              <p className="text-gray-500 mt-1">
                                                MRWA COP rows exceed AGTTM limits — risk assessment
                                                required to the satisfaction of the relevant road
                                                authority
                                              </p>
                                            </div>
                                          </details>
                                        </div>
                                      )}

                                      {/* Maximum Hold Time */}
                                      {maxHold && (
                                        <div className="mt-3 pt-3 border-t border-gray-700">
                                          <div className="bg-orange-900/20 border border-orange-700/50 rounded p-3">
                                            <h4 className="text-sm font-medium text-orange-400 mb-2">
                                              ⏱️ Maximum Hold Time
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                                              <div>
                                                <p className="text-gray-400 text-xs">Max Hold</p>
                                                <p className="text-xl font-bold text-orange-300">
                                                  {maxHold.maxHoldTimeMinutes} min
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-gray-400 text-xs">
                                                  Recommended Stop
                                                </p>
                                                <p
                                                  className={`text-xl font-bold ${maxHold.belowMinimum ? 'text-red-400' : 'text-white'}`}
                                                >
                                                  {maxHold.recommendedStopMinutes} min
                                                  {maxHold.belowMinimum && (
                                                    <span className="text-xs font-normal ml-1">
                                                      ⚠️ exceeds max
                                                    </span>
                                                  )}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-gray-400 text-xs">
                                                  Queue Growth
                                                </p>
                                                <p className="font-medium text-gray-200">
                                                  {maxHold.queueGrowthRate} m/min
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-gray-400 text-xs">
                                                  Queue @ {maxHold.recommendedStopMinutes}min
                                                </p>
                                                <p className="font-medium text-gray-200">
                                                  {maxHold.queueAtRecommendedStop}m
                                                </p>
                                              </div>
                                            </div>
                                            {tcLengthM && tcLengthM > 0 && (
                                              <div className="bg-gray-900/50 rounded p-2 mb-2">
                                                <p className="text-xs text-gray-400">
                                                  📏 TC zone length:{' '}
                                                  <span className="text-white font-semibold">
                                                    {tcLengthM}m
                                                  </span>
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                  Clearance time:{' '}
                                                  <span className="text-white font-semibold">
                                                    ~{Math.round((tcLengthM / 40) * 3.6)}s
                                                  </span>
                                                </p>
                                              </div>
                                            )}
                                            {maxHold.queueAtRecommendedStop >
                                              PREPARE_TO_STOP_DISTANCE_M && (
                                              <div className="bg-red-900/30 border border-red-700 rounded p-2 mb-2">
                                                <p className="text-xs text-red-400">
                                                  ⚠️ Queue at {maxHold.recommendedStopMinutes}min
                                                  stop ({maxHold.queueAtRecommendedStop}m) exceeds
                                                  Prepare to Stop distance (
                                                  {PREPARE_TO_STOP_DISTANCE_M}m)
                                                </p>
                                              </div>
                                            )}
                                            <p className="text-xs text-gray-500">
                                              Based on user count {vphOneDir} VPH/direction,{' '}
                                              {heavyPct.toFixed(1)}% heavy. Sign distances: Prepare
                                              to Stop {PREPARE_TO_STOP_DISTANCE_M}m, Adv Queue
                                              Warning {ADV_QUEUE_WARNING_DISTANCE_M}m.
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Other user counts (small list) */}
                                {userTrafficCounts.length > 1 && (
                                  <div className="mt-3 pt-3 border-t border-gray-700">
                                    <p className="text-xs text-gray-400 mb-2">
                                      Other counts ({userTrafficCounts.length - 1} more):
                                    </p>
                                    <div className="text-xs space-y-1">
                                      {userTrafficCounts.slice(1, 4).map((record) => (
                                        <div
                                          key={record.id}
                                          className="flex justify-between text-gray-300 cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors"
                                          onClick={() => setSelectedCountDetail(record)}
                                        >
                                          <span>
                                            {record.vph_one_direction} VPH •{' '}
                                            {record.heavy_percentage}% heavy •{' '}
                                            {record.duration_minutes}min
                                          </span>
                                          <span className="text-gray-500">
                                            {new Date(record.date).toLocaleDateString('en-AU')}
                                            {record.slk && startSlk
                                              ? ` • ${Math.abs(record.slk - parseFloat(startSlk)) < 0.05 ? 'at work zone' : `${Math.abs(record.slk - parseFloat(startSlk)).toFixed(1)} km`}`
                                              : ''}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <p className="text-xs text-gray-500 mt-2">
                                  Source: User counted data (no MRWA data available)
                                </p>
                              </>
                            );
                          })()
                        ) : (
                          /* STATE 1: Has real MRWA traffic data — show existing content */
                          <div>
                            {/* Raw Traffic Data */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-400">AADT</p>
                                <p className="font-medium text-lg">
                                  {traffic.aadt?.toLocaleString() || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-500">vehicles/day</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Peak Hour (est.)</p>
                                <p className="font-medium text-lg">
                                  {traffic.peak_hour_volume || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-500">vehicles/hour (both dir)</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Heavy Vehicles</p>
                                <p className="font-medium text-lg">
                                  {traffic.heavy_vehicle_percent}%
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400">Data Year</p>
                                <p className="font-medium text-lg">{traffic.aadt_year}</p>
                              </div>
                            </div>

                            {/* Calculated Values */}
                            {(() => {
                              // Base values from MRWA data
                              let peakHourBothDir = traffic.peak_hour_volume || 0;
                              let peakHourOneDir = Math.round(peakHourBothDir / 2);
                              const estimatedPeakFromAadt = traffic.aadt
                                ? Math.round(traffic.aadt * 0.1)
                                : 0;
                              let vphBothDir = peakHourBothDir || estimatedPeakFromAadt;
                              let vphOneDir = peakHourOneDir || Math.round(vphBothDir / 2);
                              let heavyPct = traffic.heavy_vehicle_percent || 0;
                              let overrideActive = false;

                              // Apply user traffic override if active
                              if (userTrafficOverride) {
                                const ov = userTrafficOverride;
                                const ovOneDir = ov.vph_one_direction || 0;
                                const ovBothDir =
                                  ov.direction_mode === 'both-ways'
                                    ? ov.vph_combined || ovOneDir * 2
                                    : ovOneDir * 2;
                                vphBothDir = ovBothDir;
                                vphOneDir = ovOneDir;
                                heavyPct = ov.heavy_percentage || 0;
                                overrideActive = true;
                              }

                              const reductionFactor = heavyPct > 10 ? 0.8 : 1;
                              const reducedVph = Math.round(vphBothDir * reductionFactor);
                              const shuttleFlow = getShuttleFlowLength(reducedVph);
                              const laneCapacity = getLaneCapacity(
                                Math.round(vphOneDir * reductionFactor)
                              );

                              return (
                                <>
                                  {/* Override banner */}
                                  {overrideActive && (
                                    <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-2 mb-3 flex items-center justify-between">
                                      <div>
                                        <p className="text-xs text-blue-400 font-semibold">
                                          📊 Using live count data
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {vphBothDir} VPH • {heavyPct}% heavy •{' '}
                                          {userTrafficOverride?.duration_minutes}min count
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => setUserTrafficOverride(null)}
                                        className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                                      >
                                        Revert
                                      </button>
                                    </div>
                                  )}
                                  {vphBothDir > 0 && (
                                    <div className="mt-4 pt-3 border-t border-gray-700">
                                      <h4 className="text-xs font-semibold text-green-400 mb-2">
                                        📊 Calculated Values
                                      </h4>
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-gray-900 rounded p-2">
                                          <p className="text-gray-400 text-xs">
                                            Est. VPH (both dir)
                                          </p>
                                          <p className="font-medium text-white">
                                            {vphBothDir.toLocaleString()}
                                          </p>
                                          {heavyPct > 10 && (
                                            <p className="text-xs text-amber-400">
                                              → {reducedVph.toLocaleString()} (reduced)
                                            </p>
                                          )}
                                        </div>
                                        <div className="bg-gray-900 rounded p-2">
                                          <p className="text-gray-400 text-xs">Lane Capacity</p>
                                          <p className="font-medium text-white">{laneCapacity}</p>
                                          <p className="text-xs text-gray-500">one direction</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Shuttle Flow Guide */}
                                  {vphBothDir > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-700">
                                      <h4 className="text-xs font-semibold text-purple-400 mb-2">
                                        🚦 Shuttle Flow Max Length
                                      </h4>
                                      <div className="bg-gray-900 rounded p-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-gray-300">
                                            Max single lane section:
                                          </span>
                                          <span
                                            className={`font-bold text-lg ${shuttleFlow.risk ? 'text-amber-400' : 'text-green-400'}`}
                                          >
                                            {shuttleFlow.length}
                                          </span>
                                        </div>
                                        {shuttleFlow.risk && (
                                          <p className="text-xs text-amber-400 mt-1">
                                            ⚠️ Exceeds AGTTM limits — risk assessment required to
                                            the satisfaction of the relevant road authority (MRWA
                                            COP Section 6.8.7)
                                          </p>
                                        )}
                                        {heavyPct > 10 && (
                                          <p className="text-xs text-amber-400 mt-1">
                                            ⚠️ Heavy vehicles &gt;10%: 20% volume reduction applied
                                          </p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">
                                          Based on {reducedVph.toLocaleString()} VPH (both
                                          directions)
                                        </p>
                                      </div>

                                      {/* Quick Reference */}
                                      <details className="mt-2">
                                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                                          📖 Reference Table (AGTTM Part 2, Table 3.5 & MRWA COP
                                          Table 15)
                                        </summary>
                                        <div className="mt-2 text-xs bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
                                          <table className="w-full">
                                            <thead className="text-gray-400">
                                              <tr>
                                                <th className="text-left pr-2">VPH (both dir)</th>
                                                <th className="text-left">Max Length</th>
                                                <th className="text-left">Source</th>
                                              </tr>
                                            </thead>
                                            <tbody className="text-gray-300">
                                              <tr
                                                className={
                                                  reducedVph >= 701 ? 'bg-blue-900/30' : ''
                                                }
                                              >
                                                <td className="pr-2 py-0.5">701-800</td>
                                                <td>70m</td>
                                                <td className="text-gray-500">AGTTM</td>
                                              </tr>
                                              <tr
                                                className={
                                                  reducedVph >= 601 && reducedVph <= 700
                                                    ? 'bg-blue-900/30'
                                                    : ''
                                                }
                                              >
                                                <td className="pr-2 py-0.5">601-700</td>
                                                <td>100m</td>
                                                <td className="text-gray-500">AGTTM</td>
                                              </tr>
                                              <tr
                                                className={
                                                  reducedVph >= 501 && reducedVph <= 600
                                                    ? 'bg-blue-900/30'
                                                    : ''
                                                }
                                              >
                                                <td className="pr-2 py-0.5">501-600</td>
                                                <td>150m</td>
                                                <td className="text-gray-500">AGTTM</td>
                                              </tr>
                                              <tr
                                                className={
                                                  reducedVph >= 401 && reducedVph <= 500
                                                    ? 'bg-blue-900/30'
                                                    : ''
                                                }
                                              >
                                                <td className="pr-2 py-0.5">401-500</td>
                                                <td>250m</td>
                                                <td className="text-gray-500">AGTTM</td>
                                              </tr>
                                              <tr
                                                className={
                                                  reducedVph >= 351 && reducedVph <= 400
                                                    ? 'bg-blue-900/30'
                                                    : ''
                                                }
                                              >
                                                <td className="pr-2 py-0.5">351-400</td>
                                                <td>400m</td>
                                                <td className="text-gray-500">AGTTM</td>
                                              </tr>
                                              <tr
                                                className={
                                                  reducedVph >= 301 && reducedVph <= 350
                                                    ? 'bg-blue-900/30'
                                                    : ''
                                                }
                                              >
                                                <td className="pr-2 py-0.5">301-350</td>
                                                <td>600m</td>
                                                <td className="text-gray-500">AGTTM</td>
                                              </tr>
                                              <tr
                                                className={
                                                  reducedVph >= 251 && reducedVph <= 300
                                                    ? 'bg-blue-900/30'
                                                    : ''
                                                }
                                              >
                                                <td className="pr-2 py-0.5">≤300</td>
                                                <td>800m</td>
                                                <td className="text-gray-500">AGTTM</td>
                                              </tr>
                                              <tr
                                                className={
                                                  reducedVph >= 201 && reducedVph <= 250
                                                    ? 'bg-blue-900/30'
                                                    : ''
                                                }
                                              >
                                                <td className="pr-2 py-0.5">201-250</td>
                                                <td>1200m</td>
                                                <td className="text-amber-500">MRWA COP</td>
                                              </tr>
                                              <tr
                                                className={
                                                  reducedVph >= 151 && reducedVph <= 200
                                                    ? 'bg-blue-900/30'
                                                    : ''
                                                }
                                              >
                                                <td className="pr-2 py-0.5">151-200</td>
                                                <td>1600m</td>
                                                <td className="text-amber-500">MRWA COP</td>
                                              </tr>
                                              <tr
                                                className={reducedVph < 151 ? 'bg-blue-900/30' : ''}
                                              >
                                                <td className="pr-2 py-0.5">≤150</td>
                                                <td>2200m</td>
                                                <td className="text-amber-500">MRWA COP</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                          <p className="text-gray-500 mt-1">
                                            MRWA COP rows exceed AGTTM limits — risk assessment
                                            required to the satisfaction of the relevant road
                                            authority
                                          </p>
                                        </div>
                                      </details>
                                    </div>
                                  )}

                                  {/* Maximum Hold Time */}
                                  {(() => {
                                    let peakVphWeekday =
                                      traffic.peak_hour_volume_weekday ||
                                      traffic.peak_hour_volume ||
                                      0;
                                    let heavyPctWeekday =
                                      traffic.heavy_vehicle_weekday_pct ||
                                      traffic.heavy_vehicle_percent ||
                                      0;
                                    let vphOneDirWeekday = peakVphWeekday
                                      ? Math.round(peakVphWeekday / 2)
                                      : vphOneDir;

                                    // Override with user count values if active
                                    if (userTrafficOverride) {
                                      vphOneDirWeekday = userTrafficOverride.vph_one_direction || 0;
                                      heavyPctWeekday = userTrafficOverride.heavy_percentage || 0;
                                    }

                                    const maxHold = calculateMaxHoldTime(
                                      vphOneDirWeekday,
                                      heavyPctWeekday
                                    );
                                    const tcLengthM = result?.tc_positions?.tc_length_m;

                                    if (!maxHold) return null;

                                    return (
                                      <div className="mt-3 pt-3 border-t border-gray-700">
                                        <div className="bg-orange-900/20 border border-orange-700/50 rounded p-3">
                                          <h4 className="text-sm font-medium text-orange-400 mb-2">
                                            ⏱️ Maximum Hold Time
                                          </h4>
                                          <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                                            <div>
                                              <p className="text-gray-400 text-xs">Max Hold</p>
                                              <p className="text-xl font-bold text-orange-300">
                                                {maxHold.maxHoldTimeMinutes} min
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-gray-400 text-xs">
                                                Recommended Stop
                                              </p>
                                              <p
                                                className={`text-xl font-bold ${maxHold.belowMinimum ? 'text-red-400' : 'text-white'}`}
                                              >
                                                {maxHold.recommendedStopMinutes} min
                                                {maxHold.belowMinimum && (
                                                  <span className="text-xs font-normal ml-1">
                                                    ⚠️ exceeds max
                                                  </span>
                                                )}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-gray-400 text-xs">Queue Growth</p>
                                              <p className="font-medium text-gray-200">
                                                {maxHold.queueGrowthRate} m/min
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-gray-400 text-xs">
                                                Queue @ {maxHold.recommendedStopMinutes}min
                                              </p>
                                              <p className="font-medium text-gray-200">
                                                {maxHold.queueAtRecommendedStop}m
                                              </p>
                                            </div>
                                          </div>
                                          {tcLengthM && tcLengthM > 0 && (
                                            <div className="bg-gray-900/50 rounded p-2 mb-2">
                                              <p className="text-xs text-gray-400">
                                                📏 TC zone length:{' '}
                                                <span className="text-white font-semibold">
                                                  {tcLengthM}m
                                                </span>
                                              </p>
                                              <p className="text-xs text-gray-400">
                                                Clearance time:{' '}
                                                <span className="text-white font-semibold">
                                                  ~{Math.round((tcLengthM / 40) * 3.6)}s
                                                </span>
                                              </p>
                                            </div>
                                          )}
                                          {maxHold.queueAtRecommendedStop >
                                            PREPARE_TO_STOP_DISTANCE_M && (
                                            <div className="bg-red-900/30 border border-red-700 rounded p-2 mb-2">
                                              <p className="text-xs text-red-400">
                                                ⚠️ Queue at {maxHold.recommendedStopMinutes}min stop
                                                ({maxHold.queueAtRecommendedStop}m) exceeds Prepare
                                                to Stop distance ({PREPARE_TO_STOP_DISTANCE_M}m)
                                              </p>
                                            </div>
                                          )}
                                          <p className="text-xs text-gray-500">
                                            Based on weekday peak {vphOneDirWeekday} VPH/direction,{' '}
                                            {heavyPctWeekday}% heavy. Sign distances: Prepare to
                                            Stop {PREPARE_TO_STOP_DISTANCE_M}m, Adv Queue Warning{' '}
                                            {ADV_QUEUE_WARNING_DISTANCE_M}m.
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </>
                              );
                            })()}

                            {traffic.distance_to_site !== undefined && (
                              <p className="text-xs text-cyan-400 mt-2">
                                📍 Nearest count site: {traffic.distance_to_site} km from work zone
                              </p>
                            )}

                            <p className="text-xs text-gray-500 mt-2">Source: {traffic.source}</p>

                            {traffic.nearest_sites && traffic.nearest_sites.length > 1 && (
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <p className="text-xs text-gray-400 mb-2">
                                  Other nearby count sites:
                                </p>
                                <div className="text-xs space-y-1">
                                  {traffic.nearest_sites.slice(1, 4).map((site, i) => (
                                    <div key={i} className="flex justify-between text-gray-300">
                                      <span>{site.location}</span>
                                      <span className="text-gray-500">
                                        {site.aadt?.toLocaleString()} v/d ({site.distance_km} km)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {traffic.note && (
                              <p className="text-xs text-amber-400 mt-2">{traffic.note}</p>
                            )}

                            {/* User Counted Data (supplementary when MRWA data exists) */}
                            {userTrafficCounts.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <div className="bg-green-900/20 border border-green-700/50 rounded p-3">
                                  <h4 className="text-sm font-medium text-green-400 mb-2">
                                    📊 User Counted Data
                                    <span className="ml-1 text-xs text-gray-400">
                                      ({userTrafficCounts.length}{' '}
                                      {userTrafficCounts.length === 1 ? 'count' : 'counts'} found)
                                    </span>
                                  </h4>
                                  {userTrafficCounts.slice(0, 3).map((record) => (
                                    <div
                                      key={record.id}
                                      className="bg-gray-900/50 rounded p-2 mb-2 text-xs cursor-pointer hover:bg-gray-800/70 transition-colors"
                                      onClick={() => setSelectedCountDetail(record)}
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-white font-medium">
                                          {record.vph_one_direction} VPH (one dir) |{' '}
                                          {record.heavy_percentage}% heavy
                                        </span>
                                        <span className="text-gray-500">
                                          {new Date(record.date).toLocaleDateString('en-AU')}
                                        </span>
                                      </div>
                                      <div className="text-gray-400">
                                        SLK {record.slk?.toFixed(2) || 'N/A'} •{' '}
                                        {record.duration_minutes}min
                                        {record.slk && startSlk && (
                                          <span className="text-green-400 ml-1">
                                            (
                                            {Math.abs(record.slk - parseFloat(startSlk)) < 0.05
                                              ? 'at work zone'
                                              : `${Math.abs(record.slk - parseFloat(startSlk)).toFixed(1)} km from work zone`}
                                            )
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-gray-500">
                                        {record.direction_mode === 'both-ways'
                                          ? 'Both directions'
                                          : 'One direction'}{' '}
                                        • {record.total_vehicles} vehicles
                                        <span className="text-blue-400 ml-1">
                                          tap for details →
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* Weather with Sun Data */}
            {weather && (
              <div className="bg-gray-800 rounded-lg">
                <button
                  onClick={() => setShowWeather(!showWeather)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-blue-400">
                    🌤️ Weather - {weather.location}
                    {weather.dataUnavailable && (
                      <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                        No Cached Data
                      </span>
                    )}
                    {weather.fromCache && !weather.dataUnavailable && (
                      <span className="ml-2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
                        Cached{' '}
                        {weather.cachedAt ? new Date(weather.cachedAt).toLocaleTimeString() : ''}
                      </span>
                    )}
                    {warnings && warnings.count > 0 && (
                      <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {warnings.count} warning{warnings.count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h3>
                  <span className="text-gray-400 text-lg">{showWeather ? '−' : '+'}</span>
                </button>
                {showWeather && (
                  <div className="px-4 pb-4">
                    {/* Data Unavailable Warning */}
                    {weather.dataUnavailable && (
                      <div className="bg-red-900/30 border border-red-500/50 rounded p-3 mb-4">
                        <p className="text-sm font-semibold text-red-400">
                          ⚠️ Weather Data Unavailable
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {weather.source || 'No cached weather data available in offline mode.'}
                        </p>
                        <p className="text-xs text-amber-400 mt-2">
                          💡 Switch to ONLINE mode to fetch weather, or previously fetched weather
                          will be cached for offline use.
                        </p>
                      </div>
                    )}
                    {/* Weather Warnings - Live from Bureau of Meteorology */}
                    <WarningsSection state="WA" enabled={true} />

                    {/* Wind Gust Alert */}
                    {weather.current.windGust >= windGustThreshold && (
                      <div className="bg-amber-900/30 border border-amber-500/50 rounded p-3 mb-4">
                        <p className="text-sm font-semibold text-amber-400">
                          💨 High Wind Gust Alert: {weather.current.windGust} km/h
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Threshold: {windGustThreshold} km/h - Exercise caution with traffic
                          control devices
                        </p>
                      </div>
                    )}

                    {/* Sun Data - First */}
                    <div className="bg-gray-700/30 rounded p-3 mb-4">
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">🌅 Sunrise</p>
                          <p className="font-medium">{weather.sun.sunrise}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">🌇 Sunset</p>
                          <p className="font-medium">{weather.sun.sunset}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">☀️ Daylight</p>
                          <p className="font-medium">{weather.sun.daylightHours}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-gray-400 text-xs">UV Index</p>
                        <p className={`text-lg font-bold ${getUvColor(weather.sun.uvLevel)}`}>
                          {weather.sun.uvIndex} ({weather.sun.uvLevel})
                        </p>
                      </div>
                    </div>

                    {/* Current Conditions */}
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div>
                        <p className="text-gray-400">Condition</p>
                        <p className="font-medium">{weather.current.condition}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Temp</p>
                        <p className="font-medium">{weather.current.temp}°C</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Wind</p>
                        <p className="font-medium">
                          {weather.current.windSpeed} km/h {weather.current.windDir}
                        </p>
                        <p
                          className={`text-xs ${weather.current.windGust >= windGustThreshold ? 'text-amber-400 font-semibold' : 'text-gray-500'}`}
                        >
                          Gusts: {weather.current.windGust} km/h
                          {weather.current.windGust >= windGustThreshold && ' ⚠️'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Humidity</p>
                        <p className="font-medium">{weather.current.humidity}%</p>
                      </div>
                    </div>

                    <h4 className="text-xs text-gray-400 mb-2">8 Hour Forecast</h4>
                    <div className="text-xs space-y-1">
                      {weather.forecast.map((hour, i) => (
                        <p key={i} className="flex justify-between text-gray-300">
                          <span className="w-12">{hour.time}</span>
                          <span className="flex-1 text-center">{hour.condition}</span>
                          <span className="w-10 text-right">{hour.temp}°</span>
                          <span className="w-20 text-right text-gray-500">
                            {hour.windSpeed} km/h
                          </span>
                        </p>
                      ))}
                    </div>

                    {/* BOM Links */}
                    <div className="mt-4 pt-3 border-t border-gray-700 flex gap-2">
                      <a
                        href="https://www.bom.gov.au/products/IDR703.shtml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs bg-gray-700 hover:bg-gray-600 text-blue-400 py-2 rounded"
                      >
                        📡 BOM Radar
                      </a>
                      <a
                        href="https://www.bom.gov.au/wa/warnings/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs bg-gray-700 hover:bg-gray-600 text-blue-400 py-2 rounded"
                      >
                        ⚠️ BOM Warnings
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Road Incidents - Live from WebEOC */}
            <IncidentsSection roadId={result.road_id} roadName={result.road_name} enabled={true} />

            {/* Nearby Amenities */}
            {places && (
              <div className="bg-gray-800 rounded-lg">
                <button
                  onClick={() => setShowAmenities(!showAmenities)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-blue-400">
                    🏥 Amenities
                    {places.dataUnavailable && (
                      <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                        No Cached Data
                      </span>
                    )}
                    {places.fromCache && !places.dataUnavailable && (
                      <span className="ml-2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
                        Cached{' '}
                        {places.cachedAt ? new Date(places.cachedAt).toLocaleTimeString() : ''}
                      </span>
                    )}
                  </h3>
                  <span className="text-gray-400 text-lg">{showAmenities ? '−' : '+'}</span>
                </button>
                {showAmenities && (
                  <div className="px-4 pb-4">
                    {/* Data Unavailable Warning */}
                    {places.dataUnavailable && (
                      <div className="bg-red-900/30 border border-red-500/50 rounded p-3 mb-4">
                        <p className="text-sm font-semibold text-red-400">
                          ⚠️ Amenities Data Unavailable
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {places.source || 'No cached amenities data available in offline mode.'}
                        </p>
                        <p className="text-xs text-amber-400 mt-2">
                          💡 Switch to ONLINE mode to download amenities data, or previously fetched
                          amenities will be cached for offline use.
                        </p>
                      </div>
                    )}
                    {/* Hospital */}
                    {places.hospital ? (
                      <div className="mb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-red-400">
                            🏥 {places.hospital.name}
                            <span className="text-gray-500 text-sm ml-2">
                              ({places.hospital.distance} km)
                            </span>
                            {places.hospital.isEmergency && (
                              <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded ml-1">
                                ED
                              </span>
                            )}
                            {places.hospital.hospitalType === 'Public' && (
                              <span className="text-xs bg-blue-700 text-white px-1.5 py-0.5 rounded ml-1">
                                Public
                              </span>
                            )}
                            {places.hospital.hospitalType === 'Private' && (
                              <span className="text-xs bg-gray-600 text-white px-1.5 py-0.5 rounded ml-1">
                                Private
                              </span>
                            )}
                            {places.hospital.hospitalType === 'Nursing Post' && (
                              <span className="text-xs bg-amber-700 text-white px-1.5 py-0.5 rounded ml-1">
                                Nursing Post
                              </span>
                            )}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => openGoogleMaps(places.hospital?.googleMapsUrl || null)}
                              className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                              title="Navigate"
                            >
                              🗺️
                            </Button>
                            <Button
                              onClick={() =>
                                openStreetView(places.hospital!.lat, places.hospital!.lon)
                              }
                              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                              title="Street View"
                            >
                              🏠
                            </Button>
                          </div>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {places.hospital.address && (
                            <p className="text-xs text-gray-400">📍 {places.hospital.address}</p>
                          )}
                          {places.hospital.phone && (
                            <p className="text-xs text-gray-400">📞 {places.hospital.phone}</p>
                          )}
                          {places.hospital.beds && places.hospital.beds > 0 && (
                            <p className="text-xs text-gray-500">🛏️ {places.hospital.beds} beds</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mb-4">No hospital found nearby</p>
                    )}

                    {/* Fuel Station */}
                    {places.fuelStation ? (
                      <div className="mb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-yellow-400">
                            ⛽ {places.fuelStation.name}
                            <span className="text-gray-500 text-sm ml-2">
                              ({places.fuelStation.distance} km)
                            </span>
                            {places.fuelStation.fuelPrice && (
                              <span className="text-xs bg-green-700 text-white px-1.5 py-0.5 rounded ml-1">
                                $${(places.fuelStation.fuelPrice / 100).toFixed(2)}/L Diesel
                              </span>
                            )}
                            {!places.fuelStation.fuelPrice && (
                              <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded ml-1">
                                No price today
                              </span>
                            )}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              onClick={() =>
                                openGoogleMaps(places.fuelStation?.googleMapsUrl || null)
                              }
                              className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                              title="Navigate"
                            >
                              🗺️
                            </Button>
                            <Button
                              onClick={() =>
                                openStreetView(places.fuelStation!.lat, places.fuelStation!.lon)
                              }
                              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                              title="Street View"
                            >
                              🏠
                            </Button>
                          </div>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {places.fuelStation.address && (
                            <p className="text-xs text-gray-400">📍 {places.fuelStation.address}</p>
                          )}
                          {places.fuelStation.phone && (
                            <p className="text-xs text-gray-400">📞 {places.fuelStation.phone}</p>
                          )}
                          {places.fuelStation.siteFeatures &&
                            places.fuelStation.siteFeatures.length > 0 && (
                              <p className="text-xs text-gray-500">
                                🏷️ {places.fuelStation.siteFeatures.join(' · ')}
                              </p>
                            )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mb-4">No fuel station found nearby</p>
                    )}

                    {/* Toilet */}
                    {places.toilet ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-blue-400">
                            🚻 {places.toilet.name}
                            <span className="text-gray-500 text-sm ml-2">
                              ({places.toilet.distance} km)
                            </span>
                          </p>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => openGoogleMaps(places.toilet?.googleMapsUrl || null)}
                              className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                              title="Navigate"
                            >
                              🗺️
                            </Button>
                            <Button
                              onClick={() => openStreetView(places.toilet!.lat, places.toilet!.lon)}
                              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                              title="Street View"
                            >
                              🏠
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No public toilet found nearby</p>
                    )}
                  </div>
                )}
              </div>
            )}

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
