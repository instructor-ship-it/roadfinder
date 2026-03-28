# RC 1.9.1 Key Learnings & Concepts

> **Version:** RC 1.9.1
> **Date:** June 2025
> **Author:** Development Session Notes

This document captures all key learnings, architectural decisions, and coding patterns from the RC 1.9.1 development session.

---

## Table of Contents

1. [Calculated Status vs Stored Status](#1-calculated-status-vs-stored-status)
2. [Sign Status Lifecycle](#2-sign-status-lifecycle-sign-level-retrieval-types)
3. [Route Optimization with TSP](#3-route-optimization-with-tsp-travelling-salesman-problem)
4. [Haversine Formula for GPS Distance](#4-haversine-formula-for-gps-distance)
5. [Google Maps URL Format](#5-google-maps-url-format-for-current-location-start)
6. [Button Consolidation Pattern](#6-button-consolidation-pattern)
7. [Sign-Level vs Job-Level Architecture](#7-sign-level-vs-job-level-architecture)
8. [Manual Override System with Undo](#8-manual-override-system-with-undo)
9. [OSRM Distance Matrix API](#9-osrm-distance-matrix-api)
10. [Connectivity Detection for Hybrid Routing](#10-connectivity-detection-for-hybrid-routing)
11. [Print Report via Popup Window](#11-print-report-via-popup-window)
12. [localStorage for Data Persistence](#12-localstorage-for-aftercare-data-persistence)
13. [Date Handling Best Practices](#13-date-handling-best-practices)
14. [Conditional Button Rendering Pattern](#14-conditional-button-rendering-pattern)
15. [React useMemo for Computed Values](#15-react-usememo-for-computed-values)
16. [GPS to SLK Mapping](#16-gps-to-slk-mapping-inverse-geocoding)
17. [Direction Detection](#17-direction-detection-true-left-vs-true-right)
18. [IndexedDB for Large Offline Datasets](#18-indexeddb-for-large-offline-datasets)
19. [Next.js API Routes](#19-nextjs-api-routes-for-server-side-operations)
20. [TypeScript Interfaces](#20-typescript-interfaces-for-type-safety)
21. [Export/Import Pattern](#21-exportimport-pattern-for-data-backup)
22. [SSR Guards](#22-ssr-server-side-rendering-guards)
23. [React Form State Management](#23-react-form-state-management-pattern)
24. [ID Generation](#24-id-generation-for-unique-identifiers)
25. [Coordinate Precision Handling](#25-coordinate-precision-handling)
26. [Printable Report HTML Generation](#26-printable-report-html-generation)
27. [Data Persistence Strategy Summary](#27-data-persistence-strategy-summary)
28. [Speeding Alert Implementation](#28-speeding-alert-with-wa-fine-information)
29. [Warning Banner Patterns](#29-warning-banner-patterns)
30. [Settings Drawer Organization](#30-settings-drawer-organization)
31. [Time/Distance Calculations](#31-timedistance-calculations-for-driver-awareness)
32. [Traffic Counter Data Recording](#32-traffic-counter-data-recording)
33. [Documents Library Organization](#33-documents-library-organization)
34. [WA Traffic Law Reference](#34-wa-traffic-law-reference)
35. [Component Consolidation Pattern](#35-component-consolidation-pattern)

---

## 1. Calculated Status vs Stored Status

### The Problem

Signs have two status values that can differ:
- **Stored Status** (`sign.status`) - The value saved in localStorage
- **Calculated Status** (`calculateSignStatus(sign)`) - Real-time derivation from `retrieval_type` + time elapsed

### The Fix

```typescript
// BEFORE (incorrect) - checking stored status which could be stale
if (sign.status === 'retrieved') continue;

// AFTER (correct) - using real-time calculated status
const calculatedStatus = calculateSignStatus(sign);
if (calculatedStatus === 'retrieved') continue;
```

### Why This Matters

- A sign with `retrieval_type: 'standard'` becomes "due-retrieval" after 2 days automatically
- A sign with `retrieval_type: 'maintain-weekly'` becomes "due-maintenance" every 7 days
- The stored status might not reflect the current actual status
- SLK tracking must use calculated status to properly detect signs needing attention

### Files Affected
- `src/lib/aftercare.ts` - `getUpcomingSigns()`, `getJobsForRoad()`
- `src/app/drive/page.tsx` - AfterCare indicator

---

## 2. Sign Status Lifecycle (Sign-Level Retrieval Types)

Each sign has its own independent lifecycle based on `retrieval_type`:

| Retrieval Type | Status Calculation |
| ------------------ | ---------------------- |
| `standard` | Due after 2 days from `placed_date` |
| `scheduled` | Due on `retrieval_date` |
| `maintain-daily` | Due every 1 day from `last_maintained_date` |
| `maintain-weekly` | Due every 7 days |
| `maintain-monthly` | Due every 30 days |
| `tba` | Always "placed" (indefinite) |

### Key Concept

Job status is now **aggregated** from sign statuses, not stored independently.

---

## 3. Route Optimization with TSP (Travelling Salesman Problem)

Implemented in `src/lib/route-optimizer.ts`:

```typescript
// Nearest Neighbor Algorithm - fast approximation
export function solveTSPNearestNeighbor(distances: number[][], startIndex = 0): number[] {
  const visited = new Set<number>();
  const route = [startIndex];
  visited.add(startIndex);
  
  while (visited.size < distances.length) {
    // Find nearest unvisited point
    let nearestDist = Infinity;
    let nearestIdx = -1;
    
    for (let i = 0; i < distances.length; i++) {
      if (!visited.has(i) && distances[current][i] < nearestDist) {
        nearestDist = distances[current][i];
        nearestIdx = i;
      }
    }
    
    route.push(nearestIdx);
    visited.add(nearestIdx);
  }
  
  return route;
}
```

### Hybrid Distance Calculation

| Mode | Method | Use Case |
| ---- | ------ | -------- |
| Online | OSRM API | Road distances (accurate) |
| Offline | Haversine | Straight-line distance (fallback) |

---

## 4. Haversine Formula for GPS Distance

```typescript
// Calculate straight-line distance between GPS coordinates
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

---

## 5. Google Maps URL Format for Current Location Start

```typescript
// Double-slash format: /dir// = start from current location
// Shows waypoints as A (current), B, C, D etc.
const googleMapsUrl = `https://www.google.com/maps/dir//${coords}`;
```

### Benefits

- Navigation starts from user's current GPS position
- No need to specify start point
- Works automatically when opened on mobile

---

## 6. Button Consolidation Pattern

Instead of separate sections for different actions, combine related buttons in a single row with conditional rendering:

```typescript
{(signStatusCounts.dueRetrieval > 0 || signStatusCounts.dueMaintenance > 0 || jobs.length > 0) && (
  <div className="flex gap-2 flex-wrap">
    {signStatusCounts.dueRetrieval > 0 && <Button>Retrieve</Button>}
    {signStatusCounts.dueMaintenance > 0 && <Button>Maintain</Button>}
    {jobs.length > 0 && <Button>Report</Button>}
  </div>
)}
```

### Benefits

- Buttons only appear when relevant
- Flexible wrapping for mobile
- Reduced visual clutter

---

## 7. Sign-Level vs Job-Level Architecture

### Previous Architecture (Job-Level)

```
Job
├── retrieval_type: 'standard'  → Applied to ALL signs
├── retrieval_date: '2026-03-10'
└── signs: [Sign1, Sign2, Sign3]
```

### New Architecture (Sign-Level)

```
Job (container only)
├── id, road_id, road_name, notes
└── signs: [
      Sign1 { retrieval_type: 'standard', status: 'due-retrieval' },
      Sign2 { retrieval_type: 'maintain-weekly', status: 'placed' },
      Sign3 { retrieval_type: 'tba', status: 'placed' }
    ]
```

### Job Status = Aggregate of Signs

```typescript
export function calculateJobStatus(job: AfterCareJob): ComputedJobStatus {
  for (const sign of job.signs) {
    const signStatus = calculateSignStatus(sign);
    
    if (signStatus === 'due-retrieval') hasDueRetrieval = true;
    if (signStatus === 'due-maintenance') hasDueMaintenance = true;
    if (signStatus === 'retrieved') continue;
    else allRetrieved = false;
  }
  
  // Priority: due-retrieval > due-maintenance > tba > active
  if (allRetrieved) return 'retrieved';
  if (hasDueRetrieval) return 'due-retrieval';
  if (hasDueMaintenance) return 'due-maintenance';
  return 'active';
}
```

---

## 8. Manual Override System with Undo

### Concept

Users can manually override auto-calculated status, but can also undo it.

```typescript
// Marking early retrieval (manual override)
updateSignInJob(jobId, signId, {
  status: 'due-retrieval',
  status_manually_set: true  // Flag to prevent auto-calculation
});

// Undo - restore to auto-calculated status
updateSignInJob(jobId, signId, {
  status_manually_set: false  // Allow auto-calc again
});
```

### The `status_manually_set` Flag

| Value | Behavior |
| ------ | -------- |
| `true` | Use stored status, don't recalculate |
| `false` | Use `calculateSignStatus()` for real-time status |

---

## 9. OSRM Distance Matrix API

For efficient route optimization with multiple points:

```typescript
// Single API call gets distances between ALL points
export async function getOSRMDistanceMatrix(
  points: { lat: number; lon: number }[]
): Promise<{ distances: number[][]; durations: number[][] } | null> {
  const coords = points.map(p => `${p.lon},${p.lat}`).join(';');
  const response = await fetch(
    `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration`
  );
  
  // Returns N×N matrix of distances and travel times
  return {
    distances: data.distances,  // In kilometers
    durations: data.durations    // In minutes
  };
}
```

### Why Matrix API

- N points requires N² individual distance calls
- Matrix API does it in ONE call
- Much faster for route optimization

---

## 10. Connectivity Detection for Hybrid Routing

```typescript
export async function checkConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('https://router.project-osrm.org/', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)  // 3-second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Use in route optimization
const isOnline = await checkConnectivity();
if (isOnline) {
  distances = await getOSRMDistanceMatrix(points);
} else {
  distances = calculateHaversineMatrix(points);
}
```

---

## 11. Print Report via Popup Window

```typescript
const handlePrintReport = () => {
  const printWindow = window.open('', '_blank');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AfterCare Report</title>
      <style>
        @media print { 
          body { -webkit-print-color-adjust: exact; } 
        }
      </style>
    </head>
    <body>
      ${reportContent}
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();  // Triggers browser print dialog
};
```

### Benefits

- No server-side PDF generation needed
- User can print or save as PDF from browser
- Works offline

---

## 12. localStorage for AfterCare Data Persistence

```typescript
// Simple localStorage wrapper with type safety
export function getAfterCareJobs(): AfterCareJob[] {
  if (typeof window === 'undefined') return [];  // SSR guard
  try {
    const data = localStorage.getItem('afterCareJobs');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveAfterCareJobs(jobs: AfterCareJob[]): void {
  if (typeof window === 'undefined') return;  // SSR guard
  localStorage.setItem('afterCareJobs', JSON.stringify(jobs));
}
```

### Why localStorage

| Benefit | Description |
| -------- | ----------- |
| Vercel Compatible | Works on read-only filesystem |
| Persists | Data survives browser close |
| Offline | No server needed |
| Simple | No backend required |

---

## 13. Date Handling Best Practices

```typescript
// Always use ISO format for storage
export function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];  // '2026-03-09'
}

// Display in Australian format
export function formatAusDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  // '09/03/2026'
}

// Calculate days until (handles timezone correctly)
export function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);  // Reset time to midnight
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
```

---

## 14. Conditional Button Rendering Pattern

Only show buttons when there's data to act on:

```typescript
// Only show retrieval button if signs need retrieval
{signStatusCounts.dueRetrieval > 0 && (
  <Button onClick={handleOpenAllRetrievalRoute}>
    🔴 Retrieve ({signStatusCounts.dueRetrieval})
  </Button>
)}

// Only show maintain button if signs need maintenance
{signStatusCounts.dueMaintenance > 0 && (
  <Button onClick={handleOpenAllMaintenanceRoute}>
    🟡 Maintain ({signStatusCounts.dueMaintenance})
  </Button>
)}

// Only show section if ANY buttons would show
{(signStatusCounts.dueRetrieval > 0 || signStatusCounts.dueMaintenance > 0) && (
  <div className="route-buttons">
    {/* buttons here */}
  </div>
)}
```

---

## 15. React useMemo for Computed Values

Avoid recalculating on every render:

```typescript
// Expensive computation - only recalculate when jobs change
const signStatusCounts = useMemo(() => {
  return countSignsByStatus(jobs);
}, [jobs]);

// In component - uses cached value
{signStatusCounts.dueRetrieval > 0 && <Button>...</Button>}
```

### Performance Impact

| Without useMemo | With useMemo |
| ----------------- | ---------------- |
| Counts recalculated on every keystroke | Only recalculated when `jobs` changes |
| Poor performance with large datasets | Optimized performance |

---

## 16. GPS to SLK Mapping (Inverse Geocoding)

### Concept

Convert GPS coordinates to road ID and SLK position.

```typescript
export async function findRoadNearGps(
  lat: number, 
  lon: number, 
  maxDistanceKm: number = 0.5
): Promise<{ road_id: string; road_name: string; slk: number } | null> {
  
  const roads = await getRoadsNearPoint(lat, lon, maxDistanceKm);
  
  if (roads.length === 0) return null;
  
  let closestRoad = null;
  let closestDistance = Infinity;
  
  for (const road of roads) {
    const projection = projectPointOnRoad(lat, lon, road.geometry);
    const distance = projection.distance;
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestRoad = {
        road_id: road.road_id,
        road_name: road.road_name,
        slk: projection.slk
      };
    }
  }
  
  return closestRoad;
}
```

### Key Challenge

GPS gives lat/lon, but TCs need SLK. The projection algorithm interpolates along road geometry.

---

## 17. Direction Detection (True Left vs True Right)

### Australian Road Convention

| Term | Meaning | SLK Direction |
| ---- | ------- | ------------- |
| True Left | Left Carriageway | INCREASING SLK |
| True Right | Right Carriageway | DECREASING SLK |

```typescript
function detectDirection(
  currentSlk: number, 
  previousSlk: number, 
  threshold: number = 0.001
): 'increasing' | 'decreasing' | 'unknown' {
  const delta = currentSlk - previousSlk;
  
  if (delta > threshold) return 'increasing';
  if (delta < -threshold) return 'decreasing';
  return 'unknown';
}

// Filter signs based on travel direction
function getUpcomingSigns(roadId: string, currentSlk: number, direction: 'increasing' | 'decreasing') {
  for (const sign of job.signs) {
    if (direction === 'increasing' && sign.direction !== 'True Left') continue;
    if (direction === 'decreasing' && sign.direction !== 'True Right') continue;
    
    // Check if sign is ahead
    if (direction === 'increasing' && sign.slk < currentSlk) continue;
    if (direction === 'decreasing' && sign.slk > currentSlk) continue;
    
    signs.push(sign);
  }
}
```

---

## 18. IndexedDB for Large Offline Datasets

### Problem

localStorage has ~5MB limit. We have 69,000+ roads.

### IndexedDB vs localStorage

| Feature | localStorage | IndexedDB |
| ------- | ------------ | --------- |
| Size Limit | ~5MB | ~50MB+ |
| Data Type | Strings only | Objects, arrays, blobs |
| Queries | Key-value only | Indexes, ranges |
| Async | No | Yes |
| Simple | Yes | No |

```typescript
export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RoadDataDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('roads')) {
        const roadStore = db.createObjectStore('roads', { keyPath: 'road_id' });
        roadStore.createIndex('region', 'region', { unique: false });
      }
    };
  });
}
```

---

## 19. Next.js API Routes for Server-Side Operations

```typescript
// src/app/api/roads/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  switch (action) {
    case 'locate':
      const roadId = searchParams.get('road_id');
      const slk = parseFloat(searchParams.get('slk') || '0');
      const coords = await getCoordinatesFromSlk(roadId, slk);
      return Response.json({ latitude: coords.lat, longitude: coords.lon });
      
    case 'regions':
      const regions = await getRegions();
      return Response.json({ regions });
      
    default:
      return Response.json({ error: 'Invalid action' }, { status: 400 });
  }
}
```

### Why API Routes

- Hide external API keys
- Server-side caching
- Data transformation
- Bypass CORS restrictions

---

## 20. TypeScript Interfaces for Type Safety

```typescript
// Core sign interface
export interface AfterCareSign {
  id: string;
  slk: number;
  lat: number | null;
  lon: number | null;
  category: SignCategory;
  sign_type: string;
  description: string;
  direction: SignDirection;
  placed_date: string;
  placed_time?: string;
  retrieval_type: RetrievalType;
  retrieval_date?: string;
  last_maintained_date?: string;
  retrieved_date?: string;
  status: SignStatus;
  status_manually_set?: boolean;
  notes: string;
}

// Union types for constrained values
export type SignCategory = 'surface' | 'speed' | 'hazard';
export type SignDirection = 'True Left' | 'True Right';
export type RetrievalType = 'standard' | 'scheduled' | 'maintain-daily' | 'maintain-weekly' | 'maintain-monthly' | 'tba';
export type SignStatus = 'placed' | 'due-retrieval' | 'due-maintenance' | 'maintained' | 'retrieved';
```

### Benefits

- IDE autocomplete
- Compile-time error checking
- Self-documenting code
- Refactoring safety

---

## 21. Export/Import Pattern for Data Backup

```typescript
export function exportAllJobs(): string {
  return JSON.stringify(getAfterCareJobs(), null, 2);
}

export function importJobs(json: string, replace: boolean = false): { success: boolean; count: number; error?: string } {
  try {
    const imported = JSON.parse(json) as AfterCareJob[];
    
    if (!Array.isArray(imported)) {
      return { success: false, count: 0, error: 'Invalid format' };
    }
    
    // Validate structure
    for (const job of imported) {
      if (!job.id || !job.road_id || !Array.isArray(job.signs)) {
        return { success: false, count: 0, error: 'Invalid job structure' };
      }
    }
    
    if (replace) {
      saveAfterCareJobs(imported);
    } else {
      // Merge, avoiding duplicates
      const existing = getAfterCareJobs();
      const merged = [...existing];
      for (const job of imported) {
        if (!merged.find(j => j.id === job.id)) {
          merged.push(job);
        }
      }
      saveAfterCareJobs(merged);
    }
    
    return { success: true, count: imported.length };
  } catch (e) {
    return { success: false, count: 0, error: 'Failed to parse JSON' };
  }
}
```

---

## 22. SSR (Server-Side Rendering) Guards

```typescript
// Safe localStorage access
export function getAfterCareJobs(): AfterCareJob[] {
  // Guard for SSR
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem('afterCareJobs');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Safe IndexedDB initialization
export async function initDB(): Promise<IDBDatabase | null> {
  // Guard for SSR
  if (typeof window === 'undefined') return null;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RoadDataDB', 1);
    // ...
  });
}
```

### Without Guards

Next.js throws `ReferenceError: localStorage is not defined` during server-side render.

---

## 23. React Form State Management Pattern

```typescript
function AddJobView() {
  // Individual state for each field
  const [roadId, setRoadId] = useState('');
  const [roadName, setRoadName] = useState('');
  const [notes, setNotes] = useState('');
  const [signs, setSigns] = useState<AfterCareSign[]>([]);
  
  // Sign entry state
  const [signSlk, setSignSlk] = useState('');
  const [signCategory, setSignCategory] = useState<SignCategory>('surface');
  const [signType, setSignType] = useState('');
  
  // Add sign to list
  const handleAddSign = () => {
    if (!signSlk || !signType) {
      alert('Please enter SLK and sign type');
      return;
    }
    
    const newSign: AfterCareSign = {
      id: generateId(),
      slk: parseFloat(signSlk),
      category: signCategory,
      sign_type: signType,
      // ... other fields
    };
    
    setSigns([...signs, newSign]);
    setSignType('');  // Reset for next entry
  };
}
```

### Pattern

Keep form state separate from data state for cleaner updates.

---

## 24. ID Generation for Unique Identifiers

```typescript
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Examples:
// 1709912345678-abc123def
// 1709912345679-xyz789ghi
```

### Why This Works

| Component | Purpose |
| --------- | ------- |
| `Date.now()` | Temporal uniqueness (milliseconds) |
| `Math.random()` | Collision safety within same millisecond |
| No dependencies | Simple, no external libraries |

---

## 25. Coordinate Precision Handling

```typescript
// SLK precision (2 decimal places = ~10 meters)
const slkDisplay = roadInfo.slk.toFixed(2);  // "64.64"

// GPS precision (6 decimal places = ~0.1 meters)
const latDisplay = coords.lat.toFixed(6);  // "-32.099427"
const lonDisplay = coords.lon.toFixed(6);  // "116.907960"

// Distance rounding for display
const distanceKm = haversineDistance(lat1, lon1, lat2, lon2);
const displayDistance = distanceKm < 1 
  ? `${Math.round(distanceKm * 1000)}m`   // Show meters if < 1km
  : `${distanceKm.toFixed(2)}km`;        // Show km otherwise
```

---

## 26. Printable Report HTML Generation

```typescript
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AfterCare Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .badge { 
      display: inline-block; 
      padding: 2px 6px; 
      border-radius: 3px; 
    }
    .badge-retrieval { background: #fee2e2; color: #991b1b; }
    .badge-maintenance { background: #fef9c3; color: #92400e; }
    @media print { 
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
    }
  </style>
</head>
<body>
  <h1>🚧 AfterCare Signs Report</h1>
  <p>Generated: ${formatAusDate(new Date())}</p>
  
  ${report.jobsByStatus.dueRetrieval.map(job => `
    <div class="job">
      <h3>${job.road_id} - ${job.road_name}</h3>
      ${job.signs.map(s => `
        <div class="sign">
          SLK ${s.slk.toFixed(2)} - ${s.sign_type}
          <span class="badge badge-retrieval">${s.retrieval_type}</span>
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>
`;
```

### Key CSS for Printing

- `@media print` ensures colors print correctly
- `-webkit-print-color-adjust: exact` forces color printing

---

## 27. Data Persistence Strategy Summary

| Data Type | Storage | Size | Why |
| -------------- | --------- | ---- | --- |
| AfterCare Jobs | localStorage | Small | User-editable, simple |
| Speed Overrides | localStorage | Small | User-editable, simple |
| Road Data (69K+) | IndexedDB | Large | Read-only, bulk queries |
| Speed Zones | IndexedDB | Large | Read-only, spatial queries |
| App Preferences | localStorage | Tiny | Key-value pairs |

---

## 28. Speeding Alert with WA Fine Information

### Concept

Display Western Australian fine information when the user exceeds the speed limit.

```typescript
interface SpeedingAlert {
  currentSpeed: number;
  speedLimit: number;
  kmOver: number;
  fineAmount: number;
  demeritPoints: number;
  threshold: number; // km/h over to trigger
}

// WA fine structure (approximate)
const getWAFine = (kmOver: number): { fine: number; points: number } => {
  if (kmOver <= 9) return { fine: 100, points: 0 };
  if (kmOver <= 19) return { fine: 200, points: 2 };
  if (kmOver <= 29) return { fine: 400, points: 3 };
  if (kmOver <= 40) return { fine: 800, points: 4 };
  return { fine: 1500, points: 6 }; // 40+ km/h over
};
```

### Implementation

- Real-time speed vs limit comparison
- Configurable threshold (default: 5 km/h over)
- Fine amounts and demerit points displayed
- "Slow Down" warning message

---

## 29. Warning Banner Patterns

### Weather Warning Banner

```typescript
interface WeatherWarning {
  type: string;
  title: string;
  description: string;
  issued: Date;
  expires?: Date;
}

// Trigger: BOM severe weather warnings for current location
// Display: Amber/yellow banner at top of page
// Auto-refresh: Every 30 minutes
// Dismissable: Can be dismissed for current session
```

### Incident Warning Banner

```typescript
interface RoadIncident {
  type: 'crash' | 'roadworks' | 'hazard' | 'flooding';
  location: string;
  delay?: number; // minutes
  lastUpdated: Date;
}

// Trigger: Active road incidents on current road
// Display: Red/amber banner at top of page
// Integration: MRWA Traffic Alerts API
// Click: Opens incident details panel
```

---

## 30. Settings Drawer Organization

### Pattern

Organize settings into logical sections for easier navigation.

```typescript
const settingsSections = [
  { id: 'about', title: 'About', icon: 'ⓘ' },
  { id: 'admin', title: 'Admin Data Sync', icon: '🔄' },
  { id: 'gps', title: 'GPS & Tracking', icon: '📍' },
  { id: 'offline', title: 'Offline Data', icon: '📥' },
  { id: 'prefs', title: 'Preferences', icon: '⚙' },
  { id: 'overrides', title: 'Speed Zone Overrides', icon: '🚗' },
  { id: 'tools', title: 'TC Tools', icon: '🔧' },
];
```

### UI Pattern

- Bottom sheet drawer (mobile-friendly)
- Collapsible sections
- Grouped settings within sections
- Toggle switches for boolean settings
- Sliders for numeric ranges
- Dropdown for selection options

---

## Quick Reference: Architecture Patterns

| Pattern | Use Case |
| ------- | -------- |
| **Calculated vs Stored** | Real-time status derivation |
| **Sign-Level Types** | Independent lifecycle per sign |
| **Hybrid Online/Offline** | Graceful degradation |
| **localStorage** | Client-side persistence |
| **useMemo** | Performance optimization |
| **Conditional Rendering** | Clean UI with relevant actions |
| **SSR Guards** | Next.js compatibility |
| **TypeScript Interfaces** | Type safety |
| **Export/Import** | Data backup |

---

## Files Modified in RC 1.9.1

| File | Changes |
| ---- | ------- |
| `src/app/aftercare/page.tsx` | Button layout, print report styling |
| `src/lib/aftercare.ts` | `getUpcomingSigns()`, `getJobsForRoad()` fixes |
| `src/lib/route-optimizer.ts` | TSP algorithm, OSRM integration |
| `PROJECT_CONTEXT.md` | Version, changelog |
| `README.md` | Version history |
| `worklog.md` | Task entry |
| `docs/*` | All documentation updated to RC 1.9.1 |

---

## Related Documentation

- [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) - Main project documentation
- [README.md](../README.md) - Version history
- [worklog.md](../worklog.md) - Development history
- [RC1_Test_Checklist.md](../RC1_Test_Checklist.md) - Testing checklist

---

*Document generated from RC 1.9.1 development session notes.*

---

## 31. Time/Distance Calculations for Driver Awareness

### Concept

Display time-related metrics to help drivers understand their travel efficiency.

```typescript
// Minutes per km - how long to travel 1km at current speed
function getMinutesPerKm(speedKph: number): string {
  if (speedKph < 1) return '--';
  const minutes = 60 / speedKph;
  if (minutes < 1) {
    return `${Math.round(minutes * 60)}s/km`;
  }
  return `${minutes.toFixed(1)} min/km`;
}

// Time for 10km - useful for route planning
function getTimeFor10km(speedKph: number): string {
  if (speedKph < 1) return '--';
  const totalMinutes = (10 / speedKph) * 60;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} min`;
}
```

### Why This Matters

- Drivers can estimate arrival times
- Helps identify if driving slower/faster than expected
- Useful for work zone timing calculations
- Shows efficiency metric (minutes per km)

---

## 32. Traffic Counter Data Recording

### Concept

Manual traffic counting with structured data storage.

```typescript
interface TrafficCountRecord {
  id: string;
  road_id: string;
  road_name: string;
  slk: number | null;
  lat: number | null;
  lon: number | null;
  region: string;
  duration_minutes: number;
  direction_mode: 'one-way' | 'both-ways';
  // Vehicle counts by type and direction
  true_left_light: number;
  true_left_heavy: number;
  true_right_light: number;
  true_right_heavy: number;
  // Calculated metrics
  total_vehicles: number;
  heavy_percentage: number;
  vph_combined: number;  // Vehicles per hour
}
```

### Calculated Fields

| Field | Formula |
|-------|---------|
| total_light | true_left_light + true_right_light |
| total_heavy | true_left_heavy + true_right_heavy |
| total_vehicles | total_light + total_heavy |
| heavy_percentage | (total_heavy / total_vehicles) × 100 |
| vph_combined | (total_vehicles / duration_minutes) × 60 |

### Use Cases

- Pre-work traffic surveys
- Lane capacity verification
- Heavy vehicle percentage tracking
- Historical count comparison

---

## 33. Documents Library Organization

### Concept

Organize reference documents by category with searchable access.

```typescript
const documentCategories = [
  { id: 'tmp', name: 'Traffic Management Plans', icon: '📋' },
  { id: 'agttm', name: 'AGTTM Parts', icon: '📕' },
  { id: 'cop', name: 'Codes of Practice', icon: '📜' },
  { id: 'standards', name: 'Standards & Guidelines', icon: '📘' },
];
```

### Features

- Search across all documents
- Page-by-page navigation with TGS diagrams
- Offline caching of viewed documents
- Region-specific TMP organization
- Quick access from Settings → About → Documents Library

### URL Structure

```
/library                    # Main library page
/library/[docId]            # Document viewer
/library/[docId]/[pageNum]  # Specific page
/library/tmp/[region]       # Regional TMPs
/library/expanded           # Category overview
```

---

## 34. WA Traffic Law Reference

### Speeding Fines (Western Australia)

| km/h Over Limit | Fine | Demerit Points |
|-----------------|------|----------------|
| 1-9 km/h | $100 | 0 |
| 10-19 km/h | $200 | 2 |
| 20-29 km/h | $400 | 3 |
| 30-40 km/h | $800 | 4 |
| 40+ km/h | $1,200+ | 6-7 |

### Slow Driving Fines

| Offense | Fine |
|---------|------|
| >20 km/h under on freeway (without reason) | $50 |
| Obstruction of traffic | $50 |

### Practical Tolerance

- WA Police typically allow 2-4 km/h tolerance for speedometer variance
- Not legislated - officer discretion
- Do not rely on tolerance as legal protection

---

## 35. Component Consolidation Pattern

### Problem

Multiple pages with duplicate UI elements (hamburger menus, settings drawers).

### Solution

Extract to shared component with consistent interface.

```typescript
// Before: Each page has ~500 lines of drawer code
// After: Single component imported where needed

// src/components/SettingsDrawer.tsx
interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSection?: string;  // Which section to show first
}

export function SettingsDrawer({ open, onOpenChange, defaultSection }: SettingsDrawerProps) {
  // All drawer logic in one place
  // 41KB component shared across pages
}

// Usage in pages
import { SettingsDrawer } from '@/components/SettingsDrawer';

<SettingsDrawer 
  open={drawerOpen} 
  onOpenChange={setDrawerOpen} 
/>
```

### Benefits

| Before | After |
|--------|-------|
| ~500 lines per page | Single import |
| Update 2+ files for changes | Update once |
| Inconsistent behavior | Unified experience |
| Hard to maintain | Easy to maintain |

---

## Quick Reference: Architecture Patterns (Updated)

| Pattern | Use Case |
| ------- | -------- |
| **Calculated vs Stored** | Real-time status derivation |
| **Sign-Level Types** | Independent lifecycle per sign |
| **Hybrid Online/Offline** | Graceful degradation |
| **localStorage** | Client-side persistence |
| **useMemo** | Performance optimization |
| **Conditional Rendering** | Clean UI with relevant actions |
| **SSR Guards** | Next.js compatibility |
| **TypeScript Interfaces** | Type safety |
| **Export/Import** | Data backup |
| **Time/Distance Display** | Driver awareness metrics |
| **Component Consolidation** | Code reuse, maintainability |

---

## Files Modified in RC 1.9.1 (Updated)

| File | Changes |
| ---- | ------- |
| `src/app/aftercare/page.tsx` | Button layout, print report styling |
| `src/app/drive/page.tsx` | Minutes per km, 10km time, speeding alert |
| `src/app/traffic-counter/page.tsx` | New traffic counter page |
| `src/components/SettingsDrawer.tsx` | Unified settings drawer (41KB) |
| `src/lib/aftercare.ts` | `getUpcomingSigns()`, `getJobsForRoad()` fixes |
| `src/lib/traffic-counter-storage.ts` | New traffic counter storage |
| `src/lib/route-optimizer.ts` | TSP algorithm, OSRM integration |
| `PROJECT_CONTEXT.md` | Version, changelog |
| `README.md` | Version history |
| `worklog.md` | Task entry |
| `docs/*` | All documentation updated to RC 1.9.1 |

---

*Document updated from RC 1.9.1 development session notes.*
