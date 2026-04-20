/**
 * Work Zone Form Component
 *
 * Extracts the input form section from page.tsx including:
 * - GPS Location lookup
 * - Region selection
 * - Road selection
 * - SLK inputs
 * - Save location functionality
 *
 * @module components/home/WorkZoneForm
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GpsLookupDialog } from '@/components/GpsLookupDialog';
import { usePromptDialog } from '@/components/ui/prompt-dialog';
import type { SavedLocation, Road } from '@/types/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GpsRoadInfo {
  road_id: string;
  road_name: string;
  network_type: string;
  slk: number;
}

interface WorkZoneFormProps {
  // GPS state
  showGpsDialog: boolean;
  onToggleGpsDialog: () => void;
  gpsLat: string;
  onGpsLatChange: (lat: string) => void;
  gpsLon: string;
  onGpsLonChange: (lon: string) => void;
  loadingGps: boolean;
  gpsError: string;
  gpsRoadInfo: GpsRoadInfo | null;

  // GPS actions
  onGetCurrentLocation: () => void;
  onLookupGpsLocation: () => void;

  // Region state
  regions: string[];
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  loadingRegions: boolean;

  // Road state
  roads: Road[];
  selectedRoad: string;
  onSelectRoad: (roadId: string) => void;
  loadingRoads: boolean;
  roadInfo: Road | null;

  // SLK state
  startSlk: string;
  onStartSlkChange: (slk: string) => void;
  endSlk: string;
  onEndSlkChange: (slk: string) => void;

  // Form actions
  loading: boolean;
  onSearch: () => void;

  // Save location
  onSaveLocation: (name: string) => void;

  // Saved locations
  savedLocations: SavedLocation[];
  sortedSavedLocations: SavedLocation[];
  savedLocationsSort: 'date' | 'road';
  onSetSavedLocationsSort: (sort: 'date' | 'road') => void;
  onRecallLocation: (loc: SavedLocation) => void;
  onDeleteSavedLocation: (id: string) => void;

  // Clear actions for region change
  onClearGpsRoadInfo: () => void;
  onClearForm: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkZoneForm({
  // GPS state
  showGpsDialog,
  onToggleGpsDialog,
  gpsLat,
  onGpsLatChange,
  gpsLon,
  onGpsLonChange,
  loadingGps,
  gpsError,
  gpsRoadInfo,

  // GPS actions
  onGetCurrentLocation,
  onLookupGpsLocation,

  // Region state
  regions,
  selectedRegion,
  onSelectRegion,
  loadingRegions,

  // Road state
  roads,
  selectedRoad,
  onSelectRoad,
  loadingRoads,
  roadInfo,

  // SLK state
  startSlk,
  onStartSlkChange,
  endSlk,
  onEndSlkChange,

  // Form actions
  loading,
  onSearch,

  // Save location
  onSaveLocation,

  // Saved locations
  savedLocations,
  sortedSavedLocations,
  savedLocationsSort,
  onSetSavedLocationsSort,
  onRecallLocation,
  onDeleteSavedLocation,

  // Clear actions
  onClearGpsRoadInfo,
  onClearForm,
}: WorkZoneFormProps) {
  const handleRegionChange = (value: string) => {
    onSelectRegion(value);
    // Clear GPS road info if manually changing region
    if (value !== 'Local' || !gpsRoadInfo) {
      onClearGpsRoadInfo();
      onClearForm();
    }
  };

  const promptDialog = usePromptDialog();

  const handleSaveLocationClick = async () => {
    const name = await promptDialog.prompt({
      title: 'Save Location',
      message: 'Enter a name for this location (optional):',
      defaultValue: `${selectedRoad} @ ${startSlk}`,
      placeholder: 'e.g., Site A entrance',
      confirmLabel: 'Save',
    });
    if (name !== null) {
      onSaveLocation(name);
    }
  };

  return (
    <>
      {/* GPS Location Section - Collapsible */}
      <GpsLookupDialog
        isOpen={showGpsDialog}
        onToggle={onToggleGpsDialog}
        lat={gpsLat}
        onLatChange={onGpsLatChange}
        lon={gpsLon}
        onLonChange={onGpsLonChange}
        loading={loadingGps}
        error={gpsError}
        roadInfo={gpsRoadInfo}
        onGetCurrentLocation={onGetCurrentLocation}
        onLookup={onLookupGpsLocation}
      />

      <div className="text-center text-gray-600 text-xs mb-4">— or select manually —</div>

      {/* Region Selection */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-1">Region</label>
        <Select value={selectedRegion} onValueChange={handleRegionChange} disabled={loadingRegions}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-12 text-base">
            <SelectValue placeholder={loadingRegions ? 'Loading regions...' : 'Select region'} />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700 max-h-64">
            {/* Local option at top */}
            <SelectItem value="Local" className="text-amber-400 focus:bg-gray-700 py-3">
              📍 Local Roads
            </SelectItem>
            {regions.map((region) => (
              <SelectItem key={region} value={region} className="text-white focus:bg-gray-700 py-3">
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Road Selection - different behavior for Local */}
      {selectedRegion === 'Local' ? (
        // Local road - allow manual entry
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Road ID</label>
          {gpsRoadInfo ? (
            // GPS found a local road
            <div className="bg-gray-800 border border-green-600 rounded-lg p-3">
              <p className="font-mono text-green-400 text-lg">{gpsRoadInfo.road_id}</p>
              <p className="text-sm text-gray-300">{gpsRoadInfo.road_name}</p>
              <p className="text-xs text-gray-500 mt-1">📍 Found via GPS lookup</p>
            </div>
          ) : (
            // Manual entry for local road
            <div>
              <Input
                type="text"
                placeholder="Enter local road ID"
                value={selectedRoad}
                onChange={(e) => onSelectRoad(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white h-12 text-base font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter local road ID manually or use GPS lookup above
              </p>
            </div>
          )}
        </div>
      ) : (
        // State road - normal dropdown
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Road ID</label>
          <Select value={selectedRoad} onValueChange={onSelectRoad} disabled={loadingRoads}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-12 text-base">
              <SelectValue placeholder={loadingRoads ? 'Loading...' : 'Select road'} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 max-h-64">
              {roads.map((road) => (
                <SelectItem
                  key={road.road_id}
                  value={road.road_id}
                  className="text-white focus:bg-gray-700 py-3"
                >
                  <span className="font-mono text-blue-400">{road.road_id}</span>
                  <span className="ml-2">{road.road_name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {roadInfo && (
            <p className="text-xs text-gray-500 mt-1">
              Valid SLK: {roadInfo.min_slk.toFixed(1)} – {roadInfo.max_slk.toFixed(1)} km
            </p>
          )}
        </div>
      )}

      {/* SLK Inputs */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Start SLK (km)</label>
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="e.g. 100.0"
            value={startSlk}
            onChange={(e) => onStartSlkChange(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white h-12 text-base"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">End SLK (km)</label>
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="e.g. 100.5"
            value={endSlk}
            onChange={(e) => onEndSlkChange(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white h-12 text-base"
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">Leave End SLK blank for single point lookup</p>

      <Button
        onClick={onSearch}
        disabled={loading || !selectedRoad}
        className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
      >
        {loading ? 'Searching...' : 'Get Work Zone Info'}
      </Button>

      {/* Save Location Button */}
      {selectedRoad && startSlk && (
        <Button
          onClick={handleSaveLocationClick}
          className="w-full h-10 text-sm bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-2"
        >
          💾 Save Location
        </Button>
      )}

      {/* Saved Locations */}
      {savedLocations.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3 mt-4 overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h4 className="text-sm font-semibold text-purple-400">
              📌 Saved Locations ({savedLocations.length})
            </h4>
            <div className="flex gap-1 items-center">
              <Link
                href="/saved-locations/map"
                className="px-2 py-0.5 text-xs rounded bg-gray-700 text-cyan-400 hover:bg-gray-600 transition-colors"
                title="View all on map"
              >
                🗺️ Map
              </Link>
              <button
                onClick={() => onSetSavedLocationsSort('date')}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  savedLocationsSort === 'date'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
                title="Sort by date"
              >
                📅 Date
              </button>
              <button
                onClick={() => onSetSavedLocationsSort('road')}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  savedLocationsSort === 'road'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
                title="Sort by road ID then SLK"
              >
                🛣️ Road
              </button>
            </div>
          </div>
          <div
            className="space-y-2 max-h-48 overflow-y-auto overscroll-contain pr-1"
            style={{ scrollbarWidth: 'thin' }}
          >
            {sortedSavedLocations.map((loc) => {
              const savedDate = loc.created_at ? new Date(loc.created_at) : null;
              const dateStr = savedDate
                ? savedDate.toLocaleDateString('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })
                : '';
              const timeStr = savedDate
                ? savedDate.toLocaleTimeString('en-AU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={loc.id}
                  className="flex items-center gap-2 bg-gray-700 rounded p-2 hover:bg-gray-600/50 transition-colors shrink-0"
                >
                  <button
                    onClick={() => onRecallLocation(loc)}
                    className="flex-1 text-left px-2 py-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-green-400 text-sm font-semibold">
                        {loc.road_id}
                      </span>
                      <span className="text-xs text-gray-500">
                        SLK {loc.start_slk}
                        {loc.end_slk ? ` - ${loc.end_slk}` : ''}
                      </span>
                    </div>
                    {loc.road_name && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">{loc.road_name}</div>
                    )}
                    <div className="text-xs text-gray-300 truncate">{loc.name}</div>
                    {savedDate && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        📅 {dateStr} at {timeStr}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => onDeleteSavedLocation(loc.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded text-lg shrink-0"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export default WorkZoneForm;
