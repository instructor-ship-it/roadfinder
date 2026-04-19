'use client';

import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CrossRoad {
  name: string;
  distance: string;
  lat: number;
  lon: number;
  roadType: string;
  googleMapsUrl: string;
  intersectionSlk?: number;
}

interface IntersectionsSectionProps {
  crossRoads: CrossRoad[];
  roadName: string;
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

export function IntersectionsSection({
  crossRoads,
  roadName,
  defaultExpanded = true,
}: IntersectionsSectionProps) {
  const [showIntersections, setShowIntersections] = useState(defaultExpanded);

  // Filter out the main road from intersections
  const filteredRoads = crossRoads.filter(
    (road) => road.name.toLowerCase() !== roadName.toLowerCase()
  );

  if (filteredRoads.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg">
      <button
        onClick={() => setShowIntersections(!showIntersections)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold text-blue-400">🔀 Intersecting Roads in TC Zone</h3>
        <span className="text-gray-400 text-lg">{showIntersections ? '−' : '+'}</span>
      </button>
      {showIntersections && (
        <div className="px-4 pb-4">
          <div className="space-y-2 text-sm">
            {filteredRoads.map((road, i) => {
              const color = INTERSECTION_COLORS[i % INTERSECTION_COLORS.length];
              return (
                <div
                  key={i}
                  className="flex justify-between items-center py-1 border-b border-gray-700/50"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {/* Colored vertical line indicator */}
                    <span
                      className="w-0.5 h-8 border-l-2 rounded-sm"
                      style={{ borderLeftColor: color }}
                    ></span>
                    <div>
                      <span className="font-medium">{road.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({road.roadType})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400">{road.distance} km</span>
                    <span className="text-xs text-gray-500 block">from TC start</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-amber-400 mt-3">
            ⚠️ Consider TC coverage for these intersecting roads
          </p>
        </div>
      )}
    </div>
  );
}

export default IntersectionsSection;
