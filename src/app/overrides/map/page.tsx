'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import {
  initDB,
  getSpeedSignOverrides,
  clearSpeedOverridesCache,
  type SpeedSignOverride,
} from '@/lib/offline-db';

// Import Leaflet dynamically (no SSR)
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((mod) => mod.CircleMarker), {
  ssr: false,
});
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

// Storage key for localStorage
const STORAGE_KEY = 'speed-sign-overrides';

// Speed limit colors
const SPEED_COLORS: Record<number, string> = {
  40: '#ef4444', // red
  50: '#f97316', // orange
  60: '#eab308', // yellow
  70: '#84cc16', // lime
  80: '#22c55e', // green
  90: '#14b8a6', // teal
  100: '#0ea5e9', // cyan
  110: '#3b82f6', // blue
  130: '#8b5cf6', // purple
};

function getSpeedColor(speed: number): string {
  return SPEED_COLORS[speed] || '#6b7280'; // gray default
}

interface RoadSegment {
  start_slk: number;
  end_slk: number;
  geometry: [number, number][] | null;
}

interface RoadData {
  road_id: string;
  road_name: string;
  min_slk: number;
  max_slk: number;
  network_type: string;
  segments: RoadSegment[];
}

/**
 * Interpolate GPS coordinates from road geometry at a given SLK
 * Returns { lat, lon } or null if not found
 */
function interpolateCoordinatesFromSlk(
  roadData: RoadData,
  targetSlk: number
): { lat: number; lon: number } | null {
  if (!roadData.segments) return null;

  // Find segment containing this SLK
  for (const segment of roadData.segments) {
    if (!segment.geometry || segment.geometry.length < 2) continue;

    // Check if target SLK falls within this segment
    const minSlk = Math.min(segment.start_slk, segment.end_slk);
    const maxSlk = Math.max(segment.start_slk, segment.end_slk);

    if (targetSlk >= minSlk && targetSlk <= maxSlk) {
      // Calculate interpolation ratio
      const slkRange = maxSlk - minSlk;
      const ratio = slkRange > 0 ? (targetSlk - minSlk) / slkRange : 0;

      // Handle direction (SLK can increase or decrease along geometry)
      const isReversed = segment.end_slk < segment.start_slk;
      const effectiveRatio = isReversed ? 1 - ratio : ratio;

      // Interpolate along geometry
      const geomLen = segment.geometry.length;
      const idxFloat = effectiveRatio * (geomLen - 1);
      const idxLow = Math.floor(idxFloat);
      const idxHigh = Math.min(idxLow + 1, geomLen - 1);
      const t = idxFloat - idxLow;

      const lowPoint = segment.geometry[idxLow];
      const highPoint = segment.geometry[idxHigh];

      // Linear interpolation
      const lat = lowPoint[0] + (highPoint[0] - lowPoint[0]) * t;
      const lon = lowPoint[1] + (highPoint[1] - lowPoint[1]) * t;

      return { lat, lon };
    }
  }

  return null;
}

