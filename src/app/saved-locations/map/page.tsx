'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SavedLocation } from '@/types/shared';
import 'leaflet/dist/leaflet.css';

// Dynamic imports for Leaflet components (SSR disabled)
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

// Saved location with coordinates
interface LocationWithCoords extends SavedLocation {
  lat: number | null;
  lon: number | null;
  loading: boolean;
  error: boolean;
}

// Create colored marker icon (client-side only)
const createIcon = (color: string) => {
  if (typeof window === 'undefined') return undefined;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Leaflet must be required client-side only for SSR compatibility
  const L = require('leaflet');
  return L.divIcon({
    className: 'location-marker',
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:12px;">📍</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

export default function SavedLocationsMapPage() {
  const [mounted, setMounted] = useState(false);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [locationsWithCoords, setLocationsWithCoords] = useState<LocationWithCoords[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);

  // Load saved locations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedLocations');
    if (saved) {
      try {
        const parsed: SavedLocation[] = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional for SSR-safe client-side rendering
        setLocations(parsed);
        // Initialize with loading state

        setLocationsWithCoords(
          parsed.map((loc) => ({
            ...loc,
            lat: null,
            lon: null,
            loading: true,
            error: false,
          }))
        );
      } catch {
        setLocations([]);
      }
    }

    setLoadingAll(false);
  }, []);

  // Fetch coordinates for all locations
  const fetchAllCoords = useCallback(async () => {
    if (locations.length === 0) return;

    const results = await Promise.all(
      locations.map(async (loc) => {
        try {
          const response = await fetch(
            `/api/roads?action=locate&road_id=${encodeURIComponent(loc.road_id)}&slk=${loc.start_slk}`
          );
          if (response.ok) {
            const data = await response.json();
            return {
              ...loc,
              lat: data.latitude ?? null,
              lon: data.longitude ?? null,
              loading: false,
              error: false,
            };
          }
          return { ...loc, lat: null, lon: null, loading: false, error: true };
        } catch {
          return { ...loc, lat: null, lon: null, loading: false, error: true };
        }
      })
    );

    setLocationsWithCoords(results);
  }, [locations]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional for SSR-safe client-side rendering
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && locations.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional for SSR-safe client-side rendering
      fetchAllCoords();
    }
  }, [mounted, locations.length, fetchAllCoords]);

  // Filter to only show locations with coordinates
  const mappableLocations = useMemo(() => {
    return locationsWithCoords.filter((loc) => loc.lat !== null && loc.lon !== null);
  }, [locationsWithCoords]);

  // Count loading/error states
  const stats = useMemo(() => {
    const total = locationsWithCoords.length;
    const loading = locationsWithCoords.filter((l) => l.loading).length;
    const error = locationsWithCoords.filter((l) => l.error).length;
    const success = mappableLocations.length;
    return { total, loading, error, success };
  }, [locationsWithCoords, mappableLocations]);

  if (!mounted || loadingAll) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  // Calculate center point
  const center: [number, number] =
    mappableLocations.length > 0
      ? [
          mappableLocations.reduce((sum, l) => sum + l.lat!, 0) / mappableLocations.length,
          mappableLocations.reduce((sum, l) => sum + l.lon!, 0) / mappableLocations.length,
        ]
      : [-31.9505, 115.8605]; // Default to Perth

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-3 flex items-center justify-between border-b border-gray-700 shrink-0">
        <Link href="/" className="text-blue-400 text-sm">
          ← Back
        </Link>
        <h1 className="text-purple-400 font-bold">📍 Saved Locations Map</h1>
        <span className="text-xs text-gray-400">
          {stats.success}/{stats.total}
        </span>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 px-3 py-2 flex items-center justify-between border-b border-gray-700 shrink-0">
        <div className="text-xs text-gray-400">
          {stats.loading > 0 && <span>Loading coordinates... ({stats.loading} remaining)</span>}
          {stats.error > 0 && <span className="text-yellow-500 ml-2">{stats.error} failed</span>}
        </div>
        {stats.success > 0 && (
          <Button
            onClick={() => {
              // Open in Google Maps
              const coords = mappableLocations.map((l) => `${l.lat},${l.lon}`).join('/');
              window.open(`https://www.google.com/maps/dir//${coords}`, '_blank');
            }}
            size="sm"
            className="text-xs bg-green-700 hover:bg-green-600"
          >
            🗺️ Open in Google Maps
          </Button>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        {mappableLocations.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
            {stats.loading > 0 ? (
              <p>Fetching coordinates...</p>
            ) : stats.error === stats.total ? (
              <div className="text-center">
                <p className="text-red-400">Could not fetch coordinates</p>
                <p className="text-xs mt-2">Try refreshing the page</p>
              </div>
            ) : (
              <p>No saved locations with coordinates</p>
            )}
            <Link href="/" className="mt-4 text-cyan-400 text-sm">
              Go back to save locations
            </Link>
          </div>
        ) : (
          <div className="absolute inset-0">
            <MapContainer
              center={center}
              zoom={10}
              className="w-full h-full"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />
              {mappableLocations.map((loc) => (
                <Marker key={loc.id} position={[loc.lat!, loc.lon!]} icon={createIcon('#a855f7')}>
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <div className="font-bold text-purple-600">
                        {loc.road_id} - SLK {loc.start_slk}
                        {loc.end_slk && ` - ${loc.end_slk}`}
                      </div>
                      {loc.road_name && (
                        <div className="text-gray-500 text-xs">{loc.road_name}</div>
                      )}
                      <div className="mt-1 font-medium">{loc.name}</div>
                      <div className="mt-2 pt-1 border-t flex gap-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}&travelmode=driving`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Navigate →
                        </a>
                        <a
                          href={`/?road_id=${encodeURIComponent(loc.road_id)}&slk=${loc.start_slk}`}
                          className="text-purple-600 text-xs hover:underline"
                        >
                          View Details →
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Legend */}
        {mappableLocations.length > 0 && (
          <div className="absolute bottom-3 left-3 bg-black/80 text-white text-xs px-3 py-2 rounded z-[1000]">
            <div className="flex items-center gap-2">
              <span className="text-purple-400">📍</span>
              <span>Saved Location</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
