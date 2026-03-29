# TC Work Zone Locator

## Program Logic Documentation

**Version RC 1.9.7**

**Western Australia Traffic Controllers**

---

## Table of Contents

1. Application Overview
2. System Architecture
3. Core Algorithms
4. Data Storage Architecture
5. API Route Architecture
6. GPS Tracking System
7. Emergency Location Module
8. AfterCare Signage Tracking
9. Traffic Counter Module
10. User Interface Components
11. Configuration Settings
12. Error Handling and Edge Cases
13. Performance Considerations
14. Technical Debt and Future Improvements

---

## 1. Application Overview

The TC Work Zone Locator is a Progressive Web Application (PWA) designed specifically for Western Australian Traffic Controllers to locate, plan, and navigate work zones on state and local roads. The application operates in multiple primary modes: a static work zone planning mode, a real-time GPS tracking mode for active traffic control operations, an AfterCare signage tracking system for managing signs awaiting retrieval, a traffic counter for manual vehicle counts, and a documents library for accessing MRWA documentation.

The core value proposition centers on providing accurate SLK (Straight Line Kilometre) based location information, which is the standard reference system used by Main Roads Western Australia (MRWA) for all road positioning. The application architecture follows a modern Next.js 15 implementation with App Router, utilizing client-side IndexedDB for offline data storage and real-time GPS tracking capabilities.

The design philosophy prioritizes offline-first functionality, ensuring that critical road data remains accessible even in remote areas with limited or no network connectivity. This is particularly important for traffic controllers who frequently work in rural Western Australian locations where cellular coverage may be unreliable or non-existent.

---

## 2. System Architecture

### 2.1 Technology Stack

The application is built on Next.js 15 with the App Router architecture, which provides server-side rendering capabilities and API routes within a single framework. The frontend utilizes React with TypeScript for type safety and improved developer experience. Tailwind CSS handles styling with a custom dark theme optimized for outdoor visibility. The shadcn/ui component library provides accessible, customizable UI components including dialogs, buttons, and input fields. The application runs exclusively on port 3000 in the development environment.

| Component        | Technology                                |
| ---------------- | ----------------------------------------- |
| Framework        | Next.js 15 with App Router                |
| Language         | TypeScript (strict mode)                  |
| Styling          | Tailwind CSS with dark theme              |
| UI Components    | shadcn/ui (Radix primitives)              |
| Storage          | IndexedDB + localStorage (client-side)    |
| Maps             | Leaflet + OpenStreetMap                   |
| State Management | React hooks + localStorage/sessionStorage |

### 2.2 Page Structure

The application consists of multiple main pages:

- **Home page** (`src/app/page.tsx`): Work zone planning interface
- **Drive page** (`src/app/drive/page.tsx`): Real-time GPS tracking with speed alerts
- **Nearby Signs** (`src/app/drive/nearby-signs/page.tsx`): Signs requiring action
- **AfterCare** (`src/app/aftercare/page.tsx`): Signage tracking management
- **AfterCare Map** (`src/app/aftercare/map/page.tsx`): Full-screen map view
- **Library** (`src/app/library/page.tsx`): Documents library browser
- **Overrides** (`src/app/overrides/page.tsx`): Speed sign override management
- **Overrides Layout** (`src/app/overrides/layout/page.tsx`): Override visualization
- **Overrides Map** (`src/app/overrides/map/page.tsx`): Override map view
- **Traffic Counter** (`src/app/traffic-counter/page.tsx`): Manual vehicle counting
- **QA** (`src/app/qa/page.tsx`): Quality assurance testing
- **Offline** (`src/app/offline/page.tsx`): Offline data management
- **Calibrate** (`src/app/calibrate/page.tsx`): GPS calibration tool
- **Manual** (`src/app/manual/page.tsx`): User manual page

The home page allows users to select roads by region, specify work zone SLK ranges, and retrieve comprehensive location information including speed zones, nearby amenities, intersections, and weather data. The drive page is designed for active traffic control operations, providing real-time speed monitoring with WA speeding fine alerts, destination tracking, and navigation assistance. The AfterCare pages manage signage tracking for signs placed on roads awaiting retrieval. The Traffic Counter provides manual vehicle counting with VPH calculations. The Library provides access to MRWA documentation.

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
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

| Retrieval Type   | Due Condition                     |
| ---------------- | --------------------------------- |
| standard         | 2 days after placement            |
| scheduled        | On specified retrieval_date       |
| maintain-daily   | Daily from last_maintained_date   |
| maintain-weekly  | Weekly from last_maintained_date  |
| maintain-monthly | Monthly from last_maintained_date |
| tba              | Never (indefinite)                |

