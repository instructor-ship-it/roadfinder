'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  CountDirection,
  calculateVPH,
  calculateHeavyPercentage,
  createTrafficCountRecord,
} from '@/lib/traffic-counter-storage';

const APP_VERSION = 'RC 1.9.6';
const MINIMUM_DURATION_SECONDS = 180; // 3 minutes minimum

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
// QUEUE CALCULATION FUNCTIONS
// ============================================

/**
 * Estimate stopping time based on VPH
 * Higher VPH = shorter stopping times (more frequent cycles)
 */
function estimateStoppingTime(vph: number): number {
  if (vph > 600) return 2; // High volume: short cycles
  if (vph >= 300) return 5; // Medium volume: standard cycles
  return 10; // Low volume: longer cycles possible
}

/**
 * Interpolate queue multiplier based on stopping time
 * Table values: 2min=2.4, 5min=6, 10min=12 for average vehicles
 * Table values: 2min=8, 5min=20, 10min=N/A for heavy vehicles
 */
function interpolateMultiplier(stoppingTime: number, isHeavy: boolean): number {
  if (isHeavy) {
    // Heavy vehicle multipliers: 2min=8, 5min=20
    if (stoppingTime <= 2) return 8;
    if (stoppingTime >= 5) return 20;
    // Linear interpolation between 2 and 5
    return 8 + ((stoppingTime - 2) / 3) * 12;
  } else {
    // Average vehicle multipliers: 2min=2.4, 5min=6, 10min=12
    if (stoppingTime <= 2) return 2.4;
    if (stoppingTime <= 5) {
      // Interpolate between 2 and 5
      return 2.4 + ((stoppingTime - 2) / 3) * 3.6;
    }
    // Interpolate between 5 and 10
    if (stoppingTime <= 10) {
      return 6 + ((stoppingTime - 5) / 5) * 6;
    }
    return 12; // Cap at 10 min value
  }
}

/**
 * Calculate queue length
 * Queue = (light_count × Ma) + (heavy_count × Mo)
 */
