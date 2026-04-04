# TC Work Zone Locator - Project Context

> **Last Updated:** 2026-04-03
> **Current Version:** 1.21.0
> **GitHub:** https://github.com/instructor-ship-it/roadfinder.git
> **Branches:** master, main (kept in sync)
> **Project Directory:** `/home/z/my-project/`

---

## ⚠️ IMPORTANT: Starting a New Chat Session

**Each new chat session starts with a FRESH file system.** Previous work is NOT automatically available.

### At the start of EVERY new session, tell the AI:

```
This is the TC Work Zone Locator project. The code is on GitHub.

Run these commands to get the latest code:
cd /home/z/my-project
rm -rf * .* 2>/dev/null || true
git clone https://github.com/instructor-ship-it/roadfinder.git .
bun install

Then read PROJECT_CONTEXT.md to get up to speed.

Apply the domain expertise from this file, then tell me what you understand about the project and ask what we should focus on.
```

### ✅ This workflow was tested and confirmed working on 2026-02-28

### Why this is needed:

| What Persists         | What Doesn't              |
| --------------------- | ------------------------- |
| Code pushed to GitHub | Local file system changes |
| Git history           | Uncommitted work          |
| PROJECT_CONTEXT.md    | Session memory            |

**GitHub is the only true persistence.** Always push changes before ending a session.

---

## 🧠 Domain Expertise

**Apply this expertise when working on the TC Work Zone Locator project:**

You are an expert in Australian road systems, specifically Western Australian road terminology and practices. You understand:

1. Australian left-hand driving conventions
2. MRWA (Main Roads Western Australia) road classification and data
3. SLK (Straight Line Kilometre) referencing system
4. Speed zone management and signage
5. Traffic control and work zone management
6. Carriageway terminology (True Left = INCREASING SLK, True Right = DECREASING SLK)
7. Double-sided speed signs and how they apply to different directions of travel

---

## 📖 Key Terminology (Australian Road System)

### Carriageway & Direction

| Term                  | Definition                        | Also Known As     |
| --------------------- | --------------------------------- | ----------------- |
| **True Left**         | Traffic travelling INCREASING SLK | Left Carriageway  |
| **True Right**        | Traffic travelling DECREASING SLK | Right Carriageway |
| **Left Carriageway**  | Used by INCREASING SLK traffic    | True Left         |
| **Right Carriageway** | Used by DECREASING SLK traffic    | True Right        |

**Important:** When facing INCREASING SLK direction:

- Left side of road = Left Carriageway = True Left
- Right side of road = Right Carriageway = True Right

### SLK (Straight Line Kilometre)

- Road distance marker used in WA
- Increases in one direction along the road
- Used to locate signs, zones, work areas

### Speed Signs

| Type                        | Description                          | Zone Created             |
| --------------------------- | ------------------------------------ | ------------------------ |
| **Single + Not Replicated** | Repeater sign (informational)        | None                     |
| **Single + Replicated**     | One-sided, paired with opposite sign | 1 directional zone       |
| **Double + Replicated**     | Two-sided sign (most common)         | 2 zones if speeds differ |

### Double-Sided Sign Fields

- **front_speed**: Speed shown on the face pointing in `direction` field
- **back_speed**: Speed shown on opposite face (for opposite traffic)
- **direction**: Which way the front face points (True Left or True Right)

**Example:** Sign at SLK 64.81, direction="True Left", front_speed=80, back_speed=110:

- Left Carriageway (increasing SLK) sees 80 km/h ← front_speed
- Right Carriageway (decreasing SLK) sees 110 km/h ← back_speed

### Speed Sign Override Data Structure

```json
{
  "id": "M031-S001",
  "road_id": "M031",
  "road_name": "Northam Cranbrook Rd",
  "common_usage_name": "Great Southern Hwy",
  "slk": 64.81,
  "lat": -32.09942741,
  "lon": 116.90796019,
  "direction": "True Left",
  "sign_type": "Double",
  "replicated": true,
  "start_slk": 64.81,
  "end_slk": 65.98,
  "approach_speed": 110,
  "front_speed": 80,
  "back_speed": 110,
  "verified_by": "field_observation",
  "verified_date": "2026-03-02",
  "note": "110→80 zone boundary.",
  "source": "community_verified",
  "mrwa_slk": 64.8,
  "discrepancy_m": 10
}
```

---

## Architecture Decisions

### Data Storage

| Data Type                | Storage      | Why                                                   |
| ------------------------ | ------------ | ----------------------------------------------------- |
| Road geometry, MRWA data | IndexedDB    | Large datasets, offline access                        |
| Speed sign overrides     | localStorage | User-editable, works on Vercel (read-only filesystem) |
| AfterCare jobs & signs   | localStorage | User-editable, offline tracking of signage retrieval  |
| App preferences          | localStorage | Simple key-value                                      |

### File Downloads on Mobile

**Problem:** Programmatic file downloads (Blob URLs) create empty files on some mobile browsers due to security restrictions.

**Solution:** Display data in a textarea for copy/paste. Export shows content on screen with "Copy" button.

### Sign-to-Zone Conversion Logic

Located in `/src/lib/offline-db.ts` → `signsToSpeedZones()` function:

1. Double sign with different front/back speeds → Creates TWO zones
2. Double sign with same speeds → Creates ONE Single carriageway zone
3. Single replicated sign → Creates ONE directional zone

---

## User Preferences

- User works on mobile phone
- Cannot edit JSON files directly on mobile
- Prefers copy/paste for data export
- Works with Australian road terminology daily

---

## Overview

A mobile-first web application for Traffic Controllers (TC) in Western Australia to:

- Locate work zones by road ID and SLK (Straight Line Kilometre)
- Track real-time GPS position with EKF filtering
- Display speed limits with lookahead warnings
- Work offline with 69,000+ roads downloaded

## Target Users

Traffic Controllers working on WA roads who need to:

- Find work zone coordinates for setup
- Navigate to work zone start/end points
- Track their position in real-time while driving
- Know upcoming speed zone changes before passing signs
- Work in remote areas without internet

---

## Architecture

### Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Offline Storage:** IndexedDB (client-side)
- **Maps:** Google Maps Links (no API key required)

### Key Files

