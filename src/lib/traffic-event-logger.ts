/**
 * Traffic Event Logger Storage
 *
 * Manages event logging, counters, timers, and Google Sheets sync
 * for the Traffic Event Logger modal.
 */

// ============================================================================
// Types
// ============================================================================

export interface TrafficEvent {
  id: string;
  time: string;
  type: string;
  label: string;
  note: string;
  roadId: string;
  roadName: string;
  slk: string;
  op: 'LOG' | 'DELETE';
  targetId: string;
  latitude: string;
  longitude: string;
}

export interface EventCounters {
  trueLeft: number;
  trueRight: number;
  rlr: number;
  trip: number;
}

export interface AdvancedFlashers {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
  both: boolean;
}

export interface TrafficEventState {
  events: TrafficEvent[];
  queue: TrafficEvent[];
  counters: EventCounters;
  roadId: string;
  roadName: string;
  slk: string;
  hold: {
    active: boolean;
    startTime: string | null;
  };
  break: {
    active: boolean;
    startTime: string | null;
  };
  suspended: boolean;
  shuttle: boolean;
  advancedFlashers: AdvancedFlashers;
  sheetsEnabled: boolean;
  shiftStartTime: string | null;
  lastSentInterval: number | null;
  lastShuttleInterval: number | null;
  tcLeftAssignment: string | null;
  tcRightAssignment: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'tc-traffic-event-logger';
const SHEETS_URL =
  'https://script.google.com/macros/s/AKfycbx9ORdxMtuQrlwy3i2o0q8gvY28uebYhpIE6RQTxw5lLTyGgJaEeSs9ENRD5e2jcynW/exec';

const DEFAULT_STATE: TrafficEventState = {
  events: [],
  queue: [],
  counters: { trueLeft: 0, trueRight: 0, rlr: 0, trip: 0 },
  roadId: '',
  roadName: '',
  slk: '',
  hold: { active: false, startTime: null },
  break: { active: false, startTime: null },
  suspended: false,
  shuttle: false,
  advancedFlashers: { north: false, south: false, east: false, west: false, both: false },
  sheetsEnabled: true,
  shiftStartTime: null,
  lastSentInterval: null,
  lastShuttleInterval: null,
  tcLeftAssignment: null,
  tcRightAssignment: null,
};

// ============================================================================
// Timer Management (Module-level for background operation)
// ============================================================================

type StateChangeListener = (state: TrafficEventState) => void;

const listeners: Set<StateChangeListener> = new Set();
let holdTimerInterval: ReturnType<typeof setInterval> | null = null;
let breakTimerInterval: ReturnType<typeof setInterval> | null = null;
let lastSentTime: Date | null = null;
let lastShuttleTime: Date | null = null;

function notifyListeners() {
  const state = getState();
  listeners.forEach((listener) => listener(state));
}

export function subscribe(listener: StateChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ============================================================================
// Storage Functions
// ============================================================================

export function getState(): TrafficEventState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load traffic event state:', e);
  }

  return { ...DEFAULT_STATE };
}

