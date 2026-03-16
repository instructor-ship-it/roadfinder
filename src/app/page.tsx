'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { haversineDistance } from '@/lib/utils'
import { IncidentsSection } from '@/components/IncidentsSection'
import { WarningsSection } from '@/components/WarningsSection'
import SpeedZoneLayout from '@/components/SpeedZoneLayout'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
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
} from '@/lib/offline-db'
import {
  loadStaticData,
  checkStaticData,
} from '@/lib/download-roads'

interface Road {
  road_id: string
  road_name: string
  min_slk: number
  max_slk: number
  region?: string
}

interface Position {
  lat: number
  lon: number
  speed: string
  cwy: string
}

interface WorkZoneResult {
  road_id: string
  road_name: string
  network_type?: string
  work_zone: {
    start_slk: number
    end_slk: number
    length_m: number
    start: Position | null
    end: Position | null
  }
  tc_positions: {
    start_slk: number
    end_slk: number
    start: Position | null
    end: Position | null
  }
  approach_signs: {
    start_slk: number
    end_slk: number
    start: Position | null
    end: Position | null
  }
  speed_zones: {
    approach_start: string
    tc_start: string
    work_zone_start: string
    work_zone_end: string
    tc_end: string
    approach_end: string
  }
  carriageway: string
  pavement?: {
    lanes: number | null
    width_m: number | null
    cwy: string
    total_pave_width: number | null
    total_seal_width: number | null
    sealed_shoulder_l: number | null
    sealed_shoulder_r: number | null
    unsealed_shoulder_l: number | null
    unsealed_shoulder_r: number | null
    kerb_l: string | null
    kerb_r: string | null
  }
  midpoint: { lat: number; lon: number; slk: number } | null
  google_maps: {
    work_zone_start: string | null
    work_zone_end: string | null
    tc_start: string | null
    tc_end: string | null
  }
}

interface WeatherData {
  location: string
  current: {
    temp: number
    humidity: number
    windSpeed: number
    windDir: string
    windGust: number
    condition: string
  }
  sun: {
    sunrise: string
    sunset: string
    daylightHours: string
    uvIndex: number
    uvLevel: string
  }
  forecast: Array<{
    time: string
    temp: number
    windSpeed: number
    windDir: string
    condition: string
  }>
  fromCache?: boolean
  cachedAt?: number
  source?: string
  dataUnavailable?: boolean // True when offline mode but no cached data available
  cachedLocation?: { lat: number; lon: number }
}

interface WarningItem {
  title: string
  description: string
  link: string
  pubDate: string
  category: string
  urgency: string
  severity: string
}

interface WarningData {
  warnings: WarningItem[]
  count: number
  lastUpdated: string
  source: string
}

interface TrafficData {
  road_id: string
  road_name?: string
  aadt: number
  aadt_year: string
  heavy_vehicle_percent: number
  peak_hour_volume: number
  source: string
  distance_to_site?: number
  nearest_sites?: Array<{
    site_no: string
    location: string
    year: string
    aadt: number
    heavy_percent: number
    distance_km: number | null
  }>
  note?: string
  fromCache?: boolean
  cachedAt?: number
}

interface Place {
  name: string
  distance: string
  lat: number
  lon: number
  phone?: string
  address?: string
  googleMapsUrl: string
  isEmergency?: boolean
}

interface PlacesData {
  hospital: Place | null
  toilet: Place | null
  fuelStation: Place | null
  fromCache?: boolean
  cachedAt?: number
  cachedLocation?: { lat: number; lon: number }
  source?: string
  dataUnavailable?: boolean // True when offline mode but no cached data available
}

interface CrossRoad {
  name: string
  distance: string
  lat: number
  lon: number
  roadType: string
  googleMapsUrl: string
}

