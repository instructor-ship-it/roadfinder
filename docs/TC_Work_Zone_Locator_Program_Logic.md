# TC Work Zone Locator

## Program Logic Documentation

**Version RC 1.7.18**

**Western Australia Traffic Controllers**

---

## Table of Contents

1. Application Overview
2. System Architecture
3. Core Algorithms
4. Data Storage Architecture
5. API Route Architecture
6. GPS Tracking System
7. AfterCare Signage Tracking
8. User Interface Components
9. Configuration Settings
10. Error Handling and Edge Cases
11. Performance Considerations
12. Technical Debt and Future Improvements

---

## 1. Application Overview

The TC Work Zone Locator is a Progressive Web Application (PWA) designed specifically for Western Australian Traffic Controllers to locate, plan, and navigate work zones on state and local roads. The application operates in multiple primary modes: a static work zone planning mode, a real-time GPS tracking mode for active traffic control operations, and an AfterCare signage tracking system for managing signs awaiting retrieval.

The core value proposition centers on providing accurate SLK (Straight Line Kilometre) based location information, which is the standard reference system used by Main Roads Western Australia (MRWA) for all road positioning. The application architecture follows a modern Next.js 15 implementation with App Router, utilizing client-side IndexedDB for offline data storage and real-time GPS tracking capabilities.

The design philosophy prioritizes offline-first functionality, ensuring that critical road data remains accessible even in remote areas with limited or no network connectivity. This is particularly important for traffic controllers who frequently work in rural Western Australian locations where cellular coverage may be unreliable or non-existent.

---

## 2. System Architecture

### 2.1 Technology Stack

The application is built on Next.js 15 with the App Router architecture, which provides server-side rendering capabilities and API routes within a single framework. The frontend utilizes React with TypeScript for type safety and improved developer experience. Tailwind CSS handles styling with a custom dark theme optimized for outdoor visibility. The shadcn/ui component library provides accessible, customizable UI components including dialogs, buttons, and input fields. The application runs exclusively on port 3000 in the development environment.

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 with App Router |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS with dark theme |
| UI Components | shadcn/ui (Radix primitives) |
| Storage | IndexedDB + localStorage (client-side) |
| Maps | Leaflet + OpenStreetMap |
| State Management | React hooks + localStorage/sessionStorage |

### 2.2 Page Structure

The application consists of multiple main pages:

- **Home page** (`src/app/page.tsx`): Work zone planning interface
- **Drive page** (`src/app/drive/page.tsx`): Real-time GPS tracking
- **Nearby Signs** (`src/app/drive/nearby-signs/page.tsx`): Signs requiring action
- **AfterCare** (`src/app/aftercare/page.tsx`): Signage tracking management
- **AfterCare Map** (`src/app/aftercare/map/page.tsx`): Full-screen map view
- **Overrides** (`src/app/overrides/page.tsx`): Speed sign override management
- **Calibrate** (`src/app/calibrate/page.tsx`): GPS calibration tool
- **Manual** (`src/app/manual/page.tsx`): User manual page

The home page allows users to select roads by region, specify work zone SLK ranges, and retrieve comprehensive location information including speed zones, nearby amenities, intersections, and weather data. The drive page is designed for active traffic control operations, providing real-time speed monitoring, destination tracking, and navigation assistance. The AfterCare pages manage signage tracking for signs placed on roads awaiting retrieval.

---

## 3. Core Algorithms

### 3.1 Haversine Distance Calculation

The Haversine formula is the fundamental algorithm used throughout the application for calculating great-circle distances between two points on Earth. This formula accounts for the Earth's curvature and provides accurate distance measurements that are essential for GPS-based location finding and proximity calculations. The implementation uses the WGS-84 ellipsoid mean radius of 6,371,000 meters as the Earth's radius constant, which provides a good balance between accuracy and computational efficiency for the application's use cases.

The algorithm converts latitude and longitude differences from degrees to radians, then applies the Haversine formula to calculate the central angle between the two points. This angle is multiplied by the Earth's radius to obtain the distance in meters. The formula is particularly important for the road-finding algorithm, where GPS coordinates must be matched to road geometry points with high precision.

**Key Implementation (src/lib/utils.ts):**