function saveState(state: TrafficEventState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save traffic event state:', e);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

function cleanString(s: string): string {
  return String(s || '')
    .replace(/["',]/g, '')
    .trim();
}

// ============================================================================
// Event Functions
// ============================================================================

export function addEvent(
  type: string,
  label: string,
  gps?: { latitude: string; longitude: string } | null
): TrafficEvent {
  const state = getState();

  const event: TrafficEvent = {
    id: generateId(),
    time: formatTime(new Date()),
    type,
    label,
    note: '',
    roadId: state.roadId,
    roadName: state.roadName,
    slk: state.slk,
    op: 'LOG',
    targetId: generateId(),
    latitude: gps?.latitude || 'N/A',
    longitude: gps?.longitude || 'N/A',
  };

  state.events.unshift(event);

  // Update counters
  if (type === 'trueLeft') state.counters.trueLeft++;
  if (type === 'trueRight') state.counters.trueRight++;
  if (type === 'rlr') state.counters.rlr++;
  if (type === 'trip') state.counters.trip++;

  // Sync to sheets or queue
  if (state.sheetsEnabled && navigator.onLine) {
    sendToSheets(event);
  } else {
    state.queue.push(event);
  }

  saveState(state);
  notifyListeners();

  return event;
}

export function addEventWithNote(
  type: string,
  label: string,
  note: string,
  gps?: { latitude: string; longitude: string } | null
): TrafficEvent {
  const state = getState();
  const now = new Date();

  const event: TrafficEvent = {
    id: generateId(),
    time: formatTime(now),
    type,
    label,
    note: cleanString(note),
    roadId: state.roadId,
    roadName: state.roadName,
    slk: state.slk,
    op: 'LOG',
    targetId: generateId(),
    latitude: gps?.latitude || 'N/A',
    longitude: gps?.longitude || 'N/A',
  };

  state.events.unshift(event);

  // Update counters and calculate intervals
  if (type === 'trueLeft' || type === 'trueRight') {
    if (type === 'trueLeft') state.counters.trueLeft++;
    if (type === 'trueRight') state.counters.trueRight++;

    // Calculate interval since last sent
    if (lastSentTime) {
      state.lastSentInterval = Math.floor((now.getTime() - lastSentTime.getTime()) / 1000);
    }
    lastSentTime = now;
  }
  if (type === 'rlr') state.counters.rlr++;
  if (type === 'trip') state.counters.trip++;
  if (type === 'shuttleSend') {
    // Calculate interval since last shuttle
    if (lastShuttleTime) {
      state.lastShuttleInterval = Math.floor((now.getTime() - lastShuttleTime.getTime()) / 1000);
    }
    lastShuttleTime = now;
  }

  // Sync to sheets or queue
  if (state.sheetsEnabled && navigator.onLine) {
    sendToSheets(event);
  } else {
    state.queue.push(event);
  }

  saveState(state);
  notifyListeners();

  return event;
}

// Add event with custom road info (for spot calls at different locations)
export function addEventWithNoteAndRoad(
  type: string,
  label: string,
  note: string,
  roadInfo: { roadId: string; roadName: string; slk: string },
  gps?: { latitude: string; longitude: string } | null
): TrafficEvent {
  const state = getState();
  const now = new Date();

  const event: TrafficEvent = {
    id: generateId(),
    time: formatTime(now),
    type,
    label,
    note: cleanString(note),
    roadId: roadInfo.roadId,
    roadName: roadInfo.roadName,
    slk: roadInfo.slk,
    op: 'LOG',
    targetId: generateId(),
    latitude: gps?.latitude || 'N/A',
    longitude: gps?.longitude || 'N/A',
  };

  state.events.unshift(event);

  // Update counters and calculate intervals
  if (type === 'trueLeft' || type === 'trueRight') {
    if (type === 'trueLeft') state.counters.trueLeft++;
    if (type === 'trueRight') state.counters.trueRight++;

    // Calculate interval since last sent
    if (lastSentTime) {
      state.lastSentInterval = Math.floor((now.getTime() - lastSentTime.getTime()) / 1000);
    }
    lastSentTime = now;
  }
  if (type === 'rlr') state.counters.rlr++;
  if (type === 'trip') state.counters.trip++;
  if (type === 'shuttleSend') {
    // Calculate interval since last shuttle
    if (lastShuttleTime) {
      state.lastShuttleInterval = Math.floor((now.getTime() - lastShuttleTime.getTime()) / 1000);
    }
    lastShuttleTime = now;
  }

  // Sync to sheets or queue
  if (state.sheetsEnabled && navigator.onLine) {
    sendToSheets(event);
  } else {
    state.queue.push(event);
  }

  saveState(state);
  notifyListeners();

  return event;
}

export function undoEvent(): TrafficEvent | null {
  const state = getState();

  if (state.events.length === 0) return null;

  const undone = state.events.shift()!;

  // Update counters
  if (undone.type === 'trueLeft')
    state.counters.trueLeft = Math.max(0, state.counters.trueLeft - 1);
  if (undone.type === 'trueRight')
    state.counters.trueRight = Math.max(0, state.counters.trueRight - 1);
  if (undone.type === 'rlr') state.counters.rlr = Math.max(0, state.counters.rlr - 1);
  if (undone.type === 'trip') state.counters.trip = Math.max(0, state.counters.trip - 1);

  // Remove from queue if pending
  state.queue = state.queue.filter((q) => q.targetId !== undone.targetId);

  // Create delete event for sheets
  const deleteEvent: TrafficEvent = {
    id: generateId(),
    time: formatTime(new Date()),
    type: 'deleted',
    label: 'DELETED',
    note: `Original: ${undone.label}`,
    roadId: undone.roadId,
    roadName: undone.roadName,
    slk: undone.slk,
    op: 'DELETE',
    targetId: undone.targetId,
    latitude: 'N/A',
    longitude: 'N/A',
  };

  if (state.sheetsEnabled && navigator.onLine) {
    sendToSheets(deleteEvent);
  } else {
    state.queue.push(deleteEvent);
  }

  saveState(state);
  notifyListeners();

  return undone;
}

export function clearAllEvents(): void {
  const state = getState();
  state.events = [];
  state.queue = [];
  state.counters = { trueLeft: 0, trueRight: 0, rlr: 0, trip: 0 };
  state.shuttle = false;
  state.advancedFlashers = { north: false, south: false, east: false, west: false, both: false };
  state.roadId = '';
  state.roadName = '';
  state.slk = '';
  state.lastSentInterval = null;
  state.lastShuttleInterval = null;
  state.tcLeftAssignment = null;
  state.tcRightAssignment = null;
  lastSentTime = null;
  lastShuttleTime = null;
  saveState(state);
  notifyListeners();
}

export function clearShift(): void {
  const state = getState();
  state.events = [];
  state.queue = [];
  state.counters = { trueLeft: 0, trueRight: 0, rlr: 0, trip: 0 };
  state.shuttle = false;
  state.advancedFlashers = { north: false, south: false, east: false, west: false, both: false };
  state.hold = { active: false, startTime: null };
  state.break = { active: false, startTime: null };
  state.suspended = false;
  state.shiftStartTime = formatTime(new Date());
  state.lastSentInterval = null;
  state.lastShuttleInterval = null;
  state.tcLeftAssignment = null;
  state.tcRightAssignment = null;
  lastSentTime = null;
  lastShuttleTime = null;
  saveState(state);

  // Stop timers
  stopHoldTimer();
  stopBreakTimer();

  notifyListeners();
}

// ============================================================================
// Road Info Functions
// ============================================================================

export function setRoadInfo(roadId: string, roadName: string, slk: string): void {
  const state = getState();
  state.roadId = roadId;
  state.roadName = roadName;
  state.slk = slk;
  saveState(state);
  notifyListeners();
}

// TC Assignment Functions
export function setTcAssignment(direction: 'left' | 'right', tc: string): void {
  const state = getState();

  if (direction === 'left') {
    // If the same TC is assigned to right, clear it
    if (state.tcRightAssignment === tc) {
      state.tcRightAssignment = null;
    }
    state.tcLeftAssignment = tc;
  } else {
    // If the same TC is assigned to left, clear it
    if (state.tcLeftAssignment === tc) {
      state.tcLeftAssignment = null;
    }
    state.tcRightAssignment = tc;
  }

  saveState(state);
  notifyListeners();
}

export function clearTcAssignment(direction: 'left' | 'right'): void {
  const state = getState();

  if (direction === 'left') {
    state.tcLeftAssignment = null;
  } else {
    state.tcRightAssignment = null;
  }

  saveState(state);
  notifyListeners();
}

export function clearBothTcAssignments(): { leftTc: string | null; rightTc: string | null } {
  const state = getState();
  const result = {
    leftTc: state.tcLeftAssignment,
    rightTc: state.tcRightAssignment,
  };

  state.tcLeftAssignment = null;
  state.tcRightAssignment = null;

  saveState(state);
  notifyListeners();

  return result;
}

// ============================================================================
// Toggle Functions
// ============================================================================

export function toggleHold(): boolean {
  const state = getState();
  state.hold.active = !state.hold.active;

  if (state.hold.active) {
    state.hold.startTime = new Date().toISOString();
    startHoldTimer();
    addEvent('hold', 'Hold ON');
  } else {
    // Calculate duration before clearing startTime
    let durationStr = '';
    if (state.hold.startTime) {
      const durationMs = Date.now() - new Date(state.hold.startTime).getTime();
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      durationStr = ` (${minutes}m ${seconds}s)`;
    }
    addEvent('hold', `Hold OFF${durationStr}`);
    state.hold.startTime = null;
    stopHoldTimer();
  }

  saveState(state);
  notifyListeners();

  return state.hold.active;
}

export function toggleBreak(): boolean {
  const state = getState();
  state.break.active = !state.break.active;

  if (state.break.active) {
    state.break.startTime = new Date().toISOString();
    startBreakTimer();
    addEvent('break', 'Break ON');
  } else {
    addEvent('break', 'Break OFF');
    state.break.startTime = null;
    stopBreakTimer();
  }

  saveState(state);
  notifyListeners();

  return state.break.active;
}

export function toggleSuspend(): boolean {
  const state = getState();
  state.suspended = !state.suspended;
  addEvent('suspend', state.suspended ? 'Data Entry Suspended ON' : 'Data Entry Suspended OFF');
  saveState(state);
  notifyListeners();

  return state.suspended;
}

export function toggleShuttle(): boolean {
  const state = getState();
  state.shuttle = !state.shuttle;
  addEvent('shuttle', state.shuttle ? 'Shuttle ON' : 'Shuttle OFF');
  saveState(state);
  notifyListeners();

  return state.shuttle;
}

export function toggleAdvancedFlasher(direction: keyof AdvancedFlashers): boolean {
  const state = getState();
  state.advancedFlashers[direction] = !state.advancedFlashers[direction];

  // Map direction keys to user-friendly labels
  const directionLabels: Record<keyof AdvancedFlashers, string> = {
    north: 'North',
    south: 'South',
    east: 'True Left',
    west: 'True Right',
    both: 'Both ends',
  };

  addEvent(
    'advFlash',
    `AdvFlash ${directionLabels[direction]}: ${state.advancedFlashers[direction] ? 'ON' : 'OFF'}`
  );
  saveState(state);
  notifyListeners();

  return state.advancedFlashers[direction];
}

export function toggleSheets(): boolean {
  const state = getState();
  state.sheetsEnabled = !state.sheetsEnabled;

  // Flush queue when re-enabling
  if (state.sheetsEnabled && navigator.onLine) {
    flushQueue();
  }

  saveState(state);
  notifyListeners();

  return state.sheetsEnabled;
}

// ============================================================================
// Timer Functions
// ============================================================================

function startHoldTimer(): void {
  if (holdTimerInterval) clearInterval(holdTimerInterval);
  holdTimerInterval = setInterval(() => {
    notifyListeners();
  }, 1000);
}

function stopHoldTimer(): void {
  if (holdTimerInterval) {
    clearInterval(holdTimerInterval);
    holdTimerInterval = null;
  }
}

function startBreakTimer(): void {
  if (breakTimerInterval) clearInterval(breakTimerInterval);
  breakTimerInterval = setInterval(() => {
    notifyListeners();
  }, 1000);
}

function stopBreakTimer(): void {
  if (breakTimerInterval) {
    clearInterval(breakTimerInterval);
    breakTimerInterval = null;
  }
}

export function getHoldElapsedTime(): number {
  const state = getState();
  if (!state.hold.active || !state.hold.startTime) return 0;
  return Date.now() - new Date(state.hold.startTime).getTime();
}

export function getBreakElapsedTime(): number {
  const state = getState();
  if (!state.break.active || !state.break.startTime) return 0;
  return Date.now() - new Date(state.break.startTime).getTime();
}

// ============================================================================
// Google Sheets Sync
// ============================================================================

function buildSheetsURL(event: TrafficEvent): string {
  const params = new URLSearchParams({
    secret: 'jaytec',
    type: event.type,
    label: event.label,
    note: event.note,
    roadId: event.roadId,
    roadName: event.roadName,
    slk: event.slk,
    op: event.op,
    targetId: event.targetId,
    time: event.time,
    latitude: event.latitude,
    longitude: event.longitude,
    _ts: Date.now().toString(),
  });

  return `${SHEETS_URL}?${params.toString()}`;
}

function sendToSheets(event: TrafficEvent): void {
  const url = buildSheetsURL(event);
  console.log('🔥 SENDING TO SHEETS:', url);

  fetch(url, { mode: 'no-cors', cache: 'no-cache' })
    .then(() => console.log('✅ SHEET OK:', event.label))
    .catch((err) => console.error('❌ SHEET ERROR:', err, url));
}

export function flushQueue(): void {
  const state = getState();

  if (!state.sheetsEnabled || !navigator.onLine || state.queue.length === 0) return;

  const pending = [...state.queue];
  state.queue = [];
  saveState(state);

  pending.forEach((event) => sendToSheets(event));
  notifyListeners();
}

export function testSheetsConnection(): void {
  const testEvent: TrafficEvent = {
    id: generateId(),
    time: formatTime(new Date()),
    type: 'TEST',
    label: 'TEST EVENT',
    note: 'TC1',
    roadId: 'H001',
    roadName: 'Test Road',
    slk: '10.00',
    op: 'LOG',
    targetId: 'TEST123',
    latitude: '-31.89',
    longitude: '115.99',
  };

  sendToSheets(testEvent);
}

// ============================================================================
// Export Functions
// ============================================================================

export function exportCSV(): string {
  const state = getState();

  if (state.events.length === 0) return '';

  const headers = [
    'Time',
    'Type',
    'Label',
    'Note',
    'Road ID',
    'Road Name',
    'SLK',
    'Op',
    'targetId',
    'Latitude',
    'Longitude',
  ];
  const rows = [headers];

  state.events.forEach((e) => {
    rows.push([
      e.time,
      e.type,
      e.label,
      e.note,
      e.roadId,
      e.roadName,
      e.slk,
      e.op,
      e.targetId,
      e.latitude,
      e.longitude,
    ]);
  });

  return rows
    .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function downloadCSV(): void {
  const csv = exportCSV();
  if (!csv) return;

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `traffic-events-${formatTime(new Date()).replace(/:/g, '-')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Initialization
// ============================================================================

// Resume timers if they were active
export function initializeTimers(): void {
  const state = getState();

  if (state.hold.active && state.hold.startTime) {
    startHoldTimer();
  }

  if (state.break.active && state.break.startTime) {
    startBreakTimer();
  }
}

// Check online status and flush queue
export function checkOnlineAndFlush(): void {
  if (navigator.onLine) {
    flushQueue();
  }
}
