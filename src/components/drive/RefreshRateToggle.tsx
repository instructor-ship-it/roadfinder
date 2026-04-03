'use client';

import { Button } from '@/components/ui/button';

interface RefreshRateToggleProps {
  currentMode: 'default' | 'precision';
  onToggle: () => void;
  autoRevertSeconds?: number; // Countdown when in precision mode
}

/**
 * Toggle button for GPS refresh rate modes.
 * - Default: Adaptive throttle (750-2000ms) - saves battery
 * - Precision: Fast refresh (200ms) - for exact SLK positioning
 *
 * Auto-reverts to default after a timeout to prevent battery drain.
 */
export default function RefreshRateToggle({
  currentMode,
  onToggle,
  autoRevertSeconds,
}: RefreshRateToggleProps) {
  const isPrecision = currentMode === 'precision';

  return (
    <Button
      onClick={onToggle}
      size="sm"
      className={`
        min-w-[80px] transition-all duration-200
        ${
          isPrecision
            ? 'bg-green-600 hover:bg-green-500 animate-pulse'
            : 'bg-gray-700 hover:bg-gray-600'
        }
      `}
      title={
        isPrecision
          ? 'Precision mode active - tap to return to default'
          : 'Tap for fast refresh (precise positioning)'
      }
    >
      {isPrecision ? (
        <span className="flex items-center gap-1">
          <span className="text-xs">🚀</span>
          <span>TURBO</span>
          {autoRevertSeconds !== undefined && autoRevertSeconds > 0 && (
            <span className="text-xs opacity-70 ml-1">
              {Math.floor(autoRevertSeconds / 60)}:
              {(autoRevertSeconds % 60).toString().padStart(2, '0')}
            </span>
          )}
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <span className="text-xs">⚡</span>
          <span>Turbo</span>
        </span>
      )}
    </Button>
  );
}
