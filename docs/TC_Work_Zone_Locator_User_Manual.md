**TC Work Zone Locator**

**User Manual**

Version 1.28.5

April 2026

_For Traffic Controllers in Western Australia_

https://github.com/instructor-ship-it/roadfinder

---

## Table of Contents

1. Introduction
2. Getting Started
3. Offline Capability
4. Home Page - Work Zone Lookup
5. Drive Page - GPS Tracking
6. TC Tools - Cycle Timer, Traffic Counter, Event Logger
7. AfterCare - Signage Tracking
8. AfterCare Map - Visual Sign Locator
9. Overrides Page - Speed Sign Corrections
10. Calibrate Page - GPS Lag Measurement
11. Library Page - Documentation & Resources
12. Traffic Counter - Vehicle Counting
13. Q&A Assistant - AI Help
14. Settings
15. Troubleshooting
16. Quick Reference

---

## 1. Introduction

### 1.1 What is TC Work Zone Locator?

TC Work Zone Locator is a mobile-first web application designed specifically for Traffic Controllers working on Western Australian roads. It helps you locate work zones, track your position in real-time, know the speed limits for any location, track signage awaiting retrieval, and work effectively in remote areas without internet access.

### 1.2 Key Features

- **Work Zone Lookup** - Find coordinates for any road by SLK (Straight Line Kilometre)
- **Real-time GPS Tracking** - Track your position with EKF smoothing for accuracy
- **Speed Zone Display** - See current speed limit with advance warning of changes
- **AfterCare Signage Tracking** - Track signs placed on roads awaiting retrieval
- **AfterCare Map View** - See all your signs on a map with colored status pins
- **Speed Sign Overrides** - Record community-verified corrections to MRWA data
- **Offline Operation** - Works without internet after downloading data
- **Signage Corridor** - View all signage near your work zone
- **Weather Integration** - Current conditions and forecast when online
- **PWA Support** - Install on your phone's home screen like a native app
- **Library** - Access documentation and resources
- **Traffic Counter** - Count vehicles for traffic studies
- **Cycle Timer** - Monitor truck travel times with lap times
- **Traffic Event Logger** - Log TC events with timestamps, GPS, and Google Sheets sync
- **Q&A Assistant** - AI-powered help with questions (prompt generation or direct chat)
- **Speeding Alert** - Warning with WA fine information

### 1.3 Who Should Use This App

This application is designed for Traffic Controllers in Western Australia who need to:

- Locate work zones on state and local roads
- Navigate to TC positions (±100m from work zone)
- Know speed limits for the road they are working on
- Track signage placed for later retrieval
- Record discrepancies between physical signs and MRWA database
- Work in remote areas without reliable internet

---

## 2. Getting Started

### 2.1 Accessing the Application

Open your web browser and navigate to the application URL. The app works on any modern browser (Chrome, Safari, Firefox, Edge) on your phone, tablet, or computer.

For best results, use Chrome on a mobile phone.

### 2.2 First-Time Setup

**Step 1: Download Offline Data**

Before you can use the app offline, you must download the road data:

- Tap the ☰ (hamburger) icon in the top-right corner
- A bottom sheet drawer will slide up from the bottom
- In the Offline Data section, tap "Download Data" button
- Wait for the download to complete (about 69,000 roads)
- The app is ready when download completes

**Step 2: Set Your Default Region**

To save time, set your most commonly used region:

- In Settings (☰), find "Default Region" in the Preferences section
- Select your region (e.g., Wheatbelt, Metropolitan)
- This region will be pre-selected each time you open the app

**Step 3: Enable Location Access**

When prompted, allow the app to access your location. This is required for:

- GPS-based road detection
- Real-time SLK tracking
- Speed limit display
- AfterCare GPS capture

### 2.3 App Header

The header shows important status information:

- Version number (e.g., vRC 1.9.1)
- Offline status indicator
- Hamburger menu (☰) = Settings access

### 2.4 Installing as PWA (Progressive Web App)

You can install this app on your phone's home screen for quick access:

**iPhone/iPad:**

1. Open the app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right

**Android:**

1. Open the app in Chrome
2. Tap menu (three dots)
3. Tap "Add to Home screen" or "Install app"
4. Confirm installation

Benefits of PWA installation:

- Opens like a native app (no browser UI)
- Works offline after first load
- Faster startup
- Icon on home screen

---

## 3. Offline Capability

### 3.1 Does This App Work Offline?

**YES! The core features work 100% offline after downloading data.**

This is essential for Traffic Controllers working in remote areas of Western Australia where cell coverage is unreliable or non-existent.

### 3.2 What Works Offline

