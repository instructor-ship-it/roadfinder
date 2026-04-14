'use client';

import type { EventCounters } from '@/lib/traffic-event-logger';

interface CountersProps {
  counters: EventCounters;
}

export function Counters({ counters }: CountersProps) {
  const total = counters.trueLeft + counters.trueRight;

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="font-medium p-2.5 rounded-lg bg-gray-800 border border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">TL:</span>
          <span className="text-cyan-400 font-semibold">{counters.trueLeft}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">TR:</span>
          <span className="text-cyan-400 font-semibold">{counters.trueRight}</span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-700 mt-1.5 pt-1.5">
          <span className="text-gray-300 font-medium">Total:</span>
          <span className="text-green-400 font-bold">{total}</span>
        </div>
      </div>
      <div className="font-medium p-2.5 rounded-lg bg-gray-800 border border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">RLR:</span>
          <span className="text-cyan-400 font-semibold">{counters.rlr}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Trip Out:</span>
          <span className="text-cyan-400 font-semibold">{counters.trip}</span>
        </div>
      </div>
    </div>
  );
}
