# Live Road Incidents Integration - Concept Design

## Overview

This document shows how the TC Work Zone Locator could integrate live road incident data from Main Roads WA's WebEOC system into the application.

---

## Data Source

**WebEOC (Web Emergency Operations Center)**

- Base URL: `https://services-mainroads.opendata.arcgis.com/`
- Dataset: WebEOC Road Incidents / WebEOC Road Closures
- Update Frequency: Every 5 minutes
- Format: ArcGIS Feature Service (JSON/GeoJSON)

**Alternative Access Points:**

| Portal | URL |
|--------|-----|
| WA Data Catalogue | `catalogue.data.wa.gov.au/dataset/mrwa-webeoc-road-incidents` |
| Federal Data Portal | `data.gov.au/data/dataset/mrwa-webeoc-road-incidents` |
| MRWA ArcGIS Hub | `portal-mainroads.opendata.arcgis.com` |

---

## Data Structure (Expected)

### RoadIncident Interface

```typescript
interface RoadIncident {
  objectid: number;
  incident_id: string;
  incident_type: string;        // 'Crash', 'Breakdown', 'Hazard', 'Roadwork', 'Event'
  status: string;                // 'Active', 'Cleared', 'Pending'
  severity: string;              // 'Minor', 'Moderate', 'Major', 'Critical'

  // Location
  road_id: string;               // e.g., 'M031', 'H005'
  road_name: string;             // e.g., 'Great Eastern Highway'
  slk: number;                   // Straight Line Kilometre
  location_description: string;  // Human-readable location

  // Geometry
  latitude: number;
  longitude: number;

  // Timing
  reported_date: string;         // ISO timestamp
  estimated_clearance?: string;  // Expected end time

  // Impact
  lanes_affected?: number;
  direction?: 'Increasing' | 'Decreasing' | 'Both';
  speed_restriction?: number;    // Reduced speed limit if applicable

  // Details
  description: string;
  traffic_impact: string;        // 'Delays', 'Road Closed', 'Lane Closed', 'No Impact'

  // Timestamps
  created_date: string;
  modified_date: string;
}
```

### RoadClosure Interface

```typescript
interface RoadClosure {
  objectid: number;
  closure_id: string;
  closure_type: string;          // 'Full', 'Lane', 'Shoulder'
  status: string;                // 'Current', 'Planned', 'Completed'

  // Location
  road_id: string;
  road_name: string;
  start_slk: number;
  end_slk: number;
  location_description: string;

  // Timing
  start_date: string;
  end_date?: string;
  reason: string;                // 'Roadworks', 'Event', 'Emergency', 'Flooding'

  // Detour
  detour_route?: string;
  detour_distance_km?: number;

  // Geometry
  geometry: {
    type: 'polyline';
    coordinates: number[][];
  };
}
```

---

## UI Integration

### 1. Home Page - Incidents Section

Add a collapsible "Road Incidents" section below the existing sections:

```
┌─────────────────────────────────────┐
│ 🔴 Road Incidents (3 active)      › │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🔴 MAJOR - M031 SLK 45.20       │ │
│ │ Crash - 2 vehicles              │ │
│ │ Both directions affected        │ │
│ │ Est. clearance: 14:30           │ │
│ │ [Navigate] [Details]            │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 MODERATE - H005 SLK 12.50    │ │
│ │ Roadworks - Lane closure        │ │
│ │ Left lane closed, delays 5 min  │ │
│ │ Until: 18:00 today              │ │
│ │ [Navigate] [Details]            │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🟡 MODERATE - M010 SLK 8.00     │ │
│ │ Breakdown - RHC lane            │ │
│ │ Right hand lane blocked         │ │
│ │ [Navigate] [Details]            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Updated: 2 minutes ago              │
└─────────────────────────────────────┘
```

### 2. Drive Page - Incident Warnings

When approaching an incident, show a warning banner:

```
┌─────────────────────────────────────┐
│ ⚠️ INCIDENT AHEAD - 1.2 km          │
│ M031 SLK 45.20 - Crash              │
│ Reduce speed, expect delays         │
│ [Dismiss]                           │
└─────────────────────────────────────┘
```

