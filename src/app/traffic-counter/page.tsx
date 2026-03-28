'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrafficCountRecord,
  CountDirection,
  getTrafficCountHistory,
  deleteTrafficCountRecord,
  generateShareText,
  exportAllRecords,
  clearTrafficCountHistory,
  formatAusDate,
  LANE_CAPACITY_TABLE,
  SHUTTLE_FLOW_TABLE,
  REDUCTION_FACTORS,
  QUEUE_MULTIPLIERS,
} from '@/lib/traffic-counter-storage';

const APP_VERSION = 'RC 1.9.6';

// ============================================
// TYPES
// ============================================

interface LocationData {
  road_id: string;
  road_name: string;
  slk: number | null;
  lat: number | null;
  lon: number | null;
  region: string;
}

interface SetupState {
  duration: number;
  directionMode: CountDirection;
  location: LocationData;
  notes: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TrafficCounterSetupPage() {
  const router = useRouter();

  // Setup state
  const [duration, setDuration] = useState<number>(5);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [directionMode, setDirectionMode] = useState<CountDirection>('both-ways');
  const [notes, setNotes] = useState('');

  // Location state
  const [location, setLocation] = useState<LocationData>({
    road_id: '',
    road_name: '',
    slk: null,
    lat: null,
    lon: null,
    region: '',
  });
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Modal state
  const [showHistory, setShowHistory] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [history, setHistory] = useState<TrafficCountRecord[]>([]);

  // Load history on mount
  useEffect(() => {
    setHistory(getTrafficCountHistory());
  }, []);

  // Fetch location
  const fetchLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('GPS not available');
      return;
    }

    setLoadingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;
      const response = await fetch(`/api/gps?lat=${latitude}&lon=${longitude}`);

