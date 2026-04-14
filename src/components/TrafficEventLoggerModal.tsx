'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  setSite,
  addEventWithNote,
  undoEvent,
  clearAllEvents,
  toggleHold,
  toggleBreak,
  toggleSuspend,
  toggleShuttle,
  toggleAdvancedFlasher,
  toggleSheets,
  downloadCSV,
  testSheetsConnection,
  initializeTimers,
  flushQueue,
  type TrafficEventState,
  type AdvancedFlashers,
} from '@/lib/traffic-event-logger';
import { XIcon } from 'lucide-react';

interface TrafficEventLoggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrafficEventLoggerModal({ open, onOpenChange }: TrafficEventLoggerModalProps) {
  const [state, setState] = useState<TrafficEventState>(getState);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('Ready');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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

  // Handle site change
  const handleSiteChange = useCallback((site: string) => {
    setSite(site);
  }, []);

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
          className="w-screen h-screen max-w-none m-0 rounded-none border-0 p-0 overflow-hidden"
          showCloseButton={false}
        >
          <div className="h-full overflow-y-auto bg-background">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground">Traffic Event Logger</h2>
                <span className="text-muted-foreground text-sm font-medium">v1.0</span>
                <TimerBadge type="hold" state={state} />
                <TimerBadge type="break" state={state} />
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Site input */}
              <Input
                type="text"
                placeholder="Site name"
                maxLength={100}
                value={state.site}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="w-full"
              />

              {/* Note input + presets */}
              <div className="flex gap-2 flex-wrap">
                <Input
                  type="text"
                  placeholder="Note (optional)"
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="flex-1 min-w-[150px]"
                />
                <div className="flex gap-1.5">
                  {['TC1', 'TC2', 'TC3'].map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreset(preset)}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="text-muted-foreground">{status}</span>
                <span className="px-2 py-0.5 rounded-full text-xs border bg-muted">
                  Queue: {state.queue.length}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    isOnline
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}
                >
                  Online: {isOnline ? 'ON' : 'OFF'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    state.sheetsEnabled
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-red-500/20 text-red-600 dark:text-red-400'
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
              <div className="text-sm text-muted-foreground">
                Total: <span className="text-foreground font-medium">{state.events.length}</span>
              </div>

              {/* Counters */}
              <Counters counters={state.counters} />

              {/* Event list */}
              <div className="rounded-lg border bg-card">
                <EventList events={state.events} />
              </div>

              {/* Footer buttons */}
              <div className="flex justify-between gap-2 pt-2 pb-8">
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={state.events.length === 0}
                  >
                    Undo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={state.events.length === 0}
                  >
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    disabled={state.events.length === 0}
                  >
                    Clear
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={handleTestSheets}>
                  Test
                </Button>
              </div>
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
