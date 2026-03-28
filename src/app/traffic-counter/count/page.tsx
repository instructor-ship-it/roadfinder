'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  TrafficCountRecord,
  CountDirection,
  calculateVPH,
  calculateHeavyPercentage,
  createTrafficCountRecord,
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

interface SetupState {
  duration: number;
  directionMode: CountDirection;
  location: LocationData;
  notes: string;
}

// ============================================
// HELPER: Load setup state
// ============================================

function loadSetupState(): SetupState | null {
  if (typeof window === 'undefined') return null;
  const setupStateStr = sessionStorage.getItem('trafficCounterSetup');
  if (setupStateStr) {
    try {
      return JSON.parse(setupStateStr);
    } catch {
      return null;
    }
  }
  return null;
}

// ============================================
// PROGRESS RING COMPONENT
// ============================================

function ProgressRing({
  progress,
  timeRemaining,
  totalTime,
}: {
  progress: number;
  timeRemaining: number;
  totalTime: number;
}) {
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  // Color based on time remaining
  const getColor = () => {
    if (timeRemaining <= 30) return '#ef4444'; // red
    if (timeRemaining <= 60) return '#f59e0b'; // amber
    return '#22c55e'; // green
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          stroke="#374151"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress circle */}
        <circle
          stroke={getColor()}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-mono font-bold text-white">{formatTime(timeRemaining)}</span>
        <span className="text-xs text-gray-400">{formatTime(totalTime)} total</span>
      </div>
    </div>
  );
}

// ============================================
// COUNTER BUTTON COMPONENT
// ============================================

function CounterButton({
  label,
  count,
  onIncrement,
  onDecrement,
  color,
  disabled,
}: {
  label: string;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
  color: 'green' | 'amber';
  disabled: boolean;
}) {
  const colorClasses = {
    green: 'bg-green-600 hover:bg-green-700 active:bg-green-800',
    amber: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800',
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onIncrement}
        disabled={disabled}
        className={`w-16 h-16 rounded-full ${colorClasses[color]} text-white text-2xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center`}
      >
        +1
      </button>
      <span
        className={`text-lg font-bold mt-1 ${color === 'amber' ? 'text-amber-400' : 'text-white'}`}
      >
        {count}
      </span>
      <button
        onClick={onDecrement}
        disabled={disabled || count === 0}
        className="w-8 h-8 rounded-full bg-red-600/50 hover:bg-red-600 text-white text-sm mt-1 disabled:opacity-30"
      >
        −
      </button>
    </div>
  );
}

// ============================================
// COMPLETION OVERLAY COMPONENT
// ============================================