function calculateQueueLength(lightCount: number, heavyCount: number, vph: number): number {
  const stoppingTime = estimateStoppingTime(vph);
  const lightMultiplier = interpolateMultiplier(stoppingTime, false);
  const heavyMultiplier = interpolateMultiplier(stoppingTime, true);
  return Math.round(lightCount * lightMultiplier + heavyCount * heavyMultiplier);
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
        <circle
          stroke="#374151"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
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
  vehicleType,
  count,
  onIncrement,
  onDecrement,
  color,
  disabled,
}: {
  vehicleType: 'car' | 'truck';
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

  const icon = vehicleType === 'car' ? '🚗' : '🚛';
  const label = vehicleType === 'car' ? 'Light' : 'Heavy';

  return (
    <div className="flex flex-col items-center">
      <span className="text-lg mb-1">{icon}</span>
      <span className="text-xs text-gray-400 mb-1">{label}</span>
      <button
        onClick={onIncrement}
        disabled={disabled}
        className={`w-16 h-14 rounded-full ${colorClasses[color]} text-white text-2xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center`}
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
  plannedDuration,
  actualDuration,
  directionMode,
  location,
  notes,
  startTime,
  onSave,
  onReset,
  onCancel,
  insufficientData,
}: {
  isOpen: boolean;
  counts: CounterState;
  plannedDuration: number;
  actualDuration: number;
  directionMode: CountDirection;
  location: LocationData;
  notes: string;
  startTime: Date | null;
  onSave: () => void;
  onReset: () => void;
  onCancel: () => void;
  insufficientData: boolean;
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
  const actualDurationMin = Math.ceil(actualDuration / 60);
  const vph = calculateVPH(totalVehicles, actualDurationMin);

  // Calculate lane capacity with heavy vehicle adjustment
  const adjustedVph = heavyPercent > 10 ? Math.round(vph * 1.2) : vph;
  const lanesNeeded =
    adjustedVph <= 1000 ? 1 : adjustedVph <= 2000 ? 2 : adjustedVph <= 3000 ? 3 : 4;

  // Calculate queue length
  const queueLength = calculateQueueLength(totalLight, totalHeavy, vph);
  const stoppingTime = estimateStoppingTime(vph);

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
      <div className="bg-gray-800 rounded-xl p-5 w-full max-w-sm border border-green-600 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-green-400 text-center mb-3">✓ Count Complete!</h2>

        {insufficientData && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 text-center mb-3">
            <p className="text-sm text-red-400">
              ⚠️ Count duration under 3 minutes. Record cannot be saved.
            </p>
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="bg-gray-900 rounded-lg p-2">
            <p className="text-white font-semibold">{location.road_id || 'Unknown'}</p>
            <p className="text-gray-400 text-xs">{location.road_name}</p>
            {notes && <p className="text-gray-500 text-xs mt-1 italic">{notes}</p>}
          </div>

          <div className="bg-gray-900 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">
              Duration: <span className="text-white">{actualDurationMin} min</span>
              {actualDurationMin !== plannedDuration && (
                <span className="text-gray-500"> (planned: {plannedDuration} min)</span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-900 rounded-lg p-2 text-center">
              <p className="text-xl font-bold text-white">{totalVehicles}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2 text-center">
              <p className="text-xl font-bold text-amber-400">{heavyPercent}%</p>
              <p className="text-xs text-gray-500">Heavy</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2 text-center">
              <p className="text-xl font-bold text-blue-400">{vph}</p>
              <p className="text-xs text-gray-500">VPH</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2 text-center">
              <p className="text-xl font-bold text-green-400">{lanesNeeded}</p>
              <p className="text-xs text-gray-500">Lanes</p>
            </div>
          </div>

          {/* Queue Length */}
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-2 text-center">
            <p className="text-sm text-purple-400">
              📏 Queue Length: <span className="text-white font-bold">{queueLength}m</span>
            </p>
            <p className="text-xs text-gray-500">Based on {stoppingTime} min stopping time</p>
          </div>

          {directionMode === 'both-ways' && (
            <div className="bg-gray-900 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400">
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
          {!insufficientData && (
            <Button onClick={onSave} className="flex-1 bg-green-600 hover:bg-green-700 h-10">
              💾 Save
            </Button>
          )}
          <Button
            onClick={onReset}
            variant="outline"
            className="flex-1 bg-gray-700 border-gray-600 h-10"
          >
            🔄 Reset
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 bg-gray-700 border-gray-600 h-10"
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
  const [plannedDuration] = useState<number>(() => setupState?.duration ?? 5);
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

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(
    () => (setupState?.duration ?? 5) * 60
  );
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState<Date>(() => new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

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
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds((prev) => prev + 1);
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

  // Check if duration is sufficient for saving
  const isDurationSufficient = elapsedSeconds >= MINIMUM_DURATION_SECONDS;

  // Save handler
  const handleSave = () => {
    if (!isDurationSufficient) {
      alert('Count duration must be at least 3 minutes to save.');
      return;
    }

    const endTime = new Date();
    const actualDurationMin = Math.ceil(elapsedSeconds / 60);

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
    const vph = calculateVPH(totalVehicles, actualDurationMin);

    // Calculate queue length
    const queueLength = calculateQueueLength(totalLight, totalHeavy, vph);

    createTrafficCountRecord({
      road_id: location.road_id || 'UNKNOWN',
      road_name: location.road_name || 'Unknown Road',
      slk: location.slk,
      lat: location.lat,
      lon: location.lon,
      region: location.region,
      duration_minutes: actualDurationMin, // Use actual duration
      direction_mode: directionMode,
      true_left_light: counts.trueLeftLight,
      true_left_heavy: counts.trueLeftHeavy,
      true_right_light: directionMode === 'both-ways' ? counts.trueRightLight : 0,
      true_right_heavy: directionMode === 'both-ways' ? counts.trueRightHeavy : 0,
      total_light: totalLight,
      total_heavy: totalHeavy,
      total_vehicles: totalVehicles,
      heavy_percentage: heavyPercent,
      vph_true_left: calculateVPH(counts.trueLeftLight + counts.trueLeftHeavy, actualDurationMin),
      vph_true_right: calculateVPH(
        counts.trueRightLight + counts.trueRightHeavy,
        actualDurationMin
      ),
      vph_combined: vph,
      vph_one_direction: calculateVPH(
        Math.max(
          counts.trueLeftLight + counts.trueLeftHeavy,
          counts.trueRightLight + counts.trueRightHeavy
        ),
        actualDurationMin
      ),
      queue_length: queueLength,
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
  const progress = 1 - timeRemaining / (plannedDuration * 60);
  const elapsedMinutes = elapsedSeconds / 60;

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
    elapsedMinutes > 0 ? calculateVPH(totalVehicles, Math.min(elapsedMinutes, plannedDuration)) : 0;
  const heavyPercent = calculateHeavyPercentage(totalLight, totalHeavy);

  // Adjusted VPH for heavy vehicles
  const adjustedVph = heavyPercent > 10 ? Math.round(currentVph * 1.2) : currentVph;

  // Lane capacity
  const lanesNeeded =
    adjustedVph <= 1000 ? 1 : adjustedVph <= 2000 ? 2 : adjustedVph <= 3000 ? 3 : 4;

  // Queue length
  const queueLength = calculateQueueLength(totalLight, totalHeavy, currentVph);
  const stoppingTime = estimateStoppingTime(currentVph);

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
      <div className="bg-gray-800 py-3 flex items-center justify-center gap-4 border-b border-gray-700">
        <ProgressRing
          progress={progress}
          timeRemaining={timeRemaining}
          totalTime={plannedDuration * 60}
        />
        <Button onClick={handleStop} className="bg-red-600 hover:bg-red-700 h-12 px-4">
          ⏹ Stop
        </Button>
      </div>

      {/* Location Info */}
      <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-white font-semibold">{location.road_id || 'No location'}</span>
            <span className="text-gray-400 ml-2">{location.road_name}</span>
          </div>
          <div className="text-gray-500">
            {plannedDuration}min | {directionMode === 'both-ways' ? '↔️ Both' : '→ One way'}
          </div>
        </div>
      </div>

      {/* Counters - Side by Side */}
      <div className="flex-1 px-2 py-2">
        <div className="grid grid-cols-2 gap-2 h-full">
          {/* True Left */}
          <div className="bg-gray-800 rounded-lg p-2 flex flex-col">
            <div className="text-center mb-1">
              <span className="text-green-400 font-semibold text-sm">← True Left</span>
              <p className="text-xs text-gray-500">Increasing SLK</p>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-2">
              <div className="flex justify-center gap-4">
                <CounterButton
                  vehicleType="car"
                  count={counts.trueLeftLight}
                  onIncrement={() => incrementCount('trueLeftLight')}
                  onDecrement={() => decrementCount('trueLeftLight')}
                  color="green"
                  disabled={isComplete}
                />
                <CounterButton
                  vehicleType="truck"
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
            <div className="bg-gray-800 rounded-lg p-2 flex flex-col">
              <div className="text-center mb-1">
                <span className="text-cyan-400 font-semibold text-sm">True Right →</span>
                <p className="text-xs text-gray-500">Decreasing SLK</p>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-2">
                <div className="flex justify-center gap-4">
                  <CounterButton
                    vehicleType="car"
                    count={counts.trueRightLight}
                    onIncrement={() => incrementCount('trueRightLight')}
                    onDecrement={() => decrementCount('trueRightLight')}
                    color="green"
                    disabled={isComplete}
                  />
                  <CounterButton
                    vehicleType="truck"
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
            <div className="bg-gray-800 rounded-lg p-2 flex flex-col items-center justify-center">
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
      <div className="bg-gray-800 border-t border-gray-700 px-3 py-2">
        <div className="grid grid-cols-5 gap-1 text-center mb-2">
          <div>
            <p className="text-lg font-bold text-white">{totalVehicles}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-400">{heavyPercent}%</p>
            <p className="text-xs text-gray-500">Heavy</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-400">{currentVph}</p>
            <p className="text-xs text-gray-500">VPH</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-400">{lanesNeeded}</p>
            <p className="text-xs text-gray-500">Lanes</p>
          </div>
          <div>
            <p className="text-lg font-bold text-purple-400">
              {queueLength > 0 ? queueLength : '-'}
            </p>
            <p className="text-xs text-gray-500">Queue</p>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="bg-gray-900 rounded-lg p-2 text-xs">
          {directionMode === 'both-ways' && currentVph > 0 && (
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">🔀 Shuttle Max:</span>
              <span className="text-white font-semibold">{getShuttleMax(currentVph)}</span>
            </div>
          )}
          {queueLength > 0 && (
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">📏 Queue ({stoppingTime}min stop):</span>
              <span className="text-white font-semibold">{queueLength}m</span>
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
          <div className="bg-gray-800 rounded-xl p-5 w-full max-w-xs border border-red-600">
            <h3 className="text-lg font-bold text-white text-center mb-2">Stop Count Early?</h3>
            <p className="text-gray-400 text-sm text-center mb-3">
              This will end the count before the timer finishes.
            </p>
            {elapsedSeconds < MINIMUM_DURATION_SECONDS && (
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-2 text-center mb-3">
                <p className="text-xs text-amber-400">
                  ⚠️ Under 3 minutes - record cannot be saved
                </p>
              </div>
            )}
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
        plannedDuration={plannedDuration}
        actualDuration={elapsedSeconds}
        directionMode={directionMode}
        location={location}
        notes={notes}
        startTime={startTime}
        onSave={handleSave}
        onReset={handleReset}
        onCancel={handleCancel}
        insufficientData={!isDurationSufficient}
      />
    </div>
  );
}