```
src/
├── app/
│   ├── page.tsx              # Main work zone lookup page
│   ├── drive/page.tsx        # SLK tracking page (GPS)
│   ├── calibrate/page.tsx    # GPS calibration tool
│   ├── overrides/page.tsx    # Speed sign override management
│   ├── aftercare/page.tsx    # AfterCare signage tracking
│   └── api/
│       ├── roads/route.ts         # Road data, SLK coordinates
│       ├── gps/route.ts           # GPS to SLK conversion
│       ├── weather/route.ts       # Weather data (Open-Meteo)
│       ├── warnings/route.ts      # BOM weather warnings RSS feed
│       ├── traffic/route.ts       # Traffic volume data
│       ├── places/route.ts        # Nearby amenities (hospital, fuel, toilet)
│       ├── intersections/route.ts # Cross road detection
│       ├── admin-sync/route.ts    # MRWA direct sync
│       ├── overrides/route.ts     # Override storage (localStorage pass-through)
│       ├── speed-compare/route.ts # MRWA vs OSM speed limit comparison
│       ├── osm-speed/route.ts     # OpenStreetMap speed limit data
│       ├── speed-verify/route.ts  # Speed verification
│       ├── speedlimit/route.ts    # Speed limit lookup
│       ├── fuel-stations/route.ts # FuelWatch WA + Overpass fuel data
│       ├── hospitals/route.ts    # WA Health SLIP hospital data
│       ├── download-signs/route.ts# Sign data download
│       ├── export-pdf/route.ts    # Work zone report export
│       └── sync-data/route.ts     # Offline data sync
├── lib/
│   ├── offline-db.ts        # IndexedDB storage, signage corridor, sign-to-zone logic
│   ├── aftercare.ts         # AfterCare job/sign storage and management
│   ├── mrwa_api.ts          # MRWA ArcGIS API integration
│   ├── gps-ekf.ts           # Extended Kalman Filter for GPS
│   └── utils.ts             # Haversine distance calculation
├── hooks/
│   └── useGpsTracking.ts     # GPS tracking with EKF, speed zones
└── components/ui/            # shadcn components
```

---

## Data Sources

### Main Roads WA ArcGIS

| Layer | Data                                    | URL Variable         |
| ----- | --------------------------------------- | -------------------- |
| 17    | Road Network (has SLK geometry, region) | STATE_ROAD_URL       |
| 8     | Speed Zones                             | SPEED_ZONE_URL       |
| 15    | Rail Crossings                          | RAIL_CROSSING_URL    |
| 22    | Regulatory Signs                        | REGULATORY_SIGNS_URL |
| 23    | Warning Signs                           | WARNING_SIGNS_URL    |
| 18    | All Roads (for local roads)             | ALL_ROADS_URL        |

**Base URL:** `https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/Projects/RoadInfo/MapServer`

### External APIs

| Data             | Source                     | Notes                                              |
| ---------------- | -------------------------- | -------------------------------------------------- |
| Weather          | Open-Meteo                 | Free, no API key                                   |
| Weather Warnings | BOM RSS (IDZ00067)         | WA land warnings, 5-min cache                      |
| Fuel Prices      | FuelWatch WA JSON API      | `/api/sites?fuelType=DSL`, daily diesel prices     |
| Hospital Data    | WA Health SLIP Services    | SLIP API key (server-side), Layers 6 & 7           |
| Toilet Data      | National Public Toilet Map | ArcGIS Feature Service, 2,714+ WA toilets          |
| Places/Amenities | Overpass API               | OpenStreetMap (fallback for hospitals/fuel/toilet) |
| Traffic Volume   | Static MRWA data           | Pre-downloaded                                     |

---

## Key Features

### GPS Calibration Tool (v5.3.0)

- New `/calibrate` page for measuring GPS lag
- Capture target position (stationary)
- Capture pass position (moving)
- Calculate lag time automatically
- Export results to CSV
- Apply lag compensation to speed zone lookahead

### Speed Zone Lookahead

- Shows upcoming speed zone changes BEFORE reaching the sign
- **Yellow border**: Speed DECREASE ahead (warning shown)
- **White border**: Current speed (no warning for increases)
- **Green border**: Community-verified override zone (pulsating ✓ icon)
- Uses GPS lag compensation for accurate timing
- Configurable lookahead time (default 5 seconds)

### Work Zone Lookup (`/` route)

1. Select region → road → SLK range
2. Get work zone coordinates
3. See TC positions (±100m from work zone)
4. View signage corridor (±700m for signs, ±100m for intersections)
5. Weather, traffic volume, nearby amenities
6. Navigate to Google Maps / Street View

### SLK Tracking (`/drive` route)

1. GPS tracking with EKF filtering
2. Real-time SLK display
3. Current speed vs speed limit
4. Speed zone lookahead (amber border = upcoming decrease)
5. Direction indicator (towards/away from destination)
6. Distance remaining and ETA
7. SLK calibration for accuracy tuning

---

## Settings (⚙️)

### GPS Calibration

- **Lag Compensation:** Applied to speed lookahead calculations
- Measured using calibration tool
- Stored in localStorage

### GPS Filtering (EKF)

| Setting             | Default | Description                           |
| ------------------- | ------- | ------------------------------------- |
| EKF Filtering       | On      | Kalman filter for smoother GPS        |
| Road Constraint     | On      | Snap predictions to road geometry     |
| Max Prediction Time | 30s     | How long to predict during GPS outage |
| Show Uncertainty    | On      | Display ±Xm accuracy                  |
| Early Warnings      | On      | Alert earlier at higher speeds        |

### Wind Gust Alert

| Setting   | Default | Description                  |
| --------- | ------- | ---------------------------- |
| Threshold | 60 km/h | Alert when gusts exceed this |

---

## Development

### Version Consistency Check

Run before committing to ensure documentation matches code version:

```bash
bun run version-check
```

Checks version consistency across:

- `src/app/page.tsx` - App header version display
- `src/app/drive/page.tsx` - Drive page version display
- `src/app/overrides/page.tsx` - Overrides page version display
- `PROJECT_CONTEXT.md` - "Current Version:" header
- `README.md` - Version history "(Current)" marker
- `worklog.md` - "Current Version:" header
- `RC1_Test_Checklist.md` - Title version

### Updating Versions

When bumping version, update ALL of these files:

1. Code files (page.tsx, drive/page.tsx, overrides/page.tsx)
2. PROJECT_CONTEXT.md "Current Version:" header
3. README.md - Add new entry to Version History with "(Current)", remove "(Current)" from previous
4. worklog.md - Add task entry, update "Current Version:" header
5. RC1_Test_Checklist.md - Update title version

### PDF Generation

The project includes PDF generation capability using Python's reportlab library.

```bash
# Setup (install reportlab)
bun run setup:pdf

# Generate User Manual PDF
python3 scripts/create_user_manual_pdf.py
```

PDF output is saved to `/home/z/my-project/download/`

See `scripts/README.md` for full documentation of available scripts.

---

## Offline Capability

**The core features work 100% offline after downloading data.** This is essential for Traffic Controllers working in remote areas of Western Australia where cell coverage is unreliable.

### What Works Offline

| Feature                 | Storage                  | Notes                                |
| ----------------------- | ------------------------ | ------------------------------------ |
| Work Zone Lookup        | IndexedDB                | All 69,000+ roads                    |
| GPS Tracking            | Device + IndexedDB       | EKF filtering works offline          |
| SLK Position            | Computed locally         | Direction detection works offline    |
| Speed Zones             | IndexedDB + localStorage | Includes override zones              |
| Speed Sign Overrides    | localStorage             | Full CRUD operations                 |
| AfterCare Jobs          | localStorage             | Full job and sign tracking           |
| Signage Corridor        | IndexedDB                | Signs, intersections, rail crossings |
| TC Position Calculation | Computed locally         | ±100m from work zone                 |
| Direction Detection     | Computed from GPS        | True Left/True Right                 |
| Google Maps Links       | Generated URLs           | Opens Maps app                       |
| Pavement Data           | JSON file                | Lanes, widths, shoulders             |
| Traffic Volume          | JSON file                | AADT, peak hour, heavy %             |
| Nearby Amenities        | JSON file                | Hospitals, fuel, toilets             |
| Weather (cached)        | In-memory                | 30-minute cache with timestamp       |

