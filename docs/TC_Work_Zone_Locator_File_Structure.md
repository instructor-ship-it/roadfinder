# TC Work Zone Locator

## File Structure Documentation

**Version RC 1.9.8**

---

## 1. Project Overview

The TC Work Zone Locator is a Next.js 15 application built with the App Router architecture. This document provides a comprehensive reference of all files and directories in the project, designed specifically for Traffic Controllers in Western Australia to locate work zones, track GPS position, manage signage (AfterCare), work offline in remote areas, and count traffic.

---

## 2. Root Directory Structure

| File/Directory       | Purpose                       |
| -------------------- | ----------------------------- |
| `src/`               | Source code                   |
| `public/`            | Static assets                 |
| `docs/`              | Documentation                 |
| `scripts/`           | Build/utility scripts         |
| `prisma/`            | Database schema               |
| `package.json`       | Dependencies and scripts      |
| `README.md`          | Project readme                |
| `PROJECT_CONTEXT.md` | Single source of truth for AI |
| `worklog.md`         | Development work log          |

---

## 3. Source Code Structure (src/)

### 3.1 Application Pages (src/app/)

| File                                       | Purpose                                            |
| ------------------------------------------ | -------------------------------------------------- |
| `page.tsx`                                 | Home page - Work zone lookup                       |
| `drive/page.tsx`                           | GPS tracking page with EKF filtering, speed alerts |
| `drive/nearby-signs/page.tsx`              | Nearby signs requiring action                      |
| `overrides/page.tsx`                       | Speed sign override management                     |
| `overrides/layout/page.tsx`                | Override layout visualization                      |
| `overrides/map/page.tsx`                   | Override map with Leaflet                          |
| `aftercare/page.tsx`                       | AfterCare job management                           |
| `aftercare/map/page.tsx`                   | AfterCare map with Leaflet                         |
| `library/page.tsx`                         | Documents library browser                          |
| `library/[docId]/page.tsx`                 | Document viewer                                    |
| `library/[docId]/[pageNum]/page.tsx`       | Document page viewer                               |
| `library/expanded/page.tsx`                | Expanded library view                              |
| `library/tmp/[region]/[document]/page.tsx` | Temporary document storage                         |
| `calibrate/page.tsx`                       | GPS calibration tool                               |
| `manual/page.tsx`                          | User manual page                                   |
| `offline/page.tsx`                         | Offline data management                            |
| `qa/page.tsx`                              | Quality assurance testing page                     |
| `traffic-counter/page.tsx`                 | Manual traffic counting tool                       |
| `layout.tsx`                               | Root layout                                        |
| `globals.css`                              | Global styles                                      |

### 3.2 API Routes (src/app/api/)

| Route                            | Purpose                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `roads/route.ts`                 | Road data, SLK coordinates                                                             |
| `gps/route.ts`                   | GPS to SLK conversion                                                                  |
| `weather/route.ts`               | Weather data (Open-Meteo)                                                              |
| `warnings/route.ts`              | BOM weather warnings RSS                                                               |
| `weather/warnings/route.ts`      | Weather warnings sub-endpoint                                                          |
| `traffic/route.ts`               | Traffic volume data                                                                    |
| `places/route.ts`                | Nearby amenities                                                                       |
| `intersections/route.ts`         | Cross road detection                                                                   |
| `nearest-intersections/route.ts` | Find nearest intersections                                                             |
| `admin-sync/route.ts`            | MRWA direct sync                                                                       |
| `overrides/route.ts`             | Override storage pass-through                                                          |
| `speed-compare/route.ts`         | MRWA vs OSM comparison                                                                 |
| `osm-speed/route.ts`             | OSM speed limit data                                                                   |
| `speed-verify/route.ts`          | Speed verification                                                                     |
| `speedlimit/route.ts`            | Speed limit lookup                                                                     |
| `download-signs/route.ts`        | Sign data download                                                                     |
| `export-pdf/route.ts`            | Work zone report export                                                                |
| `sync-data/route.ts`             | Offline data sync                                                                      |
| `route/route.ts`                 | Route API                                                                              |
| `emergency-stations/route.ts`    | Emergency facility locations                                                           |
| `hospitals/route.ts`             | Hospital locations from WA Health SLIP Services (Layers 6 & 7)                         |
| `nearest-hospital/route.ts`      | Nearest hospital from WA Health SLIP Services, includes nursing posts for remote areas |
| `police-stations/route.ts`       | Police station locations                                                               |
| `incidents/route.ts`             | Live road incidents                                                                    |
| `fuel-stations/route.ts`         | FuelWatch WA + Overpass merged fuel station search                                     |
| `qa/route.ts`                    | QA test data                                                                           |
| `qa-saved/route.ts`              | Saved QA results                                                                       |

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