| **Feature**             | **Storage**              | **Offline?**              |
| ----------------------- | ------------------------ | ------------------------- |
| Work Zone Lookup        | IndexedDB                | ✓ Yes                     |
| GPS Tracking            | Device + IndexedDB       | ✓ Yes                     |
| SLK Position            | Computed locally         | ✓ Yes                     |
| Speed Zones             | IndexedDB + localStorage | ✓ Yes                     |
| Speed Sign Overrides    | localStorage             | ✓ Yes                     |
| AfterCare Jobs          | localStorage             | ✓ Yes                     |
| AfterCare Map           | OpenStreetMap tiles\*    | ✓ Yes                     |
| Signage Corridor        | IndexedDB                | ✓ Yes                     |
| TC Position Calculation | Computed locally         | ✓ Yes                     |
| Direction Detection     | Computed from GPS        | ✓ Yes                     |
| Google Maps Links       | Generated URLs           | ✓ Yes                     |
| Set Distance Tool       | Device GPS               | ✓ Yes                     |
| Library                 | Cached docs              | ✓ Yes                     |
| Traffic Counter         | localStorage             | ✓ Yes                     |
| Cycle Timer             | localStorage             | ✓ Yes                     |
| Traffic Event Logger    | localStorage             | ✓ Yes (syncs when online) |
| Q&A Assistant           | AI API                   | ✗ No                      |
| Settings                | localStorage             | ✓ Yes                     |

\*Map tiles are cached after first view

### 3.3 What Requires Internet

| **Feature**          | **Source**     | **Offline?** |
| -------------------- | -------------- | ------------ |
| Weather Data         | Open-Meteo API | ✗ No         |
| BOM Weather Warnings | RSS Feed       | ✗ No         |
| Nearby Amenities     | Overpass API   | ✗ No         |
| Traffic Volume       | MRWA API       | ✗ No         |
| Street View Images   | Google Maps    | ✗ No         |

### 3.4 Data Storage

**IndexedDB (downloaded once):**

- 69,000+ roads with geometry
- Speed zones from MRWA
- Rail crossings
- Regulatory signs
- Warning signs
- Pavement data
- Traffic volume

**localStorage (always available):**

- Speed sign overrides (your corrections)
- AfterCare jobs and signs
- GPS settings
- User preferences

### 3.5 Tips for Remote Work

- Download data before leaving coverage area
- Test the app in coverage area first
- Open the AfterCare map once while online to cache tiles
- Weather and amenities sections will show "unavailable" offline
- All core TC functions work without internet

---

## 4. Home Page - Work Zone Lookup

### 4.1 Overview

The home page is where you look up work zone information. Select a road, enter SLK values, and get coordinates for your work zone and TC positions.

### 4.2 Selecting a Road

**Option 1: Browse by Region**

- Select a region from the dropdown (Wheatbelt, Metropolitan, etc.)
- Select a road ID from the searchable dropdown
- The road name and valid SLK range will be displayed

**Option 2: Local Roads**

- Select "Local Roads" from the region dropdown (amber colored)
- Enter the road ID manually (e.g., "L00123")
- Or use GPS to auto-detect

### 4.3 Entering SLK Values

**Start SLK (required):**

Enter the starting SLK of your work zone. Use decimal values if needed (e.g., 67.62).

**End SLK (optional):**

Leave blank for a single point lookup, or enter the end SLK for a work zone range.

### 4.4 Using GPS Location

Tap "Find by GPS Location" to auto-fill the road and SLK based on your current position:

- Tap "Get My Location"
- Grant location permission if prompted
- The app will auto-fill road ID and SLK

### 4.5 Understanding Results

**Work Zone Summary:**

- Road name and ID
- Start and End SLK
- Zone length in meters
- Carriageway type (Left, Right, Single)
- Lane count and road width
- Navigation buttons (Maps, Street View, Track)

**Lane Direction Diagram:**

Visual diagram showing lane allocation with arrows:

- White arrows (⇒) = Traffic moving INCREASING SLK
- Yellow arrows (⇐) = Traffic moving DECREASING SLK
- Lane names (L1, L2, etc.) for roads with 3+ lanes

**Road Width Breakdown:**

Visual bar showing road width components from left to right:

- Amber = Unsealed shoulder
- Gray = Sealed shoulder
- Blue = Trafficable lanes

**Traffic Volume:**

- Annual Average Daily Traffic (AADT)
- Peak hour volume estimate
- Heavy vehicle percentage

**Signage Corridor:**

- Intersections within ±1100m of work zone
- Speed restriction signs within ±700m
- Warning signs within ±700m
- Rail crossings

**TC Positions:**

- TC Start: 100m before work zone
- TC End: 100m after work zone
- Navigation buttons for each position

**Weather (requires internet):**

- Current temperature and conditions
- Wind speed and gusts
- UV index
- Sunrise/sunset times
- 8-hour forecast
- BOM Radar link opens in new tab
- BOM Warnings link opens in new tab
- Weather warnings badge in header if warnings active
- Warning cards with clickable links

**Amenities (requires internet):**

- Nearest hospital (from WA Health SLIP Services — official government data)
- Nearest fuel station (from FuelWatch WA daily prices + OpenStreetMap)
- Nearest public toilet (from OpenStreetMap)

**Hospital details now show:**

- Hospital name with distance badge
- ED badge (red) — if the hospital has an Emergency Department
- Public/Private/Nursing Post badge (color-coded)
- Address line
- Phone number
- Bed count (if available)

