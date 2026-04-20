'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { EmergencyLocationModal } from '@/components/EmergencyLocationModal';
import { TrafficCountDetailModal } from '@/components/TrafficCountDetailModal';
import { DebugInfoPopup } from '@/components/DebugInfoPopup';
import { useSetDistance } from '@/hooks/useSetDistance';
import { useOfflineData } from '@/hooks/useOfflineData';
import { useHomeSettings } from '@/hooks/useHomeSettings';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import { useRegions } from '@/hooks/useRegions';
import { useRoads } from '@/hooks/useRoads';
import { useCollapsibleSections } from '@/hooks/useCollapsibleSections';
import { useSignageData } from '@/hooks/useSignageData';
import { useWeather } from '@/hooks/useWeather';
import { usePlaces } from '@/hooks/usePlaces';
import { IncidentsSection } from '@/components/IncidentsSection';
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
import { SpeedZoneLayoutSection } from '@/components/home/SpeedZoneLayoutSection';
import { GenerateReportButton } from '@/components/home/GenerateReportButton';
import { HomeHeader } from '@/components/home/HomeHeader';
import { StartSlkTrackingButton } from '@/components/home/StartSlkTrackingButton';
import { RoadWidthBreakdown } from '@/components/home/RoadWidthBreakdown';
import { LaneDirectionDiagram } from '@/components/home/LaneDirectionDiagram';
import { WorkZoneForm } from '@/components/home/WorkZoneForm';
import { TrafficVolumeSection } from '@/components/home/TrafficVolumeSection';
import { useWorkZoneFetch } from '@/hooks/useWorkZoneFetch';
import { useWorkZoneLookup } from '@/hooks/useWorkZoneLookup';
import { WorkZoneReport } from '@/components/WorkZoneReport';
import { SetDistanceControls } from '@/components/SetDistanceControls';
import { GpsLookupDialog } from '@/components/GpsLookupDialog';
import { ReportExportModal } from '@/components/ReportExportModal';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';

// offline-db imports removed — used by hooks, not directly by page.tsx
// download-roads imports removed — used by hooks, not directly by page.tsx
import { type TrafficCountRecord } from '@/lib/traffic-counter-storage';
import {
  WeatherData,
  WarningData,
  TrafficData,
  SavedLocation,
  PlacesData,
  CrossRoad,
  Road,
} from '@/types/shared';
// saved-locations-db imports removed — used by useSavedLocations hook

