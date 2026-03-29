# TC Work Zone Locator

## Release Candidate 1.9.8

**Complete Layout & Functionality Documentation**

| Field          | Value                                            |
| -------------- | ------------------------------------------------ |
| **Version**    | RC 1.9.8                                         |
| **Date**       | June 2025                                        |
| **Repository** | https://github.com/instructor-ship-it/roadfinder |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Application Pages](#2-application-pages)
3. [Color Scheme & Styling](#3-color-scheme--styling)
4. [Home Page Layout](#4-home-page-layout)
5. [Drive Page Layout](#5-drive-page-layout)
6. [AfterCare Page Layout](#6-aftercare-page-layout)
7. [Overrides Page Layout](#7-overrides-page-layout)
8. [Calibrate Page Layout](#8-calibrate-page-layout)
9. [Library Page Layout](#9-library-page-layout)
10. [Traffic Counter Page Layout](#10-traffic-counter-page-layout)
11. [QA Page Layout](#11-qa-page-layout)
12. [Offline Page Layout](#12-offline-page-layout)
13. [Settings Drawer](#13-settings-drawer)
14. [Warning Banners](#14-warning-banners)
15. [Speed Sign Override System](#15-speed-sign-override-system)
16. [API Endpoints](#16-api-endpoints)
17. [Version History](#17-version-history)

---

## 1. Overview

TC Work Zone Locator is a mobile-first Progressive Web Application (PWA) designed for Traffic Controllers in Western Australia. The application provides real-time GPS-based SLK (Straight Line Kilometre) tracking, work zone location lookup, weather information, speed sign overrides, AfterCare signage tracking, and offline capability for remote area operations.

### 1.1 Key Features

- **Work zone location lookup** by region, road, and SLK
- **Real-time GPS tracking** with Extended Kalman Filter (EKF) smoothing
- **Speed zone lookahead** with advance warning of speed changes
- **Community-verified speed sign override** system
- **AfterCare signage tracking** for signs awaiting retrieval
- **AfterCare Map View** with colored pins on OpenStreetMap
- **Speed Sign Overrides** - Record community-verified corrections to MRWA data
- **Offline capability** with 69,000+ roads downloaded
- **Weather data**, traffic volume, and nearby amenities
- **GPS lag calibration** tool
- **PWA support** - installable on mobile home screen
- **Set Distance** tool for GPS-based distance measurement
- **Library** page with searchable documentation and resources
- **Traffic Counter** integration for vehicle counting
- **Q&A Assistant** with AI-powered document search
- **Speeding Alert** with WA fine information display
- **Minutes per km** and **10km travel time** displays
- **Settings Drawer** with organized configuration options
- **Weather Warning Banner** for BOM alerts
- **Incident Warning Banner** for road incidents
- **Fuel price display** with daily updated diesel pricing from FuelWatch WA
- **Hospital type badges** (ED, Public, Private, Nursing Post)
- **Multi-source amenity data** (WA Health SLIP + FuelWatch WA + Overpass)

### 1.2 Technology Stack

| Technology      | Description                                 |
| --------------- | ------------------------------------------- |
| Framework       | Next.js 15 with App Router                  |
| Language        | TypeScript                                  |
| Styling         | Tailwind CSS with shadcn/ui                 |
| Offline Storage | IndexedDB + localStorage                    |
| GPS Filtering   | Extended Kalman Filter (EKF)                |
| Maps            | Google Maps Links + OpenStreetMap (Leaflet) |

---

## 2. Application Pages

The application has twelve main pages:

| Page             | Route               | Purpose                            |
| ---------------- | ------------------- | ---------------------------------- |
| Home             | `/`                 | Work zone lookup interface         |
| Drive            | `/drive`            | Real-time GPS tracking             |
| AfterCare        | `/aftercare`        | Signage tracking for retrieval     |
| AfterCare Map    | `/aftercare/map`    | Map view of all signs              |
| Overrides        | `/overrides`        | Speed sign override management     |
| Overrides Layout | `/overrides/layout` | Visual overview of overrides       |
| Overrides Map    | `/overrides/map`    | Map view of speed overrides        |
| Calibrate        | `/calibrate`        | GPS lag measurement                |
| Library          | `/library`          | Documentation and resources        |
| Traffic Counter  | `/traffic-counter`  | Vehicle counting tool              |
| QA               | `/qa`               | AI Q&A assistant                   |
| Offline          | `/offline`          | Offline status and data management |

---

## 3. Color Scheme & Styling

### 3.1 Primary Colors

| Element          | Tailwind Class   | Hex Color |
| ---------------- | ---------------- | --------- |
| Background       | `bg-gray-900`    | #111827   |
| Cards            | `bg-gray-800`    | #1F2937   |
| Primary Buttons  | `bg-blue-600`    | #2563EB   |
| Dark Buttons     | `bg-blue-800`    | #1E40AF   |
| Section Headers  | `text-blue-400`  | #60A5FA   |
| Warning Text     | `text-amber-400` | #FBBF24   |
| Success Text     | `text-green-400` | #4ADE80   |
| Cyan (AfterCare) | `text-cyan-400`  | #22D3EE   |

### 3.2 Status Colors

| Status               | Color            | Meaning                      |
| -------------------- | ---------------- | ---------------------------- |
| Direction: Towards   | Green            | Moving towards destination   |
| Direction: Away      | Red pulsing      | Moving away from destination |
| Direction: Static    | Yellow           | Stationary                   |
| Speed: Normal        | Green            | At or below limit            |
| Speed: Speeding      | Red pulsing      | Exceeding limit              |
| Override Zone        | Green border + ✓ | Community-verified zone      |
| Speed Decrease Ahead | Amber border     | Approaching lower limit      |

### 3.3 AfterCare Status Colors

| Status          | Color  | Marker | Meaning                      |
| --------------- | ------ | ------ | ---------------------------- |
| Active          | Green  | 🟢     | Not yet due for retrieval    |
| Due Maintenance | Yellow | 🟡     | Maintenance interval passed  |
| Due Retrieval   | Red    | 🔴     | Past scheduled/standard date |
| Retrieved       | Blue   | ✓      | All signs collected          |
| TBA             | Gray   | ⏸      | Awaiting instruction         |

---

## 4. Home Page Layout (/)

### 4.1 Header Section

- Application title: "TC Work Zone Locator"
- Version display: "vRC 1.9.8"
- Offline status indicator (green when data downloaded)
- Hamburger menu (☰) - Opens Settings drawer

### 4.2 Input Section

- Region dropdown (8 MRWA regions + Local option)
- Road ID dropdown (searchable) or text input (Local roads)
- Start SLK input
- End SLK input (optional)
- "Get Work Zone Info" button

### 4.3 Results Sections

- **Work Zone Summary** - Road info, SLK range, lane diagram, navigation buttons
- **Lane Direction Diagram** - Visual lane allocation with direction arrows
- **Road Width Breakdown** - Shoulders, lanes, total width
- **Traffic Volume** - AADT, peak hour, heavy vehicle %
- **Signage Corridor** - Intersections (±1100m), signs (±700m)
- **TC Positions** - Start/end positions with navigation
- **Weather** - Current conditions, forecast, UV index, wind gusts
- **Amenities** - Hospital, fuel station, toilet

### 4.4 TC Tools Section

- **AfterCare Signs** - Link to AfterCare page
- **Set Distance** - GPS-based distance measurement tool
- **Export Work Zone Info** - Generate text report

---

## 5. Drive Page Layout (/drive)

### 5.1 Speed Display

- Current speed in large green text (red if over limit)
- Speed limit in circle with border:
  - **White**: Current speed
  - **Amber**: Approaching speed decrease
  - **Green + pulsing ✓**: In override zone
- EKF status indicator with confidence level
- **Minutes per km** display showing travel time efficiency
- **10km travel time** display for route planning

### 5.2 Current Location Section

- Road ID (green text)
- Road Name (white text)
- SLK with direction indicator ⇐/⇒ (yellow text)
- Road Type (State Road/Local Road)

### 5.3 Direction Indicators

- **Green**: Moving towards destination
- **Red blinking**: Moving away from destination
- **Yellow**: Stationary
- **White**: No destination set

### 5.4 Speeding Alert

When exceeding the speed limit, a warning banner displays:

- Current speed vs limit
- Amount over the limit
- **WA Fine Information**:
  - Fine amount based on km/h over limit
  - Demerit points applicable
  - "Slow Down" warning message

### 5.5 AfterCare Integration

- Cyan banner appears when signs on current road
- Shows next upcoming sign with distance
- Links to `/drive/nearby-signs` for full list

### 5.6 Landscape Mode

- Automatic 2-column layout in landscape orientation
- Left column: SLK, road info
- Right column: Speed display or destination info
- Larger text for at-a-glance reading
- GPS signal indicator in compact header
- Minimalist "Exit" button in top-left corner
- Footer bar shows destination details (when speed display ON)
- Speed Display OFF + Destination: right column shows destination
- Speed Display OFF + No Destination: centered panel with GPS accuracy

---

## 6. AfterCare Page Layout (/aftercare)

### 6.1 Header

- Title: "AfterCare Signs"
- Version display: "vRC 1.9.8"
- Back to Work Zone Locator link

### 6.2 Job List

Grouped by status:

- 🔴 Due for Retrieval
- 🟡 Due for Maintenance
- ⏸ TBA
- 🟢 Active
- ✓ Archived

### 6.3 Job Card

- Job name (auto-generated: "ROAD_ID - DD/MM/YYYY")
- Road ID and name
- Sign count with status breakdown
- Action buttons: Edit, Navigate, Mark Retrieved, Delete

### 6.4 Add/Edit Job

- Job Name (editable)
- Road ID
- Signs list with:
  - SLK
  - Direction (True Left / True Right)
  - Category (Surface, Speed, Hazard)
  - Sign Type (from presets or custom)
  - Retrieval Type (Standard, Scheduled, TBA, Daily/Weekly/Monthly)
  - GPS coordinates (auto-fetched or captured)

### 6.5 Sign Actions

- **Navigate** - Open Google Maps directions
- **Mark Retrieved** - Set status to retrieved with date
- **Mark Due Early** - Flag for early retrieval
- **Edit** - Modify sign details inline
- **Delete** - Remove sign with confirmation

### 6.6 Map View Button

- "🗺️ Map" button opens `/aftercare/map`

---

## 7. AfterCare Map Page Layout (/aftercare/map)

### 7.1 Header

- Back link to AfterCare page
- Title: "🗺️ Signage Map"
- Sign count indicator

### 7.2 Filter Buttons

| Button | Filter                   | Color  |
| ------ | ------------------------ | ------ |
| All    | Show all signs           | Gray   |
| 🔴     | Due for retrieval only   | Red    |
| 🟡     | Due for maintenance only | Yellow |
| 🟢     | Active signs only        | Green  |

### 7.3 Map Display

- Full-screen OpenStreetMap via Leaflet
- Colored circle markers for each sign
- Auto-centers on signs (defaults to Perth if none)

### 7.4 Marker Popup Details

- Road ID and SLK
- Road name
- Sign type
- Direction (True Left ⇐ / True Right ⇒)
- Description
- Status with colored indicator

### 7.5 Legend Bar

Fixed at bottom-left of map:

- 🟢 Active
- 🟡 Maintenance
- 🔴 Retrieval

---

## 8. Overrides Page Layout (/overrides)

### 8.1 Header

- Version: "vRC 1.9.8"
- Storage mode: "Local Storage"
- Back to Work Zone Locator button

### 8.2 Override Table

Columns: ID, Road, SLK, Direction, Sign Type, Front Speed, Back Speed, Actions

### 8.3 Add Override Form

- Road ID (text input)
- Road Name (text input)
- SLK (number)
- Direction: True Left / True Right buttons
- Sign Type: Single / Double buttons
- Replicated checkbox
- Start SLK, End SLK
- Approach Speed, Front Speed, Back Speed

### 8.4 Actions

- **Export** - Shows data in textarea for copy/paste
- **Import** - Load from JSON file
- **Delete** - Remove individual override
- **Clear All** - Remove all overrides

---

## 9. Library Page Layout (/library)

### 9.1 Header

- Title: "📚 Library"
- Search input for filtering documents
- Category filter tabs

### 9.2 Document Categories

| Category  | Contents                              |
| --------- | ------------------------------------- |
| Manuals   | User manual, quick reference guides   |
| Technical | Architecture docs, API references     |
| Data      | Data dictionary, source documentation |
| Forms     | Work zone report templates            |

### 9.3 Document List

- Document title and description
- Category badge
- Last updated date
- Click to view/download

### 9.4 Search Features

- Full-text search across all documents
- Filter by category
- Sort by name or date

---

## 10. Traffic Counter Page Layout (/traffic-counter)

### 10.1 Header

- Title: "🚗 Traffic Counter"
- Back to home link

### 10.2 Counter Controls

- **Start Counting** button
- **Stop** button
- **Reset** button

### 10.3 Count Display

- Vehicle count
- Heavy vehicle count
- Time elapsed
- Counts per hour (calculated)

### 10.4 Session Management

- Save session with notes
- Export session data
- View previous sessions

---

## 11. QA Page Layout (/qa)

### 11.1 Header

- Title: "🤖 AI Q&A Assistant"
- Back to Library link
- Online/Offline status indicator

### 11.2 Question Interface

- Question input field accepts text
- Enter key submits question
- Ask button disabled when offline
- Ask button disabled when question empty
- Loading state shows during AI request

### 11.3 Document Selection

- Documents grouped by category
- Click to select/deselect documents
- "Select All" button selects all documents
- "Clear" button deselects all documents
- Selection count shows correctly

### 11.4 AI Response

- Answer displays in formatted text
- Source documents shown with badges
- "Save" button opens save dialog
- "Copy" button copies answer to clipboard

### 11.5 Save Q&A

- Save dialog shows question preview
- Can add optional category label
- Save button creates entry in history
- Saved count in History button updates

### 11.6 History View

- "History" button toggles history view
- Saved Q&A entries displayed
- Favorite toggle works (⭐/☆)
- Delete button removes entry
- Search history works
- Filter by All/Favorites works

---

## 12. Offline Page Layout (/offline)

### 12.1 Status Display

- Online/Offline status
- Last sync timestamp
- Data freshness indicator

### 12.2 Data Management

- **Download Data** button
- Progress indicator during download
- Storage usage display
- **Clear Offline Data** button

### 12.3 Offline Capabilities List

Shows which features work offline:

- Work zone lookup
- GPS tracking
- Speed zones
- Overrides
- AfterCare jobs
- Settings

---

## 13. Settings Drawer

Accessed via hamburger menu (☰) in header. Opens as bottom sheet drawer.

### 13.1 Settings Sections (Alphabetical)

| Section              | Contents                                 |
| -------------------- | ---------------------------------------- |
| About                | App info, contact, user manual link      |
| Admin Data Sync      | MRWA sync options, data status           |
| GPS & Tracking       | EKF settings, speed display, calibration |
| Offline Data         | Download/clear data, offline toggles     |
| Preferences          | Default region, wind gust threshold      |
| Speed Zone Overrides | Override management link                 |
| TC Tools             | AfterCare, Set Distance links            |

### 13.2 GPS Settings

| Setting              | Default | Description                    |
| -------------------- | ------- | ------------------------------ |
| EKF Filtering        | On      | Extended Kalman Filter for GPS |
| Road Constraint      | On      | Snap predictions to road       |
| Max Prediction Time  | 30s     | GPS outage prediction limit    |
| Show Uncertainty     | On      | Display ±Xm accuracy           |
| Early Warnings       | On      | Alert earlier at higher speeds |
| Speed Lookahead      | 5s      | Lookahead time for warnings    |
| GPS Lag Compensation | 0s      | Measured lag offset            |

### 13.3 Wind Gust Alert

Threshold buttons: 40, 50, 60, 80 km/h. Default is 60 km/h.

### 13.4 Speeding Alert Settings

| Setting             | Default | Description                   |
| ------------------- | ------- | ----------------------------- |
| Show Speeding Alert | On      | Display warning when speeding |
| Show WA Fines       | On      | Display WA fine information   |
| Alert Threshold     | 5 km/h  | km/h over limit to trigger    |

---

## 14. Warning Banners

### 14.1 Weather Warning Banner

- **Trigger**: BOM severe weather warnings for current location
- **Display**: Amber/yellow banner at top of page
- **Contents**:
  - Warning type (e.g., "Severe Weather Warning")
  - Warning title
  - Click to expand for details
  - Link to BOM website
- **Auto-refresh**: Every 30 minutes
- **Dismissable**: Can be dismissed for current session

### 14.2 Incident Warning Banner

- **Trigger**: Active road incidents on current road
- **Display**: Red/amber banner at top of page
- **Contents**:
  - Incident type (e.g., "Crash", "Road Works", "Hazard")
  - Location description
  - Expected delay (if available)
  - Last updated time
- **Integration**: MRWA Traffic Alerts API
- **Click**: Opens incident details panel

---

## 15. Speed Sign Override System

### 15.1 Overview

Community-verified corrections to MRWA speed zone data. Stored in localStorage, takes precedence over MRWA data.

### 15.2 Sign Data Fields

| Field       | Description                                               |
| ----------- | --------------------------------------------------------- |
| direction   | True Left (INCREASING SLK) or True Right (DECREASING SLK) |
| sign_type   | Single or Double sided                                    |
| replicated  | Matching sign on opposite side?                           |
| front_speed | Speed on face pointing in direction                       |
| back_speed  | Speed on opposite face (double only)                      |

### 15.3 Zone Generation

| Sign Type | Replicated  | Zones Created               |
| --------- | ----------- | --------------------------- |
| Single    | No          | None (repeater only)        |
| Single    | Yes         | One directional zone        |
| Double    | Same speeds | One Single carriageway zone |
| Double    | Diff speeds | Two directional zones       |

---

## 16. API Endpoints

| Endpoint              | Method   | Description                                                        |
| --------------------- | -------- | ------------------------------------------------------------------ |
| `/api/roads`          | GET/POST | Road data, SLK coordinates                                         |
| `/api/gps`            | GET      | GPS to SLK conversion                                              |
| `/api/weather`        | GET      | Weather data (Open-Meteo)                                          |
| `/api/warnings`       | GET      | BOM weather warnings                                               |
| `/api/traffic`        | GET      | Traffic volume data                                                |
| `/api/places`         | GET      | Nearby amenities                                                   |
| `/api/intersections`  | GET      | Cross road detection                                               |
| `/api/admin-sync`     | GET/POST | MRWA direct sync                                                   |
| `/api/overrides`      | GET/POST | Override storage                                                   |
| `/api/speed-compare`  | GET      | MRWA vs OSM comparison                                             |
| `/api/osm-speed`      | GET      | OSM speed limits                                                   |
| `/api/speed-verify`   | GET      | Speed verification                                                 |
| `/api/speedlimit`     | GET      | Speed limit lookup                                                 |
| `/api/download-signs` | GET      | Sign data download                                                 |
| `/api/export-pdf`     | POST     | Report export                                                      |
| `/api/sync-data`      | POST     | Offline data sync                                                  |
| `/api/qa`             | POST     | Q&A AI assistant                                                   |
| `/api/library`        | GET      | Library documents                                                  |
| `/api/fuel-stations`  | GET      | Diesel fuel stations (FuelWatch WA + Overpass merge, 30-min cache) |

---

## 17. Version History

### RC 1.9.8 (Current) - Fuel Stations, Hospital Badges, Multi-Source Amenities

- **Fuel station search** now merges FuelWatch WA and Overpass data for comprehensive coverage
- **Hospital type badges** show ED, Public, Private, or Nursing Post status
- **Hospital details** include bed count, address, and phone from WA Health SLIP
- **Fuel price display** with daily updated diesel pricing from FuelWatch WA
- **Site features** for fuel stations (e.g., Fuel Cards, ATM, Toilets, EFTPOS)
- **Multi-source amenity data** from WA Health SLIP + FuelWatch WA + Overpass
- **Report fuel station output** includes diesel price, brand, features, address, phone

### RC 1.9.7 - Maximum Hold Time, Shuttle Flow Corrections, UI Improvements

- **Maximum Hold Time Calculator** added to Work Zone Info page
- **Shuttle Flow Risk Assessment** fixed to match AGTTM Part 2 Table 3.5 and MRWA COP Table 15
- **Clearance Time** unit conversion corrected (seconds not minutes)
- **Heavy Vehicle Count Button** colour changed to blue for better visual distinction
- **Offline Data Section** collapsed by default when data already downloaded

### RC 1.9.1 - Speeding Alert & UI Enhancements

- **Added Speeding Alert feature** with WA fine information display
  - Real-time speed vs limit comparison
  - Fine amounts based on WA road traffic code
  - Demerit point information
  - Configurable alert threshold
- **Added Minutes per km display** on drive page
- **Added 10km travel time display** for route planning
- **Added Settings Drawer component** with organized sections
- **Added Weather Warning Banner** for BOM alerts
- **Added Incident Warning Banner** for road incidents
- **Added Library page** (`/library`) for documentation access
- **Added Traffic Counter page** (`/traffic-counter`) for vehicle counting
- **Added Q&A Assistant page** (`/qa`) with AI-powered search
- **Added Offline status page** (`/offline`) for data management
- **Added Overrides Layout page** (`/overrides/layout`) for visual overview
- **Added Overrides Map page** (`/overrides/map`) for geographic view

### RC 1.7.18 - Signage Corridor Intersection Fix

- **Fixed Signage Corridor showing incorrect intersections in work zone reports**
  - Previous issue: Report showed parallel roads as intersections
  - Root cause: Geometry proximity was finding parallel roads, not actual intersections
  - Fix: Now uses crossRoads from `/api/intersections` (MRWA Layer 6)
- **Updated CrossRoad interface** to include intersectionSlk field
- **Removed buggy intersection detection** from getSignageInCorridor()
- Both text and HTML reports now show accurate intersection data

### RC 1.7.17 - Emergency Location Cross Road Detection Fix

- **Created shared emergency module** (`src/lib/emergency.ts`)
  - Consolidated ~200 lines of duplicated code
  - Functions: findCrossRoad(), findNearestTown(), findNearestHospital()
- **Fixed cross road detection using Layer 6 (Intersections)**
  - Increased ArcGIS resultRecordCount from 50 to 200
  - Now correctly shows intersecting roads, not parallel roads
- **Added utility functions to `src/lib/utils.ts`**
  - getBearing(), getDirectionFromBearing(), formatDistance()
- **Fixed distance display bug** - was showing "100mm" instead of "100m"

### RC 1.7.14 - Emergency Location Enhancement

- Added locality (town) name to emergency location
- Added nearest town distance to emergency message
- Distance formatting improvements (km vs m)

### RC 1.6.0 - AfterCare Map View

- **New AfterCare Map Page** (`/aftercare/map`)
  - Full-screen OpenStreetMap with colored pins
  - Filter by status: All / Retrieval / Maintenance / Active
  - Tap markers for sign details
  - Auto-centers on signs
- **Technical Implementation**
  - Leaflet + react-leaflet integration
  - SSR disabled via dynamic imports
  - Fixed viewport layout for map containment

### RC 1.5.9 - Expanded Offline Data Support

- Added offline support for pavement data, traffic volume, amenities
- Weather caching (30 minutes)
- API fallback to offline data

### RC 1.5.8 - Report Signage Fix

- Fixed signage corridor filtering in reports
- Intersections filtered to ±1100m

### RC 1.5.7 - Offline Startup Fix

- Fixed app hanging on startup without internet
- Added navigator.onLine check before API calls

### RC 1.5.6 - Offline Data Source Toggles

- 6 toggles to switch between online/offline data
- "Reset All" button for defaults

### RC 1.5.3 - Work Zone Report Feature

- Generate comprehensive work zone reports
- Copy to clipboard or download

### RC 1.5.2 - Multi-Region Roads Fix

- Fixed roads missing from regions they span
- H005 now appears in Wheatbelt

### RC 1.5.1 - State Roads Filter Fix

- Fixed road dropdown showing local roads
- Added state road filter

### RC 1.5.0 - Nearby Signs Page & PWA

- New `/drive/nearby-signs` page
- PWA support for offline installation
- Internet signal bar on drive page
- Filtered AfterCare view

### RC 1.4.0 - AfterCare Signage Tracking

- New AfterCare module (`/aftercare`)
- Job-based signage tracking
- Retrieval scheduling
- Status tracking with auto-flagging
- Export/Import jobs

### RC 1.3.0 - Set Distance & Lane Naming

- Set Distance feature (renamed from SLK Meter)
- Lane direction diagram
- Lane names (L1, L2, etc.) for 3+ lanes

### RC 1.2.26 - SLK Meter Improvements

- 10m increments for easier reading
- Live total distance display

### RC 1.2.17 - Landscape Mode

- Automatic 2-column layout in landscape
- Optimized for in-vehicle phone mounts

### RC 1.2.1 - Override Zone Visual Indicator

- Green border + pulsating ✓ for override zones
- Fixed default sign direction bug

### RC 1.2.0 - Speed Sign Override System

- Fixed double-sided sign interpretation
- Mobile export fix (copy/paste)
- Merged context files

### RC 1.0.4 - Sign-Based Override System

- Sign-based override with type, direction, speeds

### RC 1.0.3 - Override Management Page

- Override management page at `/overrides`
- MRWA Exception Report generator

### RC 1.0.2 - Road Priority Fix

- Road priority as tiebreaker only (within 50m)

### RC 1.0.1 - GPS Tracking Fix

- GPS tracking prioritization fix for state roads

### RC 1.0 - Initial Release Candidate

- Work zone lookup
- GPS tracking
- Offline capability
- Weather integration