```typescript
const EARTH_RADIUS_M = 6_371_000;

export function haversineDistance(lat1, lon1, lat2, lon2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLambda/2) * Math.sin(dLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS_M * c;
}
```

### 3.2 Extended Kalman Filter (EKF) for GPS

The Extended Kalman Filter implementation represents one of the most sophisticated components of the application, providing optimal GPS position filtering and prediction capabilities. Unlike simple averaging or smoothing algorithms, the EKF provides mathematically optimal filtering for systems with uncertain measurements and known process dynamics. The implementation is specifically optimized for road-based vehicle tracking, incorporating road geometry constraints to improve position accuracy when the vehicle's position can be constrained to a known road segment.

The EKF maintains a state vector containing position (latitude, longitude) and velocity components (vLat, vLon). The filter operates in two phases: predict and update. During the predict phase, the state is propagated forward using a constant velocity model, with process noise added to the covariance matrix to account for acceleration and other unmodeled dynamics. During the update phase, GPS measurements are incorporated using the Kalman gain, which optimally balances prediction uncertainty against measurement noise.

**Key Features of the EKF Implementation:**

- **Position Prediction**: Continues tracking during GPS outages using velocity estimates
- **Uncertainty Estimation**: Provides real-time confidence indicators (high/medium/low/predicted)
- **Road Constraint**: Can snap predictions to known road geometry for improved accuracy
- **Configurable Parameters**: Process noise, prediction limits, and measurement scaling can be adjusted

### 3.3 Road Finding Algorithm

The road finding algorithm (`findRoadNearGps` in offline-db.ts) converts GPS coordinates to road identification and SLK position. This is a critical function that enables the application to determine which road a user is on and their precise position along that road in terms of SLK. The algorithm uses a combination of geometric projection and Haversine distance calculations to find the closest point on any road segment to the given GPS coordinates.

The algorithm processes all road segments stored in IndexedDB, examining each segment's geometry (an array of latitude/longitude points). For each line segment between consecutive geometry points, it projects the GPS position onto the line segment, calculating both the perpendicular distance and the proportional position along the segment. The proportional position is then used to interpolate the SLK value at that point, providing sub-meter accuracy when road geometry data is precise.

**Algorithm Steps:**

1. Iterate through all roads in IndexedDB, examining each segment
2. Calculate cumulative path distances using Haversine for accurate SLK interpolation
3. Project GPS point onto each line segment to find closest approach
4. Check if distance is within maxDistanceKm threshold (default 500m)
5. Calculate SLK by interpolating based on proportional distance along segment
6. Return closest match with road_id, road_name, slk, distance_m, and network_type

### 3.4 Sign Status Calculation Algorithm

The AfterCare system implements a sophisticated sign status calculation that determines when signs are due for retrieval or maintenance. The `calculateSignStatus()` function evaluates each sign based on its retrieval type and time elapsed:

| Retrieval Type | Due Condition |
|----------------|---------------|
| standard | 2 days after placement |
| scheduled | On specified retrieval_date |
| maintain-daily | Daily from last_maintained_date |
| maintain-weekly | Weekly from last_maintained_date |
| maintain-monthly | Monthly from last_maintained_date |
| tba | Never (indefinite) |

The algorithm respects manually set statuses and never changes retrieved signs. Job status is aggregated from all sign statuses using `calculateJobStatus()`.

---

## 4. Data Storage Architecture

### 4.1 IndexedDB Schema

The application uses IndexedDB for client-side storage of all road-related data, enabling full offline functionality. The database schema is designed to optimize the most common query patterns: finding roads by region, retrieving speed zones by road ID, and searching for nearby amenities.

| Object Store | Key Path | Purpose |
|--------------|----------|---------|
| regions | 'region' (string) | Roads grouped by MRWA region |
| speedZones | 'road_id' (string) | Speed limit zones per road |
| metadata | 'key' (string) | Download date, total roads |
| railCrossings | 'road_id' (string) | Railway crossing locations |
| regulatorySigns | 'road_id' (string) | Regulatory sign positions |
| warningSigns | 'road_id' (string) | Warning sign positions |
| datasetMeta | 'dataset' (string) | Sync status per dataset |

### 4.2 Data Persistence Strategy

The application employs a dual-persistence strategy using both localStorage and sessionStorage for different types of state:

