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
      if (mins > 0 && mins <= 60) {
        setDuration(mins);
        setCustomDuration('');
      }
    }
  };

  // Start counting - save state and navigate
  const startCounting = () => {
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
                onClick={() => setShowReference(true)}
                className="bg-gray-700 border-gray-600 text-sm"
              >
                📖 Ref
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="bg-gray-700 border-gray-600 text-sm"
              >
                📜 History ({history.length})
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Duration Selection */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">⏱️ Duration</label>
            <div className="flex gap-2 flex-wrap">
              {[3, 5, 15].map((mins) => (
                <Button
                  key={mins}
                  onClick={() => setDuration(mins)}
                  className={`flex-1 min-w-16 ${
                    duration === mins
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
                />
                <Button
                  onClick={handleCustomDuration}
                  disabled={!customDuration}
                  className="bg-gray-700 hover:bg-gray-600"
                >
                  Set
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 3-5 min for quick estimate, 15 min for busy/arterial roads
            </p>
          </CardContent>
        </Card>

        {/* Direction Mode */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              🚗 Direction Mode
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => setDirectionMode('one-way')}
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
                ? '💡 Count one direction for lane capacity planning'
                : '💡 Count both directions for shuttle flow operations'}
            </p>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-400">📍 Location</label>
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
              <div className="text-sm bg-gray-900 rounded p-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-white">{location.road_id}</span>
                  <span className="text-gray-400">{location.road_name}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  SLK {location.slk?.toFixed(2) || 'N/A'}
                  {location.region && ` | ${location.region}`}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                {location.lat
                  ? '📍 Location captured (road not identified)'
                  : '💡 Tap to capture GPS location for record keeping'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              📝 Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Peak hour traffic, roadworks nearby..."
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            />
          </CardContent>
        </Card>

        {/* Start Button */}
        <Button
          onClick={startCounting}
          className="w-full bg-green-600 hover:bg-green-700 h-14 text-xl font-bold"
        >
          ▶️ START COUNTING
        </Button>
      </div>

      {/* Reference Tables Modal */}
      {showReference && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-2 sticky top-0 bg-gray-800 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">📖 Reference Tables</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReference(false)}
                  className="text-gray-400"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lane Capacity */}
              <div>
                <h4 className="font-semibold text-blue-400 mb-0.5">
                  Lane Capacity (One Direction)
                </h4>
                <p className="text-xs text-gray-500 italic mb-1">Source: AGTTM Part 2, Table 3.1</p>
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
                <h4 className="font-semibold text-green-400 mb-0.5">
                  Shuttle Flow Length (Both Directions)
                </h4>
                <p className="text-xs text-gray-500 italic mb-1">
                  Source: AGTTM Part 2, Table 3.5 &amp; MRWA COP Table 15
                </p>
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
                <h4 className="font-semibold text-amber-400 mb-0.5">Volume Reduction Factors</h4>
                <p className="text-xs text-gray-500 italic mb-1">Source: MRWA Code of Practice</p>
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
                <h4 className="font-semibold text-purple-400 mb-0.5">
                  Queue Length Multipliers (5 min count)
                </h4>
                <p className="text-xs text-gray-500 italic mb-1">Source: AGTTM Part 3, Table 4.3</p>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">📜 Count History</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No saved counts yet</p>
              ) : (
                <div className="space-y-2">
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
