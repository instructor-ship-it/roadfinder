'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { clearSpeedOverridesCache, type SpeedSignOverride } from '@/lib/offline-db';

// Storage key for localStorage
const STORAGE_KEY = 'speed-sign-overrides';

// Speed limit colors
const SPEED_COLORS: Record<number, string> = {
  40: '#ef4444',   // red
  50: '#f97316',   // orange
  60: '#eab308',   // yellow
  70: '#84cc16',   // lime
  80: '#22c55e',   // green
  90: '#14b8a6',   // teal
  100: '#0ea5e9',  // cyan
  110: '#3b82f6',  // blue
  130: '#8b5cf6',  // purple
};

function getSpeedColor(speed: number): string {
  return SPEED_COLORS[speed] || '#6b7280';
}

interface SpeedZone {
  startSlk: number;
  endSlk: number;
  speed: number;
  boundarySign: SpeedSignOverride | null;
  endSign: SpeedSignOverride | null;
  repeaters: SpeedSignOverride[];
  lengthKm: number;
}

interface RoadLayout {
  roadId: string;
  roadName: string;
  minSlk: number;
  maxSlk: number;
  zones: SpeedZone[];
  unassignedSigns: SpeedSignOverride[];
}

export default function SpeedZoneLayoutPage() {
  const [loading, setLoading] = useState(true);
  const [signs, setSigns] = useState<SpeedSignOverride[]>([]);
  const [selectedRoad, setSelectedRoad] = useState<string>('');
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('diagram');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const loadedSigns: SpeedSignOverride[] = data.signs || [];
        setSigns(loadedSigns);
        
        // Auto-select first road
        if (loadedSigns.length > 0 && !selectedRoad) {
          setSelectedRoad(loadedSigns[0].road_id);
        }
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Get unique roads
  const roadOptions = useMemo(() => {
    const roadSet = new Map<string, { id: string; name: string }>();
    signs.forEach(s => {
      if (!roadSet.has(s.road_id)) {
        roadSet.set(s.road_id, { id: s.road_id, name: s.road_name || s.road_id });
      }
    });
    return Array.from(roadSet.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [signs]);

  // Filter signs by road
  const filteredSigns = useMemo(() => {
    if (!selectedRoad) return [];
    return signs.filter(s => s.road_id.trim().toUpperCase() === selectedRoad.trim().toUpperCase());
  }, [signs, selectedRoad]);

  // Build speed zone layout
  const roadLayout = useMemo((): RoadLayout | null => {
    if (filteredSigns.length === 0) return null;

    const roadName = filteredSigns[0]?.road_name || selectedRoad;
    
    // Separate boundary signs (replicated) from repeaters (non-replicated)
    const boundarySigns = filteredSigns
      .filter(s => s.replicated && s.end_slk)
      .sort((a, b) => a.start_slk - b.start_slk);
    
    const repeaters = filteredSigns
      .filter(s => !s.replicated || !s.end_slk)
      .sort((a, b) => a.slk - b.slk);

    // Build zones from boundary signs
    const zones: SpeedZone[] = [];
    
    for (const boundary of boundarySigns) {
      const zoneRepeaters = repeaters.filter(r => 
        r.slk >= boundary.start_slk && r.slk <= boundary.end_slk!
      );
      
      // Find end sign (next boundary or sign at end_slk)
      const endSign = boundarySigns.find(b => 
        Math.abs(b.start_slk - boundary.end_slk!) < 0.1
      );
      
      zones.push({
        startSlk: boundary.start_slk,
        endSlk: boundary.end_slk!,
        speed: boundary.front_speed,
        boundarySign: boundary,
        endSign: endSign || null,
        repeaters: zoneRepeaters,
        lengthKm: boundary.end_slk! - boundary.start_slk
      });
    }

    // Find unassigned signs (repeaters not in any zone)
    const unassignedSigns: SpeedSignOverride[] = [];
    for (const repeater of repeaters) {
      const inZone = zones.some(z => 
        repeater.slk >= z.startSlk && repeater.slk <= z.endSlk
      );
      if (!inZone) {
        unassignedSigns.push(repeater);
      }
    }

    // Calculate min/max SLK
    const allSlks = filteredSigns.map(s => s.slk);
    boundarySigns.forEach(b => {
      if (b.end_slk) allSlks.push(b.end_slk);
    });

    return {
      roadId: selectedRoad,
      roadName,
      minSlk: Math.min(...allSlks),
      maxSlk: Math.max(...allSlks),
      zones,
      unassignedSigns
    };
  }, [filteredSigns, selectedRoad]);

  // Calculate diagram scale
  const diagramScale = useMemo(() => {
    if (!roadLayout) return { scale: 1, offset: 0, totalWidth: 100 };
    const totalRange = roadLayout.maxSlk - roadLayout.minSlk;
    const padding = totalRange * 0.1; // 10% padding
    const effectiveMin = roadLayout.minSlk - padding;
    const effectiveMax = roadLayout.maxSlk + padding;
    const effectiveRange = effectiveMax - effectiveMin;
    return {
      scale: 100 / effectiveRange, // pixels per SLK km
      offset: effectiveMin,
      totalWidth: 100
    };
  }, [roadLayout]);

  const slkToPercent = (slk: number): number => {
    return ((slk - diagramScale.offset) * diagramScale.scale);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading layout data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/overrides">
              <Button className="bg-gray-700 hover:bg-gray-600 text-white">
                ← Back
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Speed Zone Layout</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/overrides/map">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
                🗺️ Map View
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Road:</label>
            <select
              value={selectedRoad}
              onChange={(e) => setSelectedRoad(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white min-w-[200px]"
            >
              <option value="">Select Road</option>
              {roadOptions.map(road => (
                <option key={road.id} value={road.id}>{road.id} - {road.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setViewMode('diagram')}
              className={viewMode === 'diagram' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}
            >
              📊 Diagram
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}
            >
              📋 List
            </Button>
          </div>

          {roadLayout && (
            <div className="flex items-center gap-4 text-sm ml-auto">
              <span className="text-gray-400">Zones: {roadLayout.zones.length}</span>
              <span className="text-gray-400">Signs: {filteredSigns.length}</span>
              <span className="text-gray-400">Range: {roadLayout.minSlk.toFixed(2)} - {roadLayout.maxSlk.toFixed(2)} km</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-800/50 border-b border-gray-700 p-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          <span className="text-xs text-gray-400">Speed Legend:</span>
          {[60, 80, 90, 100, 110].map(speed => (
            <div key={speed} className="flex items-center gap-1">
              <div 
                className="w-6 h-4 rounded"
                style={{ backgroundColor: getSpeedColor(speed) }}
              />
              <span className="text-xs">{speed}</span>
            </div>
          ))}
          <div className="border-l border-gray-600 pl-4 ml-2 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full border-2 border-white bg-gray-700"></div>
              <span className="text-xs text-gray-400">Boundary</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full border border-gray-400 bg-gray-600"></div>
              <span className="text-xs text-gray-400">Repeater</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {!roadLayout ? (
          <div className="text-center py-12 text-gray-400">
            {selectedRoad ? 'No signs found for this road' : 'Select a road to view speed zone layout'}
          </div>
        ) : viewMode === 'diagram' ? (
          /* Diagram View */
          <div className="space-y-6">
            {/* Road Header */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-400">{roadLayout.roadName}</h2>
              <p className="text-sm text-gray-400">{roadLayout.roadId} • {roadLayout.zones.length} speed zones</p>
            </div>

            {/* SLK Scale */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">SLK Scale (km)</h3>
              <div className="relative h-8 bg-gray-700 rounded">
                {/* Scale markers */}
                {Array.from({ length: Math.ceil(roadLayout.maxSlk) - Math.floor(roadLayout.minSlk) + 1 }).map((_, i) => {
                  const slk = Math.floor(roadLayout.minSlk) + i;
                  const percent = slkToPercent(slk);
                  if (percent < 0 || percent > 100) return null;
                  return (
                    <div
                      key={slk}
                      className="absolute top-0 h-full flex flex-col items-center"
                      style={{ left: `${percent}%` }}
                    >
                      <div className="h-full w-px bg-gray-500"></div>
                      <span className="text-xs text-gray-400 mt-1">{slk}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Speed Zones */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Speed Zones</h3>
              <div className="relative h-16 bg-gray-700 rounded overflow-hidden">
                {roadLayout.zones.map((zone, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 h-full flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      left: `${slkToPercent(zone.startSlk)}%`,
                      width: `${slkToPercent(zone.endSlk) - slkToPercent(zone.startSlk)}%`,
                      backgroundColor: getSpeedColor(zone.speed)
                    }}
                    title={`${zone.speed} km/h: SLK ${zone.startSlk.toFixed(2)} - ${zone.endSlk.toFixed(2)}`}
                  >
                    <span className="font-bold text-white text-lg drop-shadow-lg">{zone.speed}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Signs Row */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Sign Positions</h3>
              <div className="relative h-24 bg-gray-700 rounded overflow-hidden">
                {/* Zone background indicators */}
                {roadLayout.zones.map((zone, idx) => (
                  <div
                    key={`bg-${idx}`}
                    className="absolute top-0 h-full opacity-20"
                    style={{
                      left: `${slkToPercent(zone.startSlk)}%`,
                      width: `${slkToPercent(zone.endSlk) - slkToPercent(zone.startSlk)}%`,
                      backgroundColor: getSpeedColor(zone.speed)
                    }}
                  />
                ))}

                {/* Boundary Signs */}
                {roadLayout.zones.map((zone) => (
                  <div
                    key={`boundary-${zone.startSlk}`}
                    className="absolute top-2 flex flex-col items-center cursor-pointer group"
                    style={{ left: `${Math.min(Math.max(slkToPercent(zone.startSlk), 2), 98)}%`, transform: 'translateX(-50%)' }}
                  >
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: getSpeedColor(zone.speed) }}
                    >
                      ◆
                    </div>
                    <span className="text-xs text-white mt-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {zone.boundarySign?.id}
                    </span>
                    <span className="text-xs text-gray-300">{zone.startSlk.toFixed(2)}</span>
                  </div>
                ))}

                {/* Repeater Signs */}
                {roadLayout.zones.flatMap((zone) => 
                  zone.repeaters.map((repeater) => (
                    <div
                      key={`repeater-${repeater.id}`}
                      className="absolute top-12 flex flex-col items-center cursor-pointer group"
                      style={{ left: `${Math.min(Math.max(slkToPercent(repeater.slk), 2), 98)}%`, transform: 'translateX(-50%)' }}
                    >
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-400"
                        style={{ backgroundColor: getSpeedColor(repeater.front_speed) }}
                      />
                      <span className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {repeater.id}
                      </span>
                      <span className="text-xs text-gray-500">{repeater.slk.toFixed(2)}</span>
                    </div>
                  ))
                )}

                {/* Unassigned Signs */}
                {roadLayout.unassignedSigns.map((sign) => (
                  <div
                    key={`unassigned-${sign.id}`}
                    className="absolute top-12 flex flex-col items-center cursor-pointer group"
                    style={{ left: `${Math.min(Math.max(slkToPercent(sign.slk), 2), 98)}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-dashed border-orange-400 bg-orange-900/50" />
                    <span className="text-xs text-orange-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {sign.id} ⚠
                    </span>
                    <span className="text-xs text-gray-500">{sign.slk.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone Details Cards */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Zone Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {roadLayout.zones.map((zone, idx) => (
                  <div 
                    key={idx}
                    className="rounded-lg p-3 border-l-4"
                    style={{ 
                      backgroundColor: `${getSpeedColor(zone.speed)}20`,
                      borderColor: getSpeedColor(zone.speed)
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg" style={{ color: getSpeedColor(zone.speed) }}>
                        {zone.speed} km/h
                      </span>
                      <span className="text-sm text-gray-400">
                        {(zone.lengthKm * 1000).toFixed(0)}m
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1">
                      <div>SLK: {zone.startSlk.toFixed(2)} → {zone.endSlk.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">
                        Boundary: {zone.boundarySign?.id}
                        {zone.boundarySign?.back_speed && (
                          <span className="ml-2">(back: {zone.boundarySign.back_speed})</span>
                        )}
                      </div>
                      {zone.repeaters.length > 0 && (
                        <div className="text-xs text-gray-400">
                          Repeaters: {zone.repeaters.map(r => r.id).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {/* Zone Boundaries */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Zone Boundaries</h3>
              <div className="space-y-2">
                {roadLayout.zones.map((zone, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-4 p-3 rounded-lg bg-gray-700"
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg"
                      style={{ backgroundColor: getSpeedColor(zone.speed), color: 'white' }}
                    >
                      {zone.speed}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-yellow-400">{zone.boundarySign?.id}</span>
                        <span className="text-xs text-gray-400">({zone.boundarySign?.sign_type})</span>
                        {zone.boundarySign?.direction && (
                          <span className="text-xs text-gray-400">{zone.boundarySign.direction}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-300">
                        SLK {zone.startSlk.toFixed(2)} → {zone.endSlk.toFixed(2)} ({(zone.lengthKm * 1000).toFixed(0)}m)
                      </div>
                      {zone.boundarySign?.back_speed && (
                        <div className="text-xs text-gray-400">
                          Back face: {zone.boundarySign.back_speed} km/h
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">{zone.repeaters.length} repeaters</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Repeater Signs */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Repeater Signs</h3>
              {roadLayout.zones.every(z => z.repeaters.length === 0) ? (
                <p className="text-gray-400 text-sm">No repeater signs defined</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roadLayout.zones.filter(z => z.repeaters.length > 0).map((zone, idx) => (
                    <div key={idx} className="bg-gray-700 rounded p-3">
                      <div className="text-sm font-semibold mb-2" style={{ color: getSpeedColor(zone.speed) }}>
                        {zone.speed} km/h zone
                      </div>
                      <div className="space-y-1">
                        {zone.repeaters.map((r) => (
                          <div key={r.id} className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-yellow-400">{r.id}</span>
                            <span className="text-gray-300">@ SLK {r.slk.toFixed(2)}</span>
                            <span className="text-xs text-gray-400">({r.direction})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unassigned Signs */}
            {roadLayout.unassignedSigns.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-orange-700">
                <h3 className="text-lg font-semibold text-orange-400 mb-3">
                  Unassigned Signs ({roadLayout.unassignedSigns.length})
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  These signs do not fall within any defined zone. Add zone boundaries to include them.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roadLayout.unassignedSigns.map((sign) => (
                    <div key={sign.id} className="bg-orange-900/20 rounded p-3 flex items-center gap-3">
                      <span className="font-mono text-yellow-400">{sign.id}</span>
                      <span className="text-gray-300">SLK {sign.slk.toFixed(2)}</span>
                      <span className="text-xs text-gray-400">{sign.front_speed} km/h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
