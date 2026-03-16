**TC Work Zone Locator**

**User Manual**

Version RC 1.6.0

March 12, 2026

*For Traffic Controllers in Western Australia*

https://github.com/instructor-ship-it/roadfinder

---

## Table of Contents

1. Introduction
2. Getting Started
3. Offline Capability
4. Home Page - Work Zone Lookup
5. Drive Page - GPS Tracking
6. AfterCare - Signage Tracking
7. AfterCare Map - Visual Sign Locator
8. Overrides Page - Speed Sign Corrections
9. Calibrate Page - GPS Lag Measurement
10. Settings
11. Troubleshooting
12. Quick Reference

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

- Version number (e.g., vRC 1.6.0)
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

| **Feature** | **Storage** | **Offline?** |
|-------------|-------------|--------------|
| Work Zone Lookup | IndexedDB | ✅ Yes |
| GPS Tracking | Device + IndexedDB | ✅ Yes |
| SLK Position | Computed locally | ✅ Yes |
| Speed Zones | IndexedDB + localStorage | ✅ Yes |
| Speed Sign Overrides | localStorage | ✅ Yes |
| AfterCare Jobs | localStorage | ✅ Yes |
| AfterCare Map | OpenStreetMap tiles* | ✅ Yes |
| Signage Corridor | IndexedDB | ✅ Yes |
| TC Position Calculation | Computed locally | ✅ Yes |
| Direction Detection | Computed from GPS | ✅ Yes |
| Google Maps Links | Generated URLs | ✅ Yes |
| Set Distance Tool | Device GPS | ✅ Yes |

*Map tiles are cached after first view

### 3.3 What Requires Internet

| **Feature** | **Source** | **Offline?** |
|-------------|------------|--------------|
| Weather Data | Open-Meteo API | ❌ No |
| BOM Weather Warnings | RSS Feed | ❌ No |
| Nearby Amenities | Overpass API | ❌ No |
| Traffic Volume | MRWA API | ❌ No |
| Street View Images | Google Maps | ❌ No |

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

- White arrows (↑) = Traffic moving INCREASING SLK
- Yellow arrows (↓) = Traffic moving DECREASING SLK
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

- Intersections within ±100m
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
- BOM weather warnings if active

**Amenities (requires internet):**

- Nearest hospital
- Nearest fuel station
- Nearest public toilet

### 4.6 TC Tools Section

In Settings (☰), you'll find TC Tools:

- **AfterCare Signs** - Track signage awaiting retrieval
- **Set Distance** - GPS-based distance measurement tool
- **Export Work Zone Info** - Generate text report

---

## 5. Drive Page - GPS Tracking

### 5.1 Overview

The drive page provides real-time GPS tracking with SLK position, speed limit display, and advance warning of speed zone changes.

### 5.2 Starting GPS Tracking

- From home page, tap the tracking icon (📍) next to your work zone
- Or tap "Start SLK Tracking" button
- Grant location permission if prompted
- The page will automatically start tracking

### 5.3 Understanding the Display

**Speed Circle:**

- Green = At or below speed limit
- Red = Exceeding speed limit
- Amber border = Speed decrease ahead
- Green border + pulsing ✓ = Community-verified zone

**Current Speed:**

Large green numbers show your current speed. Turns red when speeding.

**EKF Status:**

- Green dot ● = High confidence
- Yellow dot ◐ = Medium confidence
- Orange dot ○ = Low confidence
- Cyan diamond ◈ = Predicted position (GPS outage)

### 5.4 Current Location Section

- Road ID (green text)
- Road Name (white text)
- SLK with direction indicator ↑↓ (yellow text)
- Road Type (State Road/Local Road)

### 5.5 Direction Indicators

- **Green** = Moving towards destination
- **Red blinking** = Moving away from destination
- **Yellow** = Stationary
- **White** = No destination set

### 5.6 Speed Zone Lookahead

The app warns you before reaching speed zone changes:

- Amber border appears when approaching a speed decrease
- Shows upcoming speed limit in the circle
- Distance countdown to the sign
- GPS lag compensation improves timing

### 5.7 Community-Verified Zones

When driving through an override zone:

