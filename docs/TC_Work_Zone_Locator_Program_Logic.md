# TC Work Zone Locator

## Program Logic Documentation

**Version 1.35.0**

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
14. Turbo Mode Logic
15. Traffic Event Logger Logic
16. Onboarding Logic
17. Saved Locations Logic
18. WHS Library Logic
19. AI Assistant Module
20. Technical Debt and Future Improvements

---

## 1. Application Overview

The TC Work Zone Locator is a Progressive Web Application (PWA) designed specifically for Western Australian Traffic Controllers to locate, plan, and navigate work zones on state and local roads. The application operates in multiple primary modes: a static work zone planning mode, a real-time GPS tracking mode for active traffic control operations, an AfterCare signage tracking system for managing signs awaiting retrieval, a traffic counter for manual vehicle counts, and a documents library for accessing MRWA documentation.

The core value proposition centers on providing accurate SLK (Straight Line Kilometre) based location information, which is the standard reference system used by Main Roads Western Australia (MRWA) for all road positioning. The application architecture follows a modern Next.js 16 implementation with App Router, utilizing client-side IndexedDB for offline data storage and real-time GPS tracking capabilities.

The design philosophy prioritizes offline-first functionality, ensuring that critical road data remains accessible even in remote areas with limited or no network connectivity. This is particularly important for traffic controllers who frequently work in rural Western Australian locations where cellular coverage may be unreliable or non-existent.

---

## 2. System Architecture

### 2.1 Technology Stack

The application is built on Next.js 16 with the App Router architecture, which provides server-side rendering capabilities and API routes within a single framework. The frontend utilizes React with TypeScript for type safety and improved developer experience. Tailwind CSS handles styling with a custom dark theme optimized for outdoor visibility. The shadcn/ui component library provides accessible, customizable UI components including dialogs, buttons, and input fields. The application runs exclusively on port 3000 in the development environment.

| Component        | Technology                                |
| ---------------- | ----------------------------------------- |
| Framework        | Next.js 16 with App Router                |
| Language         | TypeScript (strict mode)                  |
| Styling          | Tailwind CSS with dark theme              |
| UI Components    | shadcn/ui (Radix primitives)              |
| Storage          | IndexedDB + localStorage (client-side)    |
| Maps             | Leaflet + OpenStreetMap                   |
| State Management | React hooks + localStorage/sessionStorage |

### 2.2 Page Structure

The application consists of multiple main pages:

- **Home page** (`src/app/page.tsx`): Work zone planning interface (~926 lines, refactored from 1,987 lines)
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
- **Contacts** (`src/app/contacts/page.tsx`): Contact directory
- **Cycle Timer** (`src/app/cycle-timer/page.tsx`): Cycle timing tool
- **Event Logger** (`src/app/event-logger/page.tsx`): Traffic event logger with cloud sync
- **Settings** (`src/app/settings/page.tsx`): Application settings
- **Manual** (`src/app/manual/page.tsx`): User manual
- **Saved Locations Map** (`src/app/saved-locations/map/page.tsx`): Interactive map of saved locations

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

### 3.6 Pace Rate Indicator

The drive page implements a pace rate indicator that shows time gained or lost relative to the posted speed limit. This replaces the previous minutes-per-km and 10km travel time displays with a more useful delta format.

**Pace Delta Formula:**

```typescript
const deltaSec = (distanceKm / actualSpeed - distanceKm / postedSpeed) * 3600;
```

- Positive delta = losing time (slower than posted)
- Negative delta = gaining time (faster than posted)

**Display Format:**

Three distance intervals are shown simultaneously: 1km, 10km, and 100km. The format adapts based on the distance:

- 1km: `+0:30` (minutes:seconds)
- 10km: `+5:00` (minutes:seconds)
- 100km: `+0:50:00` (hours:minutes:seconds)

**Colour Coding:**