export default function Home() {
  const [regions, setRegions] = useState<string[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [roads, setRoads] = useState<Road[]>([])
  const [selectedRoad, setSelectedRoad] = useState<string>('')
  const [startSlk, setStartSlk] = useState<string>('')
  const [endSlk, setEndSlk] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingRegions, setLoadingRegions] = useState<boolean>(true)
  const [loadingRoads, setLoadingRoads] = useState<boolean>(false)
  const [result, setResult] = useState<WorkZoneResult | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [warnings, setWarnings] = useState<WarningData | null>(null)
  const [traffic, setTraffic] = useState<TrafficData | null>(null)
  const [places, setPlaces] = useState<PlacesData | null>(null)
  const [crossRoads, setCrossRoads] = useState<CrossRoad[]>([])
  const [error, setError] = useState<string>('')
  const [roadInfo, setRoadInfo] = useState<Road | null>(null)
  const [isSinglePoint, setIsSinglePoint] = useState<boolean>(false)
  const [exporting, setExporting] = useState<boolean>(false)
  
  // GPS location state
  const [gpsLat, setGpsLat] = useState<string>('')
  const [gpsLon, setGpsLon] = useState<string>('')
  const [loadingGps, setLoadingGps] = useState<boolean>(false)
  const [gpsError, setGpsError] = useState<string>('')
  const [gpsRoadInfo, setGpsRoadInfo] = useState<{road_id: string; road_name: string; network_type: string, slk: number} | null>(null)
  const [showGpsDialog, setShowGpsDialog] = useState<boolean>(false)
  
  // Offline data state
  const [offlineReady, setOfflineReady] = useState<boolean>(false)
  const [defaultRegion, setDefaultRegion] = useState<string>('')
  const [downloading, setDownloading] = useState<boolean>(false)
  const [downloadProgress, setDownloadProgress] = useState<string>('')
  const [offlineStats, setOfflineStats] = useState<{
    total_roads: number
    download_date: string
    pavement_roads?: number
    traffic_roads?: number
    amenities_regions?: number
  } | null>(null)
  const [speedLimit, setSpeedLimit] = useState<number | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [showDebug, setShowDebug] = useState<boolean>(false)

  // Offline data source toggles (RC 1.7.0) - when true, use offline data; when false, use online API
  // Default to offline mode (true) - if offline data not available, functions will fall back to online
  interface OfflineToggles {
    roadsList: boolean;        // Roads list by region
    workZoneLookup: boolean;   // Work zone geometry lookup
    speedZones: boolean;       // Speed zones
    railCrossings: boolean;    // Rail crossings
    regulatorySigns: boolean;  // Regulatory signs
    warningSigns: boolean;     // Warning signs
  }

  const DEFAULT_OFFLINE_TOGGLES: OfflineToggles = {
    roadsList: true,
    workZoneLookup: true,
    speedZones: true,
    railCrossings: true,
    regulatorySigns: true,
    warningSigns: true,
  }

  const [offlineToggles, setOfflineToggles] = useState<OfflineToggles>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('offlineToggles')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Merge with defaults to handle new toggle additions
          return { ...DEFAULT_OFFLINE_TOGGLES, ...parsed }
        } catch {
          return DEFAULT_OFFLINE_TOGGLES
        }
      }
    }
    return DEFAULT_OFFLINE_TOGGLES
  })

  const updateOfflineToggle = (key: keyof OfflineToggles, value: boolean) => {
    const newToggles = { ...offlineToggles, [key]: value }
    setOfflineToggles(newToggles)
    localStorage.setItem('offlineToggles', JSON.stringify(newToggles))
  }

  const resetOfflineToggles = () => {
    setOfflineToggles(DEFAULT_OFFLINE_TOGGLES)
    localStorage.setItem('offlineToggles', JSON.stringify(DEFAULT_OFFLINE_TOGGLES))
  }
  
  // Speed display setting (controls visibility on /drive page)
  const [showSpeedDisplay, setShowSpeedDisplay] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showSpeedDisplay') === 'true'
    }
    return false
  })

  // Admin sync state
  const [syncProgress, setSyncProgress] = useState<Record<string, {status: string; percent: number; message: string}>>({})
  const [datasetStats, setDatasetStats] = useState<{
    roads: { count: number; lastSync: string | null };
    speedZones: { count: number; lastSync: string | null };
    railCrossings: { count: number; lastSync: string | null };
    regulatorySigns: { count: number; lastSync: string | null };
    warningSigns: { count: number; lastSync: string | null };
  } | null>(null)
  const [mrwaStatus, setMrwaStatus] = useState<any>(null)
  const [syncingDatasets, setSyncingDatasets] = useState<Set<string>>(new Set())
  
  // GPS Enhancement Settings (EKF-based)
  const [gpsSettings, setGpsSettings] = useState<{
    ekfEnabled: boolean;
    roadConstraint: boolean;
    maxPredictionTime: number;
    showUncertainty: boolean;
    earlyWarnings: boolean;
    speedLookaheadTime: number;
    gpsLagCompensation: number;
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gpsSettings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Migrate old settings to new format
          if ('interpolation' in parsed || 'smoothing' in parsed) {
            return {
              ekfEnabled: true,
              roadConstraint: true,
              maxPredictionTime: 30,
              showUncertainty: true,
              earlyWarnings: parsed.earlyWarnings ?? true,
              speedLookaheadTime: 5,
              gpsLagCompensation: 0,
            }
          }
          // Add speedLookaheadTime if missing (migration)
          if (!('speedLookaheadTime' in parsed)) {
            return { ...parsed, speedLookaheadTime: 5, gpsLagCompensation: parsed.gpsLagCompensation ?? 0 }
          }
          // Add gpsLagCompensation if missing (migration)
          if (!('gpsLagCompensation' in parsed)) {
            return { ...parsed, gpsLagCompensation: 0 }
          }
          return parsed
        } catch {
          return { ekfEnabled: true, roadConstraint: true, maxPredictionTime: 30, showUncertainty: true, earlyWarnings: true, speedLookaheadTime: 5, gpsLagCompensation: 0 }
        }
      }
    }
    return { ekfEnabled: true, roadConstraint: true, maxPredictionTime: 30, showUncertainty: true, earlyWarnings: true, speedLookaheadTime: 5, gpsLagCompensation: 0 }
  })
  
  const updateGpsSetting = (key: string, value: boolean | number) => {
    const newSettings = { ...gpsSettings, [key]: value }
    setGpsSettings(newSettings)
    localStorage.setItem('gpsSettings', JSON.stringify(newSettings))
  }
  
  // Wind Gust Alert Settings
  const [windGustThreshold, setWindGustThreshold] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('windGustThreshold')
      if (saved) {
        try {
          return parseInt(saved, 10)
        } catch {
          return 60
        }
      }
    }
    return 60 // Default 60 km/h
  })
  
  const updateWindGustThreshold = (value: number) => {
    setWindGustThreshold(value)
    localStorage.setItem('windGustThreshold', value.toString())
  }
  
  // AfterCare Lookahead Distance
  const [afterCareLookaheadKm, setAfterCareLookaheadKm] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('afterCareLookaheadKm')
      if (saved) {
        try {
          return parseInt(saved, 10)
        } catch {
          return 5
        }
      }
    }
    return 5 // Default 5 km
  })
  
  const updateAfterCareLookaheadKm = useCallback((value: number) => {
    setAfterCareLookaheadKm(value)
    localStorage.setItem('afterCareLookaheadKm', value.toString())
  }, [])
  
  // Set Distance state
  interface SetDistanceMark {
    id: number;
    distance: number; // meters from reference
    slk: number | null;
    roadId: string | null;
    roadName: string | null;
    timestamp: string;
  }
  
  const [setDistanceActive, setSetDistanceActive] = useState<boolean>(false)
  const [setDistanceWatchId, setSetDistanceWatchId] = useState<number | null>(null)
  const [setDistanceRefPoint, setSetDistanceRefPoint] = useState<{lat: number; lon: number; slk: number; roadId: string | null; roadName: string | null} | null>(null)
  // Ref for reference point to avoid closure staleness in watchPosition
  const setDistanceRefPointRef = useRef<{lat: number; lon: number} | null>(null)
  const [setDistanceCurrentPos, setSetDistanceCurrentPos] = useState<{lat: number; lon: number} | null>(null)
  const [setDistanceCurrentSlk, setSetDistanceCurrentSlk] = useState<number | null>(null)
  const [setDistanceCurrentRoad, setSetDistanceCurrentRoad] = useState<{roadId: string; roadName: string} | null>(null)
  const [setDistanceDistance, setSetDistanceDistance] = useState<number>(0)
  const [setDistanceMarks, setSetDistanceMarks] = useState<SetDistanceMark[]>([])
  const [setDistanceTotalDistance, setSetDistanceTotalDistance] = useState<number>(0)
  const [setDistanceMarkId, setSetDistanceMarkId] = useState<number>(0)
  
  // Signage corridor data
  const [signageCorridor, setSignageCorridor] = useState<SignageItem[]>([])
  const [signageLoading, setSignageLoading] = useState<boolean>(false)
  const [corridorSpeedZones, setCorridorSpeedZones] = useState<ParsedSpeedZone[]>([])
  
  // Collapsible sections state
  const [showTraffic, setShowTraffic] = useState<boolean>(true)
  const [showSignageCorridor, setShowSignageCorridor] = useState<boolean>(true)
  const [showSpeedZoneLayout, setShowSpeedZoneLayout] = useState<boolean>(true)
  const [showTcPositions, setShowTcPositions] = useState<boolean>(true)
  const [showIntersections, setShowIntersections] = useState<boolean>(true)
  const [showWeather, setShowWeather] = useState<boolean>(true)
  const [showAmenities, setShowAmenities] = useState<boolean>(true)

  // Report modal state
  const [showReportModal, setShowReportModal] = useState<boolean>(false)
  const [reportContent, setReportContent] = useState<string>('')
  const [reportGenerating, setReportGenerating] = useState<boolean>(false)

  // Emergency location modal state
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false)
  const [emergencyLoading, setEmergencyLoading] = useState<boolean>(false)
  const [emergencyData, setEmergencyData] = useState<{
    roadName: string;
    slk: number;
    region: string;
    locality: string | null;
    lat: number;
    lon: number;
    crossRoad: { name: string; distance: string; direction: string } | null;
    nearbyRoads: Array<{ road_name: string; distance_m: number }>;
  } | null>(null)

  // Settings collapsible sections state (all minimized by default, Offline Data expanded if no data)
  const [showAbout, setShowAbout] = useState<boolean>(false)
  const [showAdminSync, setShowAdminSync] = useState<boolean>(false)
  const [showGpsTracking, setShowGpsTracking] = useState<boolean>(false)
  const [showOfflineData, setShowOfflineData] = useState<boolean>(true) // Expanded by default for new users
  const [showPreferences, setShowPreferences] = useState<boolean>(false)
  const [showSpeedOverrides, setShowSpeedOverrides] = useState<boolean>(false)
  const [showTcTools, setShowTcTools] = useState<boolean>(false)

  // Ref to track when we're restoring state (prevents fetchRoads from clearing selectedRoad)
  const isRestoring = useRef(false)
  // Ref to store pending restore params (to call getWorkZoneInfo after roads load)
  const pendingRestoreParams = useRef<{region: string, roadId: string, startSlk: string, endSlk: string} | null>(null)
  // State to trigger UI re-render during restore (hides inputs)
  const [isRestoringUI, setIsRestoringUI] = useState<boolean>(false)

  // Check offline data status on mount
  useEffect(() => {
    checkOfflineStatus()
  }, [])

  // Load default region from localStorage on mount
  useEffect(() => {
    const savedDefaultRegion = localStorage.getItem('defaultRegion')
    if (savedDefaultRegion) {
      setDefaultRegion(savedDefaultRegion)
      // Don't set selectedRegion here - wait for regions to load
    }
  }, [])

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions()
  }, [])

  // Restore state from sessionStorage when returning from tracking
  useEffect(() => {
    const savedParams = sessionStorage.getItem('workZoneParams')
    if (savedParams) {
      try {
        const params = JSON.parse(savedParams)
        isRestoring.current = true
        setIsRestoringUI(true) // Trigger UI to hide inputs
        
        // Store params for later use (after roads load)
        pendingRestoreParams.current = params
        
        // Set region to trigger roads fetch
        if (params.region) {
          setSelectedRegion(params.region)
        }
        
        // Don't clear params here - keep them until user clicks Reset
        // Clean up old format if it exists
        sessionStorage.removeItem('workZoneState')
      } catch (e) {
        console.error('Failed to restore params:', e)
        isRestoring.current = false
        setIsRestoringUI(false)
      }
    }
  }, [])

  // Fetch roads when region changes
  useEffect(() => {
    if (selectedRegion) {
      fetchRoads(selectedRegion)
    }
  }, [selectedRegion])

  const checkOfflineStatus = async () => {
    try {
      await initDB()
      const hasData = await isOfflineDataAvailable()
      setOfflineReady(hasData)

      // Collapse Offline Data section if data already exists (expand for new users)
      if (hasData) {
        setShowOfflineData(false)
        const metadata = await getOfflineMetadata()
        if (metadata) {
          setOfflineStats({
            total_roads: metadata.total_roads,
            download_date: metadata.download_date
          })
        }
      }
    } catch (e) {
      console.error('Failed to check offline status:', e)
    }
  }

  const handleDownloadOfflineData = async () => {
    setDownloading(true)
    setDownloadProgress('Clearing old data...')
    
    try {
      // Always clear old data before downloading new data to prevent corruption
      await clearOfflineData()
      
      // Check if static data is available
      setDownloadProgress('Checking for static data...')
      const { available, metadata } = await checkStaticData()
      
      if (!available) {
        setDownloadProgress('No static data available. Please run: node scripts/download-roads.js locally and commit the data files.')
        setTimeout(() => setDownloading(false), 5000)
        return
      }
      
      setDownloadProgress(`Found data from ${metadata.download_date ? new Date(metadata.download_date).toLocaleDateString() : 'unknown date'}. Loading...`)
      
      const downloadDate = new Date().toISOString()
      
      // Load static data into IndexedDB
      const result = await loadStaticData(
        async (region, roads, speedZones, railCrossings, regulatorySigns, warningSigns) => {
          await storeRegionData(region, roads)
          await storeSpeedZones(speedZones)
          if (railCrossings && railCrossings.length > 0) {
            await storeRailCrossings(railCrossings)
          }
          if (regulatorySigns && regulatorySigns.length > 0) {
            await storeRegulatorySigns(regulatorySigns)
          }
          if (warningSigns && warningSigns.length > 0) {
            await storeWarningSigns(warningSigns)
          }
        },
        (progress) => {
          setDownloadProgress(progress.message)
        },
        // Store pavement data
        async (pavementData) => {
          await storePavementData(pavementData)
        },
        // Store traffic data
        async (trafficData) => {
          await storeTrafficData(trafficData)
        },
        // Store amenities data
        async (amenitiesData) => {
          await storeAllAmenitiesData(amenitiesData)
        }
      )
      
      // Save metadata
      await storeMetadata({
        download_date: downloadDate,
        total_roads: result.totalRoads,
        regions: result.regions
      })
      
      setOfflineReady(true)
      setOfflineStats({
        total_roads: result.totalRoads,
        download_date: downloadDate
      })
      
      // Build summary message
      const parts: string[] = []
      parts.push(`${result.totalRoads} roads`)
      parts.push(`${result.totalSpeedZones} speed zones`)
      if (result.totalPavement > 0) parts.push(`${result.totalPavement} roads with pavement data`)
      if (result.totalTraffic > 0) parts.push(`${result.totalTraffic} roads with traffic data`)
      if (result.totalAmenities > 0) parts.push(`${result.totalAmenities} amenities`)
      if (result.totalRailCrossings > 0) parts.push(`${result.totalRailCrossings} rail crossings`)
      if (result.totalRegulatorySigns > 0) parts.push(`${result.totalRegulatorySigns} regulatory signs`)
      if (result.totalWarningSigns > 0) parts.push(`${result.totalWarningSigns} warning signs`)
      
      setDownloadProgress(`✓ Loaded ${parts.join(', ')} from ${result.regions.length} regions`)
      
      setTimeout(() => {
        setDownloadProgress('')
      }, 5000)
      
    } catch (e: any) {
      setDownloadProgress(`Error: ${e.message}`)
    } finally {
      setDownloading(false)
    }
  }

  const handleClearOfflineData = async () => {
    try {
      await clearOfflineData()
      setOfflineReady(false)
      setOfflineStats(null)
      setDatasetStats(null)
      setDownloadProgress('Offline data cleared')
      setTimeout(() => setDownloadProgress(''), 2000)
    } catch (e) {
      setDownloadProgress('Failed to clear data')
    }
  }

  // Load dataset stats from IndexedDB
  const loadDatasetStats = async () => {
    try {
      const stats = await getDetailedStats()
      setDatasetStats(stats)
    } catch (e) {
      console.error('Failed to load dataset stats:', e)
    }
  }

  // Fetch MRWA status (record counts)
  const fetchMrwaStatus = async () => {
    try {
      const response = await fetch('/api/admin-sync?action=status')
      if (response.ok) {
        const data = await response.json()
        setMrwaStatus(data)
      }
    } catch (e) {
      console.error('Failed to fetch MRWA status:', e)
    }
  }

  // Sync a single dataset from MRWA with real-time progress
  const syncDatasetFromMrwa = async (dataset: string) => {
    setSyncingDatasets(prev => new Set(prev).add(dataset))
    setSyncProgress(prev => ({
      ...prev,
      [dataset]: { status: 'syncing', percent: 0, message: 'Starting...' }
    }))

    try {
      // Use streaming for real-time progress
      const response = await fetch('/api/admin-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasets: [dataset],
          streamToClient: true
        })
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      // Read the stream for progress updates
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let records: any[] = []
      
      if (reader) {
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          
          // Parse SSE events (format: "data: {...}\n\n")
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.substring(6))
                
                if (event.type === 'progress') {
                  // Update progress
                  const fetched = event.fetched ?? 0
                  const total = event.total ?? 0
                  const percent = event.percent ?? 0
                  setSyncProgress(prev => ({
                    ...prev,
                    [dataset]: { 
                      status: 'syncing', 
                      percent, 
                      message: `Fetching ${fetched.toLocaleString()} of ${total.toLocaleString()}...` 
                    }
                  }))
                } else if (event.type === 'data') {
                  // Store the records
                  records = event.records || []
                  setSyncProgress(prev => ({
                    ...prev,
                    [dataset]: { status: 'syncing', percent: 100, message: `Storing ${records.length.toLocaleString()} records...` }
                  }))
                } else if (event.type === 'complete') {
                  const count = event.count ?? 0
                  setSyncProgress(prev => ({
                    ...prev,
                    [dataset]: { status: 'complete', percent: 100, message: `Synced ${count.toLocaleString()} records` }
                  }))
                } else if (event.type === 'error') {
                  throw new Error(event.message || 'Unknown error')
                }
              } catch (parseError) {
                console.error('Failed to parse event:', line)
              }
            }
          }
        }
      }

      // Store in IndexedDB
      if (records && records.length > 0) {
        let storedCount = 0
        switch (dataset) {
          case 'roads':
            storedCount = await storeRoadsData(records, 'mrwa')
            break
          case 'speedZones':
            storedCount = await storeSpeedZonesData(records, 'mrwa')
            break
          case 'railCrossings':
            storedCount = await storeRailCrossingsData(records, 'mrwa')
            break
          case 'regulatorySigns':
            storedCount = await storeRegulatorySignsData(records, 'mrwa')
            break
          case 'warningSigns':
            storedCount = await storeWarningSignsData(records, 'mrwa')
            break
        }
        
        setSyncProgress(prev => ({
          ...prev,
          [dataset]: { status: 'complete', percent: 100, message: `Stored ${(storedCount || 0).toLocaleString()} records` }
        }))
      }

      // Refresh stats
      await loadDatasetStats()
      await checkOfflineStatus()

    } catch (e: any) {
      setSyncProgress(prev => ({
        ...prev,
        [dataset]: { status: 'error', percent: 0, message: e.message || 'Sync failed' }
      }))
    } finally {
      setSyncingDatasets(prev => {
        const next = new Set(prev)
        next.delete(dataset)
        return next
      })
    }
  }

  // Sync all datasets
  const syncAllDatasets = async () => {
    const datasets = ['roads', 'speedZones', 'railCrossings', 'regulatorySigns', 'warningSigns']
    for (const dataset of datasets) {
      await syncDatasetFromMrwa(dataset)
    }
  }

  // Clear a specific dataset
  const handleClearDataset = async (dataset: string) => {
    try {
      await clearDataset(dataset)
      await loadDatasetStats()
      setSyncProgress(prev => ({
        ...prev,
        [dataset]: { status: 'cleared', percent: 0, message: 'Dataset cleared' }
      }))
    } catch (e) {
      console.error('Failed to clear dataset:', e)
    }
  }

  // Generate comprehensive work zone report in HTML format
  const generateWorkZoneReport = () => {
    setReportGenerating(true)
    
    const timestamp = new Date().toLocaleString('en-AU', { 
      dateStyle: 'full', 
      timeStyle: 'short' 
    })
    
    // Build text version for clipboard/download
    const lines: string[] = []
    lines.push('╔════════════════════════════════════════════════════════════════╗')
    lines.push('║         TC WORK ZONE LOCATOR - WORK ZONE REPORT                ║')
    lines.push('╚════════════════════════════════════════════════════════════════╝')
    lines.push('')
    lines.push(`Generated: ${timestamp}`)
    lines.push(`Report Version: 1.0`)
    lines.push('')
    
    // === WORK ZONE SUMMARY ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('📍 WORK ZONE SUMMARY')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (result) {
      lines.push(`Road ID:          ${result.road_id}`)
      lines.push(`Road Name:        ${result.road_name}`)
      if (result.network_type) {
        lines.push(`Network Type:     ${result.network_type}`)
      }
      lines.push(`Carriageway:      ${result.carriageway}`)
      lines.push('')
      lines.push(`Start SLK:        ${result.work_zone.start_slk.toFixed(3)} km`)
      lines.push(`End SLK:          ${result.work_zone.end_slk.toFixed(3)} km`)
      lines.push(`Zone Length:      ${result.work_zone.length_m} m`)
      lines.push('')
      if (result.pavement) {
        lines.push(`Lanes:            ${result.pavement.lanes || 'Unknown'}`)
        lines.push('')
        
        // Road width breakdown with visual bar
        const p = result.pavement
        const unsealedL = p.unsealed_shoulder_l || 0
        const sealedL = p.sealed_shoulder_l || 0
        const trafficable = p.width_m || 0
        const sealedR = p.sealed_shoulder_r || 0
        const unsealedR = p.unsealed_shoulder_r || 0
        // Note: kerb_l and kerb_r are string types (e.g., "YES", "NO"), not width values
        const hasKerbL = p.kerb_l && p.kerb_l.toUpperCase() !== 'NO' && p.kerb_l.toUpperCase() !== 'NONE'
        const hasKerbR = p.kerb_r && p.kerb_r.toUpperCase() !== 'NO' && p.kerb_r.toUpperCase() !== 'NONE'
        const totalWidth = p.total_pave_width || (unsealedL + sealedL + trafficable + sealedR + unsealedR)

        lines.push('Road Width Breakdown:')
        lines.push('')

        // Create visual bar (50 characters wide)
        const barWidth = 50
        const segments: { width: number; char: string; label: string; color: string }[] = []

        if (hasKerbL) segments.push({ width: 0.3, char: '▒', label: 'Kerb L', color: 'gray' })
        if (unsealedL > 0) segments.push({ width: unsealedL, char: '░', label: 'Unsealed L', color: 'brown' })
        if (sealedL > 0) segments.push({ width: sealedL, char: '▓', label: 'Sealed L', color: 'gray' })
        segments.push({ width: trafficable, char: '█', label: 'Trafficable', color: 'blue' })
        if (sealedR > 0) segments.push({ width: sealedR, char: '▓', label: 'Sealed R', color: 'gray' })
        if (unsealedR > 0) segments.push({ width: unsealedR, char: '░', label: 'Unsealed R', color: 'brown' })
        if (hasKerbR) segments.push({ width: 0.3, char: '▒', label: 'Kerb R', color: 'gray' })
        
        // Build the visual bar
        let visualBar = '│'
        for (const seg of segments) {
          const charCount = Math.max(1, Math.round((seg.width / totalWidth) * barWidth))
          visualBar += seg.char.repeat(charCount)
        }
        visualBar += '│'
        
        lines.push('  ' + visualBar)
        lines.push('  └' + '─'.repeat(barWidth + 2) + '┘')
        lines.push('')
        
        // Legend and values
        lines.push('  Legend: ░ = Unsealed  ▒ = Kerb  ▓ = Sealed Shoulder  █ = Trafficable')
        lines.push('')

        if (hasKerbL) {
          lines.push(`  Kerb (Left):           ${p.kerb_l}`)
        }
        if (unsealedL > 0) {
          lines.push(`  Unsealed Shoulder (L): ${unsealedL.toFixed(1)} m`)
        }
        if (sealedL > 0) {
          lines.push(`  Sealed Shoulder (L):   ${sealedL.toFixed(1)} m`)
        }
        lines.push(`  Trafficable Width:     ${trafficable.toFixed(1)} m`)
        if (sealedR > 0) {
          lines.push(`  Sealed Shoulder (R):   ${sealedR.toFixed(1)} m`)
        }
        if (unsealedR > 0) {
          lines.push(`  Unsealed Shoulder (R): ${unsealedR.toFixed(1)} m`)
        }
        if (hasKerbR) {
          lines.push(`  Kerb (Right):          ${p.kerb_r}`)
        }
        lines.push('')
        if (p.total_pave_width) {
          lines.push(`  Total Pave Width: ${p.total_pave_width.toFixed(1)} m`)
        }
        if (p.total_seal_width) {
          lines.push(`  Total Seal Width: ${p.total_seal_width.toFixed(1)} m`)
        }
      }
    }
    lines.push('')
    
    // === SPEED ZONES ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('🚦 SPEED ZONES')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (result?.speed_zones) {
      lines.push(`Approach Start:   ${result.speed_zones.approach_start}`)
      lines.push(`TC Start:         ${result.speed_zones.tc_start}`)
      lines.push(`Work Zone Start:  ${result.speed_zones.work_zone_start}`)
      lines.push(`Work Zone End:    ${result.speed_zones.work_zone_end}`)
      lines.push(`TC End:           ${result.speed_zones.tc_end}`)
      lines.push(`Approach End:     ${result.speed_zones.approach_end}`)
    } else {
      lines.push('No speed zone data available')
    }
    lines.push('')
    
    // === TC POSITIONS ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('👷 TC POSITIONS (±100m from work zone)')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (result?.tc_positions) {
      lines.push('')
      lines.push('TC START:')
      lines.push(`  SLK:            ${result.tc_positions.start_slk.toFixed(3)} km`)
      if (result.tc_positions.start) {
        lines.push(`  Coordinates:    ${result.tc_positions.start.lat.toFixed(6)}, ${result.tc_positions.start.lon.toFixed(6)}`)
        lines.push(`  Speed:          ${result.tc_positions.start.speed}`)
      }
      if (result.google_maps?.tc_start) {
        lines.push(`  Google Maps:    ${result.google_maps.tc_start}`)
      }
      lines.push('')
      lines.push('TC END:')
      lines.push(`  SLK:            ${result.tc_positions.end_slk.toFixed(3)} km`)
      if (result.tc_positions.end) {
        lines.push(`  Coordinates:    ${result.tc_positions.end.lat.toFixed(6)}, ${result.tc_positions.end.lon.toFixed(6)}`)
        lines.push(`  Speed:          ${result.tc_positions.end.speed}`)
      }
      if (result.google_maps?.tc_end) {
        lines.push(`  Google Maps:    ${result.google_maps.tc_end}`)
      }
    }
    lines.push('')
    
    // === SIGNAGE CORRIDOR ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('🚸 SIGNAGE CORRIDOR (±700m)')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (signageCorridor && signageCorridor.length > 0 && result) {
      // Calculate corridor bounds for ±700m filtering
      const workZoneStart = result.work_zone.start_slk
      const workZoneEnd = result.work_zone.end_slk || result.work_zone.start_slk
      const corridorStart = workZoneStart - 0.7
      const corridorEnd = workZoneEnd + 0.7
      
      // Filter all signage to corridor bounds
      const corridorSignage = signageCorridor.filter(s => 
        s.slk >= corridorStart && s.slk <= corridorEnd
      )
      
      // Group by category
      const speedSigns = corridorSignage.filter(s => s.category === 'speed')
      const warningSigns = corridorSignage.filter(s => s.category === 'warning')
      const railCrossings = corridorSignage.filter(s => s.category === 'railway')
      
      // Intersections: ±100m from work zone (different from signage)
      const nearbyIntersections = signageCorridor.filter(s => {
        if (s.category !== 'intersection') return false
        return s.slk >= (workZoneStart - 0.1) && s.slk <= (workZoneEnd + 0.1)
      })
      
      if (speedSigns.length > 0) {
        lines.push('')
        lines.push('Speed Restriction Signs:')
        speedSigns.forEach(s => {
          lines.push(`  • SLK ${s.slk.toFixed(2)}: ${s.sign_type} - ${s.description} (${s.action})`)
          if (s.speedLimit) lines.push(`    Speed: ${s.speedLimit} km/h`)
        })
      }
      
      if (warningSigns.length > 0) {
        lines.push('')
        lines.push('Warning Signs:')
        warningSigns.forEach(s => {
          lines.push(`  • SLK ${s.slk.toFixed(2)}: ${s.sign_type} - ${s.description}`)
        })
      }
      
      if (railCrossings.length > 0) {
        lines.push('')
        lines.push('Rail Crossings:')
        railCrossings.forEach(s => {
          lines.push(`  • SLK ${s.slk.toFixed(2)}: ${s.description}`)
        })
      }
      
      if (nearbyIntersections.length > 0) {
        lines.push('')
        lines.push('Intersections (within ±100m of work zone):')
        nearbyIntersections.forEach(s => {
          lines.push(`  • SLK ${s.slk.toFixed(2)}: ${s.description}`)
        })
      }
      
      // Count total items (corridor signage + nearby intersections)
      const totalItems = corridorSignage.length + nearbyIntersections.length
      lines.push('')
      lines.push(`Total items in corridor: ${totalItems}`)
    } else {
      lines.push('No signage data available')
    }
    lines.push('')
    
    // === WEATHER ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('🌤️ WEATHER')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (weather) {
      lines.push(`Location:         ${weather.location}`)
      lines.push('')
      lines.push('Current Conditions:')
      lines.push(`  Temperature:    ${weather.current.temp}°C`)
      lines.push(`  Condition:      ${weather.current.condition}`)
      lines.push(`  Humidity:       ${weather.current.humidity}%`)
      lines.push(`  Wind:           ${weather.current.windSpeed} km/h ${weather.current.windDir}`)
      lines.push(`  Wind Gust:      ${weather.current.windGust} km/h`)
      if (weather.current.windGust >= windGustThreshold) {
        lines.push(`  ⚠️ HIGH WIND GUST ALERT (threshold: ${windGustThreshold} km/h)`)
      }
      lines.push('')
      lines.push('Sun Data:')
      lines.push(`  Sunrise:        ${weather.sun.sunrise}`)
      lines.push(`  Sunset:         ${weather.sun.sunset}`)
      lines.push(`  Daylight:       ${weather.sun.daylightHours}`)
      lines.push(`  UV Index:       ${weather.sun.uvIndex} (${weather.sun.uvLevel})`)
    } else {
      lines.push('No weather data available')
    }
    lines.push('')
    
    // === WEATHER WARNINGS ===
    if (warnings && warnings.count > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      lines.push('⚠️ WEATHER WARNINGS')
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      warnings.warnings.forEach((w, i) => {
        lines.push(`${i + 1}. ${w.title}`)
        if (w.description) {
          lines.push(`   ${w.description.substring(0, 100)}...`)
        }
        lines.push(`   Link: ${w.link}`)
        lines.push('')
      })
    }
    
    // === TRAFFIC VOLUME ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('🚗 TRAFFIC VOLUME')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (traffic) {
      lines.push(`AADT:             ${traffic.aadt?.toLocaleString() || 'N/A'} vehicles/day`)
      lines.push(`Peak Hour:        ${traffic.peak_hour_volume || 'N/A'} vehicles/hour`)
      lines.push(`Heavy Vehicles:   ${traffic.heavy_vehicle_percent}%`)
      lines.push(`Data Year:        ${traffic.aadt_year}`)
      if (traffic.distance_to_site !== undefined) {
        lines.push(`Count Site:       ${traffic.distance_to_site} km from work zone`)
      }
      lines.push(`Source:           ${traffic.source}`)
    } else {
      lines.push('No traffic data available')
    }
    lines.push('')
    
    // === NEARBY AMENITIES ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('🏥 NEARBY AMENITIES')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (places) {
      if (places.hospital) {
        lines.push('')
        lines.push('Hospital:')
        lines.push(`  Name:           ${places.hospital.name}`)
        lines.push(`  Distance:       ${places.hospital.distance} km`)
        if (places.hospital.phone) {
          lines.push(`  Phone:          ${places.hospital.phone}`)
        }
        if (places.hospital.isEmergency) {
          lines.push(`  Emergency:      Yes`)
        }
      }
      if (places.fuelStation) {
        lines.push('')
        lines.push('Fuel Station:')
        lines.push(`  Name:           ${places.fuelStation.name}`)
        lines.push(`  Distance:       ${places.fuelStation.distance} km`)
      }
      if (places.toilet) {
        lines.push('')
        lines.push('Public Toilet:')
        lines.push(`  Name:           ${places.toilet.name}`)
        lines.push(`  Distance:       ${places.toilet.distance} km`)
      }
      if (!places.hospital && !places.fuelStation && !places.toilet) {
        lines.push('No amenities found nearby')
      }
    } else {
      lines.push('No amenities data available')
    }
    lines.push('')
    
    // === INTERSECTING ROADS ===
    if (crossRoads && crossRoads.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      lines.push('🔀 INTERSECTING ROADS IN TC ZONE')
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      crossRoads
        .filter(road => result && road.name.toLowerCase() !== result.road_name.toLowerCase())
        .forEach(road => {
          lines.push(`• ${road.name} (${road.roadType}) - ${road.distance} km from TC start`)
        })
      lines.push('')
      lines.push('⚠️ Consider TC coverage for these intersecting roads')
      lines.push('')
    }
    
    // === GOOGLE MAPS LINKS ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('🗺️ GOOGLE MAPS LINKS')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    if (result?.google_maps) {
      if (result.google_maps.work_zone_start) {
        lines.push(`Work Zone Start: ${result.google_maps.work_zone_start}`)
      }
      if (result.google_maps.work_zone_end) {
        lines.push(`Work Zone End:   ${result.google_maps.work_zone_end}`)
      }
    }
    lines.push('')
    
    // Footer
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('Report generated by TC Work Zone Locator')
    lines.push('Data sources: MRWA Open Data, Open-Meteo Weather, OpenStreetMap')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Store text version for clipboard/download
    setReportContent(lines.join('\n'))
    
    // Generate HTML report for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print the report')
      setReportGenerating(false)
      return
    }
    
    // Helper for road width visual bar
    const generateWidthBar = () => {
      if (!result?.pavement?.total_pave_width) return ''
      const p = result.pavement
      const totalWidth = p.total_pave_width || 1 // Already guarded above, but TS needs fallback
      const unsealedL = p.unsealed_shoulder_l || 0
      const sealedL = p.sealed_shoulder_l || 0
      const trafficable = p.width_m || 0
      const sealedR = p.sealed_shoulder_r || 0
      const unsealedR = p.unsealed_shoulder_r || 0

      const pctUnsealedL = (unsealedL / totalWidth) * 100
      const pctSealedL = (sealedL / totalWidth) * 100
      const pctTrafficable = (trafficable / totalWidth) * 100
      const pctSealedR = (sealedR / totalWidth) * 100
      const pctUnsealedR = (unsealedR / totalWidth) * 100

      return `
        <div class="width-bar">
          ${unsealedL > 0 ? `<div class="width-segment unsealed" style="width: ${pctUnsealedL}%" title="Unsealed L: ${unsealedL.toFixed(1)}m"></div>` : ''}
          ${sealedL > 0 ? `<div class="width-segment sealed" style="width: ${pctSealedL}%" title="Sealed L: ${sealedL.toFixed(1)}m"></div>` : ''}
          <div class="width-segment trafficable" style="width: ${pctTrafficable}%" title="Trafficable: ${trafficable.toFixed(1)}m">${trafficable.toFixed(1)}m</div>
          ${sealedR > 0 ? `<div class="width-segment sealed" style="width: ${pctSealedR}%" title="Sealed R: ${sealedR.toFixed(1)}m"></div>` : ''}
          ${unsealedR > 0 ? `<div class="width-segment unsealed" style="width: ${pctUnsealedR}%" title="Unsealed R: ${unsealedR.toFixed(1)}m"></div>` : ''}
        </div>
        <div class="width-legend">
          ${unsealedL > 0 ? `<span class="legend-item"><span class="legend-color unsealed"></span>Unsealed ${unsealedL.toFixed(1)}m</span>` : ''}
          ${sealedL > 0 ? `<span class="legend-item"><span class="legend-color sealed"></span>Sealed ${sealedL.toFixed(1)}m</span>` : ''}
          <span class="legend-item"><span class="legend-color trafficable"></span>Lanes ${trafficable.toFixed(1)}m</span>
          ${sealedR > 0 ? `<span class="legend-item"><span class="legend-color sealed"></span>Sealed ${sealedR.toFixed(1)}m</span>` : ''}
          ${unsealedR > 0 ? `<span class="legend-item"><span class="legend-color unsealed"></span>Unsealed ${unsealedR.toFixed(1)}m</span>` : ''}
        </div>
      `
    }

    // Helper for lane direction diagram
    const generateLaneDirection = () => {
      if (!result?.pavement?.lanes || result.pavement.lanes === 0) return ''
      const lanes = result.pavement.lanes
      const cwy = result.pavement.cwy || 'Single'

      // Determine lanes per direction
      let lanesIncreasing = 0  // → toward higher SLK
      let lanesDecreasing = 0  // ← toward lower SLK

      if (cwy === 'Single') {
        lanesIncreasing = Math.ceil(lanes / 2)
        lanesDecreasing = Math.floor(lanes / 2)
      } else if (cwy === 'Left') {
        lanesIncreasing = lanes
        lanesDecreasing = 0
      } else if (cwy === 'Right') {
        lanesIncreasing = 0
        lanesDecreasing = lanes
      }

      // Build lane segments
      const laneSegments: string[] = []
      let incNum = 0
      let decNum = 0

      for (let i = 0; i < lanesIncreasing; i++) {
        incNum++
        laneSegments.push(`<div class="lane-segment increasing" title="Toward higher SLK (↑)"><span class="lane-arrow">↑</span>${lanes >= 3 ? `<span class="lane-num">L${incNum}</span>` : ''}</div>`)
      }
      for (let i = 0; i < lanesDecreasing; i++) {
        decNum++
        const laneNum = lanesDecreasing - i
        laneSegments.push(`<div class="lane-segment decreasing" title="Toward lower SLK (↓)"><span class="lane-arrow">↓</span>${lanes >= 3 ? `<span class="lane-num">L${laneNum}</span>` : ''}</div>`)
      }

      // Direction explanation
      let explanation = ''
      if (cwy === 'Single') {
        if (lanes % 2 !== 0) {
          explanation = `⚠️ Odd lane count - allocation uncertain. Assuming ${lanesIncreasing} lane(s) INCREASING, ${lanesDecreasing} lane(s) DECREASING`
        } else {
          explanation = `${lanesIncreasing} lane(s) toward INCREASING SLK, ${lanesDecreasing} lane(s) toward DECREASING SLK`
        }
      } else if (cwy === 'Left') {
        explanation = 'Left carriageway: all lanes travel toward INCREASING SLK'
      } else {
        explanation = 'Right carriageway: all lanes travel toward DECREASING SLK'
      }

      return `
        <h3>Lane Directions (${lanes} lanes total)</h3>
        <div class="lane-diagram">
          ${laneSegments.join('')}
        </div>
        <div class="lane-legend">
          <span class="legend-item"><span class="legend-color lane-inc"></span>↑ INCREASING SLK (${lanesIncreasing} lane${lanesIncreasing !== 1 ? 's' : ''})</span>
          <span class="legend-item"><span class="legend-color lane-dec"></span>DECREASING SLK (${lanesDecreasing} lane${lanesDecreasing !== 1 ? 's' : ''}) ↓</span>
        </div>
        <p style="font-size: 10px; color: #6b7280; font-style: italic; margin-top: 8px;">${explanation}</p>
      `
    }
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Work Zone Report - ${result?.road_id || 'Unknown'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
      padding: 20px; 
      font-size: 12px; 
      color: #333;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 20px; margin-bottom: 5px; color: #1e40af; }
    h2 { font-size: 14px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; }
    h3 { font-size: 12px; margin-top: 10px; margin-bottom: 5px; color: #374151; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
    .header p { color: #6b7280; font-size: 11px; }
    .section { margin-bottom: 15px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .stat { background: #f9fafb; padding: 10px; border-radius: 6px; }
    .stat-label { color: #6b7280; font-size: 10px; text-transform: uppercase; }
    .stat-value { font-size: 16px; font-weight: 600; margin-top: 2px; }
    .stat-value.large { font-size: 24px; }
    .road-id { font-family: monospace; font-size: 14px; color: #059669; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; }
    .badge-alert { background: #fef3c7; color: #92400e; }
    .badge-warning { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .width-bar { display: flex; height: 30px; border-radius: 4px; overflow: hidden; margin: 10px 0; border: 1px solid #d1d5db; }
    .width-segment { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500; color: white; min-width: 30px; }
    .width-segment.unsealed { background: #92400e; }
    .width-segment.sealed { background: #6b7280; }
    .width-segment.trafficable { background: #1e40af; }
    .width-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #6b7280; }
    .legend-color { width: 12px; height: 12px; border-radius: 2px; }
    .legend-color.unsealed { background: #92400e; }
    .legend-color.sealed { background: #6b7280; }
    .legend-color.trafficable { background: #1e40af; }
    .legend-color.lane-inc { background: #3b82f6; }
    .legend-color.lane-dec { background: #eab308; }
    .lane-diagram { display: flex; height: 35px; border-radius: 4px; overflow: hidden; margin: 10px 0; border: 1px solid #d1d5db; }
    .lane-segment { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 1px solid #d1d5db; }
    .lane-segment:last-child { border-right: none; }
    .lane-segment.increasing { background: #3b82f6; }
    .lane-segment.decreasing { background: #ca8a04; }
    .lane-arrow { font-size: 16px; font-weight: bold; color: white; }
    .lane-num { font-size: 9px; color: rgba(255,255,255,0.8); }
    .lane-legend { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    .sign-speed { background: #dcfce7; }
    .sign-warning { background: #fef9c3; }
    .sign-rail { background: #fee2e2; }
    .sign-intersection { background: #f3e8ff; }
    .weather-current { background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%); padding: 15px; border-radius: 8px; margin: 10px 0; }
    .alert { padding: 10px; border-radius: 6px; margin: 10px 0; }
    .alert-warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .alert-danger { background: #fee2e2; border-left: 4px solid #ef4444; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 10px; }
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚧 TC Work Zone Report</h1>
    <p>Generated: ${timestamp}</p>
  </div>

  <!-- Work Zone Summary -->
  <h2>📍 Work Zone Summary</h2>
  <div class="section">
    <div class="grid">
      <div class="stat">
        <div class="stat-label">Road ID</div>
        <div class="stat-value road-id">${result?.road_id || 'N/A'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Road Name</div>
        <div class="stat-value">${result?.road_name || 'N/A'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Start SLK</div>
        <div class="stat-value">${result?.work_zone.start_slk.toFixed(2) || 'N/A'} km</div>
      </div>
      <div class="stat">
        <div class="stat-label">End SLK</div>
        <div class="stat-value">${result?.work_zone.end_slk.toFixed(2) || 'N/A'} km</div>
      </div>
      <div class="stat">
        <div class="stat-label">Zone Length</div>
        <div class="stat-value">${result?.work_zone.length_m || 'N/A'} m</div>
      </div>
      <div class="stat">
        <div class="stat-label">Carriageway</div>
        <div class="stat-value">${result?.carriageway || 'N/A'}</div>
      </div>
      ${result?.pavement?.lanes ? `
      <div class="stat">
        <div class="stat-label">Lanes</div>
        <div class="stat-value">${result.pavement.lanes}</div>
      </div>
      ` : ''}
      ${result?.pavement?.width_m ? `
      <div class="stat">
        <div class="stat-label">Road Width</div>
        <div class="stat-value">${result.pavement.width_m} m</div>
      </div>
      ` : ''}
    </div>
    
    ${result?.pavement?.total_pave_width ? `
    <h3>Road Width Breakdown (Total: ${result.pavement.total_pave_width.toFixed(1)}m)</h3>
    ${generateWidthBar()}
    ` : ''}
    
    ${generateLaneDirection()}
  </div>

  <!-- Speed Zones -->
  <h2>🚦 Speed Zones</h2>
  <div class="section">
    ${result?.speed_zones ? `
    <table>
      <tr><th>Zone</th><th>Speed</th></tr>
      <tr><td>Approach Start</td><td><strong>${result.speed_zones.approach_start}</strong></td></tr>
      <tr><td>TC Start</td><td><strong>${result.speed_zones.tc_start}</strong></td></tr>
      <tr><td>Work Zone Start</td><td><strong>${result.speed_zones.work_zone_start}</strong></td></tr>
      <tr><td>Work Zone End</td><td><strong>${result.speed_zones.work_zone_end}</strong></td></tr>
      <tr><td>TC End</td><td><strong>${result.speed_zones.tc_end}</strong></td></tr>
      <tr><td>Approach End</td><td><strong>${result.speed_zones.approach_end}</strong></td></tr>
    </table>
    ` : '<p style="color: #9ca3af;">No speed zone data available</p>'}
  </div>

  <!-- TC Positions -->
  <h2>👷 TC Positions (±100m from work zone)</h2>
  <div class="section">
    <div class="grid">
      <div class="stat">
        <div class="stat-label">TC Start</div>
        <div class="stat-value">SLK ${result?.tc_positions.start_slk.toFixed(3) || 'N/A'} km</div>
        ${result?.tc_positions.start ? `<p style="font-size: 10px; color: #6b7280; margin-top: 4px;">${result.tc_positions.start.lat.toFixed(6)}, ${result.tc_positions.start.lon.toFixed(6)}</p>` : ''}
      </div>
      <div class="stat">
        <div class="stat-label">TC End</div>
        <div class="stat-value">SLK ${result?.tc_positions.end_slk.toFixed(3) || 'N/A'} km</div>
        ${result?.tc_positions.end ? `<p style="font-size: 10px; color: #6b7280; margin-top: 4px;">${result.tc_positions.end.lat.toFixed(6)}, ${result.tc_positions.end.lon.toFixed(6)}</p>` : ''}
      </div>
    </div>
  </div>

  <!-- Signage Corridor -->
  <h2>🚸 Signage in Corridor (±700m)</h2>
  <div class="section">
    ${signageCorridor && signageCorridor.length > 0 ? (() => {
        // Calculate corridor bounds for ±700m filtering
        const workZoneStart = result?.work_zone?.start_slk || 0;
        const workZoneEnd = result?.work_zone?.end_slk || workZoneStart;
        const corridorStart = workZoneStart - 0.7;
        const corridorEnd = workZoneEnd + 0.7;
        
        // Filter all signage to corridor bounds
        const corridorSignage = signageCorridor.filter(s => 
          s.slk >= corridorStart && s.slk <= corridorEnd
        );
        
        const railCrossings = corridorSignage.filter(s => s.category === 'railway');
        const speedSigns = corridorSignage.filter(s => s.category === 'speed');
        const warningSigns = corridorSignage.filter(s => s.category === 'warning');
        
        // Intersections: ±100m from work zone
        const nearbyIntersections = signageCorridor.filter(s => {
          if (s.category !== 'intersection') return false;
          return s.slk >= (workZoneStart - 0.1) && s.slk <= (workZoneEnd + 0.1);
        });
        
        const totalItems = corridorSignage.length + nearbyIntersections.length;
        
        return `
      ${railCrossings.length > 0 ? `
      <h3>🚂 Railway Crossings</h3>
      <table>
        <tr><th>SLK</th><th>Description</th><th>Action</th></tr>
        ${railCrossings.map(s => `
        <tr class="sign-rail">
          <td>${s.slk.toFixed(2)}</td>
          <td>${s.description}</td>
          <td>${s.action || ''}</td>
        </tr>
        `).join('')}
      </table>
      ` : ''}
      
      ${speedSigns.length > 0 ? `
      <h3>⚡ Speed Restriction Signs</h3>
      <table>
        <tr><th>SLK</th><th>Sign Type</th><th>Description</th><th>Action</th></tr>
        ${speedSigns.map(s => `
        <tr class="sign-speed">
          <td>${s.slk.toFixed(2)}</td>
          <td>${s.sign_type}</td>
          <td>${s.description}</td>
          <td>${s.action || ''}</td>
        </tr>
        `).join('')}
      </table>
      ` : ''}
      
      ${warningSigns.length > 0 ? `
      <h3>⚠️ Warning Signs</h3>
      <table>
        <tr><th>SLK</th><th>Sign Type</th><th>Description</th></tr>
        ${warningSigns.map(s => `
        <tr class="sign-warning">
          <td>${s.slk.toFixed(2)}</td>
          <td>${s.sign_type}</td>
          <td>${s.description}</td>
        </tr>
        `).join('')}
      </table>
      ` : ''}
      
      ${nearbyIntersections.length > 0 ? `
      <h3>🔀 Intersections (±100m of work zone)</h3>
      <table>
        <tr><th>SLK</th><th>Description</th><th>Action</th></tr>
        ${nearbyIntersections.map(s => `
        <tr class="sign-intersection">
          <td>${s.slk.toFixed(2)}</td>
          <td>${s.description}</td>
          <td>${s.action || ''}</td>
        </tr>
        `).join('')}
      </table>
      ` : ''}
      
      <p style="color: #6b7280; margin-top: 10px;">Total items in corridor: ${totalItems}</p>
        `;
      })() : '<p style="color: #9ca3af;">No signage data available for this corridor</p>'}
  </div>

  <!-- Weather -->
  <h2>🌤️ Weather - ${weather?.location || 'N/A'}</h2>
  <div class="section">
    ${weather ? `
      ${warnings && warnings.count > 0 ? `
      <div class="alert alert-warning">
        <strong>⚠️ ${warnings.count} Weather Warning${warnings.count !== 1 ? 's' : ''} Active</strong>
        <ul style="margin-top: 5px; margin-left: 20px;">
          ${warnings.warnings.slice(0, 3).map(w => `<li>${w.title}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
      
      ${weather.current.windGust >= windGustThreshold ? `
      <div class="alert alert-danger">
        <strong>💨 High Wind Gust Alert: ${weather.current.windGust} km/h</strong>
        <p style="margin-top: 4px;">Threshold: ${windGustThreshold} km/h - Exercise caution with traffic control devices</p>
      </div>
      ` : ''}
      
      <div class="weather-current">
        <div class="grid-3">
          <div>
            <div class="stat-label">Sunrise</div>
            <div style="font-size: 14px; font-weight: 600;">🌅 ${weather.sun.sunrise}</div>
          </div>
          <div>
            <div class="stat-label">Sunset</div>
            <div style="font-size: 14px; font-weight: 600;">🌇 ${weather.sun.sunset}</div>
          </div>
          <div>
            <div class="stat-label">Daylight</div>
            <div style="font-size: 14px; font-weight: 600;">☀️ ${weather.sun.daylightHours}</div>
          </div>
        </div>
      </div>
      
      <div class="grid">
        <div class="stat">
          <div class="stat-label">Temperature</div>
          <div class="stat-value">${weather.current.temp}°C</div>
        </div>
        <div class="stat">
          <div class="stat-label">Condition</div>
          <div class="stat-value">${weather.current.condition}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Wind</div>
          <div class="stat-value">${weather.current.windSpeed} km/h ${weather.current.windDir}</div>
          <p style="font-size: 10px; color: ${weather.current.windGust >= windGustThreshold ? '#dc2626' : '#6b7280'};">
            Gusts: ${weather.current.windGust} km/h
          </p>
        </div>
        <div class="stat">
          <div class="stat-label">Humidity</div>
          <div class="stat-value">${weather.current.humidity}%</div>
        </div>
        <div class="stat">
          <div class="stat-label">UV Index</div>
          <div class="stat-value">${weather.sun.uvIndex} (${weather.sun.uvLevel})</div>
        </div>
      </div>
    ` : '<p style="color: #9ca3af;">No weather data available</p>'}
  </div>

  <!-- Traffic Volume -->
  <h2>🚗 Traffic Volume</h2>
  <div class="section">
    ${traffic ? `
    <div class="grid">
      <div class="stat">
        <div class="stat-label">AADT</div>
        <div class="stat-value">${traffic.aadt?.toLocaleString() || 'N/A'}</div>
        <p style="font-size: 10px; color: #6b7280;">vehicles/day</p>
      </div>
      <div class="stat">
        <div class="stat-label">Peak Hour</div>
        <div class="stat-value">${traffic.peak_hour_volume || 'N/A'}</div>
        <p style="font-size: 10px; color: #6b7280;">vehicles/hour</p>
      </div>
      <div class="stat">
        <div class="stat-label">Heavy Vehicles</div>
        <div class="stat-value">${traffic.heavy_vehicle_percent}%</div>
      </div>
      <div class="stat">
        <div class="stat-label">Data Year</div>
        <div class="stat-value">${traffic.aadt_year}</div>
      </div>
    </div>
    <p style="color: #6b7280; margin-top: 8px; font-size: 10px;">Source: ${traffic.source}</p>
    ` : '<p style="color: #9ca3af;">No traffic data available</p>'}
  </div>

  <!-- Nearby Amenities -->
  <h2>🏥 Nearby Amenities</h2>
  <div class="section">
    <div class="grid">
      ${places?.hospital ? `
      <div class="stat">
        <div class="stat-label">🏥 Hospital</div>
        <div style="font-weight: 600;">${places.hospital.name}</div>
        <p style="font-size: 10px; color: #6b7280;">${places.hospital.distance} km away</p>
        ${places.hospital.isEmergency ? '<span class="badge badge-warning">Emergency</span>' : ''}
        ${places.hospital.phone ? `<p style="font-size: 10px; margin-top: 4px;">📞 ${places.hospital.phone}</p>` : ''}
      </div>
      ` : '<div class="stat"><p style="color: #9ca3af;">No hospital found</p></div>'}
      
      ${places?.fuelStation ? `
      <div class="stat">
        <div class="stat-label">⛽ Fuel Station</div>
        <div style="font-weight: 600;">${places.fuelStation.name}</div>
        <p style="font-size: 10px; color: #6b7280;">${places.fuelStation.distance} km away</p>
      </div>
      ` : '<div class="stat"><p style="color: #9ca3af;">No fuel station found</p></div>'}
      
      ${places?.toilet ? `
      <div class="stat">
        <div class="stat-label">🚻 Public Toilet</div>
        <div style="font-weight: 600;">${places.toilet.name}</div>
        <p style="font-size: 10px; color: #6b7280;">${places.toilet.distance} km away</p>
      </div>
      ` : '<div class="stat"><p style="color: #9ca3af;">No toilet found</p></div>'}
    </div>
  </div>

  <!-- Intersecting Roads -->
  ${crossRoads && crossRoads.filter(road => result && road.name.toLowerCase() !== result.road_name.toLowerCase()).length > 0 ? `
  <h2>🔀 Intersecting Roads in TC Zone</h2>
  <div class="section">
    <table>
      <tr><th>Road Name</th><th>Type</th><th>Distance</th></tr>
      ${crossRoads
        .filter(road => result && road.name.toLowerCase() !== result.road_name.toLowerCase())
        .map(road => `
        <tr>
          <td>${road.name}</td>
          <td>${road.roadType}</td>
          <td>${road.distance} km from TC start</td>
        </tr>
        `).join('')}
    </table>
    <div class="alert alert-warning" style="margin-top: 10px;">
      ⚠️ Consider TC coverage for these intersecting roads
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Report generated by TC Work Zone Locator vRC 1.7.13</p>
    <p>Data sources: MRWA Open Data, Open-Meteo Weather, OpenStreetMap</p>
  </div>
</body>
</html>`
    
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
    
    // Still show modal for copy/download options
    setShowReportModal(true)
    setReportGenerating(false)
  }

  const generateDebugInfo = async () => {
    const lines: string[] = []
    lines.push('=== TC Work Zone Locator Debug Info ===')
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push(`Version: 4.0`)
    lines.push('')
    lines.push('=== Offline Data Status ===')
    lines.push(`Offline Ready: ${offlineReady}`)
    lines.push(`Offline Stats: ${JSON.stringify(offlineStats)}`)
    lines.push('')
    lines.push('=== Current Selection ===')
    lines.push(`Region: ${selectedRegion}`)
    lines.push(`Road ID: ${selectedRoad}`)
    lines.push(`Road Info: ${JSON.stringify(roadInfo)}`)
    lines.push(`Start SLK: ${startSlk}`)
    lines.push(`End SLK: ${endSlk}`)
    lines.push('')
    lines.push('=== GPS Location ===')
    lines.push(`GPS Lat: ${gpsLat}`)
    lines.push(`GPS Lon: ${gpsLon}`)
    lines.push(`GPS Road Info: ${JSON.stringify(gpsRoadInfo)}`)
    lines.push('')
    lines.push('=== Result ===')
    if (result) {
      lines.push(`Road ID: ${result.road_id}`)
      lines.push(`Road Name: ${result.road_name}`)
      lines.push(`Network Type: ${result.network_type}`)
      lines.push(`Work Zone: SLK ${result.work_zone.start_slk} - ${result.work_zone.end_slk}`)
      lines.push(`Carriageway: ${result.carriageway}`)
      if (result.pavement) {
        lines.push(`Lanes: ${result.pavement.lanes || 'Unknown'}`)
        lines.push(`Road Width: ${result.pavement.width_m ? result.pavement.width_m + ' m' : 'Unknown'}`)
      }
      lines.push(`Speed Zones: ${JSON.stringify(result.speed_zones)}`)
    } else {
      lines.push('No result')
    }
    lines.push('')
    lines.push('=== Error ===')
    lines.push(`Error: ${error || 'None'}`)
    lines.push('')
    lines.push('=== Weather ===')
    lines.push(JSON.stringify(weather, null, 2))
    lines.push('')
    lines.push('=== Traffic ===')
    lines.push(JSON.stringify(traffic, null, 2))
    
    setDebugInfo(lines.join('\n'))
    setShowDebug(true)
  }

  const fetchRegions = async () => {
    try {
      // Try IndexedDB first (works offline)
      const storedRegions = await getStoredRegions()
      if (storedRegions && storedRegions.length > 0) {
        setRegions(storedRegions)
        // Check for saved default region first
        const savedDefault = localStorage.getItem('defaultRegion')
        if (savedDefault && storedRegions.includes(savedDefault)) {
          setSelectedRegion(savedDefault)
        } else if (storedRegions.includes('Wheatbelt')) {
          setSelectedRegion('Wheatbelt')
        } else {
          setSelectedRegion(storedRegions[0])
        }
        setLoadingRegions(false)
        return // Exit early, no need to fetch from API
      }
      
      // OFFLINE CHECK: Skip API entirely if no internet connection
      // This prevents the app from hanging while waiting for network timeout
      if (!navigator.onLine) {
        console.log('Offline: Loading regions from static metadata.json')
        const metaResponse = await fetch('/data/metadata.json')
        if (metaResponse.ok) {
          const metaData = await metaResponse.json()
          if (metaData.regions && metaData.regions.length > 0) {
            setRegions(metaData.regions)
            const savedDefault = localStorage.getItem('defaultRegion')
            if (savedDefault && metaData.regions.includes(savedDefault)) {
              setSelectedRegion(savedDefault)
            } else if (metaData.regions.includes('Wheatbelt')) {
              setSelectedRegion('Wheatbelt')
            } else {
              setSelectedRegion(metaData.regions[0])
            }
          }
        }
        return
      }
      
      // Online: Try API with timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      try {
        const response = await fetch('/api/roads?action=regions', { signal: controller.signal })
        clearTimeout(timeoutId)
        const data = await response.json()
        
        // Check for API error response
        if (data.error) {
          console.error('API error fetching regions:', data.error)
          // Try to get regions from static metadata as fallback
          const metaResponse = await fetch('/data/metadata.json')
          if (metaResponse.ok) {
            const metaData = await metaResponse.json()
            if (metaData.regions && metaData.regions.length > 0) {
              setRegions(metaData.regions)
              const savedDefault = localStorage.getItem('defaultRegion')
              if (savedDefault && metaData.regions.includes(savedDefault)) {
                setSelectedRegion(savedDefault)
              } else {
                setSelectedRegion(metaData.regions[0])
              }
            }
          }
          return
        }
        
        if (data.regions && data.regions.length > 0) {
          setRegions(data.regions)
          // Check for saved default region first
          const savedDefault = localStorage.getItem('defaultRegion')
          if (savedDefault && data.regions.includes(savedDefault)) {
            setSelectedRegion(savedDefault)
          } else if (data.regions.includes('Wheatbelt')) {
            setSelectedRegion('Wheatbelt')
          } else {
            setSelectedRegion(data.regions[0])
          }
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        // API timed out or failed - fall back to static metadata
        console.log('API fetch failed, loading regions from static metadata.json')
        const metaResponse = await fetch('/data/metadata.json')
        if (metaResponse.ok) {
          const metaData = await metaResponse.json()
          if (metaData.regions && metaData.regions.length > 0) {
            setRegions(metaData.regions)
            const savedDefault = localStorage.getItem('defaultRegion')
            if (savedDefault && metaData.regions.includes(savedDefault)) {
              setSelectedRegion(savedDefault)
            } else if (metaData.regions.includes('Wheatbelt')) {
              setSelectedRegion('Wheatbelt')
            } else {
              setSelectedRegion(metaData.regions[0])
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load regions:', err)
      setError('Failed to load regions')
      // Try static metadata as last resort
      try {
        const metaResponse = await fetch('/data/metadata.json')
        if (metaResponse.ok) {
          const metaData = await metaResponse.json()
          if (metaData.regions && metaData.regions.length > 0) {
            setRegions(metaData.regions)
            setSelectedRegion(metaData.regions[0])
          }
        }
      } catch {
        // No regions available - user will only see Local option
      }
    } finally {
      setLoadingRegions(false)
    }
  }

  const fetchRoads = async (region: string) => {
    setLoadingRoads(true)
    // Only reset road selection if we're not restoring state
    if (!isRestoring.current) {
      setSelectedRoad('')
    }
    try {
      // Check toggle: ON = offline mode (try offline first, fallback to online)
      // OFF = online mode (try online first, fallback to offline)
      if (offlineToggles.roadsList) {
        // OFFLINE MODE: Try IndexedDB first, fall back to API if not available
        const storedRoads = await getRoadsForRegion(region)
        if (storedRoads && storedRoads.length > 0) {
          setRoads(storedRoads)
        } else {
          // No offline data - check if we're online before trying API
          if (!navigator.onLine) {
            console.log('Offline: No roads data available')
            setError('No offline roads data. Download data first or connect to internet.')
            setRoads([])
          } else {
            // Online: Try API with timeout
            console.log('No offline roads data, falling back to online API')
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
            
            try {
              const response = await fetch(`/api/roads?action=list&region=${encodeURIComponent(region)}`, { signal: controller.signal })
              clearTimeout(timeoutId)
              if (response.ok) {
                const data = await response.json()
                setRoads(data.roads || [])
              } else {
                setError('No roads data available (offline or online)')
                setRoads([])
              }
            } catch {
              clearTimeout(timeoutId)
              setError('Failed to load roads - offline data not available and API unreachable')
              setRoads([])
            }
          }
        }
      } else {
        // ONLINE MODE: Try API first (with timeout), fall back to IndexedDB
        if (!navigator.onLine) {
          // Offline: Go straight to IndexedDB
          console.log('Offline: Loading roads from IndexedDB')
          const storedRoads = await getRoadsForRegion(region)
          if (storedRoads && storedRoads.length > 0) {
            setRoads(storedRoads)
          } else {
            setError('No offline roads data. Download data first or connect to internet.')
            setRoads([])
          }
        } else {
          // Online: Try API with timeout
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
          
          try {
            const response = await fetch(`/api/roads?action=list&region=${encodeURIComponent(region)}`, { signal: controller.signal })
            clearTimeout(timeoutId)
            if (response.ok) {
              const data = await response.json()
              setRoads(data.roads || [])
            } else {
              // API failed, try IndexedDB fallback
              const storedRoads = await getRoadsForRegion(region)
              setRoads(storedRoads || [])
            }
          } catch {
            clearTimeout(timeoutId)
            // API failed, try IndexedDB fallback
            const storedRoads = await getRoadsForRegion(region)
            setRoads(storedRoads || [])
          }
        }
      }
    } catch (err) {
      setError('Failed to load roads')
    } finally {
      setLoadingRoads(false)
    }
  }

  useEffect(() => {
    if (selectedRoad) {
      const road = roads.find(r => r.road_id === selectedRoad)
      setRoadInfo(road || null)
    } else {
      setRoadInfo(null)
    }
    // Only clear results if not restoring
    if (!isRestoring.current) {
      setResult(null)
      setWeather(null)
      setWarnings(null)
      setTraffic(null)
      setPlaces(null)
      setCrossRoads([])
      setError('')
    }
  }, [selectedRoad, roads])

  // When roads are loaded during restore, call getWorkZoneInfo
  useEffect(() => {
    if (pendingRestoreParams.current && roads.length > 0) {
      const params = pendingRestoreParams.current
      pendingRestoreParams.current = null
      
      // Small delay to ensure state is settled
      setTimeout(async () => {
        isRestoring.current = false
        await getWorkZoneInfo(params.region, params.roadId, params.startSlk, params.endSlk, false)
        setIsRestoringUI(false) // Show inputs are hidden by result now
      }, 100)
    }
  }, [roads])

  // Main function to get work zone info - can be called with parameters or from UI
  const getWorkZoneInfo = async (
    region: string,
    roadId: string,
    startSlkVal: string,
    endSlkVal: string,
    keepInfo: boolean = false
  ) => {
    if (!roadId) {
      setError('Select a road')
      return
    }
    if (!startSlkVal) {
      setError('Enter Start SLK')
      return
    }

    // Save parameters to sessionStorage if keepInfo is true
    if (keepInfo) {
      sessionStorage.setItem('workZoneParams', JSON.stringify({
        region,
        roadId,
        startSlk: startSlkVal,
        endSlk: endSlkVal
      }))
    }

    // Set state variables
    if (region && region !== selectedRegion) {
      setSelectedRegion(region)
    }
    setSelectedRoad(roadId)
    setStartSlk(startSlkVal)
    setEndSlk(endSlkVal)

    setLoading(true)
    setError('')
    setResult(null)
    setWeather(null)
    setWarnings(null)
    setTraffic(null)
    setPlaces(null)
    setCrossRoads([])
    
    // Track if this is a single point lookup (no end SLK provided)
    const singlePoint = !endSlkVal || endSlkVal === ''
    setIsSinglePoint(singlePoint)

    try {
      // Use end_slk if provided, otherwise same as start (single point)
      const endSlkValue = endSlkVal || startSlkVal
      const startSlkNum = parseFloat(startSlkVal)
      const endSlkNum = parseFloat(endSlkValue)
      
      let data: any = null

      // Check toggle: ON = offline mode (try offline first, fallback to online)
      // OFF = online mode (try online first, fallback to offline)
      if (offlineToggles.workZoneLookup) {
        // OFFLINE MODE: Try IndexedDB first, fall back to API if not found
        data = await getWorkZoneOffline(roadId, startSlkNum, endSlkNum)
        
        if (!data) {
          // No offline data, fall back to online API
          console.log('Road not found in offline data, falling back to online API')
          try {
            const response = await fetch('/api/roads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                road_id: roadId,
                start_slk: startSlkNum,
                end_slk: endSlkNum,
              }),
            })
            
            if (response.ok) {
              data = await response.json()
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
          })
          
          if (response.ok) {
            data = await response.json()
          } else {
            // API returned error, try offline fallback
            data = await getWorkZoneOffline(roadId, startSlkNum, endSlkNum)
          }
        } catch {
          // API failed, try offline fallback
          data = await getWorkZoneOffline(roadId, startSlkNum, endSlkNum)
        }
      }

      if (!data) {
        setError('Road not found')
        setLoading(false)
        return
      }

      setResult(data)
      
      // Fetch speed limit for this road at the start SLK
      fetchSpeedLimit(roadId, parseFloat(startSlkVal))
      
      // Fetch signage corridor for work zone
      fetchSignageCorridor(roadId, parseFloat(startSlkVal), endSlkValue ? parseFloat(endSlkValue) : undefined)
      
      // Fetch additional data using midpoint (only if online)
      if (data.midpoint) {
        fetchWeather(data.midpoint.lat, data.midpoint.lon)
        fetchWarnings() // BOM weather warnings for WA
        fetchTraffic(roadId, data.midpoint.lat, data.midpoint.lon)
        fetchPlaces(data.midpoint.lat, data.midpoint.lon)
      }
      // Fetch cross roads using TC corridor
      fetchCrossRoads(data)
    } catch (err) {
      setError('Failed to get location')
    } finally {
      setLoading(false)
    }
  }

  // Handle search from UI button - uses current state
  const handleSearch = async () => {
    await getWorkZoneInfo(selectedRegion, selectedRoad, startSlk, endSlk, true)
  }

  // Reset work zone info and return to default state
  const handleReset = () => {
    // Clear saved params from sessionStorage
    sessionStorage.removeItem('workZoneParams')
    sessionStorage.removeItem('workZoneState')
    
    // Reset all state
    setResult(null)
    setWeather(null)
    setWarnings(null)
    setTraffic(null)
    setPlaces(null)
    setCrossRoads([])
    setError('')
    setSelectedRegion('')
    setSelectedRoad('')
    setStartSlk('')
    setEndSlk('')
    setSpeedLimit(null)
    setIsSinglePoint(false)
    setGpsRoadInfo(null)
    setSignageCorridor([])
    setCorridorSpeedZones([])
    isRestoring.current = false
    pendingRestoreParams.current = null
    setIsRestoringUI(false)
  }

  // Look up speed limit for a road at a specific SLK
  const fetchSpeedLimit = async (roadId: string, slk: number) => {
    // Check toggle: ON = use offline data, OFF = skip (no online speed limit API)
    if (!offlineToggles.speedZones) {
      setSpeedLimit(null)
      return
    }
    
    try {
      const zones = await getSpeedZones(roadId)
      if (zones.length === 0) {
        setSpeedLimit(null)
        return
      }
      // Find the zone that contains this SLK
      const matchingZone = zones.find(z => slk >= z.start_slk && slk <= z.end_slk)
      if (matchingZone) {
        setSpeedLimit(matchingZone.speed_limit)
      } else {
        // Find nearest zone if not in any zone
        const sortedZones = [...zones].sort((a, b) => {
          const distA = Math.min(Math.abs(a.start_slk - slk), Math.abs(a.end_slk - slk))
          const distB = Math.min(Math.abs(b.start_slk - slk), Math.abs(b.end_slk - slk))
          return distA - distB
        })
        if (sortedZones.length > 0) {
          setSpeedLimit(sortedZones[0].speed_limit)
        }
      }
    } catch (err) {
      console.error('Error fetching speed limit:', err)
      setSpeedLimit(null)
    }
  }

  // Fetch signage corridor data for work zone
  const fetchSignageCorridor = async (roadId: string, startSlk: number, endSlk?: number) => {
    setSignageLoading(true)
    setSignageCorridor([])
    setCorridorSpeedZones([])
    
    try {
      // Calculate corridor bounds
      // If only start SLK: corridor is start-0.7 to start+0.7
      // If start and end SLK: corridor is start-0.7 to end+0.7
      const corridorStart = startSlk - 0.7
      const corridorEnd = (endSlk && endSlk > startSlk) ? endSlk + 0.7 : startSlk + 0.7
      
      // Fetch speed zones for the road (combines MRWA + community overrides)
      // This gives us actual zone extents, not just sign positions
      const speedZones = await getSpeedZones(roadId)
      // Filter to zones that overlap with the corridor (with extended margin for context)
      const corridorZones = speedZones.filter(zone => 
        zone.end_slk > (corridorStart - 0.5) && zone.start_slk < (corridorEnd + 0.5)
      )
      setCorridorSpeedZones(corridorZones)
      
      // getSignageInCorridor reads from IndexedDB (offline data source)
      // For reports, show ALL signage data regardless of toggles
      // The toggles control the main display, but reports should show everything available
      const signage = await getSignageInCorridor(roadId, corridorStart, corridorEnd)
      setSignageCorridor(signage)
    } catch (err) {
      console.error('Error fetching signage corridor:', err)
      setSignageCorridor([])
      setCorridorSpeedZones([])
    } finally {
      setSignageLoading(false)
    }
  }

  // Helper to get weather from cache (used for offline fallback)
  const getWeatherFromCache = (lat: number, lon: number): WeatherData | null => {
    // Try the utility function first (uses 'weatherCache' key)
    const cachedData = getCachedWeatherData(lat, lon, 24 * 60 * 60 * 1000) // Accept up to 24 hours old
    if (cachedData && cachedData.data) {
      return {
        ...cachedData.data,
        fromCache: true,
        cachedAt: cachedData.cached_at ? new Date(cachedData.cached_at).getTime() : undefined
      }
    }
    // Fallback to the old cache key for backwards compatibility
    const legacyCached = localStorage.getItem('cachedWeather')
    if (legacyCached) {
      try {
        const cachedData = JSON.parse(legacyCached)
        // Check if location is reasonably close (within 50km)
        if (cachedData.cachedLocation) {
          const dist = haversineDistance(lat, lon, cachedData.cachedLocation.lat, cachedData.cachedLocation.lon)
          if (dist > 50) return null // Too far from cached location
        }
        return { ...cachedData, fromCache: true }
      } catch {
        return null
      }
    }
    return null
  }

  const fetchWeather = async (lat: number, lon: number) => {
    // Check offline toggle first - ON = offline mode (use cached data only)
    if (offlineToggles.workZoneLookup) {
      // OFFLINE MODE: Use cached data only
      const cachedWeather = getWeatherFromCache(lat, lon)
      if (cachedWeather) {
        setWeather({
          ...cachedWeather,
          source: 'Offline: Cached weather data'
        })
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
            condition: 'No cached weather data - download required'
          },
          sun: {
            sunrise: 'N/A',
            sunset: 'N/A',
            daylightHours: 'N/A',
            uvIndex: 0,
            uvLevel: 'N/A'
          },
          forecast: [],
          fromCache: true,
          dataUnavailable: true,
          source: 'Offline: No cached data available'
        })
      }
      return
    }
    
    // ONLINE MODE: Fetch from API, fall back to cache
    // Also check navigator.onLine as a safety net
    if (!navigator.onLine) {
      const cachedWeather = getWeatherFromCache(lat, lon)
      if (cachedWeather) {
        setWeather({
          ...cachedWeather,
          source: 'Offline: Cached weather data (browser offline)'
        })
      } else {
        setWeather({
          location: 'Offline Mode',
          current: {
            temp: 0,
            humidity: 0,
            windSpeed: 0,
            windDir: '',
            windGust: 0,
            condition: 'Browser offline - no cached data'
          },
          sun: {
            sunrise: 'N/A',
            sunset: 'N/A',
            daylightHours: 'N/A',
            uvIndex: 0,
            uvLevel: 'N/A'
          },
          forecast: [],
          fromCache: true,
          dataUnavailable: true,
          source: 'Offline: Browser offline, no cached data'
        })
      }
      return
    }
    
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      const data = await response.json()
      if (response.ok) {
        // Cache weather data using the utility function
        cacheWeatherData(lat, lon, data, data.location)
        // Also cache in the old format for backwards compatibility
        data.cachedAt = Date.now()
        data.cachedLocation = { lat, lon }
        localStorage.setItem('cachedWeather', JSON.stringify(data))
        setWeather({
          ...data,
          source: 'Online: Open-Meteo API'
        })
      } else {
        // Try cached weather on API failure
        const cachedWeather = getWeatherFromCache(lat, lon)
        if (cachedWeather) {
          setWeather({
            ...cachedWeather,
            source: 'Cached (API unavailable)'
          })
        } else {
          setWeather({
            location: 'API Error',
            current: {
              temp: 0,
              humidity: 0,
              windSpeed: 0,
              windDir: '',
              windGust: 0,
              condition: 'Weather API unavailable - no cached data'
            },
            sun: {
              sunrise: 'N/A',
              sunset: 'N/A',
              daylightHours: 'N/A',
              uvIndex: 0,
              uvLevel: 'N/A'
            },
            forecast: [],
            dataUnavailable: true,
            source: 'Error: API unavailable, no cached data'
          })
        }
      }
    } catch (err) {
      // Try cached weather on network error
      const cachedWeather = getWeatherFromCache(lat, lon)
      if (cachedWeather) {
        setWeather({
          ...cachedWeather,
          source: 'Cached (network error)'
        })
      } else {
        setWeather({
          location: 'Network Error',
          current: {
            temp: 0,
            humidity: 0,
            windSpeed: 0,
            windDir: '',
            windGust: 0,
            condition: 'Network error - no cached data'
          },
          sun: {
            sunrise: 'N/A',
            sunset: 'N/A',
            daylightHours: 'N/A',
            uvIndex: 0,
            uvLevel: 'N/A'
          },
          forecast: [],
          dataUnavailable: true,
          source: 'Error: Network error, no cached data'
        })
      }
    }
  }

  const fetchTraffic = async (roadId: string, lat?: number, lon?: number) => {
    try {
      let url = `/api/traffic?road_id=${roadId}`
      if (lat && lon) {
        url += `&lat=${lat}&lon=${lon}`
      }
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        // Cache traffic data
        data.cachedAt = Date.now()
        localStorage.setItem(`traffic_${roadId}`, JSON.stringify(data))
        setTraffic(data)
      } else {
        // Try cached traffic on API failure
        const cached = localStorage.getItem(`traffic_${roadId}`)
        if (cached) {
          const cachedData = JSON.parse(cached)
          cachedData.fromCache = true
          setTraffic(cachedData)
        }
      }
    } catch (err) {
      // Try cached traffic on network error
      const cached = localStorage.getItem(`traffic_${roadId}`)
      if (cached) {
        const cachedData = JSON.parse(cached)
        cachedData.fromCache = true
        setTraffic(cachedData)
      }
    }
  }

  // Helper to get places from IndexedDB (used for offline fallback)
  const getPlacesFromIndexedDB = async (lat: number, lon: number): Promise<PlacesData | null> => {
    try {
      // Use 100km radius for rural WA (matching the online API behavior)
      const amenities = await findNearestAmenities(lat, lon, undefined, 100)
      if (amenities.hospital || amenities.fuelStation || amenities.toilet) {
        return {
          hospital: amenities.hospital ? {
            name: amenities.hospital.name,
            distance: amenities.hospital.distance?.toFixed(1) || '',
            lat: amenities.hospital.lat,
            lon: amenities.hospital.lon,
            phone: amenities.hospital.phone,
            address: amenities.hospital.address,
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${amenities.hospital.lat},${amenities.hospital.lon}`,
            isEmergency: amenities.hospital.emergency
          } : null,
          fuelStation: amenities.fuelStation ? {
            name: amenities.fuelStation.name,
            distance: amenities.fuelStation.distance?.toFixed(1) || '',
            lat: amenities.fuelStation.lat,
            lon: amenities.fuelStation.lon,
            phone: amenities.fuelStation.phone,
            address: amenities.fuelStation.address,
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${amenities.fuelStation.lat},${amenities.fuelStation.lon}`,
            isEmergency: false
          } : null,
          toilet: amenities.toilet ? {
            name: amenities.toilet.name,
            distance: amenities.toilet.distance?.toFixed(1) || '',
            lat: amenities.toilet.lat,
            lon: amenities.toilet.lon,
            phone: amenities.toilet.phone,
            address: amenities.toilet.address,
            googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${amenities.toilet.lat},${amenities.toilet.lon}`,
            isEmergency: false
          } : null,
          source: 'Offline: IndexedDB cached data',
          fromCache: true
        }
      }
    } catch (err) {
      console.log('Could not load amenities from IndexedDB:', err)
    }
    return null
  }

  const fetchPlaces = async (lat: number, lon: number) => {
    // Check offline toggle first - ON = offline mode (use cached data only)
    if (offlineToggles.workZoneLookup) {
      // OFFLINE MODE: Use IndexedDB data only
      const indexedDBPlaces = await getPlacesFromIndexedDB(lat, lon)
      if (indexedDBPlaces) {
        setPlaces({
          ...indexedDBPlaces,
          source: 'Offline: IndexedDB cached data'
        })
        return
      }
      
      // Fallback to localStorage cache
      const cached = localStorage.getItem('cachedPlaces')
      if (cached) {
        const cachedData = JSON.parse(cached)
        setPlaces({
          ...cachedData,
          fromCache: true,
          source: 'Offline: localStorage cached data'
        })
        return
      }
      
      // No cached data available - show clear indicator
      setPlaces({
        hospital: null,
        toilet: null,
        fuelStation: null,
        fromCache: true,
        dataUnavailable: true,
        source: 'Offline: No cached amenities data - download required'
      })
      return
    }
    
    // ONLINE MODE: Fetch from API, fall back to cache
    // Also check navigator.onLine as a safety net
    if (!navigator.onLine) {
      const indexedDBPlaces = await getPlacesFromIndexedDB(lat, lon)
      if (indexedDBPlaces) {
        setPlaces({
          ...indexedDBPlaces,
          source: 'Offline: IndexedDB cached data (browser offline)'
        })
        return
      }
      
      const cached = localStorage.getItem('cachedPlaces')
      if (cached) {
        const cachedData = JSON.parse(cached)
        setPlaces({
          ...cachedData,
          fromCache: true,
          source: 'Offline: localStorage cached data (browser offline)'
        })
        return
      }
      
      setPlaces({
        hospital: null,
        toilet: null,
        fuelStation: null,
        fromCache: true,
        dataUnavailable: true,
        source: 'Offline: Browser offline, no cached data'
      })
      return
    }
    
    // Online: fetch from API
    try {
      const response = await fetch(`/api/places?lat=${lat}&lon=${lon}`)
      const data = await response.json()
      if (response.ok) {
        // Cache places data
        data.cachedAt = Date.now()
        data.cachedLocation = { lat, lon }
        localStorage.setItem('cachedPlaces', JSON.stringify(data))
        setPlaces({
          ...data,
          source: 'Online: OpenStreetMap via Overpass API'
        })
      } else {
        // Try IndexedDB first on API failure, then localStorage
        const indexedDBPlaces = await getPlacesFromIndexedDB(lat, lon)
        if (indexedDBPlaces) {
          setPlaces({
            ...indexedDBPlaces,
            source: 'Cached (API unavailable)'
          })
          return
        }
        const cached = localStorage.getItem('cachedPlaces')
        if (cached) {
          const cachedData = JSON.parse(cached)
          setPlaces({
            ...cachedData,
            fromCache: true,
            source: 'Cached (API unavailable)'
          })
          return
        }
        setPlaces({
          hospital: null,
          toilet: null,
          fuelStation: null,
          dataUnavailable: true,
          source: 'Error: API unavailable, no cached data'
        })
      }
    } catch (err) {
      // Try IndexedDB first on network error, then localStorage
      const indexedDBPlaces = await getPlacesFromIndexedDB(lat, lon)
      if (indexedDBPlaces) {
        setPlaces({
          ...indexedDBPlaces,
          source: 'Cached (network error)'
        })
        return
      }
      const cached = localStorage.getItem('cachedPlaces')
      if (cached) {
        const cachedData = JSON.parse(cached)
        setPlaces({
          ...cachedData,
          fromCache: true,
          source: 'Cached (network error)'
        })
        return
      }
      setPlaces({
        hospital: null,
        toilet: null,
        fuelStation: null,
        dataUnavailable: true,
        source: 'Error: Network error, no cached data'
      })
    }
  }

  const fetchWarnings = async () => {
    try {
      const response = await fetch('/api/warnings')
      const data = await response.json()
      if (response.ok) setWarnings(data)
    } catch (err) {
      // Graceful degradation - warnings not critical
    }
  }

  const fetchCrossRoads = async (result: WorkZoneResult) => {
    try {
      // Use MRWA node-based intersection detection
      const response = await fetch(
        `/api/intersections?road_id=${result.road_id}&slk_start=${result.work_zone.start_slk}&slk_end=${result.work_zone.end_slk}`
      )
      const data = await response.json()
      if (response.ok) setCrossRoads(data.crossRoads || [])
    } catch (err) {}
  }

  // Get current GPS location from device
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by this browser')
      return
    }
    
    setLoadingGps(true)
    setGpsError('')
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLat(position.coords.latitude.toFixed(6))
        setGpsLon(position.coords.longitude.toFixed(6))
        setLoadingGps(false)
        // Auto-lookup the location
        lookupGpsLocation(position.coords.latitude, position.coords.longitude)
      },
      (err) => {
        setLoadingGps(false)
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError('Location permission denied. Please allow location access.')
            break
          case err.POSITION_UNAVAILABLE:
            setGpsError('Location information unavailable')
            break
          case err.TIMEOUT:
            setGpsError('Location request timed out')
            break
          default:
            setGpsError('An unknown error occurred')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Lookup road info from GPS coordinates
  const lookupGpsLocation = async (lat?: number, lon?: number) => {
    const latitude = lat ?? parseFloat(gpsLat)
    const longitude = lon ?? parseFloat(gpsLon)
    
    if (isNaN(latitude) || isNaN(longitude)) {
      setGpsError('Please enter valid coordinates')
      return
    }
    
    setLoadingGps(true)
    setGpsError('')
    
    try {
      const response = await fetch(`/api/gps?lat=${latitude}&lon=${longitude}`)
      const data = await response.json()
      
      if (!response.ok) {
        setGpsError(data.error || 'Location not found')
        setGpsRoadInfo(null)
      } else {
        // Store GPS road info
        setGpsRoadInfo({
          road_id: data.road_id,
          road_name: data.road_name,
          network_type: data.network_type,
          slk: data.slk
        })
        
        // Set the road and SLK from GPS lookup
        setSelectedRoad(data.road_id)
        setStartSlk(data.slk.toString())
        setEndSlk('') // Clear end SLK for single point
        
        // Set region based on road type
        if (data.network_type === 'Local Road') {
          setSelectedRegion('Local')
        }
        
        // Clear any previous error
        setGpsError('')
      }
    } catch (err) {
      setGpsError('Failed to lookup location')
      setGpsRoadInfo(null)
    } finally {
      setLoadingGps(false)
    }
  }

  const openGoogleMaps = (url: string | null) => {
    if (url) window.open(url, '_blank')
  }

  const openStreetView = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`, '_blank')
  }

  // Get emergency location for 000
  const getEmergencyLocation = () => {
    setEmergencyLoading(true)
    setShowEmergencyModal(true)
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        
        try {
          // Get road info from GPS
          const gpsResponse = await fetch(`/api/gps?lat=${lat}&lon=${lon}&radius=1000`)
          const gpsData = await gpsResponse.json()
          
          if (gpsData.road_id) {
            // Get intersections near current SLK
            const intResponse = await fetch(`/api/intersections?road_id=${gpsData.road_id}&slk_start=${Math.max(0, gpsData.slk - 5)}&slk_end=${gpsData.slk + 5}`)
            const intData = await intResponse.json()
            
            // Find nearest cross road
            let crossRoad: { name: string; distance: string; direction: string } | null = null
            if (intData.crossRoads && intData.crossRoads.length > 0) {
              // Sort by distance from current SLK and take nearest
              const sorted = [...intData.crossRoads].sort((a: any, b: any) => {
                const distA = Math.abs(parseFloat(a.distance) - gpsData.slk)
                const distB = Math.abs(parseFloat(b.distance) - gpsData.slk)
                return distA - distB
              })
              const nearest = sorted[0]
              const distanceM = Math.abs(parseFloat(nearest.distance) - gpsData.slk) * 1000
              const direction = parseFloat(nearest.distance) < gpsData.slk ? 'west' : 'east'
              // Format distance: use km if >= 1000m
              const distanceStr = distanceM >= 1000 
                ? `${(distanceM / 1000).toFixed(1).replace(/\.0$/, '')}km`
                : `${Math.round(distanceM)}m`
              crossRoad = {
                name: nearest.name,
                distance: distanceStr,
                direction
              }
            }
            
            setEmergencyData({
              roadName: gpsData.road_name || gpsData.road_id,
              slk: gpsData.slk,
              region: gpsData.region || 'Western Australia',
              locality: gpsData.locality || null,
              lat,
              lon,
              crossRoad,
              nearbyRoads: gpsData.nearby_roads || []
            })
          } else {
            // No road found, use GPS coordinates only
            setEmergencyData({
              roadName: 'Unknown Road',
              slk: 0,
              region: 'Western Australia',
              locality: null,
              lat,
              lon,
              crossRoad: null,
              nearbyRoads: []
            })
          }
        } catch (error) {
          console.error('Emergency location error:', error)
          // Fallback to GPS coordinates only
          setEmergencyData({
            roadName: 'Unknown Road',
            slk: 0,
            region: 'Western Australia',
            locality: null,
            lat,
            lon,
            crossRoad: null,
            nearbyRoads: []
          })
        }
        setEmergencyLoading(false)
      },
      (error) => {
        console.error('GPS error:', error)
        setEmergencyLoading(false)
        alert('Could not get your location. Please enable GPS.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const exportReport = async () => {
    if (!result) return
    
    setExporting(true)
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
          side_roads: crossRoads.filter(road => 
            road.name.toLowerCase() !== result.road_name.toLowerCase()
          ),
          amenities: places,
        }),
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `work-zone-${result.road_id}-${result.work_zone.start_slk.toFixed(2)}.txt`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  // Get UV level color
  const getUvColor = (level: string): string => {
    switch (level) {
      case 'Low': return 'text-green-400'
      case 'Moderate': return 'text-yellow-400'
      case 'High': return 'text-orange-400'
      case 'Very High': return 'text-red-400'
      case 'Extreme': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  // Start SLK tracking with autostart
  const startSlkTracking = () => {
    // Save current params to sessionStorage before navigating (if road is selected)
    if (selectedRoad && startSlk) {
      sessionStorage.setItem('workZoneParams', JSON.stringify({
        region: selectedRegion,
        roadId: selectedRoad,
        startSlk: startSlk,
        endSlk: endSlk
      }))
    }
    
    const params = new URLSearchParams()
    if (selectedRoad) {
      params.set('road_id', selectedRoad)
      params.set('road_name', roadInfo?.road_name || '')
      if (startSlk) params.set('slk', startSlk)
    }
    params.set('autostart', 'true')
    window.location.href = `/drive?${params.toString()}`
  }

  // ============ SET DISTANCE FUNCTIONS ============
  
  // Calculate distance between two GPS points in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    return haversineDistance(lat1, lon1, lat2, lon2)
  }
  
  // Start Set Distance tracking
  const startSetDistance = async () => {
    if (!navigator.geolocation) {
      alert('GPS not available')
      return
    }
    
    setSetDistanceActive(true)
    
    // Get current position to set as reference
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        
        setSetDistanceCurrentPos({ lat, lon })
        
        // Try to get road info for current position
        try {
          const response = await fetch(`/api/gps?lat=${lat}&lon=${lon}`)
          const data = await response.json()
          
          if (data.road_id && data.slk !== undefined) {
            // Set reference point
            setSetDistanceRefPoint({
              lat,
              lon,
              slk: data.slk,
              roadId: data.road_id,
              roadName: data.road_name || data.road_id
            })
            setDistanceRefPointRef.current = { lat, lon }
            setSetDistanceCurrentSlk(data.slk)
            setSetDistanceCurrentRoad({
              roadId: data.road_id,
              roadName: data.road_name || data.road_id
            })
          } else {
            // No road found, just use GPS position
            setSetDistanceRefPoint({
              lat,
              lon,
              slk: 0,
              roadId: null,
              roadName: null
            })
            setDistanceRefPointRef.current = { lat, lon }
          }
        } catch (err) {
          // Use GPS position without road info
          setSetDistanceRefPoint({
            lat,
            lon,
            slk: 0,
            roadId: null,
            roadName: null
          })
          setDistanceRefPointRef.current = { lat, lon }
        }
      },
      (err) => {
        alert('Could not get GPS position: ' + err.message)
        setSetDistanceActive(false)
      },
      { enableHighAccuracy: true }
    )
    
    // Start watching position
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        
        setSetDistanceCurrentPos({ lat, lon })
        
        // Calculate distance from reference (use ref to avoid stale closure)
        if (setDistanceRefPointRef.current) {
          const dist = calculateDistance(setDistanceRefPointRef.current.lat, setDistanceRefPointRef.current.lon, lat, lon)
          setSetDistanceDistance(dist)
        }
        
        // Try to get road info
        try {
          const response = await fetch(`/api/gps?lat=${lat}&lon=${lon}`)
          const data = await response.json()
          
          if (data.road_id && data.slk !== undefined) {
            setSetDistanceCurrentSlk(data.slk)
            setSetDistanceCurrentRoad({
              roadId: data.road_id,
              roadName: data.road_name || data.road_id
            })
          }
        } catch {
          // Silently fail - might be offline
        }
      },
      (err) => {
        console.error('GPS watch error:', err)
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    )
    
    setSetDistanceWatchId(watchId)
  }
  
  // Set current position as new reference (reset trip meter to 0)
  const setSetDistanceReference = () => {
    if (setDistanceCurrentPos) {
      setSetDistanceRefPoint({
        lat: setDistanceCurrentPos.lat,
        lon: setDistanceCurrentPos.lon,
        slk: setDistanceCurrentSlk || 0,
        roadId: setDistanceCurrentRoad?.roadId || null,
        roadName: setDistanceCurrentRoad?.roadName || null
      })
      setDistanceRefPointRef.current = { lat: setDistanceCurrentPos.lat, lon: setDistanceCurrentPos.lon }
      setSetDistanceDistance(0)
    }
  }
  
  // Mark current position
  const markSetDistancePosition = () => {
    if (!setDistanceCurrentPos) return
    
    const newMark: SetDistanceMark = {
      id: setDistanceMarkId,
      distance: setDistanceDistance,
      slk: setDistanceCurrentSlk,
      roadId: setDistanceCurrentRoad?.roadId || null,
      roadName: setDistanceCurrentRoad?.roadName || null,
      timestamp: new Date().toLocaleTimeString()
    }
    
    // Calculate total distance (sum of all mark distances from reference)
    const newTotal = setDistanceTotalDistance + setDistanceDistance
    
    setSetDistanceMarks(prev => [...prev, newMark])
    setSetDistanceTotalDistance(newTotal)
    setSetDistanceMarkId(prev => prev + 1)
    
    // Reset reference to current position for next mark
    setSetDistanceReference()
  }
  
  // Reset Set Distance completely
  const resetSetDistance = () => {
    setSetDistanceMarks([])
    setSetDistanceTotalDistance(0)
    setSetDistanceDistance(0)
    setSetDistanceMarkId(0)
    if (setDistanceCurrentPos) {
      setSetDistanceReference()
    }
  }
  
  // Stop Set Distance
  const stopSetDistance = () => {
    if (setDistanceWatchId !== null) {
      navigator.geolocation.clearWatch(setDistanceWatchId)
    }
    setSetDistanceActive(false)
    setSetDistanceWatchId(null)
    setSetDistanceCurrentPos(null)
    setSetDistanceDistance(0)
    setSetDistanceCurrentSlk(null)
    setSetDistanceCurrentRoad(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="w-8"></div>
          <div className="text-center flex-1">
            <h1 className="text-xl font-bold">
              TC Work Zone Locator
            </h1>
            <p className="text-xs text-gray-400">vRC 1.7.13 Expanded Offline Data {offlineReady && <span className="text-green-400">• Offline Ready</span>}</p>
          </div>
          <div className="flex items-center gap-1">
            <Drawer>
              <DrawerTrigger asChild>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-full text-xl font-bold bg-gray-700 hover:bg-gray-600"
                  title="Settings"
                >
                  ☰
                </button>
              </DrawerTrigger>
              <DrawerContent className="bg-gray-900 border-gray-700 max-h-[85vh]">
                <DrawerHeader className="border-b border-gray-700 pb-3">
                  <DrawerTitle className="text-blue-400 text-lg">Settings</DrawerTitle>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 py-4 flex-1">

            {/* ABOUT Section - MINIMIZED BY DEFAULT */}
            <div className="mb-3">
              <button
                onClick={() => setShowAbout(!showAbout)}
                className="w-full text-left text-sm font-semibold text-cyan-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
              >
                <span className={`transition-transform duration-200 ${showAbout ? 'rotate-90' : ''}`}>›</span>
                ℹ️ About
              </button>

              {showAbout && (
                <div className="space-y-3 mt-2 pl-3 border-l-4 border-cyan-500/60">
                  <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
                    <h4 className="text-white font-semibold mb-2">TC Work Zone Locator</h4>
                    <p className="text-gray-400 text-xs mb-3">
                      Mobile-first PWA for Traffic Controllers in Western Australia
                    </p>
                    <div className="text-xs mb-1">
                      <span className="text-gray-400">RC 1.2.20</span>
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
                    <h4 className="text-amber-400 font-semibold mb-2">📧 Contact</h4>
                    <p className="text-gray-400 text-xs">
                      Developer: <a href="mailto:dev@jaytec.net" className="text-blue-400 hover:underline">dev@jaytec.net</a>
                    </p>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
                    <h4 className="text-purple-400 font-semibold mb-2">🤝 Contributors</h4>
                    <p className="text-gray-400 text-xs">• Jaytec (Developer)</p>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
                    <h4 className="text-green-400 font-semibold mb-2">🛠️ Built With</h4>
                    <div className="text-gray-400 text-xs space-y-1">
                      <p>• Next.js / React</p>
                      <p>• Tailwind CSS / shadcn/ui</p>
                      <p>• Google Maps Platform</p>
                      <p>• Vercel (Hosting & Deployment)</p>
                      <p>• Super Z (AI Assistance)</p>
                    </div>
                  </div>

                  <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
                    <h4 className="text-blue-400 font-semibold mb-2">📊 Data Sources</h4>
                    <p className="text-gray-400 text-xs">
                      Road data sourced from Main Roads Western Australia (MRWA) Open Data
                    </p>
                  </div>

                  <div className="mt-3">
                    <Link href="/manual">
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-sm">
                        📖 Open User Manual
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* ADMIN DATA SYNC Section - MINIMIZED BY DEFAULT */}
            <div className="mb-3">
              <button
                onClick={() => {
                  setShowAdminSync(!showAdminSync)
                  if (!showAdminSync) {
                    loadDatasetStats()
                    fetchMrwaStatus()
                  }
                }}
                className="w-full text-left text-sm font-semibold text-amber-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
              >
                <span className={`transition-transform duration-200 ${showAdminSync ? 'rotate-90' : ''}`}>›</span>
                🔧 Admin Data Sync
              </button>

              {showAdminSync && (
                <div className="space-y-3 mt-2 pl-3 border-l-4 border-amber-500/60">
                  <p className="text-xs text-gray-500">
                    Sync data directly from MRWA servers. Downloads in chunks to avoid memory issues.
                    Signage data is filtered to speed/railway signs only.
                  </p>

                  {/* MRWA Connection Status */}
                  {mrwaStatus?._meta && (
                    <div className={`rounded p-2 text-xs ${mrwaStatus._meta.mrwaReachable ? 'bg-green-900/30' : 'bg-amber-900/30'}`}>
                      <p className={`font-semibold mb-1 ${mrwaStatus._meta.mrwaReachable ? 'text-green-400' : 'text-amber-400'}`}>
                        {mrwaStatus._meta.mrwaReachable ? '✓ MRWA Connected' : '⚠ MRWA Unreachable'}
                      </p>
                      <p className="text-gray-400">{mrwaStatus._meta.message}</p>
                    </div>
                  )}

                  {/* MRWA Status */}
                  {mrwaStatus && mrwaStatus._meta?.mrwaReachable && (
                    <div className="bg-gray-900 rounded p-2 text-xs">
                      <p className="text-gray-400 font-semibold mb-1">MRWA Server Status:</p>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-gray-500">Roads:</span>
                        <span className="text-gray-300">{mrwaStatus.roads?.total?.toLocaleString() || '?'}</span>
                        <span className="text-gray-500">Speed Zones:</span>
                        <span className="text-gray-300">{mrwaStatus.speedZones?.total?.toLocaleString() || '?'}</span>
                        <span className="text-gray-500">Rail Crossings:</span>
                        <span className="text-gray-300">{mrwaStatus.railCrossings?.total?.toLocaleString() || '?'}</span>
                        <span className="text-gray-500">Reg Signs:</span>
                        <span className="text-gray-300">{mrwaStatus.regulatorySigns?.total?.toLocaleString() || '?'}</span>
                        <span className="text-gray-500">Warn Signs:</span>
                        <span className="text-gray-300">{mrwaStatus.warningSigns?.total?.toLocaleString() || '?'}</span>
                      </div>
                    </div>
                  )}

                  {/* Local Dataset Status */}
                  {datasetStats && (
                    <div className="bg-gray-900 rounded p-2 text-xs">
                      <p className="text-gray-400 font-semibold mb-1">Local Data Status:</p>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="text-gray-500">Dataset</span>
                        <span className="text-gray-500">Count</span>
                        <span className="text-gray-500">Sync Date</span>

                        <span className="text-gray-300">Roads</span>
                        <span className="text-gray-300">{datasetStats.roads.count}</span>
                        <span className="text-gray-400">{datasetStats.roads.lastSync ? new Date(datasetStats.roads.lastSync).toLocaleDateString() : '-'}</span>

                        <span className="text-gray-300">Speed Zones</span>
                        <span className="text-gray-300">{datasetStats.speedZones.count}</span>
                        <span className="text-gray-400">{datasetStats.speedZones.lastSync ? new Date(datasetStats.speedZones.lastSync).toLocaleDateString() : '-'}</span>

                        <span className="text-gray-300">Rail Crossings</span>
                        <span className="text-gray-300">{datasetStats.railCrossings.count}</span>
                        <span className="text-gray-400">{datasetStats.railCrossings.lastSync ? new Date(datasetStats.railCrossings.lastSync).toLocaleDateString() : '-'}</span>

                        <span className="text-gray-300">Reg Signs</span>
                        <span className="text-gray-300">{datasetStats.regulatorySigns.count}</span>
                        <span className="text-gray-400">{datasetStats.regulatorySigns.lastSync ? new Date(datasetStats.regulatorySigns.lastSync).toLocaleDateString() : '-'}</span>

                        <span className="text-gray-300">Warn Signs</span>
                        <span className="text-gray-300">{datasetStats.warningSigns.count}</span>
                        <span className="text-gray-400">{datasetStats.warningSigns.lastSync ? new Date(datasetStats.warningSigns.lastSync).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>
                  )}

                  {/* Sync Progress */}
                  {Object.keys(syncProgress).length > 0 && (
                    <div className="bg-gray-900 rounded p-2 text-xs">
                      <p className="text-gray-400 font-semibold mb-1">Sync Progress:</p>
                      {Object.entries(syncProgress).map(([dataset, progress]) => (
                        <div key={dataset} className="mb-1">
                          <div className="flex justify-between">
                            <span className="text-gray-300 capitalize">{dataset.replace(/([A-Z])/g, ' $1')}</span>
                            <span className={progress.status === 'complete' ? 'text-green-400' : progress.status === 'error' ? 'text-red-400' : 'text-blue-400'}>
                              {progress.message}
                            </span>
                          </div>
                          {progress.status === 'syncing' && (
                            <div className="w-full bg-gray-700 h-1 rounded mt-1">
                              <div className="bg-blue-500 h-1 rounded" style={{ width: `${progress.percent}%` }}></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sync Buttons */}
                  <div className="space-y-2">
                    <Button
                      onClick={syncAllDatasets}
                      disabled={syncingDatasets.size > 0}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-sm"
                    >
                      {syncingDatasets.size > 0 ? `Syncing ${syncingDatasets.size} dataset(s)...` : '🔄 Sync All from MRWA'}
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      {['roads', 'speedZones', 'railCrossings', 'regulatorySigns', 'warningSigns'].map(dataset => (
                        <Button
                          key={dataset}
                          onClick={() => syncDatasetFromMrwa(dataset)}
                          disabled={syncingDatasets.has(dataset)}
                          className="bg-gray-600 hover:bg-gray-500 text-xs py-1 h-8"
                        >
                          {syncingDatasets.has(dataset) ? '...' : `Sync ${dataset.replace(/([A-Z])/g, ' $1')}`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Debug Button */}
                  <Button
                    onClick={generateDebugInfo}
                    className="w-full bg-gray-600 hover:bg-gray-500 text-sm mt-2"
                  >
                    🔧 Generate Debug Info
                  </Button>
                </div>
              )}
            </div>

            {/* GPS & TRACKING Section - MINIMIZED BY DEFAULT */}
            <div className="mb-3">
              <button
                onClick={() => setShowGpsTracking(!showGpsTracking)}
                className="w-full text-left text-sm font-semibold text-purple-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
              >
                <span className={`transition-transform duration-200 ${showGpsTracking ? 'rotate-90' : ''}`}>›</span>
                📍 GPS & Tracking
              </button>

              {showGpsTracking && (
                <div className="space-y-4 mt-2 pl-3 border-l-4 border-purple-500/60">
                  {/* Speed Display Toggle */}
                  <div className="bg-gray-900 rounded-lg p-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-sm text-white">Show Speed During Tracking</span>
                        <p className="text-xs text-gray-500">Display current speed and posted speed during SLK tracking</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={showSpeedDisplay}
                        onChange={(e) => {
                          setShowSpeedDisplay(e.target.checked)
                          localStorage.setItem('showSpeedDisplay', String(e.target.checked))
                        }}
                        className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {/* AfterCare Visibility Toggle */}
                  <div className="bg-gray-900 rounded-lg p-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-sm text-white">Show AfterCare on Drive Page</span>
                        <p className="text-xs text-gray-500">Display nearby AfterCare signage alerts during SLK tracking</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={typeof window !== 'undefined' ? localStorage.getItem('showAfterCareOnDrive') !== 'false' : true}
                        onChange={(e) => {
                          localStorage.setItem('showAfterCareOnDrive', String(e.target.checked))
                        }}
                        className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                      />
                    </label>
                    
                    {/* AfterCare Lookahead Distance */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">Lookahead Distance</span>
                        <span className="text-xs text-cyan-400 font-mono">{afterCareLookaheadKm} km</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">How far ahead/behind to show AfterCare signs</p>
                      <div className="space-y-1">
                        {[1, 3, 5, 10, 20].map((km) => (
                          <label key={km} className="flex items-center gap-3 cursor-pointer py-1">
                            <input
                              type="radio"
                              name="afterCareLookaheadKm"
                              value={km}
                              checked={afterCareLookaheadKm === km}
                              onChange={() => updateAfterCareLookaheadKm(km)}
                              className="w-4 h-4 rounded-full bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500"
                            />
                            <span className="text-sm text-gray-300">{km} km</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* GPS Filtering (EKF) */}
                  <div>
                    <h4 className="text-sm font-semibold text-purple-400 mb-3">📡 GPS Filtering (EKF)</h4>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm text-white">EKF Filtering</span>
                          <p className="text-xs text-gray-500">Kalman filter for smoother, accurate GPS tracking</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={gpsSettings.ekfEnabled}
                          onChange={(e) => updateGpsSetting('ekfEnabled', e.target.checked)}
                          className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm text-white">Road Constraint</span>
                          <p className="text-xs text-gray-500">Snap predictions to road geometry for accuracy</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={gpsSettings.roadConstraint}
                          onChange={(e) => updateGpsSetting('roadConstraint', e.target.checked)}
                          className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                          disabled={!gpsSettings.ekfEnabled}
                        />
                      </label>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-white">Prediction Timeout</span>
                          <p className="text-xs text-gray-500">Max time to predict during GPS outage</p>
                        </div>
                        <select
                          value={gpsSettings.maxPredictionTime}
                          onChange={(e) => updateGpsSetting('maxPredictionTime', parseInt(e.target.value))}
                          className="bg-gray-700 border-gray-600 text-white text-sm rounded px-2 py-1"
                          disabled={!gpsSettings.ekfEnabled}
                        >
                          <option value={10}>10 sec</option>
                          <option value={20}>20 sec</option>
                          <option value={30}>30 sec</option>
                          <option value={60}>60 sec</option>
                        </select>
                      </div>

                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm text-white">Show Uncertainty</span>
                          <p className="text-xs text-gray-500">Display position accuracy indicator</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={gpsSettings.showUncertainty}
                          onChange={(e) => updateGpsSetting('showUncertainty', e.target.checked)}
                          className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                          disabled={!gpsSettings.ekfEnabled}
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm text-white">Early Warnings</span>
                          <p className="text-xs text-gray-500">Alert earlier at higher speeds (3 sec travel time)</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={gpsSettings.earlyWarnings}
                          onChange={(e) => updateGpsSetting('earlyWarnings', e.target.checked)}
                          className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  </div>

                  {/* GPS Calibration */}
                  <div className="bg-gray-900 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-amber-400 mb-3">🎯 GPS Calibration</h4>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Lag Compensation</span>
                        <span className="text-sm font-mono text-yellow-400">
                          {gpsSettings.gpsLagCompensation > 0 ? `+${gpsSettings.gpsLagCompensation}s` : 'Not set'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500">
                        Calibrate GPS lag to improve speed sign lookahead accuracy.
                      </p>

                      <Button
                        onClick={() => window.location.href = '/calibrate'}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-sm"
                      >
                        🎯 Open Calibration Tool
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* OFFLINE DATA Section - EXPANDED IF NO DATA */}
            <div className="mb-3">
              <button
                onClick={() => setShowOfflineData(!showOfflineData)}
                className="w-full text-left text-sm font-semibold text-blue-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
              >
                <span className={`transition-transform duration-200 ${showOfflineData ? 'rotate-90' : ''}`}>›</span>
                📦 Offline Data
              </button>

              {showOfflineData && (
                <div className="space-y-3 mt-2 pl-3 border-l-4 border-blue-500/60">
                  {offlineStats ? (
                    <div className="text-sm">
                      <p className="text-green-400">✓ Offline data downloaded</p>
                      <p className="text-gray-400">{offlineStats.total_roads.toLocaleString()} roads</p>
                      {offlineStats.pavement_roads && (
                        <p className="text-gray-400">{offlineStats.pavement_roads.toLocaleString()} roads with pavement data</p>
                      )}
                      {offlineStats.traffic_roads && (
                        <p className="text-gray-400">{offlineStats.traffic_roads.toLocaleString()} roads with traffic data</p>
                      )}
                      <p className="text-gray-500 text-xs">Downloaded: {new Date(offlineStats.download_date).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">
                      Download road data for offline SLK tracking without internet.
                    </p>
                  )}

                  {downloadProgress && (
                    <p className={`text-sm ${downloadProgress.startsWith('✓') ? 'text-green-400' : downloadProgress.startsWith('Error') ? 'text-red-400' : 'text-blue-400'}`}>
                      {downloadProgress}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleDownloadOfflineData}
                      disabled={downloading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {downloading ? 'Downloading...' : offlineStats ? 'Update Data' : 'Download Data'}
                    </Button>
                    {offlineStats && (
                      <Button
                        onClick={handleClearOfflineData}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={downloading}
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Offline Data Source Toggles - RC 1.7.0 */}
                  {offlineStats && (
                    <div className="mt-4 pt-3 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-amber-400">⚡ Data Source Toggles</p>
                        <Button
                          onClick={resetOfflineToggles}
                          variant="ghost"
                          size="sm"
                          className="text-xs text-gray-500 h-6 px-2"
                        >
                          Reset All
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Default: OFFLINE mode (uses local data first, falls back to online if unavailable).
                      </p>
                      
                      <div className="space-y-2">
                        {/* Roads List */}
                        <label className="flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={offlineToggles.roadsList}
                              onChange={(e) => updateOfflineToggle('roadsList', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                            />
                            <span className="text-sm text-gray-300">Roads List</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${offlineToggles.roadsList ? 'bg-amber-600 text-white' : 'bg-green-600/30 text-green-300'}`}>
                            {offlineToggles.roadsList ? 'OFFLINE' : 'ONLINE'}
                          </span>
                        </label>

                        {/* Work Zone Lookup */}
                        <label className="flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={offlineToggles.workZoneLookup}
                              onChange={(e) => updateOfflineToggle('workZoneLookup', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                            />
                            <span className="text-sm text-gray-300">Work Zone Lookup</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${offlineToggles.workZoneLookup ? 'bg-amber-600 text-white' : 'bg-green-600/30 text-green-300'}`}>
                            {offlineToggles.workZoneLookup ? 'OFFLINE' : 'ONLINE'}
                          </span>
                        </label>

                        {/* Speed Zones */}
                        <label className="flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={offlineToggles.speedZones}
                              onChange={(e) => updateOfflineToggle('speedZones', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                            />
                            <span className="text-sm text-gray-300">Speed Zones</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${offlineToggles.speedZones ? 'bg-amber-600 text-white' : 'bg-green-600/30 text-green-300'}`}>
                            {offlineToggles.speedZones ? 'OFFLINE' : 'ONLINE'}
                          </span>
                        </label>

                        {/* Rail Crossings */}
                        <label className="flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={offlineToggles.railCrossings}
                              onChange={(e) => updateOfflineToggle('railCrossings', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                            />
                            <span className="text-sm text-gray-300">Rail Crossings</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${offlineToggles.railCrossings ? 'bg-amber-600 text-white' : 'bg-green-600/30 text-green-300'}`}>
                            {offlineToggles.railCrossings ? 'OFFLINE' : 'ONLINE'}
                          </span>
                        </label>

                        {/* Regulatory Signs */}
                        <label className="flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={offlineToggles.regulatorySigns}
                              onChange={(e) => updateOfflineToggle('regulatorySigns', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                            />
                            <span className="text-sm text-gray-300">Regulatory Signs</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${offlineToggles.regulatorySigns ? 'bg-amber-600 text-white' : 'bg-green-600/30 text-green-300'}`}>
                            {offlineToggles.regulatorySigns ? 'OFFLINE' : 'ONLINE'}
                          </span>
                        </label>

                        {/* Warning Signs */}
                        <label className="flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={offlineToggles.warningSigns}
                              onChange={(e) => updateOfflineToggle('warningSigns', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                            />
                            <span className="text-sm text-gray-300">Warning Signs</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${offlineToggles.warningSigns ? 'bg-amber-600 text-white' : 'bg-green-600/30 text-green-300'}`}>
                            {offlineToggles.warningSigns ? 'OFFLINE' : 'ONLINE'}
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PREFERENCES Section - MINIMIZED BY DEFAULT */}
            <div className="mb-3">
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="w-full text-left text-sm font-semibold text-gray-300 py-2 flex items-center gap-2 border-b border-gray-700/50"
              >
                <span className={`transition-transform duration-200 ${showPreferences ? 'rotate-90' : ''}`}>›</span>
                ⚙️ Preferences
              </button>

              {showPreferences && (
                <div className="space-y-4 mt-2 pl-3 border-l-4 border-gray-400/60">
                  {/* Default Region Selector */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Default Region</label>
                    <Select
                      value={defaultRegion || "__none__"}
                      onValueChange={(value) => {
                        const regionValue = value === "__none__" ? "" : value
                        setDefaultRegion(regionValue)
                        localStorage.setItem('defaultRegion', regionValue)
                      }}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-10">
                        <SelectValue placeholder="Select default region" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="__none__" className="text-gray-400">None</SelectItem>
                        {regions.map((region) => (
                          <SelectItem key={region} value={region} className="text-white">
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Pre-selects this region on load</p>
                  </div>

                  {/* Wind Gust Alert Threshold */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Wind Gust Alert Threshold</label>
                    <div className="flex gap-2">
                      {[40, 50, 60, 80].map((threshold) => (
                        <Button
                          key={threshold}
                          onClick={() => updateWindGustThreshold(threshold)}
                          className={`flex-1 h-8 text-xs ${windGustThreshold === threshold ? 'bg-amber-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                        >
                          {threshold}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Alert when gusts exceed this (km/h)</p>
                  </div>
                </div>
              )}
            </div>

            {/* SPEED ZONE OVERRIDES Section - MINIMIZED BY DEFAULT */}
            <div className="mb-3">
              <button
                onClick={() => setShowSpeedOverrides(!showSpeedOverrides)}
                className="w-full text-left text-sm font-semibold text-orange-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
              >
                <span className={`transition-transform duration-200 ${showSpeedOverrides ? 'rotate-90' : ''}`}>›</span>
                🔧 Speed Zone Overrides
              </button>

              {showSpeedOverrides && (
                <div className="space-y-3 mt-2 pl-3 border-l-4 border-orange-500/60">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-2">
                      Community-verified corrections for MRWA speed zone data.
                      Overrides are applied automatically when you search or track on affected roads.
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-green-400">✓ Active (M031 corrections loaded)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-gray-500">Version:</span>
                      <span className="text-gray-400">1.0 • Updated: 2025-03-02</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-gray-500">Affected Roads:</span>
                      <span className="text-orange-400">M031 (4 zone corrections)</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Override data is bundled with the app and loaded automatically.
                    Corrections are field-verified where MRWA data is outdated after road works.
                  </p>
                  <Link href="/overrides">
                    <Button className="w-full bg-orange-600 hover:bg-orange-700 text-sm">
                      📋 Manage Overrides & Generate Reports
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* TC TOOLS Section - MINIMIZED BY DEFAULT */}
            <div className="mb-3">
              <button
                onClick={() => setShowTcTools(!showTcTools)}
                className="w-full text-left text-sm font-semibold text-cyan-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
              >
                <span className={`transition-transform duration-200 ${showTcTools ? 'rotate-90' : ''}`}>›</span>
                🛠️ TC Tools
              </button>

              {showTcTools && (
                <div className="space-y-3 mt-2 pl-3 border-l-4 border-cyan-500/60">
                  
                  {/* Set Distance */}
                  <div className="pt-2">
                    {!setDistanceActive ? (
                      <DrawerClose asChild>
                        <button
                          onClick={startSetDistance}
                          className="text-cyan-400 hover:text-cyan-300 text-sm pl-2"
                        >
                          📏 Set Distance
                        </button>
                      </DrawerClose>
                    ) : (
                      <div className="flex items-center gap-2 text-sm pl-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className="text-green-400">Set Distance Active</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Export Work Zone Info */}
                  {result && (
                    <div className="pt-1">
                      <button
                        onClick={exportReport}
                        disabled={exporting}
                        className="text-cyan-400 hover:text-cyan-300 text-sm pl-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {exporting ? '📄 Exporting...' : '📄 Export Work Zone Info'}
                      </button>
                    </div>
                  )}
                  
                  {/* AfterCare Signs */}
                  <div className="pt-1">
                    <DrawerClose asChild>
                      <Link
                        href="/aftercare"
                        className="text-cyan-400 hover:text-cyan-300 text-sm pl-2 block"
                      >
                        🚧 AfterCare Signs
                      </Link>
                    </DrawerClose>
                  </div>
                  
                </div>
              )}
            </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {/* Debug Info Popup */}
        {showDebug && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-4 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-blue-400">🔧 Debug Info</h3>
                <Button
                  onClick={() => setShowDebug(false)}
                  className="h-8 w-8 p-0 bg-gray-700 hover:bg-gray-600"
                >
                  ✕
                </Button>
              </div>
              <textarea
                readOnly
                value={debugInfo}
                className="flex-1 w-full bg-gray-900 text-gray-300 text-xs font-mono p-3 rounded border border-gray-700 resize-none min-h-[300px]"
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(debugInfo)
                    setDownloadProgress('Debug info copied!')
                    setTimeout(() => setDownloadProgress(''), 2000)
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  📋 Copy to Clipboard
                </Button>
                <Button
                  onClick={() => setShowDebug(false)}
                  className="bg-gray-600 hover:bg-gray-500"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

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
            <div className="bg-gray-800 rounded-lg mb-4">
              <button
                onClick={() => setShowGpsDialog(!showGpsDialog)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <h3 className="text-sm font-semibold text-green-400">
                  📍 Find by GPS Location
                </h3>
                <span className="text-gray-400 text-lg">
                  {showGpsDialog ? '−' : '+'}
                </span>
              </button>
          
          {showGpsDialog && (
            <div className="px-4 pb-4">
              {/* Get My Location Button */}
              <Button 
                onClick={getCurrentLocation}
                disabled={loadingGps}
                className="w-full h-12 mb-3 text-base bg-green-600 hover:bg-green-700"
              >
                {loadingGps ? 'Getting Location...' : '📍 Get My Location'}
              </Button>
              
              {/* Manual GPS Input */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => setGpsLat(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev)}
                      className="h-10 w-10 text-lg bg-gray-600 hover:bg-gray-500 shrink-0 px-0"
                      title="Toggle negative"
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="-31.638157"
                      value={gpsLat}
                      onChange={(e) => setGpsLat(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white h-10 text-sm flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                  <Input
                    type="number"
                    step="0.000001"
                    placeholder="117.005277"
                    value={gpsLon}
                    onChange={(e) => setGpsLon(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white h-10 text-sm"
                  />
                </div>
              </div>
              
              <Button 
                onClick={() => lookupGpsLocation()}
                disabled={loadingGps || !gpsLat || !gpsLon}
                className="w-full h-10 text-sm bg-blue-600 hover:bg-blue-700"
              >
                {loadingGps ? 'Looking up...' : '🔍 Lookup Location'}
              </Button>
              
              {/* GPS Error/Success */}
              {gpsError && (
                <p className="text-xs text-red-400 mt-2">{gpsError}</p>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                Works for all roads (State H/M and Local roads)
              </p>
            </div>
          )}
        </div>

        <div className="text-center text-gray-600 text-xs mb-4">— or select manually —</div>

        {/* Region Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Region</label>
          <Select
            value={selectedRegion}
            onValueChange={(value) => {
              setSelectedRegion(value)
              // Clear GPS road info if manually changing region
              if (value !== 'Local' || !gpsRoadInfo) {
                setGpsRoadInfo(null)
                setSelectedRoad('')
                setStartSlk('')
                setEndSlk('')
              }
            }}
            disabled={loadingRegions}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-12 text-base">
              <SelectValue placeholder={loadingRegions ? "Loading regions..." : "Select region"} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 max-h-64">
              {/* Local option at top */}
              <SelectItem 
                value="Local"
                className="text-amber-400 focus:bg-gray-700 py-3"
              >
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
                <SelectValue placeholder={loadingRoads ? "Loading..." : "Select road"} />
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
        {error && (
          <p className="text-red-400 text-sm mt-4">{error}</p>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            
            {/* Work Zone Summary */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="border-b border-gray-700 pb-2 mb-3">
                <h3 className="text-sm font-semibold text-blue-400">
                  📍 Work Zone Summary
                </h3>
              </div>
              
              {/* Action Buttons - evenly spaced under title */}
              {isSinglePoint && result.work_zone.start && (
                <div className="flex justify-between gap-2 mb-3">
                  <Button 
                    onClick={() => openGoogleMaps(result.google_maps.work_zone_start)}
                    className="flex-1 h-8 text-sm bg-green-600 hover:bg-green-700 flex items-center justify-center gap-1"
                    title="Navigate"
                  >
                    🗺️ Maps
                  </Button>
                  <Button 
                    onClick={() => openStreetView(result.work_zone.start!.lat, result.work_zone.start!.lon)}
                    className="flex-1 h-8 text-sm bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-1"
                    title="Street View"
                  >
                    🏠 Street View
                  </Button>
                  <Button 
                    onClick={startSlkTracking}
                    className="flex-1 h-8 text-sm bg-blue-800 hover:bg-blue-900 flex items-center justify-center gap-1"
                    title="Track"
                  >
                    📍 Track
                  </Button>
                </div>
              )}
              
              <p className="text-lg font-medium">{result.road_name}</p>
              <p className="text-sm text-gray-400">
                Road ID: {result.road_id}
                {result.network_type && (
                  <span className={`ml-2 ${result.network_type === 'Local Road' ? 'text-amber-400' : 'text-gray-500'}`}>
                    ({result.network_type})
                  </span>
                )}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Start SLK</p>
                  <p className="font-mono">{result.work_zone.start_slk.toFixed(2)} km</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">End SLK</p>
                  <p className="font-mono">{result.work_zone.end_slk.toFixed(2)} km</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Zone Length</p>
                  <p className="font-medium">{result.work_zone.length_m} m</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Carriageway</p>
                  <p className="font-medium">{result.carriageway}</p>
                </div>
                {result.pavement && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500">Lanes</p>
                      <p className="font-medium">{result.pavement.lanes || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Road Width</p>
                      <p className="font-medium">{result.pavement.width_m ? `${result.pavement.width_m} m` : '—'}</p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Road Width Visual Breakdown */}
              {result.pavement && result.pavement.total_pave_width && (
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Road Width Breakdown (Total: {result.pavement.total_pave_width?.toFixed(1)}m)</p>
                  
                  {/* Calculate proportions for visual display */}
                  {(() => {
                    const p = result.pavement!;
                    const totalWidth = p.total_pave_width || 1;
                    const unsealedL = p.unsealed_shoulder_l || 0;
                    const sealedL = p.sealed_shoulder_l || 0;
                    const trafficable = p.width_m || 0;
                    const sealedR = p.sealed_shoulder_r || 0;
                    const unsealedR = p.unsealed_shoulder_r || 0;
                    
                    // Calculate percentages
                    const pctUnsealedL = (unsealedL / totalWidth) * 100;
                    const pctSealedL = (sealedL / totalWidth) * 100;
                    const pctTrafficable = (trafficable / totalWidth) * 100;
                    const pctSealedR = (sealedR / totalWidth) * 100;
                    const pctUnsealedR = (unsealedR / totalWidth) * 100;
                    
                    return (
                      <>
                        {/* Visual bar */}
                        <div className="flex h-8 rounded overflow-hidden text-xs">
                          {unsealedL > 0 && (
                            <div 
                              className="bg-amber-700 flex items-center justify-center"
                              style={{ width: `${pctUnsealedL}%` }}
                              title={`Unsealed shoulder L: ${unsealedL.toFixed(1)}m`}
                            >
                              {pctUnsealedL > 10 && <span className="text-white">{unsealedL.toFixed(1)}</span>}
                            </div>
                          )}
                          {sealedL > 0 && (
                            <div 
                              className="bg-gray-500 flex items-center justify-center"
                              style={{ width: `${pctSealedL}%` }}
                              title={`Sealed shoulder L: ${sealedL.toFixed(1)}m`}
                            >
                              {pctSealedL > 10 && <span className="text-white">{sealedL.toFixed(1)}</span>}
                            </div>
                          )}
                          {trafficable > 0 && (
                            <div 
                              className="bg-blue-800 flex items-center justify-center"
                              style={{ width: `${pctTrafficable}%` }}
                              title={`Trafficable: ${trafficable.toFixed(1)}m`}
                            >
                              <span className="text-white font-medium">{trafficable.toFixed(1)}</span>
                            </div>
                          )}
                          {sealedR > 0 && (
                            <div 
                              className="bg-gray-500 flex items-center justify-center"
                              style={{ width: `${pctSealedR}%` }}
                              title={`Sealed shoulder R: ${sealedR.toFixed(1)}m`}
                            >
                              {pctSealedR > 10 && <span className="text-white">{sealedR.toFixed(1)}</span>}
                            </div>
                          )}
                          {unsealedR > 0 && (
                            <div 
                              className="bg-amber-700 flex items-center justify-center"
                              style={{ width: `${pctUnsealedR}%` }}
                              title={`Unsealed shoulder R: ${unsealedR.toFixed(1)}m`}
                            >
                              {pctUnsealedR > 10 && <span className="text-white">{unsealedR.toFixed(1)}</span>}
                            </div>
                          )}
                        </div>
                        
                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs">
                          {unsealedL > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-amber-700 rounded"></div>
                              <span className="text-gray-400">Unsealed {unsealedL.toFixed(1)}m</span>
                            </div>
                          )}
                          {sealedL > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-500 rounded"></div>
                              <span className="text-gray-400">Sealed {sealedL.toFixed(1)}m</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-800 rounded"></div>
                            <span className="text-gray-400">Lanes {trafficable.toFixed(1)}m</span>
                          </div>
                          {sealedR > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-gray-500 rounded"></div>
                              <span className="text-gray-400">Sealed {sealedR.toFixed(1)}m</span>
                            </div>
                          )}
                          {unsealedR > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-amber-700 rounded"></div>
                              <span className="text-gray-400">Unsealed {unsealedR.toFixed(1)}m</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Direction labels */}
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <span>← LEFT</span>
                          <span>{result.pavement.cwy} Carriageway</span>
                          <span>RIGHT →</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {/* Lane Direction Diagram */}
              {result.pavement && result.pavement.lanes && result.pavement.lanes > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-2">Lane Directions ({result.pavement.lanes} lanes total)</p>
                  
                  {(() => {
                    const lanes = result.pavement.lanes || 0;
                    const cwy = result.pavement.cwy || 'Single';
                    
                    // Determine lanes per direction
                    let lanesIncreasing = 0;  // → toward higher SLK
                    let lanesDecreasing = 0;  // ← toward lower SLK
                    
                    if (cwy === 'Single') {
                      // Single carriageway: split evenly between directions
                      lanesIncreasing = Math.ceil(lanes / 2);
                      lanesDecreasing = Math.floor(lanes / 2);
                    } else if (cwy === 'Left') {
                      // Left carriageway: all lanes go INCREASING SLK
                      lanesIncreasing = lanes;
                      lanesDecreasing = 0;
                    } else if (cwy === 'Right') {
                      // Right carriageway: all lanes go DECREASING SLK
                      lanesIncreasing = 0;
                      lanesDecreasing = lanes;
                    }
                    
                    // Create lane array with directions
                    // For Single: left lanes = increasing (→), right lanes = decreasing (←)
                    const laneDirections: ('increasing' | 'decreasing')[] = [];
                    for (let i = 0; i < lanesIncreasing; i++) {
                      laneDirections.push('increasing');
                    }
                    for (let i = 0; i < lanesDecreasing; i++) {
                      laneDirections.push('decreasing');
                    }
                    
                    return (
                      <>
                        {/* Visual lane diagram */}
                        <div className="flex h-10 rounded overflow-hidden border border-gray-600">
                          {(() => {
                            let increasingLaneNum = 0;
                            let decreasingLaneNum = 0;
                            return laneDirections.map((dir, idx) => {
                              if (dir === 'increasing') {
                                increasingLaneNum++;
                              } else {
                                decreasingLaneNum++;
                              }
                              // For decreasing, reverse numbering so L1 is curb-side (right side)
                              const laneNum = dir === 'increasing' 
                                ? increasingLaneNum 
                                : (lanesDecreasing - decreasingLaneNum + 1);
                              return (
                                <div 
                                  key={idx}
                                  className={`flex-1 flex flex-col items-center justify-center border-r border-gray-600 last:border-r-0 bg-blue-800`}
                                  title={dir === 'increasing' ? 'Toward higher SLK (↑)' : 'Toward lower SLK (↓)'}
                                >
                                  <span className={`text-lg font-bold ${dir === 'increasing' ? 'text-white' : 'text-yellow-400'}`}>
                                    {dir === 'increasing' ? '↑' : '↓'}
                                  </span>
                                  {lanes >= 3 && (
                                    <span className={`text-[10px] font-medium ${dir === 'increasing' ? 'text-white/70' : 'text-yellow-400/70'}`}>
                                      L{laneNum}
                                    </span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                        
                        {/* Direction legend */}
                        <div className="flex justify-between mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-white rounded"></div>
                            <span className="text-gray-400">
                              ↑ INCREASING SLK ({lanesIncreasing} lane{lanesIncreasing !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">
                              DECREASING SLK ({lanesDecreasing} lane{lanesDecreasing !== 1 ? 's' : ''}) ↓
                            </span>
                            <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                          </div>
                        </div>
                        
                        {/* Direction explanation */}
                        <p className="text-xs text-gray-500 mt-2 italic">
                          {cwy === 'Single' 
                            ? lanes % 2 !== 0
                              ? `⚠️ Odd lane count - allocation uncertain. Assuming ${lanesIncreasing} lane(s) INCREASING, ${lanesDecreasing} lane(s) DECREASING`
                              : `${lanesIncreasing} lane(s) toward INCREASING SLK, ${lanesDecreasing} lane(s) toward DECREASING SLK`
                            : cwy === 'Left'
                            ? 'Left carriageway: all lanes travel toward INCREASING SLK'
                            : 'Right carriageway: all lanes travel toward DECREASING SLK'}
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}
              
            </div>

            {/* Road Incidents - Live from WebEOC */}
            <IncidentsSection 
              roadId={result.road_id} 
              roadName={result.road_name} 
              enabled={true} 
            />
            
            {/* Weather Warnings - Live from Bureau of Meteorology */}
            <WarningsSection 
              state="WA"
              enabled={true} 
            />
            {/* Traffic Volume */}
            {traffic && (
              <div className="bg-gray-800 rounded-lg">
                <button
                  onClick={() => setShowTraffic(!showTraffic)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-blue-400">
                    🚗 Traffic Volume
                    {traffic.fromCache && (
                      <span className="ml-2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
                        Cached {traffic.cachedAt ? new Date(traffic.cachedAt).toLocaleTimeString() : ''}
                      </span>
                    )}
                  </h3>
                  <span className="text-gray-400 text-lg">{showTraffic ? '−' : '+'}</span>
                </button>
                {showTraffic && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-400">AADT</p>
                        <p className="font-medium text-lg">{traffic.aadt?.toLocaleString() || 'N/A'}</p>
                        <p className="text-xs text-gray-500">vehicles/day</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Peak Hour (est.)</p>
                        <p className="font-medium text-lg">{traffic.peak_hour_volume || 'N/A'}</p>
                        <p className="text-xs text-gray-500">vehicles/hour</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Heavy Vehicles</p>
                        <p className="font-medium text-lg">{traffic.heavy_vehicle_percent}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Data Year</p>
                        <p className="font-medium text-lg">{traffic.aadt_year}</p>
                      </div>
                    </div>
                    
                    {traffic.distance_to_site !== undefined && (
                      <p className="text-xs text-cyan-400 mt-2">
                        📍 Nearest count site: {traffic.distance_to_site} km from work zone
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Source: {traffic.source}
                    </p>
                    
                    {traffic.nearest_sites && traffic.nearest_sites.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">Other nearby count sites:</p>
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
                  </div>
                )}
              </div>
            )}

            {/* Signage Corridor Report */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => setShowSignageCorridor(!showSignageCorridor)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <h3 className="text-sm font-semibold text-blue-400">
                  📋 Signage in Corridor
                </h3>
                <span className="text-gray-400 text-lg">{showSignageCorridor ? '−' : '+'}</span>
              </button>
              {showSignageCorridor && (
                <div className="px-4 pb-4">
                  {/* Corridor Info */}
                  <div className="mb-3 text-xs text-gray-500">
                    Corridor: SLK {Math.max(0, result.work_zone.start_slk - 0.7).toFixed(2)} - 
                    {((result.work_zone.end_slk || result.work_zone.start_slk) + 0.7).toFixed(2)} km
                    (±700m from work zone)
                  </div>
                  
                  {signageLoading ? (
                    <p className="text-sm text-gray-400">Loading signage data...</p>
                  ) : signageCorridor.length === 0 ? (
                    <p className="text-sm text-gray-400">No signage data available for this corridor. 
                      Download offline data to see speed zones, rail crossings, and signs.</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Intersections - Only within ±100m of work zone */}
                      {signageCorridor.filter(s => {
                        if (s.category !== 'intersection') return false;
                        // Only show intersections within ±100m (0.1 km) of work zone
                        const workZoneStart = result.work_zone.start_slk;
                        const workZoneEnd = result.work_zone.end_slk || result.work_zone.start_slk;
                        return s.slk >= (workZoneStart - 0.1) && s.slk <= (workZoneEnd + 0.1);
                      }).length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-purple-400 mb-2">🔀 INTERSECTIONS NEAR WORK ZONE (±100m)</h4>
                          <div className="space-y-1">
                            {signageCorridor.filter(s => {
                              if (s.category !== 'intersection') return false;
                              const workZoneStart = result.work_zone.start_slk;
                              const workZoneEnd = result.work_zone.end_slk || result.work_zone.start_slk;
                              return s.slk >= (workZoneStart - 0.1) && s.slk <= (workZoneEnd + 0.1);
                            }).map((sign, i) => (
                              <div key={`int-${i}`} className="flex justify-between items-center text-sm bg-purple-900/20 px-2 py-1 rounded">
                                <span className="font-mono text-yellow-400">SLK {sign.slk.toFixed(2)}</span>
                                <span className="text-gray-300">{sign.description}</span>
                                <span className="text-xs text-purple-400">{sign.action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Railway Crossings */}
                      {signageCorridor.filter(s => s.category === 'railway').length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-red-400 mb-2">🚂 RAILWAY CROSSINGS</h4>
                          <div className="space-y-1">
                            {signageCorridor.filter(s => s.category === 'railway').map((sign, i) => (
                              <div key={`rail-${i}`} className="flex justify-between items-center text-sm bg-red-900/20 px-2 py-1 rounded">
                                <span className="font-mono text-yellow-400">SLK {sign.slk.toFixed(2)}</span>
                                <span className="text-gray-300">{sign.description}</span>
                                <span className="text-xs text-amber-400">{sign.action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Speed Signs */}
                      {signageCorridor.filter(s => s.category === 'speed').length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-green-400 mb-2">⚡ SPEED RESTRICTION SIGNS</h4>
                          <div className="space-y-1">
                            {signageCorridor.filter(s => s.category === 'speed').map((sign, i) => {
                              return (
                              <div key={`speed-${i}`} className="flex justify-between items-center text-sm bg-gray-700/50 px-2 py-1 rounded">
                                <span className="font-mono text-yellow-400">SLK {sign.slk.toFixed(2)}</span>
                                <span className="text-gray-300">{sign.description}</span>
                                <span className="text-xs text-gray-400">{sign.carriageway}</span>
                              </div>
                            )})}
                          </div>
                        </div>
                      )}
                      
                      {/* Warning Signs */}
                      {signageCorridor.filter(s => s.category === 'warning').length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-yellow-400 mb-2">⚠️ WARNING SIGNS</h4>
                          <div className="space-y-1">
                            {signageCorridor.filter(s => s.category === 'warning').map((sign, i) => (
                              <div key={`warn-${i}`} className="flex justify-between items-center text-sm bg-yellow-900/20 px-2 py-1 rounded">
                                <span className="font-mono text-yellow-400">SLK {sign.slk.toFixed(2)}</span>
                                <span className="text-gray-300 flex-1 mx-2 truncate" title={sign.description}>{sign.description}</span>
                                <span className="text-xs text-gray-500">{sign.carriageway}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Summary */}
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Total items in corridor:</span>
                          <span className="text-white font-semibold">{signageCorridor.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-3">
                    Check site for all signage. Speed zones from MRWA data.
                  </p>
                </div>
              )}
            </div>

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
                    corridorMargin={0.85}
                  />
                </div>
              )}
            </div>

            {/* TC Positions */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => setShowTcPositions(!showTcPositions)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <h3 className="text-sm font-semibold text-blue-400">
                  🚧 TC Positions (±100m from work zone)
                </h3>
                <span className="text-gray-400 text-lg">{showTcPositions ? '−' : '+'}</span>
              </button>
              {showTcPositions && (
                <div className="px-4 pb-4">
                  <div className="space-y-2">
                    <div className="bg-gray-700/50 rounded p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">TC Start - SLK {result.tc_positions.start_slk.toFixed(2)}</p>
                        <div className="flex gap-1">
                          <Button 
                            onClick={() => openGoogleMaps(result.google_maps.tc_start)}
                            className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                            title="Navigate"
                          >
                            🗺️
                          </Button>
                          {result.tc_positions.start && (
                            <Button 
                              onClick={() => openStreetView(result.tc_positions.start!.lat, result.tc_positions.start!.lon)}
                              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                              title="Street View"
                            >
                              🏠
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/50 rounded p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">TC End - SLK {result.tc_positions.end_slk.toFixed(2)}</p>
                        <div className="flex gap-1">
                          <Button 
                            onClick={() => openGoogleMaps(result.google_maps.tc_end)}
                            className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                            title="Navigate"
                          >
                            🗺️
                          </Button>
                          {result.tc_positions.end && (
                            <Button 
                              onClick={() => openStreetView(result.tc_positions.end!.lat, result.tc_positions.end!.lon)}
                              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                              title="Street View"
                            >
                              🏠
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Intersecting Roads */}
            {(crossRoads.filter(road => 
              road.name.toLowerCase() !== result.road_name.toLowerCase()
            ).length > 0) && (
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
                      {crossRoads.filter(road => 
                        road.name.toLowerCase() !== result.road_name.toLowerCase()
                      ).map((road, i) => (
                        <div key={i} className="flex justify-between items-center py-1 border-b border-gray-700/50">
                          <div className="flex-1">
                            <span className="font-medium">{road.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({road.roadType})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-400">{road.distance} km</span>
                            <span className="text-xs text-gray-500 block">from TC start</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-400 mt-3">
                      ⚠️ Consider TC coverage for these intersecting roads
                    </p>
                  </div>
                )}
              </div>
            )}

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
                        Cached {weather.cachedAt ? new Date(weather.cachedAt).toLocaleTimeString() : ''}
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
                          💡 Switch to ONLINE mode to fetch weather, or previously fetched weather will be cached for offline use.
                        </p>
                      </div>
                    )}
                    {/* Weather Warnings */}
                    {warnings && warnings.warnings.length > 0 && (
                      <div className="bg-red-900/30 border border-red-500/50 rounded p-3 mb-4">
                        <h4 className="text-sm font-semibold text-red-400 mb-2">⚠️ Weather Warnings</h4>
                        <div className="space-y-2">
                          {warnings.warnings.map((warning, i) => (
                            <div key={i} className="text-sm">
                              <a 
                                href={warning.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-red-300 hover:text-red-200 underline"
                              >
                                {warning.title}
                              </a>
                              {warning.description && (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{warning.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Wind Gust Alert */}
                    {weather.current.windGust >= windGustThreshold && (
                      <div className="bg-amber-900/30 border border-amber-500/50 rounded p-3 mb-4">
                        <p className="text-sm font-semibold text-amber-400">
                          💨 High Wind Gust Alert: {weather.current.windGust} km/h
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Threshold: {windGustThreshold} km/h - Exercise caution with traffic control devices
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
                        <p className="font-medium">{weather.current.windSpeed} km/h {weather.current.windDir}</p>
                        <p className={`text-xs ${weather.current.windGust >= windGustThreshold ? 'text-amber-400 font-semibold' : 'text-gray-500'}`}>
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
                          <span className="w-20 text-right text-gray-500">{hour.windSpeed} km/h</span>
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
                        Cached {places.cachedAt ? new Date(places.cachedAt).toLocaleTimeString() : ''}
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
                          💡 Switch to ONLINE mode to download amenities data, or previously fetched amenities will be cached for offline use.
                        </p>
                      </div>
                    )}
                    {/* Hospital */}
                    {places.hospital ? (
                      <div className="mb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-red-400">
                            🏥 {places.hospital.name}
                            <span className="text-gray-500 text-sm ml-2">({places.hospital.distance} km)</span>
                            {places.hospital.isEmergency && (
                              <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded ml-1">Emergency</span>
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
                              onClick={() => openStreetView(places.hospital!.lat, places.hospital!.lon)}
                              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                              title="Street View"
                            >
                              🏠
                            </Button>
                          </div>
                        </div>
                        {places.hospital.phone && (
                          <p className="text-sm text-gray-400">📞 {places.hospital.phone}</p>
                        )}
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
                            <span className="text-gray-500 text-sm ml-2">({places.fuelStation.distance} km)</span>
                          </p>
                          <div className="flex gap-1">
                            <Button 
                              onClick={() => openGoogleMaps(places.fuelStation?.googleMapsUrl || null)}
                              className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                              title="Navigate"
                            >
                              🗺️
                            </Button>
                            <Button 
                              onClick={() => openStreetView(places.fuelStation!.lat, places.fuelStation!.lon)}
                              className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                              title="Street View"
                            >
                              🏠
                            </Button>
                          </div>
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
                            <span className="text-gray-500 text-sm ml-2">({places.toilet.distance} km)</span>
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
                    
                    {/* Emergency Location Button */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <Button
                        onClick={getEmergencyLocation}
                        className="w-full bg-red-600 hover:bg-red-700 h-12 text-base font-medium"
                      >
                        🆘 Emergency Location (000)
                      </Button>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        Get your current location to read to emergency services
                      </p>
                    </div>
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
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-purple-400">📋 Work Zone Report</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-800 p-4 rounded-lg">
                {reportContent}
              </pre>
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-gray-700 space-y-2">
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(reportContent)
                    alert('Report copied to clipboard!')
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500"
                >
                  📋 Copy to Clipboard
                </Button>
                <Button
                  onClick={() => {
                    const blob = new Blob([reportContent], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `work-zone-report-${result?.road_id || 'unknown'}-${new Date().toISOString().split('T')[0]}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-500"
                >
                  💾 Download
                </Button>
              </div>
              <Button
                onClick={() => setShowReportModal(false)}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Location Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-red-900/20">
              <h2 className="text-lg font-bold text-red-400">🆘 EMERGENCY LOCATION - READ TO 000</h2>
              <button
                onClick={() => {
                  setShowEmergencyModal(false)
                  setEmergencyData(null)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {emergencyLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
                  <p className="text-gray-400">Getting your location...</p>
                </div>
              ) : emergencyData ? (
                <div className="space-y-4">
                  {/* Main message to read */}
                  <div className="bg-gray-800 rounded-lg p-4 border border-red-600">
                    <p className="text-white text-lg leading-relaxed">
                      "Emergency on <span className="font-bold text-yellow-400">{emergencyData.roadName}</span>
                      {emergencyData.crossRoad && (
                        <>, approximately <span className="font-bold text-yellow-400">{emergencyData.crossRoad.distance}</span> <span className="font-bold text-yellow-400">{emergencyData.crossRoad.direction}</span> of <span className="font-bold text-yellow-400">{emergencyData.crossRoad.name}</span></>
                      )}, <span className="font-bold text-yellow-400">{emergencyData.locality || emergencyData.region}</span>.
                      GPS coordinates: <span className="font-bold text-green-400">{emergencyData.lat.toFixed(6)}, {emergencyData.lon.toFixed(6)}</span>."
                    </p>
                  </div>
                  
                  {/* Location details */}
                  <div className="bg-gray-800/50 rounded-lg p-3 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Road:</span>
                      <span className="text-white font-mono">{emergencyData.roadName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">SLK:</span>
                      <span className="text-white font-mono">{emergencyData.slk.toFixed(2)}</span>
                    </div>
                    {emergencyData.locality && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Locality:</span>
                        <span className="text-white">{emergencyData.locality}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Region:</span>
                      <span className="text-white">{emergencyData.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Latitude:</span>
                      <span className="text-white font-mono">{emergencyData.lat.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Longitude:</span>
                      <span className="text-white font-mono">{emergencyData.lon.toFixed(6)}</span>
                    </div>
                    {emergencyData.crossRoad && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Nearest Cross Road:</span>
                        <span className="text-white">{emergencyData.crossRoad.name} ({emergencyData.crossRoad.distance} {emergencyData.crossRoad.direction})</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const text = `Emergency on ${emergencyData.roadName}${emergencyData.crossRoad ? `, approximately ${emergencyData.crossRoad.distance} ${emergencyData.crossRoad.direction} of ${emergencyData.crossRoad.name}` : ''}, ${emergencyData.locality || emergencyData.region}. GPS coordinates: ${emergencyData.lat.toFixed(6)}, ${emergencyData.lon.toFixed(6)}.`
                        navigator.clipboard.writeText(text)
                        alert('Location copied to clipboard!')
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-500"
                    >
                      📋 Copy Text
                    </Button>
                    <Button
                      onClick={() => window.open(`https://www.google.com/maps?q=${emergencyData.lat},${emergencyData.lon}`, '_blank')}
                      className="flex-1 bg-green-600 hover:bg-green-500"
                    >
                      📍 Open Maps
                    </Button>
                    </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No location data available</p>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
              <Button
                onClick={() => {
                  setShowEmergencyModal(false)
                  setEmergencyData(null)
                }}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Set Distance Full Screen Modal */}
      {setDistanceActive && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-900/90">
            <h2 className="text-lg font-bold text-cyan-400">📏 Set Distance</h2>
            <button
              onClick={stopSetDistance}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-xl"
              title="Stop"
            >
              ✕
            </button>
          </div>
          
          {/* Main Display */}
          <div className="flex-1 flex flex-col justify-center px-6 py-8">
            {/* Distance from Reference */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 mb-2 uppercase tracking-wider">Distance from Reference</p>
              <p className="text-7xl sm:text-8xl font-mono font-bold text-cyan-400 leading-none">
                {Math.round(setDistanceDistance / 10) * 10}
              </p>
              <p className="text-3xl text-cyan-400 mt-2">meters</p>
            </div>
            
            {/* Total Distance */}
            <div className="text-center border-t border-gray-800 pt-8">
              <p className="text-sm text-gray-500 mb-2 uppercase tracking-wider">Total Distance</p>
              <p className="text-7xl sm:text-8xl font-mono font-bold text-green-400 leading-none">
                {Math.round((setDistanceTotalDistance + setDistanceDistance) / 10) * 10}
              </p>
              <p className="text-3xl text-green-400 mt-2">meters</p>
            </div>
          </div>
          
          {/* Info Bar */}
          <div className="bg-gray-900/90 px-4 py-3">
            <div className="flex justify-between items-center text-sm max-w-md mx-auto">
              <div className="text-center">
                <p className="text-xs text-gray-500">Current SLK</p>
                <p className="font-mono text-yellow-400">
                  {setDistanceCurrentSlk !== null ? setDistanceCurrentSlk.toFixed(3) : '---'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Road</p>
                <p className="text-gray-300 truncate max-w-32">
                  {setDistanceCurrentRoad?.roadName || '---'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Ref SLK</p>
                <p className="font-mono text-gray-400">
                  {setDistanceRefPoint?.slk.toFixed(3) || '---'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Marks</p>
                <p className="text-gray-400">{setDistanceMarks.length}</p>
              </div>
            </div>
          </div>
          
          {/* Marked Points List */}
          {setDistanceMarks.length > 0 && (
            <div className="bg-gray-900/90 px-4 py-2 max-h-32 overflow-y-auto">
              <div className="max-w-md mx-auto">
                <p className="text-xs text-gray-500 mb-2">Marked Points:</p>
                <div className="space-y-1">
                  {setDistanceMarks.map((mark, idx) => (
                    <div key={mark.id} className="flex justify-between items-center text-xs py-1 border-b border-gray-800 last:border-0">
                      <span className="text-gray-400">#{idx + 1}</span>
                      <span className="font-mono text-cyan-400">{Math.round(mark.distance / 10) * 10}m</span>
                      <span className="font-mono text-yellow-400">SLK {mark.slk?.toFixed(3) || '---'}</span>
                      <span className="text-gray-500">{mark.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="bg-gray-900/90 p-3">
            <div className="max-w-md mx-auto">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={setSetDistanceReference}
                  className="h-10 text-sm bg-blue-600 hover:bg-blue-700"
                >
                  🔄 Set Ref
                </Button>
                <Button
                  onClick={markSetDistancePosition}
                  className="h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  📍 Mark
                </Button>
                <Button
                  onClick={resetSetDistance}
                  className="h-10 text-sm bg-red-600 hover:bg-red-700"
                >
                  🗑️ Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
