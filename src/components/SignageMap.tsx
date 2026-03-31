'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { AfterCareSign, AfterCareJob, SignStatus } from '@/lib/aftercare';
import { calculateSignStatus } from '@/lib/aftercare';
import 'leaflet/dist/leaflet.css';

interface SignageMapProps {
  jobs: AfterCareJob[];
  height?: string;
}

// Sign with pre-computed status to avoid redundant calculateSignStatus calls
interface SignWithStatus extends AfterCareSign {
  status: SignStatus;
  jobName: string;
  roadId: string;
}

// Color by status
const getColor = (status: SignStatus) => {
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
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
};

// Status label for display
const getStatusLabel = (status: SignStatus) => {
  if (status === 'due-retrieval') return '🔴 Retrieval';
  if (status === 'due-maintenance' || status === 'maintained') return '🟡 Maintenance';
  return '🟢 Active';
};

export default function SignageMap({ jobs, height = '300px' }: SignageMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional for SSR-safe client-side rendering
    setMounted(true);
  }, []);

  // Compute status once per sign (was 5-6 calls per sign per render)
  const signs = useMemo(() => {
    const result: SignWithStatus[] = [];
    for (const job of jobs) {
      for (const s of job.signs) {
        if (s.lat && s.lon) {
          const status = calculateSignStatus(s);
          if (status !== 'retrieved') {
            result.push({ ...s, status, jobName: job.job_name, roadId: job.road_id });
          }
        }
      }
    }
    return result;
  }, [jobs]);

  if (!mounted)
    return (
      <div
        style={{ height }}
        className="bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-sm"
      >
        Loading map...
      </div>
    );
  if (signs.length === 0)
    return (
      <div
        style={{ height }}
        className="bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-sm"
      >
        No signs with GPS coordinates
      </div>
    );

  const center: [number, number] = [
    signs.reduce((sum, s) => sum + s.lat!, 0) / signs.length,
    signs.reduce((sum, s) => sum + s.lon!, 0) / signs.length,
  ];

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden relative">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
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
              <div className="text-sm">
                <b>
                  {sign.roadId} - SLK {sign.slk.toFixed(2)}
                </b>
                <br />
                {sign.sign_type}
                <br />
                <span className="text-gray-500">
                  {sign.direction === 'True Left' ? '↑ Left' : '↓ Right'}
                </span>
                <br />
                <span style={{ color: getColor(sign.status) }}>{getStatusLabel(sign.status)}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
        🟢 Active 🟡 Maintenance 🔴 Retrieval
      </div>
    </div>
  );
}