      if (response.ok) {
        const data = await response.json();
        setLocation({
          road_id: data.road_id || '',
          road_name: data.road_name || '',
          slk: data.slk || null,
          lat: latitude,
          lon: longitude,
          region: data.region || '',
        });
      } else {
        setLocation((prev) => ({
          ...prev,
          lat: latitude,
          lon: longitude,
        }));
      }
    } catch (err) {
      console.error('Location error:', err);
      alert('Failed to get location. Please try again.');
    } finally {
      setLoadingLocation(false);
    }
  }, []);

  // Handle custom duration
  const handleCustomDuration = () => {
    if (customDuration) {
      const mins = parseInt(customDuration, 10);
      if (mins > 0 && mins <= 480) {
        // Allow up to 8 hours
        setDuration(mins);
        setCustomDuration('');
      } else if (mins > 480) {
        alert('Maximum duration is 480 minutes (8 hours)');
      }
    }
  };

  // Start counting - save state and navigate
  // Auto-fetch location if not set
  const startCounting = async () => {
    // If location not set, try to get it automatically
    if (!location.road_id && !location.lat) {
      if (!navigator.geolocation) {
        alert('GPS not available. Please set location manually or continue without location.');
      } else {
        setLoadingLocation(true);
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
            });
          });

          const { latitude, longitude } = position.coords;
          const response = await fetch(`/api/gps?lat=${latitude}&lon=${longitude}`);

          let finalLocation: LocationData;
          if (response.ok) {
            const data = await response.json();
            finalLocation = {
              road_id: data.road_id || '',
              road_name: data.road_name || '',
              slk: data.slk || null,
              lat: latitude,
              lon: longitude,
              region: data.region || '',
            };
          } else {
            finalLocation = {
              road_id: '',
              road_name: '',
              slk: null,
              lat: latitude,
              lon: longitude,
              region: '',
            };
          }

          // Save state with auto-fetched location and navigate
          const setupState: SetupState = {
            duration,
            directionMode,
            location: finalLocation,
            notes,
          };
          sessionStorage.setItem('trafficCounterSetup', JSON.stringify(setupState));
          router.push('/traffic-counter/count');
          return;
        } catch (err) {
          console.error('Auto-location error:', err);
          // Continue without location rather than blocking
          alert('Could not get GPS location. Starting count without location.');
        } finally {
          setLoadingLocation(false);
        }
      }
    }

    // Location already set or GPS failed - proceed with current state
    const setupState: SetupState = {
      duration,
      directionMode,
      location,
      notes,
    };
    sessionStorage.setItem('trafficCounterSetup', JSON.stringify(setupState));
    router.push('/traffic-counter/count');
  };

  // Delete record
  const deleteRecord = (id: string) => {
    if (confirm('Delete this record?')) {
      deleteTrafficCountRecord(id);
      setHistory(getTrafficCountHistory());
    }
  };

  // Copy record
  const copyRecordText = (record: TrafficCountRecord) => {
    const text = generateShareText(record);
    navigator.clipboard.writeText(text);
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white p-1 h-8"
                >
                  ← Home
                </Button>
              </Link>
              <div>
                <h1 className="text-base font-bold">📊 Traffic Counter</h1>
                <p className="text-xs text-gray-500">{APP_VERSION}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReference(true)}
                className="bg-gray-700 border-gray-600 h-8 px-2 text-xs"
              >
                📖 Ref
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="bg-gray-700 border-gray-600 h-8 px-2 text-xs"
              >
                📜 ({history.length})
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 py-3 space-y-3">
        {/* Duration Selection */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-3 pb-3">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">⏱️ Duration</label>
            <div className="flex gap-1.5 flex-wrap">
              {[3, 5, 15].map((mins) => (
                <Button
                  key={mins}
                  onClick={() => setDuration(mins)}
                  className={`flex-1 min-w-12 h-9 text-sm text-white ${
                    duration === mins
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {mins}m
                </Button>
              ))}
              <div className="flex gap-1">
                <input
                  type="number"
                  min="1"
                  max="480"
                  placeholder="1-480m"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center text-sm h-9 text-white"
                />
                <Button
                  onClick={handleCustomDuration}
                  disabled={!customDuration}
                  className="bg-gray-700 hover:bg-gray-600 h-9 px-2 text-sm text-white disabled:text-gray-400"
                >
                  Set
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              💡 3-5 min quick estimate, 15 min for busy roads
            </p>
          </CardContent>
        </Card>

        {/* Direction Mode */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-3 pb-3">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              🚗 Direction Mode
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => setDirectionMode('one-way')}
                className={`flex-1 h-9 text-sm text-white ${
                  directionMode === 'one-way'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                One Direction
              </Button>
              <Button
                onClick={() => setDirectionMode('both-ways')}
                className={`flex-1 h-9 text-sm text-white ${
                  directionMode === 'both-ways'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Both Ways
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {directionMode === 'one-way'
                ? '💡 Count one direction for lane capacity'
                : '💡 Count both for shuttle flow operations'}
            </p>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-3 pb-3">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-gray-400">📍 Location</label>
              <Button
                onClick={fetchLocation}
                disabled={loadingLocation}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 h-8 px-2 text-xs"
              >
                {loadingLocation ? '⏳' : '📍 GPS'}
              </Button>
            </div>
            {location.road_id ? (
              <div className="text-sm bg-gray-900 rounded p-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-white text-sm">{location.road_id}</span>
                  <span className="text-gray-400 text-xs">{location.road_name}</span>
                </div>
                <div className="text-gray-500 text-xs">
                  SLK {location.slk?.toFixed(2) || 'N/A'}
                  {location.region && ` | ${location.region}`}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-xs">
                {location.lat
                  ? '📍 Location captured (road not found)'
                  : '💡 Tap GPS to capture location'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-3 pb-3">
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              📝 Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Peak hour, roadworks nearby..."
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm h-9"
            />
          </CardContent>
        </Card>

        {/* Start Button */}
        <Button
          onClick={startCounting}
          disabled={loadingLocation}
          className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-bold disabled:bg-green-800"
        >
          {loadingLocation ? '📍 Getting GPS...' : '▶️ START COUNTING'}
        </Button>
      </div>

      {/* Reference Tables Modal */}
      {showReference && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-2 pt-3 sticky top-0 bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white">📖 Reference Tables</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReference(false)}
                  className="text-gray-400 h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Lane Capacity */}
              <div>
                <h4 className="font-semibold text-blue-400 text-sm mb-0.5">
                  Lane Capacity (One Direction)
                </h4>
                <p className="text-xs text-gray-500 italic mb-1">Source: AGTTM Part 2, Table 3.1</p>
                <div className="text-xs overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="pr-2 py-0.5">Mid-Block</th>
                        <th className="pr-2 py-0.5">Near Int.</th>
                        <th className="py-0.5">Lanes</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {LANE_CAPACITY_TABLE.map((row, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="pr-2 py-0.5">{row.midBlockVph}</td>
                          <td className="pr-2 py-0.5">{row.nearIntersectionVph}</td>
                          <td className="py-0.5">{row.lanes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shuttle Flow */}
              <div>
                <h4 className="font-semibold text-green-400 text-sm mb-0.5">
                  Shuttle Flow (Both Directions)
                </h4>
                <p className="text-xs text-gray-500 italic mb-1">
                  Source: AGTTM Part 2, Table 3.5 &amp; MRWA COP Table 15
                </p>
                <div className="text-xs overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="pr-2 py-0.5">VPH</th>
                        <th className="py-0.5">Max Length</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {SHUTTLE_FLOW_TABLE.map((row, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="pr-2 py-0.5">{row.vph}</td>
                          <td className="py-0.5">{row.maxLength}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-gray-500 mt-0.5">* Requires risk assessment</p>
                </div>
              </div>

              {/* Reduction Factors */}
              <div>
                <h4 className="font-semibold text-amber-400 text-sm mb-0.5">Volume Reduction</h4>
                <p className="text-xs text-gray-500 italic mb-1">Source: MRWA Code of Practice</p>
                <div className="text-xs space-y-0.5 text-gray-300">
                  {REDUCTION_FACTORS.map((row, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{row.condition}</span>
                      <span className="text-red-400">-{row.reduction}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Queue Multipliers */}
              <div>
                <h4 className="font-semibold text-purple-400 text-sm mb-0.5">Queue Multipliers</h4>
                <p className="text-xs text-gray-500 italic mb-1">Source: AGTTM Part 3, Table 4.3</p>
                <div className="text-xs overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="pr-2 py-0.5">Stop</th>
                        <th className="pr-2 py-0.5">Avg</th>
                        <th className="py-0.5">Heavy</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {QUEUE_MULTIPLIERS.map((row, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="pr-2 py-0.5">{row.stoppingTime}</td>
                          <td className="pr-2 py-0.5">×{row.averageMultiplier}</td>
                          <td className="py-0.5">×{row.heavyMultiplier}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="pb-2 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white">📜 Count History</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-gray-400 text-center py-4 text-sm">No saved counts yet</p>
              ) : (
                <div className="space-y-2">
                  {history.map((record) => (
                    <div key={record.id} className="bg-gray-900 rounded-lg p-2 text-sm">
                      <div className="flex justify-between items-start mb-0.5">
                        <div>
                          <span className="font-semibold text-white text-sm">{record.road_id}</span>
                          <span className="text-gray-400 ml-1 text-xs">{record.road_name}</span>
                        </div>
                        <span className="text-gray-500 text-xs">{formatAusDate(record.date)}</span>
                      </div>
                      <div className="text-gray-400 text-xs mb-0.5">
                        SLK {record.slk?.toFixed(2) || 'N/A'} | {record.duration_minutes}min |{' '}
                        {record.direction_mode === 'both-ways' ? 'Both' : 'One way'}
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-xs">
                          <span className="text-green-400">{record.total_vehicles}</span>
                          <span className="text-gray-500 mx-1">|</span>
                          <span className="text-amber-400">{record.heavy_percentage}%H</span>
                          <span className="text-gray-500 mx-1">|</span>
                          <span className="text-blue-400">{record.vph_combined} VPH</span>
                        </div>
                        <div className="flex gap-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyRecordText(record)}
                            className="text-blue-400 hover:text-blue-300 h-6 w-6 p-0"
                          >
                            📋
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRecord(record.id)}
                            className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <Button
                  onClick={() => {
                    const text = exportAllRecords();
                    navigator.clipboard.writeText(text);
                    alert('History copied to clipboard!');
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-gray-700 border-gray-600 h-8 text-xs"
                >
                  📤 Export
                </Button>
                <Button
                  onClick={() => {
                    if (confirm('Clear all history?')) {
                      clearTrafficCountHistory();
                      setHistory([]);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-gray-700 border-gray-600 text-red-400 h-8 text-xs"
                >
                  🗑️ Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