**localStorage (persistent across sessions):**
- Default region preference
- GPS tracking configuration (EKF settings, lookahead time, lag compensation)
- Wind gust alert threshold
- Speed sign overrides
- AfterCare jobs and presets

**sessionStorage (cleared when browser session ends):**
- Current work zone selection (region, road ID, start/end SLK)

---

## 5. API Route Architecture

The application implements several API routes using Next.js App Router conventions. These routes handle communication with external data sources (MRWA ArcGIS, Open-Meteo, BOM, Overpass) and provide a clean separation between client-side logic and server-side data fetching. All API routes are implemented in TypeScript with proper error handling and response typing.

### 5.1 Roads API (/api/roads)

The Roads API is the primary interface for road-related data from MRWA ArcGIS services. It supports multiple actions through query parameters:
- 'regions': Returns a list of available MRWA regions
- 'list': Returns roads filtered by region with aggregated SLK ranges
- 'detail': Returns detailed segment information for a specific road
- 'locate': Converts a road ID and SLK to GPS coordinates using geometry interpolation

The POST method handles work zone queries, calculating TC positions, approach zones, and speed zone information for a given road and SLK range.

### 5.2 Weather API (/api/weather)

The Weather API fetches current weather conditions and forecasts from Open-Meteo. The endpoint accepts latitude and longitude parameters and returns current temperature, humidity, wind speed/direction/gust, weather conditions, and UV index. It also provides an hourly forecast for the next 24 hours.

### 5.3 Warnings API (/api/warnings)

The Warnings API retrieves severe weather warnings from the Bureau of Meteorology (BOM) RSS feed for Western Australia. The implementation parses the RSS XML response, extracts warning titles, descriptions, publication dates, and urgency/severity levels.

### 5.4 Places API (/api/places)

The Places API uses the Overpass API (OpenStreetMap) to find nearby amenities relevant to traffic controllers. It searches for hospitals, toilets, and fuel stations within a defined radius of the work zone midpoint.

### 5.5 Intersections API (/api/intersections)

The Intersections API identifies cross roads within a work zone corridor. The current implementation searches for intersecting roads within approximately 100 meters of the work zone boundaries.

---

## 6. GPS Tracking System

### 6.1 useGpsTracking Hook

The useGpsTracking hook (`src/hooks/useGpsTracking.ts`) encapsulates all GPS tracking logic, providing a clean interface for the drive page. The hook manages the EKF instance, handles geolocation API subscriptions, and provides derived state including current position, speed, speed limit comparison, distance to destination, and estimated time of arrival.

**Key State Properties:**

- `position`: Current GPS coordinates (filtered through EKF)
- `roadInfo`: Current road ID, name, SLK, and network type
- `currentSpeed`: Vehicle speed in km/h (EKF filtered)
- `speedLimit`: Posted speed limit for current position
- `isSpeeding`: Boolean flag when exceeding speed limit
- `distanceToDest`: Distance in km to destination SLK
- `eta`: Estimated time of arrival in seconds
- `uncertainty`: Position uncertainty in meters
- `confidence`: Reliability indicator (high/medium/low/predicted)

### 6.2 SLK Direction Detection

The drive page implements SLK direction detection to determine whether the vehicle is traveling towards increasing or decreasing SLK values. This is essential for predicting upcoming speed zone changes. The algorithm tracks consecutive SLK readings and determines direction when the difference exceeds a minimum threshold (0.001 km) to avoid GPS jitter.

### 6.3 Upcoming Speed Zone Detection

The application provides advance warning of speed zone changes by analyzing the road's speed zone data in the direction of travel. The algorithm calculates a lookahead distance based on current speed and configurable lookahead time (default 5 seconds) plus optional GPS lag compensation. It then searches for speed zone boundaries within this lookahead distance and alerts the driver if a speed limit decrease is approaching.

---

## 7. Emergency Location Module

### 7.1 Overview

The Emergency Location Module (`src/lib/emergency.ts`) provides functionality to determine cross roads and nearby emergency facilities when a Traffic Controller needs to report their location in an emergency. This shared module is used by both the home page and drive page, consolidating ~200 lines of previously duplicated code.

### 7.2 Cross Road Detection