### What Requires Internet

| Feature              | Source         |
| -------------------- | -------------- |
| Live Weather Updates | Open-Meteo API |
| BOM Weather Warnings | RSS Feed       |
| Street View Images   | Google Maps    |

### Tips for Remote Work

1. Download data before leaving coverage area
2. Run download scripts: `node scripts/download-additional-data.js` and `node scripts/download-amenities.js`
3. Weather shows "cached" timestamp when offline
4. All core TC functions work without internet

---

## Recent Changes (v5.x)

### 1.21.0 (Current) - Direct AI Chat for Q&A Assistant

- **AI Q&A Direct Chat Mode**
  - Configure z.ai API key in Settings for direct AI-powered answers
  - No key configured: Prompt generator mode (copy/paste to external AI)
  - Key configured: Direct AI chat with real-time responses
- **Settings → AI Assistant Section**
  - API key input with show/hide toggle
  - Enable/disable direct AI chat
  - Test Connection button to verify API key
  - Clear button to remove stored credentials
  - Security warning about localStorage storage
- **Q&A Page Dual Mode**
  - Auto-detects API key configuration
  - Shows appropriate interface based on configuration
  - Save AI responses to Q&A history
- **API Routes**
  - `/api/ai/test` - Test API key validity
  - `/api/ai/chat` - Chat completion endpoint
- **Files Changed**
  - `src/components/SettingsDrawer.tsx` (AI settings UI, version 1.21.0)
  - `src/app/qa/page.tsx` (dual mode support)
  - `src/app/api/ai/test/route.ts` (NEW)
  - `src/app/api/ai/chat/route.ts` (NEW)
  - `package.json` (version 1.21.0)

### 1.20.1 - Turbo Mode for GPS Tracking

- **Turbo Mode Toggle** on SLK Tracking page
  - Fast 200ms GPS refresh for precise SLK positioning
  - One-tap toggle between Default (adaptive) and Precision (200ms) modes
  - 5-minute auto-revert with countdown timer to prevent battery drain
  - Visual feedback: pulsing green button when Turbo active
- **Use Cases**
  - Creeping up to exact SLK marker at slow speed
  - Precise positioning for signage placement
  - Finding exact work zone boundaries
- **Technical Changes**
  - Modified `getThrottleInterval()` in useGpsTracking to respect `updateInterval` setting
  - Created `RefreshRateToggle` component with auto-revert countdown
  - Added turbo mode state management to drive page
- **Files Changed**
  - `src/hooks/useGpsTracking.ts` (precision mode override in throttle)
  - `src/components/drive/RefreshRateToggle.tsx` (NEW)
  - `src/app/drive/page.tsx` (turbo mode state, toggle UI)
  - `src/components/SettingsDrawer.tsx` (version 1.20.1)
  - `package.json` (version 1.20.1)

### 1.20.0 - Phase 4 Optimization: Type Safety & Lint Hygiene

- **TypeScript strict mode fully enabled**
  - Changed `noImplicitAny: false` → `true` in tsconfig.json
  - Fixed 4 implicit any type errors with proper type annotations
- **ESLint zero-warning baseline achieved** (18 → 0 warnings)
  - Fixed 3 genuine React hooks dependency bugs:
    - `src/app/manual/page.tsx` — Added `sections` to useMemo deps
    - `src/app/page.tsx` — Added `updateSelectedRegion` to useEffect deps
    - `src/hooks/useGpsTracking.ts` — Added `state.roadInfo` to useEffect deps
  - Documented 14 intentional omissions with eslint-disable comments
- **Build verification clean**
  - TypeScript: 0 errors (with noImplicitAny: true)
  - ESLint: 0 errors, 0 warnings
  - Tests: 57 passing
  - Next.js build: successful
- **Files Changed**
  - `tsconfig.json` (noImplicitAny: true)
  - `src/app/api/incidents/route.ts` (type annotation)
  - `src/app/api/speed-compare/route.ts` (type annotation)
  - `src/lib/mrwa_api.ts` (type annotation)
  - `src/lib/offline-db.ts` (type annotation)
  - `src/app/manual/page.tsx` (useMemo deps fix)
  - `src/app/page.tsx` (useEffect deps fix + eslint-disable comments)
  - `src/hooks/useGpsTracking.ts` (fullConfig useMemo wrapper + roadInfo dep)
  - Multiple components with eslint-disable comments for intentional omissions

### RC 1.9.9 - Work Zone Report Overhaul, Traffic Override, Speed Zone Layout

- **User Traffic Count Override** on Work Zone Info page
  - Blue "Using live count data" banner with revert button
  - Swaps live count VPH/heavy% into all calculations (shuttle flow, lane capacity, max hold time, queue growth, sign distances)
  - MRWA data remains visible as reference; override clears on reset/new search
- **Traffic Count Detail Modal**
  - Tappable user traffic count rows open detail modal with full breakdown
  - "📊 Use This Count" button to transfer data into work zone calculations
- **Saved Locations Auto-Load** — recalling a location auto-triggers work zone search
- **Speed Zone Layout Graphic in HTML Report**
  - Colored CSS bar, sign position markers, intersection lines, SLK scale
  - TC Signage Position table (TC, PTS, Box PTS, SR/RNST, RWA)
  - Zone segment detail table with speed colors and source tags
- **Report Enhancements**
  - Live count data section (both text and HTML reports)
  - Traffic calculations section (effective VPH, heavy reduction, shuttle flow, lane capacity, max hold time, queue growth, sign distances)
- **Site Distance Input Fix** — defer clamping to onBlur instead of onChange
- **Report Formatting Fixes** — dark Recommended Stop colour, footer version, Close button visibility
- **National Public Toilet Map** via ArcGIS (2,714+ WA toilets)
- **Files Changed**
  - `src/app/page.tsx` (override, modal, reports, speed zone layout, site distance fix)
  - `src/app/traffic-counter/page.tsx` (site distance fix)
  - `src/lib/toilet-map.ts` (NEW - ArcGIS toilet data)
  - `src/app/api/fuel-stations/route.ts` (toilet source integration)

### RC 1.9.8 - Amenities Data Source Upgrades, Pace Rate Indicator

- **FuelWatch WA JSON API** (replacing broken RSS feed)
  - Diesel prices from `/api/sites?fuelType=DSL` endpoint
  - RSS feed silently ignored diesel (returned ULP prices instead)
  - 459 diesel stations statewide with accurate daily pricing
  - Fuel type code mapping: DL→DSL, ULP, PULP, BDL, 98R, LPG, E85
- **WA Health SLIP Services** for hospital data (replacing Overpass for hospitals)
  - Accurate ED status, hospital type, bed counts, addresses
  - Nursing posts included for remote/regional work zones
- **Three-Source Amenity Architecture** with smart fallback chain
  - Hospital: WA Health SLIP → Overpass fallback
  - Fuel: FuelWatch WA JSON API + Overpass merge (200m dedup)
  - Toilet: National Public Toilet Map ArcGIS → Overpass fallback
