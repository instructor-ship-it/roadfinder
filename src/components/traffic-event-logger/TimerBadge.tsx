'use client';

import { useEffect, useState } from 'react';
import {
  formatTimer,
  getHoldElapsedTime,
  getBreakElapsedTime,
  type TrafficEventState,
} from '@/lib/traffic-event-logger';

interface TimerBadgeProps {
  type: 'hold' | 'break';
  state: TrafficEventState;
}

export function TimerBadge({ type, state }: TimerBadgeProps) {
  const [, setTick] = useState(0);

  // Force re-render every second for live timer
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (type === 'hold') {
    if (!state.hold.active) return null;
    const elapsed = getHoldElapsedTime();
    return (
      <div className="px-2.5 py-1 rounded-md font-mono text-sm font-semibold min-w-[70px] text-center bg-red-500/20 text-red-400 border border-red-500/30">
        {formatTimer(elapsed)}
      </div>
    );
  }

  if (type === 'break') {
    if (!state.break.active) return null;
    const elapsed = getBreakElapsedTime();
    return (
      <div className="px-2.5 py-1 rounded-md font-mono text-sm font-semibold min-w-[70px] text-center bg-green-500/20 text-green-400 border border-green-500/30">
        {formatTimer(elapsed)}
      </div>
    );
  }

  return null;
}
