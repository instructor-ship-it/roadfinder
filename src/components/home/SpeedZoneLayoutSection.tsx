'use client';

import { useState } from 'react';
import SpeedZoneLayout from '@/components/SpeedZoneLayout';
import type { SignageItem, ParsedSpeedZone } from '@/lib/offline-db';

interface SpeedZoneLayoutSectionProps {
  workZoneStart: number;
  workZoneEnd: number;
  signageCorridor: SignageItem[];
  speedZones: ParsedSpeedZone[];
  intersections: Array<{ name: string; slk: number; roadType: string }>;
  corridorMargin: number;
  defaultExpanded?: boolean;
}

export function SpeedZoneLayoutSection({
  workZoneStart,
  workZoneEnd,
  signageCorridor,
  speedZones,
  intersections,
  corridorMargin,
  defaultExpanded = true,
}: SpeedZoneLayoutSectionProps) {
  const [showSpeedZoneLayout, setShowSpeedZoneLayout] = useState(defaultExpanded);

  return (
    <div className="bg-gray-800 rounded-lg">
      <button
        onClick={() => setShowSpeedZoneLayout(!showSpeedZoneLayout)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold text-blue-400">📊 Speed Zone Layout (±850m)</h3>
        <span className="text-gray-400 text-lg">{showSpeedZoneLayout ? '−' : '+'}</span>
      </button>
      {showSpeedZoneLayout && (
        <div className="px-4 pb-4">
          <SpeedZoneLayout
            workZoneStart={workZoneStart}
            workZoneEnd={workZoneEnd}
            signageCorridor={signageCorridor}
            speedZones={speedZones}
            intersections={intersections}
            corridorMargin={corridorMargin}
          />
        </div>
      )}
    </div>
  );
}
