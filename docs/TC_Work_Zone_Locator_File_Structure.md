# TC Work Zone Locator

## File Structure Documentation

**Version RC 1.7.18**

---

## 1. Project Overview

The TC Work Zone Locator is a Next.js 15 application built with the App Router architecture. This document provides a comprehensive reference of all files and directories in the project, designed specifically for Traffic Controllers in Western Australia to locate work zones, track GPS position, manage signage (AfterCare), and work offline in remote areas.

---

## 2. Root Directory Structure

| File/Directory | Purpose |
|----------------|---------|
| `src/` | Source code |
| `public/` | Static assets |
| `docs/` | Documentation |
| `scripts/` | Build/utility scripts |
| `prisma/` | Database schema |
| `package.json` | Dependencies and scripts |
| `README.md` | Project readme |
| `PROJECT_CONTEXT.md` | Single source of truth for AI |
| `worklog.md` | Development work log |
| `RC1_Test_Checklist.md` | Testing checklist |

---

## 3. Source Code Structure (src/)

### 3.1 Application Pages (src/app/)

| File | Purpose |
|------|---------|
| `page.tsx` | Home page - Work zone lookup |
| `drive/page.tsx` | GPS tracking page with EKF filtering |
| `drive/nearby-signs/page.tsx` | Nearby signs requiring action |
| `overrides/page.tsx` | Speed sign override management |
| `aftercare/page.tsx` | AfterCare job management |
| `aftercare/map/page.tsx` | AfterCare map with Leaflet |
| `calibrate/page.tsx` | GPS calibration tool |
| `manual/page.tsx` | User manual page |
| `layout.tsx` | Root layout |
| `globals.css` | Global styles |

### 3.2 API Routes (src/app/api/)

| Route | Purpose |
|-------|---------|
| `roads/route.ts` | Road data, SLK coordinates |
| `gps/route.ts` | GPS to SLK conversion |
| `weather/route.ts` | Weather data (Open-Meteo) |
| `warnings/route.ts` | BOM weather warnings RSS |
| `traffic/route.ts` | Traffic volume data |
| `places/route.ts` | Nearby amenities |
| `intersections/route.ts` | Cross road detection |
| `admin-sync/route.ts` | MRWA direct sync |
| `overrides/route.ts` | Override storage pass-through |
| `speed-compare/route.ts` | MRWA vs OSM comparison |
| `osm-speed/route.ts` | OSM speed limit data |
| `speed-verify/route.ts` | Speed verification |
| `speedlimit/route.ts` | Speed limit lookup |
| `download-signs/route.ts` | Sign data download |
| `export-pdf/route.ts` | Work zone report export |
| `sync-data/route.ts` | Offline data sync |
| `route/route.ts` | Route API |

### 3.3 Library Modules (src/lib/)

| File | Purpose |
|------|---------|
| `offline-db.ts` | IndexedDB storage, sign-to-zone logic |
| `aftercare.ts` | AfterCare job/sign storage and management |
| `emergency.ts` | Emergency location functions (cross road, nearest town, facilities) |
| `route-optimizer.ts` | Route optimization for retrieval/maintenance |
| `mrwa_api.ts` | MRWA ArcGIS API integration |
| `gps-ekf.ts` | Extended Kalman Filter for GPS |
| `utils.ts` | Haversine distance, bearing, direction utilities |
| `db.ts` | Database utilities |
| `download-roads.ts` | Static data loader |

### 3.4 React Hooks (src/hooks/)

| File | Purpose |
|------|---------|
| `useGpsTracking.ts` | GPS tracking with EKF, speed zones |
| `useOrientation.ts` | Screen orientation detection |
| `use-mobile.ts` | Mobile device detection |
| `use-toast.ts` | Toast notification hook |

### 3.5 React Components (src/components/)

| File | Purpose |
|------|---------|
| `SignageMap.tsx` | Map component for signage display |
| `ui/` | shadcn/ui components (Radix primitives) |

---

