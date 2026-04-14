'use client';

import { useEffect, useState } from 'react';
import type { EventCounters } from '@/lib/traffic-event-logger';

interface CountersProps {
  counters: EventCounters;
  lastSentTime: string | null;
  lastShuttleTime: string | null;
  shuttle: boolean;
}

function formatTimeDiff(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function Counters({ counters, lastSentTime, lastShuttleTime, shuttle }: CountersProps) {
  const total = counters.trueLeft + counters.trueRight;
  const [sentElapsed, setSentElapsed] = useState<string | null>(null);
  const [shuttleElapsed, setShuttleElapsed] = useState<string | null>(null);

  // Update elapsed time every second
  useEffect(() => {
    const updateElapsed = () => {
      if (lastSentTime) {
        const elapsed = Date.now() - new Date(lastSentTime).getTime();
        setSentElapsed(formatTimeDiff(elapsed));
      } else {
        setSentElapsed(null);
      }

      if (lastShuttleTime) {
        const elapsed = Date.now() - new Date(lastShuttleTime).getTime();
        setShuttleElapsed(formatTimeDiff(elapsed));
      } else {
        setShuttleElapsed(null);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [lastSentTime, lastShuttleTime]);

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
        <div className="border-t border-gray-700 mt-1.5 pt-1.5 space-y-1">
          {sentElapsed && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Sent:</span>
              <span className="text-yellow-400 font-semibold text-xs">{sentElapsed}</span>
            </div>
          )}
          {shuttle && shuttleElapsed && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs">Shuttle:</span>
              <span className="text-orange-400 font-semibold text-xs">{shuttleElapsed}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
