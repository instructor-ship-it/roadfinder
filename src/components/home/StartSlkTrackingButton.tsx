'use client';

import { Button } from '@/components/ui/button';

interface StartSlkTrackingButtonProps {
  onStartTracking: () => void;
  visible: boolean;
}

export function StartSlkTrackingButton({ onStartTracking, visible }: StartSlkTrackingButtonProps) {
  if (!visible) return null;

  return (
    <div className="mb-4">
      <Button
        onClick={onStartTracking}
        className="w-full h-12 text-lg bg-blue-800 hover:bg-blue-900"
      >
        📍 Start SLK Tracking
      </Button>
      <p className="text-xs text-gray-500 text-center mt-1">
        Auto-start GPS tracking for real-time SLK updates
      </p>
    </div>
  );
}