**Fuel station details now show:**

- Station name with distance badge
- Diesel price badge (green): "$X.X/L Diesel" — from FuelWatch WA (updated daily)
- "No price today" badge (gray) — for stations that haven't submitted prices to FuelWatch
- Address line
- Phone number
- Site features: "Open 24 hours · Toilets · ATM · EFTPOS" etc.

**Amenity Data Sources:**

| **Amenity**   | **Primary Source**                             | **Fallback**  |
| ------------- | ---------------------------------------------- | ------------- |
| Hospitals     | WA Health SLIP Services (official government)  | OpenStreetMap |
| Fuel Stations | FuelWatch WA (daily diesel prices) + OSM merge | OpenStreetMap |
| Toilets       | OpenStreetMap                                  | —             |

### 4.6 TC Tools Section

In Settings (☰), you'll find TC Tools:

- **AfterCare Signs** - Link to AfterCare page
- **Set Distance** - GPS-based distance measurement tool

---

## 5. Drive Page - GPS Tracking

### 5.1 Overview

The drive page provides real-time GPS tracking with SLK position, speed limit display, and advance warning of speed zone changes.

### 5.2 Starting GPS Tracking

- From home page, tap the tracking icon (🗺) next to your work zone
- Or tap "Start SLK Tracking" button
- Grant location permission if prompted
- The page will automatically start tracking

### 5.3 Understanding the Display

**Speed Circle:**

- Green = At or below speed limit
- Red = Exceeding speed limit
- Amber border = Speed decrease approaching
- Green border + pulsing ✓ = In override zone
- **Minutes per km** display showing travel time efficiency
- **10km travel time** display for route planning

**Current Speed:**

Large green numbers show your current speed. Turns red when speeding.

**Speeding Alert:**

When exceeding the speed limit, a warning banner displays:

- Current speed vs limit
- Amount over the limit
- **WA Fine Information**:
  - Fine amount based on km/h over limit (e.g., $100 for 1-9 km/h over)
  - Demerit points applicable
  - "Slow Down" warning message
- Configurable threshold in Settings

**EKF Status:**

- Green dot ◉ = High accuracy
- Yellow dot ◐ = Medium accuracy
- Orange dot ◔ = Low accuracy
- Cyan diamond ◇ = Predicted position (GPS outage)

**Current Location Section:**

- Road ID (green text)
- Road Name (white text)
- SLK with direction indicator ⇐/⇒ (yellow text)
- Road Type (State Road/Local Road)

### 5.4 Direction Indicators

- **Green** = Moving towards destination
- **Red blinking** = Moving away from destination
- **Yellow** = Stationary
- **White** = No destination set

### 5.5 Speed Zone Lookahead

The app warns you before reaching speed zone changes:

- Amber border appears when approaching a speed decrease
- Shows upcoming speed limit in the circle
- Distance countdown to the sign
- GPS lag compensation improves timing

### 5.6 Community-Verified Zones

When driving through an override zone:

- Speed circle has green border
- Pulsating ✓ icon appears
- "VERIFIED" label displayed
- "Community Verified Zone" text shown

### 5.7 AfterCare Integration

When driving on a road with AfterCare signs:

- Cyan banner appears showing nearby signs
- Shows next upcoming sign with distance
- Red dot = Due for retrieval
- Yellow dot = Due for maintenance
- Tap banner to open Nearby Signs page

### 5.8 Nearby Signs Page

From the AfterCare banner or directly at `/drive/nearby-signs`:

- Shows only signs requiring action (retrieval/maintenance)
- Each sign shows:
  - Distance from current position
  - Sign type and direction
  - Status color indicator
- Actions:
  - Navigate - Open Google Maps
  - Mark Retrieved - Set status
  - Mark Due Early - Flag for early retrieval
  - Edit - Modify sign details inline
  - Delete - Remove sign
- "Open All in Google Maps" for route planning

### 5.9 Landscape Mode

When you rotate your phone to landscape:

- Automatic 2-column layout in landscape orientation
- Left column: SLK, road info
- Right column: Speed display or destination info
- Larger text for at-a-glance reading
- GPS signal indicator in compact header
- Minimalist "Exit" button in top-left corner
- Optimized for in-vehicle phone mounts

---

## 6. TC Tools

TC Tools are specialized utilities for Traffic Controllers. Access them from Settings (☰) → TC Tools section.

### 6.1 Cycle Timer

Monitor truck travel times and vehicle cycles with lap timing.

**Features:**

- Create multiple named timers (e.g., Truck 1, Truck 2)
- Quick-add presets for common vehicle labels
- Start/Stop lap timing with one tap
- View lap history with min/max/average times
- Running timers appear at top of list
- Reset individual timers or clear all

**Use Case:** Track how long trucks take to travel between two points, or monitor shuttle cycle times.

### 6.2 Traffic Counter

Count vehicles and calculate lane capacity or shuttle flow requirements.

**Setup Options:**