### 3.4 React Hooks (src/hooks/)

| File                | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `useGpsTracking.ts` | GPS tracking with EKF, speed zones, speed alerts |
| `useOrientation.ts` | Screen orientation detection                     |
| `use-mobile.ts`     | Mobile device detection                          |
| `use-toast.ts`      | Toast notification hook                          |

### 3.5 React Components (src/components/)

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
| `ui/`                           | shadcn/ui components (Radix primitives)         |

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
| `create_user_manual_pdf.py`   | Generate PDF user manual           |

---

## 5. Documentation (docs/)

| File                                            | Purpose                       |
| ----------------------------------------------- | ----------------------------- |
| `TC_Work_Zone_Locator_RC1_Documentation.md`     | Main documentation            |
| `TC_Work_Zone_Locator_Data_Dictionary.md`       | Data structures               |
| `TC_Work_Zone_Locator_File_Structure.md`        | This file                     |
| `TC_Work_Zone_Locator_Direction_Aware_Zones.md` | Bidirectional zones           |
| `TC_Work_Zone_Locator_Data_Sources.md`          | Data sources                  |
| `TC_Work_Zone_Locator_Program_Logic.md`         | Program logic                 |
| `TC_Work_Zone_Locator_User_Manual.md`           | User manual                   |
| `RC1_Test_Checklist.md`                         | Testing checklist             |
| `RC1.4.2_Key_Learnings.md`                      | AI context and learnings      |
| `Work_Zone_Report_Implementation_Guide.md`      | Report implementation         |
| `BOM_Warnings_Integration_Mockup.md`            | Future: BOM integration       |
| `Road_Incidents_Integration_Mockup.md`          | Future: Incidents integration |
| `screenshots/`                                  | Test screenshots              |

---

## 6. Static Data (public/data/)

| Directory/File        | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `roads/`              | Road geometry JSON files by region          |
| `metadata.json`       | Region list and download metadata           |
| `pavement.json`       | Pavement data (lanes, widths)               |
| `traffic-volume.json` | Traffic count data                          |
| `amenities.json`      | Nearby amenities (hospitals, fuel, toilets) |

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

### 7.6 Library Modules (src/lib/)

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

| Version   | Date       | Key Changes                                                                         |
| --------- | ---------- | ----------------------------------------------------------------------------------- |
| RC 1.9.8  | June 2026  | Fuel stations (FuelWatch WA + Overpass), hospital type badges, amenity data sources |
| RC 1.9.7  | March 2026 | Max Hold Time calc, shuttle flow fix, clearance time fix, UI improvements           |
| RC 1.9.1  | March 2026 | Speeding alerts with WA fine info, minutes per km, 10km time                        |
| RC 1.9.0  | March 2026 | Traffic Counter feature, Documents Library                                          |
| RC 1.8.0  | March 2026 | QA page, Settings Drawer consolidation                                              |
| RC 1.7.18 | March 2026 | Signage Corridor intersection fix (Layer 6)                                         |
| RC 1.7.17 | March 2026 | Emergency cross road detection, shared module                                       |
| RC 1.7.14 | March 2026 | Emergency location enhancement                                                      |
| RC 1.6.0  | March 2026 | AfterCare Map View, Leaflet integration                                             |
| RC 1.5.0  | March 2026 | Nearby Signs page, filtered view                                                    |
| RC 1.4.0  | March 2026 | AfterCare signage tracking system                                                   |
| RC 1.2.1  | March 2026 | Override zone visual indicator                                                      |
| RC 1.2.0  | March 2026 | Speed sign override system                                                          |
| RC 1.0    | March 2026 | Official release candidate                                                          |

---

_This document is maintained as part of the TC Work Zone Locator documentation suite._
