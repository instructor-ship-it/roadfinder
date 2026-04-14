'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TimerBadge } from './traffic-event-logger/TimerBadge';
import { Counters } from './traffic-event-logger/Counters';
import { EventList } from './traffic-event-logger/EventList';
import { EventButtons, TCMiniButtons } from './traffic-event-logger/EventButtons';
import { ShiftSheet } from './traffic-event-logger/ShiftSheet';
import { MoreSheet } from './traffic-event-logger/MoreSheet';
import { FlasherSheet } from './traffic-event-logger/FlasherSheet';
import {
  getState,
  subscribe,
  setRoadInfo,
  addEventWithNote,
  undoEvent,
  clearAllEvents,
  toggleHold,
  toggleBreak,
  toggleSuspend,
  toggleShuttle,
  toggleAdvancedFlasher,
  downloadCSV,
  testSheetsConnection,
  initializeTimers,
  flushQueue,
  type TrafficEventState,
  type AdvancedFlashers,
} from '@/lib/traffic-event-logger';
import { XIcon, MapPinIcon } from 'lucide-react';

interface TrafficEventLoggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roadId?: string;
  roadName?: string;
  slk?: string;
}

export function TrafficEventLoggerModal({
  open,
  onOpenChange,
  roadId = '',
  roadName = '',
  slk = '',
}: TrafficEventLoggerModalProps) {
  const [state, setState] = useState<TrafficEventState>(getState);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('Ready');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [gpsLoading, setGpsLoading] = useState(false);

  // Sheet states
  const [shiftSheetOpen, setShiftSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [flasherSheetOpen, setFlasherSheetOpen] = useState(false);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = subscribe(setState);
    return unsubscribe;
  }, []);

  // Initialize timers on mount
  useEffect(() => {
    initializeTimers();
  }, []);

  // Update road info when props change
  useEffect(() => {
    if (open && roadId) {
      setRoadInfo(roadId, roadName, slk);
    }
  }, [open, roadId, roadName, slk]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show status message temporarily
  const showStatus = useCallback((msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus('Ready'), 1500);
  }, []);

  // Update location from GPS
  const handleUpdateLocation = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      showStatus('⚠️ GPS not available');
      return;
    }

    setGpsLoading(true);
    showStatus('📍 Getting location...');

    try {
      // Get GPS position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude.toFixed(6);
      const lon = position.coords.longitude.toFixed(6);

      showStatus('📍 Looking up road...');

      // Call GPS API to get road ID and SLK
      const response = await fetch(`/api/gps?lat=${lat}&lon=${lon}`);

      if (!response.ok) {
        throw new Error('GPS lookup failed');
      }

      const data = await response.json();

      if (data.road_id) {
        setRoadInfo(data.road_id, data.road_name || '', data.slk?.toString() || '');
        showStatus(`✅ ${data.road_id} @ SLK ${data.slk}`);
      } else {
        showStatus('⚠️ No road found');
      }
    } catch (error) {
      console.error('GPS location error:', error);
      showStatus('⚠️ GPS failed');
    } finally {
      setGpsLoading(false);
    }
  }, [showStatus]);

  // Log event with GPS capture
  const logEvent = useCallback(
    async (type: string, label: string) => {
      // Capture GPS
      let gps: { latitude: string; longitude: string } | null = null;

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          });
          gps = {
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          };
        } catch {
          showStatus('⚠️ GPS failed');
        }
      }

      addEventWithNote(type, label, note, gps);
      showStatus(`✅ ${label} ${state.sheetsEnabled && isOnline ? '📊' : '📦'}`);
      setNote(''); // Clear note after logging
    },
    [note, state.sheetsEnabled, isOnline, showStatus]
  );

  // Handle undo
  const handleUndo = useCallback(() => {
    const undone = undoEvent();
    if (undone) {
      showStatus(`✅ Undone: ${undone.label} 📊`);
    }
  }, [showStatus]);

  // Handle clear
  const handleClear = useCallback(() => {
    if (confirm('Clear all events?')) {
      clearAllEvents();
      showStatus('✅ Cleared');
    }
  }, [showStatus]);

  // Handle preset note
  const handlePreset = useCallback(
    (value: string) => {
      setNote(value);
      showStatus(`📝 ${value}`);
    },
    [showStatus]
  );

  // Toggle functions
  const handleToggleHold = useCallback(() => {
    toggleHold();
  }, []);

  const handleToggleBreak = useCallback(() => {
    toggleBreak();
  }, []);

  const handleToggleSuspend = useCallback(() => {
    toggleSuspend();
  }, []);

  const handleToggleShuttle = useCallback(() => {
    toggleShuttle();
  }, []);

  const handleToggleFlasher = useCallback((direction: keyof AdvancedFlashers) => {
    toggleAdvancedFlasher(direction);
  }, []);

  // Export CSV
  const handleExport = useCallback(() => {
    downloadCSV();
    showStatus('✅ CSV exported');
  }, [showStatus]);

  // Test sheets
  const handleTestSheets = useCallback(() => {
    testSheetsConnection();
    showStatus('✅ Test sent');
  }, [showStatus]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-screen h-screen max-w-none m-0 rounded-none border-0 p-0 overflow-hidden bg-gray-900 text-white"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 px-4 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold">Traffic Event Logger</h2>
              <span className="text-gray-400 text-sm font-medium">v1.0</span>
              <TimerBadge type="hold" state={state} />
              <TimerBadge type="break" state={state} />
              <div className="flex-1" />
              <button
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            {/* Road info display with GPS button */}
            <div className="mt-2 flex items-center gap-2">
              <div className="text-sm text-cyan-400 font-medium">
                {state.roadId ? `${state.roadId} @ SLK ${state.slk || '---'}` : 'No road selected'}
              </div>
              <button
                onClick={handleUpdateLocation}
                disabled={gpsLoading}
                className="flex items-center gap-1 py-1 px-2 rounded border border-gray-600 bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 disabled:opacity-50 disabled:cursor-wait transition-all"
                title="Update location from GPS"
              >
                <MapPinIcon className="h-3 w-3" />
                {gpsLoading ? '...' : 'GPS'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto" style={{ height: 'calc(100vh - 100px)' }}>
            {/* Note input + presets */}
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Note (optional)"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1 min-w-[150px] py-2.5 px-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1.5">
                {['TC1', 'TC2', 'TC3'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePreset(preset)}
                    className="py-2 px-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-sm hover:bg-gray-600 active:scale-[0.98] transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="text-gray-400">{status}</span>
              <span className="px-2 py-0.5 rounded-full text-xs border border-gray-600 bg-gray-800">
                Queue: {state.queue.length}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                Online: {isOnline ? 'ON' : 'OFF'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  state.sheetsEnabled
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                Sheets: {state.sheetsEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            {/* Event buttons */}
            <EventButtons onLogEvent={logEvent} shuttle={state.shuttle} />

            {/* TC Mini buttons */}
            <TCMiniButtons
              onLogEvent={logEvent}
              onOpenShift={() => setShiftSheetOpen(true)}
              onOpenMore={() => setMoreSheetOpen(true)}
            />

            {/* Total count */}
            <div className="text-sm text-gray-400">
              Total: <span className="text-white font-medium">{state.events.length}</span>
            </div>

            {/* Counters */}
            <Counters counters={state.counters} />

            {/* Event list - scrolling box sized for 3 entries */}
            <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/50">
                <h3 className="text-sm font-medium text-gray-300">Events</h3>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '135px' }}>
                <EventList events={state.events} />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-between gap-2 pt-2 pb-8">
              <div className="flex gap-1.5">
                <button
                  onClick={handleUndo}
                  disabled={state.events.length === 0}
                  className="py-2 px-4 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-sm disabled:opacity-50 hover:bg-gray-600 active:scale-[0.98] transition-all"
                >
                  Undo
                </button>
                <button
                  onClick={handleExport}
                  disabled={state.events.length === 0}
                  className="py-2 px-4 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-sm disabled:opacity-50 hover:bg-gray-600 active:scale-[0.98] transition-all"
                >
                  CSV
                </button>
                <button
                  onClick={handleClear}
                  disabled={state.events.length === 0}
                  className="py-2 px-4 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-sm disabled:opacity-50 hover:bg-gray-600 active:scale-[0.98] transition-all"
                >
                  Clear
                </button>
              </div>
              <button
                onClick={handleTestSheets}
                className="py-2 px-4 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-sm hover:bg-gray-600 active:scale-[0.98] transition-all"
              >
                Test
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheets - rendered outside Dialog to avoid z-index issues */}
      <ShiftSheet open={shiftSheetOpen} onOpenChange={setShiftSheetOpen} onLogEvent={logEvent} />
      <MoreSheet
        open={moreSheetOpen}
        onOpenChange={setMoreSheetOpen}
        state={state}
        onToggleHold={handleToggleHold}
        onToggleBreak={handleToggleBreak}
        onToggleSuspend={handleToggleSuspend}
        onToggleShuttle={handleToggleShuttle}
        onLogEvent={logEvent}
        onOpenFlashers={() => setFlasherSheetOpen(true)}
      />
      <FlasherSheet
        open={flasherSheetOpen}
        onOpenChange={setFlasherSheetOpen}
        flashers={state.advancedFlashers}
        onToggleFlasher={handleToggleFlasher}
      />
    </>
  );
}