function CompletionOverlay({
  isOpen,
  counts,
  duration,
  directionMode,
  location,
  notes,
  startTime,
  onSave,
  onReset,
  onCancel,
}: {
  isOpen: boolean;
  counts: CounterState;
  duration: number;
  directionMode: CountDirection;
  location: LocationData;
  notes: string;
  startTime: Date | null;
  onSave: () => void;
  onReset: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  const totalLight =
    directionMode === 'both-ways'
      ? counts.trueLeftLight + counts.trueRightLight
      : counts.trueLeftLight;

  const totalHeavy =
    directionMode === 'both-ways'
      ? counts.trueLeftHeavy + counts.trueRightHeavy
      : counts.trueLeftHeavy;

  const totalVehicles = totalLight + totalHeavy;
  const heavyPercent = calculateHeavyPercentage(totalLight, totalHeavy);
  const vph = calculateVPH(totalVehicles, duration);

  // Calculate lane capacity with heavy vehicle adjustment
  const adjustedVph = heavyPercent > 10 ? Math.round(vph * 1.2) : vph; // 20% reduction applied inversely
  const lanesNeeded =
    adjustedVph <= 1000 ? 1 : adjustedVph <= 2000 ? 2 : adjustedVph <= 3000 ? 3 : 4;

  // Calculate shuttle flow max length
  const getShuttleMax = (v: number) => {
    if (v >= 701) return '70m';
    if (v >= 601) return '100m';
    if (v >= 501) return '150m';
    if (v >= 401) return '250m';
    if (v >= 351) return '400m';
    if (v >= 301) return '600m';
    if (v >= 251) return '800m*';
    if (v >= 201) return '1200m*';
    return '2200m*';
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm border border-green-600">
        <h2 className="text-xl font-bold text-green-400 text-center mb-4">✓ Count Complete!</h2>

        <div className="space-y-3 text-sm">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-white font-semibold">{location.road_id || 'Unknown'}</p>
            <p className="text-gray-400 text-xs">{location.road_name}</p>
            {notes && <p className="text-gray-500 text-xs mt-1 italic">{notes}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{totalVehicles}</p>
              <p className="text-xs text-gray-500">Total Vehicles</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-400">{heavyPercent}%</p>
              <p className="text-xs text-gray-500">Heavy</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-400">{vph}</p>
              <p className="text-xs text-gray-500">VPH</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{lanesNeeded}</p>
              <p className="text-xs text-gray-500">Lanes Needed</p>
            </div>
          </div>

          {directionMode === 'both-ways' && (
            <div className="bg-gray-900 rounded-lg p-2 text-center">
              <p className="text-sm text-gray-400">
                🔀 Shuttle Max:{' '}
                <span className="text-white font-semibold">{getShuttleMax(vph)}</span>
              </p>
            </div>
          )}

          {heavyPercent > 10 && (
            <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-2 text-center">
              <p className="text-xs text-amber-400">
                ⚠️ Heavy &gt;10%: Lane capacity adjusted (+20%)
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={onSave} className="flex-1 bg-green-600 hover:bg-green-700 h-11">
            💾 Save
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            className="flex-1 bg-gray-700 border-gray-600 h-11"
          >
            🔄 Reset
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 bg-gray-700 border-gray-600 h-11"
          >
            ✕ Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COUNTING PAGE
// ============================================

export default function TrafficCounterCountPage() {
  const router = useRouter();

  // Initialize from sessionStorage using lazy initializers
  const [setupState] = useState<SetupState | null>(() => loadSetupState());
  const [duration] = useState<number>(() => setupState?.duration ?? 5);
  const [directionMode] = useState<CountDirection>(() => setupState?.directionMode ?? 'both-ways');
  const [location] = useState<LocationData>(
    () =>
      setupState?.location ?? {
        road_id: '',
        road_name: '',
        slk: null,
        lat: null,
        lon: null,
        region: '',
      }
  );
  const [notes] = useState<string>(() => setupState?.notes ?? '');

  // Timer state - initialize with running state
  const [timeRemaining, setTimeRemaining] = useState<number>(
    () => (setupState?.duration ?? 5) * 60
  );
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState<Date>(() => new Date());

  // Counter state
  const [counts, setCounts] = useState<CounterState>({
    trueLeftLight: 0,
    trueLeftHeavy: 0,
    trueRightLight: 0,
    trueRightHeavy: 0,
  });

  // Stop confirmation
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Redirect if no setup state
  useEffect(() => {
    if (!setupState) {
      router.push('/traffic-counter');
    }
  }, [setupState, router]);

  // Timer logic
  useEffect(() => {
    if (!isComplete && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsComplete(true);
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
  }, [isComplete, timeRemaining]);

  // Wake lock
  useEffect(() => {
    const requestWakeLock = async () => {
      if (!isComplete && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake lock failed:', err);
        }
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, [isComplete]);

  // Haptic feedback
  const haptic = useCallback((duration: number = 10) => {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }, []);

  // Counter handlers
  const incrementCount = (key: keyof CounterState) => {
    haptic(10);
    setCounts((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  };

  const decrementCount = (key: keyof CounterState) => {
    haptic(30);
    setCounts((prev) => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }));
  };

  // Stop handler
  const handleStop = () => {
    setShowStopConfirm(true);
  };

  const confirmStop = () => {
    setIsComplete(true);
    setShowStopConfirm(false);
    haptic(50);
  };

  // Save handler
  const handleSave = () => {
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

    createTrafficCountRecord({
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

    sessionStorage.removeItem('trafficCounterSetup');
    router.push('/traffic-counter');
  };

  // Reset handler
  const handleReset = () => {
    sessionStorage.removeItem('trafficCounterSetup');
    router.push('/traffic-counter');
  };

  // Cancel handler
  const handleCancel = () => {
    sessionStorage.removeItem('trafficCounterSetup');
    router.push('/traffic-counter');
  };

  // Computed values
  const progress = 1 - timeRemaining / (duration * 60);
  const elapsedMinutes = duration - timeRemaining / 60;

  const totalLight =
    directionMode === 'both-ways'
      ? counts.trueLeftLight + counts.trueRightLight
      : counts.trueLeftLight;

  const totalHeavy =
    directionMode === 'both-ways'
      ? counts.trueLeftHeavy + counts.trueRightHeavy
      : counts.trueLeftHeavy;

  const totalVehicles = totalLight + totalHeavy;
  const currentVph =
    elapsedMinutes > 0 ? calculateVPH(totalVehicles, Math.min(elapsedMinutes, duration)) : 0;
  const heavyPercent = calculateHeavyPercentage(totalLight, totalHeavy);

  // Adjusted VPH for heavy vehicles
  const adjustedVph = heavyPercent > 10 ? Math.round(currentVph * 1.2) : currentVph;

  // Lane capacity
  const lanesNeeded =
    adjustedVph <= 1000 ? 1 : adjustedVph <= 2000 ? 2 : adjustedVph <= 3000 ? 3 : 4;

  // Shuttle flow max length
  const getShuttleMax = (v: number) => {
    if (v >= 701) return '70m';
    if (v >= 601) return '100m';
    if (v >= 501) return '150m';
    if (v >= 401) return '250m';
    if (v >= 351) return '400m';
    if (v >= 301) return '600m';
    if (v >= 251) return '800m*';
    if (v >= 201) return '1200m*';
    return '2200m*';
  };

  // Loading state
  if (!setupState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/traffic-counter">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
              ←
            </Button>
          </Link>
          <span className="text-sm font-bold">Traffic Counter</span>
        </div>
        <span className="text-xs text-gray-500">{APP_VERSION}</span>
      </div>

      {/* Timer Section */}
      <div className="bg-gray-800 py-4 flex items-center justify-center gap-4 border-b border-gray-700">
        <ProgressRing progress={progress} timeRemaining={timeRemaining} totalTime={duration * 60} />
        <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700 h-12 px-4">
          ⏹ Stop
        </Button>
      </div>

      {/* Location Info */}
      <div className="bg-gray-850 px-4 py-2 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-white font-semibold">{location.road_id || 'No location'}</span>
            <span className="text-gray-400 ml-2">{location.road_name}</span>
          </div>
          <div className="text-gray-500">
            {duration}min | {directionMode === 'both-ways' ? '↔️ Both' : '→ One way'}
          </div>
        </div>
      </div>

      {/* Counters - Side by Side */}
      <div className="flex-1 px-2 py-3">
        <div className="grid grid-cols-2 gap-2 h-full">
          {/* True Left */}
          <div className="bg-gray-800 rounded-lg p-3 flex flex-col">
            <div className="text-center mb-2">
              <span className="text-green-400 font-semibold text-sm">← True Left</span>
              <p className="text-xs text-gray-500">Increasing SLK</p>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-4">
              <div className="flex justify-center gap-6">
                <CounterButton
                  label="🚗"
                  count={counts.trueLeftLight}
                  onIncrement={() => incrementCount('trueLeftLight')}
                  onDecrement={() => decrementCount('trueLeftLight')}
                  color="green"
                  disabled={isComplete}
                />
                <CounterButton
                  label="🚛"
                  count={counts.trueLeftHeavy}
                  onIncrement={() => incrementCount('trueLeftHeavy')}
                  onDecrement={() => decrementCount('trueLeftHeavy')}
                  color="amber"
                  disabled={isComplete}
                />
              </div>
              <div className="text-center text-xs text-gray-400">
                Total:{' '}
                <span className="text-white font-semibold">
                  {counts.trueLeftLight + counts.trueLeftHeavy}
                </span>
              </div>
            </div>
          </div>

          {/* True Right - only show if both-ways */}
          {directionMode === 'both-ways' ? (
            <div className="bg-gray-800 rounded-lg p-3 flex flex-col">
              <div className="text-center mb-2">
                <span className="text-cyan-400 font-semibold text-sm">True Right →</span>
                <p className="text-xs text-gray-500">Decreasing SLK</p>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-4">
                <div className="flex justify-center gap-6">
                  <CounterButton
                    label="🚗"
                    count={counts.trueRightLight}
                    onIncrement={() => incrementCount('trueRightLight')}
                    onDecrement={() => decrementCount('trueRightLight')}
                    color="green"
                    disabled={isComplete}
                  />
                  <CounterButton
                    label="🚛"
                    count={counts.trueRightHeavy}
                    onIncrement={() => incrementCount('trueRightHeavy')}
                    onDecrement={() => decrementCount('trueRightHeavy')}
                    color="amber"
                    disabled={isComplete}
                  />
                </div>
                <div className="text-center text-xs text-gray-400">
                  Total:{' '}
                  <span className="text-white font-semibold">
                    {counts.trueRightLight + counts.trueRightHeavy}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center justify-center">
              <p className="text-gray-500 text-sm text-center">
                One Direction Mode
                <br />
                <span className="text-xs">Counting True Left only</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Live Stats */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="grid grid-cols-4 gap-2 text-center mb-2">
          <div>
            <p className="text-xl font-bold text-white">{totalVehicles}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-400">{heavyPercent}%</p>
            <p className="text-xs text-gray-500">Heavy</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-400">{currentVph}</p>
            <p className="text-xs text-gray-500">VPH</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-400">{lanesNeeded}</p>
            <p className="text-xs text-gray-500">Lanes</p>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="bg-gray-900 rounded-lg p-2 text-xs">
          {directionMode === 'both-ways' && (
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">🔀 Shuttle Max:</span>
              <span className="text-white font-semibold">{getShuttleMax(currentVph)}</span>
            </div>
          )}
          {heavyPercent > 10 && (
            <div className="text-amber-400 flex items-center gap-1">
              ⚠️ Heavy &gt;10%: Lane capacity adjusted (+20%)
            </div>
          )}
        </div>
      </div>

      {/* Stop Confirmation Dialog */}
      {showStopConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-xs border border-red-600">
            <h3 className="text-lg font-bold text-white text-center mb-2">Stop Count Early?</h3>
            <p className="text-gray-400 text-sm text-center mb-4">
              This will end the count before the timer finishes.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowStopConfirm(false)}
                variant="outline"
                className="flex-1 bg-gray-700 border-gray-600"
              >
                Continue
              </Button>
              <Button onClick={confirmStop} className="flex-1 bg-red-600 hover:bg-red-700">
                Stop
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Overlay */}
      <CompletionOverlay
        isOpen={isComplete}
        counts={counts}
        duration={duration}
        directionMode={directionMode}
        location={location}
        notes={notes}
        startTime={startTime}
        onSave={handleSave}
        onReset={handleReset}
        onCancel={handleCancel}
      />
    </div>
  );
}
