# TC Work Zone Locator

## File Structure Documentation

**Version 1.35.0**

---

## 1. Project Overview

The TC Work Zone Locator is a Next.js 16 application built with the App Router architecture. This document provides a comprehensive reference of all files and directories in the project, designed specifically for Traffic Controllers in Western Australia to locate work zones, track GPS position, manage signage (AfterCare), work offline in remote areas, and count traffic.

---

## 2. Root Directory Structure

| File/Directory | Purpose                  |
| -------------- | ------------------------ |
| `src/`         | Source code              |
| `public/`      | Static assets            |
| `docs/`        | Documentation            |
| `scripts/`     | Build/utility scripts    |
| `prisma/`      | Database schema          |
| `package.json` | Dependencies and scripts |
| `README.md`    | Project readme           |
| `worklog.md`   | Development work log     |

---

## 3. Source Code Structure (src/)

### 3.1 Application Pages (src/app/)

| File                                        | Purpose                                            |
| ------------------------------------------- | -------------------------------------------------- |
| `page.tsx`                                  | Home page - Work zone lookup                       |
| `drive/page.tsx`                            | GPS tracking page with EKF filtering, speed alerts |
| `drive/nearby-signs/page.tsx`               | Nearby signs requiring action                      |
| `overrides/page.tsx`                        | Speed sign override management                     |
| `overrides/layout/page.tsx`                 | Override layout visualization                      |
| `overrides/map/page.tsx`                    | Override map with Leaflet                          |
| `aftercare/page.tsx`                        | AfterCare job management                           |
| `aftercare/map/page.tsx`                    | AfterCare map with Leaflet                         |
| `library/page.tsx`                          | Documents library browser                          |
| `library/[docId]/page.tsx`                  | Document viewer                                    |
| `library/[docId]/[pageNum]/page.tsx`        | Document page viewer                               |
| `library/expanded/page.tsx`                 | Expanded library view                              |
| `library/tmp/[region]/[document]/page.tsx`  | Temporary document storage                         |
| `library/tmp/page.tsx`                      | TMP region index (8 MRWA regions grid)             |
| `library/viewer/[docId]/page.tsx`           | Library document info                              |
| `library/viewer/[docId]/[pageNum]/page.tsx` | PDF viewer                                         |
| `library/tmp/[region]/page.tsx`             | TMP region viewer                                  |
| `contacts/page.tsx`                         | Contact directory                                  |
| `cycle-timer/page.tsx`                      | Cycle timer tool                                   |
| `event-logger/page.tsx`                     | Traffic event logger                               |
| `settings/page.tsx`                         | Settings page                                      |
| `saved-locations/map/page.tsx`              | Saved locations map                                |
| `calibrate/page.tsx`                        | GPS calibration tool                               |
| `manual/page.tsx`                           | User manual page                                   |
| `offline/page.tsx`                          | Offline data management                            |
| `qa/page.tsx`                               | Quality assurance testing page                     |
| `traffic-counter/page.tsx`                  | Manual traffic counting tool                       |
| `traffic-counter/count/page.tsx`            | Active counting with VPH, queue, hold              |
| `layout.tsx`                                | Root layout                                        |
| `globals.css`                               | Global styles                                      |

### 3.2 API Routes (src/app/api/)