### 3. Signage Corridor - Include Incidents

Add incidents to the signage corridor report:

```
Signage Corridor (±700m from SLK 45.00-47.00)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 ACTIVE INCIDENTS
  SLK 45.20 - Crash (Major)
  SLK 46.00 - Roadworks (Lane closure)

🚸 SPEED SIGNS
  SLK 44.50 - Speed Limit 80
  SLK 45.80 - Speed Limit 60 (Work Zone)

⚠️ WARNING SIGNS
  SLK 44.80 - Roadworks Ahead
  SLK 46.50 - Curve 55 km/h

🛤️ RAIL CROSSINGS
  SLK 47.20 - Public crossing
```

---

## API Route Implementation

### /api/incidents/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';

// WebEOC ArcGIS Feature Service URLs
const INCIDENTS_URL = 'https://services.arcgis.com/.../WebEOC_Road_Incidents/FeatureServer/0/query';
const CLOSURES_URL = 'https://services.arcgis.com/.../WebEOC_Road_Closures/FeatureServer/0/query';

interface RoadIncident {
  objectid: number;
  incident_id: string;
  incident_type: string;
  status: string;
  severity: string;
  road_id: string;
  road_name: string;
  slk: number;
  latitude: number;
  longitude: number;
  description: string;
  reported_date: string;
  estimated_clearance?: string;
  traffic_impact: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'all';
  const roadId = searchParams.get('road_id');
  const slkStart = searchParams.get('slk_start');
  const slkEnd = searchParams.get('slk_end');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius') || '10'; // km

  try {
    if (action === 'all') {
      // Get all active incidents
      const incidents = await fetchActiveIncidents();
      return NextResponse.json({
        success: true,
        count: incidents.length,
        incidents,
        lastUpdated: new Date().toISOString()
      });
    }

    if (action === 'road' && roadId) {
      // Get incidents for specific road
      const incidents = await fetchIncidentsForRoad(roadId, slkStart, slkEnd);
      return NextResponse.json({
        success: true,
        road_id: roadId,
        count: incidents.length,
        incidents
      });
    }

    if (action === 'nearby' && lat && lon) {
      // Get incidents near coordinates
      const incidents = await fetchNearbyIncidents(
        parseFloat(lat),
        parseFloat(lon),
        parseFloat(radius)
      );
      return NextResponse.json({
        success: true,
        count: incidents.length,
        incidents
      });
    }

    if (action === 'closures') {
      // Get road closures
      const closures = await fetchRoadClosures();
      return NextResponse.json({
        success: true,
        count: closures.length,
        closures
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing parameters'
    }, { status: 400 });

  } catch (error) {
    console.error('Incidents API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch incident data'
    }, { status: 500 });
  }
}

async function fetchActiveIncidents(): Promise<RoadIncident[]> {
  const params = new URLSearchParams({
    where: "status = 'Active'",
    outFields: '*',
    returnGeometry: 'true',
    f: 'json'
  });

  const response = await fetch(`${INCIDENTS_URL}?${params}`);
  const data = await response.json();

  return transformIncidents(data.features);
}

async function fetchIncidentsForRoad(
  roadId: string,
  slkStart?: string | null,
  slkEnd?: string | null
): Promise<RoadIncident[]> {
  let whereClause = `road_id = '${roadId}' AND status = 'Active'`;

  if (slkStart && slkEnd) {
    whereClause += ` AND slk >= ${slkStart} AND slk <= ${slkEnd}`;
  }

  const params = new URLSearchParams({
    where: whereClause,
    outFields: '*',
    returnGeometry: 'true',
    f: 'json'
  });

  const response = await fetch(`${INCIDENTS_URL}?${params}`);
  const data = await response.json();

  return transformIncidents(data.features);
}

