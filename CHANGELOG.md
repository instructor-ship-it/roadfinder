# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.9.8] - 2026-03-29

### Added

- **FuelWatch WA Integration** for fuel station data
  - Daily updated diesel prices from WA Government FuelWatch RSS feed
  - Station name, brand, address, phone, site features (24hr, toilets, ATM, etc.)
  - Fuel price badge showing dollars per litre on amenities card
  - Server-side 30-minute cache for performance
  - New `/api/fuel-stations` endpoint with Overpass merge for complete coverage
- **WA Health SLIP Services** for hospital data (replacing Overpass for hospitals)
  - Accurate Emergency Department status (from official government data)
  - Hospital type badges: Public, Private, Nursing Post
  - Bed counts, suburb, address, phone number
  - Nursing posts included for remote/regional work zones
  - Connected existing `/api/nearest-hospital` endpoint to main amenities section
- **Three-Source Amenity Architecture** with smart fallback chain
  - Hospital: WA Health SLIP → Overpass fallback
  - Fuel: FuelWatch WA + Overpass merge (deduplication within 200m)
  - Toilet: Overpass API (no better alternative)
  - Source tracking per amenity type displayed in UI
- **Hospital Display Enhancements**
  - ED badge (red), Public badge (blue), Private badge (gray), Nursing Post badge (amber)
  - Address line, phone number, bed count shown beneath hospital name
- **Fuel Station Display Enhancements**
  - Diesel price badge (green) with "Diesel" label
  - "No price today" badge (gray) for Overpass-only stations
  - Site features line: e.g. "Open 24 hours · Toilets · ATM · EFTPOS"
  - Address and phone shown beneath station name

### Changed

- **Amenities Section** now uses three separate API calls in parallel instead of single Overpass call
- **Text Report** includes diesel price, hospital type, bed count, address, phone, site features
- **HTML Report** includes hospital type badge, fuel price badge, site features
- **AmenitiesSection component** updated with extended Place interface
- **Fuel type default** changed from U91 (unleaded) to DL (diesel) for work zone use case

### Fixed

- **Missing nearby fuel stations**: FuelWatch only returns stations that submitted prices today. Nearby stations without price submissions were invisible. Fixed by merging Overpass fuel station data to fill gaps.
- **TypeScript inference error**: `const sources = []` inferred as `never[]`, causing Vercel build failure. Fixed with explicit `string[]` type annotation.

---

## [1.9.7] - 2026-03-29

### Added

- **Maximum Hold Time Calculator** on Work Zone Info page
  - Displays Max Hold (min), Recommended Stop (min), Queue Growth (m/min), Queue at recommended stop (m)
  - Uses weekday peak VPH and heavy vehicle percentage when available
  - Shows TC zone length and clearance time from work zone geometry
  - Warning when queue at recommended stop exceeds Prepare to Stop distance (100m)
- **Shuttle Flow Reference Table** now shows Source column (AGTTM vs MRWA COP)

### Fixed

- **Shuttle Flow Risk Assessment** corrected to match AGTTM Part 2 Table 3.5 and MRWA COP Table 15
  - VPH 251–300 no longer incorrectly flagged for risk assessment (matches AGTTM exactly)
  - Risk assessment wording corrected: "to the satisfaction of the relevant road authority" per MRWA COP Section 6.8.7
  - Fabricated asterisks removed (neither source document uses them)
- **Clearance Time Unit Conversion** corrected (metres per second, not per minute)

### Changed

- **Heavy Vehicle Count Button** colour changed from red to blue for better visual distinction
- **Offline Data Section** in settings shows compact single-line display with Manage button when data already downloaded

---

## [1.9.6] - 2026-03-28

### Added

- **Traffic Counter: Auto-Fetch GPS Location**
  - Automatically fetches GPS location when "Start Counting" is pressed if no location is set
  - Shows loading state ("📍 Getting GPS...") while fetching
  - Gracefully continues without location if GPS fails (non-blocking)

