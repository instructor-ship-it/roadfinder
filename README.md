# TC Work Zone Locator

[![Build Status](https://img.shields.io/github/actions/workflow/status/instructor-ship-it/roadfinder/ci.yml?branch=main&label=build)](https://github.com/instructor-ship-it/roadfinder/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.33.1-blue.svg)](https://github.com/instructor-ship-it/roadfinder)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA-orange.svg)](https://tc-work-zone-locator.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

A mobile-friendly web application for Traffic Controller (TC) work zone planning and real-time SLK (Straight Line Kilometre) tracking using Main Roads WA ArcGIS data.

## Features

### 🔧 Speed Zone Overrides (RC 1.9.1+)

- **Community-verified corrections** for MRWA speed zone data
- **Override management page** at `/overrides`
- **MRWA Exception Report generator** for reporting discrepancies
- GPS-verified sign locations with ±4m accuracy
- **LocalStorage persistence** - data saved on your device
- **Export/Import** - backup and restore your override data

### 📍 Work Zone Location Lookup

- Search roads by region and road ID
- Enter SLK (Start/End) to get work zone coordinates
- Get TC positions (±100m from work zone)
- View speed zones for the corridor
- See intersecting roads within the TC zone
- Navigate directly to Google Maps

### 📦 Offline SLK Tracking

- Download road data for offline use (no internet required)
- Real-time GPS-based SLK tracking
- Direction indicator (towards/away from target)
- Speed limit display from MRWA data
- Speed warning (turns red when over limit)
- SLK calibration for fine-tuning accuracy
- **EKF GPS Filtering** (v5.0+):
  - Extended Kalman Filter for optimal position accuracy
  - Position prediction during GPS outages (up to 60 seconds)
  - Road constraint for snapping predictions to road geometry
  - Uncertainty display (±X meters accuracy)
  - Configurable prediction timeout
- **Early Warnings** (v4.2+):
  - Alerts based on 3 seconds travel time at current speed

### 🗺️ Navigation Integration

- One-tap navigation to Google Maps
- Street View links for all locations
- Direct link to start SLK tracking from any result

### 📌 Saved Locations (v1.33+)

- **Save frequently used locations** for quick recall
- **Road name display** — Shows road name for each saved location
- **Sort options** — By date (most recent) or by road ID then SLK
- **Interactive map view** — View all saved locations on a map
- **Day of week** — Date shows day name (e.g., "Fri 18 Apr")
- Stores up to 20 locations in localStorage

### 🌤️ Weather & Traffic Data

- Current weather conditions at work zone
- Sunrise/sunset times and daylight hours
- UV index with safety levels
- 8-hour weather forecast
- Traffic volume (AADT) data

### 🏥 Nearby Amenities

- Nearest hospital with emergency status
- Fuel stations
- Public toilets
- Distance and navigation links

### 📊 Traffic Event Logger (v1.29+)

- **Real-time event logging** for traffic controllers
- Log sent trips, holds, breaks, shuttle operations, and more
- **Counter tracking** — True Left, True Right, RLR, Trip counts
- **Timer tracking** — Hold duration, break duration
- **Cloud Sync** — Optional sync to your own private Google Sheet
- **Offline-first** — All data stored locally, syncs when online
- **CSV export** — Download event history as spreadsheet
- **User-configurable sync** — Each user sets up their own Google Sheet for privacy

### 🤖 AI Q&A Assistant (v1.27+)

- Ask questions about traffic management, WHS, and road work documents
- **Two modes**:
  - **Prompt Generation** — create prompts for external AI (ChatGPT, Claude, etc.)
  - **Direct AI Chat** — in-app AI responses with API key configuration
- Document-based context — AI searches relevant documents for answers
- Source citations — see which documents informed each answer
- **Q&A History** — save, favorite, search, and organize Q&A entries
- Export/Import Q&A history as JSON backup

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Modern web browser with Geolocation support

### Installation

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the application.

### Production Build

```bash
bun run build
bun start
```

## Cloud Sync Setup

The Traffic Event Logger can sync your events to your own private Google Sheet. This is optional and each user configures their own sheet for privacy.

### Step 1: Create a Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Add headers in row 1 (optional but recommended):

```
Time | Type | Label | Note | Road ID | Road Name | SLK | Op | Target ID | Lat | Lon
```

### Step 2: Add Google Apps Script

1. In your sheet, go to **Extensions → Apps Script**
2. Delete any existing code
3. Paste the following script:

```javascript
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  var time = e.parameter.time || '';
  var type = e.parameter.type || '';
  var label = e.parameter.label || '';
  var note = e.parameter.note || '';
  var roadId = e.parameter.roadId || '';
  var roadName = e.parameter.roadName || '';
  var slk = e.parameter.slk || '';
  var op = e.parameter.op || '';
  var targetId = e.parameter.targetId || '';
  var latitude = e.parameter.latitude || '';
  var longitude = e.parameter.longitude || '';

  // Handle DELETE operation (for undo events)
  if (op === 'DELETE') {
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 0; i--) {
      if (data[i][8] === targetId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput('OK');
  }

  sheet.appendRow([
    time,
    type,
    label,
    note,
    roadId,
    roadName,
    slk,
    op,
    targetId,
    latitude,
    longitude,
  ]);
  return ContentService.createTextOutput('OK');
}
```

4. Click **Save** (Ctrl+S or Cmd+S)

### Step 3: Deploy as Web App

1. Click **Deploy → New deployment**
2. Choose type: **Web app**
3. Set **Execute as**: Me
4. Set **Who has access**: Anyone
5. Click **Deploy**
6. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/.../exec`)

### Step 4: Configure in the App

1. Open Traffic Event Logger (from TC Tools menu)
2. Tap **More** (•••)
3. Tap **Configure Sync**
4. Paste your URL in the **Google Apps Script URL** field
5. (Optional) Add a secret key for extra security
6. Tap **Save**

Your events will now sync to your private Google Sheet in real-time when online.

### Security Note

- Your data goes to **YOUR sheet only** - no one else has access
- Each user should create their own Google Sheet
- The secret key provides an additional authentication layer (optional)
- Data is still stored locally in localStorage even without cloud sync

## Usage Guide

### Work Zone Lookup

1. Select a **Region** (e.g., Wheatbelt, Metropolitan)
2. Select a **Road ID** from the dropdown
3. Enter **Start SLK** (and optionally End SLK)
4. Click **"Get Work Zone Info"**
5. View results including TC positions, speed zones, weather, and nearby amenities

### GPS Location Lookup

1. Expand **"📍 Find by GPS Location"**
2. Click **"Get My Location"** or enter coordinates manually
3. The app will auto-fill the road and SLK based on your location

### Offline SLK Tracking

1. Click the **⚙️ setup icon** in the header
2. Click **"Download Data"** to store road data locally
3. Click **"📍 Start SLK Tracking"** to begin real-time tracking
4. The app works offline after downloading data

### Admin Data Sync (v4.1+)

For updating data without developer assistance:

1. Click the **⚙️ setup icon** in the header
2. Expand **"🔧 Admin Data Sync"** section
3. View **MRWA Server Status** (record counts available)
4. View **Local Data Status** (what's synced and when)
5. Click **"🔄 Sync All from MRWA"** or individual dataset buttons
6. Data downloads in 5,000-record chunks to prevent crashes
7. Signage is automatically filtered to speed/railway signs only
8. **Speed zones are automatically corrected** for default zones (v4.2+)

**Speed Zone Correction** (v4.2+):

- MRWA default zones (e.g., "50km/h in built-up areas or 110km/h outside") are intelligently corrected
- Built-up areas: 50 km/h (detected by adjacent zones ≤80 km/h)
- Rural areas: 110 km/h (detected by adjacent zones ≥90 km/h)
- Validates max 30 km/h speed drops per transition (Australian standard)
- Original MRWA text preserved in `raw_text` field for verification

**Note**: MRWA sync requires internet. Static files provide offline baseline.

#### SLK Calibration

If the SLK reading is inaccurate:

1. While tracking, tap **"🎯 Calibrate SLK"**
2. Enter the known correct SLK at your location
3. The offset is saved per-road for future use

### Direction Color Codes

- 🟢 **Green** - Moving towards target SLK
- 🔴 **Red (pulsing)** - Moving away from target SLK
- ⚪ **White** - No destination set

## Data Sources

- **Road Data**: Main Roads WA ArcGIS REST API
  - Layer 17: Road Network with SLK geometry AND region info (RA_NAME) for ALL roads
  - Layer 8: Speed Zones

### Offline Data

The app includes pre-downloaded road data for **69,471 roads** across all 8 MRWA regions:

- **Metropolitan**: 37,995 roads
- **South West**: 10,952 roads
- **Wheatbelt**: 7,895 roads
- **Great Southern**: 3,760 roads
- **Mid West-Gascoyne**: 3,707 roads
- **Pilbara**: 1,793 roads
- **Kimberley**: 1,132 roads
- **Other/Unknown**: 2,237 roads

Plus **69,455 speed zones** for accurate speed limit display.

**Speed Zone Overrides** (`/public/data/speed-overrides.json`):

- Community-verified corrections for MRWA data
- GPS-verified sign locations
- Currently includes M031 corrections (2024 road widening updates)

- **Weather**: Open-Meteo API
- **Traffic**: Main Roads WA Traffic Count Data
- **Amenities**: Overpass API (OpenStreetMap)

## Technical Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Offline Storage**: IndexedDB (client-side)
- **Maps**: Google Maps Links (no API key required)

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main work zone lookup page
│   ├── drive/            # SLK tracking pages
│   │   ├── page.tsx      # Main tracking page
│   │   └── nearby-signs/ # Nearby signs for AfterCare
│   ├── saved-locations/  # Saved locations map
│   │   └── map/          # Interactive map view
│   ├── qa/page.tsx       # AI Q&A Assistant
│   ├── library/          # Document library
│   ├── aftercare/        # Signage tracking & retrieval
│   ├── traffic-counter/  # Traffic count calculator
│   ├── overrides/        # Speed zone override management
│   ├── manual/           # User manual page
│   ├── calibrate/        # SLK calibration
│   ├── cycle-timer/      # Cycle timer tool
│   └── api/              # API routes
│       ├── roads/        # Road data queries
│       ├── gps/          # GPS to SLK conversion
│       ├── sync-data/    # Offline data download
│       ├── weather/      # Weather data
│       ├── traffic/      # Traffic volume
│       ├── places/       # Nearby amenities
│       ├── intersections/# Cross road detection
│       ├── admin-sync/   # MRWA direct sync
│       ├── ai/           # AI chat endpoints
│       └── qa/           # Q&A document search
├── lib/
│   ├── offline-db.ts     # IndexedDB client-side storage
│   ├── offline-data.ts   # Server-side data loading
│   └── qa-storage.ts     # Q&A history management
└── components/ui/        # UI components
```

## API Endpoints

| Endpoint             | Method   | Description               |
| -------------------- | -------- | ------------------------- |
| `/api/roads`         | GET      | List regions and roads    |
| `/api/roads`         | POST     | Get SLK coordinates       |
| `/api/gps`           | GET      | Convert GPS to SLK        |
| `/api/sync-data`     | POST     | Download offline data     |
| `/api/weather`       | GET      | Weather at coordinates    |
| `/api/traffic`       | GET      | Traffic volume data       |
| `/api/places`        | GET      | Nearby amenities          |
| `/api/intersections` | GET      | Cross roads in zone       |
| `/api/admin-sync`    | GET/POST | Sync data from MRWA       |
| `/api/qa`            | GET      | List searchable documents |
| `/api/qa-saved`      | GET/POST | Manage saved Q&A entries  |
| `/api/ai/chat`       | POST     | AI chat completions       |
| `/api/ai/verify`     | POST     | Verify API key            |

## Browser Support

- Chrome (recommended)
- Safari
- Firefox
- Edge

**Note**: Geolocation requires HTTPS in production.

## Security

### Data Storage

This app uses **client-side storage only**:

- **localStorage** — User preferences, AfterCare jobs, Q&A history, Contact directory
- **IndexedDB** — Offline road data, speed zones, signage

**Important**: All data is stored locally on your device. No data is sent to external servers unless you explicitly configure cloud sync.

### Cloud Sync (Traffic Event Logger)

If you enable cloud sync in the Traffic Event Logger:

- You provide your own Google Apps Script URL and optional secret
- Data is sent directly from your browser to YOUR Google Sheet
- **No shared or public sheets** — each user configures their own

### API Keys

API keys (e.g., for AI Assistant) are stored in **localStorage** on your device:

- Keys are never transmitted to our servers
- Keys are accessible only within this app on your device
- **Recommendation**: Only save API keys on trusted personal devices
- Clear the key after use on shared devices

### Best Practices

1. **Only use trusted devices** for sensitive operations
2. **Configure your own cloud sync** — never use someone else's Google Sheet URL
3. **Clear API keys** after use on shared devices
4. **Keep your Google Apps Script URL and secret private**

### Security Audit Summary (v1.29.0)

- ✅ No hardcoded API keys or secrets in source code
- ✅ Google Sheets URL is user-configurable (not shared)
- ✅ API keys stored server-side via environment variables
- ✅ All external API calls use HTTPS
- ✅ JSON parsing wrapped in try-catch blocks
- ⚠️ API keys in localStorage (user responsibility on shared devices)

## Version History

### 1.33.1 (Current) - Saved Locations Enhancements

- **Day of Week in Saved Locations** — Date now shows day (e.g., "Fri 18 Apr at 2:30 PM")

### 1.33.0 - Saved Locations Map & Road Name

- **Road Name Display** — Each saved location now shows the road name below road ID and SLK
- **Interactive Map View** — New `/saved-locations/map` page
  - View all saved locations on an interactive OpenStreetMap
  - Fetches GPS coordinates for each location via API
  - Tap markers for location details and navigation links
  - "Open in Google Maps" button for route planning

### 1.32.6 - Saved Locations Sorting

- **Sort Buttons** — Two new buttons for organizing saved locations
  - 📅 Date — Sort by most recent first (default)
  - 🛣️ Road — Sort by road ID then SLK ascending
- Sort preference persisted in localStorage

### 1.32.5 - Distance Display & Dialog Improvements

- **Smart Distance Display** — Shows km for distances ≥1km, metres for <1km
- **AfterCare Cancel Button** — Fixed grey text on white background (now dark grey with white text)

### 1.32.4 - Destination SLK Preservation

- **Fixed destination overwrite bug** — Marking signage as retrieved no longer overwrites your destination SLK
- Original destination preserved when returning from nearby-signs page

### 1.30.0 - Usability & Accessibility Improvements

- **First-Run Onboarding** — Guided setup for new users
  - Step-by-step introduction to key features
  - Offline data download prompt
  - Quick setup checklist in settings
- **Accessibility Enhancements**
  - ARIA labels on all interactive elements
  - Skip link for keyboard navigation
  - User-scalable viewport (zoom enabled)
  - Proper role attributes on landmark regions
- **Loading States** — Skeleton components for visual feedback
  - WorkZoneSkeleton, SpeedZoneSkeleton, SignageSkeleton
  - HomePageSkeleton, DrivePageSkeleton
- **Form Validation** — Mobile-friendly validation feedback
  - Inline error messages with icons
  - Real-time validation on blur
  - SLK range validation
- **Navigation Consistency** — Unified header component
  - MobileNav component with back/home buttons
  - Consistent emergency button placement
  - Offline status indicators

### 1.29.0 - Cloud Sync Security & Traffic Event Logger

- **Security: User-configurable Cloud Sync** — Removed hardcoded Google Sheets URL
  - Each user now configures their own private Google Sheet
  - Cloud sync disabled by default until user sets up their own URL
  - Prevents data from being sent to shared/public sheets
- **Traffic Event Logger Enhancements**
  - Added step-by-step setup guide dialog with copyable script
  - Added Cloud Sync Settings UI in More menu
  - Status indicators show sync state (No Sync / Sync ON / Sync OFF)
- **Contact Directory** — Track people, titles, vehicles, contact info with job tagging
- **Cycle Timer** — Renamed "Truck" to "Timer", added description field

### 1.28.5 - Q&A Page Restructure

- **Tab-based Q&A layout** — Answers tab first, Ask tab second for better UX
- **Generate Prompt button** — create prompts for external AI assistants (ChatGPT, Claude, etc.)
- **Direct AI Chat mode** — configure API key for in-app AI responses
- **Improved tab styling** — better contrast and visibility for active/inactive states
- **Clear prompt button** — quickly clear generated prompts
- **API key configuration** — save and test z.ai API key for direct AI chat

### 1.28.0 - Q&A Enhancements

- **Q&A history management** — save, favorite, search, and filter Q&A entries
- **Export/Import Q&A** — backup and restore Q&A history as JSON
- **Document selection** — choose specific documents to search or search all
- **Category badges** — organize Q&A entries by category
- **Expandable answers** — toggle full answer view with show more/less

### 1.27.0 - AI Q&A Integration

- **AI Q&A Assistant page** (`/qa`) for traffic management questions
- **Document-based context** — AI searches document abstracts for relevant answers
- **Source citations** — shows which documents were used for each answer
- **Library integration** — AI Q&A button in Library page header

### 1.26.0 - PDF Viewer & Page Offset System

- **PDF Viewer with Direct Rendering** — no file splitting required, renders pages on-demand
- **Page Offset System** — handles documents where physical page ≠ document page number
- **Smart Document Routing** — TMP docs → TMP viewer, PDF docs → PDF viewer
- **Fixed Zoom Scope** — zoom applies only to PDF page, not whole screen
- **Fixed Back Button** — returns to library page instead of TMP viewer
- **Multiple CDN Fallbacks** — PDF.js worker loads from unpkg, jsdelivr, cdnjs

### 1.25.0 - PDF Viewer Improvements

- **Multiple CDN Fallbacks** for PDF.js worker (unpkg, jsdelivr, cdnjs)
- **Open in New Tab Button** for fallback when inline viewer has issues
- **CORS Detection** with warning for external PDF URLs
- **Better Loading States** with page-level loading indicator

### 1.21.0 - Turbo Mode for GPS Tracking

- **Turbo Mode Toggle** — fast 200ms GPS refresh for precise SLK positioning
- **5-minute auto-revert** — prevents battery drain with countdown display
- **Visual feedback** — pulsing green button when Turbo active

### 1.20.0 - Phase 4 Optimization: Type Safety & Lint Hygiene

- **TypeScript strict mode enabled** (`noImplicitAny: true`)
- **ESLint zero-warning baseline** — fixed 3 genuine React hooks bugs, documented 14 intentional omissions
- **Build verification clean** — 0 TypeScript errors, 0 ESLint warnings, 57 tests passing

### RC 1.9.9 - Work Zone Report Overhaul, Traffic Override, Speed Zone Layout

- **User Traffic Count Override** — swap live count VPH/heavy% into all work zone calculations
- **Traffic Count Detail Modal** — tappable count rows with full breakdown and "Use This Count" button
- **Saved Locations Auto-Load** — recalling a location now auto-triggers work zone search
- **Speed Zone Layout Graphic** in HTML report (colored bar, sign positions, zone segments table)
- **Report Enhancements** — live count data section, full traffic calculations section
- **Site Distance Input Fix** — defer clamping to onBlur instead of onChange
- **Report Formatting** — dark Recommended Stop colour, fixed footer version, Close button visibility
- **National Public Toilet Map** via ArcGIS (2,714+ WA toilets replacing Overpass-only)

### RC 1.9.8 - FuelWatch Diesel Fix, Pace Rate Indicator, Amenities Upgrades

- **FuelWatch WA JSON API** replacing broken RSS feed for accurate diesel prices
- **Pace Rate Indicator** showing time delta vs posted speed (1km/10km/100km)
- **Fuel price display fix** (was showing cents as dollars)
- **WA Health SLIP** for authoritative hospital data
- **Multi-source amenity architecture** with smart fallback chains

### RC 1.9.7 - Maximum Hold Time, Shuttle Flow Corrections, UI Improvements

- **Maximum Hold Time Calculator** added to Work Zone Info page
- **Shuttle Flow Risk Assessment** fixed to match AGTTM Part 2 Table 3.5 and MRWA COP Table 15
- **Clearance Time** unit conversion corrected (seconds not minutes)
- **Heavy Vehicle Count Button** colour changed from amber to red
- **Offline Data Section** collapsed by default when data already downloaded

### RC 1.9.6 - Version Synchronization

- **Version Synchronization**: All version numbers now consistent across codebase
- **Documentation**: Added missing changelog entries for 1.9.2-1.9.5
- **Files Updated**: package.json, SettingsDrawer.tsx, traffic-counter/page.tsx, qa/page.tsx, aftercare/page.tsx

### RC 1.9.5 - Testing & CI/CD

- **Testing Framework**: Vitest with React Testing Library (45 tests)
- **CI/CD Pipeline**: GitHub Actions workflow
- **Git Hooks**: Husky + lint-staged

### RC 1.9.4 - Component Extraction

- **Code Organization**: Extracted WeatherSection, TrafficSection, AmenitiesSection, WorkZoneSummary components
- Reduced page.tsx from 5150 to 4608 lines

### RC 1.9.3 - Prettier & CONTRIBUTING

- **Prettier Config**: Added .prettierrc
- **CONTRIBUTING.md**: Development guidelines
- **SavedLocations Component**: Extracted from page.tsx

### RC 1.9.2 - License & Env

- **MIT LICENSE**: Open source license
- **.env.example**: Environment variables template

### RC 1.9.1 - AI Q&A Assistant

- **New AI Q&A Assistant** (`/qa`)
  - Ask questions about traffic management, WHS, and road work documents
  - AI searches document abstracts and provides contextual answers
  - Cites which documents were used for each answer
- **Q&A History**
  - Save useful Q&A entries for future reference
  - Mark entries as favorites for quick access
  - Categorize entries with custom labels
  - Export/Import Q&A history as JSON backup
- **Integration**
  - 🤖 AI Q&A button in Library page header
  - Link in Settings menu → Library section
- **Requires internet** - AI Q&A is an online-only feature

### RC 1.8.0 - Library Offline Status Indicators

- **Updated Offline Status Indicators**
  - 📥 (green) = Cached in browser storage - Available offline
  - 💾 (blue) = Downloaded to device - Permanently saved
  - ⚠️ (red) = Cache was cleared - Re-cache needed
- **Added Download Tracking**
  - Tracks when user downloads a file to their device
  - Stored in localStorage for persistence
  - Note: Web apps cannot verify files still exist on user's device
- **Added Cache Verification**
  - `verifyCacheExists()` - Checks if cached file actually exists in Cache API
  - `getDeletedCacheIds()` - Returns IDs of documents whose cache was cleared
  - Detects when browser clears cache but localStorage tracking remains
- **Added Download Folder Tip**
  - Suggests creating `Documents/TCLibrary` folder for organized downloads
  - Shown in legend section and document info dialog

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
  - Console logs filtered parallel roads for debugging
- **Technical improvements**
  - Added `segmentsIntersect()` function for line segment intersection testing
  - Added `verifyRoadsActuallyCross()` async function with ArcGIS geometry query
  - Added `checkGeometryCrosses()` for multi-feature geometry comparison
  - Source field updated to "State Road Network (Verified)" for validated roads
- **Previous RC 1.7.28 changes retained**
  - Layer 6 NODE_DESCR verification for intersection names
  - Reference road filtering (case-insensitive)
  - Duplicate intersection deduplication

### RC 1.7.27 - Emergency Direction Bug Fix

- **Fixed emergency location direction bug**
  - Direction to nearest town was reversed
  - Example: If emergency was east of town, it incorrectly said "west of town"
  - Now correctly shows where emergency is FROM the town
  - Cross road direction was already correct (no change needed)

### RC 1.7.26 - Wake Lock & Saved Locations

- **Added Wake Lock for Screen Always On**
  - Screen stays on while GPS tracking is active
  - Uses browser Wake Lock API (`navigator.wakeLock.request('screen')`)
  - Automatically releases when tracking stops
  - Re-acquires when page becomes visible again (tab switch)
  - Works on Drive page and Nearby Signs page
- **Added Saved Locations Feature**
  - Save road ID, SLK, and region for quick recall
  - Stores up to 20 locations in localStorage
  - Purple "Save Location" button appears when road and SLK are entered
  - Click saved location to recall and populate the form
  - Delete button (×) to remove saved locations
  - Cross-region recall works by switching region automatically

### RC 1.7.25 - Signage Corridor Intersection Range (±700m)

- **Fixed Signage Corridor showing correct intersections with expanded range**
  - Intersections now searched within ±700m signage corridor (was ±100m TC zone only)
  - Livesey Road (SLK 169.85) and Barrack Road (SLK 169.24) now appear for H005 at SLK 170
  - Added `corridorIntersections` state for separate signage corridor intersection list
  - TC zone intersections (±100m) still shown in "INTERSECTING ROADS IN TC ZONE" section
  - Signage corridor intersections (±700m) shown in "SIGNAGE CORRIDOR" section
- **API Enhancement**
  - `/api/intersections` now accepts `range` parameter (default 0.1 for TC zone)
  - Frontend makes two intersection calls: TC zone (±100m) and signage corridor (±700m)

### RC 1.7.20 - Amenities Toggle & Expanded Dataset

- **Added Amenities Data Source Toggle**
  - New toggle in Settings → Data Source Toggles
  - Options: ONLINE (default) / OFFLINE
  - ONLINE uses live OpenStreetMap API for better rural coverage
  - OFFLINE uses cached data from amenities.json
- **Expanded Amenities Dataset**
  - Hospitals: 15 → 35 (added Wheatbelt, regional hospitals)
  - Fuel Stations: 10 → 92 (Great Eastern Hwy, major highways, regional)
  - Toilets: 5 → 45 (rest areas, roadhouses, visitor centres)
- **New Rural Amenities Along Great Eastern Hwy:**
  - Mundaring Medical Centre, Northam Health Service
  - Fuel: Mundaring, Sawyers Valley, The Lakes, Bakers Hill, Northam, etc.
  - Rest area toilets along entire highway corridor

### RC 1.7.19 - Intersection & Navigation Fixes

- **Fixed Intersection Detection Bug for Decreasing SLK Direction**
  - Issue: Intersections (Livesey, Barrack) not showing when work zone goes from higher to lower SLK
  - Root cause: TC zone boundary check assumed SLK always increases
  - Fix: Added `tcMinSlk`/`tcMaxSlk` to handle both SLK directions
- **Added Navigation Buttons to Work Zone Summary Title**
  - Street View and Maps buttons moved to right of title
  - Quick access to start SLK location
  - Removed redundant Confirm Start/End buttons
- **Fixed Amenities Distance Display**
  - Issue: Distances showing as 76159 km instead of 76 km
  - Root cause: `haversineDistance()` returns meters, displayed as km
  - Fix: Divide by 1000 when storing distance

### RC 1.7.18 - Signage Corridor Intersection Fix

- **Fixed Signage Corridor showing incorrect intersections in work zone reports**
  - Previous issue: Report showed parallel roads (e.g., "Northam Cranbrook Rd") as intersections
  - Root cause: `findIntersectionsInCorridor()` found roads with geometry NEAR the corridor, not actual intersections
  - Fix: Now uses `crossRoads` from `/api/intersections` which queries MRWA Layer 6 (Intersections)
  - Reports now show only actual intersecting roads within the TC zone
- **Updated CrossRoad interface** to include `intersectionSlk` field
- **Removed buggy intersection detection** from `getSignageInCorridor()` in offline-db.ts
- Both text and HTML reports now show accurate intersection data

### RC 1.7.17 - Emergency Location Cross Road Detection Fix

- **Created shared emergency module** (`src/lib/emergency.ts`)
  - Consolidated ~200 lines of duplicated code from page.tsx and drive/page.tsx
  - Functions: findCrossRoad(), findNearestTown(), findNearestHospital(), findNearestFireStation(), findNearestPoliceStation()
- **Fixed cross road detection using Layer 6 (Intersections)**
  - Previous issue: Emergency showing "Northam Cranbrook Rd" (parallel road) instead of "Elizabeth St" (intersecting road)
  - Root cause: ArcGIS API `resultRecordCount=50` was cutting off closer intersections
  - Fix: Increased `resultRecordCount` to 200 to capture all nearby intersections
  - Now correctly shows "Elizabeth St" as cross road
- **Added utility functions to `src/lib/utils.ts`**
  - `getBearing()` - Calculate bearing between two GPS points
  - `getDirectionFromBearing()` - Convert bearing to cardinal direction (N, NE, E, etc.)
  - `formatDistance()` - Format meters as m or km appropriately
- **Fixed distance display bug**
  - Was showing "100mm" instead of "100m"
  - Now uses numeric `distanceM` field for formatting

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
  - "southeast of Moora" = user is southeast of the town

### RC 1.7.7 - Selection Persistence Fix for Navigation

- **Fixed selection being lost when navigating back**
  - Selection now saves even when empty (was skipping save if `size == 0`)
  - Removed condition that prevented saving deselected state
- **Selection now correctly persists across page navigation**
  - Pushing back button no longer unchecks your signs
  - localStorage key: `speed-sign-selection`

### RC 1.7.6 - Data Persistence Fix

- **Fixed loadFromStorage() to NEVER overwrite user data**
  - Removed fallback to DEFAULT_SIGNS that was wiping user entries
  - User's localStorage data is now always preserved
- **Fixed road_id comparison with trailing spaces**
  - `"M031 "` now matches `"M031"` in getSpeedSignOverrides()
  - Trim and uppercase normalization for comparisons
- **Added cache clearing when saving**
  - clearSpeedOverridesCache() called after each save
  - Main app immediately sees new overrides
- **Trim whitespace from road_id when saving new signs**

### RC 1.7.5 - Selection Persistence Fix

- **Fixed selection being lost after adding new sign**
  - loadData() now accepts preserveSelection parameter
  - New signs are automatically added to selection
  - User's manual selections are preserved
- **Synced DEFAULT_SIGNS with speed-overrides.json**
  - Both files now have matching sign data
  - End SLK values updated (64.81→65.37→67.62→69.19→75)

### RC 1.7.4 - End SLK Helper

- **New "Find next zone boundary" feature**
  - Click to find the next zone boundary after current SLK
  - Shows suggestions from community signs (green) and MRWA zones (yellow)
  - Click a suggestion to auto-fill End SLK
- **Helps when you don't know where zone ends**
  - Looks up existing signs on the same road
  - Cross-references MRWA zone data
  - One tap to apply suggested value

### RC 1.7.3 - Form Labels Fixed

- **Fixed Add Sign form labels**
  - Removed asterisks from fields with defaults (Direction, Sign Type, Replicated)
  - Clearer indication of which fields are truly required
  - Required: Road ID, SLK, Front Speed
  - Conditionally required: End SLK (if replicated), Back Speed (if Double)

### RC 1.7.2 - Sign Face Display Format

- **New signage corridor display format**
  - Speed signs now show sign face values: `TL[110/80] + TR[110/80]`
  - First number = what increasing SLK traffic sees
  - Second number = what decreasing SLK traffic sees
  - Replicated signs show same values on both sides
- **Fixed speed zone creation for double-sided signs**
  - Now creates ONE zone with `carriageway: 'Single'` for both directions
  - Both directions travel at the same speed WITHIN the zone
  - Sign face values stored separately for display purposes
- **SLK tracking displays correct speed**
  - Shows zone speed (80 km/h) for both directions within the zone
  - Per SPEED ZONE BOUNDARY RULE: within a zone, both directions travel at same speed

### RC 1.7.1 - Duplicate Zone Fix

- **Fixed duplicate signage in corridor**
  - MRWA zones starting near override zones (~20m) now filtered out
  - Prevents showing both MRWA 64.80 and community-verified 64.81 signs
  - Added SLK_THRESHOLD = 0.02 km (~20m) for survey discrepancy tolerance

### RC 1.7.0 - Speed Zone Boundary Rule

- **Fixed northbound (decreasing SLK) speed display bug**
  - Root cause: Code created TWO directional zones for single carriageway roads
  - Fix: Now creates ONE zone with `carriageway: 'Single'` for both directions
  - Added `sign_face_true_left` and `sign_face_true_right` fields for sign face display
- **SPEED ZONE BOUNDARY RULE documentation**
  - At zone boundaries: each direction sees DIFFERENT speeds on signs
  - Within a zone: BOTH directions travel at the SAME speed
  - `front_speed` = zone speed (for both directions within zone)
  - `back_speed` = sign face value only (what northbound sees at boundary)

### RC 1.6.0 - AfterCare Map View

- **New AfterCare Map Page** (`/aftercare/map`)
  - Full-screen OpenStreetMap with colored pins for all signs
  - Filter by status: All / Retrieval (red) / Maintenance (yellow) / Active (green)
  - Tap markers for sign details (road, SLK, type, direction, description)
  - Auto-centers on your signs, works with stored GPS coordinates
- **Technical**
  - Leaflet + react-leaflet integration
  - SSR disabled via dynamic imports (required for Leaflet)
  - Fixed viewport layout for proper map containment

### RC 1.5.9 - Expanded Offline Data Support

- **Added offline support for additional data types**
  - Pavement data (MRWA Layer 12) - lanes, widths, shoulders
  - Traffic volume (MRWA Layer 27) - AADT, peak hour, heavy vehicles
  - Nearby amenities (OpenStreetMap) - hospitals, fuel stations, toilets
  - Weather data caching (30 minutes)
- **API improvements**
  - All APIs now fall back to offline data when network unavailable
  - Added 5-second timeout to prevent hanging
  - Weather shows "last updated" timestamp when cached

### RC 1.5.8 - Report Signage Fix

- **Fixed signage corridor in work zone reports**
  - Intersections now correctly filtered to ±100m from work zone
  - All signage now explicitly filtered to ±700m corridor bounds
  - Fixed both text and HTML report formats
- **Report improvements**
  - Total items count now reflects actual filtered items
  - Consistent filtering between on-screen display and reports

### RC 1.5.7 - Offline Startup Fix

- **Fixed app hanging on startup without internet**
  - Root cause: `fetchRegions()` and `fetchRoads()` were calling API before checking offline status
  - API calls would hang for 30-60+ seconds waiting for network timeout
  - Added `navigator.onLine` check before any API call
  - Added 5-second timeout with AbortController to prevent indefinite hanging
  - If offline, skip API entirely and load from local files
- **Result**: App now opens instantly (< 1 second) regardless of internet status

### RC 1.5.6 - Offline-First Mode & HTML Reports

- **Offline-First Mode** (Default behavior changed)
  - All data source toggles default to ON (offline mode)
  - Offline mode tries IndexedDB first, falls back to online API if data unavailable
  - Online mode tries API first, falls back to IndexedDB if API fails
  - Robust fallback ensures data is always available
- **Work Zone Report now in HTML format**
  - Report opens in new browser window for printing
  - Professional styling with print-friendly CSS
  - Added lane direction diagram to report
  - Color-coded tables for signage data
- **AfterCare Report also HTML format**
  - Both reports now use consistent HTML format

### RC 1.5.3 - Work Zone Report Feature

- **New Work Zone Report Generator**
  - Added "Generate Work Zone Report" button at bottom of work zone info page
  - Creates comprehensive report with work zone summary, speed zones, TC positions, signage corridor, weather, traffic, and amenities
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

### RC 1.5.0 - Nearby Signs Page & Filtered AfterCare

- **New Nearby Signs Page** (`/drive/nearby-signs`)
  - Dedicated page for viewing only signs requiring action
  - Shows only due-retrieval and due-maintenance signs
  - Job edit button layout: **Edt** | **Nav** | **Ret** | **Early** | **Del**
  - Inline SLK editing with Save/Cancel
  - Google Maps navigation per sign or all signs
  - Mark retrieved or mark due-early functionality
  - Delete sign with confirmation dialog
- **Filtered AfterCare View on SLK Tracking**
  - AfterCare indicator shows only signs requiring action
  - Red dot = due for retrieval, Yellow dot = due for maintenance
  - Active/placed signs hidden to reduce noise
  - Clicking opens Nearby Signs page with full actions
- **Display Improvements**
  - Increased from 3 to 5 records on portrait mode
  - Increased from 1 to 3 records on landscape mode
  - Increased font size for better readability
  - Added distance in metres for each sign
- **Type Safety Fix**
  - Fixed `getStatusInfo()` parameter type mismatch
  - Maps `SignStatus` to `ComputedJobStatus` correctly
- **PWA Support**
  - App can be installed on mobile home screen
  - Works like a native app after first load
  - Can start the app without internet connection
  - Service worker caches all app resources
- **Internet Signal Bar**
  - Shows 5-bar signal indicator for connectivity
  - Green bars when online, red bars when offline
  - Positioned next to SLK Tracking label

### RC 1.4.2 - Route Optimization & SLK Tracking Fix

- **Print Report Button Improvements**
  - Changed from white outline to purple background for better visibility
  - Reduced button size to match route optimization buttons
  - Moved above import/export buttons, consolidated with route buttons
- **SLK Tracking Fix for AfterCare**
  - Fixed `getUpcomingSigns()` to use `calculateSignStatus()` instead of stored status
  - Fixed `getJobsForRoad()` to use calculated status for filtering
  - Signs due for retrieval/maintenance now correctly detected by SLK tracking
  - Drive page AfterCare indicator now shows all relevant signs based on calculated status
- **Route Optimization Improvements**
  - Compact button layout with Retrieve, Maintain, and Report buttons
  - Buttons only show when relevant records exist
  - Optimized for mobile display with flexible wrapping

### RC 1.4.1 - Drive Page AfterCare Integration

- **Drive Page AfterCare Integration**
  - Added AfterCare indicator on drive page when signs are on current road
  - Shows number of active AfterCare jobs
  - Displays next upcoming sign with distance and direction
  - Links directly to AfterCare page
  - Works in both portrait and landscape modes
- **Documentation Updates**
  - Updated user manual with AfterCare section
  - Updated in-app manual with AfterCare section
  - Added AfterCare to key features list
  - Added AfterCare to offline capability table

### RC 1.4.0 - AfterCare Signage Tracking

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

### RC 1.2.23 - Action Buttons Repositioned

- **Initial button repositioning work**
  - Moved action buttons from bottom of Work Zone Summary section
  - Positioned under title, above road name

### RC 1.2.21 - Lane Direction Diagram

- **Added Lane Direction Diagram to Work Zone Summary**
  - Visual diagram showing each lane with direction arrows on dark grey background
  - White arrows (↑) = INCREASING SLK direction
  - Yellow arrows (↓) = DECREASING SLK direction
  - Automatically calculates lanes per direction:
    - Single carriageway: Even split (e.g., 4 lanes = 2 each way)
    - Left carriageway: All lanes ↑ INCREASING SLK
    - Right carriageway: All lanes ↓ DECREASING SLK
  - Shows count of lanes in each direction
- **Direction Logic Notes**:
  - MRWA database doesn't explicitly store lane direction allocation
  - Single carriageway assumes even split (left side = increasing SLK)
  - Australian left-hand driving convention applied

### RC 1.2.20 - UI Simplification & Pavement Data

- **Removed color indication from hamburger menu (☰)**
  - Previously showed green/gray for offline status
  - Now shows consistent gray background
  - User feedback: color indication was distracting
- **Added pavement data to Work Zone Summary**
  - Displays number of lanes from MRWA Layer 12
  - Displays road width in metres
  - Lane count interpretation:
    - Single carriageway: total lanes both directions
    - Left/Right carriageway: lanes per direction

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

### RC 1.2.15 - UI Consistency & Navigation

- **Settings Menu Icon Changed**
  - Replaced ⚙️ gear icon with ⋮ (three-dot menu) for cleaner look
  - Retained green/gray color coding for offline status
  - Consistent on both home and drive pages
- **User Manual Icon Removed from Drive Page**
  - Manual now accessible via Settings → About → Open User Manual
- **Info Line Under Titles**
  - Both pages now show consistent info: `vRC 1.2.15 EKF • Offline Ready`
  - Same colors and format across home and drive pages
- **About Section Layout**
  - Version number left-justified (was right-justified)
  - Cleaner, more readable format
- **Drive Page Header**
  - Added ⋮ menu button linking back to home/settings
  - Removed redundant manual icon

### RC 1.2.14 - Settings Restructure

- **Settings Sections Reorganized Alphabetically**
  - About, Admin Data Sync, GPS & Tracking, Offline Data, Preferences, Speed Zone Overrides
  - All sections minimized by default (Offline Data expands for new users without data)
- **User Manual moved into About section**
  - Manual button removed from header
  - Access via Settings → About → Open User Manual
- **New About Section** with:
  - App info and version
  - Contact: dev@jaytec.net
  - Contributors: Jaytec (Developer)
  - Built With: Next.js/React, Tailwind CSS/shadcn/ui, Google Maps, Vercel, Super Z
  - Data Sources: MRWA Open Data
- **Version number removed from footer** - Now only in About section
- **Local Roads** text simplified - Removed "(use GPS lookup)" suffix
- **SLK Color Logic Updated**
  - Green = moving towards destination
  - Red (pulsing) = moving away from destination
  - White = no destination set (was yellow)

### RC 1.2.13 - GPS Indicator Refinement

- **Moved GPS signal strength indicator** from header to SLK Tracking status position
- Replaced redundant "Active" text with visual signal bars
- Shows "Waiting for GPS..." while acquiring position

### RC 1.2.12 - UI/UX Refinements

- **Settings Drawer Visual Hierarchy**
  - Replaced +/- with rotating chevron icons for expand/collapse
  - Added 4px colored left border accent on expanded sections
  - Each section has its own accent color (blue, purple, orange, gray, amber)
- **GPS Status Indicator** (Drive page)
  - Added signal strength indicator in header when tracking active
  - Shows 5 bars with color coding based on GPS accuracy
  - Green (excellent <10m), Yellow (fair <20m), Orange (poor <30m), Red (very poor ≥30m)

### RC 1.2.11 - Settings Cleanup

- **Moved Debug button to Admin Data Sync section**
  - Debug button now inside minimized Admin Data Sync section
  - Cleaner Settings drawer with less clutter

### RC 1.2.10 - User Manual Cleanup

- **Removed distracting sticky Quick Reference footer**
  - Footer was always visible at bottom and distracting
  - Quick Reference info still available in Section 10 of manual

### RC 1.2.9 - User Manual Hybrid Approach

- **User Manual redesigned with Hybrid Approach**
  - **Search functionality** - Filter sections by keyword
  - **Quick nav chips** - One-tap access to common sections
  - **View toggle** - Switch between Accordion and Full views
  - **Quick Reference footer** - Always-visible key info

### RC 1.2.8 - Settings Bottom Sheet Drawer

- **Settings converted to Bottom Sheet Drawer**
  - Mobile-friendly swipeable drawer for settings
  - Swipe down to close, tap outside to dismiss
  - Cleaner UI with more screen space for main content
- **User Manual removed from Settings**
  - User Manual has its own dedicated button (📖) in the header
  - Removed redundant link from Settings menu

### RC 1.2.7 - Settings Reorganization (Fixed)

- **FIXED: Implemented documented RC 1.2.6 changes that were not applied**
- **Tools Menu Removed** from /drive page header
- **Settings Categories Reorganized**:
  - Offline Data (📦) moved to TOP, expanded by default
  - GPS & Tracking (📍) - minimized by default, contains Speed Display toggle
  - Speed Zone Overrides (🔧) - minimized by default
  - Preferences (⚙️) - minimized by default, contains Default Region + Wind Gust Threshold
  - User Manual (📖) - link button at bottom
  - Admin Data Sync - minimized by default

### RC 1.2.6 - Settings Reorganization (Documentation Only)

- **Documented but not implemented** - Changes were added to PROJECT_CONTEXT.md but code was not updated
- See RC 1.2.7 for actual implementation

### RC 1.2.4 - Unified SLK Tracking Display

- **Speed Display Toggle** moved to Settings
- **Unified Location Display** - single adaptive display that changes based on scenario
- Removed redundant Current Location and Trip Progress boxes

### RC 1.2.3 - Speed Display Toggle

- Added toggle in Settings menu for Speed Display
- Shows current GPS speed and posted speed limit when enabled
- Default is OFF

### RC 1.2.2 - User Manual Page

- **NEW: User Manual page** at `/manual`
  - Comprehensive documentation for all features
  - Mobile-friendly with collapsible sections
  - Covers offline capability details
  - Includes troubleshooting guide and quick reference
- **NEW: Header icon** - 📖 book icon in header on all pages
  - Instant access to user manual (no download)
  - HTML format works offline if cached

### RC 1.2.1 - Override Zone Visual Indicator

- **NEW: Visual indicator for community-verified zones**
  - Pulsating ✓ icon appears when driving through override zones
  - Green border around speed limit circle indicates verified zone
  - "VERIFIED" label and "Community Verified Zone" text for clarity
  - Helps drivers distinguish MRWA data from field-verified speed zones
- **FIXED: Default sign direction bug**
  - `DEFAULT_SIGNS` now correctly uses `direction: "True Left"`
  - Prevents inverted speed zones (wrong carriageway assignments)
  - Form default changed from `True Right` to `True Left`

### RC 1.2.0 - Local Storage Overrides

- **MAJOR: LocalStorage-based storage** - Data now persists on your device
  - Works on all hosting platforms (Vercel, Netlify, local)
  - No server-side file writes needed
  - Data persists between browser sessions
- **Export functionality** - Download your override data as JSON
- **Improved reliability** - No more "failed to write" errors
- **Faster operations** - All CRUD operations are instant (no network calls)
- **Updated UI** with storage mode indicator
- **Better error messages** for all operations

### RC 1.0.4 - Sign-Based Override System

- **NEW: Sign-Based Override System** - Captures physical sign details:
  - Sign type (Single or Double sided)
  - Replicated status (matching sign on opposite side)
  - Direction (True Left / True Right)
  - Approach speed, Front speed, Back speed
- **Improved zone generation logic**:
  - Single + Not Replicated = Repeater (no zone)
  - Single + Replicated = Direction-specific zone
  - Double + Replicated = Same speed both directions (Single carriageway)
- **New override UI** with full sign configuration form
- **Delete functionality** for existing overrides

### RC 1.0.3 - Speed Zone Override System

- **NEW: Speed Zone Override System** - Community-verified corrections for MRWA data
  - Override management page at `/overrides`
  - View all active overrides with MRWA comparison
  - Generate MRWA Exception Report for submitting discrepancies
  - GPS-verified sign locations with ±4m accuracy
- **Override precedence**: Community-verified overrides take priority over MRWA data
- **M031 corrections added**: 5 zones with verified sign locations after 2024 road widening
- Discrepancies range from 10m to 280m between MRWA database and physical signs

### RC 1.0 - Release Candidate

- **Official Release Candidate for production deployment**
- All UI/UX finalized and documented
- Complete feature set for Traffic Controller work zone operations

### v5.3.7

- **UI Improvements**:
  - Local roads: Added manual road ID entry (no longer requires GPS lookup)
  - Drive page: Removed lookahead compensation message
  - Drive page: Removed Accuracy display from Current Location dialog

### v5.3.6

- **UI Improvements**:
  - Changed "Back to Work Zone Locator" button from red to dark blue (consistency)
  - Updated on both drive and calibrate pages

### v5.3.5

- **UI Improvements**:
  - Amenities dialog: Navigate/Street View buttons converted to small icon buttons
  - Signage Corridor: Intersections now filtered to ±100m from work zone (previously ±700m)
  - Signage Corridor: Removed Regulatory Signs section (clutter reduction)

### v5.0.0

- **NEW: Extended Kalman Filter (EKF) GPS** - Complete GPS filtering rewrite:
  - **EKF Filtering**: Optimal Kalman filter for 50-60% accuracy improvement
  - **Position Prediction**: Continues tracking during GPS outages (10-60 seconds)
  - **Road Constraint**: Snaps predictions to road geometry for accuracy
  - **Uncertainty Display**: Shows ±X meters accuracy indicator
  - **Confidence Levels**: High ●, Medium ◐, Low ○, Predicted ◈
- **NEW: Haversine Distance Calculation**:
  - Meter-accurate distance between GPS coordinates
  - Replaced Euclidean approximations throughout
  - Eliminates ~1km error on 50km roads
- **Updated Settings**:
  - Removed: Position Interpolation, SLK Smoothing (now built into EKF)
  - Added: EKF Filtering toggle, Road Constraint, Prediction Timeout, Show Uncertainty
  - Kept: Early Warnings (separate feature)
- **New Files**: `src/lib/gps-ekf.ts`, `src/hooks/useGpsTracking.ts`

### v4.2.0

- **NEW: GPS Enhancements** - Three optional improvements for smoother tracking:
  - **Position Interpolation**: Estimates position between GPS updates using speed and heading (100ms updates)
  - **SLK Smoothing**: Weighted average of last 3 readings to reduce GPS jitter
  - **Early Warnings**: Alerts earlier at higher speeds (3 seconds travel time ahead)
  - Toggle all features in Settings menu
  - Active features shown in header: 🔄📊⚠️
- **NEW: Speed Zone Correction System** - Two-phase sync with proper default zone handling:
  - Server parses MRWA text (e.g., "50km/h applies in built up areas or 110km/h outside")
  - Client corrects based on adjacent zones (built-up = 50 km/h, rural = 110 km/h)
  - Validates max 30 km/h speed drops per transition (Australian standard)
  - Original MRWA text preserved for verification
- **Improved: Debug info** now includes GPS settings, SLK history, and GPS age

### v4.1.4

- **Fixed: Real-time progress display** - Shows "Fetching X of Y records..." during sync
- Uses Server-Sent Events (SSE) streaming for live progress updates
- No more "Starting..." stuck state

### v4.1.3

- **Fixed: Pagination** - MRWA limits to 2,000 records per request (not 5,000)
- Uses `resultOffset` for proper pagination

### v4.1.2

- **Fixed: MRWA server URL** - Uses `gisservices.mainroads.wa.gov.au` (not blocked)
- Previous server `mrgis.mainroads.wa.gov.au` was unreachable from some networks

### v4.1.1

- **Fixed: Error handling** - Graceful fallback when MRWA unreachable
- Connection status display (green = connected, amber = unreachable)
- Increased timeout to 60 seconds

### v4.1.0

- **NEW: Admin Data Sync Panel** - Sync data directly from MRWA servers
  - No developer assistance needed for data updates
  - Per-dataset sync controls (roads, speed zones, signage)
  - Automatic signage filtering (speed & railway signs only)
  - Sync metadata tracking (last sync date, record counts)
- **Hybrid data approach**: Static files for quick start + MRWA sync for fresh data
- **Dataset management**: View local data status, clear individual datasets

### v4.0

- **NEW: Signage Corridor Report** - Replaces Speed Zones section
  - Shows all signage within ±700m of work zone
  - Railway crossings with Public/Private type
  - Speed zone changes by carriageway (Left/Right/Single)
  - Regulatory signs (STOP, GIVE WAY, speed restrictions)
  - Warning signs (advisory speeds, curves, signals ahead, railway ahead)
- **New data layers downloaded**:
  - Layer 15: Rail Crossings
  - Layer 22: Signs Regulatory
  - Layer 23: Signs Warning
- **Removed**: "Posted Speed Limit at Start SLK" dialog
- **Improved**: Download now shows counts for all data types

### v3.2.3

- **SLK precision fix**: SLK now correctly shows 3 decimal places when speed < 20 km/h
- **Accuracy in metres**: GPS accuracy displayed as ±Xm instead of ±0.00Xkm

### v3.2.2

- **GPS accuracy display**: Shows ±X.XXX km accuracy when speed < 20 km/h

### v3.2.1

- **Fix: Build error** - Fixed TypeScript error where currentSpeedKmh was used before declaration

### v3.2

- **Sticky road for speed zones**: Only uses speed zones from locked-in road
- **Look-ahead speed display**: Shows speed limit BEFORE reaching the sign

### v3.1

- **Searchable dropdowns**: Type to filter regions and roads
- **Larger distance display**: Distance remaining shows larger text when under 2km

### v3.0

- **Carriageway direction support**: Left = increasing SLK, Right = decreasing SLK
- **SLK stall fix**: Sticky road logic prevents losing track on H005
- **Event logging**: Troubleshooting info stored in localStorage
- **Direction flickering fix**: 3-reading confidence threshold
- **High precision mode**: Shows 3 decimal places when speed < 20 km/h

### v2.8.5

- **Tools menu on drive page**: Added 🔧 spanner icon with Generate Debug Info and Calibrate SLK options
- **Destination navigation**: Added Navigate and Street View buttons to destination info dialog
- **Equally spaced buttons**: All Navigate/Street View buttons now equal width with text labels
- **Export in Setup menu**: Export Report button moved to Settings (⚙️) dialog
- **Default region setting**: Users can set a default region in Settings that pre-selects on load

### v2.8.4

- **Hidden inputs during restore**: Inputs stay hidden while restoring work zone info
- **Persistent params**: Work zone params persist in sessionStorage until Reset is clicked
- **Multiple tracking sessions**: User can go back and forth between tracking and main page
- **Loading indicator**: Shows "Restoring work zone info..." during restore process
- Params only cleared when "Reset Work Zone Info" is clicked

### v2.8.3

- **Auto-restore work zone info**: Results automatically display when returning from SLK tracking
- **New `getWorkZoneInfo()` function**: Clean parameter-based architecture with `keepInfo` flag
- Parameters saved to sessionStorage, results fetched fresh on return
- No need to click "Get Work Zone Info" button after returning from tracking

### v2.8.2

- **Fixed state restoration bug**: Work zone info now correctly restores when returning from SLK tracking
- Added `isRestoring` ref to prevent `fetchRoads` from clearing selected road during state restore
- State persistence now works reliably with sessionStorage

### v2.8.1

- **Cleaner UI when results displayed**: GPS section, region, road ID, and SLK inputs are hidden when work zone results are shown
- **Reset button**: "Get Work Zone Info" changes to "Reset Work Zone Info" when results are displayed
- **State persistence**: Work zone info is maintained when returning from SLK tracking using sessionStorage
- No duplicate inputs - cleaner, more focused interface

### v2.8.0

- **UI Cleanup**: Replaced "Stop Tracking" button with "Back to Work Zone Locator" link on drive page
- **Cleaner interface**: "Start SLK Tracking" button on front page now hidden when results are displayed
- No duplicate tracking buttons - tracking button only appears in relevant context

### v2.7.9

- **Fixed speed limit timing**: Speed limit is now looked up AFTER GPS confirms current location
- Added useEffect that triggers speed lookup when roadInfo changes
- Removed duplicate speed logic - single source of truth for speed limit updates
- Speed limit now updates correctly while tracking without needing to stop/restart

### v2.7.8

- **Fixed speed limit logic**: Speed limit is now ALWAYS based on current GPS position, never on destination SLK
- Pre-loads speed zones for destination road (optimization) but doesn't set speed limit until GPS locks
- Correctly handles both scenarios: tracking with or without destination

### v2.7.7

- **Fixed speed limit using URL SLK**: Now uses the SLK from URL params immediately, not waiting for GPS-calibrated SLK
- Speed limit displays correctly as soon as page loads with road_id and slk parameters

### v2.7.6

- **Fixed speed limit display on page load**: Speed limit now shows immediately when opening SLK tracking from URL parameters
- No longer waits for GPS lock to display the correct posted speed limit
- Speed zones are loaded as soon as road_id is available from URL params

### v2.7.5

- **Fixed speed limit calculation**: Speed zones now correctly display the actual speed limit at your current SLK position
- Speed limits are now numeric values (e.g., 110 instead of "110km/h") for accurate comparison
- Posted limit display now correctly shows the speed limit from MRWA data based on current road ID and SLK

### v2.7.0

- **Complete WA road coverage**: 69,471 roads across all 8 MRWA regions
- **69,455 speed zones** for speed limit lookup
- Data sourced from Layer 17 (Road Network with RA_NAME for all roads)
- Static data files in `/public/data/` for reliable offline loading
- Updated status indicator shows "69K Roads • 8 Regions"

### v2.6.1

- **Major data improvement**: Now using Layer 17 which includes region (RA_NAME) for ALL roads
- **67,000+ roads** with correct MRWA region assignments
- **Local roads now included** with proper region mapping
- Fixed H005 showing only Metropolitan (now correctly spans Metro/Wheatbelt/Goldfields)
- Fixed M056 now correctly shows Wheatbelt region
- Local roads like Hovea Crescent in Wundowie now correctly show Wheatbelt/Northam

### v2.5.5

- Fixed TypeScript build error (parameter order)
- Region-based downloading (downloads one region at a time)
- Avoids Vercel timeout by fetching smaller chunks

### v2.5.4

- Region-based downloading (downloads one region at a time)
- Avoids Vercel timeout by fetching smaller chunks
- Better progress messages showing current region
- Continues with other regions if one fails

### v2.5.3

- Changed to client-side downloading (bypasses server restrictions)
- Downloads road data directly from browser to MRWA API
- Better progress messages during download
- Connection test before starting download

### v2.5.2

- Improved offline data download with timeout handling
- Added connectivity test before downloading
- Shows detailed error messages from API
- Smaller batch sizes for more reliable downloads
- Better error recovery during fetch

### v2.5.1

- Added setup icon (⚙️) for offline data download
- Added auto-start SLK tracking button
- Added Street View links to all navigation buttons
- Shows offline ready status indicator

### v2.5

- Client-side IndexedDB for true offline support
- SLK calibration per road
- Direction color coding (towards/away/static)
- Speed limit from MRWA data
- Speed warning indicator

### v2.4

- Weather and UV index integration
- Traffic volume data
- Nearby amenities

### v2.0

- Complete rewrite with Next.js App Router
- MRWA ArcGIS API integration
- Work zone calculation

## License

This project is for internal use by Traffic Controllers for work zone planning and navigation.

## Acknowledgments

- Main Roads Western Australia for providing open road data
- OpenStreetMap contributors for amenity data
- Open-Meteo for weather API