export default function OverridesMapPage() {
  const [loading, setLoading] = useState(true);
  const [geocodingSigns, setGeocodingSigns] = useState(false);
  const [geocodingResults, setGeocodingResults] = useState<{
    found: number;
    notFound: number;
  } | null>(null);
  const [signs, setSigns] = useState<SpeedSignOverride[]>([]);
  const [roads, setRoads] = useState<RoadData[]>([]);
  const [selectedRoad, setSelectedRoad] = useState<string>('');
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState(10);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet CSS dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);

      // Wait for Leaflet to be available
      import('leaflet').then(() => {
        setLeafletLoaded(true);
      });
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await initDB();

      // Load signs from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      let loadedSigns: SpeedSignOverride[] = [];
      if (stored) {
        const data = JSON.parse(stored);
        loadedSigns = data.signs || [];
        setSigns(loadedSigns);
      }

      // Load road geometry from IndexedDB
      const db = await initDB();
      const roadData = await new Promise<RoadData[]>((resolve) => {
        const tx = db.transaction('regions', 'readonly');
        const store = tx.objectStore('regions');
        const request = store.getAll();

        request.onsuccess = () => {
          const regions = request.result || [];
          const allRoads: RoadData[] = [];
          for (const region of regions) {
            if (region.roads) {
              allRoads.push(...region.roads);
            }
          }
          resolve(allRoads);
        };
        request.onerror = () => resolve([]);
      });

      setRoads(roadData);

      // Auto-geocode signs missing lat/lon
      if (loadedSigns.length > 0 && roadData.length > 0) {
        const signsNeedingGeocode = loadedSigns.filter((s) => !s.lat || !s.lon);

        if (signsNeedingGeocode.length > 0) {
          setGeocodingSigns(true);

          let found = 0;
          let notFound = 0;
          const updatedSigns = [...loadedSigns];

          for (let i = 0; i < updatedSigns.length; i++) {
            const sign = updatedSigns[i];
            if (sign.lat && sign.lon) continue;

            // Find road geometry for this sign
            const road = roadData.find(
              (r) => r.road_id.trim().toUpperCase() === sign.road_id.trim().toUpperCase()
            );

            if (road) {
              const coords = interpolateCoordinatesFromSlk(road, sign.slk);
              if (coords) {
                updatedSigns[i] = {
                  ...sign,
                  lat: coords.lat,
                  lon: coords.lon,
                };
                found++;
              } else {
                notFound++;
              }
            } else {
              notFound++;
            }
          }

          // Save updated signs back to localStorage
          if (found > 0) {
            const dataToSave = {
              version: '2.0',
              last_updated: new Date().toISOString().split('T')[0],
              signs: updatedSigns,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            clearSpeedOverridesCache();
            setSigns(updatedSigns);
          }

          setGeocodingResults({ found, notFound });
          setGeocodingSigns(false);
        }
      }

      // Auto-select first road that has signs
      if (loadedSigns.length > 0 && !selectedRoad) {
        const firstRoadId = loadedSigns[0].road_id;
        setSelectedRoad(firstRoadId);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Get unique roads from signs
  const roadOptions = useMemo(() => {
    const roadSet = new Set<string>();
    signs.forEach((s) => roadSet.add(s.road_id));
    return Array.from(roadSet).sort();
  }, [signs]);

  // Filter signs by selected road
  const filteredSigns = useMemo(() => {
    if (!selectedRoad) return signs;
    return signs.filter(
      (s) => s.road_id.trim().toUpperCase() === selectedRoad.trim().toUpperCase()
    );
  }, [signs, selectedRoad]);

  // Get road geometry for selected road
  const roadGeometry = useMemo(() => {
    if (!selectedRoad) return null;
    const road = roads.find(
      (r) => r.road_id.trim().toUpperCase() === selectedRoad.trim().toUpperCase()
    );
    return road || null;
  }, [roads, selectedRoad]);

  // Convert signs to map markers
  const signMarkers = useMemo(() => {
    return filteredSigns
      .filter((s) => s.lat && s.lon)
      .map((sign) => ({
        ...sign,
        position: [sign.lat!, sign.lon!] as [number, number],
      }));
  }, [filteredSigns]);

  // Create speed zone segments with geometry
  const speedZoneSegments = useMemo(() => {
    if (!roadGeometry || !roadGeometry.segments) return [];

    const segments: Array<{
      geometry: [number, number][];
      speed: number;
      startSlk: number;
      endSlk: number;
      signId: string;
      color: string;
    }> = [];

    // Get all zone-defining signs (replicated)
    const zoneSigns = filteredSigns.filter((s) => s.replicated && s.end_slk);

    for (const sign of zoneSigns) {
      // Find segments that fall within this zone
      const zoneStart = sign.start_slk;
      const zoneEnd = sign.end_slk!;

      // Collect all geometry points within this zone
      const points: [number, number][] = [];

      for (const seg of roadGeometry.segments) {
        if (!seg.geometry) continue;

        // Check if segment overlaps with zone
        if (seg.end_slk >= zoneStart && seg.start_slk <= zoneEnd) {
          // Add points that fall within the zone
          for (let i = 0; i < seg.geometry.length; i++) {
            const point = seg.geometry[i];
            // Estimate SLK at this point
            const ratio = i / (seg.geometry.length - 1 || 1);
            const pointSlk = seg.start_slk + (seg.end_slk - seg.start_slk) * ratio;

            if (pointSlk >= zoneStart && pointSlk <= zoneEnd) {
              // Leaflet uses [lat, lon] but geometry is [lat, lon]
              points.push([point[0], point[1]]);
            }
          }
        }
      }

      if (points.length >= 2) {
        segments.push({
          geometry: points,
          speed: sign.front_speed,
          startSlk: zoneStart,
          endSlk: zoneEnd,
          signId: sign.id,
          color: getSpeedColor(sign.front_speed),
        });
      }
    }

    return segments;
  }, [roadGeometry, filteredSigns]);

  // Calculate map bounds when road is selected
  useEffect(() => {
    if (signMarkers.length > 0) {
      // Center on first sign
      setMapCenter(signMarkers[0].position);
      setMapZoom(13);
    } else if (roadGeometry?.segments?.length) {
      // Center on road geometry
      const firstSeg = roadGeometry.segments.find((s) => s.geometry && s.geometry.length > 0);
      if (firstSeg?.geometry?.[0]) {
        setMapCenter([firstSeg.geometry[0][0], firstSeg.geometry[0][1]]);
        setMapZoom(12);
      }
    }
  }, [selectedRoad, signMarkers, roadGeometry]);

  if (loading || geocodingSigns) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>
            {geocodingSigns
              ? 'Looking up coordinates from road geometry...'
              : 'Loading map data...'}
          </p>
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
              <Button className="bg-gray-700 hover:bg-gray-600 text-white">← Back</Button>
            </Link>
            <h1 className="text-xl font-bold">Speed Zone Map</h1>
          </div>
          <div className="text-xs text-gray-500">v1.35.0</div>
        </div>
      </div>

      {/* Geocoding Results Banner */}
      {geocodingResults && (geocodingResults.found > 0 || geocodingResults.notFound > 0) && (
        <div
          className={`border-b p-3 ${geocodingResults.found > 0 ? 'bg-green-900/30 border-green-700' : 'bg-yellow-900/30 border-yellow-700'}`}
        >
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            {geocodingResults.found > 0 && (
              <span className="text-green-300 text-sm">
                ✓ Auto-filled coordinates for {geocodingResults.found} sign
                {geocodingResults.found !== 1 ? 's' : ''} from road geometry
              </span>
            )}
            {geocodingResults.notFound > 0 && (
              <span className="text-yellow-300 text-sm">
                ⚠ {geocodingResults.notFound} sign{geocodingResults.notFound !== 1 ? 's' : ''}{' '}
                couldn&apos;t be geocoded (road not in offline data)
              </span>
            )}
            <button
              onClick={() => setGeocodingResults(null)}
              className="ml-auto text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
              <option value="">All Roads</option>
              {roadOptions.map((road) => (
                <option key={road} value={road}>
                  {road}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">Signs: {filteredSigns.length}</span>
            <span className="text-gray-400">Zones: {speedZoneSegments.length}</span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 ml-auto flex-wrap">
            <span className="text-xs text-gray-400">Speed:</span>
            {[60, 80, 90, 100, 110].map((speed) => (
              <div key={speed} className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getSpeedColor(speed) }}
                />
                <span className="text-xs">{speed}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-[calc(100vh-140px)]">
        {leafletLoaded && mapCenter && (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Speed Zone Segments */}
            {speedZoneSegments.map((segment, idx) => (
              <Polyline
                key={`zone-${idx}`}
                positions={segment.geometry}
                pathOptions={{
                  color: segment.color,
                  weight: 8,
                  opacity: 0.8,
                }}
              />
            ))}

            {/* Sign Markers */}
            {signMarkers.map((sign) => (
              <CircleMarker
                key={sign.id}
                center={sign.position}
                radius={8}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: getSpeedColor(sign.front_speed),
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-gray-900 p-2 min-w-[200px]">
                    <div className="font-bold text-lg mb-2">{sign.id}</div>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="font-medium">SLK:</span> {sign.slk}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {sign.sign_type}
                      </div>
                      <div>
                        <span className="font-medium">Direction:</span> {sign.direction}
                      </div>
                      <div>
                        <span className="font-medium">Speed:</span> {sign.front_speed} km/h
                      </div>
                      {sign.back_speed && (
                        <div>
                          <span className="font-medium">Back:</span> {sign.back_speed} km/h
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Zone:</span>{' '}
                        {sign.replicated ? `${sign.start_slk} - ${sign.end_slk}` : 'Repeater'}
                      </div>
                      {sign.note && <div className="text-xs text-gray-500 mt-2">{sign.note}</div>}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Sign List (for roads without geometry) */}
      {signMarkers.length === 0 && filteredSigns.length > 0 && (
        <div className="bg-gray-800 p-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">
              Signs (No GPS coordinates - add lat/lon to see on map)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {filteredSigns.map((sign) => (
                <div key={sign.id} className="bg-gray-700 rounded p-3 text-sm">
                  <div className="font-mono text-yellow-400">{sign.id}</div>
                  <div className="text-gray-300">
                    SLK {sign.slk} | {sign.front_speed} km/h
                  </div>
                  <div className="text-xs text-gray-400">
                    {sign.sign_type} | {sign.direction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