- **Pace Rate Indicator** on drive page
  - Time delta vs posted speed for 1km, 10km, 100km
  - Colour coded: grey (under posted), green (at posted ±2 km/h), red (over posted)
  - Hidden when speed <60 km/h or no speed limit
  - Displayed under GPS confidence accuracy line (both landscape and portrait)
- **Fuel Price Display Bug Fix**
  - Fixed 3 UI locations showing cents as dollars ($299.2/L → $2.99/L)
- **Files Changed**
  - `src/app/api/fuel-stations/route.ts` (rewritten: RSS → JSON API)
  - `src/app/page.tsx` (fuel price display fix)
  - `src/components/home/AmenitiesSection.tsx` (fuel price display fix)
  - `src/app/drive/page.tsx` (pace rate indicator, removed getMinutesPerKm/getTimeFor10km)

### RC 1.9.1 - Traffic Counter Tool

- **New Traffic Counter Tool** (`/traffic-counter`)
  - Count light and heavy vehicles separately
  - Timer with presets (3, 5, 15 minutes) or custom duration
  - Direction mode: One-way or Both-ways (True Left/True Right)
  - Live VPH (Vehicles Per Hour) calculation
  - Heavy vehicle percentage tracking
- **Features**
  - Large touch-friendly buttons for in-vehicle use
  - Haptic feedback on button press
  - Undo per counter (−1 button)
  - GPS location capture with road ID/SLK identification
  - Screen stays on during counting (Wake Lock API)
- **Reference Tables Built-In**
  - Lane Capacity (AGTTM Part 2, Table 3.1)
  - Shuttle Flow Lengths (AGTTM Part 2, Table 3.5)
  - Volume Reduction Factors (MRWA COP)
  - Queue Length Multipliers (AGTTM Part 3, Table 4.3)
- **History & Export**
  - Save counts with location, date, time, notes
  - View count history
  - Copy/share count reports
  - Export all history as JSON
- **Integration**
  - Link from TC Tools in hamburger menu (home page)
  - Link from TC Tools in drive page settings drawer
- **Files Added/Changed**
  - `src/app/traffic-counter/page.tsx` (NEW - counter interface)
  - `src/lib/traffic-counter-storage.ts` (NEW - storage management)
  - `src/app/page.tsx` (added Traffic Counter to TC Tools)
  - `src/app/drive/page.tsx` (added Traffic Counter to TC Tools)

### RC 1.9.0 - AI Q&A Assistant

- **New AI Q&A Assistant** (`/qa`)
  - Ask questions about traffic management, WHS, and road work documents
  - AI searches document abstracts for relevant information
  - Powered by z-ai-web-dev-sdk (requires internet connection)
- **Document Selection**
  - Select specific documents to search, or search all
  - Documents grouped by category for easy selection
  - Shows which documents were searched for each answer
- **Q&A History**
  - Save useful Q&A entries for future reference
  - Mark entries as favorites
  - Categorize entries with custom labels
  - Search through saved Q&A history
- **Export/Import**
  - Export Q&A history as JSON backup
  - Import Q&A history from backup
- **Integration**
  - Link from Library page header (🤖 AI Q&A button)
  - Link from Settings menu → Library section
- **Files Added/Changed**
  - `src/app/qa/page.tsx` (NEW - Q&A interface)
  - `src/app/api/qa/route.ts` (NEW - AI API endpoint)
  - `src/lib/qa-storage.ts` (NEW - localStorage management)
  - `src/app/library/page.tsx` (added AI Q&A button)
  - `src/app/page.tsx` (added Q&A link to Library section)

### RC 1.8.0 - Library Offline Status Indicators

- **Updated Offline Status Indicators**
  - 📥 (green) = Cached in browser storage - Available offline
  - 💾 (blue) = Downloaded to device - Permanently saved
  - ⚠️ (red) = Cache was cleared - Re-cache needed
- **Added Download Tracking** (`src/lib/offline-storage.ts`)
  - `DownloadedDocument` interface for tracking downloaded files
  - `markDocumentDownloaded()` - Tracks when user downloads a file
  - `isDocumentDownloaded()` - Checks if file was downloaded
  - `getDownloadedDocuments()` - Gets all downloaded document records
  - Note: Web apps cannot verify files still exist on user's device
- **Added Cache Verification**
  - `verifyCacheExists()` - Checks if cached file actually exists in Cache API
  - `getDeletedCacheIds()` - Returns IDs of documents whose cache was cleared
  - Detects when browser clears cache but localStorage tracking remains
- **Added Download Folder Tip**
  - Suggests creating `Documents/TCLibrary` folder for organized downloads
  - Shown in legend section and document info dialog
- **Files Changed**
  - `src/lib/offline-storage.ts` (downloaded tracking, cache verification)
  - `src/app/library/page.tsx` (updated indicators, cache deleted warning)

### RC 1.7.28 - Geometry-Based Intersection Verification

- **TMP Viewer Mobile Responsiveness Fix**
  - Fixed TMP viewer not working well on mobile phones
  - Replaced fixed-width TOC sidebar (320px) with mobile-friendly drawer
  - Added bottom navigation bar with Prev/Next buttons and page counter
  - All buttons have touch-friendly sizing (48px height)
  - Responsive grid: 2 columns on mobile, up to 6 on desktop
  - Keyboard navigation support (arrow keys)
- **Added geometry verification for intersecting roads**
  - Roads found via node-based matching now verified to ACTUALLY CROSS
  - Parallel roads (sharing nodes but not intersecting) are now filtered out
  - Uses segment intersection testing to confirm roads cross
  - Console logs filtered parallel roads for debugging: `[RC 1.7.28] Filtering parallel road: RoadName at SLK X.XX`
- **Technical improvements**
  - Added `segmentsIntersect()` function for line segment intersection testing
  - Added `verifyRoadsActuallyCross()` async function with ArcGIS geometry query
  - Added `checkGeometryCrosses()` for multi-feature geometry comparison
  - Source field updated to "State Road Network (Verified)" for validated roads
- **Previous RC 1.7.28 changes retained**
  - Layer 6 NODE_DESCR verification for intersection names
  - Reference road filtering (case-insensitive)
  - Duplicate intersection deduplication

### RC 1.7.17 - Emergency Location Cross Road Detection Fix

- **Created shared emergency module** (`src/lib/emergency.ts`)
  - Consolidated ~200 lines of duplicated code from page.tsx and drive/page.tsx
  - Functions: findCrossRoad(), findNearestTown(), findNearestHospital(), findNearestFireStation(), findNearestPoliceStation()
- **Fixed cross road detection using Layer 6 (Intersections)**
  - Previous issue: Emergency showing "Northam Cranbrook Rd" (parallel road) instead of "Elizabeth St" (intersecting road)
  - Root cause: ArcGIS API `resultRecordCount=50` was cutting off closer intersections
  - Fix: Increased `resultRecordCount` to 200 to capture all nearby intersections
- **Added utility functions to `src/lib/utils.ts`**
  - `getBearing()` - Calculate bearing between two GPS points
  - `getDirectionFromBearing()` - Convert bearing to cardinal direction
  - `formatDistance()` - Format meters as m or km appropriately
