# TC Work Zone Locator - RC 1.9.1 Test Checklist

## Pre-Test Setup

- [ ] Clone repository: `git clone https://github.com/instructor-ship-it/roadfinder.git`
- [ ] Install dependencies: `bun install`
- [ ] Start dev server: `bun run dev`
- [ ] Open http://localhost:3000
- [ ] Click ⚙️ Settings icon
- [ ] Click "Download Data" and wait for completion (69K roads)

---

## Home Page Tests

### Region Selection
- [ ] Region dropdown shows all 8 MRWA regions
- [ ] "Local" option appears first with amber color
- [ ] Selecting a region populates the Road ID dropdown
- [ ] Default region setting persists after page reload

### Road Selection - State Roads
- [ ] Road ID dropdown is searchable
- [ ] Shows road_id in blue and road_name in white
- [ ] Shows "Valid SLK: X.XX – Y.YY km" hint
- [ ] Roads from selected region only are shown

### Road Selection - Local Roads
- [ ] Selecting "Local" shows text input field
- [ ] Can manually type any road ID
- [ ] GPS lookup still works and auto-fills the field

### SLK Input
- [ ] Start SLK accepts decimal values (e.g., 100.50)
- [ ] End SLK accepts decimal values
- [ ] "Leave End SLK blank for single point lookup" hint shows

### Search Function
- [ ] "Get Work Zone Info" button disabled until road selected
- [ ] Search shows loading indicator
- [ ] Error message shown if SLK out of range

---

## Results Display Tests

### Work Zone Summary Section
- [ ] Road name displayed prominently
- [ ] Road ID with network type badge
- [ ] Start/End SLK shown in two columns
- [ ] Zone Length and Carriageway shown
- [ ] Lane count shown (from MRWA Layer 12)
- [ ] Road Width shown in meters
- [ ] Three action buttons (Maps/Street View/Track) under title, above road name
- [ ] Buttons are evenly spaced (flex justify-between)
- [ ] Button height is h-8 (compact)
- [ ] Button text is small (text-sm)
- [ ] Maps button opens Google Maps
- [ ] Street View button opens Street View
- [ ] Track button navigates to /drive page

### Lane Direction Diagram
- [ ] Shows when pavement data has lane count
- [ ] Each lane shown as dark grey block with colored arrow
- [ ] White arrows (⇒) = INCREASING SLK
- [ ] Yellow arrows (⇐) = DECREASING SLK
- [ ] Single carriageway: even split shown
- [ ] Left carriageway: all lanes ⇒ (white)
- [ ] Right carriageway: all lanes ⇐ (yellow)
- [ ] Odd lane count shows warning "allocation uncertain"
- [ ] Legend shows lane count per direction

### Road Width Breakdown
- [ ] Visual bar shows road width components
- [ ] Unsealed shoulders in amber
- [ ] Sealed shoulders in gray
- [ ] Trafficable (lanes) in blue
- [ ] Total width label shown
- [ ] Legend shows each component width

### Traffic Volume Section
- [ ] Collapsible (click header to expand/collapse)
- [ ] AADT displayed with "vehicles/day" label
- [ ] Peak Hour (est.) displayed
- [ ] Heavy Vehicle % displayed
- [ ] Data Year shown
- [ ] "Nearest count site: X km" shown if location provided
- [ ] Other nearby count sites listed

### Signage Corridor Section
- [ ] Collapsible
- [ ] Corridor bounds shown (±700m)
- [ ] INTERSECTIONS show only within ±1100m of work zone
- [ ] SPEED RESTRICTION SIGNS listed with:
  - [ ] "COVER REQUIRED" in red for signs near intersections
  - [ ] Warning about distance from intersection
- [ ] WARNING SIGNS listed (curves, advisory speeds)
- [ ] Total items and "Signs requiring cover" summary
- [ ] NO Regulatory Signs section (removed in RC 1.0)

### TC Positions Section
- [ ] Collapsible
- [ ] TC Start SLK shown (work zone start - 0.1 km)
- [ ] TC End SLK shown (work zone end + 0.1 km)
- [ ] Two small icon buttons per position
- [ ] Map button opens Google Maps navigation
- [ ] Home button opens Street View
- [ ] NO coordinates displayed (removed in RC 1.0)

### Weather Section
- [ ] Collapsible
- [ ] Location name from reverse geocoding
- [ ] Sunrise/Sunset times in 12-hour format
- [ ] Daylight hours duration
- [ ] UV Index with level description (Low/Moderate/High/Very High/Extreme)
- [ ] Current conditions: Temp, Condition, Wind, Gusts, Humidity
- [ ] Wind gusts highlighted amber if > threshold
- [ ] 8-hour forecast table
- [ ] BOM Radar link opens in new tab
- [ ] BOM Warnings link opens in new tab
- [ ] Weather warnings badge in header if warnings active
- [ ] Warning cards with clickable links

