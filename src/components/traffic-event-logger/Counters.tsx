'use client';

import type { EventCounters } from '@/lib/traffic-event-logger';

interface CountersProps {
  counters: EventCounters;
}

export function Counters({ counters }: CountersProps) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="font-medium p-2.5 rounded-lg bg-gray-800 border border-gray-700">
        <span className="text-gray-400">True Left:</span>{' '}
        <span className="text-cyan-400 font-semibold">{counters.trueLeft}</span>
      </div>
      <div className="font-medium p-2.5 rounded-lg bg-gray-800 border border-gray-700">
        <span className="text-gray-400">True Right:</span>{' '}
        <span className="text-cyan-400 font-semibold">{counters.trueRight}</span>
      </div>
      <div className="font-medium p-2.5 rounded-lg bg-gray-800 border border-gray-700">
        <span className="text-gray-400">RLR:</span>{' '}
        <span className="text-cyan-400 font-semibold">{counters.rlr}</span>
      </div>
      <div className="font-medium p-2.5 rounded-lg bg-gray-800 border border-gray-700">
        <span className="text-gray-400">Trip Out:</span>{' '}
        <span className="text-cyan-400 font-semibold">{counters.trip}</span>
      </div>
    </div>
  );
}