The algorithm respects manually set statuses and never changes retrieved signs. Job status is aggregated from all sign statuses using `calculateJobStatus()`.

### 3.5 Speeding Fine Calculation Algorithm

The drive page implements a speeding fine calculation based on Western Australian Road Traffic Code penalties. The `getSpeedingFine()` function determines the applicable fine and demerit points based on how many km/h over the speed limit the vehicle is traveling.

**WA Speeding Fine Tiers:**

| km/h Over | Fine (AUD) | Demerit Points |
| --------- | ---------- | -------------- |
| 0-9       | $100       | 0              |
| 10-19     | $200       | 2              |
| 20-29     | $400       | 3              |
| 30-40     | $800       | 6              |
| 40+       | $1,200     | 7              |

**Implementation (src/app/drive/page.tsx):**

```typescript
const WA_SPEEDING_FINES = [
  { maxOver: 9, fine: 100, demerits: 0, label: '0-9 km/h over' },
  { maxOver: 19, fine: 200, demerits: 2, label: '10-19 km/h over' },
  { maxOver: 29, fine: 400, demerits: 3, label: '20-29 km/h over' },
  { maxOver: 40, fine: 800, demerits: 6, label: '30-40 km/h over' },
  { maxOver: 999, fine: 1200, demerits: 7, label: '40+ km/h over (Reckless)' },
];

const getSpeedingFine = (speedKph: number, limitKph: number) => {
  const kmOver = speedKph - limitKph;
  if (kmOver < 1) return null;
  return WA_SPEEDING_FINES.find((tier) => kmOver <= tier.maxOver);
};
```

### 3.6 Time/Distance Calculations

The drive page calculates and displays time-based metrics for driver awareness:

**Minutes per Kilometer (`getMinutesPerKm`):**

```typescript
const getMinutesPerKm = (speedKph: number): string => {
  if (speedKph < 1) return '--';
  const minutesPerKm = 60 / speedKph;
  if (minutesPerKm < 1) {
    const seconds = Math.round(minutesPerKm * 60);
    return `${seconds}s/km`;
  }
  return `${minutesPerKm.toFixed(1)} min/km`;
};
```

**Time for 10km (`getTimeFor10km`):**