### Amenities Section
- [ ] Collapsible
- [ ] Hospital shown with:
  - [ ] Red hospital icon and name
  - [ ] "Emergency" badge if applicable
  - [ ] Phone number if available
  - [ ] Distance in km
  - [ ] Two small icon buttons (Navigate/Street View)
- [ ] Fuel Station shown with:
  - [ ] Yellow gas icon
  - [ ] Distance
  - [ ] Two small icon buttons
- [ ] Public Toilet shown with:
  - [ ] Blue toilet icon
  - [ ] Distance
  - [ ] Two small icon buttons

### Reset Button
- [ ] "Reset Work Zone Info" button appears after search
- [ ] Clicking it clears results and shows input form

---

## GPS Location Tests

### GPS Lookup
- [ ] "Find by GPS Location" section expands on click
- [ ] "Get My Location" button requests permission
- [ ] Location fetched and coordinates shown
- [ ] Road ID auto-filled if match found
- [ ] SLK auto-filled if match found
- [ ] Manual coordinate entry works

---

## SLK Tracking Tests (/drive)

### Page Load
- [ ] Version shows "RC 1.9.1"
- [ ] "EKF Filtering Active" shows in purple
- [ ] "Offline Ready" shows in green if data downloaded

### Tracking Controls
- [ ] "Start SLK Tracking" button is dark blue (bg-blue-800)
- [ ] Click starts GPS tracking
- [ ] Status shows "Active" with green dot
- [ ] "Back to Work Zone Locator" button is dark blue (bg-blue-800)
- [ ] Clicking back stops tracking and returns home

### Speed Display
- [ ] Current speed shown in large green text
- [ ] Speed turns red when over limit
- [ ] Speed limit shown in black circle
- [ ] Circle border amber if approaching speed decrease
- [ ] Circle border white for current speed or speed increase
- [ ] Circle border GREEN + pulsing ✓ in override zone
- [ ] EKF status indicator shows:
  - [ ] Confidence dot (green/yellow/orange/cyan)
  - [ ] "High/Medium/Low/Predicted Confidence" text
  - [ ] "±X.XXXm accuracy" text

### Speeding Alert
- [ ] Alert shows when speed exceeds limit + threshold
- [ ] Current speed vs limit displayed
- [ ] Amount over limit shown
- [ ] WA fine information displayed:
  - [ ] Fine amount for current speed band
  - [ ] Demerit points applicable
  - [ ] "Slow Down" warning
- [ ] Alert dismissable for current session

### Minutes per km Display
- [ ] Shows travel time efficiency
- [ ] Updates in real-time with GPS movement
- [ ] Displays as "X.X min/km"

### 10km Travel Time Display
- [ ] Shows estimated time for 10km travel
- [ ] Updates based on current speed
- [ ] Useful for route planning

### Current Location Section
- [ ] Road ID shown in green
- [ ] Road Name shown in white
- [ ] SLK with direction indicator ⇒/⇐ (yellow text)
- [ ] Road Type shown (State Road/Local Road)
- [ ] NO Accuracy row (removed in RC 1.0)

### Destination Section
- [ ] Shows when destination road differs from current road
- [ ] Target Road ID, Name, SLK displayed

### Direction Indicators
- [ ] Green when moving towards destination
- [ ] Red blinking when moving away
- [ ] Yellow when stationary
- [ ] SLK direction indicator (⇒/⇐) next to SLK

### Speed Zone Lookahead
- [ ] App warns before reaching speed zone changes
- [ ] Amber border appears when approaching speed decrease
- [ ] Shows upcoming speed limit in circle
- [ ] Distance countdown to the sign
- [ ] GPS lag compensation improves timing

### Community-Verified Zones
- [ ] Speed circle has GREEN border in override zone
- [ ] Pulsating ✓ icon appears
- [ ] "VERIFIED" label displayed
- [ ] "Community Verified Zone" text shown

### AfterCare Integration
- [ ] Cyan banner appears when signs on current road
- [ ] Shows next upcoming sign with distance
- [ ] Links to `/drive/nearby-signs` for full list

### Landscape Mode
- [ ] Rotate device to landscape - layout switches to 2-column
- [ ] Left column: SLK, road info
- [ ] Right column: Speed display or destination info
- [ ] Larger text for at-a-glance reading
- [ ] GPS signal indicator in compact header
- [ ] Minimalist "Exit" button in top-left corner
- [ ] Speed Display OFF + Destination: right column shows destination
- [ ] Speed Display OFF + No Destination: centered panel with GPS accuracy

---

## GPS Calibration Tests (/calibrate)

