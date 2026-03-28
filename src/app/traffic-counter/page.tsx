'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrafficCountRecord,
  CountDirection,
  calculateVPH,
  calculateHeavyPercentage,
  getVphMultiplier,
  createTrafficCountRecord,
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
  TrafficCountRecord as TCountRecord,
} from '@/lib/traffic-counter-storage';

const APP_VERSION = 'RC 1.9.6';

// ============================================
// TYPES
// ============================================

interface CounterState {
  trueLeftLight: number;
  trueLeftHeavy: number;
  trueRightLight: number;
  trueRightHeavy: number;
}

interface LocationData {
  road_id: string;
  road_name: string;
  slk: number | null;
  lat: number | null;
  lon: number | null;
  region: string;
}

type TimerStatus = 'idle' | 'running' | 'paused' | 'complete';

// ============================================
// MAIN COMPONENT
// ============================================

export default function TrafficCounterPage() {
  // Timer state
  const [duration, setDuration] = useState<number>(5); // minutes
  const [customDuration, setCustomDuration] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(5 * 60); // seconds
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Counter state
  const [directionMode, setDirectionMode] = useState<CountDirection>('both-ways');
  const [counts, setCounts] = useState<CounterState>({
    trueLeftLight: 0,
    trueLeftHeavy: 0,
    trueRightLight: 0,
    trueRightHeavy: 0,
  });

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

  // History state
  const [history, setHistory] = useState<TrafficCountRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [notes, setNotes] = useState('');

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(getTrafficCountHistory());
  }, []);

  // Timer logic
  useEffect(() => {
    if (timerStatus === 'running' && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setTimerStatus('complete');
            // Vibrate to signal completion
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timerStatus, timeRemaining]);

  // Wake lock to keep screen on
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      if (timerStatus === 'running' && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake lock failed:', err);
        }
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [timerStatus]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleDurationSelect = (mins: number) => {
    if (timerStatus === 'idle') {
      setDuration(mins);
      setTimeRemaining(mins * 60);
    }
  };

  const handleCustomDuration = () => {
    if (timerStatus === 'idle' && customDuration) {
      const mins = parseInt(customDuration, 10);
      if (mins > 0 && mins <= 60) {
        setDuration(mins);
        setTimeRemaining(mins * 60);
        setCustomDuration('');
      }
    }
  };

  const startTimer = () => {
    if (timerStatus === 'idle') {
      setStartTime(new Date());
    }
    setTimerStatus('running');
  };

  const pauseTimer = () => {
    setTimerStatus('paused');
  };

  const resetCounter = () => {
    setTimerStatus('idle');
    setTimeRemaining(duration * 60);
    setCounts({
      trueLeftLight: 0,
      trueLeftHeavy: 0,
      trueRightLight: 0,
      trueRightHeavy: 0,
    });
    setStartTime(null);
    setNotes('');
  };

  const incrementCount = (key: keyof CounterState) => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    setCounts((prev) => ({
      ...prev,
      [key]: prev[key] + 1,
    }));
  };

  const decrementCount = (key: keyof CounterState) => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] - 1),
    }));
  };

  const fetchLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('GPS not available');
      return;
    }

    setLoadingLocation(true);

    try {
      // Get GPS position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Fetch road info from API
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
        // Still save coordinates even if road not found
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

  const saveCount = async () => {
    const endTime = new Date();

    const totalLight =
      directionMode === 'both-ways'
        ? counts.trueLeftLight + counts.trueRightLight
        : counts.trueLeftLight;

    const totalHeavy =
      directionMode === 'both-ways'
        ? counts.trueLeftHeavy + counts.trueRightHeavy
        : counts.trueLeftHeavy;

    const totalVehicles = totalLight + totalHeavy;

    const record = createTrafficCountRecord({
      road_id: location.road_id || 'UNKNOWN',
      road_name: location.road_name || 'Unknown Road',
      slk: location.slk,
      lat: location.lat,
      lon: location.lon,
      region: location.region,
      duration_minutes: duration,
      direction_mode: directionMode,
      true_left_light: counts.trueLeftLight,
      true_left_heavy: counts.trueLeftHeavy,
      true_right_light: directionMode === 'both-ways' ? counts.trueRightLight : 0,
      true_right_heavy: directionMode === 'both-ways' ? counts.trueRightHeavy : 0,
      total_light: totalLight,
      total_heavy: totalHeavy,
      total_vehicles: totalVehicles,
      heavy_percentage: calculateHeavyPercentage(totalLight, totalHeavy),
      vph_true_left: calculateVPH(counts.trueLeftLight + counts.trueLeftHeavy, duration),
      vph_true_right: calculateVPH(counts.trueRightLight + counts.trueRightHeavy, duration),
      vph_combined: calculateVPH(totalVehicles, duration),
      vph_one_direction: calculateVPH(
        Math.max(
          counts.trueLeftLight + counts.trueLeftHeavy,
          counts.trueRightLight + counts.trueRightHeavy
        ),
        duration
      ),
      date: startTime
        ? startTime.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      start_time: startTime
        ? `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
        : '00:00',
      end_time: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
      notes: notes,
    });

    // Refresh history
    setHistory(getTrafficCountHistory());

    // Reset
    resetCounter();

    alert('Count saved successfully!');
  };

  const deleteRecord = (id: string) => {
    if (confirm('Delete this record?')) {
      deleteTrafficCountRecord(id);
      setHistory(getTrafficCountHistory());
    }
  };

  const copyRecordText = (record: TrafficCountRecord) => {
    const text = generateShareText(record);
    navigator.clipboard.writeText(text);
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    alert('Copied to clipboard!');
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const totalLight =
    directionMode === 'both-ways'
      ? counts.trueLeftLight + counts.trueRightLight
      : counts.trueLeftLight;

  const totalHeavy =
    directionMode === 'both-ways'
      ? counts.trueLeftHeavy + counts.trueRightHeavy
      : counts.trueLeftHeavy;

  const totalVehicles = totalLight + totalHeavy;

  const elapsedMinutes = duration - timeRemaining / 60;
  const currentVph =
    elapsedMinutes > 0 ? calculateVPH(totalVehicles, Math.min(elapsedMinutes, duration)) : 0;

  const heavyPercent = calculateHeavyPercentage(totalLight, totalHeavy);

  // Format time display
  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  ← Home
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold">📊 Traffic Counter</h1>
                <p className="text-xs text-gray-500">{APP_VERSION}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReference(!showReference)}
                className="bg-gray-700 border-gray-600 text-sm"
              >
                📖 Ref
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="bg-gray-700 border-gray-600 text-sm"
              >
                📜 History ({history.length})
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Reference Tables Modal */}
        {showReference && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">📖 Reference Tables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lane Capacity */}
              <div>
                <h4 className="font-semibold text-blue-400 mb-1">Lane Capacity (One Direction)</h4>
                <div className="text-xs overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="pr-2 py-1">Mid-Block VPH</th>
                        <th className="pr-2 py-1">Near Intersection</th>
                        <th className="py-1">Lanes</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {LANE_CAPACITY_TABLE.map((row, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="pr-2 py-1">{row.midBlockVph}</td>
                          <td className="pr-2 py-1">{row.nearIntersectionVph}</td>
                          <td className="py-1">{row.lanes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shuttle Flow */}
              <div>
                <h4 className="font-semibold text-green-400 mb-1">
                  Shuttle Flow Length (Both Directions)
                </h4>
                <div className="text-xs overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="pr-2 py-1">VPH</th>
                        <th className="py-1">Max Single Lane</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {SHUTTLE_FLOW_TABLE.map((row, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="pr-2 py-1">{row.vph}</td>
                          <td className="py-1">{row.maxLength}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-gray-500 mt-1">* Requires risk assessment</p>
                </div>
              </div>

              {/* Reduction Factors */}
              <div>
                <h4 className="font-semibold text-amber-400 mb-1">Volume Reduction Factors</h4>
                <div className="text-xs space-y-1 text-gray-300">
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
                <h4 className="font-semibold text-purple-400 mb-1">
                  Queue Length Multipliers (5 min count)
                </h4>
                <div className="text-xs overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="pr-2 py-1">Stop Time</th>
                        <th className="pr-2 py-1">Avg Vehicle</th>
                        <th className="py-1">Heavy Vehicle</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {QUEUE_MULTIPLIERS.map((row, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="pr-2 py-1">{row.stoppingTime}</td>
                          <td className="pr-2 py-1">×{row.averageMultiplier}</td>
                          <td className="py-1">×{row.heavyMultiplier}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button
                onClick={() => setShowReference(false)}
                className="w-full bg-gray-700 hover:bg-gray-600"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History Modal */}
        {showHistory && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">📜 Count History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No saved counts yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((record) => (
                    <div key={record.id} className="bg-gray-900 rounded-lg p-3 text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-semibold text-white">{record.road_id}</span>
                          <span className="text-gray-400 ml-2">{record.road_name}</span>
                        </div>
                        <span className="text-gray-500 text-xs">{formatAusDate(record.date)}</span>
                      </div>
                      <div className="text-gray-400 text-xs mb-1">
                        SLK {record.slk?.toFixed(2) || 'N/A'} | {record.duration_minutes}min |{' '}
                        {record.direction_mode === 'both-ways' ? 'Both ways' : 'One way'}
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="text-green-400">{record.total_vehicles} total</span>
                          <span className="text-gray-500 mx-2">|</span>
                          <span className="text-amber-400">{record.heavy_percentage}% heavy</span>
                          <span className="text-gray-500 mx-2">|</span>
                          <span className="text-blue-400">{record.vph_combined} VPH</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyRecordText(record)}
                            className="text-blue-400 hover:text-blue-300 h-7 w-7 p-0"
                          >
                            📋
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteRecord(record.id)}
                            className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <Button
                  onClick={() => {
                    const text = exportAllRecords();
                    navigator.clipboard.writeText(text);
                    alert('History copied to clipboard!');
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-gray-700 border-gray-600"
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
                  className="flex-1 bg-gray-700 border-gray-600 text-red-400"
                >
                  🗑️ Clear All
                </Button>
              </div>

              <Button
                onClick={() => setShowHistory(false)}
                className="w-full mt-2 bg-gray-700 hover:bg-gray-600"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Timer Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-4">
            {/* Duration Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
              <div className="flex gap-2 flex-wrap">
                {[3, 5, 15].map((mins) => (
                  <Button
                    key={mins}
                    onClick={() => handleDurationSelect(mins)}
                    disabled={timerStatus !== 'idle'}
                    className={`flex-1 min-w-16 ${
                      duration === mins && timerStatus === 'idle'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {mins} min
                  </Button>
                ))}
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    placeholder="Custom"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center text-sm"
                    disabled={timerStatus !== 'idle'}
                  />
                  <Button
                    onClick={handleCustomDuration}
                    disabled={timerStatus !== 'idle' || !customDuration}
                    className="bg-gray-700 hover:bg-gray-600"
                  >
                    Set
                  </Button>
                </div>
              </div>
            </div>

            {/* Timer Display */}
            <div className="text-center mb-4">
              <div
                className={`text-6xl font-mono font-bold ${
                  timerStatus === 'complete'
                    ? 'text-green-400'
                    : timeRemaining <= 60
                      ? 'text-red-400 animate-pulse'
                      : 'text-white'
                }`}
              >
                {formatTimeDisplay(timeRemaining)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {timerStatus === 'idle' && 'Ready to start'}
                {timerStatus === 'running' && 'Counting...'}
                {timerStatus === 'paused' && 'PAUSED'}
                {timerStatus === 'complete' && '✓ Complete!'}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex gap-2">
              {timerStatus === 'idle' && (
                <Button
                  onClick={startTimer}
                  className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-lg"
                >
                  ▶️ START
                </Button>
              )}
              {timerStatus === 'running' && (
                <Button
                  onClick={pauseTimer}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 h-12 text-lg"
                >
                  ⏸️ PAUSE
                </Button>
              )}
              {timerStatus === 'paused' && (
                <Button
                  onClick={() => setTimerStatus('running')}
                  className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-lg"
                >
                  ▶️ RESUME
                </Button>
              )}
              {timerStatus !== 'idle' && (
                <Button
                  onClick={resetCounter}
                  className="bg-red-600 hover:bg-red-700 h-12 text-lg px-6"
                >
                  ⏹️ Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Direction Mode */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Direction Mode</label>
            <div className="flex gap-2">
              <Button
                onClick={() => setDirectionMode('one-way')}
                disabled={timerStatus === 'running'}
                className={`flex-1 h-12 ${
                  directionMode === 'one-way'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                One Direction
              </Button>
              <Button
                onClick={() => setDirectionMode('both-ways')}
                disabled={timerStatus === 'running'}
                className={`flex-1 h-12 ${
                  directionMode === 'both-ways'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Both Ways
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {directionMode === 'one-way'
                ? 'Counting traffic in one direction (lane capacity planning)'
                : 'Counting both directions (shuttle flow operations)'}
            </p>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-400">Location</label>
              <Button
                onClick={fetchLocation}
                disabled={loadingLocation}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loadingLocation ? '⏳ Loading...' : '📍 Get GPS Location'}
              </Button>
            </div>
            {location.road_id ? (
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">{location.road_id}</span>
                  <span className="text-gray-400">{location.road_name}</span>
                </div>
                <div className="text-gray-500 text-xs">
                  SLK {location.slk?.toFixed(2) || 'N/A'}
                  {location.region && ` | ${location.region}`}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                {location.lat
                  ? 'Location captured (road not identified)'
                  : 'Click to capture location'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Counters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* True Left */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-base text-center">
                <span className="text-green-400">← True Left</span>
                <span className="text-gray-500 text-xs block">Increasing SLK</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Light Vehicles */}
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">🚗 Light</span>
                  <span className="text-2xl font-bold text-white">{counts.trueLeftLight}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => decrementCount('trueLeftLight')}
                    className="flex-1 bg-red-600/50 hover:bg-red-600 h-14 text-xl"
                    disabled={counts.trueLeftLight === 0 || timerStatus === 'idle'}
                  >
                    −1
                  </Button>
                  <Button
                    onClick={() => incrementCount('trueLeftLight')}
                    className="flex-1 bg-green-600 hover:bg-green-700 h-14 text-2xl font-bold"
                    disabled={
                      timerStatus !== 'running' &&
                      timerStatus !== 'paused' &&
                      timerStatus !== 'complete'
                    }
                  >
                    +1
                  </Button>
                </div>
              </div>

              {/* Heavy Vehicles */}
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">🚛 Heavy</span>
                  <span className="text-2xl font-bold text-amber-400">{counts.trueLeftHeavy}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => decrementCount('trueLeftHeavy')}
                    className="flex-1 bg-red-600/50 hover:bg-red-600 h-14 text-xl"
                    disabled={counts.trueLeftHeavy === 0 || timerStatus === 'idle'}
                  >
                    −1
                  </Button>
                  <Button
                    onClick={() => incrementCount('trueLeftHeavy')}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 h-14 text-2xl font-bold"
                    disabled={
                      timerStatus !== 'running' &&
                      timerStatus !== 'paused' &&
                      timerStatus !== 'complete'
                    }
                  >
                    +1
                  </Button>
                </div>
              </div>

              {/* True Left Stats */}
              <div className="text-center text-sm text-gray-400">
                Total:{' '}
                <span className="text-white font-semibold">
                  {counts.trueLeftLight + counts.trueLeftHeavy}
                </span>
                {' | '}
                VPH:{' '}
                <span className="text-blue-400 font-semibold">
                  {calculateVPH(
                    counts.trueLeftLight + counts.trueLeftHeavy,
                    elapsedMinutes > 0 ? Math.min(elapsedMinutes, duration) : duration
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* True Right - only show if both-ways mode */}
          {directionMode === 'both-ways' && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-base text-center">
                  <span className="text-cyan-400">True Right →</span>
                  <span className="text-gray-500 text-xs block">Decreasing SLK</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Light Vehicles */}
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">🚗 Light</span>
                    <span className="text-2xl font-bold text-white">{counts.trueRightLight}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => decrementCount('trueRightLight')}
                      className="flex-1 bg-red-600/50 hover:bg-red-600 h-14 text-xl"
                      disabled={counts.trueRightLight === 0 || timerStatus === 'idle'}
                    >
                      −1
                    </Button>
                    <Button
                      onClick={() => incrementCount('trueRightLight')}
                      className="flex-1 bg-green-600 hover:bg-green-700 h-14 text-2xl font-bold"
                      disabled={
                        timerStatus !== 'running' &&
                        timerStatus !== 'paused' &&
                        timerStatus !== 'complete'
                      }
                    >
                      +1
                    </Button>
                  </div>
                </div>

                {/* Heavy Vehicles */}
                <div className="bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">🚛 Heavy</span>
                    <span className="text-2xl font-bold text-amber-400">
                      {counts.trueRightHeavy}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => decrementCount('trueRightHeavy')}
                      className="flex-1 bg-red-600/50 hover:bg-red-600 h-14 text-xl"
                      disabled={counts.trueRightHeavy === 0 || timerStatus === 'idle'}
                    >
                      −1
                    </Button>
                    <Button
                      onClick={() => incrementCount('trueRightHeavy')}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 h-14 text-2xl font-bold"
                      disabled={
                        timerStatus !== 'running' &&
                        timerStatus !== 'paused' &&
                        timerStatus !== 'complete'
                      }
                    >
                      +1
                    </Button>
                  </div>
                </div>

                {/* True Right Stats */}
                <div className="text-center text-sm text-gray-400">
                  Total:{' '}
                  <span className="text-white font-semibold">
                    {counts.trueRightLight + counts.trueRightHeavy}
                  </span>
                  {' | '}
                  VPH:{' '}
                  <span className="text-blue-400 font-semibold">
                    {calculateVPH(
                      counts.trueRightLight + counts.trueRightHeavy,
                      elapsedMinutes > 0 ? Math.min(elapsedMinutes, duration) : duration
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Live Stats */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Live Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-white">{totalVehicles}</div>
                <div className="text-xs text-gray-500">Total Vehicles</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-400">{heavyPercent}%</div>
                <div className="text-xs text-gray-500">Heavy Vehicles</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400">{currentVph}</div>
                <div className="text-xs text-gray-500">Est. VPH</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400">{elapsedMinutes.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Minutes Elapsed</div>
              </div>
            </div>

            {/* Quick Reference */}
            {(timerStatus === 'complete' || totalVehicles > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-xs font-medium text-gray-500 mb-2">
                  Quick Reference (Based on Current Count)
                </h4>
                <div className="text-xs space-y-1 text-gray-400">
                  <div className="flex justify-between">
                    <span>Lane Capacity (one dir):</span>
                    <span className="text-white">
                      {currentVph <= 1000
                        ? '1 lane sufficient'
                        : currentVph <= 2000
                          ? '2 lanes needed'
                          : currentVph <= 3000
                            ? '3 lanes needed'
                            : '4+ lanes needed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shuttle Flow Max Length:</span>
                    <span className="text-white">
                      {currentVph >= 701
                        ? '70m'
                        : currentVph >= 601
                          ? '100m'
                          : currentVph >= 501
                            ? '150m'
                            : currentVph >= 401
                              ? '250m'
                              : currentVph >= 351
                                ? '400m'
                                : currentVph >= 301
                                  ? '600m'
                                  : currentVph >= 251
                                    ? '800m*'
                                    : currentVph >= 201
                                      ? '1200m*'
                                      : '2200m*'}
                    </span>
                  </div>
                  {heavyPercent > 10 && (
                    <div className="text-amber-400 mt-2">
                      ⚠️ Heavy vehicles &gt;10%: Apply 20% volume reduction for capacity
                      calculations
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes & Save */}
        {timerStatus === 'complete' && (
          <Card className="bg-gray-800 border-gray-700 border-green-600">
            <CardContent className="pt-4">
              <h3 className="text-sm font-medium text-green-400 mb-3">
                ✓ Count Complete - Save Results
              </h3>

              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Peak hour traffic, roadworks nearby..."
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveCount} className="flex-1 bg-green-600 hover:bg-green-700 h-12">
                  💾 Save Count
                </Button>
                <Button
                  onClick={resetCounter}
                  variant="outline"
                  className="bg-gray-700 border-gray-600 h-12"
                >
                  Discard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">💡 Tips</h3>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>
                • <strong>3 min</strong> count × 20 = VPH (quick estimate)
              </li>
              <li>
                • <strong>5 min</strong> count × 12 = VPH (queue estimation)
              </li>
              <li>
                • <strong>15 min</strong> for busy/arterial roads
              </li>
              <li>
                • Count <strong>one direction</strong> for lane capacity
              </li>
              <li>
                • Count <strong>both directions</strong> for shuttle flow
              </li>
              <li>• Heavy vehicles = trucks, buses, RVs (large vehicles)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