export default function Home() {
  const {
    regions,
    selectedRegion,
    loadingRegions,
    error: regionsError,
    updateSelectedRegion,
    refreshRegions: fetchRegions,
  } = useRegions();
  const [selectedRoad, setSelectedRoad] = useState<string>('');
  const [startSlk, setStartSlk] = useState<string>('');
  const [endSlk, setEndSlk] = useState<string>('');

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [warnings, setWarnings] = useState<WarningData | null>(null);
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [selectedCountDetail, setSelectedCountDetail] = useState<TrafficCountRecord | null>(null);
  const [userTrafficOverride, setUserTrafficOverride] = useState<TrafficCountRecord | null>(null);
  const [places, setPlaces] = useState<PlacesData | null>(null);
  const [crossRoads, setCrossRoads] = useState<CrossRoad[]>([]);
  const [corridorIntersections, setCorridorIntersections] = useState<CrossRoad[]>([]); // For signage corridor (±700m)
  const [roadInfo, setRoadInfo] = useState<Road | null>(null);

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
    // If the region is different, we need to switch regions first.
    // Instead of a fragile setTimeout, we use the same pendingRestoreParams
    // pattern as the sessionStorage restore flow — it waits for the roads
    // useEffect to populate the roads list, then calls getWorkZoneInfo.
    if (loc.region && loc.region !== selectedRegion) {
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
      loc.region || selectedRegion,
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

  // Roads hook - must be after useOfflineData since it needs offlineToggles
  const {
    roads,
    loadingRoads,
    error: roadsError,
    fetchRoads,
  } = useRoads(selectedRegion, offlineToggles);

  // Signage data hook
  const {
    speedLimit,
    signageCorridor,
    signageLoading,
    corridorSpeedZones,
    fetchSpeedLimit,
    fetchSignageCorridor,
    resetSignageData,
  } = useSignageData({ offlineToggles });

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

  // Work zone lookup hook - manages result, error, loading, isSinglePoint, exporting, getWorkZoneInfo
  const {
    result,
    error,
    setError,
    loading,
    isSinglePoint,
    exporting,
    userTrafficCounts,
    setUserTrafficCounts,
    getWorkZoneInfo,
    exportReport: exportLookupReport,
    clearLookupResults,
  } = useWorkZoneLookup({
    offlineToggles,
    fetchSpeedLimit,
    fetchSignageCorridor,
    fetchWeather,
    fetchTraffic,
    fetchPlaces,
    fetchWarnings,
    fetchCrossRoads,
    onSetFormFields: ({ roadId, startSlk: slk, endSlk: eslk }) => {
      setSelectedRoad(roadId);
      setStartSlk(slk);
      setEndSlk(eslk);
    },
    selectedRegion,
    onUpdateSelectedRegion: updateSelectedRegion,
  });

  // Sync error states from other hooks to the lookup hook's error state
  useEffect(() => {
    if (regionsError) setError(regionsError);
  }, [regionsError, setError]);
  useEffect(() => {
    if (roadsError) setError(roadsError);
  }, [roadsError, setError]);

  // Collapsible sections state
  const sections = useCollapsibleSections();

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

  // Clear road selection when region changes (unless restoring)
  useEffect(() => {
    if (selectedRegion && !isRestoring.current) {
      setSelectedRoad('');
    }
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

  useEffect(() => {
    if (selectedRoad) {
      const road = roads.find((r) => r.road_id === selectedRoad);
      setRoadInfo(road || null);
    } else {
      setRoadInfo(null);
    }
    // Only clear results if not restoring
    if (!isRestoring.current) {
      clearLookupResults();
      setWeather(null);
      setWarnings(null);
      setTraffic(null);
      setPlaces(null);
      setCrossRoads([]);
    }
  }, [selectedRoad, roads, clearLookupResults]);

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
    clearLookupResults();
    setWeather(null);
    setWarnings(null);
    setTraffic(null);
    setUserTrafficOverride(null);
    setPlaces(null);
    setCrossRoads([]);
    updateSelectedRegion('');
    setSelectedRoad('');
    setStartSlk('');
    setEndSlk('');
    resetSignageData();
    setGpsRoadInfo(null);
    isRestoring.current = false;
    pendingRestoreParams.current = null;
    setIsRestoringUI(false);
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
    await exportLookupReport(result, weather, traffic, crossRoads, places);
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
        <HomeHeader
          offlineReady={offlineReady}
          onShowEmergency={() => setShowEmergencyModal(true)}
          settingsDrawerProps={{
            variant: 'home',
            offlineStats,
            downloading,
            downloadProgress,
            onDownloadData: handleDownloadOfflineData,
            onClearData: handleClearOfflineData,
            gpsSettings,
            onUpdateGpsSetting: updateGpsSetting,
            defaultRegion,
            regions,
            onUpdateRegion: (region: string) => {
              updateDefaultRegion(region);
            },
            windGustThreshold,
            onUpdateWindGustThreshold: updateWindGustThreshold,
            result,
            setDistanceActive,
            onStartSetDistance: startSetDistance,
            onOpenTrafficEventLogger: () => setTrafficEventLoggerOpen(true),
            onExportReport: exportReport,
            exporting,
            mrwaStatus,
            datasetStats,
            syncProgress,
            syncingDatasets,
            onSyncAll: syncAllDatasets,
            onSyncDataset: syncDatasetFromMrwa,
            onGenerateDebug: generateDebugInfo,
            offlineToggles,
            onUpdateOfflineToggle: updateOfflineToggle,
            onResetOfflineToggles: resetOfflineToggles,
            offlineReady,
          }}
        />

        {/* Debug Info Popup */}
        <DebugInfoPopup
          show={showDebug}
          debugInfo={debugInfo}
          onClose={() => setShowDebug(false)}
          onCopyFeedback={setDownloadProgress}
        />

        {/* Quick Start SLK Tracking Button - only show when no results displayed */}
        <StartSlkTrackingButton
          onStartTracking={startSlkTracking}
          visible={!result && !isRestoringUI}
        />

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
            <SpeedZoneLayoutSection
              workZoneStart={result.work_zone.start_slk}
              workZoneEnd={result.work_zone.end_slk || result.work_zone.start_slk}
              signageCorridor={signageCorridor}
              speedZones={corridorSpeedZones}
              intersections={crossRoads
                .filter((road) => road.name.toLowerCase() !== result.road_name.toLowerCase())
                .map((road) => ({
                  name: road.name,
                  slk:
                    road.intersectionSlk ?? parseFloat(road.distance) + result.work_zone.start_slk,
                  roadType: road.roadType,
                }))}
              corridorMargin={0.85}
              defaultExpanded={sections.showSpeedZoneLayout}
            />

            {/* Intersecting Roads */}
            <IntersectionsSection
              crossRoads={crossRoads}
              roadName={result.road_name}
              defaultExpanded={sections.showIntersections}
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
                defaultExpanded={sections.showTraffic}
              />
            </SectionErrorBoundary>

            {/* Weather with Sun Data */}
            <SectionErrorBoundary sectionName="Weather">
              <WeatherSection
                weather={weather}
                warnings={warnings}
                windGustThreshold={windGustThreshold}
                showWeather={sections.showWeather}
                onToggle={sections.toggleWeather}
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
                showAmenities={sections.showAmenities}
                onToggle={sections.toggleAmenities}
                onOpenGoogleMaps={(url) => openGoogleMaps(url)}
                onOpenStreetView={openStreetView}
              />
            </SectionErrorBoundary>

            {/* Generate Report Button */}
            <GenerateReportButton
              onGenerate={generateWorkZoneReport}
              isGenerating={reportGenerating}
              visible={!!result}
            />
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