- Speed circle has green border
- Pulsating ✓ icon appears
- "VERIFIED" label displayed
- "Community Verified Zone" text shown

### 5.8 AfterCare Integration

When driving on a road with AfterCare signs:

- Cyan banner appears showing nearby signs
- Shows next upcoming sign with distance
- Red dot = Due for retrieval
- Yellow dot = Due for maintenance
- Tap banner to open Nearby Signs page

### 5.9 Nearby Signs Page

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
  - Edit - Modify sign details
  - Delete - Remove sign
- "Open All in Google Maps" for route planning

### 5.10 Landscape Mode

When you rotate your phone to landscape:

- Automatic 2-column layout
- Left column: SLK and road info
- Right column: Speed display or destination info
- Larger text for at-a-glance reading
- GPS signal indicator in compact header
- Optimized for in-vehicle phone mounts

---

## 6. AfterCare - Signage Tracking

### 6.1 What is AfterCare?

AfterCare is a signage tracking system that helps Traffic Controllers manage signs placed on roads awaiting retrieval. It tracks what signs were placed, where, and when they need to be collected.

### 6.2 Accessing AfterCare

From the home page, open Settings (☰) and tap "AfterCare Signs" in the TC Tools section.

### 6.3 Job List Overview

Jobs are grouped by status:

| **Status** | **Color** | **Marker** | **Meaning** |
|------------|-----------|------------|-------------|
| Due for Retrieval | Red | 🔴 | Past scheduled/standard date |
| Due for Maintenance | Yellow | 🟡 | Maintenance interval passed |
| TBA | Gray | ⚪ | Awaiting instruction |
| Active | Green | 🟢 | Not yet due |
| Archived | Blue | ✓ | All signs collected |

### 6.4 Creating a New Job

Tap "➕ New Job" and enter:

- **Job Name** - Auto-generated as "ROAD_ID - DD/MM/YYYY" (editable)
- **Road ID** - e.g., M031
- **Road Name** - Auto-filled or manual entry

### 6.5 Adding Signs

For each sign, enter:

- **SLK** - Location on road
- **Direction** - True Left (↑) or True Right (↓)
- **Category** - Surface, Speed, or Hazard
- **Sign Type** - Select from presets or enter custom
- **Description** - Optional notes
- **Retrieval Type**:
  - Standard (auto-flags after 2 days)
  - Scheduled (user-specified date)
  - TBA (indefinite until marked)
  - Daily/Weekly/Monthly (maintenance schedules)

### 6.6 Capturing GPS Location

When adding a sign:

- Tap "Capture Current Location" button
- App uses GPS to auto-detect road and SLK
- Stores latitude/longitude for navigation

### 6.7 Sign Actions

Each sign has action buttons:

- **Navigate** (🧭) - Open Google Maps directions
- **Mark Retrieved** - Set status to retrieved with date
- **Mark Due Early** - Flag for early retrieval
- **Edit** (✏️) - Modify sign details inline
- **Delete** - Remove sign with confirmation

### 6.8 Bulk Actions

In job edit mode:

- **Mark All Retrieved** - Set all signs to retrieved
- **Mark All Maintained** - Mark all as maintained (for maintenance jobs)
- **Open All in Google Maps** - Plan route to all signs

### 6.9 Export and Import

**Export Jobs:**

- Tap "Export" button
- All jobs displayed in JSON format
- Copy to clipboard or download file
- Use for backup or sharing

**Import Jobs:**

- Tap "Import" button
- Select JSON file
- Jobs merge with existing data

### 6.10 Print Report

- Tap "Print Report" button
- Opens HTML report in new window
- Print-friendly format
- Shows all jobs grouped by status

---

## 7. AfterCare Map - Visual Sign Locator

### 7.1 Overview

The AfterCare Map provides a full-screen map view of all your signs with colored pins indicating status.

### 7.2 Opening the Map

From the AfterCare page, tap the "📍 Map" button.

### 7.3 Map Display

- Full-screen OpenStreetMap
- Colored circle markers for each sign
- Auto-centers on your signs
- Defaults to Perth if no signs with GPS coordinates

### 7.4 Filter Buttons