| Condition           | Colour | Meaning                       |
| ------------------- | ------ | ----------------------------- |
| Speed ≥ limit - 2   | Green  | At or near posted speed       |
| Speed > limit + 2   | Red    | Over posted speed             |
| Speed < limit - 2   | Grey   | Under posted speed            |
| Speed < 60 km/h     | Hidden | Too slow for meaningful delta |
| No speed limit data | Hidden | Cannot calculate delta        |

**Placement:**

The pace rate indicator is displayed under the GPS confidence accuracy line (e.g., "High Confidence ±5.00m accuracy") in both landscape and portrait modes. It uses a compact layout with the "PACE RATE" label in `text-xs` and delta values in `text-sm` with `font-mono` styling.

---

## 4. Data Storage Architecture

### 4.1 IndexedDB Schema

The application uses IndexedDB for client-side storage of all road-related data, enabling full offline functionality. The database schema is designed to optimize the most common query patterns: finding roads by region, retrieving speed zones by road ID, and searching for nearby amenities.

Database name: `RoadFinderDB` (version 7)

| Object Store    | Key Path             | Purpose                     |
| --------------- | -------------------- | --------------------------- |
| regions         | 'region' (string)    | Road data grouped by region |
| speedZones      | 'road_id' (string)   | Speed zone data             |
| regulatorySigns | 'road_id' (string)   | Regulatory sign data        |
| warningSigns    | 'road_id' (string)   | Warning sign data           |
| railCrossings   | 'road_id' (string)   | Rail crossing data          |
| amenitiesData   | 'region' (string)    | Amenities data              |
| pavementData    | 'road_id' (string)   | Pavement data               |
| trafficData     | 'road_name' (string) | Traffic volume data         |
| savedLocations  | 'id' (string)        | Saved locations             |

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

| Route                   | Method | Purpose                                                        |
| ----------------------- | ------ | -------------------------------------------------------------- |
| /api/emergency-stations | GET    | All emergency facility locations                               |
| /api/hospitals          | GET    | Hospital locations from WA Health SLIP Services (Layers 6 & 7) |
| /api/nearest-hospital   | GET    | Nearest hospital from WA Health SLIP Services                  |
| /api/fuel-stations      | GET    | Diesel fuel stations from FuelWatch WA + Overpass merge        |
| /api/police-stations    | GET    | Police station locations                                       |

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

### 5.6 Fuel Stations Route

**Endpoint:** `GET /api/fuel-stations`

Provides diesel fuel station data by merging FuelWatch WA (daily prices) with OpenStreetMap Overpass API (coverage gaps).

**Query Parameters:**

| Parameter | Type   | Default | Description                  |
| --------- | ------ | ------- | ---------------------------- |
| lat       | number | —       | Latitude (required)          |
| lon       | number | —       | Longitude (required)         |
| radius    | number | 100     | Search radius in km          |
| fuelType  | string | DL      | Fuel type code (DL = diesel) |

**Response Structure:**

```typescript
{
  nearest: FuelStation | null;    // Closest station
  cheapest: FuelStation | null;    // Cheapest (if different from nearest)
  stations: FuelStation[];        // Top 20 by distance
}
```

**Merge/Dedup Logic:**

1. Fetch all diesel stations from FuelWatch WA JSON API (`/api/sites?fuelType=DSL`, ~459 stations)
2. Fetch all fuel stations from Overpass API within radius
3. Deduplicate stations within 200m proximity — FuelWatch data takes priority (has pricing)
4. Sort by distance, return top 20
5. Server-side cache: 30 minutes

**FuelStation Object:**

```typescript
{
  name: string; // Display name
  brand: string; // Brand name
  price: number | null; // Diesel price (cents/L) — null if from Overpass
  lat: number; // Latitude
  lon: number; // Longitude
  distanceKm: number; // Distance from search center
  source: 'FuelWatch' | 'OpenStreetMap'; // Data source
  // ... additional fields (address, phone, siteFeatures, etc.)
}
```

### 5.7 Toilet Map Utility

The shared utility `src/lib/toilet-map.ts` provides toilet search using the Australian Government National Public Toilet Map via ArcGIS Feature Service.