### Page Load
- [ ] "Back to Work Zone Locator" button is dark blue
- [ ] Instructions displayed

### Calibration Process
- [ ] SET TARGET captures stationary position
- [ ] MARK PASS captures moving position
- [ ] Lag time calculated from SLK difference
- [ ] APPLY button saves to GPS settings
- [ ] EXPORT button generates CSV

---

## Speed Sign Override Tests (/overrides)

### Page Load
- [ ] Version shows "RC 1.9.0"
- [ ] Storage mode shows "Local Storage"
- [ ] Existing overrides displayed in table

### Add Override
- [ ] Form shows all fields:
  - [ ] Road ID (text input)
  - [ ] Road Name (text input)
  - [ ] SLK (number input)
  - [ ] Direction (True Left/True Right buttons)
  - [ ] Sign Type (Single/Double buttons)
  - [ ] Replicated (checkbox)
  - [ ] Start SLK (number input)
  - [ ] End SLK (number input)
  - [ ] Approach Speed (number input)
  - [ ] Front Speed (number input)
  - [ ] Back Speed (number input, double-sided only)
- [ ] Default direction is "True Left"
- [ ] Add button saves override
- [ ] New override appears in table

### Export/Import
- [ ] Export shows data in textarea (mobile-friendly)
- [ ] Copy to Clipboard button works
- [ ] Import from JSON file works

### Delete Override
- [ ] Delete button shows confirmation
- [ ] Confirm removes override from list

---

## AfterCare Tests (/aftercare)

### Page Load
- [ ] Version shows "RC 1.9.1"
- [ ] Job list shows grouped by status (Due, TBA, Active, Archived)

### Add Job
- [ ] "➕ New Job" button opens job form
- [ ] Can enter job name, road ID, road name
- [ ] Can add multiple signs to job
- [ ] Sign categories: Surface, Speed, Hazard
- [ ] Direction options: True Left, True Right, Both Sides
- [ ] Retrieval types: Standard (2 days), Scheduled, TBA, Daily/Weekly/Monthly
- [ ] "Capture Current Location" button works for GPS
- [ ] Save button creates job with signs

### Job Actions
- [ ] Edit job opens job form with existing data
- [ ] Delete job shows confirmation
- [ ] Mark all retrieved marks all signs in job
- [ ] Mark all maintained marks all signs in job
- [ ] Google Maps navigation per sign works

### Sign Actions
- [ ] Edit sign expands inline form
- [ ] Delete sign shows confirmation
- [ ] Mark retrieved changes sign status
- [ ] "Unretrieve" button restores sign to active
- [ ] Navigate button opens Google Maps

### Map View (/aftercare/map)
- [ ] "🗺 Map" button navigates to map page
- [ ] Full-screen OpenStreetMap displays
- [ ] Colored pins show sign status:
  - [ ] Red = Due for Retrieval
  - [ ] Yellow = Due Maintenance
  - [ ] Green = Active
- [ ] Filter buttons work:
  - [ ] All shows all signs
  - [ ] 🔴 shows only retrieval due
  - [ ] 🟡 shows only maintenance due
  - [ ] 🟢 shows only active
- [ ] Clicking marker shows popup with:
  - [ ] Road ID and SLK
  - [ ] Sign type and direction
  - [ ] Status indicator
- [ ] Legend shows color meanings
- [ ] Back button returns to AfterCare page
- [ ] Sign count in header updates based on filter

---

## AI Q&A Assistant Tests (/qa)

### Page Load
- [ ] Page loads with 🤖 AI Q&A Assistant header
- [ ] "⇠ Library" back button works
- [ ] Online/Offline status indicator shows correctly
- [ ] Document list loads from API

### Question Interface
- [ ] Question input field accepts text
- [ ] Enter key submits question
- [ ] Ask button disabled when offline
- [ ] Ask button disabled when question empty
- [ ] Loading state shows during AI request

### Document Selection
- [ ] Documents grouped by category
- [ ] Click to select/deselect documents
- [ ] "Select All" button selects all documents
- [ ] "Clear" button deselects all documents
- [ ] Selection count shows correctly

### AI Response
- [ ] Answer displays in formatted text
- [ ] Source documents shown with badges
- [ ] "Save" button opens save dialog
- [ ] "Copy" button copies answer to clipboard

### Save Q&A
- [ ] Save dialog shows question preview
- [ ] Can add optional category label
- [ ] Save button creates entry in history
- [ ] Saved count in History button updates

### History View
- [ ] "History" button toggles history view
- [ ] Saved Q&A entries displayed
- [ ] Favorite toggle works (⭐/☆)
- [ ] Delete button removes entry
- [ ] Search history works
- [ ] Filter by All/Favorites works

### Export/Import History
- [ ] Export button shows JSON data
- [ ] Copy to clipboard works
- [ ] Import from JSON works
- [ ] Clear All removes all entries