| **Button** | **Filter** | **Color** |
|------------|------------|-----------|
| All | Show all signs | Gray |
| 🔴 | Due for retrieval only | Red |
| 🟡 | Due for maintenance only | Yellow |
| 🟢 | Active signs only | Green |

Counts shown on each button update as signs change status.

### 7.5 Marker Details

Tap any marker to see popup with:

- Road ID and SLK
- Road name
- Sign type
- Direction (True Left ↑ / True Right ↓)
- Description (if any)
- Status with colored indicator

### 7.6 Legend Bar

Fixed at bottom-left of map:

- 🟢 Active
- 🟡 Maintenance
- 🔴 Retrieval

### 7.7 Navigation

- **Back** - Returns to AfterCare page
- **Pinch** - Zoom in/out
- **Drag** - Pan the map
- **Tap marker** - View details

### 7.8 Tips for Using the Map

- Open once while online to cache map tiles for offline use
- Use filter buttons to focus on signs needing action
- Plan your retrieval route by viewing sign locations
- Tap markers for quick access to sign details

---

## 8. Overrides Page - Speed Sign Corrections

### 8.1 Why Override Speed Zones?

Sometimes MRWA database doesn't match physical signs. This can happen after:

- Road works and sign relocations
- Recent speed limit changes
- Data entry errors

The override system lets you record the correct speed limits based on field observation.

### 8.2 Accessing Overrides

Navigate to `/overrides` or use the link in Settings (☰) under Speed Zone Overrides.

### 8.3 Adding a Speed Sign Override

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

### 8.4 Direction Reference

| **Direction** | **Carriageway** | **SLK Movement** |
|---------------|-----------------|------------------|
| True Left | Left Carriageway | INCREASING SLK |
| True Right | Right Carriageway | DECREASING SLK |

### 8.5 Zone Generation Logic

| **Sign Type** | **Replicated** | **Zones Created** |
|---------------|----------------|-------------------|
| Single | No | None (repeater only) |
| Single | Yes | One directional zone |
| Double | Same speeds | One Single carriageway zone |
| Double | Diff speeds | Two directional zones |

### 8.6 Exporting Overrides

To backup or share your overrides:

- Tap "Export" button
- Data appears in a text area
- Tap "Copy to Clipboard"
- Paste into notes, email, or save as file

### 8.7 Importing Overrides

To restore overrides from a backup:

- Tap "Import" button
- Select a JSON file
- Overrides are merged with existing data

---

## 9. Calibrate Page - GPS Lag Measurement

### 9.1 What is GPS Lag?

GPS reports your position with a slight delay. This delay (typically 1-3 seconds) affects the accuracy of speed zone lookahead warnings. The calibration tool measures this delay so the app can compensate.

### 9.2 How to Calibrate

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

### 9.3 When to Recalibrate

- If speed warnings seem early or late
- After changing phones
- Different vehicles may have different GPS receivers
- Typical lag is 1-3 seconds

---

## 10. Settings

Access settings by tapping the ☰ (hamburger) icon in the header. A bottom sheet drawer slides up from the bottom.

### 10.1 Settings Sections (Alphabetical)

| **Section** | **Contents** |
|-------------|--------------|
| About | App info, contact, user manual link |
| Admin Data Sync | MRWA sync options, data status |
| GPS & Tracking | EKF settings, speed display, calibration |
| Offline Data | Download/clear data, offline toggles |
| Preferences | Default region, wind gust threshold |
| Speed Zone Overrides | Override management link |
| TC Tools | AfterCare, Set Distance links |

### 10.2 GPS Settings

| **Setting** | **Default** | **Description** |
|-------------|-------------|-----------------|
| EKF Filtering | On | Kalman filter for smoother GPS |
| Road Constraint | On | Snap predictions to road |
| Max Prediction Time | 30s | GPS outage prediction limit |
| Show Uncertainty | On | Display ±Xm accuracy |
| Early Warnings | On | Alert earlier at higher speeds |
| Speed Lookahead | 5s | Lookahead time for warnings |
| GPS Lag Compensation | 0s | Measured lag offset |
| Speed Display | Off | Show current speed during tracking |
| AfterCare on Drive | On | Show AfterCare banner on drive page |
| AfterCare Lookahead | 5km | Distance to show nearby signs |