| Property    | Value                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| Service URL | `https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/National_Public_Toilet_Map/FeatureServer/0/query`          |
| Coverage    | 2,714+ public toilets in Western Australia                                                                             |
| Cache       | 6-hour in-memory cache (all WA toilets fetched on first call)                                                          |
| Fallback    | Overpass API via `/api/places?type=toilet`                                                                             |
| Metadata    | Opening hours, wheelchair access, baby change, showers, parking, drinking water, facility type, toiletmap.gov.au links |

**Key Function:**

```typescript
findNearestToilets(lat: number, lon: number, radiusKm: number): Promise<Place[]>
```

Fetches all WA toilets (cached for 6 hours), filters by radius, and returns results in the standard `Place` interface format.

### 5.8 AI and Document Routes

| Route                           | Method | Purpose                               |
| ------------------------------- | ------ | ------------------------------------- |
| /api/ai/chat                    | POST   | AI chat completions for Q&A assistant |
| /api/ai/verify                  | POST   | Verify AI API key validity            |
| /api/documents                  | GET    | Document listing for library          |
| /api/documents/summarize        | POST   | AI-powered document summarization     |
| /api/documents/analyze-diagrams | POST   | AI diagram analysis for TMP documents |

### 5.9 Utility Routes

| Route        | Method | Purpose                         |
| ------------ | ------ | ------------------------------- |
| /api/toilets | GET    | National Public Toilet Map data |
| /api/route   | GET    | Health check                    |

### 5.10 Incidents Route

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

The home page follows a mobile-first responsive design optimized for 400px maximum width, suitable for smartphone use. The header displays the application title and a settings icon. The main input section contains region selector, road selector with manual ID entry option, and SLK input fields. The results section uses collapsible panels for Traffic, Signage Corridor, TC Positions, Intersections, Weather, and Amenities data. The home page has been significantly refactored, with inline JSX and logic extracted into dedicated components (`src/components/home/`) and hooks (`src/hooks/`), including `useWorkZoneLookup` for the core lookup logic, `useCollapsibleSections` for section state management, and `useSignageData` for speed limit and signage data.

### 10.2 Drive Page Layout

The drive page is designed for in-vehicle use with large, high-contrast displays. The speed display uses a 5xl font size with color coding (green for compliant, red for speeding with pulsing alert). The speed limit indicator uses a circular badge with border styling that changes color based on status: white for normal, amber for approaching speed decrease, green for verified override zone. Trip progress shows current SLK with direction indicator and destination information when on the same road as the target. A pace rate indicator shows time gained or lost versus the posted speed limit for 1km, 10km, and 100km intervals, displayed under the GPS confidence accuracy line.

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
- Extracted hooks (useWorkZoneLookup, useSignageData, useCollapsibleSections) manage their own state independently
- Suspense boundaries handle async parameter parsing

### 13.4 fetchPlaces() 3-Source Parallel Architecture

The home page (via `useWorkZoneLookup` hook and `usePlaces` hook) implements a sophisticated parallel data fetching strategy for amenity data through the `fetchPlaces()` function. This architecture ensures the best available data is displayed while maintaining resilience through smart fallback chains.

**Architecture Overview:**

The function launches three independent fetch calls in parallel using `Promise.allSettled()`. For toilets, the shared utility `src/lib/toilet-map.ts` fetches ALL Western Australian toilets (2,714+) from the National Public Toilet Map ArcGIS Feature Service (hosted on the NSW Government open data portal) and caches them in memory for 6 hours, then performs client-side distance filtering to find the nearest.

1. **Hospitals**: `GET /api/nearest-hospital` (WA Health SLIP primary) → `GET /api/places?type=hospital` (Overpass fallback)
2. **Fuel Stations**: `GET /api/fuel-stations` (FuelWatch WA + Overpass merge) → `GET /api/places?type=fuel` (Overpass fallback)
3. **Toilets**: `findNearestToilets()` from `src/lib/toilet-map.ts` (National Public Toilet Map ArcGIS, 2,714+ WA toilets) → `GET /api/places?type=toilet` (Overpass fallback)