- **Fixed distance display bug** - was showing "100mm" instead of "100m"

### RC 1.7.14 - Emergency Location Enhancement

- **Added locality (town) name to emergency location**
  - GPS API now returns LG_NAME field from MRWA data
  - Shows town name (e.g., "Moora") instead of just region ("Wheatbelt")
- **Added nearest town distance to emergency message**
  - Queries OpenStreetMap for nearby towns/cities
  - Shows distance and cardinal direction to nearest town
  - Example: "about 7.4km southeast of Moora"
- **Distance formatting improvements**
  - Shows km for distances ≥1000m (e.g., "1.5km" instead of "1500m")
  - Removes unnecessary .0 for whole kilometers
- **Fixed cardinal direction calculation**
  - Direction now correctly shows where user is relative to town

### RC 1.6.0 - AfterCare Map View

- **New AfterCare Map Page** (`/aftercare/map`)
  - Full-screen OpenStreetMap with colored pins for all signs
  - Filter buttons: All / 🔴 Retrieval / 🟡 Maintenance / 🟢 Active
  - Colored markers indicate sign status at a glance
  - Popup details on tap: road ID, SLK, sign type, direction, description
  - Legend bar at bottom shows color meanings
  - Back button returns to AfterCare page
  - Works with GPS coordinates stored in AfterCare jobs
- **Technical Implementation**
  - Leaflet + react-leaflet for mapping
  - Dynamic imports to disable SSR (required for Leaflet in Next.js)
  - CSS-in-JS div icons for colored circle markers
  - Fixed viewport layout (`fixed inset-0`) for proper map containment
  - Auto-centers on signs, defaults to Perth if no signs

### RC 1.5.9 - Expanded Offline Data Support

- **Added offline support for additional data types**
  - Pavement data (MRWA Layer 12) - lanes, widths, shoulders
  - Traffic volume (MRWA Layer 27) - AADT, peak hour, heavy vehicles
  - Nearby amenities (OpenStreetMap) - hospitals, fuel stations, toilets
  - Weather data caching (30 minutes, shows "last updated")
- **API improvements**
  - All APIs now fall back to offline data when network unavailable
  - Added 5-second timeout to prevent indefinite hanging
  - Offline fallback checked before API calls
- **Download scripts created**
  - `scripts/download-additional-data.js` - Pavement and traffic data
  - `scripts/download-amenities.js` - OpenStreetMap amenities

### RC 1.5.8 - Report Signage Fix

- **Fixed signage corridor report showing wrong items**
  - Intersections now filtered to ±100m from work zone (was showing ±700m)
  - All signage now explicitly filtered to ±700m corridor bounds
  - Fixed text report and HTML report to use consistent filtering
- **Report improvements**
  - Total items count now reflects actual filtered items
  - Intersections shown separately with correct label

### RC 1.5.7 - Offline Startup Fix

- **Fixed app hanging on startup without internet**
  - Added `navigator.onLine` check in `fetchRegions()` before attempting API call
  - If offline, skip API entirely and load from static `metadata.json`
  - Added 5-second timeout with AbortController to prevent indefinite hanging
  - Fixed `fetchRoads()` with same offline-first logic and timeouts
  - All fallback paths now respect saved default region from localStorage
- **Result**: App now opens instantly (< 1 second) regardless of internet status

### RC 1.5.6 - Offline Data Source Toggles

- **New Offline Data Source Toggles**
  - 6 toggles to switch between online API and offline IndexedDB data
  - Toggles appear in Settings → Offline Data section after downloading data
  - Toggles persist in localStorage
  - "Reset All" button to restore defaults
- **Toggle Functions**:
  | Toggle | ON (Offline) | OFF (Online) |
  |--------|--------------|--------------|
  | Roads List | IndexedDB only | API → IndexedDB fallback |
  | Work Zone Lookup | IndexedDB only | API → IndexedDB fallback |
  | Speed Zones | Show from IndexedDB | Hide from corridor |
  | Rail Crossings | Show from IndexedDB | Hide from corridor |
  | Regulatory Signs | Show from IndexedDB | Hide from corridor |
  | Warning Signs | Show from IndexedDB | Hide from corridor |
- **Default behavior**: All toggles OFF = online mode (preserves existing behavior)
- **Safe incremental testing**: Each component can be tested independently

### RC 1.5.3 - Work Zone Report Feature

- **New Work Zone Report Generator**
  - Added "Generate Work Zone Report" button at bottom of work zone info page
  - Creates comprehensive report including:
    - Work Zone Summary (road ID, name, SLK range, carriageway, lanes, road width)
    - Speed Zones (approach, TC positions, work zone)
    - TC Positions with coordinates and Google Maps links
    - Signage Corridor (speed signs, warning signs, rail crossings, intersections)
    - Weather data (current conditions, sun data, UV index)
    - Weather Warnings (if any BOM alerts active)
    - Traffic Volume (AADT, peak hour, heavy vehicles)
    - Nearby Amenities (hospital, fuel station, toilet)
    - Intersecting Roads in TC Zone
    - Google Maps Links
  - Report displayed in modal with Copy to Clipboard and Download buttons
  - Downloadable as timestamped .txt file

### RC 1.5.2 - Multi-Region Roads Fix

- **Fixed roads missing from regions they should be in**
  - Download script was only storing each road in its first-seen region
  - Roads like H005 (Great Eastern Hwy) span multiple regions but were only in Metropolitan
  - Fixed `processRoads()` to key by `road_id + region` instead of just `road_id`
  - Regenerated all data files with corrected logic
- **Wheatbelt now has 11 H-roads** (was 7) including H005, H006
- **Wheatbelt now has 23 M-roads** (was 17)

### RC 1.5.1 - State Roads Filter Fix

- **Fixed road dropdown showing local roads instead of state roads**
  - `getRoadsForRegion()` now filters to only return H-prefix and M-prefix roads
  - Static data files contain all roads (local + state), but dropdown should only show state roads
  - API correctly filtered but IndexedDB fallback did not
- **Fixed regions not loading when MRWA API fails**
  - Added fallback to static metadata.json for regions list
  - Better error handling in `fetchRegions()` function

### RC 1.5.0 - Nearby Signs Page & Filtered View

- **New Nearby Signs Page** (`/drive/nearby-signs`)
  - Dedicated page for viewing only signs requiring action
  - Shows only due-retrieval and due-maintenance signs
  - Job edit button layout: **Edt** | **Nav** | **Ret** | **Early** | **Del**
  - Inline SLK editing with Save/Cancel
  - Google Maps navigation per sign
  - Mark retrieved or mark due-early functionality
  - Delete sign with confirmation
  - "Open All in Google Maps" for route planning
- **Filtered View on SLK Tracking**
  - AfterCare indicator on drive page shows only signs requiring action
  - Red dot = due for retrieval, Yellow dot = due for maintenance
  - Clicking opens Nearby Signs page with full action buttons
- **AfterCare Records Display Improvements**
  - Increased from 3 to 5 records shown on SLK tracking
  - Increased font size for better readability
  - Added distance in metres for each sign