```typescript
const getTimeFor10km = (speedKph: number): string => {
  if (speedKph < 1) return '--';
  const totalMinutes = (10 / speedKph) * 60;
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m for 10km`;
  }
  return `${mins} min for 10km`;
};
```

---

## 4. Data Storage Architecture

### 4.1 IndexedDB Schema

The application uses IndexedDB for client-side storage of all road-related data, enabling full offline functionality. The database schema is designed to optimize the most common query patterns: finding roads by region, retrieving speed zones by road ID, and searching for nearby amenities.

| Object Store    | Key Path           | Purpose                      |
| --------------- | ------------------ | ---------------------------- |
| regions         | 'region' (string)  | Roads grouped by MRWA region |
| speedZones      | 'road_id' (string) | Speed limit zones per road   |
| metadata        | 'key' (string)     | Download date, total roads   |
| railCrossings   | 'road_id' (string) | Railway crossing locations   |
| regulatorySigns | 'road_id' (string) | Regulatory sign positions    |
| warningSigns    | 'road_id' (string) | Warning sign positions       |
| datasetMeta     | 'dataset' (string) | Sync status per dataset      |
| amenities       | 'region' (string)  | Amenities cached by region   |

### 4.2 Data Persistence Strategy

The application employs a dual-persistence strategy using both localStorage and sessionStorage for different types of state:

**localStorage (persistent across sessions):**

- Default region preference
- GPS tracking configuration (EKF settings, lookahead time, lag compensation)
- Wind gust alert threshold
- Speed sign overrides
- AfterCare jobs and presets
- Traffic count history
- QA test results

**sessionStorage (cleared when browser session ends):**

- Current work zone selection (region, road ID, start/end SLK)

---

## 5. API Route Architecture

The application implements several API routes using Next.js App Router conventions. These routes handle communication with external data sources (MRWA ArcGIS, Open-Meteo, BOM, Overpass) and provide a clean separation between client-side logic and server-side data fetching. All API routes are implemented in TypeScript with proper error handling and response typing.

### 5.1 Core Routes

| Route                      | Method   | Purpose                                         |
| -------------------------- | -------- | ----------------------------------------------- |
| /api/roads                 | GET/POST | Region list, road search, SLK coordinate lookup |
| /api/gps                   | GET      | Convert GPS coordinates to road/SLK             |
| /api/weather               | GET      | Weather conditions from Open-Meteo              |
| /api/warnings              | GET      | BOM weather warnings RSS feed                   |
| /api/weather/warnings      | GET      | Combined weather with warnings                  |
| /api/traffic               | GET      | AADT data from MRWA Layer 27                    |
| /api/places                | GET      | Nearby amenities from Overpass API              |
| /api/intersections         | GET      | Cross road detection using MRWA nodes           |
| /api/nearest-intersections | GET      | Find nearest intersections                      |

### 5.2 Emergency Routes

| Route                   | Method | Purpose                          |
| ----------------------- | ------ | -------------------------------- |
| /api/emergency-stations | GET    | All emergency facility locations |
| /api/hospitals          | GET    | Hospital locations from OSM      |
| /api/nearest-hospital   | GET    | Find nearest hospital            |
| /api/police-stations    | GET    | Police station locations         |

### 5.3 Speed Zone Routes

| Route              | Method   | Purpose                            |
| ------------------ | -------- | ---------------------------------- |
| /api/overrides     | GET/POST | Override storage pass-through      |
| /api/speed-compare | GET      | MRWA vs OSM speed limit comparison |
| /api/osm-speed     | GET      | OpenStreetMap speed limit data     |
| /api/speed-verify  | GET      | Speed verification                 |
| /api/speedlimit    | GET      | Speed limit lookup                 |

### 5.4 Data Management Routes

| Route               | Method   | Purpose                       |
| ------------------- | -------- | ----------------------------- |
| /api/admin-sync     | GET/POST | Direct sync from MRWA servers |
| /api/download-signs | GET      | Sign data download            |
| /api/export-pdf     | POST     | Work zone report export       |
| /api/sync-data      | POST     | Offline data sync             |

### 5.5 QA Routes

| Route         | Method   | Purpose                     |
| ------------- | -------- | --------------------------- |
| /api/qa       | GET      | QA test data and validation |
| /api/qa-saved | GET/POST | Saved QA test results       |

### 5.6 Incidents Route

| Route          | Method | Purpose             |
| -------------- | ------ | ------------------- |
| /api/incidents | GET    | Live road incidents |

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
- `speedingFine`: Fine amount and demerit points if speeding
- `distanceToDest`: Distance in km to destination SLK
- `eta`: Estimated time of arrival in seconds
- `uncertainty`: Position uncertainty in meters
- `confidence`: Reliability indicator (high/medium/low/predicted)

### 6.2 SLK Direction Detection

The drive page implements SLK direction detection to determine whether the vehicle is traveling towards increasing or decreasing SLK values. This is essential for predicting upcoming speed zone changes. The algorithm tracks consecutive SLK readings and determines direction when the difference exceeds a minimum threshold (0.001 km) to avoid GPS jitter.

### 6.3 Upcoming Speed Zone Detection

The application provides advance warning of speed zone changes by analyzing the road's speed zone data in the direction of travel. The algorithm calculates a lookahead distance based on current speed and configurable lookahead time (default 5 seconds) plus optional GPS lag compensation. It then searches for speed zone boundaries within this lookahead distance and alerts the driver if a speed limit decrease is approaching.

### 6.4 Speeding Alert System

When the vehicle speed exceeds the posted limit, the drive page displays a prominent alert showing:

- Current speed in red with pulsing animation
- Speed limit in a bordered circle
- km/h over the limit
- WA fine amount (e.g., "$200 Fine")
- Demerit points (e.g., "2 Demerits")

The alert uses a pulsing red background animation to draw attention and encourage speed compliance.

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

### 8.1 Overview

The AfterCare system provides comprehensive signage tracking for Traffic Controllers who place signs on roads and need to track them for later retrieval. The system supports multiple retrieval schedules, automatic status calculation, and navigation assistance.

### 8.2 Data Structures

**AfterCareJob:**

```typescript
interface AfterCareJob {
  id: string;
  job_name: string;
  road_id: string;
  road_name: string;
  notes: string;
  signs: AfterCareSign[];
  created_at: string;
  updated_at: string;
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
  retrieval_type: RetrievalType;
  retrieval_date?: string;
  status: SignStatus;
  status_override?: boolean;
}
```

### 8.3 Status Types

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

### 8.4 Route Optimization

The route optimizer (`src/lib/route-optimizer.ts`) helps plan efficient routes for retrieving multiple signs:

- `optimizeRoute()`: Optimizes visit order using nearest-neighbor algorithm
- `getAllSignsDueForRetrieval()`: Aggregates all signs needing retrieval
- `getAllSignsDueForMaintenance()`: Aggregates all signs needing maintenance
- Generates Google Maps URLs with waypoints for navigation

### 8.5 Map Integration

The AfterCare Map (`/aftercare/map`) uses Leaflet with OpenStreetMap tiles:

- Colored markers indicate sign status (red=retrieval, yellow=maintenance, green=active)
- Filter buttons show specific status groups
- Click markers for sign details
- Auto-centers on available signs

---

## 9. Traffic Counter Module

### 9.1 Overview

The Traffic Counter module provides manual vehicle counting capability for Traffic Controllers conducting traffic surveys. It consists of two pages:

- **Setup Page** (`src/app/traffic-counter/page.tsx`): Configure count parameters
- **Count Page** (`src/app/traffic-counter/count/page.tsx`): Active counting interface

### 9.2 Features

- Count vehicles by direction (True Left / True Right)
- Count by type (Light / Heavy vehicles)
- Configurable count duration (3m, 5m, 15m presets, or custom 1-480 minutes)
- Direction mode selection (one-way / both-ways)
- Auto-fetch GPS location on count start
- Real-time VPH (Vehicles Per Hour) calculation
- Real-time queue length estimation
- Lane capacity estimation
- Heavy vehicle percentage with +20% adjustment warning
- Shuttle flow max length (for both-ways mode)
- Minimum 3-minute count duration enforcement
- Early stop capability (saves actual elapsed time)
- Historical count records with export

### 9.3 Data Structure

```typescript
interface TrafficCountRecord {
  id: string;
  road_id: string;
  road_name: string;
  slk: number | null;
  lat: number | null;
  lon: number | null;
  region: string;
  duration_minutes: number; // Actual elapsed time
  direction_mode: 'one-way' | 'both-ways';
  true_left_light: number;
  true_left_heavy: number;
  true_right_light: number;
  true_right_heavy: number;
  total_light: number;
  total_heavy: number;
  total_vehicles: number;
  heavy_percentage: number;
  vph_true_left: number;
  vph_true_right: number;
  vph_combined: number;
  vph_one_direction: number;
  queue_length?: number; // Estimated queue in meters
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  created_at: string;
}
```

### 9.4 VPH Calculation

VPH is calculated by extrapolating the count over the actual duration to an hourly rate:

```typescript
const vph = (count / duration_minutes) * 60;
```

For both-ways mode, `vph_combined` is the sum of both directions, while `vph_one_direction` is the maximum of the two.

### 9.5 Queue Length Calculation

Queue length is estimated using AGTTM Part 3, Table 4.3 multipliers:

1. **Estimate stopping time** based on VPH:
   - > 600 VPH → 2 minutes
   - 300-600 VPH → 5 minutes
   - < 300 VPH → 10 minutes

2. **Apply multipliers**:
   - Light vehicles: ×2.4 (2min), ×6 (5min), ×12 (10min)
   - Heavy vehicles: ×8 (2min), ×20 (5min)

3. **Calculate queue**: `Queue = (light_count × Ma) + (heavy_count × Mo)`

For both-ways mode, the worst case (higher queue) direction is used.

### 9.6 Minimum Duration Logic

Counts under 3 minutes cannot be saved. The timer displays:

- Red pulsing ring during first 3 minutes (insufficient data)
- Green ring after 3 minutes (can save)
- Amber ring when < 60 seconds remaining
- Red ring when < 30 seconds remaining

### 9.7 Early Stop Handling

When user stops count before timer completes:

1. Capture actual elapsed seconds at stop moment
2. Use actual duration for all calculations
3. Show planned vs actual duration in completion screen
4. Save actual duration to record (not planned)

---

## 10. User Interface Components

### 10.1 Home Page Layout

The home page follows a mobile-first responsive design optimized for 400px maximum width, suitable for smartphone use. The header displays the application title and a settings icon. The main input section contains region selector, road selector with manual ID entry option, and SLK input fields. The results section uses collapsible panels for Traffic, Signage Corridor, TC Positions, Intersections, Weather, and Amenities data.

### 10.2 Drive Page Layout

The drive page is designed for in-vehicle use with large, high-contrast displays. The speed display uses a 5xl font size with color coding (green for compliant, red for speeding with pulsing alert). The speed limit indicator uses a circular badge with border styling that changes color based on status: white for normal, amber for approaching speed decrease, green for verified override zone. Trip progress shows current SLK with direction indicator and destination information when on the same road as the target. Additional displays include minutes per km and 10km travel time.

### 10.3 AfterCare Page Layout

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

### 10.4 Traffic Counter Layout

The Traffic Counter has two distinct pages:

**Setup Page:**

- Duration selection (3m, 5m, 15m presets + custom 1-480m)
- Custom duration shows highlighted button when set
- Direction mode toggle (One Direction / Both Ways)
- GPS location capture with auto-fetch on start
- Optional notes field
- Start Counting button with loading state

**Count Page:**

- Circular progress timer with color-coded status
- Large counter buttons (Light/Heavy for each direction)
- Live statistics: Total, Heavy %, VPH, Lanes, Queue
- Quick reference panel: Shuttle Max, Queue Length
- Stop button with confirmation dialog
- Completion overlay with save/reset/cancel options

**History Modal:**

- List of saved count records
- Copy individual record to clipboard
- Delete individual records
- Export all history
- Clear all history

### 10.5 Settings Drawer

A unified Settings Drawer component (`src/components/SettingsDrawer.tsx`) provides consistent navigation and settings across all pages:

- About section with Documents Library link
- Library access
- Preferences
- Speed Zone Overrides
- TC Tools
- GPS & Tracking settings
- Admin Data Sync (collapsed by default)

---

## 11. Configuration Settings

### 11.1 GPS Enhancement Settings

The GPS settings panel provides control over EKF behavior and warning preferences:

- **EKF Enable**: Toggles Extended Kalman Filter for position smoothing
- **Road Constraint**: Snaps predictions to known road geometry
- **Max Prediction Time**: Maximum seconds to predict during GPS outage
- **Show Uncertainty**: Displays confidence indicator and accuracy circle
- **Early Warnings**: Enable advance warnings for road features
- **Speed Lookahead Time**: Seconds to look ahead for speed zone changes
- **GPS Lag Compensation**: Additional seconds to compensate for GPS latency

### 11.2 Wind Gust Alert Threshold

The wind gust threshold setting allows traffic controllers to set a maximum wind gust speed (in km/h) above which alerts are displayed. The default threshold is 60 km/h. When the current weather data indicates gusts exceeding this threshold, a warning is prominently displayed.

### 11.3 Offline Data Toggles

Six toggles allow switching between online API and offline IndexedDB data:

- Roads List
- Work Zone Lookup
- Speed Zones
- Rail Crossings
- Regulatory Signs
- Warning Signs

---

## 12. Error Handling and Edge Cases

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

## 13. Performance Considerations

### 13.1 IndexedDB Query Optimization

Road finding queries are optimized by using key-path lookups where possible. The speed zones, rail crossings, and signs stores use road_id as the key path, allowing O(1) lookups. The regions store groups roads by region, reducing the search space when the user has selected a specific region.

### 13.2 State Update Throttling

GPS position updates are throttled to prevent excessive road finding queries. The update interval (default 500ms) is configurable through GPS settings. This throttling ensures that road finding operations do not block the UI thread and that battery consumption is minimized during extended tracking sessions.

### 13.3 Component Rendering Optimization

React best practices are followed to prevent unnecessary re-renders:

- `isRestoring` ref prevents clearing selected road during state restoration
- `pendingRestoreParams` ref defers work zone queries until roads are loaded
- Collapsible sections use local state for expand/collapse
- Suspense boundaries handle async parameter parsing

---

## 14. Technical Debt and Future Improvements

The current implementation has several areas identified for future improvement:

1. **Intersections API**: Could benefit from a more sophisticated node-based intersection detection algorithm using MRWA's intersection layer data.

2. **Signage Corridor Report**: Could include more detailed action recommendations based on sign type and proximity to the work zone.

3. **EKF Extension**: Could be extended with adaptive process noise that responds to observed GPS accuracy patterns.

4. **Spatial Index**: Performance could be improved by implementing a spatial index for road geometry, reducing the O(n) scan to O(log n) for road finding operations.

5. **AfterCare Sync**: Could add cloud synchronization for AfterCare jobs across devices.

6. **Push Notifications**: Could add reminders for due retrieval/maintenance signs.

7. **Live Traffic Integration**: Could integrate real-time traffic incident data from MRWA WebEOC.

8. **BOM Warnings Integration**: Could integrate live BOM weather warnings into the drive page.

---

_This document is part of the TC Work Zone Locator documentation suite, Version RC 1.9.7._
