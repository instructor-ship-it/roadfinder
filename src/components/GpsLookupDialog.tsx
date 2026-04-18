'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface GpsRoadInfo {
  road_id: string;
  road_name: string;
  network_type: string;
  slk: number;
}

interface GpsLookupDialogProps {
  isOpen: boolean;
  onToggle: () => void;
  lat: string;
  onLatChange: (value: string) => void;
  lon: string;
  onLonChange: (value: string) => void;
  loading: boolean;
  error: string;
  roadInfo: GpsRoadInfo | null;
  onGetCurrentLocation: () => void;
  onLookup: () => void;
}

export function GpsLookupDialog({
  isOpen,
  onToggle,
  lat,
  onLatChange,
  lon,
  onLonChange,
  loading,
  error,
  roadInfo,
  onGetCurrentLocation,
  onLookup,
}: GpsLookupDialogProps) {
  return (
    <div className="bg-gray-800 rounded-lg mb-4">
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between text-left">
        <h3 className="text-sm font-semibold text-green-400">📍 Find by GPS Location</h3>
        <span className="text-gray-400 text-lg">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          {/* Get My Location Button */}
          <Button
            onClick={onGetCurrentLocation}
            disabled={loading}
            className="w-full h-12 mb-3 text-base bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Getting Location...' : '📍 Get My Location'}
          </Button>

          {/* Manual GPS Input */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Latitude</label>
              <div className="flex gap-1">
                <Button
                  onClick={() => onLatChange(lat.startsWith('-') ? lat.slice(1) : '-' + lat)}
                  className="h-10 w-10 text-lg bg-gray-600 hover:bg-gray-500 shrink-0 px-0"
                  title="Toggle negative"
                >
                  −
                </Button>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="-31.638157"
                  value={lat}
                  onChange={(e) => onLatChange(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white h-10 text-sm flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Longitude</label>
              <Input
                type="number"
                step="0.000001"
                placeholder="117.005277"
                value={lon}
                onChange={(e) => onLonChange(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white h-10 text-sm"
              />
            </div>
          </div>

          <Button
            onClick={onLookup}
            disabled={loading || !lat || !lon}
            className="w-full h-10 text-sm bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Looking up...' : '🔍 Lookup Location'}
          </Button>

          {/* GPS Error/Success */}
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

          {/* GPS Road Info Display */}
          {roadInfo && (
            <div className="mt-3 bg-gray-900 rounded-lg p-3 border border-green-600">
              <p className="font-mono text-green-400 text-lg">{roadInfo.road_id}</p>
              <p className="text-sm text-gray-300">{roadInfo.road_name}</p>
              <p className="text-xs text-gray-500 mt-1">📍 Found via GPS lookup</p>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Works for all roads (State H/M and Local roads)
          </p>
        </div>
      )}
    </div>
  );
}

export default GpsLookupDialog;