- **Type Safety Fix**
  - Fixed `getStatusInfo()` parameter type mismatch
  - Maps `SignStatus` to `ComputedJobStatus` correctly
- **Print Report Button Improvements**
  - Changed from white outline to purple background for better visibility
  - Reduced button size to match route optimization buttons
  - Moved above import/export buttons, consolidated with route buttons

### RC 1.4.0 - AfterCare Signage Tracking System

- **New AfterCare Module** (`/aftercare`)
  - Track signage placed on roads awaiting retrieval
  - Job-based organization with multiple signs per job
  - Sign categories: Surface, Speed, Hazard
  - User-defined custom sign type presets
  - True Left / True Right direction support
  - "Both sides" quick entry for same sign at same SLK
- **Retrieval Scheduling**
  - Standard: Auto-flags after 2 days
  - Scheduled Date: User-specified retrieval date
  - Maintain: Daily/Weekly/Monthly maintenance schedules
  - TBA: Indefinite until marked for retrieval
- **Status Tracking**
  - Auto-flagging for due retrieval/maintenance
  - Grouped job list by status (Due, TBA, Active, Archived)
  - Individual sign status tracking
  - Mark all retrieved or maintained
- **Navigation & Sharing**
  - Google Maps link generation for sign locations
  - Shareable job summary text
  - Export/Import all jobs (JSON backup)
- **Integration**
  - Accessible from TC Tools menu on home page
  - Works offline with localStorage persistence

### RC 1.3.0 - Set Distance & Lane Naming

- **Set Distance Feature** (renamed from SLK Meter)
  - Full screen modal display for distance tracking
  - Text link in TC Tools (not button), auto-closes settings drawer
  - Large distance displays (7xl/8xl font)
  - 3 action buttons: Set Ref | Mark | Reset (equal size, side by side)
  - Reset button in red, X button to close modal
  - Distance in 10m increments (not every meter)
  - Total distance = accumulated marks + current distance (live)
- **TC Tools Index Style**
  - Set Distance: indented text link (no underline)
  - Export Work Zone Info: moved to TC Tools, text link format
- **Lane Direction Diagram Improvements**
  - Lane names (L1, L2, etc.) for roads with 3+ lanes
  - Arrows always shown with lane name below
  - Correct curb-side numbering: L1 always closest to curb
  - INCREASING: L1 = leftmost lane
  - DECREASING: L1 = rightmost lane (reversed numbering)

### RC 1.2.26 - SLK Meter 10m Increments & Live Total

- **Distance Display Improvements**
  - Changed from 3 decimal precision (0.000m) to 10m increments (0, 10, 20, 30...)
  - Easier to read while driving
- **Total Distance Now Live**
  - Displayed prominently under current distance with same large font
  - Updates in real-time: accumulated marks + current distance from reference
  - Green color for visual distinction from current distance (cyan)
- **UI Layout**
  - Combined distance displays in single dark card
  - Total distance = sum of all marked distances + current distance

### RC 1.2.25 - SLK Meter Feature

- **SLK Meter in TC Tools Section**
  - GPS-based distance measurement from reference point
  - Current SLK and road name display via /api/gps
  - Mark button records positions with distance and SLK
  - Set Ref button updates reference point to current position
  - Reset button clears all marks and totals
  - Stop button ends GPS tracking
  - Haversine formula for accurate distance calculation
- **TC Tools Section**
  - Cyan color theme (text-cyan-400, border-cyan-500/60)
  - Collapsible, minimized by default

### RC 1.2.20 - UI Simplification & Pavement Data

- **Removed color indication from hamburger menu (☰)**
  - Previously showed green (offline ready) or gray (not ready)
  - Now shows consistent gray background
  - User feedback: color indication was annoying
- **Offline status still visible** in header text ("• Offline Ready")
- **Added pavement data to Work Zone Summary**
  - Displays number of lanes from MRWA Layer 12 (Pavement and Surfacing State)
  - Displays road width in metres
  - Added `getPavementData()` function in roads API
  - Lane count interpretation varies by carriageway type

### RC 1.2.17 - Landscape Mode Optimization

- **Landscape layout for in-vehicle phone mounts**
  - Automatic orientation detection
  - 2-column side-by-side layout when in landscape
  - Larger text for at-a-glance readability
  - Left column: SLK and road info
  - Right column: Speed/limit OR destination info
  - Compact footer bar for destination details
  - GPS signal indicator moved to header
  - Minimal "Exit" button in landscape mode
- **New useOrientation hook** for detecting screen orientation
- **Portrait layout preserved** as default

### RC 1.2.16 - Navigation Cleanup

- **Removed 3-dot menu from drive page**
  - Menu was confusing as it returned to home page
  - Clean header layout with centered title
- **Settings icon changed to hamburger menu**
  - Changed from ⋮ (three dots) to ☰ (hamburger/parallel bars)
  - Standard mobile navigation pattern
  - Color still indicates offline status (green/gray)
- **Documentation synchronized**
  - All version numbers updated
  - User manual updated for hamburger menu

### RC 1.2.15 - UI Consistency & Navigation

- **Settings Menu Icon Changed**
  - Replaced ⚙️ gear icon with ⋮ (three-dot menu)
  - Retained green/gray color coding for offline status
- **Info Line Under Titles**
  - Both pages show consistent info: `vRC 1.2.15 EKF • Offline Ready`
- **About Section Layout**
  - Version number left-justified

### RC 1.2.14 - Settings Restructure

- **Settings Sections Reorganized Alphabetically**
- **User Manual moved into About section**
- **New About Section** with contact, contributors, built with info
- **SLK Color Logic Updated** (White = no destination)

### RC 1.2.13 - GPS Indicator Refinement

- **Moved GPS signal strength indicator**
  - Relocated from header to SLK Tracking status position
  - Replaced redundant "Active" text indicator with signal bars
  - Shows "Waiting for GPS..." while acquiring position
  - Shows "Inactive" when tracking is stopped
- **Version:** RC 1.2.13

### RC 1.2.12 - UI/UX Refinements

- **Settings Drawer Visual Hierarchy**
  - Replaced +/- with rotating chevron icons (›) for expand/collapse
  - Added 4px colored left border accent on expanded sections
  - Each section has its own accent color (blue, purple, orange, gray, amber)
  - Cleaner section headers with border-b styling
- **GPS Status Indicator** (Drive page)
  - Added signal strength indicator in header when tracking active
  - Shows 5 bars with color coding based on GPS accuracy
  - Green (excellent <10m), Yellow (fair <20m), Orange (poor <30m), Red (very poor ≥30m)
  - Tooltip shows exact accuracy value on hover
- **Version:** RC 1.2.12

### RC 1.2.11 - Settings Cleanup

- **Moved Debug button to Admin Data Sync section**
  - Debug button now inside minimized Admin Data Sync section
  - Cleaner Settings drawer with less clutter
- **Version:** RC 1.2.11

### RC 1.2.10 - User Manual Cleanup

- **Removed distracting sticky Quick Reference footer**
  - Footer was always visible at bottom and distracting
  - Quick Reference info still available in Section 10 of manual
- **Version:** RC 1.2.10