- **Duration:** 3, 5, 15 minutes, or custom (1-480 minutes)
- **Direction Mode:** One direction (lane capacity) or Both ways (shuttle flow)
- **Site Distance:** Distance between TC positions (for queue calculations)
- **Location:** Auto-captured via GPS

**During Count:**

- Tap to count light vehicles (left side) and heavy vehicles (right side)
- Direction toggle for counting traffic in each direction
- Live VPH (vehicles per hour) calculation
- Reference tables available for comparison

**Results Include:**

- Total vehicles, heavy vehicle percentage
- VPH calculations and lane capacity assessment
- Recommended shuttle length (for shuttle operations)
- Copy results to clipboard for sharing

**Reference Tables:** Built-in tables from AGTTM Part 2 & 3 and MRWA Code of Practice.

### 6.3 Traffic Event Logger

Log TC events with timestamps, notes, and GPS coordinates. Works offline - events queue locally and sync when connection is restored.

**Quick Event Buttons:**

- **Sent TL / Sent TR** - Log vehicle sent on True Left or True Right
- **RLR** - Log Red Light Runner with direction (TL/TR)
- **Spot Call** - Auto-captures GPS location and road ID
- **Shuttle Send** - Only visible when shuttle mode enabled

**Additional Events (via More menu):**

- Hold ON/OFF with running timer (Hold OFF logs duration, e.g., "5m 30s")
- Break ON/OFF with running timer
- Suspend/Resume operations
- Advanced Flasher controls (True Left, True Right, Both)

**Shift Actions (via Shift menu):**

- Shift start, Pre-start, Travel to site, Arrived at site
- Site setup, Wait for crew, Crew arrived, Spot for crew
- Crew departed, Pack up site, Work site debrief
- Travel to depot, Arrived at depot, Shift end

**TC Assignment System:**

