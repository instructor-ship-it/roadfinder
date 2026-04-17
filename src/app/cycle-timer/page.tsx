'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  getState,
  createTimer,
  deleteTimer,
  startLap,
  stopLap,
  resetTimer,
  clearAllTimers,
  updateTimerLabel,
  updateTimerDescription,
  getTimerStats,
  formatDuration,
  formatDurationShort,
  type CycleTimer,
  type CycleTimerState,
} from '@/lib/cycle-timer-storage';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  RotateCcwIcon,
  PlayIcon,
  PauseIcon,
} from 'lucide-react';
import { MobileNav, MobilePage } from '@/components/ui/mobile-nav';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { toastSuccess, toastError } from '@/hooks/use-toast';

export default function CycleTimerPage() {
  const confirm = useConfirm();
  const [state, setState] = useState<CycleTimerState>(getState);
  const [newTimerLabel, setNewTimerLabel] = useState('');
  const [newTimerDescription, setNewTimerDescription] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [expandedTimerId, setExpandedTimerId] = useState<string | null>(null);

  // Refresh state from storage
  const refreshState = useCallback(() => {
    setState(getState());
  }, []);

  // Update running timers every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update running timer displays
      setState((prev) => ({ ...prev, _ts: Date.now() }));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Get current elapsed time for a running timer
  const getCurrentElapsed = (timer: CycleTimer): number => {
    if (!timer.isRunning || !timer.currentLapStart) return 0;
    return Date.now() - timer.currentLapStart;
  };

  // Handle add timer
  const handleAddTimer = useCallback(() => {
    if (!newTimerLabel.trim()) return;
    createTimer(newTimerLabel.trim(), newTimerDescription.trim());
    setNewTimerLabel('');
    setNewTimerDescription('');
    setShowAddForm(false);
    refreshState();
  }, [newTimerLabel, newTimerDescription, refreshState]);

  // Handle quick add with preset
  const handleQuickAdd = useCallback(
    (label: string) => {
      createTimer(label);
      refreshState();
    },
    [refreshState]
  );

  // Handle delete timer
  const handleDeleteTimer = useCallback(
    async (timerId: string) => {
      const confirmed = await confirm({
        title: 'Delete Timer?',
        message: 'This will permanently delete this timer and all its lap history.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });

      if (confirmed) {
        deleteTimer(timerId);
        refreshState();
        toastSuccess('Timer deleted');
      }
    },
    [confirm, refreshState]
  );

  // Handle start/stop lap
  const handleToggleTimer = useCallback(
    (timerId: string, isRunning: boolean) => {
      if (isRunning) {
        stopLap(timerId);
      } else {
        startLap(timerId);
      }
      refreshState();
    },
    [refreshState]
  );

  // Handle reset timer
  const handleResetTimer = useCallback(
    (timerId: string) => {
      resetTimer(timerId);
      refreshState();
    },
    [refreshState]
  );

  // Handle clear all
  const handleClearAll = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Clear All Timers?',
      message:
        'This will permanently delete all timers and their lap history. This action cannot be undone.',
      confirmLabel: 'Clear All',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      clearAllTimers();
      refreshState();
      toastSuccess('All timers cleared');
    }
  }, [confirm, refreshState]);

  // Handle label edit
  const handleStartEdit = useCallback((timer: CycleTimer) => {
    setEditingTimerId(timer.id);
    setEditingLabel(timer.label);
    setEditingDescription(timer.description || '');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingTimerId && editingLabel.trim()) {
      updateTimerLabel(editingTimerId, editingLabel.trim());
      updateTimerDescription(editingTimerId, editingDescription.trim());
      refreshState();
    }
    setEditingTimerId(null);
    setEditingLabel('');
    setEditingDescription('');
  }, [editingTimerId, editingLabel, editingDescription, refreshState]);

  // Sort timers: running first, then by creation time
  const sortedTimers = [...state.timers].sort((a, b) => {
    if (a.isRunning && !b.isRunning) return -1;
    if (!a.isRunning && b.isRunning) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <MobilePage>
      {/* Header with Navigation */}
      <MobileNav
        title="Cycle Timer"
        subtitle="Monitor travel times and vehicle cycles"
        showBack
        backHref="/"
        backLabel="Back"
      />

      {/* Quick Add Buttons */}
      <section className="px-4 py-3 border-b border-gray-800" aria-label="Quick add timers">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500" id="quick-add-label">
            Quick Add:
          </span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="quick-add-label">
          {state.presetLabels.slice(0, 5).map((label) => (
            <button
              key={label}
              onClick={() => handleQuickAdd(label)}
              className="px-3 py-1.5 rounded-full bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 active:bg-gray-500 transition-colors touch-manipulation"
              aria-label={`Add ${label} timer`}
            >
              + {label}
            </button>
          ))}
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 rounded-full bg-cyan-600 text-white text-xs hover:bg-cyan-700 active:bg-cyan-800 transition-colors touch-manipulation"
            aria-label="Add custom timer"
          >
            + Custom
          </button>
        </div>
      </section>

      {/* Add Timer Form */}
      {showAddForm && (
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTimerLabel}
                onChange={(e) => setNewTimerLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTimer()}
                placeholder="Timer label (e.g., Timer 6)"
                className="flex-1 px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                autoFocus
              />
              <button
                onClick={handleAddTimer}
                disabled={!newTimerLabel.trim()}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewTimerLabel('');
                  setNewTimerDescription('');
                }}
                className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
            <input
              type="text"
              value={newTimerDescription}
              onChange={(e) => setNewTimerDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTimer()}
              placeholder="Optional description (e.g., Blue truck - Great Eastern Hwy)"
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      )}

      {/* Timer List */}
      <section className="px-4 py-3" aria-label="Timer list">
        {sortedTimers.length === 0 ? (
          <div className="text-center py-12 text-gray-500" role="status">
            <div className="text-4xl mb-3" aria-hidden="true">
              ⏱️
            </div>
            <p className="text-sm">No timers yet</p>
            <p className="text-xs mt-1">Add a timer using the quick add buttons above</p>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {sortedTimers.map((timer) => {
              const stats = getTimerStats(timer);
              const currentElapsed = getCurrentElapsed(timer);
              const isExpanded = expandedTimerId === timer.id;

              return (
                <li
                  key={timer.id}
                  className={`rounded-lg border overflow-hidden ${
                    timer.isRunning
                      ? 'border-green-500/50 bg-green-900/20'
                      : 'border-gray-700 bg-gray-800'
                  }`}
                  role="article"
                  aria-label={`${timer.label} timer${timer.isRunning ? ' (running)' : ''}`}
                >
                  {/* Timer Header */}
                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Running indicator */}
                      <div
                        className={`w-3 h-3 rounded-full ${timer.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}
                        aria-hidden="true"
                      />

                      {/* Label and Description */}
                      <div className="flex-1 min-w-0">
                        {editingTimerId === timer.id ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') setEditingTimerId(null);
                              }}
                              placeholder="Timer label"
                              className="w-full px-2 py-1 rounded bg-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              autoFocus
                              aria-label="Edit timer label"
                            />
                            <input
                              type="text"
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') setEditingTimerId(null);
                              }}
                              placeholder="Description (optional)"
                              className="w-full px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              aria-label="Edit timer description"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(timer)}
                            className="cursor-pointer text-left w-full"
                            aria-label={`Edit ${timer.label}`}
                          >
                            <div className="font-medium text-white truncate hover:text-cyan-400">
                              {timer.label}
                            </div>
                            {timer.description && (
                              <div className="text-xs text-gray-400 truncate">
                                {timer.description}
                              </div>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Time display */}
                      <div className="text-right" aria-live="polite">
                        <div className="font-mono text-2xl tabular-nums">
                          {timer.isRunning
                            ? formatDuration(currentElapsed)
                            : formatDurationShort(stats.averageTime)}
                        </div>
                        {stats.totalLaps > 0 && (
                          <div className="text-xs text-gray-500">{stats.totalLaps} laps</div>
                        )}
                      </div>
                    </div>

                    {/* Stats row */}
                    {stats.totalLaps > 0 && (
                      <div
                        className="flex items-center gap-4 mt-2 text-xs text-gray-400"
                        aria-label="Lap statistics"
                      >
                        <span>Avg: {formatDurationShort(stats.averageTime)}</span>
                        <span>Min: {formatDurationShort(stats.minTime)}</span>
                        <span>Max: {formatDurationShort(stats.maxTime)}</span>
                      </div>
                    )}

                    {/* Controls */}
                    <div
                      className="flex items-center gap-2 mt-3"
                      role="group"
                      aria-label="Timer controls"
                    >
                      {editingTimerId === timer.id ? (
                        // Edit mode buttons
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white transition-colors touch-manipulation"
                            aria-label="Save changes"
                          >
                            ✓ Save
                          </button>
                          <button
                            onClick={() => setEditingTimerId(null)}
                            className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-gray-600 hover:bg-gray-500 active:bg-gray-400 text-white transition-colors touch-manipulation"
                            aria-label="Cancel editing"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        // Normal mode buttons
                        <>
                          <button
                            onClick={() => handleToggleTimer(timer.id, timer.isRunning)}
                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors touch-manipulation ${
                              timer.isRunning
                                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
                                : 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                            }`}
                            aria-label={timer.isRunning ? 'Stop lap' : 'Start lap'}
                            aria-pressed={timer.isRunning}
                          >
                            {timer.isRunning ? (
                              <>
                                <PauseIcon className="h-4 w-4" aria-hidden="true" /> Stop Lap
                              </>
                            ) : (
                              <>
                                <PlayIcon className="h-4 w-4" aria-hidden="true" /> Start Lap
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleResetTimer(timer.id)}
                            disabled={timer.laps.length === 0 && !timer.isRunning}
                            className="p-2.5 rounded-lg bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 active:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation"
                            aria-label="Reset timer"
                          >
                            <RotateCcwIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleDeleteTimer(timer.id)}
                            className="p-2.5 rounded-lg bg-gray-700 text-gray-400 hover:text-red-400 hover:bg-gray-600 active:bg-gray-500 transition-colors touch-manipulation"
                            aria-label={`Delete ${timer.label} timer`}
                          >
                            <TrashIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Laps Section */}
                  {timer.laps.length > 0 && (
                    <div className="border-t border-gray-700">
                      <button
                        onClick={() => setExpandedTimerId(isExpanded ? null : timer.id)}
                        className="w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-400 flex items-center justify-between touch-manipulation"
                        aria-expanded={isExpanded}
                        aria-controls={`laps-${timer.id}`}
                        aria-label={`${isExpanded ? 'Hide' : 'Show'} ${timer.laps.length} laps`}
                      >
                        <span>Show Laps ({timer.laps.length})</span>
                        <span className={isExpanded ? 'rotate-180' : ''} aria-hidden="true">
                          ▼
                        </span>
                      </button>

                      {isExpanded && (
                        <div id={`laps-${timer.id}`} className="px-3 pb-3 max-h-48 overflow-y-auto">
                          <ul className="space-y-1" role="list">
                            {[...timer.laps].reverse().map((lap) => (
                              <li
                                key={lap.id}
                                className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-700/50 text-sm"
                              >
                                <span className="text-gray-400">Lap {lap.number}</span>
                                <span className="font-mono text-white">
                                  {formatDuration(lap.duration)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Footer */}
      {state.timers.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-800">
          <button
            onClick={handleClearAll}
            className="w-full py-2 rounded-lg bg-red-600/20 text-red-400 text-sm hover:bg-red-600/30 active:bg-red-600/40 transition-colors touch-manipulation"
            aria-label="Clear all timers"
          >
            Clear All Timers
          </button>
        </div>
      )}
    </MobilePage>
  );
}