### RC 1.2.9 - User Manual Hybrid Approach

- **User Manual redesigned with Hybrid Approach**
  - **Search functionality** - Filter sections by keyword, title, or content
  - **Quick nav chips** - One-tap access to common sections (Intro, Offline, GPS, Settings, Fix)
  - **View toggle** - Switch between Accordion (one at a time) and Full (scrollable) views
  - **Quick Reference footer** - Always-visible key info (directions, colors, distances)
- **Version:** RC 1.2.9

### RC 1.2.8 - Settings Bottom Sheet Drawer

- **Settings converted to Bottom Sheet Drawer**
  - Replaced inline settings dialog with mobile-friendly bottom sheet drawer
  - Swipe down to close, tap outside to dismiss
  - Cleaner UI with more screen space for main content
- **User Manual removed from Settings**
  - User Manual has its own dedicated button (📖) in the header
  - Removed redundant link from Settings menu
- **Version:** RC 1.2.8

### RC 1.2.7 - Settings Reorganization Fix

- **FIXED: Implemented documented RC 1.2.6 changes that were not applied to code**
- **Tools Menu Removed**
  - Removed Tools menu (🔧) from /drive page header
  - Removed unused `showTools` state variable
- **Settings Categories Reorganized** (now with collapsible sections):
  - Offline Data (📦) moved to TOP, expanded by default
  - GPS & Tracking (📍) - minimized by default, contains Speed Display toggle + GPS Filtering + GPS Calibration
  - Speed Zone Overrides (🔧) - minimized by default
  - Preferences (⚙️) - minimized by default, contains Default Region + Wind Gust Threshold
  - User Manual (📖) - link button at bottom
  - Admin Data Sync - minimized by default
- **Version:** RC 1.2.7

### RC 1.2.6 - Settings Reorganization (Documentation Only)

- **Documented but not implemented** - Changes were added to PROJECT_CONTEXT.md but code was not updated
- See RC 1.2.7 for actual implementation

### RC 1.2.4 - Unified SLK Tracking Display

- **Speed Display Toggle**
  - Moved speed display toggle from home page to SLK tracking page
  - Toggle in Settings controls visibility of speed/limit during tracking
  - Defaults to OFF (hidden by default)
- **Unified Location Display (Option B)**
  - Single adaptive display that changes based on scenario:
    - **No target:** Large SLK + road info
    - **Target on same road:** SLK + target info + distance + ETA + navigation
    - **Target on different road:** SLK + road info + destination section
  - Removed redundant Current Location and Trip Progress boxes
  - Cleaner, more compact layout
- **Target Tracking Layout Improvements**
  - Target SLK shown below road name (small, cyan/light blue)
  - Format: "Target: 47.00 SLK"
  - Distance display as large text below road info
  - Distance in metres if < 1km, kilometres if ≥ 1km
  - ETA full width (speed removed from this section)
  - Navigation buttons at bottom

### RC 1.2.3 - Speed Display Toggle (Superseded)

- **Speed Display on Home Page**
  - Initial implementation on home page (moved to /drive in RC 1.2.4)
  - Toggle in Settings to show current speed and posted speed
  - Defaults to OFF

### RC 1.2.2 - User Manual Page

- **User Manual Page** (`/manual`)
  - Added comprehensive HTML-based user manual
  - Mobile-friendly, collapsible sections
  - Covers all features including offline capability
  - Includes troubleshooting guide and quick reference
- **Header Icon**
  - Added 📖 book icon to header on all pages
  - Opens user manual instantly in browser
  - No download required (HTML format)

### 2026-03-04 - Documentation Sync & PDF Generation

- **Documentation Audit**
  - Identified version drift: worklog.md showed RC 1.0.4, code was RC 1.2.1
  - Updated README.md with missing RC 1.2.1 entry
  - Updated PROJECT_CONTEXT.md with 8 missing API routes
  - Updated RC1_Test_Checklist.md to RC 1.2.1
  - All Word documents regenerated to RC 1.2.1
- **Version Check Script**
  - Created `scripts/version-check.sh` for automated consistency checking
  - Added `version-check` and `docs-check` npm scripts
  - Prevents future documentation drift
- **PDF Generation Skill**
  - Added Python reportlab library for PDF generation
  - Created `scripts/create_user_manual_pdf.py`
  - Added `setup:pdf` npm script
  - Created `scripts/README.md` documenting all scripts
- **User Manual**
  - Created comprehensive user manual (Word + PDF)
  - Covers all features including offline capability
  - Includes troubleshooting guide and quick reference
  - Saved to `/home/z/my-project/download/`

### RC 1.2.1 - Override Zone Visual Indicator

- **Pulsating icon for override zones**
  - When driving through a community-verified speed zone, a pulsating ✓ icon appears
  - Green border around speed limit circle indicates override zone
  - "VERIFIED" label and "Community Verified Zone" text provide clear indication
  - Helps drivers distinguish MRWA data from field-verified speed zones
  - Added `currentOverrideZone` computed value in drive page using `useMemo`
- **Fixed default sign direction bug**
  - Issue: `DEFAULT_SIGNS` in overrides page had `direction: "True Right"` instead of `"True Left"`
  - This would have created INVERTED speed zones (wrong carriageway assignments)
  - Changed all 4 M031 signs to `direction: "True Left"`
  - Changed form default from `True Right` to `True Left`
  - Validated `signsToSpeedZones()` correctly processes double-sided signs

### RC 1.2.0 - Speed Sign Override System

- **Fixed double-sided sign interpretation**
  - Issue: `signsToSpeedZones()` only used `front_speed`, ignored `back_speed`
  - Fix: Double signs with different speeds now create TWO zones (one per direction)
  - Double signs with same speeds create ONE Single carriageway zone
- **Fixed carriageway mapping**
  - Corrected: True Left = Left Carriageway = INCREASING SLK
  - Corrected: True Right = Right Carriageway = DECREASING SLK
  - Updated `signsToSpeedZones()` and `getSpeedLimitForDirection()` functions
- **Mobile export fix**
  - File downloads create empty files on some mobile browsers
  - Solution: Export displays data in textarea for copy/paste
  - Added "Copy to Clipboard" button for reliable mobile export
- **Merged context files**
  - Merged AI_CONTEXT.md into PROJECT_CONTEXT.md for single source of truth
  - Added domain expertise prompt and terminology reference
- **New features in overrides page**
  - Add/Edit/Delete speed signs
  - Import from JSON file
  - Export with copy/paste (mobile-friendly)
  - Clear all data option

### RC 1.0.2 - Bug Fix Release

- **Fixed road priority causing opposite problem**
  - Issue: RC 1.0.1 was preferring State Roads even when far away (e.g., 103m)
  - Fix: Priority now only applies as tiebreaker when distances are within 50m
  - If State Road is 103m away and Local Road is 20m away → Local Road is selected (correct)
  - If State Road is 50m away and Local Road is 45m away → State Road is selected (correct)
- **Added automatic data clearing before download**
  - IndexedDB is now cleared before downloading new data
  - Prevents corruption from partial/incomplete previous downloads
- Root cause of original issue was corrupt IndexedDB data, not priority logic

