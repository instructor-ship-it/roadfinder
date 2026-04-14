'use client';

import type { EventCounters } from '@/lib/traffic-event-logger';

interface CountersProps {
  counters: EventCounters;
}

export function Counters({ counters }: CountersProps) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="font-medium p-3 rounded-lg bg-muted/50 border">
        <span className="text-muted-foreground">True Left:</span>{' '}
        <span className="text-blue-600 dark:text-blue-400 font-semibold">{counters.trueLeft}</span>
      </div>
      <div className="font-medium p-3 rounded-lg bg-muted/50 border">
        <span className="text-muted-foreground">True Right:</span>{' '}
        <span className="text-blue-600 dark:text-blue-400 font-semibold">{counters.trueRight}</span>
      </div>
      <div className="font-medium p-3 rounded-lg bg-muted/50 border">
        <span className="text-muted-foreground">RLR:</span>{' '}
        <span className="text-blue-600 dark:text-blue-400 font-semibold">{counters.rlr}</span>
      </div>
      <div className="font-medium p-3 rounded-lg bg-muted/50 border">
        <span className="text-muted-foreground">Trip Out:</span>{' '}
        <span className="text-blue-600 dark:text-blue-400 font-semibold">{counters.trip}</span>
      </div>
    </div>
  );
}