The `findCrossRoad()` function uses MRWA Layer 6 (Intersections) to find the nearest intersecting road to the user's position. This is more accurate than geometry-based proximity searches, which can incorrectly identify parallel roads as intersections.

**Key Implementation Details:**
- Queries `/api/nearest-intersections` endpoint
- Uses `resultRecordCount=200` to ensure all nearby intersections are captured
- Filters to only show actual intersecting roads, not parallel roads
- Returns cross road name, distance, and direction

### 7.3 Nearest Town Detection

The `findNearestTown()` function uses OpenStreetMap Nominatim API to find nearby towns and cities, providing context for emergency location reporting (e.g., "5km southeast of Moora").

**Implementation:**
- Searches for `place=city`, `place=town`, `place=suburb` within 50km radius
- Uses Haversine formula for accurate distance calculation
- Calculates cardinal direction using bearing formula

### 7.4 Emergency Facilities

The module provides functions to find the nearest:
- `findNearestHospital()` - Medical facilities
- `findNearestFireStation()` - Fire services
- `findNearestPoliceStation()` - Police services

### 7.5 Utility Functions

The emergency module uses shared utilities from `src/lib/utils.ts`:
- `getBearing(lat1, lon1, lat2, lon2)` - Calculate direction between GPS points
- `getDirectionFromBearing(bearing)` - Convert bearing to cardinal direction (N, NE, E, etc.)
- `formatDistance(meters)` - Format distance as "m" or "km" appropriately

---

## 8. AfterCare Signage Tracking

### 12.1 Overview

The AfterCare system provides comprehensive signage tracking for Traffic Controllers who place signs on roads and need to track them for later retrieval. The system supports multiple retrieval schedules, automatic status calculation, and navigation assistance.

### 12.2 Data Structures

**AfterCareJob:**
```typescript
interface AfterCareJob {
  id: string;
  job_name: string;
  road_id: string;
  road_name: string;
  notes: string;
  date_created: string;
  status: JobStatus;
  work_area_slk_start?: number;
  work_area_slk_end?: number;
  signs: AfterCareSign[];
}
```

**AfterCareSign:**
```typescript
interface AfterCareSign {
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
```

### 12.3 Status Types

**RetrievalType:**
- `standard`: Due 2 days after placement
- `scheduled`: Due on specific date
- `maintain-daily`: Daily maintenance required
- `maintain-weekly`: Weekly maintenance required
- `maintain-monthly`: Monthly maintenance required
- `tba`: Indefinite, awaiting instruction

**SignStatus:**
- `placed`: Sign is active, not yet due
- `due-retrieval`: Ready to be retrieved
- `due-maintenance`: Needs maintenance check
- `maintained`: Recently maintained
- `retrieved`: Sign has been retrieved

### 12.4 Route Optimization

The route optimizer (`src/lib/route-optimizer.ts`) helps plan efficient routes for retrieving multiple signs:
- `optimizeRoute()`: Optimizes visit order using nearest-neighbor algorithm
- `getAllSignsDueForRetrieval()`: Aggregates all signs needing retrieval
- `getAllSignsDueForMaintenance()`: Aggregates all signs needing maintenance
- Generates Google Maps URLs with waypoints for navigation

### 12.5 Map Integration

The AfterCare Map (`/aftercare/map`) uses Leaflet with OpenStreetMap tiles:
- Colored markers indicate sign status (red=retrieval, yellow=maintenance, green=active)
- Filter buttons show specific status groups
- Click markers for sign details
- Auto-centers on available signs

---

## 9. User Interface Components

### 12.1 Home Page Layout

The home page follows a mobile-first responsive design optimized for 400px maximum width, suitable for smartphone use. The header displays the application title and a settings icon. The main input section contains region selector, road selector with manual ID entry option, and SLK input fields. The results section uses collapsible panels for Traffic, Signage Corridor, TC Positions, Intersections, Weather, and Amenities data.

### 12.2 Drive Page Layout

The drive page is designed for in-vehicle use with large, high-contrast displays. The speed display uses a 5xl font size with color coding (green for compliant, red for speeding). The speed limit indicator uses a circular badge with border styling that changes color based on status: white for normal, amber for approaching speed decrease, green for verified override zone. Trip progress shows current SLK with direction indicator and destination information when on the same road as the target.

### 12.3 AfterCare Page Layout