---

## Library Page Tests (/library)

### Page Load
- [ ] Title shows "📚 Library"
- [ ] Search input visible
- [ ] Category tabs displayed

### Search Features
- [ ] Search filters documents by text
- [ ] Results update as typing
- [ ] No results message shows appropriately

### Category Filtering
- [ ] Click category tab filters documents
- [ ] "All" shows all documents
- [ ] Each category shows only its documents

### Document Display
- [ ] Document title shown
- [ ] Category badge displayed
- [ ] Last updated date shown
- [ ] Click opens document viewer

---

## Traffic Counter Tests (/traffic-counter)

### Page Load
- [ ] Title shows "🚗 Traffic Counter"
- [ ] Counter displays zero
- [ ] Timer shows 00:00:00

### Counting Functions
- [ ] Start button begins counting session
- [ ] Vehicle count increments correctly
- [ ] Stop button pauses counting
- [ ] Reset clears count and timer
- [ ] Counts per hour calculated correctly

### Session Management
- [ ] Save session creates record
- [ ] Can add notes to session
- [ ] Export creates CSV download
- [ ] Previous sessions list shows history

---

## Settings Drawer Tests

### Access
- [ ] ⚙️ icon in header opens drawer
- [ ] Green background if offline data ready

### Settings Sections
- [ ] About section shows app info
- [ ] Admin Data Sync section shows sync options
- [ ] GPS & Tracking section shows GPS settings
- [ ] Offline Data section shows download options
- [ ] Preferences section shows user preferences
- [ ] Speed Zone Overrides section shows override link
- [ ] TC Tools section shows tool links

### Default Region
- [ ] Dropdown shows all regions
- [ ] Selection persists after page reload

### GPS Settings
- [ ] EKF Filtering toggle
- [ ] Road Constraint toggle
- [ ] Max Prediction Time slider
- [ ] Show Uncertainty toggle
- [ ] Early Warnings toggle
- [ ] Speed Lookahead Time setting
- [ ] GPS Lag Compensation setting

### Wind Gust Alert
- [ ] Threshold buttons (40/50/60/80 km/h)
- [ ] Selection persists

### Speeding Alert Settings
- [ ] Show Speeding Alert toggle
- [ ] Show WA Fines toggle
- [ ] Alert Threshold slider

### Admin Data Sync
- [ ] MRWA Server Status shows record counts
- [ ] Local Data Status shows synced datasets
- [ ] Individual sync buttons for each dataset
- [ ] "Sync All from MRWA" button works
- [ ] Progress shown during sync

---

## Offline Data Tests

### Download
- [ ] Download button triggers data load
- [ ] Progress messages shown
- [ ] Success message with counts
- [ ] Gear icon turns green

### Offline Operation
- [ ] App works without internet after download
- [ ] Road search works
- [ ] SLK tracking works
- [ ] Speed zones display correctly

---

## Error Handling Tests

### Invalid SLK
- [ ] Error message for SLK out of range
- [ ] Error message for non-numeric SLK

### GPS Errors
- [ ] Permission denied message
- [ ] Position unavailable message
- [ ] Timeout message

### Network Errors
- [ ] Graceful degradation when APIs unavailable
- [ ] Offline data used when network fails

---

## Warning Banner Tests

### Weather Warning Banner
- [ ] Banner appears when BOM warnings active
- [ ] Shows warning type and title
- [ ] Click expands for details
- [ ] Link to BOM website works
- [ ] Can dismiss for session

### Incident Warning Banner
- [ ] Banner appears for active incidents
- [ ] Shows incident type and location
- [ ] Shows expected delay if available
- [ ] Shows last updated time

---

## Visual Regression Checks

### Colors
- [ ] Background: Dark navy (#111827)
- [ ] Cards: Slightly lighter (#1F2937)
- [ ] Primary buttons: Blue (#2563EB)
- [ ] Dark buttons: Dark blue (#1E40AF)
- [ ] Section headers: Blue text (#60A5FA)
- [ ] Warning text: Amber (#FBBF24)

### Button Sizes
- [ ] Small icon buttons: h-7 w-7
- [ ] Primary buttons: h-12
- [ ] All buttons have rounded corners

### Typography
- [ ] Road ID: Font mono, blue
- [ ] SLK values: Font mono, yellow
- [ ] Section headers: Bold, blue

---

## Final Checks

- [ ] Version displays "RC 1.9.1" on all pages
- [ ] No console errors in browser dev tools
- [ ] No TypeScript build errors
- [ ] All features documented in Word docs
- [ ] Code pushed to GitHub (master + main)

---

## Test Results

| Tester | Date | Result | Notes |
|--------|------|--------|-------|
| | | | |
| | | | |
| | | | |