| Route                                 | Purpose                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `roads/route.ts`                      | Road data, SLK coordinates                                                             |
| `gps/route.ts`                        | GPS to SLK conversion                                                                  |
| `weather/route.ts`                    | Weather data (Open-Meteo)                                                              |
| `warnings/route.ts`                   | BOM weather warnings RSS                                                               |
| `weather/warnings/route.ts`           | Weather warnings sub-endpoint                                                          |
| `traffic/route.ts`                    | Traffic volume data                                                                    |
| `places/route.ts`                     | Nearby amenities                                                                       |
| `intersections/route.ts`              | Cross road detection                                                                   |
| `nearest-intersections/route.ts`      | Find nearest intersections                                                             |
| `admin-sync/route.ts`                 | MRWA direct sync                                                                       |
| `overrides/route.ts`                  | Override storage pass-through                                                          |
| `speed-compare/route.ts`              | MRWA vs OSM comparison                                                                 |
| `osm-speed/route.ts`                  | OSM speed limit data                                                                   |
| `speed-verify/route.ts`               | Speed verification                                                                     |
| `speedlimit/route.ts`                 | Speed limit lookup                                                                     |
| `download-signs/route.ts`             | Sign data download                                                                     |
| `export-pdf/route.ts`                 | Work zone report export                                                                |
| `sync-data/route.ts`                  | Offline data sync                                                                      |
| `route/route.ts`                      | Route API                                                                              |
| `emergency-stations/route.ts`         | Emergency facility locations                                                           |
| `hospitals/route.ts`                  | Hospital locations from WA Health SLIP Services (Layers 6 & 7)                         |
| `nearest-hospital/route.ts`           | Nearest hospital from WA Health SLIP Services, includes nursing posts for remote areas |
| `police-stations/route.ts`            | Police station locations                                                               |
| `incidents/route.ts`                  | Live road incidents                                                                    |
| `fuel-stations/route.ts`              | FuelWatch WA + Overpass merged fuel station search                                     |
| `qa/route.ts`                         | QA test data                                                                           |
| `qa-saved/route.ts`                   | Saved QA results                                                                       |
| `toilets/route.ts`                    | Toilet data from National Toilet Map                                                   |
| `ai/chat/route.ts`                    | AI direct chat                                                                         |
| `ai/verify/route.ts`                  | AI key verification                                                                    |
| `documents/route.ts`                  | Document listing                                                                       |
| `documents/summarize/route.ts`        | AI document summarization                                                              |
| `documents/analyze-diagrams/route.ts` | AI diagram analysis                                                                    |

### 3.3 Library Modules (src/lib/)

| File                         | Purpose                                                             |
| ---------------------------- | ------------------------------------------------------------------- |
| `offline-db.ts`              | IndexedDB storage, sign-to-zone logic                               |
| `offline-storage.ts`         | Offline data management utilities                                   |
| `aftercare.ts`               | AfterCare job/sign storage and management                           |
| `emergency.ts`               | Emergency location functions (cross road, nearest town, facilities) |
| `route-optimizer.ts`         | Route optimization for retrieval/maintenance                        |
| `mrwa_api.ts`                | MRWA ArcGIS API integration                                         |
| `gps-ekf.ts`                 | Extended Kalman Filter for GPS                                      |
| `utils.ts`                   | Haversine distance, bearing, direction utilities                    |
| `db.ts`                      | Database utilities                                                  |
| `download-roads.ts`          | Static data loader                                                  |
| `qa-storage.ts`              | QA test storage and management                                      |
| `traffic-counter-storage.ts` | Traffic count record storage                                        |
| `saved-locations-db.ts`      | Saved locations IndexedDB storage                                   |
| `cycle-timer-storage.ts`     | Cycle timer storage                                                 |
| `traffic-event-logger.ts`    | Traffic event logger                                                |
| `summaries-storage.ts`       | Document summaries storage                                          |
| `fire-stations.ts`           | Fire station data                                                   |
| `toilet-map.ts`              | National Toilet Map integration                                     |
| `push-notifications.ts`      | Push notifications                                                  |
| `logger.ts`                  | Logging utility                                                     |
| `errors.ts`                  | Error handling                                                      |
| `contacts-storage.ts`        | Contacts storage                                                    |
| `speed-zones.ts`             | Speed zone logic                                                    |
| `traffic-calculations.ts`    | Traffic calculations                                                |
| `offline-db/`                | Modular offline database subdirectory (see below)                   |
| `config.ts`                  | Application configuration                                           |
| `max-hold-time.ts`           | Maximum hold time calculations                                      |
| `performance.ts`             | Performance monitoring utilities                                    |
| `validation.ts`              | Zod schemas for input validation                                    |

### 3.4 React Hooks (src/hooks/)