The AfterCare page displays jobs grouped by status:
- Due for Retrieval (red, expanded by default)
- Due for Maintenance (yellow, expanded by default)
- TBA - Awaiting Instruction (gray)
- Active - Not Yet Due (green, collapsed)
- Retrieved (blue, collapsed)
- Archived (hidden, expandable)

Each job card shows:
- Road ID and name
- Job name and creation date
- Status badges with counts
- Map buttons for navigation
- Action buttons (Edit, Retrieve, Maintain, Share, Archive, Delete)

### 12.4 Collapsible Sections

Result data is organized into collapsible sections to manage information density on mobile screens. Each section has a header with a chevron icon indicating expand/collapse state.

---

## 10. Configuration Settings

### 12.1 GPS Enhancement Settings

The GPS settings panel provides control over EKF behavior and warning preferences:
- **EKF Enable**: Toggles Extended Kalman Filter for position smoothing
- **Road Constraint**: Snaps predictions to known road geometry
- **Max Prediction Time**: Maximum seconds to predict during GPS outage
- **Show Uncertainty**: Displays confidence indicator and accuracy circle
- **Early Warnings**: Enable advance warnings for road features
- **Speed Lookahead Time**: Seconds to look ahead for speed zone changes
- **GPS Lag Compensation**: Additional seconds to compensate for GPS latency

### 12.2 Wind Gust Alert Threshold

The wind gust threshold setting allows traffic controllers to set a maximum wind gust speed (in km/h) above which alerts are displayed. The default threshold is 60 km/h. When the current weather data indicates gusts exceeding this threshold, a warning is prominently displayed.

### 12.3 Offline Data Toggles

Six toggles allow switching between online API and offline IndexedDB data:
- Roads List
- Work Zone Lookup
- Speed Zones
- Rail Crossings
- Regulatory Signs
- Warning Signs

---

## 11. Error Handling and Edge Cases

### 12.1 GPS Error Handling

GPS errors are handled gracefully with user-friendly messages:
- Permission denied: Prompt to enable location access
- Position unavailable: Indicate GPS hardware issues
- Timeout: Suggest moving to area with better GPS reception

### 12.2 Offline Data Status

The application checks for offline data availability on startup and displays status indicators. When offline data is available, the header shows 'Offline Ready' status. If offline data is not available, the user is prompted to download data.

### 12.3 SLK Range Validation

Work zone SLK inputs are validated before submission. Start SLK is required; end SLK is optional for single-point lookups. If end SLK is less than start SLK, an error is displayed.

---

## 12. Performance Considerations

### 12.1 IndexedDB Query Optimization

Road finding queries are optimized by using key-path lookups where possible. The speed zones, rail crossings, and signs stores use road_id as the key path, allowing O(1) lookups. The regions store groups roads by region, reducing the search space when the user has selected a specific region.

### 12.2 State Update Throttling

GPS position updates are throttled to prevent excessive road finding queries. The update interval (default 500ms) is configurable through GPS settings. This throttling ensures that road finding operations do not block the UI thread and that battery consumption is minimized during extended tracking sessions.

### 12.3 Component Rendering Optimization

React best practices are followed to prevent unnecessary re-renders:
- `isRestoring` ref prevents clearing selected road during state restoration
- `pendingRestoreParams` ref defers work zone queries until roads are loaded
- Collapsible sections use local state for expand/collapse
- Suspense boundaries handle async parameter parsing

---

## 13. Technical Debt and Future Improvements

The current implementation has several areas identified for future improvement:

1. **Intersections API**: Could benefit from a more sophisticated node-based intersection detection algorithm using MRWA's intersection layer data.

2. **Signage Corridor Report**: Could include more detailed action recommendations based on sign type and proximity to the work zone.

3. **EKF Extension**: Could be extended with adaptive process noise that responds to observed GPS accuracy patterns.

4. **Spatial Index**: Performance could be improved by implementing a spatial index for road geometry, reducing the O(n) scan to O(log n) for road finding operations.

5. **AfterCare Sync**: Could add cloud synchronization for AfterCare jobs across devices.

6. **Push Notifications**: Could add reminders for due retrieval/maintenance signs.

---

*This document is part of the TC Work Zone Locator documentation suite, Version RC 1.7.18.*
