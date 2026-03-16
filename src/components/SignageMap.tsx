'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { AfterCareSign, AfterCareJob } from '@/lib/aftercare';
import { calculateSignStatus } from '@/lib/aftercare';
import 'leaflet/dist/leaflet.css';

interface SignageMapProps {
  jobs: AfterCareJob[];
  height?: string;
}

// Create colored circle marker
const createIcon = (color: string) => {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  return L.divIcon({
    className: 'sign-marker',
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
};

// Color by status
const getColor = (sign: AfterCareSign) => {
  const s = calculateSignStatus(sign);
  if (s === 'due-retrieval') return '#ef4444';
  if (s === 'due-maintenance' || s === 'maintained') return '#eab308';
  return '#22c55e';
};

export default function SignageMap({ jobs, height = '300px' }: SignageMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Get all non-retrieved signs with GPS
  const signs = jobs.flatMap(job => 
    job.signs
      .filter(s => s.lat && s.lon && calculateSignStatus(s) !== 'retrieved')
      .map(s => ({ ...s, jobName: job.job_name, roadId: job.road_id }))
  );

  if (!mounted) return <div style={{ height }} className="bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-sm">Loading map...</div>;
  if (signs.length === 0) return <div style={{ height }} className="bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-sm">No signs with GPS coordinates</div>;

  const center: [number, number] = [
    signs.reduce((sum, s) => sum + s.lat!, 0) / signs.length,
    signs.reduce((sum, s) => sum + s.lon!, 0) / signs.length
  ];

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden relative">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
        {signs.map(sign => (
          <Marker key={sign.id} position={[sign.lat!, sign.lon!]} icon={createIcon(getColor(sign))}>
            <Popup>
              <div className="text-sm">
                <b>{sign.roadId} - SLK {sign.slk.toFixed(2)}</b><br/>
                {sign.sign_type}<br/>
                <span className="text-gray-500">{sign.direction === 'True Left' ? '↑ Left' : '↓ Right'}</span><br/>
                <span style={{ color: getColor(sign) }}>{calculateSignStatus(sign) === 'due-retrieval' ? '🔴 Retrieval' : calculateSignStatus(sign) === 'due-maintenance' || calculateSignStatus(sign) === 'maintained' ? '🟡 Maintenance' : '🟢 Active'}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">🟢 Active 🟡 Maintenance 🔴 Retrieval</div>
    </div>
  );
}
