'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  getAfterCareJobs,
  calculateSignStatus,
  type AfterCareSign,
  type AfterCareJob,
  type SignStatus,
} from '@/lib/aftercare';
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

// Sign with pre-computed status to avoid redundant calculateSignStatus calls
interface SignWithStatus extends AfterCareSign {
  status: SignStatus;
  jobName: string;
  roadId: string;
  roadName: string;
}

// Color by status
const getColor = (status: SignStatus) => {
  if (status === 'retrieved') return '#3b82f6'; // Blue for retrieved
  if (status === 'due-retrieval') return '#ef4444';
  if (status === 'due-maintenance' || status === 'maintained') return '#eab308';
  return '#22c55e';
};

// Create colored circle marker (client-side only)
const createIcon = (color: string) => {
  if (typeof window === 'undefined') return undefined;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Leaflet must be required client-side only for SSR compatibility
  const L = require('leaflet');
  return L.divIcon({
    className: 'sign-marker',
    html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

// Status label for display
const getStatusLabel = (status: SignStatus) => {
  if (status === 'retrieved') return '✓ Retrieved';
  if (status === 'due-retrieval') return '🔴 Due for Retrieval';
  if (status === 'due-maintenance' || status === 'maintained') return '🟡 Due for Maintenance';
  return '🟢 Active';
};

export default function SignageMapPage() {
  const [mounted, setMounted] = useState(false);
  const [jobs, setJobs] = useState<AfterCareJob[]>(() => getAfterCareJobs());
  const [filter, setFilter] = useState<
    'all' | 'retrieval' | 'maintenance' | 'active' | 'retrieved'
  >('all');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional for SSR-safe client-side rendering
    setMounted(true);
  }, []);

  // Compute status once per sign (was 6 calls per sign per render)
  const signsWithStatus = useMemo(() => {
    const result: SignWithStatus[] = [];
    for (const job of jobs) {
      for (const s of job.signs) {
        if (s.lat && s.lon) {
          result.push({
            ...s,
            status: calculateSignStatus(s),
            jobName: job.job_name,
            roadId: job.road_id,
            roadName: job.road_name,
          });
        }
      }
    }
    return result;
  }, [jobs]);

  // Filter based on selected filter
  const signs = useMemo(() => {
    if (filter === 'all') {
      // Show all except retrieved by default
      return signsWithStatus.filter((s) => s.status !== 'retrieved');
    }
    return signsWithStatus.filter((s) => {
      if (filter === 'retrieval') return s.status === 'due-retrieval';
      if (filter === 'maintenance')
        return s.status === 'due-maintenance' || s.status === 'maintained';
      if (filter === 'active') return s.status === 'placed';
      if (filter === 'retrieved') return s.status === 'retrieved';
      return true;
    });
  }, [signsWithStatus, filter]);

  // Count by status (from pre-computed statuses — zero extra calculateSignStatus calls)
  const counts = useMemo(() => {
    const c = { all: 0, retrieval: 0, maintenance: 0, active: 0, retrieved: 0 };
    for (const s of signsWithStatus) {
      if (s.status === 'retrieved') c.retrieved++;
      else {
        c.all++; // 'all' excludes retrieved
        if (s.status === 'due-retrieval') c.retrieval++;
        else if (s.status === 'due-maintenance' || s.status === 'maintained') c.maintenance++;
        else if (s.status === 'placed') c.active++;
      }
    }
    return c;
  }, [signsWithStatus]);

  if (!mounted)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );

  const center: [number, number] =
    signs.length > 0
      ? [
          signs.reduce((sum, s) => sum + s.lat!, 0) / signs.length,
          signs.reduce((sum, s) => sum + s.lon!, 0) / signs.length,
        ]
      : [-31.9505, 115.8605];

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-3 flex items-center justify-between border-b border-gray-700 shrink-0">
        <Link href="/aftercare" className="text-blue-400 text-sm">
          ← Back
        </Link>
        <h1 className="text-cyan-400 font-bold">📍 Signage Map</h1>
        <span className="text-xs text-gray-400">{signs.length} signs</span>
      </div>

      {/* Filter Buttons */}
      <div className="bg-gray-800 px-3 py-2 flex gap-1 border-b border-gray-700 shrink-0">
        <Button
          onClick={() => setFilter('all')}
          size="sm"
          className={`flex-1 text-xs ${filter === 'all' ? 'bg-gray-600' : 'bg-gray-700'}`}
        >
          All ({counts.all})
        </Button>
        <Button
          onClick={() => setFilter('retrieval')}
          size="sm"
          className={`flex-1 text-xs ${filter === 'retrieval' ? 'bg-red-700' : 'bg-gray-700'}`}
        >
          🔴 ({counts.retrieval})
        </Button>
        <Button
          onClick={() => setFilter('maintenance')}
          size="sm"
          className={`flex-1 text-xs ${filter === 'maintenance' ? 'bg-yellow-700' : 'bg-gray-700'}`}
        >
          🟡 ({counts.maintenance})
        </Button>
        <Button
          onClick={() => setFilter('active')}
          size="sm"
          className={`flex-1 text-xs ${filter === 'active' ? 'bg-green-700' : 'bg-gray-700'}`}
        >
          🟢 ({counts.active})
        </Button>
        <Button
          onClick={() => setFilter('retrieved')}
          size="sm"
          className={`flex-1 text-xs ${filter === 'retrieved' ? 'bg-blue-700' : 'bg-gray-700'}`}
        >
          ✓ ({counts.retrieved})
        </Button>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        {signs.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            No signs with GPS coordinates
          </div>
        ) : (
          <div className="absolute inset-0">
            <MapContainer
              center={center}
              zoom={12}
              className="w-full h-full"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />
              {signs.map((sign) => (
                <Marker
                  key={sign.id}
                  position={[sign.lat!, sign.lon!]}
                  icon={createIcon(getColor(sign.status))}
                >
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <div className="font-bold">
                        {sign.roadId} - SLK {sign.slk.toFixed(2)}
                      </div>
                      {sign.roadName && (
                        <div className="text-gray-500 text-xs">{sign.roadName}</div>
                      )}
                      <div className="mt-1">
                        <b>{sign.sign_type}</b>
                      </div>
                      <div className="text-gray-500">
                        {sign.direction === 'True Left' ? '↑ True Left' : '↓ True Right'}
                      </div>
                      {sign.description && (
                        <div className="text-gray-600 text-xs mt-1">{sign.description}</div>
                      )}
                      <div className="mt-2 pt-1 border-t" style={{ color: getColor(sign.status) }}>
                        {getStatusLabel(sign.status)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-black/80 text-white text-xs px-3 py-2 rounded z-[1000]">
          <div className="flex items-center gap-3">
            <span>🟢 Active</span>
            <span>🟡 Maintenance</span>
            <span>🔴 Retrieval</span>
            <span style={{ color: '#3b82f6' }}>✓ Retrieved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