**Smart Fallback Chain:**

Each source has its own try/catch block. If the primary source fails (timeout, network error, parsing error), the home page automatically falls back to the Overpass-based `/api/places` endpoint for that amenity type. This ensures data is always displayed even if a government data source is unavailable.

**Source Tracking:**

The `PlacesData` interface includes source tracking fields:

```typescript
interface PlacesData {
  hospitalSource?: 'WA Health SLIP' | 'OpenStreetMap';
  fuelSource?: 'FuelWatch WA' | 'OpenStreetMap';
  toiletSource?: 'National Toilet Map' | 'OpenStreetMap';
  // ... other fields
}
```

This enables the UI to show users which data source was used, adding transparency.

**Offline Mode:**

When offline, the system follows this chain:

1. **IndexedDB** — Check for cached amenity data in IndexedDB `amenities` store
2. **localStorage** — Fall back to localStorage cached PlacesData with timestamp
3. **"Data Unavailable"** — Display indicator that amenity data requires internet connection

**Cache Strategy:**

- localStorage cache with timestamp (30-minute expiry)
- Each amenity type cached independently
- Stale cache served when offline (better than no data)
- Cache invalidated on successful fresh fetch

---

## 14. Turbo Mode Logic

### 14.1 Overview

Turbo Mode provides an enhanced GPS tracking experience by switching from the default adaptive refresh rate to a fixed high-frequency 200ms update interval. This is particularly useful when precise, real-time position tracking is required during critical traffic control operations such as approaching a work zone entry point or performing precise SLK positioning.

### 14.2 RefreshRateToggle Component

The `RefreshRateToggle` component is displayed on the drive page and allows users to switch between tracking modes:

- **Default Mode (Adaptive)**: GPS refresh interval scales dynamically between 750ms and 2000ms based on vehicle speed. At higher speeds, updates are more frequent to maintain positional accuracy; at lower speeds, the interval extends to conserve battery.

- **Turbo/Precision Mode**: Forces a fixed 200ms GPS refresh interval, providing maximum positional granularity regardless of vehicle speed.

### 14.3 GPS Throttle Integration

The `useGpsTracking.ts` hook respects the Turbo Mode setting through the `getThrottleInterval()` function:

```typescript
function getThrottleInterval(): number {
  if (updateInterval === 200) return 200; // Turbo/Precision mode
  // Adaptive: scale based on speed
  if (currentSpeed > 80) return 750;
  if (currentSpeed > 40) return 1000;
  return 2000;
}
```

When Turbo Mode is active, the hook bypasses the adaptive speed-based logic and uses the fixed 200ms interval directly.

### 14.4 Auto-Revert Timer

Turbo Mode includes a 5-minute countdown auto-revert timer. After 5 minutes of continuous Turbo Mode operation, the system automatically reverts to the default adaptive mode. This prevents excessive battery drain during extended tracking sessions where the higher refresh rate is unnecessary.

### 14.5 Visual Feedback

When Turbo Mode is active:

- The toggle button displays a pulsing green animation to provide clear visual feedback that high-frequency tracking is engaged
- The remaining time on the auto-revert countdown is displayed alongside the button
- When the auto-revert triggers, the button returns to its default static appearance

### 14.6 Battery Considerations

The 200ms fixed refresh rate significantly increases GPS hardware utilization and network processing overhead. The auto-revert timer serves as a safeguard against unintentional battery drain, ensuring that Turbo Mode is used only when the precision benefit outweighs the power cost. Users who need extended Turbo Mode can re-enable it after the auto-revert triggers.

---

## 15. Traffic Event Logger Logic

### 15.1 Overview

The Traffic Event Logger provides comprehensive event logging for Traffic Controllers during active operations. It allows recording of traffic events, TC assignments, counters, and timers, with cloud sync capabilities for team coordination and record-keeping. The main interface is provided by `TrafficEventLoggerModal.tsx`, which serves as the primary modal component for all event logging operations.

### 15.2 State Management