| File                        | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| `useGpsTracking.ts`         | GPS tracking with EKF, speed zones, speed alerts |
| `useOrientation.ts`         | Screen orientation detection                     |
| `use-mobile.ts`             | Mobile device detection                          |
| `use-toast.ts`              | Toast notification hook                          |
| `useHomeSettings.ts`        | Home page settings hook                          |
| `useSavedLocations.ts`      | Saved locations hook                             |
| `useGpsLocation.ts`         | GPS location hook                                |
| `useWorkZoneData.ts`        | Work zone data hook                              |
| `useWorkZoneFetch.ts`       | Work zone fetch hook                             |
| `useWorkZone.ts`            | Work zone hook                                   |
| `useRoads.ts`               | Roads data hook                                  |
| `useRegions.ts`             | Regions data hook                                |
| `useWeather.ts`             | Weather data hook                                |
| `useTraffic.ts`             | Traffic data hook                                |
| `usePlaces.ts`              | Places/amenities hook                            |
| `useOfflineData.ts`         | Offline data hook                                |
| `useSetDistance.ts`         | Set distance hook                                |
| `useCollapsibleSections.ts` | Collapsible section state management             |
| `useSignageData.ts`         | Speed limit and signage corridor data hook       |
| `useWorkZoneLookup.ts`      | Work zone lookup and report generation hook      |

### 3.5 React Components (src/components/)

#### Top-level Components (src/components/)

| File                            | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `SettingsDrawer.tsx`            | Unified settings/drawer component for all pages |
| `SignageMap.tsx`                | Map component for signage display               |
| `SpeedZoneLayout.tsx`           | Speed zone visualization layout                 |
| `IncidentWarningBanner.tsx`     | Live road incident warning banner               |
| `IncidentsSection.tsx`          | Incidents display section                       |
| `WarningsSection.tsx`           | Weather warnings section                        |
| `WeatherWarningBanner.tsx`      | Weather warning banner                          |
| `ServiceWorkerRegistration.tsx` | PWA service worker registration                 |
| `DebugInfoPopup.tsx`            | Debug information popup                         |
| `EmergencyLocationModal.tsx`    | Emergency location modal                        |
| `GpsLookupDialog.tsx`           | GPS location lookup dialog                      |
| `Onboarding.tsx`                | First-run onboarding wizard                     |
| `PdfViewerModal.tsx`            | PDF document viewer                             |
| `ReportExportModal.tsx`         | Report export dialog                            |
| `SetDistanceControls.tsx`       | GPS distance measurement controls               |
| `TrafficCountDetailModal.tsx`   | Traffic count detail popup                      |
| `TrafficEventLoggerModal.tsx`   | Traffic event logger modal                      |
| `WorkZoneReport.tsx`            | Work zone report component                      |
| `ui/`                           | shadcn/ui components (Radix primitives)         |

#### Traffic Event Logger Components (src/components/traffic-event-logger/)

| File               | Purpose                              |
| ------------------ | ------------------------------------ |
| `Counters.tsx`     | Event counter buttons and display    |
| `TimerBadge.tsx`   | Elapsed time badge for active events |
| `EventButtons.tsx` | Event type selection buttons         |
| `EventList.tsx`    | Scrollable list of logged events     |
| `FlasherSheet.tsx` | Bottom sheet for flasher events      |
| `MoreSheet.tsx`    | Additional actions bottom sheet      |
| `ShiftSheet.tsx`   | Shift start/end management sheet     |

#### Home Page Components (src/components/home/)

| File                          | Purpose                            |
| ----------------------------- | ---------------------------------- |
| `AmenitiesSection.tsx`        | Nearby amenities display           |
| `EmergencyLocationButton.tsx` | Emergency location button          |
| `GenerateReportButton.tsx`    | Work zone report generation button |
| `HomeHeader.tsx`              | Home page header with settings     |
| `IntersectionsSection.tsx`    | Intersecting roads display         |
| `LaneDirectionDiagram.tsx`    | Lane direction visual diagram      |
| `OfflineDataSection.tsx`      | Offline data status section        |
| `OfflineStatusIndicator.tsx`  | Offline status indicator           |
| `RoadWidthBreakdown.tsx`      | Road width breakdown display       |
| `SavedLocations.tsx`          | Saved locations list component     |
| `SignageCorridorSection.tsx`  | Signage corridor display           |
| `SpeedZoneLayoutSection.tsx`  | Speed zone layout section          |
| `StartSlkTrackingButton.tsx`  | Start SLK tracking button          |
| `TrafficSection.tsx`          | Traffic volume section             |
| `TrafficVolumeSection.tsx`    | Traffic volume detailed section    |
| `WeatherSection.tsx`          | Weather conditions section         |
| `WorkZoneForm.tsx`            | Work zone input form component     |
| `WorkZoneSummary.tsx`         | Work zone summary display          |
| `index.ts`                    | Barrel export file                 |