async function fetchNearbyIncidents(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<RoadIncident[]> {
  // Use ArcGIS spatial filter
  const params = new URLSearchParams({
    where: "status = 'Active'",
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    distance: (radiusKm * 1000).toString(),
    units: 'esriSRUnit_Meter',
    outFields: '*',
    returnGeometry: 'true',
    f: 'json'
  });

  const response = await fetch(`${INCIDENTS_URL}?${params}`);
  const data = await response.json();

  return transformIncidents(data.features);
}

function transformIncidents(features: any[]): RoadIncident[] {
  return features.map(f => ({
    objectid: f.attributes.objectid,
    incident_id: f.attributes.incident_id,
    incident_type: f.attributes.incident_type,
    status: f.attributes.status,
    severity: f.attributes.severity,
    road_id: f.attributes.road_id,
    road_name: f.attributes.road_name,
    slk: f.attributes.slk,
    latitude: f.geometry?.y,
    longitude: f.geometry?.x,
    description: f.attributes.description,
    reported_date: f.attributes.reported_date,
    estimated_clearance: f.attributes.estimated_clearance,
    traffic_impact: f.attributes.traffic_impact
  }));
}

async function fetchRoadClosures() {
  const params = new URLSearchParams({
    where: "status = 'Current'",
    outFields: '*',
    returnGeometry: 'true',
    f: 'json'
  });

  const response = await fetch(`${CLOSURES_URL}?${params}`);
  const data = await response.json();

  return data.features?.map((f: any) => ({
    objectid: f.attributes.objectid,
    closure_id: f.attributes.closure_id,
    closure_type: f.attributes.closure_type,
    road_id: f.attributes.road_id,
    road_name: f.attributes.road_name,
    start_slk: f.attributes.start_slk,
    end_slk: f.attributes.end_slk,
    start_date: f.attributes.start_date,
    end_date: f.attributes.end_date,
    reason: f.attributes.reason,
    detour_route: f.attributes.detour_route
  })) || [];
}
```

---

## Frontend Component

### IncidentsSection.tsx

```typescript
'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react';

interface Incident {
  incident_id: string;
  incident_type: string;
  severity: string;
  road_id: string;
  road_name: string;
  slk: number;
  description: string;
  traffic_impact: string;
  estimated_clearance?: string;
}

interface IncidentsSectionProps {
  roadId?: string;
  slkStart?: number;
  slkEnd?: number;
}

export function IncidentsSection({ roadId, slkStart, slkEnd }: IncidentsSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidents();

    // Refresh every 5 minutes
    const interval = setInterval(fetchIncidents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [roadId, slkStart, slkEnd]);

  async function fetchIncidents() {
    setLoading(true);
    try {
      let url = '/api/incidents?action=all';
      if (roadId) {
        url = `/api/incidents?action=road&road_id=${roadId}`;
        if (slkStart && slkEnd) {
          url += `&slk_start=${slkStart}&slk_end=${slkEnd}`;
        }
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setIncidents(data.incidents);
        setLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'major':
        return 'text-red-500 bg-red-900/30';
      case 'moderate':
        return 'text-yellow-500 bg-yellow-900/30';
      case 'minor':
        return 'text-blue-500 bg-blue-900/30';
      default:
        return 'text-gray-400 bg-gray-800';
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'major':
        return '🔴';
      case 'moderate':
        return '🟡';
      case 'minor':
        return '🔵';
      default:
        return '⚪';
    }
  }

  const activeCount = incidents.filter(i => i.status !== 'Cleared').length;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <AlertTriangle className={activeCount > 0 ? 'text-red-400' : 'text-gray-400'} size={18} />
          <span className="font-medium">
            Road Incidents
            {activeCount > 0 && (
              <span className="ml-2 text-red-400">({activeCount} active)</span>
            )}
          </span>
        </div>
        {loading && <Loader2 className="animate-spin" size={18} />}
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-700">
          {incidents.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {loading ? 'Loading incidents...' : 'No active incidents'}
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {incidents.map((incident) => (
                <div key={incident.incident_id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span>{getSeverityIcon(incident.severity)}</span>
                      <span className={`text-sm font-medium ${getSeverityColor(incident.severity)}`}>
                        {incident.severity.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {incident.incident_type}
                    </span>
                  </div>

                  <div className="mt-1">
                    <span className="font-mono text-green-400">{incident.road_id}</span>
                    <span className="text-gray-400 mx-2">SLK {incident.slk.toFixed(2)}</span>
                  </div>

                  <p className="text-sm text-gray-300 mt-1">{incident.description}</p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Impact: {incident.traffic_impact}
                    </span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${incident.road_name}+SLK+${incident.slk}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Navigate
                    </a>
                  </div>

                  {incident.estimated_clearance && (
                    <p className="text-xs text-yellow-400 mt-1">
                      Est. clearance: {new Date(incident.estimated_clearance).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {lastUpdated && (
            <div className="px-3 py-2 bg-gray-900 text-xs text-gray-500 text-center">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Drive Page Integration

### Incident Warning Banner

```typescript
// In drive/page.tsx

const [nearbyIncident, setNearbyIncident] = useState<Incident | null>(null);

// Check for nearby incidents when position updates
useEffect(() => {
  if (!roadInfo || !currentSlk) return;

  async function checkIncidents() {
    try {
      const response = await fetch(
        `/api/incidents?action=road&road_id=${roadInfo.road_id}&slk_start=${currentSlk - 5}&slk_end=${currentSlk + 5}`
      );
      const data = await response.json();

      if (data.success && data.incidents.length > 0) {
        // Find closest incident ahead
        const aheadIncidents = data.incidents.filter(i =>
          direction === 'increasing' ? i.slk > currentSlk : i.slk < currentSlk
        );

        if (aheadIncidents.length > 0) {
          setNearbyIncident(aheadIncidents[0]);
        } else {
          setNearbyIncident(null);
        }
      }
    } catch (error) {
      console.error('Failed to check incidents:', error);
    }
  }

  checkIncidents();
}, [roadInfo, currentSlk, direction]);

// Render warning banner
{nearbyIncident && (
  <div className="bg-red-900/80 border border-red-500 rounded-lg p-3 mb-4">
    <div className="flex items-center gap-2">
      <AlertTriangle className="text-red-400" size={20} />
      <span className="font-bold text-red-200">
        INCIDENT AHEAD - {Math.abs(nearbyIncident.slk - currentSlk).toFixed(1)} km
      </span>
    </div>
    <p className="text-sm text-red-100 mt-1">
      {nearbyIncident.road_id} SLK {nearbyIncident.slk.toFixed(2)} - {nearbyIncident.incident_type}
    </p>
    <p className="text-xs text-red-300">
      {nearbyIncident.description}
    </p>
  </div>
)}
```

---

## Caching Strategy

```typescript
// Cache incidents for 5 minutes
const INCIDENTS_CACHE_KEY = 'mrwa_incidents_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedIncidents {
  timestamp: number;
  incidents: RoadIncident[];
}

function getCachedIncidents(): RoadIncident[] | null {
  const cached = localStorage.getItem(INCIDENTS_CACHE_KEY);
  if (!cached) return null;

  const data: CachedIncidents = JSON.parse(cached);
  if (Date.now() - data.timestamp > CACHE_DURATION) {
    return null; // Cache expired
  }

  return data.incidents;
}

function setCachedIncidents(incidents: RoadIncident[]) {
  const data: CachedIncidents = {
    timestamp: Date.now(),
    incidents
  };
  localStorage.setItem(INCIDENTS_CACHE_KEY, JSON.stringify(data));
}
```

---

## Benefits for Traffic Controllers

1. **Real-time Awareness** - Know about crashes, breakdowns, and roadworks before arriving
2. **Route Planning** - Avoid areas with major incidents
3. **Safety** - Be prepared for traffic queues and changed conditions
4. **Work Zone Coordination** - Know if other works are happening nearby
5. **Time Estimation** - Factor incident delays into travel time

---

## Limitations

1. **Internet Required** - Unlike road data, incidents need live updates
2. **API Access** - WebEOC API may require authentication or rate limiting
3. **Data Quality** - Incident details depend on field reports
4. **Coverage** - May not include all local road incidents

---

*This is a conceptual design based on the MRWA WebEOC data structure. Actual implementation would require confirmed API access and field testing.*