- **Traffic Counter: Custom Duration Button**
  - Shows highlighted button with custom value (e.g., "160m ✓") when custom duration is set
  - Clear visual feedback that custom duration was accepted
  - Clicking preset buttons clears custom mode
  - Clicking custom button returns to default selection

### Fixed

- **Version Synchronization**: All version numbers now consistent across codebase
  - package.json: 1.9.1 → 1.9.5 → 1.9.6
  - SettingsDrawer.tsx: RC 1.9.5 → RC 1.9.6
  - traffic-counter/page.tsx: RC 1.9.1 → RC 1.9.6
  - qa/page.tsx: RC 1.9.1 → RC 1.9.6
  - aftercare/page.tsx: RC 1.9.1 → RC 1.9.6

- **Traffic Counter: Duration Button Text Visibility**
  - Changed duration button text to white for better readability
  - Applied to preset buttons (3m, 5m, 15m) and custom duration controls

- **Traffic Counter: Custom Duration Limit**
  - Increased max custom duration from 60 to 480 minutes (8 hours)
  - Added validation with user feedback for values exceeding max

- **Traffic Counter: Actual Duration Recording**
  - Fixed history entry showing incorrect sampling time when timer stopped early
  - Now correctly captures actual elapsed time instead of planned duration

- **Lint Errors**: Resolved all 8 ESLint errors and warnings
  - Added eslint-disable comments for Leaflet SSR require() pattern
  - Added eslint-disable comments for setState in useEffect (valid patterns)
  - Removed unused eslint-disable directive

### Documentation

- **CHANGELOG.md**: Added missing versions 1.9.2-1.9.5
- **worklog.md**: Updated with all session details

---

## [1.9.5] - 2026-03-28

### Added

- **Testing Framework**: Vitest with React Testing Library
  - 45 tests for utilities and components
  - Test coverage reporting
- **CI/CD Pipeline**: GitHub Actions workflow
  - Automated lint, build, test, typecheck on every push
  - Coverage artifact upload
- **Git Hooks**: Husky + lint-staged
  - Pre-commit linting and formatting
- **Dependabot**: Weekly dependency update checks
- **EditorConfig**: Consistent editor settings across IDEs
- **PR Template**: Checklist for pull requests
- **Documentation**: CONTRIBUTING.md version policy, RELEASE_CHECKLIST.md

### Changed

- README.md: Added CI badge
- package.json: Added test scripts and dev dependencies
- tsconfig.json: Added vitest.config.ts to includes

### Best Practice Score

- Improved from 95 to 100

---

## [1.9.4] - 2026-03-28

### Changed

- **Component Extraction**: Major code organization refactoring
  - Extracted WeatherSection component (208 lines)
  - Extracted TrafficSection component (216 lines) with shuttle flow logic
  - Extracted AmenitiesSection component (180 lines)
  - Extracted WorkZoneSummary component (251 lines)
  - Reduced page.tsx from 5150 to 4608 lines (542 lines saved)

---

## [1.9.3] - 2026-03-28

### Added

- **Prettier Config**: `.prettierrc` with project code style settings
- **CONTRIBUTING.md**: Development guidelines and version policy
- **README Badges**: Version, license, platform, tech stack badges

### Changed

- **SavedLocations Component**: Extracted from page.tsx (79 lines)
- Reduced page.tsx by 40 lines using component extraction pattern

---

## [1.9.2] - 2026-03-28

### Added

- **MIT LICENSE**: Open source license file
- **.env.example**: Documented environment variables template

### Fixed

- Version inconsistencies across files synchronized
- Added license field to package.json

---

## [1.9.1] - 2026-03-28

### Note

- This version was documented in changelog but code version was 1.9.5
- Version numbers synchronized in this release

---

## [1.9.0] - 2026-03

### Added

- **AI Q&A Assistant** (`/qa`)
  - Ask questions about traffic management, WHS, and road work documents
  - AI searches document abstracts and provides contextual answers
  - Cites which documents were used for each answer
- **Q&A History**
  - Save useful Q&A entries for future reference
  - Mark entries as favorites for quick access
  - Categorize entries with custom labels
  - Export/Import Q&A history as JSON backup