- Start TC TL / Start TC TR buttons to assign TC1, TC2, or TC3
- Mutually exclusive assignments (same TC can't be assigned to both directions)
- Selected TC shown on button: "TL (TC1)" or "TR (TC2)"
- End TC Both clears all assignments and logs the end event

**Counters Display:**

- TL, TR, and Total counts in single box
- RLR and Trip Out counts
- Time interval since last sent entry (seconds)
- Time interval since last shuttle send (when shuttle mode active)

**Export Options:**

- CSV export for local backup
- Google Sheets sync when online (configurable)

### 6.4 Set Distance Tool

GPS-based distance measurement tool for measuring distances on site.

---

## 7. AfterCare - Signage Tracking

### 7.1 What is AfterCare?

AfterCare is a signage tracking system that helps Traffic Controllers manage signs placed on roads that await retrieval. It tracks what signs were placed, where, and when they need to be collected.

### 7.2 Accessing AfterCare

From the home page, open Settings (☰) and tap "AfterCare Signs" in the TC Tools section.

### 7.3 Job List Overview

Jobs are grouped by status:

| **Status**        | **Color** | **Marker** | **Meaning**                  |
| ----------------- | --------- | ---------- | ---------------------------- |
| Due for Retrieval | Red       | 🔴         | Past scheduled/standard date |
| Due Maintenance   | Yellow    | 🟡         | Maintenance interval passed  |
| TBA               | Gray      | ⏸          | Awaiting instruction         |
| Active            | Green     | 🟢         | Not yet due for retrieval    |
| Archived          | Blue      | ✓          | All signs collected          |

### 7.4 Creating a New Job

Tap "➕ New Job" and enter:

- **Job Name** - Auto-generated as "ROAD_ID - DD/MM/YYYY" (editable)
- **Road ID** - e.g., M031
- **Road Name** - Auto-filled or manual entry

### 7.5 Adding Signs

For each sign, enter:

- **SLK** - Location on road
- **Direction** - True Left (⇒) or True Right (⇐)
- **Category** - Surface, Speed, or Hazard
- **Sign Type** - Select from presets or enter custom
- **Description** - Optional notes
- **Retrieval Type**:
  - Standard (auto-flags after 2 days)
  - Scheduled (user-specified date)
  - TBA (indefinite until instructed)
  - Daily/Weekly/Monthly (maintenance schedules)

### 7.6 Capturing GPS Location

When adding a sign:

- Tap "Capture Current Location" button
- App uses GPS to auto-detect road and SLK
- Stores latitude/longitude for navigation

### 7.7 Sign Actions

Each sign has action buttons:

- **Navigate** (🧭) - Open Google Maps directions
- **Mark Retrieved** - Set status to retrieved with date
- **Mark Due Early** - Flag for early retrieval
- **Edit** (✎) - Modify sign details inline
- **Delete** - Remove sign with confirmation

### 7.8 Bulk Actions

In job edit mode:

- **Mark All Retrieved** - Set all signs to retrieved
- **Mark All Maintained** - Mark all as maintained (for maintenance jobs)
- **Open All in Google Maps** - Plan route to all signs

### 7.9 Export and Import

**Export Jobs:**

- Tap "Export" button
- All jobs displayed in JSON format
- Copy to clipboard or download file
- Use for backup or sharing

**Import Jobs:**

- Tap "Import" button
- Select JSON file
- Jobs merge with existing data

### 7.10 Print Report

- Tap "Print Report" button
- Opens HTML report in new window
- Print-friendly format
- Shows all jobs grouped by status

---

## 8. AfterCare Map - Visual Sign Locator

### 8.1 Opening the Map

From the AfterCare page, tap the "🗺️ Map" button.

### 8.2 Map Display

- Full-screen OpenStreetMap
- Colored circle markers for each sign
- Auto-centers on your signs
- Defaults to Perth if no signs with GPS coordinates

### 8.3 Filter Buttons

| **Button** | **Filter**               | **Color** |
| ---------- | ------------------------ | --------- |
| All        | Show all signs           | Gray      |
| 🔴         | Due for retrieval only   | Red       |
| 🟡         | Due for maintenance only | Yellow    |
| 🟢         | Active signs only        | Green     |

Counts shown on each button update as signs change status.

### 8.4 Marker Details

Tap any marker to see popup with:

- Road ID and SLK
- Road name
- Sign type
- Direction (True Left ⇐ / True Right ⇒)
- Description (if any)
- Status with colored indicator

### 8.5 Legend Bar

Fixed at bottom-left of map:

- 🟢 Active
- 🟡 Maintenance
- 🔴 Retrieval

### 8.6 Navigation

- **Back** - Returns to AfterCare page
- **Pinch** - Zoom in/out
- **Drag** - Pan the map
- **Tap marker** - View details

### 8.7 Tips for Using the Map

- Open once while online to cache tiles for offline use
- Use filter buttons to focus on signs needing action
- Tap markers for quick navigation setup
- Plan retrieval routes visually

---

## 9. Overrides Page - Speed Sign Corrections

### 9.1 Why Override Speed Zones?

Sometimes MRWA database doesn't match physical signs. This can happen after:

- Road works and sign relocations
- Recent speed limit changes
- Data entry errors

The override system lets you record the correct speed limits based on field observation.

### 9.2 Accessing Overrides

Navigate to `/overrides` or use the link in Settings (☰) under Speed Zone Overrides.

### 9.3 Adding a Speed Sign Override

**Required Fields:**

- **Road ID** - e.g., M031
- **Road Name** - e.g., Northam Cranbrook Rd
- **SLK** - Location of the physical sign
- **Direction** - True Left (INCREASING SLK) or True Right (DECREASING SLK)
- **Sign Type** - Single or Double sided
- **Replicated** - Is there a matching sign on the opposite side?
- **Start SLK** - Where the zone begins
- **End SLK** - Where the zone ends
- **Approach Speed** - Speed before the sign
- **Front Speed** - Speed shown on the sign face
- **Back Speed** - For double-sided signs, speed on opposite face

### 9.4 Direction Reference

| **Direction** | **Carriageway**   | **SLK Movement** |
| ------------- | ----------------- | ---------------- |
| True Left     | Left Carriageway  | INCREASING SLK   |
| True Right    | Right Carriageway | DECREASING SLK   |

### 9.5 Zone Generation Logic

| **Sign Type** | **Replicated** | **Zones Created**           |
| ------------- | -------------- | --------------------------- |
| Single        | No             | None (repeater only)        |
| Single        | Yes            | One directional zone        |
| Double        | Same speeds    | One Single carriageway zone |
| Double        | Diff speeds    | Two directional zones       |

### 9.6 Example: M031 Correction

For the M031 bidirectional zone issue at SLK 67.34-67.62:

| Field         | Value                                          |
| ------------- | ---------------------------------------------- |
| Road ID       | M031                                           |
| Direction     | True Right (button selection)                  |
| Start SLK     | 67.340                                         |
| End SLK       | 67.620                                         |
| MRWA Speed    | 90                                             |
| Correct Speed | 60                                             |
| Notes         | Double-sided sign: 60 True Right, 90 True Left |

### 9.7 Exporting Overrides

To backup or share your overrides:

- Tap "Export" button
- Data appears in a text area
- Tap "Copy to Clipboard"
- Paste into notes, email, or save as file

### 9.8 Importing Overrides

To restore overrides from a backup:

- Tap "Import" button
- Select a JSON file
- Overrides are merged with existing data

---

## 10. Calibrate Page - GPS Lag Measurement

### 10.1 What is GPS Lag?

GPS reports your position with a slight delay. This delay (typically 1-3 seconds) affects the accuracy of speed zone lookahead warnings. The calibration tool measures this delay so the app can compensate.

### 10.2 How to Calibrate

**Step 1: Set Target (Stationary)**

- Stand at a known location (e.g., a speed sign)
- Note the SLK of this location
- Tap "SET TARGET" while stationary

**Step 2: Mark Pass (Moving)**

- Drive past the same location
- When you pass the sign, tap "MARK PASS" immediately
- Drive at normal speed for accurate measurement

**Step 3: Calculate and Apply**

- The app calculates lag based on SLK difference
- Tap "APPLY" to save to GPS settings
- Lag compensation improves speed zone warnings

### 10.3 When to Recalibrate

- If speed warnings seem early or late
- After changing phones
- Different vehicles may have different GPS receivers
- Typical lag is 1-3 seconds

---

## 11. Library Page - Documentation & Resources

### 11.1 Overview

The Library page provides access to documentation, user guides, and reference materials for the TC Work Zone Locator application.

### 11.2 Accessing the Library

Navigate to `/library` or use the link in Settings.

### 11.3 Document Categories

| **Category** | **Contents**                          |
| ------------ | ------------------------------------- |
| Manuals      | User manual, quick reference guides   |
| Technical    | Architecture docs, API references     |
| Data         | Data dictionary, source documentation |
| Forms        | Work zone report templates            |

### 11.4 Using the Library

- **Search**: Full-text search across all documents
- **Filter**: Filter by category using tabs
- **Sort**: Sort by name or last updated date
- **View**: Click any document to view or download

### 11.5 Document Actions

- View document in browser
- Download as PDF (if available)
- Share link to document

---

## 12. Traffic Counter - Vehicle Counting

### 12.1 Overview

The Traffic Counter tool helps with vehicle counting for traffic studies, lane capacity assessments, and shuttle flow operations. It provides real-time calculations for vehicles per hour (VPH), heavy vehicle percentage, lane capacity estimates, and queue length predictions.

### 12.2 Accessing the Traffic Counter

Navigate to `/traffic-counter` from the Settings menu or home page.

### 12.3 Setup Page

Before starting a count, configure the following options:

#### Duration Selection

| **Option** | **Description**                      |
| ---------- | ------------------------------------ |
| 3m         | Quick estimate (minimum recommended) |
| 5m         | Standard count duration              |
| 15m        | Busy roads / accurate data           |
| Custom     | Enter 1-480 minutes (8 hours max)    |

- Tap preset buttons (3m, 5m, 15m) to select
- Enter custom value and tap "Set" for other durations
- Custom duration shows highlighted button (e.g., "160m ✓") when active
- Tap custom button again to return to preset selection

#### Direction Mode

| **Mode**      | **Use Case**                                       |
| ------------- | -------------------------------------------------- |
| One Direction | Count one direction for lane capacity calculations |
| Both Ways     | Count both directions for shuttle flow operations  |

- One Direction: Only True Left counters are active
- Both Ways: Both True Left and True Right counters available

#### Location

- Tap "📍 GPS" button to fetch current location
- Location auto-fetches if not set when "Start Counting" is pressed
- Shows road ID, road name, SLK, and region
- If GPS fails, count proceeds without location

#### Notes (Optional)

- Add notes about conditions (e.g., "Peak hour", "Roadworks nearby")
- Notes are saved with the count record

### 12.4 Counting Page

#### Timer Display

- Large circular progress ring shows time remaining
- Red pulsing ring during first 3 minutes (minimum required)
- Green ring after 3 minutes (can save)
- Amber ring when < 60 seconds remaining
- Red ring when < 30 seconds remaining

#### Counter Buttons

Each direction has two counters:

| **Button** | **Vehicle Type**                      |
| ---------- | ------------------------------------- |
| 🚗 Light   | Cars, motorcycles, light vehicles     |
| 🚛 Heavy   | Trucks, buses, heavy vehicles (>4.5t) |

- Tap +1 to increment count
- Tap − to decrement (correct mistakes)
- Total shown below each counter

#### Direction Labels

| **Label**    | **Description**                                   |
| ------------ | ------------------------------------------------- |
| ← True Left  | Vehicles traveling in direction of increasing SLK |
| True Right → | Vehicles traveling in direction of decreasing SLK |

#### Live Statistics

During counting, see real-time calculations:

| **Stat** | **Description**                  |
| -------- | -------------------------------- |
| Total    | Total vehicles counted           |
| Heavy %  | Percentage of heavy vehicles     |
| VPH      | Vehicles per hour (extrapolated) |
| Lanes    | Estimated lanes needed           |
| Queue    | Estimated queue length (meters)  |

#### Quick Reference Panel

- **Shuttle Max**: Maximum shuttle flow length for current VPH
- **Queue Length**: Based on stopping time and VPH
- **Heavy Vehicle Warning**: If >10%, lane capacity is adjusted +20%

### 12.5 Stopping Early

- Tap "⏹ Stop" to end count before timer completes
- Confirmation dialog shows if under 3 minutes
- Actual elapsed time is recorded (not planned duration)
- Counts under 3 minutes cannot be saved

### 12.6 Completion Screen

When count completes (or stopped):

| **Action** | **Description**        |
| ---------- | ---------------------- |
| 💾 Save    | Save record to history |
| 🔄 Reset   | Return to setup page   |
| ✕ Cancel   | Discard count          |

Completion screen shows:

- Location details
- Actual duration (vs planned if different)
- Total vehicles and heavy percentage
- VPH and lane capacity estimate
- Queue length calculation
- Shuttle max length (for both-ways mode)

### 12.7 Reference Tables

Tap "📖 Ref" button to view reference tables:

#### Lane Capacity (One Direction)

Source: AGTTM Part 2, Table 3.1

| Mid-Block VPH | Near Intersection VPH | Lanes |
| ------------- | --------------------- | ----- |
| 1000          | 800                   | 1     |
| 2000          | 1600                  | 2     |
| 3000          | 2400                  | 3     |
| 4000          | 3200                  | 4     |

#### Shuttle Flow (Both Directions)

Source: AGTTM Part 2, Table 3.5 & MRWA COP Table 15

| VPH     | Max Shuttle Length |
| ------- | ------------------ |
| 0-200   | 2200m\*            |
| 201-250 | 1200m\*            |
| 251-300 | 800m\*             |
| 301-350 | 600m               |
| 351-400 | 400m               |
| 401-500 | 250m               |
| 501-600 | 150m               |
| 601-700 | 100m               |
| 701+    | 70m                |

\*Requires risk assessment

### 12.8 History

Tap "📜 (X)" button to view saved counts:

| **Action** | **Description**                 |
| ---------- | ------------------------------- |
| 📋 Copy    | Copy record text to clipboard   |
| 🗑️ Delete  | Delete individual record        |
| 📤 Export  | Export all history to clipboard |
| 🗑️ Clear   | Clear all history               |

History shows:

- Road ID and name
- SLK location
- Duration and direction mode
- Total vehicles, heavy %, VPH

### 12.9 Minimum Requirements

- **Minimum Duration**: 3 minutes required to save
- **GPS**: Optional but recommended
- **Internet**: Required for GPS location lookup (road details)
- **Offline**: Counting works offline once page loaded

### 12.10 Tips for Accurate Counts

1. **Duration**: Longer counts = more accurate VPH estimates
2. **Peak Hours**: Note time period in notes field
3. **Heavy Vehicles**: Count anything >4.5 tonnes as heavy
4. **Consistency**: Use same direction labels throughout
5. **Location**: Always capture GPS for reference

---

## 13. Q&A Assistant - AI Help

### 13.1 Overview

The Q&A Assistant uses AI to help answer questions about the application and traffic control procedures. It searches through uploaded documents to find relevant information.

### 13.2 Accessing Q&A

Navigate to `/qa` from the Settings menu or Library page.

### 13.3 Asking Questions

1. Enter your question in the text field
2. Select relevant documents (optional)
3. Press Enter or click "Ask"
4. View the AI-generated answer

### 13.4 Document Selection

- Documents are grouped by category
- Click to select/deselect documents
- Use "Select All" to search all documents
- Use "Clear" to deselect all

### 13.5 Saving Answers

- Click "Save" to store the Q&A for later reference
- Add optional category labels
- Access saved Q&A through the History view

### 13.6 History Features

- View all saved Q&A entries
- Mark entries as favorites (⭐)
- Search through history
- Filter by All/Favorites
- Delete individual entries
- Export/Import history

---

## 14. Settings

Access settings by tapping the ☰ (hamburger) icon in the header. A bottom sheet drawer slides up from the bottom.

### 14.1 Settings Sections

| **Section**          | **Contents**                             |
| -------------------- | ---------------------------------------- |
| About                | App info, contact, user manual link      |
| Admin Data Sync      | MRWA sync options, data status           |
| GPS & Tracking       | EKF settings, speed display, calibration |
| Offline Data         | Download/clear data, offline toggles     |
| Preferences          | Default region, wind gust threshold      |
| Speed Zone Overrides | Override management link                 |
| TC Tools             | AfterCare, Set Distance links            |

### 14.2 GPS Settings

| **Setting**          | **Default** | **Description**                |
| -------------------- | ----------- | ------------------------------ |
| EKF Filtering        | On          | Kalman filter for smoother GPS |
| Road Constraint      | On          | Snap predictions to road       |
| Max Prediction Time  | 30s         | GPS outage prediction limit    |
| Show Uncertainty     | On          | Display ±Xm accuracy           |
| Early Warnings       | On          | Alert earlier at higher speeds |
| Speed Lookahead      | 5s          | Lookahead time for warnings    |
| GPS Lag Compensation | 0s          | Measured lag offset            |

### 14.3 Wind Gust Alert

Set threshold for wind gust warnings. Options: 40, 50, 60, 80 km/h. Default is 60 km/h.

Alert shows when gusts exceed threshold - important for traffic control device safety.

### 14.4 Speeding Alert Settings

| **Setting**         | **Default** | **Description**               |
| ------------------- | ----------- | ----------------------------- |
| Show Speeding Alert | On          | Display warning when speeding |
| Show WA Fines       | On          | Display WA fine information   |
| Alert Threshold     | 5 km/h      | km/h over limit to trigger    |

### 14.5 Offline Data

**Download Data:**

Downloads all road data to your device. Required before offline use.

**Clear Data:**

Removes all offline data. Use if you want to re-download fresh data.

**Offline Toggles:**

Six toggles to switch between online API and offline IndexedDB data:

- Roads List
- Work Zone Lookup
- Speed Zones
- Rail Crossings
- Regulatory Signs
- Warning Signs

### 14.6 TC Tools

Quick access to:

- **AfterCare Signs** - Signage tracking page
- **Set Distance** - GPS distance measurement tool

---

## 15. Troubleshooting

### 15.1 App Shows Wrong Road

If GPS is detecting the wrong road:

- Make sure offline data is downloaded
- Check GPS accuracy - low confidence indicates poor signal
- Try clearing and re-downloading data
- For local roads, use manual entry instead of GPS

### 15.2 Speed Limit Incorrect

If speed limit doesn't match physical signs:

- MRWA data may be outdated
- Add an override in the Overrides page
- Record the physical sign details
- Override will take precedence over MRWA data

### 15.3 GPS Not Working

If GPS tracking won't start:

- Check location permissions in browser settings
- Make sure you're not in a building or underground
- Wait for GPS signal (can take 30+ seconds)
- Try refreshing the page

### 15.4 Data Won't Download

If download fails:

- Check your internet connection
- Clear browser cache and try again
- Try a different browser
- Check available storage on device

### 15.5 App Slow or Unresponsive

If app is running slowly:

- Close other browser tabs
- Clear browser cache
- Restart the browser
- Check device storage

### 15.6 Speed Warnings Too Early/Late

If lookahead timing seems off:

- Use the Calibrate page to measure GPS lag
- Apply the measured lag compensation
- Recalibrate if you change devices

### 15.7 AfterCare Signs Not Showing on Map

If signs don't appear on the map:

- Signs need GPS coordinates to show on map
- Edit sign and tap "Capture Current Location"
- Or the sign will auto-fetch coordinates when road_id + SLK is known
- Check that signs have lat/lon values

### 15.8 Map Tiles Not Loading Offline

If map doesn't work offline:

- Open the AfterCare map once while online
- This caches the OpenStreetMap tiles
- Tiles for your area will be available offline

---

## 16. Quick Reference

### 16.1 Direction Terminology

| **Term**   | **Meaning**       | **SLK Direction** |
| ---------- | ----------------- | ----------------- |
| True Left  | Left Carriageway  | INCREASING SLK    |
| True Right | Right Carriageway | DECREASING SLK    |

### 16.2 Status Colors

| **Color**        | **Meaning**                                         |
| ---------------- | --------------------------------------------------- |
| Green text       | At/below speed limit, moving towards destination    |
| Red text         | Exceeding speed limit, moving away from destination |
| Yellow text      | Stationary                                          |
| White text       | No destination set                                  |
| Amber border     | Speed decrease ahead                                |
| Green border + ✓ | In override zone                                    |

### 16.3 AfterCare Status Colors

| **Status**      | **Color** | **Marker** |
| --------------- | --------- | ---------- |
| Active          | Green     | 🟢         |
| Due Maintenance | Yellow    | 🟡         |
| Due Retrieval   | Red       | 🔴         |
| Retrieved       | Blue      | ✓          |
| TBA             | Gray      | ⏸          |

### 16.4 EKF Confidence Indicators

| **Symbol**     | **Confidence**         |
| -------------- | ---------------------- |
| ◉ Green dot    | High accuracy          |
| ◐ Yellow dot   | Medium accuracy        |
| ◔ Orange dot   | Low accuracy           |
| ◇ Cyan diamond | Predicted (GPS outage) |

### 16.5 Key Distances

| **Feature**          | **Distance**          |
| -------------------- | --------------------- |
| TC Positions         | ±100m from work zone  |
| Signage Corridor     | ±700m from work zone  |
| Intersection Display | ±1100m from work zone |
| Speed Sign Detection | ±700m from work zone  |

### 16.6 Offline Data Summary

| **Data Type** | **Count**      |
| ------------- | -------------- |
| Roads         | 69,000+        |
| Speed Zones   | 69,000+        |
| Regions       | 8 MRWA regions |

### 16.7 Keyboard Shortcuts (Desktop)

When using on a computer:

- **Enter** - Submit form / Start search
- **Tab** - Move between fields
- **Escape** - Close dialogs

---

## Appendix: Glossary

**SLK (Straight Line Kilometre)**

A linear reference system used to identify locations along a road. SLK values increase from one end of the road to the other.

**True Left / True Right**

Direction terminology for Western Australian roads. True Left = traffic travelling INCREASING SLK. True Right = traffic travelling DECREASING SLK.

**EKF (Extended Kalman Filter)**

An algorithm that smooths GPS position data for more accurate tracking, especially useful during GPS signal fluctuations.

**AfterCare**

A system for tracking signage placed on roads that awaits retrieval or requires maintenance.

**Override**

A user-recorded correction to MRWA speed zone data, based on physical sign observation.

**IndexedDB**

Browser database that stores road data locally on your device for offline access.

**localStorage**

Browser storage for user preferences, speed sign overrides, and AfterCare jobs.

**MRWA**

Main Roads Western Australia - the government authority that manages WA roads and provides road data.

**PWA (Progressive Web App)**

A web application that can be installed on your device and works offline.
