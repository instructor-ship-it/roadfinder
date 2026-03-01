'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  initDB,
  isOfflineDataAvailable as checkOfflineData,
  getSpeedZones,
  type ParsedSpeedZone
} from '@/lib/offline-db';
import { useGpsTracking, useGpsSettings, type GpsTrackingConfig } from '@/hooks/useGpsTracking';

// App version
const APP_VERSION = '5.3.2';

// GPS lag compensation from localStorage
interface GpsLagSettings {
  gpsLagCompensation?: number;
  speedLookaheadTime?: number;
}

function DriveContent() {
  const searchParams = useSearchParams();

  // Destination from URL params
  const destRoadId = searchParams.get('road_id') || '';
  const destRoadName = searchParams.get('road_name') || '';
  const destSlkStr = searchParams.get('slk') || '';
  const destSlk = destSlkStr ? parseFloat(destSlkStr) : 0;

  // Get GPS settings from localStorage
  const { settings } = useGpsSettings();

  // Get GPS lag compensation from main gpsSettings
  const [lagSettings, setLagSettings] = useState<GpsLagSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gpsSettings');
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

  // GPS tracking with EKF
  const {
    position,
    ekfOutput,
    roadInfo,
    currentSpeed,
    speedLimit,
    isSpeeding,
    speedZones,
    distanceToDest,
    eta,
    direction,
    isTracking,
    isPredicted,
    uncertainty,
    confidence,
    outageDuration,
    lastUpdate,
    error,
    startTracking,
    stopTracking,
    getEkfInfo,
  } = useGpsTracking(destRoadId, destSlk, settings as Partial<GpsTrackingConfig>);

  // Track SLK direction (increasing or decreasing)
  const prevSlkRef = useRef<number | null>(null);
  const [slkDirection, setSlkDirection] = useState<'increasing' | 'decreasing' | null>(null);

  // Update SLK direction when SLK changes
  useEffect(() => {
    if (roadInfo?.slk !== undefined && currentSpeed >= 5) {
      const currentSlk = roadInfo.slk;
      if (prevSlkRef.current !== null) {
        const diff = currentSlk - prevSlkRef.current;
        // Require minimum 0.001 km difference to determine direction (avoids GPS jitter)
        if (Math.abs(diff) > 0.001) {
          const newDirection = diff > 0 ? 'increasing' : 'decreasing';
          // Use queueMicrotask to avoid synchronous setState in effect
          queueMicrotask(() => setSlkDirection(newDirection));
        }
      }
      prevSlkRef.current = currentSlk;
    }
  }, [roadInfo?.slk, currentSpeed]);

  // Calculate upcoming speed zone with bidirectional support
  const upcomingZone = (() => {
    if (!roadInfo || speedZones.length === 0 || currentSpeed < 5) {
      return null;
    }

    const currentSlk = roadInfo.slk;
    const speedMs = currentSpeed / 3.6;
    const baseLookahead = lagSettings.speedLookaheadTime || 5;
    const lagCompensation = lagSettings.gpsLagCompensation || 0;
    const effectiveLookahead = baseLookahead + lagCompensation;
    const lookaheadDistanceKm = (speedMs * effectiveLookahead) / 1000;

    // slkDirection is now from state
    
    // Find current zone
    const currentZone = speedZones.find(z => currentSlk >= z.start_slk && currentSlk <= z.end_slk);
    const currentSpeedLimit = currentZone?.speed_limit || speedLimit;

    if (slkDirection === 'increasing') {
      // Traveling towards higher SLK values
      // Look for zone boundaries ahead (zone.start_slk > currentSlk)
      for (const zone of speedZones) {
        if (zone.start_slk > currentSlk && zone.start_slk <= currentSlk + lookaheadDistanceKm * 2) {
          const distanceToZone = (zone.start_slk - currentSlk) * 1000;
          const isDecrease = zone.speed_limit < currentSpeedLimit;
          
          if (isDecrease) {
            return {
              speedLimit: zone.speed_limit,
              distance: distanceToZone,
              isDecrease: true,
              direction: 'increasing' as const,
            };
          }
        }
      }
    } else if (slkDirection === 'decreasing') {
      // Traveling towards lower SLK values
      // Look for zone boundaries ahead (zone.end_slk < currentSlk)
      // When decreasing SLK, we're approaching the END of higher-SLK zones
      // which is the START of lower-SLK zones
      
      for (const zone of speedZones) {
        // We're looking for a zone that ENDS ahead of us (lower SLK)
        // This means we're entering this zone from its end_slk side
        if (zone.end_slk < currentSlk && zone.end_slk >= currentSlk - lookaheadDistanceKm * 2) {
          const distanceToZone = (currentSlk - zone.end_slk) * 1000;
          const isDecrease = zone.speed_limit < currentSpeedLimit;
          
          if (isDecrease) {
            return {
              speedLimit: zone.speed_limit,
              distance: distanceToZone,
              isDecrease: true,
              direction: 'decreasing' as const,
            };
          }
        }
      }
    }

    return null;
  })();

  // Offline data state
  const [offlineReady, setOfflineReady] = useState(false);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);

  // Tools menu state
  const [showTools, setShowTools] = useState(false);

  // Destination coordinates state
  const [destCoords, setDestCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Initialize offline database
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await initDB();
        const hasData = await checkOfflineData();
        if (mounted) {
          setOfflineReady(hasData);
        }
      } catch (e) {
        console.error('Failed to init offline DB:', e);
      }
    };
    init();

    return () => { mounted = false; };
  }, []);

  // Clear old SLK calibration data from localStorage (deprecated feature)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('slkCalibrations');
    }
  }, []);

  // Fetch destination coordinates when destination is set
  useEffect(() => {
    const fetchDestCoords = async () => {
      if (!destRoadId || !destSlk) return;

      try {
        const response = await fetch(`/api/roads?action=locate&road_id=${encodeURIComponent(destRoadId)}&slk=${destSlk}`);
        if (response.ok) {
          const data = await response.json();
          if (data.latitude && data.longitude) {
            setDestCoords({ lat: data.latitude, lon: data.longitude });
          }
        }
      } catch (e) {
        console.error('Failed to fetch destination coords:', e);
      }
    };

    fetchDestCoords();
  }, [destRoadId, destSlk]);

  // Auto-start if autostart=true
  useEffect(() => {
    const autostart = searchParams.get('autostart');
    if (autostart === 'true' && !isTracking) {
      const timer = setTimeout(() => {
        startTracking();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, isTracking, startTracking]);

  // Generate debug info for troubleshooting
  const generateDebugInfo = () => {
    const lines: string[] = [];
    lines.push('=== SLK Tracking Debug Info ===');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Version: ${APP_VERSION} (EKF GPS Filtering)`);
    lines.push('');
    lines.push('=== Destination ===');
    lines.push(`Road ID: ${destRoadId}`);
    lines.push(`Road Name: ${destRoadName}`);
    lines.push(`Target SLK: ${destSlk}`);
    lines.push('');
    lines.push('=== Current Location ===');
    lines.push(`Lat: ${position?.lat}`);
    lines.push(`Lon: ${position?.lon}`);
    lines.push(`Speed: ${Math.round(currentSpeed)} km/h`);
    lines.push('');
    lines.push('=== EKF Status ===');
    lines.push(`EKF Enabled: ${settings.ekfEnabled}`);
    lines.push(`Is Predicted: ${isPredicted}`);
    lines.push(`Uncertainty: ${uncertainty.toFixed(2)}m`);
    lines.push(`Confidence: ${confidence}`);
    lines.push(`Outage Duration: ${outageDuration}ms`);
    const ekfInfo = getEkfInfo();
    if (ekfInfo) {
      lines.push(`Can Predict: ${ekfInfo.canPredict}`);
      lines.push(`Remaining Time: ${ekfInfo.remainingTime}s`);
    }
    lines.push('');
    lines.push('=== Road Info ===');
    lines.push(`Road ID: ${roadInfo?.road_id}`);
    lines.push(`Road Name: ${roadInfo?.road_name}`);
    lines.push(`Current SLK: ${roadInfo?.slk}`);
    lines.push(`SLK Direction: ${slkDirection || 'unknown'}`);
    lines.push(`Network Type: ${roadInfo?.network_type}`);
    lines.push(`Distance from road: ${roadInfo?.distance_m}m`);
    lines.push('');
    lines.push('=== Speed Zones ===');
    lines.push(`Total zones loaded: ${speedZones.length}`);
    lines.push(`Current speed limit: ${speedLimit} km/h`);
    lines.push(`Is speeding: ${isSpeeding}`);
    if (upcomingZone) {
      lines.push(`Upcoming zone: ${upcomingZone.speedLimit} km/h in ${Math.round(upcomingZone.distance)}m (${upcomingZone.direction})`);
    }
    lines.push('');
    lines.push('=== GPS Lag Compensation ===');
    lines.push(`Lag compensation: ${lagSettings.gpsLagCompensation || 0}s`);
    lines.push('');
    lines.push('=== Direction ===');
    lines.push(`Direction: ${direction}`);
    lines.push(`Distance to dest: ${distanceToDest?.toFixed(3)} km`);
    lines.push('');
    lines.push('=== Offline Status ===');
    lines.push(`Offline Ready: ${offlineReady}`);
    lines.push('');
    lines.push('=== Error ===');
    lines.push(`Error: ${error || 'None'}`);

    setDebugInfo(lines.join('\n'));
    setShowDebug(true);
  };

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

  // Open Google Maps navigation to destination
  const openGoogleMaps = () => {
    if (destCoords) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destCoords.lat},${destCoords.lon}`, '_blank')
    }
  }

  // Open Street View at destination
  const openStreetView = () => {
    if (destCoords) {
      window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${destCoords.lat},${destCoords.lon}`, '_blank')
    }
  }

  // Get confidence color
  const getConfidenceColor = (): string => {
    switch (confidence) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-orange-400';
      case 'predicted': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  // Get confidence badge
  const getConfidenceBadge = (): string => {
    switch (confidence) {
      case 'high': return '●';
      case 'medium': return '◐';
      case 'low': return '○';
      case 'predicted': return '◈';
      default: return '?';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 max-w-lg mx-auto">
      {/* Back Link - only show when not tracking */}
      {!isTracking && (
        <a href="/" className="inline-flex items-center text-blue-400 text-sm mb-4 hover:text-blue-300">
          ← Back to Work Zone Locator
        </a>
      )}

      {/* Header with Tools Menu */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-8"></div>
        <div className="text-center flex-1">
          <h1 className="text-xl font-bold text-blue-400">SLK Tracking</h1>
          <p className="text-xs text-gray-400">v{APP_VERSION} EKF {offlineReady && <span className="text-green-400">• Offline Ready</span>}</p>
          {settings.ekfEnabled && (
            <p className="text-xs text-purple-400 mt-1">📡 EKF Filtering Active</p>
          )}
        </div>
        {/* Tools Menu */}
        <div className="relative">
          <button
            onClick={() => setShowTools(!showTools)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg bg-gray-700 hover:bg-gray-600"
            title="Tools"
          >
            🔧
          </button>
          {showTools && (
            <div className="absolute right-0 top-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 min-w-[180px]">
              <button
                onClick={() => {
                  setShowTools(false);
                  generateDebugInfo();
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-700 rounded-lg flex items-center gap-2"
              >
                📋 Generate Debug Info
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GPS Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">SLK Tracking</span>
          {isTracking ? (
            <span className="text-green-400 text-sm flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Active
            </span>
          ) : (
            <span className="text-gray-500 text-sm">Inactive</span>
          )}
        </div>

        {!isTracking ? (
          <Button onClick={startTracking} className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base">
            📍 Start SLK Tracking
          </Button>
        ) : (
          <a href="/" onClick={() => { stopTracking(); }} className="block w-full text-center bg-red-600 hover:bg-red-700 h-12 text-base rounded-lg leading-[48px] font-medium cursor-pointer">
            ← Back to Work Zone Locator
          </a>
        )}

        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Current Speed Display */}
      {position && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            {/* Current Speed */}
            <div className="text-center flex-1">
              <div className={`text-5xl font-bold font-mono ${isSpeeding ? 'text-red-500' : 'text-green-400'}`}>
                {Math.round(currentSpeed)}
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
                    : upcomingZone && upcomingZone.isDecrease
                      ? 'bg-black border-4 border-amber-400'  // Yellow/amber for approaching decrease
                      : 'bg-black border-4 border-white'     // White for current
                }`}>
                  <span className={`font-bold text-xl ${
                    isSpeeding 
                      ? 'text-red-400' 
                      : upcomingZone && upcomingZone.isDecrease
                        ? 'text-amber-400'
                        : 'text-white'
                  }`}>
                    {upcomingZone && upcomingZone.isDecrease ? upcomingZone.speedLimit : speedLimit}
                  </span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {upcomingZone && upcomingZone.isDecrease ? '↓ ' + Math.round(upcomingZone.distance) + 'm' : 'Posted Limit'}
              </p>
              {upcomingZone && upcomingZone.isDecrease && (
                <p className="text-xs text-amber-400">Slow down ahead</p>
              )}
              {speedZones.length > 0 && !upcomingZone && (
                <p className="text-xs text-gray-500">From MRWA Data</p>
              )}
            </div>
          </div>

          {/* GPS Lag Compensation Indicator */}
          {lagSettings.gpsLagCompensation && lagSettings.gpsLagCompensation > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-700 text-center">
              <span className="text-xs text-amber-400">
                🎯 +{lagSettings.gpsLagCompensation}s lookahead compensation active
              </span>
            </div>
          )}

          {/* EKF Status Indicator */}
          {settings.ekfEnabled && settings.showUncertainty && (
            <div className="mt-4 pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={getConfidenceColor()}>{getConfidenceBadge()}</span>
                  <span className="text-gray-400">
                    {isPredicted ? 'Predicted' : confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
                  </span>
                </div>
                <div className="text-gray-400">
                  ±{uncertainty.toFixed(2)}m accuracy
                  {isPredicted && outageDuration > 0 && (
                    <span className="text-cyan-400 ml-2">
                      ({Math.round(outageDuration / 1000)}s outage)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trip Progress - Only when on same road as destination */}
      {position && roadInfo && destRoadId && roadInfo.road_id === destRoadId && distanceToDest !== null && (
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
              {roadInfo?.slk?.toFixed(2)}
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {direction === 'away' && '⚠️ Moving away from target'}
              {direction === 'towards' && '✓ Approaching target'}
              {direction === 'static' && '📍 Stationary'}
              {direction === null && 'Current SLK (km)'}
              {slkDirection && (
                <span className="text-blue-400 ml-2">
                  ({slkDirection === 'increasing' ? '↑' : '↓'} SLK)
                </span>
              )}
              {isPredicted && (
                <span className="text-purple-400 ml-2">◈ predicted</span>
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

            {/* Navigation buttons */}
            {destCoords && (
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={openGoogleMaps}
                  className="flex-1 h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  🗺️ Navigate
                </Button>
                <Button
                  onClick={openStreetView}
                  className="flex-1 h-10 text-sm bg-blue-600 hover:bg-blue-700"
                >
                  🏠 Street View
                </Button>
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
              <p className="text-xl font-bold text-white">{eta ? formatTime(eta) : '--:--'}</p>
              {eta && currentSpeed > 3 && (
                <p className="text-xs text-gray-500">@ {Math.round(currentSpeed)} km/h</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Location - When on different road */}
      {position && (!destRoadId || !roadInfo || roadInfo.road_id !== destRoadId) && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">📍 Current Location</h3>

          {roadInfo ? (
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
                  <span className="font-mono text-yellow-400 text-lg">{roadInfo?.slk?.toFixed(2)} km</span>
                  {slkDirection && (
                    <span className="text-xs text-blue-400 ml-2">
                      ({slkDirection === 'increasing' ? '↑' : '↓'})
                    </span>
                  )}
                  {isPredicted && (
                    <span className="text-xs text-purple-400 ml-2">◈</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Road Type</span>
                <span className={`text-sm ${roadInfo.network_type === 'Local Road' ? 'text-amber-400' : 'text-blue-400'}`}>
                  {roadInfo.network_type}
                </span>
              </div>
              {settings.showUncertainty && (
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400 text-sm">Accuracy</span>
                  <span className={`text-sm ${getConfidenceColor()}`}>
                    {getConfidenceBadge()} ±{uncertainty.toFixed(2)}m
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Looking up road info...</p>
          )}
        </div>
      )}

      {/* Destination Location */}
      {position && destRoadId && (!roadInfo || roadInfo.road_id !== destRoadId) && (
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
      {isTracking && !position && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 text-center">
          <p className="text-gray-400">Waiting for GPS fix...</p>
        </div>
      )}

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
                  navigator.clipboard.writeText(debugInfo);
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
