'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  initDB, 
  isOfflineDataAvailable as checkOfflineData,
  findRoadNearGps,
  getSpeedZones
} from '@/lib/offline-db';

interface GeoLocation {
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  accuracy: number;
}

interface RoadInfo {
  road_id: string;
  road_name: string;
  slk: number;
  network_type: string;
  distance_m: number;
}

interface SpeedZone {
  road_id: string;
  start_slk: number;
  end_slk: number;
  speed_limit: number; // Parsed number (was "110km/h" string from MRWA)
}

interface CalibrationSettings {
  [roadId: string]: number;
}

function DriveContent() {
  const searchParams = useSearchParams();
  
  // Destination from URL params
  const destRoadId = searchParams.get('road_id') || '';
  const destRoadName = searchParams.get('road_name') || '';
  const destSlkStr = searchParams.get('slk') || '';
  const destSlk = destSlkStr ? parseFloat(destSlkStr) : 0;
  
  // Offline data state
  const [offlineReady, setOfflineReady] = useState(false);
  
  // Location state
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
  const [locationError, setLocationError] = useState('');
  const [watchId, setWatchId] = useState<number | null>(null);
  
  // Road info from GPS
  const [roadInfo, setRoadInfo] = useState<RoadInfo | null>(null);
  const [roadLoading, setRoadLoading] = useState(false);
  
  // Speed limit from MRWA data
  const [speedLimit, setSpeedLimit] = useState<number>(100);
  const [speedZones, setSpeedZones] = useState<SpeedZone[]>([]);
  
  // Calibration state
  const [calibrations, setCalibrations] = useState<CalibrationSettings>(() => {
    // Initialize from localStorage synchronously
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('slkCalibrations');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return {};
        }
      }
    }
    return {};
  });
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [calibrateSlk, setCalibrateSlk] = useState('');
  const [calibrateMessage, setCalibrateMessage] = useState('');
  
  // Refs
  const roadFetchTime = useRef(0);
  const previousSlkRef = useRef<number | null>(null);

  // Initialize offline database
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        await initDB();
        const hasData = await checkOfflineData();
        if (mounted) {
          setOfflineReady(hasData);
          console.log('Offline data available:', hasData);
        }
      } catch (e) {
        console.error('Failed to init offline DB:', e);
      }
    };
    init();
    
    return () => { mounted = false; };
  }, []);

  // Apply calibration offset to SLK
  const getCalibratedSlk = (roadId: string, rawSlk: number): number => {
    const offset = calibrations[roadId];
    if (offset !== undefined) {
      return rawSlk + offset;
    }
    return rawSlk;
  };

  // Get current calibrated SLK
  const calibratedSlk = roadInfo ? getCalibratedSlk(roadInfo.road_id, roadInfo.slk) : null;
  const currentOffset = roadInfo ? calibrations[roadInfo.road_id] : undefined;

  // Save calibration
  const saveCalibration = () => {
    if (!roadInfo || !calibrateSlk) return;
    
    const knownSlk = parseFloat(calibrateSlk);
    if (isNaN(knownSlk)) {
      setCalibrateMessage('Invalid SLK value');
      return;
    }
    
    const offset = knownSlk - roadInfo.slk;
    const newCalibrations = { ...calibrations, [roadInfo.road_id]: offset };
    setCalibrations(newCalibrations);
    localStorage.setItem('slkCalibrations', JSON.stringify(newCalibrations));
    
    setCalibrateMessage(`Offset saved: ${offset >= 0 ? '+' : ''}${offset.toFixed(3)} km`);
    setTimeout(() => {
      setShowCalibrate(false);
      setCalibrateMessage('');
      setCalibrateSlk('');
    }, 1500);
  };

  // Clear calibration
  const clearCalibration = () => {
    if (!roadInfo) return;
    
    const newCalibrations = { ...calibrations };
    delete newCalibrations[roadInfo.road_id];
    setCalibrations(newCalibrations);
    localStorage.setItem('slkCalibrations', JSON.stringify(newCalibrations));
    setCalibrateMessage('Calibration cleared');
    setTimeout(() => setCalibrateMessage(''), 1500);
  };

  // Direction tracking
  const [direction, setDirection] = useState<'towards' | 'away' | 'static' | null>(null);
  
  // Update direction based on movement - use setTimeout to defer setState
  useEffect(() => {
    if (calibratedSlk === null || destSlk === 0 || roadInfo?.road_id !== destRoadId) {
      if (direction !== null) {
        setTimeout(() => setDirection(null), 0);
      }
      return;
    }
    
    const currentSpeedKmh = currentLocation ? Math.round(currentLocation.speed * 3.6) : 0;
    const isMoving = currentSpeedKmh > 3;
    
    const prevSlk = previousSlkRef.current;
    let newDirection: 'towards' | 'away' | 'static' | null = null;
    
    if (!isMoving) {
      newDirection = 'static';
    } else if (prevSlk !== null) {
      const currentDistToDest = Math.abs(destSlk - calibratedSlk);
      const prevDistToDest = Math.abs(destSlk - prevSlk);
      
      if (currentDistToDest < prevDistToDest - 0.001) {
        newDirection = 'towards';
      } else if (currentDistToDest > prevDistToDest + 0.001) {
        newDirection = 'away';
      } else {
        newDirection = 'static';
      }
    }
    
    previousSlkRef.current = calibratedSlk;
    
    if (newDirection !== direction) {
      setTimeout(() => setDirection(newDirection), 0);
    }
   
  }, [calibratedSlk, currentLocation, destSlk, destRoadId, roadInfo?.road_id]);

  // Derive current speed limit from speed zones based on SLK
  const currentSpeedLimit = (() => {
    if (!speedZones.length || calibratedSlk === null) {
      return speedLimit; // Fall back to initial speed limit
    }
    
    // Sort zones by start_slk for proper ordering
    const sortedZones = [...speedZones].sort((a, b) => a.start_slk - b.start_slk);
    
    for (const zone of sortedZones) {
      if (calibratedSlk >= zone.start_slk && calibratedSlk <= zone.end_slk) {
        return zone.speed_limit;
      }
    }
    
    return speedLimit; // Default to initial if no matching zone
  })();

  // Derive next speed zone for advance warning
  const nextSpeedZone = (() => {
    if (!speedZones.length || calibratedSlk === null) return null;
    
    // Sort zones by start_slk for proper ordering
    const sortedZones = [...speedZones].sort((a, b) => a.start_slk - b.start_slk);
    
    for (const zone of sortedZones) {
      if (zone.start_slk > calibratedSlk) {
        return {
          speed_limit: zone.speed_limit,
          distance_km: zone.start_slk - calibratedSlk
        };
      }
    }
    
    return null;
  })();

  // Distance calculation
  const distanceToDest = (() => {
    if (!roadInfo || !destSlk || roadInfo.road_id !== destRoadId || calibratedSlk === null) return null;
    return Math.abs(destSlk - calibratedSlk);
  })();

  // Current speed
  const currentSpeedKmh = currentLocation ? Math.round(currentLocation.speed * 3.6) : 0;
  const isSpeeding = currentSpeedKmh > currentSpeedLimit;

  // Fetch road info using offline data (client-side)
  const fetchRoadInfoOffline = async (lat: number, lon: number) => {
    if (!offlineReady) return false;
    
    try {
      const result = await findRoadNearGps(lat, lon, 0.5); // 500m search radius
      
      if (result) {
        setRoadInfo({
          road_id: result.road_id,
          road_name: result.road_name,
          slk: result.slk,
          network_type: result.network_type,
          distance_m: result.distance_m
        });
        
        // Get speed zones for this road from offline data
        const zones = await getSpeedZones(result.road_id);
        if (zones && zones.length > 0) {
          setSpeedZones(zones);
          // Find applicable speed zone
          for (const zone of zones) {
            if (result.slk >= zone.start_slk && result.slk <= zone.end_slk) {
              setSpeedLimit(zone.speed_limit);
              break;
            }
          }
        }
        return true;
      }
    } catch (e) {
      console.error('Offline lookup failed:', e);
    }
    return false;
  };

  // Fetch road info from API (fallback)
  const fetchRoadInfoOnline = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/gps?lat=${lat}&lon=${lon}`);
      const data = await response.json();
      
      if (response.ok && data.road_id) {
        setRoadInfo({
          road_id: data.road_id,
          road_name: data.road_name,
          slk: data.slk,
          network_type: data.network_type,
          distance_m: data.distance_m
        });
      }
    } catch (e) {
      console.error('Online lookup failed:', e);
    }
  };

  // Main fetch function - prefers offline
  const fetchRoadInfo = async (lat: number, lon: number) => {
    setRoadLoading(true);
    
    // Try offline first
    const found = await fetchRoadInfoOffline(lat, lon);
    
    // Fall back to online if offline didn't work
    if (!found) {
      await fetchRoadInfoOnline(lat, lon);
    }
    
    setRoadLoading(false);
  };

  // Start GPS tracking
  function startTracking() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }

    setLocationError('');
    
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
          accuracy: position.coords.accuracy
        });

        // Fetch road info every 0.5 seconds
        const now = Date.now();
        if (now - roadFetchTime.current > 500) {
          roadFetchTime.current = now;
          fetchRoadInfo(position.coords.latitude, position.coords.longitude);
        }
      },
      (error) => {
        setLocationError(`GPS Error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 500,
        timeout: 10000
      }
    );

    setWatchId(id);
  }

  // Stop GPS tracking
  function stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setCurrentLocation(null);
      setRoadInfo(null);
      previousSlkRef.current = null;
    }
  }

  // Auto-start if autostart=true
  useEffect(() => {
    const autostart = searchParams.get('autostart');
    if (autostart === 'true' && watchId === null) {
      // Use setTimeout to defer the call
      const timer = setTimeout(() => {
        startTracking();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, startTracking, watchId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Format time for ETA
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const etaSeconds = (distanceToDest && currentSpeedKmh > 3) 
    ? (distanceToDest / currentSpeedKmh) * 3600 
    : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 max-w-lg mx-auto">
      {/* Back Link */}
      <a href="/" className="inline-flex items-center text-blue-400 text-sm mb-4 hover:text-blue-300">
        ← Back to Work Zone Locator
      </a>
      
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-xl font-bold text-blue-400">SLK Tracking</h1>
        <p className="text-xs text-gray-400">v2.6.4 {offlineReady && <span className="text-green-400">• Offline Ready</span>}</p>
        {offlineReady ? (
          <p className="text-xs text-green-400 mt-1">📦 Offline Mode Ready</p>
        ) : (
          <p className="text-xs text-amber-400 mt-1">🌐 Online Mode</p>
        )}
      </div>

      {/* GPS Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">SLK Tracking</span>
          {watchId !== null ? (
            <span className="text-green-400 text-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Active
            </span>
          ) : (
            <span className="text-gray-500 text-sm">Inactive</span>
          )}
        </div>
        
        {watchId === null ? (
          <Button onClick={startTracking} className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base">
            📍 Start SLK Tracking
          </Button>
        ) : (
          <Button onClick={stopTracking} className="w-full bg-red-600 hover:bg-red-700 h-12 text-base">
            ⏹️ Stop Tracking
          </Button>
        )}
        
        {locationError && (
          <p className="text-red-400 text-sm mt-2">{locationError}</p>
        )}
      </div>

      {/* Current Speed Display */}
      {currentLocation && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            {/* Current Speed */}
            <div className="text-center flex-1">
              <div className={`text-5xl font-bold font-mono ${isSpeeding ? 'text-red-500' : 'text-green-400'}`}>
                {currentSpeedKmh}
              </div>
              <p className="text-gray-400 text-sm">km/h</p>
              {isSpeeding && (
                <p className="text-red-400 text-xs mt-1">⚠️ Over limit</p>
              )}
            </div>
            
            {/* Divider */}
            <div className="w-px h-16 bg-gray-600 mx-4"></div>
            
            {/* Speed Limit */}
            <div className="text-center flex-1">
              <div className="flex items-center justify-center">
                <div className={`rounded-full w-16 h-16 flex items-center justify-center ${
                  isSpeeding 
                    ? 'bg-red-900 border-4 border-red-500 animate-pulse' 
                    : 'bg-black border-4 border-white'
                }`}>
                  <span className={`font-bold text-xl ${isSpeeding ? 'text-red-400' : 'text-white'}`}>{currentSpeedLimit}</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-1">Posted Limit</p>
              {speedZones.length > 0 && (
                <p className="text-xs text-gray-500">From MRWA Data</p>
              )}
            </div>
          </div>
          
          {/* Next Speed Zone Warning */}
          {nextSpeedZone && nextSpeedZone.distance_km < 2 && (
            <div className="mt-3 bg-amber-900/30 border border-amber-600 rounded p-2 text-center">
              <p className="text-amber-400 text-sm">
                ⚠️ Speed changes to <span className="font-bold">{nextSpeedZone.speed_limit} km/h</span> in {nextSpeedZone.distance_km < 0.5 ? `${Math.round(nextSpeedZone.distance_km * 1000)}m` : `${nextSpeedZone.distance_km.toFixed(2)} km`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Trip Progress - Only when on same road as destination */}
      {currentLocation && roadInfo && destRoadId && roadInfo.road_id === destRoadId && distanceToDest !== null && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-green-400 mb-3">📊 Trip Progress</h3>
          
          {/* Current SLK with direction color */}
          <div className="text-center mb-4">
            <div className={`text-5xl font-bold font-mono ${
              direction === 'away' 
                ? 'text-red-500 animate-pulse' 
                : direction === 'towards' 
                  ? 'text-green-400' 
                  : 'text-yellow-400'
            }`}>
              {calibratedSlk?.toFixed(2)}
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {direction === 'away' && '⚠️ Moving away from target'}
              {direction === 'towards' && '✓ Approaching target'}
              {direction === 'static' && '📍 Stationary'}
              {direction === null && 'Current SLK (km)'}
              {currentOffset !== undefined && (
                <span className="text-cyan-400 ml-2">(calibrated)</span>
              )}
            </p>
          </div>
          
          {/* Destination Info */}
          <div className="bg-gray-700 rounded-lg p-3 mb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-400">Road ID</p>
                <p className="font-mono text-purple-400 font-medium">{destRoadId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Road Name</p>
                <p className="text-white font-medium truncate">{destRoadName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Target SLK</p>
                <p className="font-mono text-yellow-400 font-medium">{destSlk.toFixed(2)} km</p>
              </div>
            </div>
          </div>
          
          {/* Calibration Button */}
          <div className="mb-4">
            <Button 
              onClick={() => setShowCalibrate(!showCalibrate)}
              className="w-full bg-gray-700 hover:bg-gray-600 text-sm h-9"
            >
              🎯 Calibrate SLK {currentOffset !== undefined ? `(${currentOffset >= 0 ? '+' : ''}${currentOffset.toFixed(3)})` : ''}
            </Button>
            
            {showCalibrate && (
              <div className="bg-gray-700 rounded p-3 mt-2">
                <p className="text-xs text-gray-400 mb-2">
                  Raw: {roadInfo.slk.toFixed(2)} km → Enter known SLK:
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 22.15"
                    value={calibrateSlk}
                    onChange={(e) => setCalibrateSlk(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white h-10"
                  />
                  <Button 
                    onClick={saveCalibration}
                    className="bg-green-600 hover:bg-green-700 h-10"
                    disabled={!calibrateSlk}
                  >
                    Save
                  </Button>
                </div>
                {currentOffset !== undefined && (
                  <Button 
                    onClick={clearCalibration}
                    className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm"
                  >
                    Clear Calibration
                  </Button>
                )}
                {calibrateMessage && (
                  <p className="text-xs text-green-400 mt-2">{calibrateMessage}</p>
                )}
              </div>
            )}
          </div>

          {/* Distance & ETA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">Distance Remaining</p>
              {distanceToDest < 0.1 ? (
                <p className="text-xl font-bold text-green-400">ARRIVED!</p>
              ) : distanceToDest < 1 ? (
                <p className="text-3xl font-bold text-white">{Math.round(distanceToDest * 1000)} m</p>
              ) : (
                <p className="text-xl font-bold text-white">{distanceToDest.toFixed(2)} km</p>
              )}
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400">ETA</p>
              <p className="text-xl font-bold text-white">{etaSeconds ? formatTime(etaSeconds) : '--:--'}</p>
              {etaSeconds && currentSpeedKmh > 3 && (
                <p className="text-xs text-gray-500">@ {currentSpeedKmh} km/h</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Location - When on different road */}
      {currentLocation && (!destRoadId || !roadInfo || roadInfo.road_id !== destRoadId) && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">📍 Current Location</h3>
          
          {roadLoading && !roadInfo ? (
            <p className="text-gray-400 text-sm">Looking up road info...</p>
          ) : roadInfo ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Road ID</span>
                <span className="font-mono text-green-400">{roadInfo.road_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Road Name</span>
                <span className="text-white">{roadInfo.road_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">SLK</span>
                <div className="text-right">
                  <span className="font-mono text-yellow-400 text-lg">{calibratedSlk?.toFixed(2)} km</span>
                  {currentOffset !== undefined && (
                    <span className="text-xs text-cyan-400 ml-2">({currentOffset >= 0 ? '+' : ''}{currentOffset.toFixed(3)})</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Road Type</span>
                <span className={`text-sm ${roadInfo.network_type === 'Local Road' ? 'text-amber-400' : 'text-blue-400'}`}>
                  {roadInfo.network_type}
                </span>
              </div>
              
              <Button 
                onClick={() => setShowCalibrate(!showCalibrate)}
                className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-sm"
              >
                🎯 Calibrate SLK
              </Button>
              
              {showCalibrate && (
                <div className="bg-gray-700 rounded p-3 mt-2">
                  <p className="text-xs text-gray-400 mb-2">Enter the known SLK at your current location:</p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 22.15"
                      value={calibrateSlk}
                      onChange={(e) => setCalibrateSlk(e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white h-10"
                    />
                    <Button 
                      onClick={saveCalibration}
                      className="bg-green-600 hover:bg-green-700 h-10"
                      disabled={!calibrateSlk}
                    >
                      Save
                    </Button>
                  </div>
                  {currentOffset !== undefined && (
                    <Button onClick={clearCalibration} className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm">
                      Clear Calibration
                    </Button>
                  )}
                  {calibrateMessage && <p className="text-xs text-green-400 mt-2">{calibrateMessage}</p>}
                </div>
              )}
            </div>
          ) : (
            <Button 
              onClick={() => currentLocation && fetchRoadInfo(currentLocation.lat, currentLocation.lon)}
              disabled={roadLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {roadLoading ? 'Looking up...' : '🔍 Lookup Road Info'}
            </Button>
          )}
        </div>
      )}

      {/* Destination Location */}
      {currentLocation && destRoadId && (!roadInfo || roadInfo.road_id !== destRoadId) && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-purple-400 mb-3">🎯 Destination</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Road ID</span>
              <span className="font-mono text-purple-400">{destRoadId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Road Name</span>
              <span className="text-white">{destRoadName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Target SLK</span>
              <span className="font-mono text-yellow-400">{destSlk.toFixed(2)} km</span>
            </div>
          </div>
        </div>
      )}

      {/* No GPS fix yet */}
      {watchId !== null && !currentLocation && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 text-center">
          <p className="text-gray-400">Waiting for GPS fix...</p>
        </div>
      )}
    </div>
  );
}

export default function DrivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 text-white p-4">Loading...</div>}>
      <DriveContent />
    </Suspense>
  );
}