### 10.3 Wind Gust Alert

Set threshold for wind gust warnings. Options: 40, 50, 60, 80 km/h. Default is 60 km/h.

Alert shows when gusts exceed threshold - important for traffic control device safety.

### 10.4 Offline Data

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

### 10.5 TC Tools

Quick access to:

- **AfterCare Signs** - Signage tracking page
- **Set Distance** - GPS distance measurement tool

---

## 11. Troubleshooting

### 11.1 App Shows Wrong Road

If GPS is detecting the wrong road:

- Make sure offline data is downloaded
- Check GPS accuracy - low confidence indicates poor signal
- Try clearing and re-downloading data
- For local roads, use manual entry instead of GPS

### 11.2 Speed Limit Incorrect

If speed limit doesn't match physical signs:

- MRWA data may be outdated
- Add an override in the Overrides page
- Record the physical sign details
- Override will take precedence over MRWA data

### 11.3 GPS Not Working

If GPS tracking won't start:

- Check location permissions in browser settings
- Make sure you're not in a building or underground
- Wait for GPS signal (can take 30+ seconds)
- Try refreshing the page

### 11.4 Data Won't Download

If download fails:

- Check your internet connection
- Clear browser cache and try again
- Try a different browser
- Check available storage on device

### 11.5 App Slow or Unresponsive

If app is running slowly:

- Close other browser tabs
- Clear browser cache
- Restart the browser
- Check device storage

### 11.6 Speed Warnings Too Early/Late

If lookahead timing seems off:

- Use the Calibrate page to measure GPS lag
- Apply the measured lag compensation
- Recalibrate if you change devices

### 11.7 AfterCare Signs Not Showing on Map

If signs don't appear on the map:

- Signs need GPS coordinates to show on map
- Edit sign and tap "Capture Current Location"
- Or the sign will auto-fetch coordinates when road_id + SLK is known
- Check that signs have lat/lon values

### 11.8 Map Tiles Not Loading Offline

If map doesn't work offline:

- Open the AfterCare map once while online
- This caches the OpenStreetMap tiles
- Tiles for your area will be available offline

---

## 12. Quick Reference

### 12.1 Direction Terminology

| **Term** | **Meaning** | **SLK Direction** |
|----------|-------------|-------------------|
| True Left | Left Carriageway | INCREASING SLK |
| True Right | Right Carriageway | DECREASING SLK |

### 12.2 Status Colors

| **Color** | **Meaning** |
|-----------|-------------|
| Green text | At/below speed limit, moving towards destination |
| Red text | Exceeding speed limit, moving away from destination |
| Yellow text | Stationary |
| White text | No destination set |
| Amber border | Speed decrease ahead |
| Green border + ✓ | Community-verified override zone |

### 12.3 AfterCare Status Colors

| **Status** | **Color** | **Marker** |
|------------|-----------|------------|
| Active | Green | 🟢 |
| Due Maintenance | Yellow | 🟡 |
| Due Retrieval | Red | 🔴 |
| Retrieved | Blue | ✓ |
| TBA | Gray | ⚪ |

### 12.4 EKF Confidence Indicators

| **Symbol** | **Confidence** |
|------------|----------------|
| ● Green dot | High accuracy |
| ◐ Yellow dot | Medium accuracy |
| ○ Orange dot | Low accuracy |
| ◈ Cyan diamond | Predicted position (GPS outage) |

### 12.5 Key Distances

| **Feature** | **Distance** |
|-------------|--------------|
| TC Positions | ±100m from work zone |
| Signage Corridor | ±700m from work zone |
| Intersection Display | ±100m from work zone |
| Speed Sign Detection | ±700m from work zone |

### 12.6 Offline Data Summary

| **Data Type** | **Count** |
|---------------|-----------|
| Roads | 69,000+ |
| Speed Zones | 69,000+ |
| Regions | 8 MRWA regions |

### 12.7 Keyboard Shortcuts (Desktop)

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

A web application that can be installed on your device and works offline, similar to a native app.