## 4. Scripts (scripts/)

| File | Purpose |
|------|---------|
| `download-roads.js` | Download MRWA road data |
| `download-signage.mjs` | Download signage data |
| `download-additional-data.js` | Download pavement and traffic data |
| `download-amenities.js` | Download OpenStreetMap amenities |
| `version-check.sh` | Version consistency checker |
| `read-docx.mjs` | Document reader utility |
| `create_user_manual_pdf.py` | Generate PDF user manual |

---

## 5. Documentation (docs/)

| File | Purpose |
|------|---------|
| `TC_Work_Zone_Locator_RC1_Documentation.md` | Main documentation |
| `TC_Work_Zone_Locator_Data_Dictionary.md` | Data structures |
| `TC_Work_Zone_Locator_File_Structure.md` | This file |
| `TC_Work_Zone_Locator_Direction_Aware_Zones.md` | Bidirectional zones |
| `TC_Work_Zone_Locator_Data_Sources.md` | Data sources |
| `TC_Work_Zone_Locator_Program_Logic.md` | Program logic |
| `TC_Work_Zone_Locator_User_Manual.md` | User manual |
| `RC1_Test_Checklist.md` | Testing checklist |
| `Work_Zone_Report_Implementation_Guide.md` | Report implementation |

---

## 6. Static Data (public/data/)

| Directory/File | Purpose |
|----------------|---------|
| `roads/` | Road geometry JSON files by region |
| `metadata.json` | Region list and download metadata |
| `pavement.json` | Pavement data (lanes, widths) |
| `traffic-volume.json` | Traffic count data |
| `amenities.json` | Nearby amenities (hospitals, fuel, toilets) |

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

- **`page.tsx`**: Main GPS tracking with EKF filtering, speed zone lookahead
- **`nearby-signs/page.tsx`**: Shows only signs requiring action (retrieval/maintenance)

### 7.3 Library Modules (src/lib/)

#### aftercare.ts
Comprehensive AfterCare data management including:
- Type definitions: `AfterCareJob`, `AfterCareSign`, `RetrievalType`, `SignStatus`
- Storage functions: `getAfterCareJobs()`, `saveAfterCareJobs()`, `createAfterCareJob()`
- Sign management: `addSignToJob()`, `updateSignInJob()`, `markSignRetrieved()`
- Status calculations: `calculateSignStatus()`, `calculateJobStatus()`
- Navigation: `generateMapsUrl()`, `getNearbySigns()`

#### route-optimizer.ts
Route optimization for multi-stop signage retrieval:
- `optimizeRoute()`: Optimize sign visit order
- `getAllSignsDueForRetrieval()`: Get all signs needing retrieval
- `getAllSignsDueForMaintenance()`: Get all signs needing maintenance
- `generateReport()`: Create AfterCare report

---

## 8. Data Storage Architecture

| Data Type | Storage | Why |
|-----------|---------|-----|
| Road geometry, MRWA data | IndexedDB | Large datasets, offline access |
| Speed sign overrides | localStorage | User-editable, works on Vercel |
| AfterCare jobs & signs | localStorage | User-editable, offline tracking |
| App preferences | localStorage | Simple key-value |

---

## 9. Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| RC 1.7.18 | March 2026 | Signage Corridor intersection fix (Layer 6) |
| RC 1.7.17 | March 2026 | Emergency cross road detection, shared module |
| RC 1.7.14 | March 2026 | Emergency location enhancement |
| RC 1.6.0 | March 2026 | AfterCare Map View, Leaflet integration |
| RC 1.5.0 | March 2026 | Nearby Signs page, filtered view |
| RC 1.4.0 | March 2026 | AfterCare signage tracking system |
| RC 1.2.1 | March 2026 | Override zone visual indicator |
| RC 1.2.0 | March 2026 | Speed sign override system |
| RC 1.0 | March 2026 | Official release candidate |

---

*This document is auto-generated and maintained as part of the TC Work Zone Locator documentation suite.*
