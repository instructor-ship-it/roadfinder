/**
 * Cycle Timer Storage
 *
 * Manages multiple named timers with lap times for monitoring
 * truck travel times and vehicle movement cycles.
 * @version 1.28.4
 */

// ============================================================================
// Types
// ============================================================================

export interface Lap {
  id: string;
  number: number;
  startTime: number; // timestamp
  endTime: number | null; // timestamp or null if running
  duration: number | null; // ms, null if running
}

export interface CycleTimer {
  id: string;
  label: string;
  createdAt: number;
  laps: Lap[];
  isRunning: boolean;
  currentLapStart: number | null;
}

export interface CycleTimerState {
  timers: CycleTimer[];
  presetLabels: string[];
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'tc-cycle-timer';

const DEFAULT_PRESET_LABELS = [
  'Truck 1',
  'Truck 2',
  'Truck 3',
  'Truck 4',
  'Truck 5',
  'Queue East',
  'Queue West',
  'Spot Call',
  'Shuttle',
  'Other',
];

const DEFAULT_STATE: CycleTimerState = {
  timers: [],
  presetLabels: DEFAULT_PRESET_LABELS,
};

// ============================================================================
// Storage Functions
// ============================================================================

export function getState(): CycleTimerState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load cycle timer state:', e);
  }

  return { ...DEFAULT_STATE };
}

function saveState(state: CycleTimerState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save cycle timer state:', e);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '--:--.--';

  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

export function formatDurationShort(ms: number | null): string {
  if (ms === null) return '--:--';

  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================================
// Timer Functions
// ============================================================================

export function createTimer(label: string): CycleTimer {
  const state = getState();

  const timer: CycleTimer = {
    id: generateId(),
    label: label || `Timer ${state.timers.length + 1}`,
    createdAt: Date.now(),
    laps: [],
    isRunning: false,
    currentLapStart: null,
  };

  state.timers.push(timer);
  saveState(state);

  return timer;
}

export function deleteTimer(timerId: string): void {
  const state = getState();
  state.timers = state.timers.filter((t) => t.id !== timerId);
  saveState(state);
}

export function startLap(timerId: string): void {
  const state = getState();
  const timer = state.timers.find((t) => t.id === timerId);

  if (!timer) return;

  const now = Date.now();

  // If there's a running lap, end it first
  if (timer.isRunning && timer.currentLapStart) {
    const lap: Lap = {
      id: generateId(),
      number: timer.laps.length + 1,
      startTime: timer.currentLapStart,
      endTime: now,
      duration: now - timer.currentLapStart,
    };
    timer.laps.push(lap);
  }

  // Start new lap
  timer.isRunning = true;
  timer.currentLapStart = now;

  saveState(state);
}

export function stopLap(timerId: string): Lap | null {
  const state = getState();
  const timer = state.timers.find((t) => t.id === timerId);

  if (!timer || !timer.isRunning || !timer.currentLapStart) {
    return null;
  }

  const now = Date.now();
  const lap: Lap = {
    id: generateId(),
    number: timer.laps.length + 1,
    startTime: timer.currentLapStart,
    endTime: now,
    duration: now - timer.currentLapStart,
  };

  timer.laps.push(lap);
  timer.isRunning = false;
  timer.currentLapStart = null;

  saveState(state);

  return lap;
}

export function resetTimer(timerId: string): void {
  const state = getState();
  const timer = state.timers.find((t) => t.id === timerId);

  if (!timer) return;

  timer.laps = [];
  timer.isRunning = false;
  timer.currentLapStart = null;

  saveState(state);
}

export function clearAllTimers(): void {
  const state = getState();
  state.timers = [];
  saveState(state);
}

export function updateTimerLabel(timerId: string, label: string): void {
  const state = getState();
  const timer = state.timers.find((t) => t.id === timerId);

  if (!timer) return;

  timer.label = label;
  saveState(state);
}

// ============================================================================
// Stats Functions
// ============================================================================

export function getTimerStats(timer: CycleTimer): {
  totalLaps: number;
  averageTime: number | null;
  minTime: number | null;
  maxTime: number | null;
  totalTime: number;
} {
  const completedLaps = timer.laps.filter((lap) => lap.duration !== null);

  if (completedLaps.length === 0) {
    return {
      totalLaps: 0,
      averageTime: null,
      minTime: null,
      maxTime: null,
      totalTime: 0,
    };
  }

  const durations = completedLaps.map((lap) => lap.duration!);
  const totalTime = durations.reduce((sum, d) => sum + d, 0);

  return {
    totalLaps: completedLaps.length,
    averageTime: totalTime / completedLaps.length,
    minTime: Math.min(...durations),
    maxTime: Math.max(...durations),
    totalTime,
  };
}

// ============================================================================
// Preset Functions
// ============================================================================

export function addPresetLabel(label: string): void {
  const state = getState();
  if (!state.presetLabels.includes(label)) {
    state.presetLabels.push(label);
    saveState(state);
  }
}

export function removePresetLabel(label: string): void {
  const state = getState();
  state.presetLabels = state.presetLabels.filter((l) => l !== label);
  saveState(state);
}
