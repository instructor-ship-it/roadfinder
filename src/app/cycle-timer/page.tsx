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

export default function CycleTimerPage() {
  const [state, setState] = useState<CycleTimerState>(getState);
  const [newTimerLabel, setNewTimerLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
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
    createTimer(newTimerLabel.trim());
    setNewTimerLabel('');
    setShowAddForm(false);
    refreshState();
  }, [newTimerLabel, refreshState]);

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
    (timerId: string) => {
      if (confirm('Delete this timer?')) {
        deleteTimer(timerId);
        refreshState();
      }
    },
    [refreshState]
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
  const handleClearAll = useCallback(() => {
    if (confirm('Clear all timers?')) {
      clearAllTimers();
      refreshState();
    }
  }, [refreshState]);

  // Handle label edit
  const handleStartEdit = useCallback((timer: CycleTimer) => {
    setEditingTimerId(timer.id);
    setEditingLabel(timer.label);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingTimerId && editingLabel.trim()) {
      updateTimerLabel(editingTimerId, editingLabel.trim());
      refreshState();
    }
    setEditingTimerId(null);
    setEditingLabel('');
  }, [editingTimerId, editingLabel, refreshState]);

  // Sort timers: running first, then by creation time
  const sortedTimers = [...state.timers].sort((a, b) => {
    if (a.isRunning && !b.isRunning) return -1;
    if (!a.isRunning && b.isRunning) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold flex-1">Cycle Timer</h1>
          <span className="text-xs text-gray-500">v1.28.5</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Monitor truck travel times and vehicle cycles</p>
      </div>

      {/* Quick Add Buttons */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500">Quick Add:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.presetLabels.slice(0, 5).map((label) => (
            <button
              key={label}
              onClick={() => handleQuickAdd(label)}
              className="px-3 py-1.5 rounded-full bg-gray-700 text-gray-300 text-xs hover:bg-gray-600 transition-colors"
            >
              + {label}
            </button>
          ))}
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 rounded-full bg-cyan-600 text-white text-xs hover:bg-cyan-700 transition-colors"
          >
            + Custom
          </button>
        </div>
      </div>

      {/* Add Timer Form */}
      {showAddForm && (
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTimerLabel}
              onChange={(e) => setNewTimerLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTimer()}
              placeholder="Timer label (e.g., Truck 6)"
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
              }}
              className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timer List */}
      <div className="px-4 py-3">
        {sortedTimers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">⏱️</div>
            <p className="text-sm">No timers yet</p>
            <p className="text-xs mt-1">Add a timer using the quick add buttons above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTimers.map((timer) => {
              const stats = getTimerStats(timer);
              const currentElapsed = getCurrentElapsed(timer);
              const isExpanded = expandedTimerId === timer.id;

              return (
                <div
                  key={timer.id}
                  className={`rounded-lg border overflow-hidden ${
                    timer.isRunning
                      ? 'border-green-500/50 bg-green-900/20'
                      : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  {/* Timer Header */}
                  <div className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Running indicator */}
                      <div
                        className={`w-3 h-3 rounded-full ${timer.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}
                      />

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        {editingTimerId === timer.id ? (
                          <input
                            type="text"
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditingTimerId(null);
                            }}
                            onBlur={handleSaveEdit}
                            className="w-full px-2 py-1 rounded bg-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            autoFocus
                          />
                        ) : (
                          <div
                            className="font-medium text-white truncate cursor-pointer hover:text-cyan-400"
                            onClick={() => handleStartEdit(timer)}
                          >
                            {timer.label}
                          </div>
                        )}
                      </div>

                      {/* Time display */}
                      <div className="text-right">
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
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>Avg: {formatDurationShort(stats.averageTime)}</span>
                        <span>Min: {formatDurationShort(stats.minTime)}</span>
                        <span>Max: {formatDurationShort(stats.maxTime)}</span>
                      </div>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleToggleTimer(timer.id, timer.isRunning)}
                        className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                          timer.isRunning
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {timer.isRunning ? (
                          <>
                            <PauseIcon className="h-4 w-4" /> Stop Lap
                          </>
                        ) : (
                          <>
                            <PlayIcon className="h-4 w-4" /> Start Lap
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleResetTimer(timer.id)}
                        disabled={timer.laps.length === 0 && !timer.isRunning}
                        className="p-2.5 rounded-lg bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Reset"
                      >
                        <RotateCcwIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTimer(timer.id)}
                        className="p-2.5 rounded-lg bg-gray-700 text-gray-400 hover:text-red-400 hover:bg-gray-600 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Laps Section */}
                  {timer.laps.length > 0 && (
                    <div className="border-t border-gray-700">
                      <button
                        onClick={() => setExpandedTimerId(isExpanded ? null : timer.id)}
                        className="w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-400 flex items-center justify-between"
                      >
                        <span>Show Laps ({timer.laps.length})</span>
                        <span className={isExpanded ? 'rotate-180' : ''}>▼</span>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 max-h-48 overflow-y-auto">
                          <div className="space-y-1">
                            {[...timer.laps].reverse().map((lap) => (
                              <div
                                key={lap.id}
                                className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-700/50 text-sm"
                              >
                                <span className="text-gray-400">Lap {lap.number}</span>
                                <span className="font-mono text-white">
                                  {formatDuration(lap.duration)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {state.timers.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-800">
          <button
            onClick={handleClearAll}
            className="w-full py-2 rounded-lg bg-red-600/20 text-red-400 text-sm hover:bg-red-600/30 transition-colors"
          >
            Clear All Timers
          </button>
        </div>
      )}
    </div>
  );
}