Event logger state is managed by `traffic-event-logger.ts`, which implements state management with localStorage persistence. This ensures that event data survives page refreshes and browser restarts, which is critical during active traffic control operations where data loss is unacceptable.

### 15.3 Event Types

The system supports the following event types:

| Event Type      | Description                                    |
| --------------- | ---------------------------------------------- |
| Sent True Left  | Vehicle dispatched on the True Left direction  |
| Sent True Right | Vehicle dispatched on the True Right direction |
| RLR             | Red Light Runner event recorded                |
| Trip Out        | Trip Out event recorded                        |
| Spot Call       | Spot Call event recorded                       |
| Shuttle Send    | Shuttle vehicle dispatched                     |

### 15.4 TC Assignment System

The TC Assignment system allows assigning Traffic Controllers to specific positions:

- **Start TC TL (True Left)**: Begin tracking a TC on the True Left position
- **Start TC TR (True Right)**: Begin tracking a TC on the True Right position
- **TC1 / TC2 / TC3**: Up to three TC assignments, which are mutually exclusive — only one TC can be assigned to a given position at a time

When a new TC is assigned to a position already occupied, the previous assignment is automatically concluded and logged.

### 15.5 Counters

The event logger maintains running counters for key metrics:

- **TL**: True Left count
- **TR**: True Right count
- **Total**: Combined total (TL + TR)
- **RLR**: Red Light Runner count
- **Trip Out**: Trip Out count

Each counter records time intervals between events, enabling analysis of traffic flow patterns over time.

### 15.6 Hold/Break Timers

The system provides Hold and Break timer functionality:

- **Hold Timer**: Tracks the duration of traffic holds (periods when traffic is stopped)
- **Break Timer**: Tracks the duration of breaks in operations
- Duration logging records the start time, end time, and total duration of each hold/break period

### 15.7 Cloud Sync

Event data can be synchronized to the cloud via a user-configured Google Sheet URL:

- **Google Sheet URL**: Users configure their own Google Sheet endpoint in the settings
- **Offline Queue**: When the device is offline, events are queued locally and synced automatically when connectivity is restored
- **Sync Status**: Visual indicators show the current sync state (synced, pending, error)

### 15.8 CSV Export

The event logger supports CSV export functionality, allowing users to download all logged events as a CSV file for external analysis, reporting, or archival purposes.

### 15.9 Sub-Components

The Traffic Event Logger is composed of several specialized sub-components:

- **EventButtons**: Renders the event type buttons for quick event logging
- **Counters**: Displays running TL, TR, Total, RLR, and TripOut counters
- **EventList**: Shows the chronological list of logged events with timestamps
- **TimerBadge**: Displays the current Hold/Break timer state with visual status
- **ShiftSheet**: Provides shift-level summary and export functionality
- **MoreSheet**: Additional options and settings within the logger modal
- **FlasherSheet**: Specialized interface for flasher/traffic signal event logging

---

## 16. Onboarding Logic

### 16.1 Overview

The Onboarding system provides a first-run wizard that guides new users through the initial setup process. It is implemented in the `Onboarding.tsx` component and is triggered automatically on the user's first visit to the application.

### 16.2 Onboarding Steps

The wizard consists of 5 sequential steps:

1. **Welcome**: Introduction to the TC Work Zone Locator application and its purpose for Western Australian Traffic Controllers
2. **Download Offline Data**: Guides the user to download offline road data for their region, ensuring the app is functional without internet connectivity
3. **Find Your Work Zone**: Demonstrates how to search for and select a road and SLK range to locate a work zone
4. **Real-Time GPS Tracking**: Introduces the drive page and GPS tracking features including speed monitoring and fine alerts
5. **You're All Set**: Confirmation that setup is complete, with quick links to key features

### 16.3 OnboardingChecklist Component

The `OnboardingChecklist` component provides a quick setup progress tracker that can be shown independently of the full wizard. It displays a checklist of essential setup tasks (offline data download, GPS permission, region selection) with completion status indicators, allowing returning users to quickly see what remains to be configured.

### 16.4 Accessibility Enhancements

The onboarding system includes comprehensive accessibility features:

- **ARIA Labels**: All interactive elements include descriptive ARIA labels for screen reader compatibility
- **Semantic HTML**: Proper heading hierarchy, landmark regions, and focus management
- **Keyboard Navigation**: Full keyboard support with visible focus indicators

### 16.5 Viewport Configuration

The onboarding system uses a user-scalable viewport setting to support pinch-to-zoom functionality, which is particularly important for users who may need to zoom in on text and controls while wearing gloves or in bright outdoor conditions.

### 16.6 Trigger Logic

Onboarding is triggered on the first app visit by checking for a localStorage flag. Once the user completes the onboarding wizard, the flag is set and the wizard does not reappear on subsequent visits. Users can access the manual (`/manual`) at any time for a refresher.

---

## 17. Saved Locations Logic

### 17.1 Overview

The Saved Locations system allows users to save, recall, and manage work zone locations for quick access. This feature was significantly enhanced in v1.34.0 with a migration from localStorage to IndexedDB for unlimited storage capacity.

### 17.2 IndexedDB-Based Storage

Saved locations are stored using `saved-locations-db.ts`, which implements an IndexedDB-based storage layer. The IndexedDB `savedLocations` object store (key path: `'id'`) is part of the main `RoadFinderDB` database.

**Migration from localStorage to IndexedDB (v1.34.0):**

Previously, saved locations were stored in localStorage, which has a typical 5-10MB per-origin limit. For users who save many work zone locations, this limit was easily exceeded. The migration to IndexedDB provides virtually unlimited storage capacity while maintaining the same data structure and access patterns.

### 17.3 Sort Options

Saved locations can be sorted by:

- **By Date**: Most recently saved locations appear first (default)
- **By Road name**: Alphabetical sorting by road name for quick lookup

### 17.4 Map View

The Saved Locations Map at `/saved-locations/map` provides an interactive map interface using Leaflet and react-leaflet:

- Displays all saved locations as markers on the map
- Clicking a marker shows location details
- Supports standard Leaflet interactions (zoom, pan, layer switching)
- Uses OpenStreetMap tile layer consistent with the rest of the application

### 17.5 Auto-Load Work Zone Search

When a user recalls a saved location, the application automatically populates the work zone search fields on the home page:

1. Set the region selector to the saved location's region
2. Set the road selector to the saved location's road ID
3. Populate start and end SLK fields
4. Automatically trigger the work zone lookup

This enables one-tap access to previously configured work zones.

---

## 18. WHS Library Logic

### 18.1 Overview

The WHS (Work Health and Safety) Library provides document management capabilities for accessing MRWA documentation, Traffic Management Plans (TMPs), and other reference materials. The system supports both online and offline document access with smart routing between viewer types.

### 18.2 Document Registry

The document registry (`registry.json`) maintains a structured index of all available documents:

```typescript
interface DocumentEntry {
  type: 'pdf' | 'tmp';
  filePath: string;
  downloaded: boolean;
  // ... additional metadata
}
```

The registry tracks each document's type, file path, and download status, enabling the application to determine which viewer to use and whether the document is available offline.

### 18.3 PDF Viewer

The `PdfViewerModal.tsx` component provides an in-app PDF viewing experience:

- **Landscape/Portrait Detection**: Automatically detects PDF page orientation and adjusts the viewer layout accordingly
- Supports standard PDF interactions: scrolling, zooming, page navigation
- Renders PDFs using a browser-compatible PDF rendering pipeline

### 18.4 TMP Viewer

The TMP (Traffic Management Plan) viewer is an image-based viewer designed specifically for Traffic Management Plans:

- Renders TMP documents as images rather than PDFs, providing faster loading and smoother scrolling
- Optimized for the typically large-format, detailed TMP drawings

### 18.5 Smart Document Routing

The library implements smart document routing based on document type:

- **TMP documents**: Routed to `/library/tmp` (image-based TMP viewer)
- **PDF documents**: Routed to `/library/viewer` (PDF viewer modal)