### Integration

- AI Q&A button in Library page header
- Link in Settings menu → Library section

---

## [1.8.0] - 2026-03-XX

### Added

- **Library Offline Status Indicators**
  - 📥 (green) = Cached in browser storage
  - 💾 (blue) = Downloaded to device
  - ⚠️ (red) = Cache was cleared
- **Download Tracking**: Tracks when user downloads a file
- **Cache Verification**: Detects when browser clears cache

---

## [1.7.28] - 2026-03-XX

### Fixed

- TMP Viewer mobile responsiveness
- Geometry verification for intersecting roads

---

## [1.7.26] - 2026-03-XX

### Added

- Wake Lock for screen always on during GPS tracking
- Saved Locations feature (up to 20 locations)

---

## [1.7.20] - 2026-03-XX

### Added

- Amenities data source toggle (ONLINE/OFFLINE)
- Expanded amenities dataset (35 hospitals, 92 fuel stations, 45 toilets)

---

## [1.7.0] - 2026-03-XX

### Fixed

- Northbound (decreasing SLK) speed display bug
- Speed zone boundary rule implementation

---

## [1.6.0] - 2026-03-XX

### Added

- AfterCare Map Page (`/aftercare/map`)
  - Full-screen OpenStreetMap with colored pins
  - Filter by status: All/Retrieval/Maintenance/Active

---

## [1.5.0] - 2026-03-XX

### Added

- Nearby Signs Page (`/drive/nearby-signs`)
- PWA Support (installable on mobile)
- Internet signal bar indicator

---

## [1.4.0] - 2026-03-XX

### Added

- AfterCare Signage Tracking module (`/aftercare`)
  - Track signage awaiting retrieval
  - Job-based organization
  - Retrieval scheduling

---

## [1.3.0] - 2026-03-XX

### Added

- Set Distance feature (SLK Meter)
- Lane names for roads with 3+ lanes

---

## [1.2.0] - 2026-03-XX

### Added

- LocalStorage-based speed zone overrides
- Export/Import override data

---

## [1.0.0] - 2026-03-XX

### Added

- Initial release candidate
- Work Zone Location Lookup
- GPS-based SLK tracking
- Offline data support
- Weather and traffic data integration
- Nearby amenities lookup

---

## Version History Summary

| Version | Date       | Key Changes                                                               |
| ------- | ---------- | ------------------------------------------------------------------------- |
| 1.9.8   | 2026-03-29 | FuelWatch WA + WA Health SLIP amenities, fuel prices, hospital ED/badges  |
| 1.9.7   | 2026-03-29 | Max Hold Time calc, shuttle flow fix, clearance time fix, UI improvements |
| 1.9.6   | 2026-03-28 | Traffic Counter: Auto-GPS, custom duration UI, duration fixes, lint fixes |
| 1.9.5   | 2026-03-28 | Testing, CI/CD, Best Practice 100                                         |
| 1.9.4   | 2026-03-28 | Component extraction (Weather, Traffic, Amenities, WorkZone)              |
| 1.9.3   | 2026-03-28 | Prettier, CONTRIBUTING, SavedLocations component                          |
| 1.9.2   | 2026-03-28 | MIT License, .env.example                                                 |
| 1.9.1   | 2026-03-28 | Version synchronization note                                              |
| 1.9.0   | 2026-03    | AI Q&A Assistant                                                          |
| 1.8.0   | 2026-03    | Library offline indicators                                                |
| 1.7.x   | 2026-03    | Wake lock, saved locations, amenities                                     |
| 1.6.0   | 2026-03    | AfterCare map view                                                        |
| 1.5.0   | 2026-03    | PWA, nearby signs                                                         |
| 1.4.0   | 2026-03    | AfterCare module                                                          |
| 1.3.0   | 2026-03    | Set distance, lane names                                                  |
| 1.2.0   | 2026-03    | LocalStorage overrides                                                    |
| 1.0.0   | 2026-03    | Initial release                                                           |

---

**For detailed changes, see commit history on GitHub.**
