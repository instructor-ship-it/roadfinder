'use client';

import { useState } from 'react';
import type { SignageItem } from '@/lib/offline-db';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkZone {
  start_slk: number;
  end_slk: number;
}

interface SignageCorridorSectionProps {
  workZone: WorkZone;
  signageCorridor: SignageItem[];
  signageLoading: boolean;
  defaultExpanded?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INTERSECTION_COLORS = [
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
  '#84cc16',
  '#ef4444',
  '#8b5cf6',
];

// ─── Component ───────────────────────────────────────────────────────────────

export function SignageCorridorSection({
  workZone,
  signageCorridor,
  signageLoading,
  defaultExpanded = true,
}: SignageCorridorSectionProps) {
  const [showSignageCorridor, setShowSignageCorridor] = useState(defaultExpanded);

  const corridorStart = Math.max(0, workZone.start_slk - 0.7);
  const corridorEnd = (workZone.end_slk || workZone.start_slk) + 0.7;
  const workZoneStart = workZone.start_slk;
  const workZoneEnd = workZone.end_slk || workZone.start_slk;

  // Filter signage by category
  const intersectionsNearWorkZone = signageCorridor.filter((s) => {
    if (s.category !== 'intersection') return false;
    return s.slk >= workZoneStart - 0.1 && s.slk <= workZoneEnd + 0.1;
  });

  const railwayCrossings = signageCorridor.filter((s) => s.category === 'railway');
  const speedSigns = signageCorridor.filter((s) => s.category === 'speed');
  const warningSigns = signageCorridor.filter((s) => s.category === 'warning');

  return (
    <div className="bg-gray-800 rounded-lg">
      <button
        onClick={() => setShowSignageCorridor(!showSignageCorridor)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold text-blue-400">📋 Signage in Corridor</h3>
        <span className="text-gray-400 text-lg">{showSignageCorridor ? '−' : '+'}</span>
      </button>
      {showSignageCorridor && (
        <div className="px-4 pb-4">
          {/* Corridor Info */}
          <div className="mb-3 text-xs text-gray-500">
            Corridor: SLK {corridorStart.toFixed(2)} - {corridorEnd.toFixed(2)} km (±700m from work
            zone)
          </div>

          {signageLoading ? (
            <p className="text-sm text-gray-400">Loading signage data...</p>
          ) : signageCorridor.length === 0 ? (
            <p className="text-sm text-gray-400">
              No signage data available for this corridor. Download offline data to see speed zones,
              rail crossings, and signs.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Intersections - Only within ±100m of work zone */}
              {intersectionsNearWorkZone.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-purple-400 mb-2">
                    🔀 INTERSECTIONS NEAR WORK ZONE (±100m)
                  </h4>
                  <div className="space-y-1">
                    {intersectionsNearWorkZone.map((sign, i) => (
                      <div
                        key={`int-${i}`}
                        className="flex justify-between items-center text-sm bg-purple-900/20 px-2 py-1 rounded"
                      >
                        <span className="font-mono text-yellow-400">SLK {sign.slk.toFixed(2)}</span>
                        <span className="text-gray-300">{sign.description}</span>
                        <span className="text-xs text-purple-400">{sign.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Railway Crossings */}
              {railwayCrossings.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-400 mb-2">🚂 RAILWAY CROSSINGS</h4>
                  <div className="space-y-1">
                    {railwayCrossings.map((sign, i) => (
                      <div
                        key={`rail-${i}`}
                        className="flex justify-between items-center text-sm bg-red-900/20 px-2 py-1 rounded"
                      >
                        <span className="font-mono text-yellow-400">SLK {sign.slk.toFixed(2)}</span>
                        <span className="text-gray-300">{sign.description}</span>
                        <span className="text-xs text-amber-400">{sign.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Speed Signs */}
              {speedSigns.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-green-400 mb-2">
                    ⚡ SPEED RESTRICTION SIGNS
                  </h4>
                  <div className="space-y-1">
                    {speedSigns.map((sign, i) => (
                      <div
                        key={`speed-${i}`}
                        className="flex justify-between items-center text-sm bg-gray-700/50 px-2 py-1 rounded"
                      >
                        <span className="font-mono text-yellow-400">SLK {sign.slk.toFixed(2)}</span>
                        <span className="text-gray-300">{sign.description}</span>
                        <span className="text-xs text-gray-400">{sign.carriageway}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning Signs */}
              {warningSigns.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-yellow-400 mb-2">⚠️ WARNING SIGNS</h4>
                  <div className="space-y-1">
                    {warningSigns.map((sign, i) => (
                      <div
                        key={`warn-${i}`}
                        className="flex justify-between items-center text-sm bg-yellow-900/20 px-2 py-1 rounded"
                      >
                        <span className="font-mono text-yellow-400">SLK {sign.slk.toFixed(2)}</span>
                        <span
                          className="text-gray-300 flex-1 mx-2 truncate"
                          title={sign.description}
                        >
                          {sign.description}
                        </span>
                        <span className="text-xs text-gray-500">{sign.carriageway}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Total items in corridor:</span>
                  <span className="text-white font-semibold">{signageCorridor.length}</span>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            Check site for all signage. Speed zones from MRWA data.
          </p>
        </div>
      )}
    </div>
  );
}

export default SignageCorridorSection;