---

## 4. Scripts (scripts/)

| File                          | Purpose                            |
| ----------------------------- | ---------------------------------- |
| `download-roads.js`           | Download MRWA road data            |
| `download-signage.mjs`        | Download signage data              |
| `download-additional-data.js` | Download pavement and traffic data |
| `download-amenities.js`       | Download OpenStreetMap amenities   |
| `version-check.sh`            | Version consistency checker        |
| `read-docx.mjs`               | Document reader utility            |
| `create-user-manual.js`       | Generate user manual script        |
| `generate-user-manual.mjs`    | Generate user manual from docs     |

---

## 5. Documentation (docs/)

| File                                            | Purpose                         |
| ----------------------------------------------- | ------------------------------- |
| `ARCHITECTURE.md`                               | Main architecture documentation |
| `DATA_STRUCTURES.md`                            | Data structures and types       |
| `API_REFERENCE.md`                              | External API documentation      |
| `TC_Work_Zone_Locator_File_Structure.md`        | This file                       |
| `TC_Work_Zone_Locator_Direction_Aware_Zones.md` | Bidirectional zones             |
| `TC_Work_Zone_Locator_Program_Logic.md`         | Business logic documentation    |
| `TC_Work_Zone_Locator_User_Manual.md`           | End-user manual                 |
| `RC1_Test_Checklist.md`                         | Testing checklist               |
| `RC1.34.0_Key_Learnings.md`                     | Development patterns            |
| `Work_Zone_Report_Implementation_Guide.md`      | Report feature guide            |
| `TESTING.md`                                    | Testing documentation           |
| `TROUBLESHOOTING.md`                            | Troubleshooting guide           |
| `future/`                                       | Future feature mockups          |
| `screenshots/`                                  | Test screenshots                |

---

## 6. Static Data (public/data/)

| Directory/File        | Purpose                                                            |
| --------------------- | ------------------------------------------------------------------ |
| `roads-{region}.json` | Road geometry JSON files by region (e.g., roads-metropolitan.json) |
| `metadata.json`       | Region list and download metadata                                  |
| `pavement-data.json`  | Pavement data (lanes, widths)                                      |
| `traffic-data.json`   | Traffic count data                                                 |
| `amenities.json`      | Nearby amenities (hospitals, fuel, toilets)                        |

---

## 7. Key File Details

### 7.1 AfterCare Module (src/app/aftercare/)

The AfterCare module provides comprehensive signage tracking and management:

- **`page.tsx`**: Main AfterCare interface with job list, add/edit views, presets management
- **`map/page.tsx`**: Full-screen Leaflet map with colored markers for sign status

**Features:**

- Job-based signage tracking
- Sign categories: Surface, Speed, Hazard
- Retrieval scheduling (Standard, Scheduled, Maintain Daily/Weekly/Monthly, TBA)
- Status tracking (placed, due-retrieval, due-maintenance, maintained, retrieved)
- Google Maps navigation links
- Route optimization for multiple signs
- Export/Import for backup

### 7.2 Drive Module (src/app/drive/)

- **`page.tsx`**: Main GPS tracking with EKF filtering, speed zone lookahead, speeding alerts
- **`nearby-signs/page.tsx`**: Shows only signs requiring action (retrieval/maintenance)

**Features:**

- Real-time GPS tracking with EKF smoothing
- Speed limit display with override zone indicators
- Speeding alert with WA fine/demerit information
- Turbo Mode / GPS refresh rate toggle (1s or 5s intervals)
- Minutes per km and 10km travel time display
- AfterCare integration with nearby sign alerts