This routing is handled automatically when a user selects a document from the library browser, ensuring the optimal viewing experience for each document type.

### 18.6 Page Offset System

The WHS Library implements a page offset system to handle discrepancies between document page numbers and physical PDF page numbers:

```
Physical PDF page = document page + pageOffset
```

This accounts for cover pages, table of contents, and other front matter that causes the document's internal page numbering to differ from the PDF file's actual page index. The `pageOffset` value is stored per document in the registry.

### 18.7 AI Summaries

Select documents include AI-generated summary files that provide:

- Key sections and topics covered by the document
- Quick reference summaries for common queries
- Enables users to determine document relevance before opening the full document

### 18.8 Offline Status Indicators

The library displays clear offline status indicators for each document:

| Indicator        | Meaning                                               |
| ---------------- | ----------------------------------------------------- |
| 📥 Cached        | Document is cached and available offline              |
| 💾 Downloaded    | Document is permanently downloaded to device          |
| ⚠️ Cache cleared | Document cache has been cleared; re-download required |

These indicators help users understand which documents are available without network connectivity, which is critical for traffic controllers working in remote areas.

---

## 19. AI Assistant Module

The AI Assistant (Q&A) feature provides intelligent document search and question-answering capabilities, allowing traffic controllers to get answers from regulatory documents without manually searching through them.

### 19.1 AI Chat Architecture

The AI chat functionality is implemented through two API routes:

- **`/api/ai/chat`** (POST): Accepts a question and optional document context, returns AI-generated responses with source citations. Uses the z-ai-web-dev-sdk for LLM completions.
- **`/api/ai/verify`** (POST): Validates the AI API key before allowing access to chat features.

The chat flow follows this sequence:

1. User enters a question in the Q&A page (`/qa`)
2. Optional document selection filters the AI context to specific documents
3. The API sends the question with document context to the LLM
4. The response includes source citations and relevant section references
5. Users can save, copy, or favorite Q&A entries for later reference

### 19.2 Document Summarization

The document summarization pipeline (`/api/documents/summarize`) generates structured summaries of WHS and AGTTM documents:

- **Key Sections**: Extracts section titles and content
- **Key Requirements**: Identifies mandatory compliance requirements with priority levels
- **Compliance Notes**: Flags areas requiring specific attention
- **Diagram Analysis** (`/api/documents/analyze-diagrams`): Analyzes TMP diagrams for zone identification and layout patterns

Summaries are cached in `src/lib/summaries-storage.ts` and served from the library page for quick reference.

### 19.3 Q&A Storage

Saved Q&A entries are managed through:

- **Client-side**: `src/lib/qa-storage.ts` handles local Q&A history with favorites and search
- **Server-side**: `/api/qa-saved` provides full CRUD operations with cloud backup support
- Each entry includes the question, answer, source documents, timestamp, and optional category label

### 19.4 Document Selection and Context

The Q&A page allows users to select specific documents to constrain the AI's response context:

- Documents are grouped by category (AGTTM, WHS, MRWA, Forms)
- "Select All" and "Clear" buttons for bulk operations
- Selection count displayed in the interface
- Unselected context defaults to all available library documents

---

## 20. Technical Debt and Future Improvements

The current implementation has several areas identified for future improvement:

1. **Intersections API**: Could benefit from a more sophisticated node-based intersection detection algorithm using MRWA's intersection layer data.

2. **Signage Corridor Report**: Could include more detailed action recommendations based on sign type and proximity to the work zone.

3. **EKF Extension**: Could be extended with adaptive process noise that responds to observed GPS accuracy patterns.

4. **Spatial Index**: Performance could be improved by implementing a spatial index for road geometry, reducing the O(n) scan to O(log n) for road finding operations.

5. **AfterCare Sync**: Could add cloud synchronization for AfterCare jobs across devices.

6. **Push Notifications**: Could add reminders for due retrieval/maintenance signs.

7. **Live Traffic Integration**: Could integrate real-time traffic incident data from MRWA WebEOC.

---

_This document is part of the TC Work Zone Locator documentation suite, Version 1.35.0._