### RC 1.0.1 - Bug Fix Release

- **Fixed GPS tracking prioritizing Local Roads over State Roads**
  - Issue: GPS tracking was incorrectly matching nearby Local Roads instead of State Roads (M-roads, H-roads)
  - Root cause: `findRoadNearGps()` simply returned the closest road without considering road importance
  - Fix: Added `getRoadTypePriority()` function to prioritize State Roads over Local Roads
  - Priority order: State Roads (1) > Regional Roads (2) > Local Roads (3) > Miscellaneous (4)
  - Example: M031 at SLK 64.64 is now correctly matched instead of nearby Seabrook St
- Added `worklog.md` for tracking development history
- Updated documentation with road priority system details

### RC 1.0 - Release Candidate

- **Official Release Candidate for production deployment**
- All UI/UX finalized and documented
- Complete feature set for Traffic Controller work zone operations
- Documentation:
  - TC_Work_Zone_Locator_RC1_Documentation.docx (Layout & Functionality)
  - TC_Work_Zone_Locator_Data_Sources.docx (Data Query Sources)

### v5.3.7

- **UI Improvements**
  - Local roads: Added manual road ID entry (no longer requires GPS lookup)
  - Drive page: Removed lookahead compensation message
  - Drive page: Removed Accuracy display from Current Location dialog

### v5.3.6

- **UI Improvements**
  - Changed "Back to Work Zone Locator" button from red to dark blue (consistency)
  - Updated on both drive and calibrate pages

### v5.3.5

- **UI Improvements**
  - Amenities dialog: Navigate/Street View buttons converted to small icon buttons
  - Signage Corridor: Intersections now filtered to ±100m from work zone (previously ±700m)
  - Signage Corridor: Removed Regulatory Signs section (clutter reduction)

### v5.3.4

- **UI Cosmetic Updates**
  - Changed "Start SLK Tracking" buttons from orange to dark blue
  - Work Zone Summary: Moved large buttons to small icon buttons right-justified
  - TC Positions: Moved large buttons to small icon buttons, removed coordinates
  - Cleaner, more compact layout

### v5.3.3

- **BOM Weather Warnings RSS Integration** (RESTORED)
  - Created `/api/warnings/route.ts` for BOM RSS feed fetching
  - Real-time WA land warnings from BOM RSS feed (IDZ00067)
  - Warnings displayed inline in Weather section with links
  - Warning count badge in Weather section header
  - 5-minute cache to avoid overloading BOM servers
- **Wind Gust Alert Threshold**
  - New setting to configure wind gust alert threshold (default 60 km/h)
  - Alert displayed when gusts exceed threshold
  - Important for traffic control device safety
  - Configurable threshold buttons: 40, 50, 60, 80 km/h
- **BOM Radar/Warnings Links**
  - Added quick links to BOM Radar and BOM Warnings pages
  - Links at bottom of Weather section for easy access
- **Weather Section Enhancements**
  - Wind gust value now highlighted amber when exceeding threshold
  - Better visual feedback for hazardous wind conditions

### v5.3.2

- **Bidirectional Speed Zone Detection**
  - Fixed speed zone lookahead to work in both SLK directions
  - Previously only detected speed decreases when traveling increasing SLK
  - Now correctly warns of speed decreases when traveling decreasing SLK too
  - Example: M031 SLK 67.64 has 60→90 (increasing) and 90→60 (decreasing) signs
  - Drivers approaching from either direction now get proper advance warning
- **SLK Direction Tracking**
  - Added `slkDirection` state to track 'increasing' or 'decreasing' travel
  - Display shows direction indicator (↑/↓) next to SLK value
  - Lookahead calculation uses appropriate zone boundary based on direction

### v5.3.1

- **Removed SLK Calibration Feature**
  - Removed per-road SLK offset calibration from drive page
  - SLK now displays raw GPS values without manual offset
  - Old `slkCalibrations` localStorage data cleared automatically
  - Simplified Tools menu - only Debug Info option remains
- **GPS Lag Calibration** (separate feature, kept)
  - GPS lag compensation at `/calibrate` for speed sign lookahead
  - This feature remains and is accessible from Settings menu

### v5.3.0

- **GPS Calibration Tool**
  - New `/calibrate` page for measuring GPS lag
  - Set target (stationary) and mark pass (moving)
  - Calculate lag time for speed lookahead compensation
  - Export calibration data to CSV
- **Speed Display Logic Update**
  - Yellow/amber border for approaching speed DECREASES only
  - White border for current speed or speed INCREASES
  - Shows upcoming speed limit in circle with distance countdown
- **Version Display** in app header

### v5.2.1

- **Manual Road ID Entry for Local Roads**
  - Local roads can now have road ID entered manually
  - No longer requires GPS lookup to use local roads

### v5.2.0

- **BOM Weather Warnings RSS Integration**
  - Real-time WA land warnings from BOM RSS feed (IDZ00067)
  - Warnings displayed inline in Weather section
  - Warning count badge in section header

### v5.1.x

- Track button color changes
- Intersection filtering fixes
- Speed zone lookahead feature
- EKF GPS filtering
- BOM radar/warnings links

---

## Environment Variables

None required - all APIs are free or use static data.

---

## Git Repository

`https://github.com/instructor-ship-it/roadfinder.git`

Branches: `master` and `main` (kept in sync)

---

## Documentation Files

| File                                            | Description                        | Location                       |
| ----------------------------------------------- | ---------------------------------- | ------------------------------ |
| PROJECT_CONTEXT.md                              | Single source of truth (this file) | `/home/z/my-project/`          |
| README.md                                       | Project overview, version history  | `/home/z/my-project/`          |
| worklog.md                                      | Development history                | `/home/z/my-project/`          |
| RC1_Test_Checklist.md                           | Testing checklist                  | `/home/z/my-project/`          |
| TC_Work_Zone_Locator_User_Manual.pdf            | End-user documentation             | `/home/z/my-project/download/` |
| TC_Work_Zone_Locator_User_Manual.docx           | End-user documentation (Word)      | `/home/z/my-project/download/` |
| TC_Work_Zone_Locator_RC1_Documentation.docx     | Layout & Functionality             | `/home/z/my-project/docs/`     |
| TC_Work_Zone_Locator_Data_Dictionary.docx       | Data structures                    | `/home/z/my-project/docs/`     |
| TC_Work_Zone_Locator_File_Structure.docx        | Project structure                  | `/home/z/my-project/docs/`     |
| TC_Work_Zone_Locator_Direction_Aware_Zones.docx | Bidirectional zones                | `/home/z/my-project/docs/`     |
| TC_Work_Zone_Locator_Data_Sources.docx          | API sources                        | `/home/z/my-project/docs/`     |
| TC_Work_Zone_Locator_Program_Logic.docx         | Function reference                 | `/home/z/my-project/docs/`     |
| TC_Work_Zone_Locator_RC1.2.1_Supplement.docx    | RC 1.2.1 additions                 | `/home/z/my-project/docs/`     |

---

## How to Update This File

After each development session:

1. Update version number if changed
2. Add entry to Recent Changes
3. Update any new features or settings
4. Commit and push to GitHub
