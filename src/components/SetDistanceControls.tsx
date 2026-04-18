'use client';

import { Button } from '@/components/ui/button';

export interface SetDistanceMark {
  id: number;
  distance: number; // meters from reference
  slk: number | null;
  roadId: string | null;
  roadName: string | null;
  timestamp: string;
}

export interface SetDistanceRefPoint {
  lat: number;
  lon: number;
  slk: number;
  roadId: string | null;
  roadName: string | null;
}

export interface SetDistanceCurrentRoad {
  roadId: string;
  roadName: string;
}

interface SetDistanceControlsProps {
  active: boolean;
  distance: number;
  totalDistance: number;
  marks: SetDistanceMark[];
  currentSlk: number | null;
  currentRoad: SetDistanceCurrentRoad | null;
  refPoint: SetDistanceRefPoint | null;
  onStop: () => void;
  onSetReference: () => void;
  onMark: () => void;
  onReset: () => void;
}

export function SetDistanceControls({
  active,
  distance,
  totalDistance,
  marks,
  currentSlk,
  currentRoad,
  refPoint,
  onStop,
  onSetReference,
  onMark,
  onReset,
}: SetDistanceControlsProps) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900/90">
        <h2 className="text-lg font-bold text-cyan-400">📏 Set Distance</h2>
        <button
          onClick={onStop}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-xl"
          title="Stop"
        >
          ✕
        </button>
      </div>

      {/* Main Display */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        {/* Distance from Reference */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500 mb-2 uppercase tracking-wider">
            Distance from Reference
          </p>
          <p className="text-7xl sm:text-8xl font-mono font-bold text-cyan-400 leading-none">
            {Math.round(distance / 10) * 10}
          </p>
          <p className="text-3xl text-cyan-400 mt-2">meters</p>
        </div>

        {/* Total Distance */}
        <div className="text-center border-t border-gray-800 pt-8">
          <p className="text-sm text-gray-500 mb-2 uppercase tracking-wider">Total Distance</p>
          <p className="text-7xl sm:text-8xl font-mono font-bold text-green-400 leading-none">
            {Math.round((totalDistance + distance) / 10) * 10}
          </p>
          <p className="text-3xl text-green-400 mt-2">meters</p>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-gray-900/90 px-4 py-3">
        <div className="flex justify-between items-center text-sm max-w-md mx-auto">
          <div className="text-center">
            <p className="text-xs text-gray-500">Current SLK</p>
            <p className="font-mono text-yellow-400">
              {currentSlk !== null ? currentSlk.toFixed(3) : '---'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Road</p>
            <p className="text-gray-300 truncate max-w-32">{currentRoad?.roadName || '---'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Ref SLK</p>
            <p className="font-mono text-gray-400">{refPoint?.slk.toFixed(3) || '---'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Marks</p>
            <p className="text-gray-400">{marks.length}</p>
          </div>
        </div>
      </div>

      {/* Marked Points List */}
      {marks.length > 0 && (
        <div className="bg-gray-900/90 px-4 py-2 max-h-32 overflow-y-auto">
          <div className="max-w-md mx-auto">
            <p className="text-xs text-gray-500 mb-2">Marked Points:</p>
            <div className="space-y-1">
              {marks.map((mark, idx) => (
                <div
                  key={mark.id}
                  className="flex justify-between items-center text-xs py-1 border-b border-gray-800 last:border-0"
                >
                  <span className="text-gray-400">#{idx + 1}</span>
                  <span className="font-mono text-cyan-400">
                    {Math.round(mark.distance / 10) * 10}m
                  </span>
                  <span className="font-mono text-yellow-400">
                    SLK {mark.slk?.toFixed(3) || '---'}
                  </span>
                  <span className="text-gray-500">{mark.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-gray-900/90 p-3">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={onSetReference} className="h-10 text-sm bg-blue-600 hover:bg-blue-700">
              🔄 Set Ref
            </Button>
            <Button onClick={onMark} className="h-10 text-sm bg-green-600 hover:bg-green-700">
              📍 Mark
            </Button>
            <Button onClick={onReset} className="h-10 text-sm bg-red-600 hover:bg-red-700">
              🗑️ Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SetDistanceControls;
