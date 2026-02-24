'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  initDB,
  isOfflineDataAvailable,
  storeRegionData,
  storeSpeedZones,
  storeMetadata,
  clearOfflineData,
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
  const [showSetup, setShowSetup] = useState<boolean>(false)
  const [downloading, setDownloading] = useState<boolean>(false)
  const [downloadProgress, setDownloadProgress] = useState<string>('')
  const [offlineStats, setOfflineStats] = useState<{total_roads: number; download_date: string} | null>(null)
  
  // Collapsible sections state
  const [showTraffic, setShowTraffic] = useState<boolean>(true)
  const [showSpeedZones, setShowSpeedZones] = useState<boolean>(true)
  const [showTcPositions, setShowTcPositions] = useState<boolean>(true)
  const [showIntersections, setShowIntersections] = useState<boolean>(true)
  const [showWeather, setShowWeather] = useState<boolean>(true)
  const [showAmenities, setShowAmenities] = useState<boolean>(true)

  // Check offline data status on mount
  useEffect(() => {
    checkOfflineStatus()
  }, [])

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions()
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
    } catch (e) {
      console.error('Failed to check offline status:', e)
    }
  }

  const handleDownloadOfflineData = async () => {
    setDownloading(true)
    setDownloadProgress('Checking for static data...')
    
    try {
      // Check if static data is available
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
        async (region, roads, speedZones) => {
          await storeRegionData(region, roads)
          await storeSpeedZones(speedZones)
        },
        (progress) => {
          setDownloadProgress(progress.message)
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
      
      setDownloadProgress(`✓ Loaded ${result.totalRoads} roads and ${result.totalSpeedZones} speed zones from ${result.regions.length} regions`)
      
      setTimeout(() => {
        setShowSetup(false)
        setDownloadProgress('')
      }, 3000)
      
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
      setDownloadProgress('Offline data cleared')
      setTimeout(() => setDownloadProgress(''), 2000)
    } catch (e) {
      setDownloadProgress('Failed to clear data')
    }
  }

  const fetchRegions = async () => {
    try {
      const response = await fetch('/api/roads?action=regions')
      const data = await response.json()
      if (data.regions && data.regions.length > 0) {
        setRegions(data.regions)
        // Set Wheatbelt as default if available, otherwise first region
        if (data.regions.includes('Wheatbelt')) {
          setSelectedRegion('Wheatbelt')
        } else {
          setSelectedRegion(data.regions[0])
        }
      }
    } catch (err) {
      setError('Failed to load regions')
    } finally {
      setLoadingRegions(false)
    }
  }

  const fetchRoads = async (region: string) => {
    setLoadingRoads(true)
    setSelectedRoad('') // Reset road selection when region changes
    try {
      const response = await fetch(`/api/roads?action=list&region=${encodeURIComponent(region)}`)
      const data = await response.json()
      setRoads(data.roads || [])
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
    setResult(null)
    setWeather(null)
    setTraffic(null)
    setPlaces(null)
    setCrossRoads([])
    setError('')
  }, [selectedRoad, roads])

  const handleSearch = async () => {
    if (!selectedRoad) {
      setError('Select a road')
      return
    }
    if (!startSlk) {
      setError('Enter Start SLK')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setWeather(null)
    setTraffic(null)
    setPlaces(null)
    setCrossRoads([])
    
    // Track if this is a single point lookup (no end SLK provided)
    const singlePoint = !endSlk || endSlk === ''
    setIsSinglePoint(singlePoint)

    try {
      // Use end_slk if provided, otherwise same as start (single point)
      const endSlkVal = endSlk || startSlk
      
      const response = await fetch('/api/roads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          road_id: selectedRoad,
          start_slk: parseFloat(startSlk),
          end_slk: parseFloat(endSlkVal),
        }),
      })
      
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error')
      } else {
        setResult(data)
        
        // Fetch additional data using midpoint
        if (data.midpoint) {
          fetchWeather(data.midpoint.lat, data.midpoint.lon)
          fetchTraffic(selectedRoad, data.midpoint.lat, data.midpoint.lon)
          fetchPlaces(data.midpoint.lat, data.midpoint.lon)
        }
        // Fetch cross roads using TC corridor
        fetchCrossRoads(data)
      }
    } catch (err) {
      setError('Failed to get location')
    } finally {
      setLoading(false)
    }
  }

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      const data = await response.json()
      if (response.ok) setWeather(data)
    } catch (err) {}
  }

  const fetchTraffic = async (roadId: string, lat?: number, lon?: number) => {
    try {
      let url = `/api/traffic?road_id=${roadId}`
      if (lat && lon) {
        url += `&lat=${lat}&lon=${lon}`
      }
      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) setTraffic(data)
    } catch (err) {}
  }

  const fetchPlaces = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/places?lat=${lat}&lon=${lon}`)
      const data = await response.json()
      if (response.ok) setPlaces(data)
    } catch (err) {}
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
    const params = new URLSearchParams()
    if (selectedRoad) {
      params.set('road_id', selectedRoad)
      params.set('road_name', roadInfo?.road_name || '')
      if (startSlk) params.set('slk', startSlk)
    }
    params.set('autostart', 'true')
    window.location.href = `/drive?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header with Setup Icon */}
        <div className="flex items-center justify-between mb-1">
          <div className="w-8"></div>
          <h1 className="text-xl font-bold text-center flex-1">
            TC Work Zone Locator
          </h1>
          <button
            onClick={() => setShowSetup(!showSetup)}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-lg ${
              offlineReady ? 'bg-green-600' : 'bg-gray-700'
            } hover:opacity-80`}
            title="Setup offline data"
          >
            ⚙️
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mb-4">
          v2.7.1 {offlineReady && <span className="text-green-400">• 69K Roads • 8 Regions</span>}
        </p>

        {/* Setup Dialog */}
        {showSetup && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
            <h3 className="text-sm font-semibold text-blue-400 mb-3">📦 Offline Data Setup</h3>
            
            {offlineStats ? (
              <div className="mb-3 text-sm">
                <p className="text-green-400">✓ Offline data downloaded</p>
                <p className="text-gray-400">{offlineStats.total_roads} roads</p>
                <p className="text-gray-500 text-xs">Downloaded: {new Date(offlineStats.download_date).toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mb-3">
                Download road data for offline SLK tracking without internet.
              </p>
            )}
            
            {downloadProgress && (
              <p className={`text-sm mb-3 ${downloadProgress.startsWith('✓') ? 'text-green-400' : downloadProgress.startsWith('Error') ? 'text-red-400' : 'text-blue-400'}`}>
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
          </div>
        )}

        {/* Quick Start SLK Tracking Button */}
        <div className="mb-4">
          <Button 
            onClick={startSlkTracking}
            className="w-full h-12 text-lg bg-orange-600 hover:bg-orange-700"
          >
            📍 Start SLK Tracking
          </Button>
          <p className="text-xs text-gray-500 text-center mt-1">
            Auto-start GPS tracking for real-time SLK updates
          </p>
        </div>

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
                📍 Local Roads (use GPS lookup)
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
          // Local road - show GPS info or message
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
              // No GPS lookup yet
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">
                  Use GPS lookup above to find a local road
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Local roads cannot be browsed manually
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

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm mt-4">{error}</p>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            
            {/* Work Zone Summary */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-400 border-b border-gray-700 pb-2 mb-3">
                📍 Work Zone Summary
              </h3>
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
              </div>
              
              {/* Navigate to SLK button for single point lookup */}
              {isSinglePoint && result.work_zone.start && (
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={() => openGoogleMaps(result.google_maps.work_zone_start)}
                    className="flex-1 h-12 text-base bg-green-600 hover:bg-green-700"
                  >
                    🗺️ Navigate
                  </Button>
                  <Button 
                    onClick={() => openStreetView(result.work_zone.start!.lat, result.work_zone.start!.lon)}
                    className="h-12 px-4 bg-blue-600 hover:bg-blue-700"
                    title="Street View"
                  >
                    🏠
                  </Button>
                  <Button 
                    onClick={() => {
                      const params = new URLSearchParams({
                        road_id: result.road_id,
                        road_name: result.road_name,
                        slk: result.work_zone.start_slk.toString(),
                        autostart: 'true'
                      })
                      window.location.href = `/drive?${params.toString()}`
                    }}
                    className="h-12 px-4 bg-orange-600 hover:bg-orange-700"
                    title="Track SLK"
                  >
                    📍
                  </Button>
                </div>
              )}
            </div>

            {/* Traffic Volume */}
            {traffic && (
              <div className="bg-gray-800 rounded-lg">
                <button
                  onClick={() => setShowTraffic(!showTraffic)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <h3 className="text-sm font-semibold text-blue-400">
                    🚗 Traffic Volume
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

            {/* Speed Zones */}
            <div className="bg-gray-800 rounded-lg">
              <button
                onClick={() => setShowSpeedZones(!showSpeedZones)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <h3 className="text-sm font-semibold text-blue-400">
                  ⚡ Speed Zones
                </h3>
                <span className="text-gray-400 text-lg">{showSpeedZones ? '−' : '+'}</span>
              </button>
              {showSpeedZones && (
                <div className="px-4 pb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 border-b border-gray-700">
                      <span className="text-gray-400">Reinstatement Signs (Start)</span>
                      <span className="font-mono text-yellow-400">{result.speed_zones.approach_start}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-700">
                      <span className="text-gray-400">TC Position (Start)</span>
                      <span className="font-mono text-orange-400">{result.speed_zones.tc_start}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-700 bg-blue-900/30 px-2 rounded">
                      <span className="text-gray-300">Work Zone</span>
                      <span className="font-mono text-red-400 font-bold">{result.speed_zones.work_zone_start}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-700">
                      <span className="text-gray-400">TC Position (End)</span>
                      <span className="font-mono text-orange-400">{result.speed_zones.tc_end}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Reinstatement Signs (End)</span>
                      <span className="font-mono text-yellow-400">{result.speed_zones.approach_end}</span>
                    </div>
                  </div>
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
                  <div className="space-y-3">
                    <div className="bg-gray-700/50 rounded p-3">
                      <p className="text-sm font-medium">TC Start - SLK {result.tc_positions.start_slk.toFixed(2)}</p>
                      {result.tc_positions.start && (
                        <p className="text-xs text-gray-400 font-mono mt-1">
                          {result.tc_positions.start.lat.toFixed(6)}, {result.tc_positions.start.lon.toFixed(6)}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button 
                          onClick={() => openGoogleMaps(result.google_maps.tc_start)}
                          className="flex-1 h-9 text-sm bg-green-600 hover:bg-green-700"
                        >
                          🗺️ Navigate
                        </Button>
                        {result.tc_positions.start && (
                          <Button 
                            onClick={() => openStreetView(result.tc_positions.start!.lat, result.tc_positions.start!.lon)}
                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
                            title="Street View"
                          >
                            🏠
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-700/50 rounded p-3">
                      <p className="text-sm font-medium">TC End - SLK {result.tc_positions.end_slk.toFixed(2)}</p>
                      {result.tc_positions.end && (
                        <p className="text-xs text-gray-400 font-mono mt-1">
                          {result.tc_positions.end.lat.toFixed(6)}, {result.tc_positions.end.lon.toFixed(6)}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button 
                          onClick={() => openGoogleMaps(result.google_maps.tc_end)}
                          className="flex-1 h-9 text-sm bg-green-600 hover:bg-green-700"
                        >
                          🗺️ Navigate
                        </Button>
                        {result.tc_positions.end && (
                          <Button 
                            onClick={() => openStreetView(result.tc_positions.end!.lat, result.tc_positions.end!.lon)}
                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
                            title="Street View"
                          >
                            🏠
                          </Button>
                        )}
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
                  </h3>
                  <span className="text-gray-400 text-lg">{showWeather ? '−' : '+'}</span>
                </button>
                {showWeather && (
                  <div className="px-4 pb-4">
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
                        <p className="text-xs text-gray-500">Gusts: {weather.current.windGust} km/h</p>
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
                  </h3>
                  <span className="text-gray-400 text-lg">{showAmenities ? '−' : '+'}</span>
                </button>
                {showAmenities && (
                  <div className="px-4 pb-4">
                    {/* Hospital */}
                    {places.hospital ? (
                      <div className="mb-4">
                        <p className="font-medium text-red-400">
                          🏥 {places.hospital.name}
                          <span className="text-gray-500 text-sm ml-2">({places.hospital.distance} km)</span>
                          {places.hospital.isEmergency && (
                            <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded ml-1">Emergency</span>
                          )}
                        </p>
                        {places.hospital.phone && (
                          <p className="text-sm text-gray-400">📞 {places.hospital.phone}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button 
                            onClick={() => openGoogleMaps(places.hospital?.googleMapsUrl || null)}
                            className="flex-1 h-9 text-sm bg-green-600 hover:bg-green-700"
                          >
                            🗺️ Navigate
                          </Button>
                          <Button 
                            onClick={() => openStreetView(places.hospital!.lat, places.hospital!.lon)}
                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
                            title="Street View"
                          >
                            🏠
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mb-4">No hospital found nearby</p>
                    )}
                    
                    {/* Fuel Station */}
                    {places.fuelStation ? (
                      <div className="mb-4">
                        <p className="font-medium text-yellow-400">
                          ⛽ {places.fuelStation.name}
                          <span className="text-gray-500 text-sm ml-2">({places.fuelStation.distance} km)</span>
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            onClick={() => openGoogleMaps(places.fuelStation?.googleMapsUrl || null)}
                            className="flex-1 h-9 text-sm bg-green-600 hover:bg-green-700"
                          >
                            🗺️ Navigate
                          </Button>
                          <Button 
                            onClick={() => openStreetView(places.fuelStation!.lat, places.fuelStation!.lon)}
                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
                            title="Street View"
                          >
                            🏠
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm mb-4">No fuel station found nearby</p>
                    )}
                    
                    {/* Toilet */}
                    {places.toilet ? (
                      <div>
                        <p className="font-medium text-blue-400">
                          🚻 {places.toilet.name}
                          <span className="text-gray-500 text-sm ml-2">({places.toilet.distance} km)</span>
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            onClick={() => openGoogleMaps(places.toilet?.googleMapsUrl || null)}
                            className="flex-1 h-9 text-sm bg-green-600 hover:bg-green-700"
                          >
                            🗺️ Navigate
                          </Button>
                          <Button 
                            onClick={() => openStreetView(places.toilet!.lat, places.toilet!.lon)}
                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
                            title="Street View"
                          >
                            🏠
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No public toilet found nearby</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Export Button */}
            <Button 
              onClick={exportReport}
              disabled={exporting}
              className="w-full h-12 text-base bg-purple-600 hover:bg-purple-700"
            >
              {exporting ? 'Exporting...' : '📄 Export Report'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
