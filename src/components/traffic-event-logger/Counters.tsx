'use client';

import type { EventCounters } from '@/lib/traffic-event-logger';

interface CountersProps {
  counters: EventCounters;
}

export function Counters({ counters }: CountersProps) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="font-semibold p-1.5 rounded-md bg-slate-800/50 dark:bg-slate-800/50">
        <strong>True Left:</strong> <span className="text-cyan-400">{counters.trueLeft}</span>
      </div>
      <div className="font-semibold p-1.5 rounded-md bg-slate-800/50 dark:bg-slate-800/50">
        <strong>True Right:</strong> <span className="text-cyan-400">{counters.trueRight}</span>
      </div>
      <div className="font-semibold p-1.5 rounded-md bg-slate-800/50 dark:bg-slate-800/50">
        <strong>RLR:</strong> <span className="text-cyan-400">{counters.rlr}</span>
      </div>
      <div className="font-semibold p-1.5 rounded-md bg-slate-800/50 dark:bg-slate-800/50">
        <strong>Trip Out:</strong> <span className="text-cyan-400">{counters.trip}</span>
      </div>
    </div>
  );
}