### 7.3 Library Module (src/app/library/)

- **`page.tsx`**: Documents library browser
- **`[docId]/page.tsx`**: Document viewer with zoom
- **`[docId]/[pageNum]/page.tsx`**: Page-specific viewer
- **`expanded/page.tsx`**: Expanded document view

**Features:**

- Browse documents by region
- View MRWA documents and diagrams
- Zoom and navigation controls

### 7.4 Traffic Counter Module (src/app/traffic-counter/)

- **`page.tsx`**: Setup page for configuring count parameters
- **`count/page.tsx`**: Active counting interface with timer and counters

**Setup Page Features:**

- Duration selection (3m, 5m, 15m presets + custom 1-480m)
- Direction mode selection (one-way / both-ways)
- GPS location capture with auto-fetch
- Optional notes field
- History modal with export/delete

**Count Page Features:**

- Circular progress timer with color-coded status
- Counter buttons for Light/Heavy vehicles by direction
- Real-time VPH, lane capacity, queue length calculations
- Early stop with actual duration capture
- Minimum 3-minute duration enforcement
- Completion overlay with save/reset options

### 7.5 Overrides Module (src/app/overrides/)

- **`page.tsx`**: Speed sign override management
- **`layout/page.tsx`**: Override layout visualization
- **`map/page.tsx`**: Map view of overrides

**Features:**

- Add/edit/delete speed sign overrides
- Community-verified speed zone corrections
- Export/Import functionality

### 7.6 WHS Library Directory (public/library/whs/)

| Directory/File            | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `legislation/`            | WHS legislation PDF documents                        |
| `legislation/*.pdf`       | WHS Act, Regulations, and related legislation files  |
| `codes-of-practice/`      | Codes of practice documents                          |
| `codes-of-practice/*.pdf` | Safe work method statements, traffic management CoPs |
| `ai-summaries/`           | AI-generated document summaries                      |
| `ai-summaries/*.json`     | JSON summaries with key points and sections          |

### 7.7 Library Modules (src/lib/)

#### offline-db.ts

Primary IndexedDB storage module including:

- Database initialization and management
- Road data storage and retrieval
- Speed zone data handling
- Signage data management
- Dataset metadata tracking

#### aftercare.ts

Comprehensive AfterCare data management including:

- Type definitions: `AfterCareJob`, `AfterCareSign`, `RetrievalType`, `SignStatus`
- Storage functions: `getAfterCareJobs()`, `saveAfterCareJobs()`, `createAfterCareJob()`
- Sign management: `addSignToJob()`, `updateSignInJob()`, `markSignRetrieved()`
- Status calculations: `calculateSignStatus()`, `calculateJobStatus()`
- Navigation: `generateMapsUrl()`, `getNearbySigns()`

#### traffic-counter-storage.ts

Traffic counting storage and management:

- Type definitions: `TrafficCountRecord`, `TrafficCountStats`, `CountDirection`
- Storage functions: `getTrafficCountHistory()`, `saveTrafficCountRecord()`, `deleteTrafficCountRecord()`
- Statistics: `getTrafficCountStats()`, `calculateVPH()`, `calculateHeavyPercentage()`
- Export: `generateShareText()`, `exportAllRecords()`, `clearTrafficCountHistory()`
- Reference data: Lane capacity table, shuttle flow table, reduction factors, queue multipliers

#### emergency.ts

Emergency location functions:

- Type definitions: `CrossRoad`, `NearestTown`, `NearestHospital`, `EmergencyData`
- Location functions: `findNearestCrossRoad()`, `findNearestTown()`
- Facility functions: `findNearestHospital()`, `findNearestPoliceStation()`

#### route-optimizer.ts

Route optimization for multi-stop signage retrieval:

- `optimizeRoute()`: Optimize sign visit order
- `getAllSignsDueForRetrieval()`: Get all signs needing retrieval
- `getAllSignsDueForMaintenance()`: Get all signs needing maintenance
- `generateReport()`: Create AfterCare report

#### offline-db/ (Modular Offline Database)

The offline database is split into 12 modular files for maintainability:

| File               | Purpose                                                                            |
| ------------------ | ---------------------------------------------------------------------------------- |
| `index.ts`         | Re-exports all modules for unified imports                                         |
| `db-core.ts`       | IndexedDB initialization, version management, core operations                      |
| `types.ts`         | All type definitions (RoadData, PavementData, ParsedSpeedZone, AmenityPlace, etc.) |
| `speed-zones.ts`   | Speed zone parsing, sign-to-zone conversion, override merging                      |
| `signage.ts`       | Rail crossing, regulatory sign, warning sign storage                               |
| `roads.ts`         | Road data storage and retrieval by region                                          |
| `pavement.ts`      | Pavement data (lanes, widths, shoulders) storage                                   |
| `traffic.ts`       | Traffic volume data storage                                                        |
| `amenities.ts`     | Amenities (hospitals, fuel, toilets) storage                                       |
| `work-zone.ts`     | Work zone data operations                                                          |
| `weather-cache.ts` | Weather data caching                                                               |
| `metadata.ts`      | Dataset sync metadata tracking                                                     |

---

## 8. Data Storage Architecture

| Data Type                | Storage      | Why                             |
| ------------------------ | ------------ | ------------------------------- |
| Road geometry, MRWA data | IndexedDB    | Large datasets, offline access  |
| Speed sign overrides     | localStorage | User-editable, works on Vercel  |
| AfterCare jobs & signs   | localStorage | User-editable, offline tracking |
| Traffic count records    | localStorage | User data, exportable           |
| QA test results          | localStorage | Testing and validation          |
| App preferences          | localStorage | Simple key-value                |

---

## 9. Version History

| Version   | Date       | Key Changes                                                                                                 |
| --------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| 1.35.0    | May 2026   | Turbo Mode, Traffic Event Logger components, WHS Library, onboarding, saved locations map, API health check |
| 1.34.1    | April 2026 | Phase 3 refactoring, component extraction, mrwaStatus type fix                                              |
| 1.34.0    | April 2026 | IndexedDB for saved locations, unlimited storage, localStorage migration                                    |
| 1.28.5    | April 2026 | Traffic Event Logger, Cycle Timer, AI direct chat, PDF viewer improvements                                  |
| 1.28.0    | April 2026 | Traffic Event Logger with TC assignments, Google Sheets sync                                                |
| 1.27.0    | April 2026 | PDF Viewer Modal with landscape/portrait support                                                            |
| 1.21.0    | April 2026 | Direct AI Chat for Q&A Assistant                                                                            |
| 1.20.0    | April 2026 | TypeScript strict mode, ESLint zero-warning baseline                                                        |
| RC 1.9.9  | June 2025  | Fuel stations (FuelWatch WA + Overpass), hospital type badges, amenity data sources                         |
| RC 1.9.7  | March 2026 | Max Hold Time calc, shuttle flow fix, clearance time fix, UI improvements                                   |
| RC 1.9.1  | March 2026 | Speeding alerts with WA fine info, minutes per km, 10km time                                                |
| RC 1.9.0  | March 2026 | Traffic Counter feature, Documents Library                                                                  |
| RC 1.8.0  | March 2026 | QA page, Settings Drawer consolidation                                                                      |
| RC 1.7.18 | March 2026 | Signage Corridor intersection fix (Layer 6)                                                                 |
| RC 1.7.17 | March 2026 | Emergency cross road detection, shared module                                                               |
| RC 1.7.14 | March 2026 | Emergency location enhancement                                                                              |
| RC 1.6.0  | March 2026 | AfterCare Map View, Leaflet integration                                                                     |
| RC 1.5.0  | March 2026 | Nearby Signs page, filtered view                                                                            |
| RC 1.4.0  | March 2026 | AfterCare signage tracking system                                                                           |
| RC 1.2.1  | March 2026 | Override zone visual indicator                                                                              |
| RC 1.2.0  | March 2026 | Speed sign override system                                                                                  |
| RC 1.0    | March 2026 | Official release candidate                                                                                  |

---

_This document is maintained as part of the TC Work Zone Locator documentation suite._
