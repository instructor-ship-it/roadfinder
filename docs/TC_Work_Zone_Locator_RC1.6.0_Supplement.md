# TC Work Zone Locator

## RC 1.6.0 Documentation Supplement

### New Features and Changes

**Version: RC 1.6.0**

**Date: March 12, 2026**

---

## Table of Contents

1. Version History Summary
2. AfterCare Signage Tracking System
3. AfterCare Map View
4. Nearby Signs Page
5. New API Endpoints
6. New Data Structures
7. New Functions
8. New Glossary Terms
9. New Files
10. Version Consistency Check

---

## 1. Version History Summary

### RC 1.6.0 - AfterCare Map View

**Released: March 2026**

**New Features:**
- Full-screen OpenStreetMap with colored pins for all signs
- Filter buttons: All / Retrieval / Maintenance / Active
- Colored markers indicate sign status at a glance
- Popup details on tap: road ID, SLK, sign type, direction, description
- Legend bar at bottom shows color meanings
- Back button returns to AfterCare page
- Works with GPS coordinates stored in AfterCare jobs

**Technical Implementation:**
- Leaflet + react-leaflet for mapping
- Dynamic imports to disable SSR (required for Leaflet in Next.js)
- CSS-in-JS div icons for colored circle markers
- Fixed viewport layout (`fixed inset-0`) for proper map containment
- Auto-centers on signs, defaults to Perth if no signs

### RC 1.5.9 - Expanded Offline Data Support

**Released: March 2026**

**New Features:**
- Pavement data (MRWA Layer 12) - lanes, widths, shoulders
- Traffic volume (MRWA Layer 27) - AADT, peak hour, heavy vehicles
- Nearby amenities (OpenStreetMap) - hospitals, fuel stations, toilets
- Weather data caching (30 minutes, shows "last updated")

**API Improvements:**
- All APIs now fall back to offline data when network unavailable
- Added 5-second timeout to prevent indefinite hanging
- Offline fallback checked before API calls

### RC 1.5.0 - Nearby Signs Page & Filtered View

**Released: March 2026**

**New Features:**
- Dedicated page for viewing only signs requiring action
- Shows only due-retrieval and due-maintenance signs
- Inline SLK editing with Save/Cancel
- Google Maps navigation per sign
- Mark retrieved or mark due-early functionality
- "Open All in Google Maps" for route planning
- AfterCare indicator on drive page shows only signs requiring action

### RC 1.4.0 - AfterCare Signage Tracking System

**Released: March 2026**

**Major Changes:**
- New AfterCare module for tracking signage awaiting retrieval
- Job-based organization with multiple signs per job
- Sign categories: Surface, Speed, Hazard
- Retrieval scheduling: Standard, Scheduled, Maintain Daily/Weekly/Monthly, TBA
- Status tracking with auto-flagging
- Google Maps navigation links
- Export/Import for backup

### RC 1.3.0 - Set Distance & Lane Naming

**Released: March 2026**

**New Features:**
- Full screen modal display for distance tracking
- Large distance displays (7xl/8xl font)
- Lane names (L1, L2, etc.) for roads with 3+ lanes
- Correct curb-side numbering: L1 always closest to curb

### RC 1.2.1 - Override Zone Visual Indicator

**Released: March 2026**

**New Features:**
- Pulsating ✓ icon appears when driving through community-verified speed zones
- Green border around speed limit circle indicates override zone
- "VERIFIED" label and "Community Verified Zone" text for clarity

**Bug Fixes:**
- Fixed DEFAULT_SIGNS having wrong default direction (True Right → True Left)
- Prevents inverted speed zones from incorrect carriageway assignments

### RC 1.2.0 - Speed Sign Override System

**Released: March 2026**

**Major Changes:**
- Fixed double-sided sign interpretation - back_speed now used correctly
- Double signs with different speeds create TWO zones (one per direction)
- Double signs with same speeds create ONE Single carriageway zone

**Carriageway Mapping Corrections:**
- True Left = Left Carriageway = INCREASING SLK
- True Right = Right Carriageway = DECREASING SLK

---

## 2. AfterCare Signage Tracking System

### 2.1 Overview

The AfterCare Signage Tracking System allows Traffic Controllers to manage signs placed on roads that are awaiting retrieval. This is essential for tracking temporary signage used during road works, hazard warnings, or surface conditions that need to be monitored and eventually collected.

### 2.2 AfterCare Page (/aftercare)

The AfterCare management page provides:

- Table of all jobs grouped by status
- Form for adding new AfterCare jobs
- Sign entry with category, type, direction
- GPS capture for sign location
- Retrieval scheduling options
- Export/Import functionality
- Print report generator

### 2.3 Job Data Structure

Each job captures complete information:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| job_name | string | Job name (auto-generated or custom) |
| road_id | string | Road identifier (e.g., M031) |
| road_name | string | Official road name |
| notes | string | Optional notes |
| date_created | string | ISO date of creation |
| status | JobStatus | Computed from sign statuses |
| work_area_slk_start | number? | Optional work area start SLK |
| work_area_slk_end | number? | Optional work area end SLK |
| signs | AfterCareSign[] | Array of signs in this job |

### 2.4 Sign Data Structure

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| slk | number | Sign location SLK |
| lat | number? | GPS latitude |
| lon | number? | GPS longitude |
| category | SignCategory | 'surface', 'speed', or 'hazard' |
| sign_type | string | Sign type name |
| description | string | Detailed description |
| direction | SignDirection | 'True Left' or 'True Right' |
| placed_date | string | Date sign was placed |
| placed_time | string? | Time sign was placed (HH:MM) |
| retrieval_type | RetrievalType | Scheduling type |
| retrieval_date | string? | Scheduled retrieval date |
| last_maintained_date | string? | Last maintenance date |
| retrieved_date | string? | Date sign was retrieved |
| status | SignStatus | Current status |
| status_manually_set | boolean? | If user overrode status |
| notes | string | Additional notes |

### 2.5 Retrieval Types

| Type | Description | Due Condition |
|------|-------------|---------------|
| standard | Default retrieval | 2 days after placement |
| scheduled | Specific date | On retrieval_date |
| maintain-daily | Daily check | Every day |
| maintain-weekly | Weekly check | Every 7 days |
| maintain-monthly | Monthly check | Every 30 days |
| tba | To be advised | Indefinite |

### 2.6 Status Types

| Status | Description |
|--------|-------------|
| placed | Active, not yet due |
| due-retrieval | Ready for retrieval |
| due-maintenance | Needs maintenance check |
| maintained | Recently maintained |
| retrieved | Collected |

---

## 3. AfterCare Map View

### 3.1 Purpose

The AfterCare Map provides a visual overview of all sign locations with status-based coloring, making it easy to see which signs need attention at a glance.

### 3.2 Features

- **Full-screen OpenStreetMap** with Leaflet
- **Colored markers**:
  - Red: Due for retrieval
  - Yellow: Due for maintenance
  - Green: Active (not yet due)
  - Gray: Retrieved
- **Filter buttons**: All / Retrieval / Maintenance / Active
- **Popup details**: Click marker for sign information
- **Auto-center**: Centers on signs, defaults to Perth if none

### 3.3 Technical Implementation

The map uses dynamic imports to disable SSR (required for Leaflet in Next.js):

```typescript
const SignageMap = dynamic(() => import('@/components/SignageMap'), {
  ssr: false,
});
```

The page layout uses `fixed inset-0` for proper full-screen containment:

```typescript
<div className="fixed inset-0 flex flex-col bg-gray-900">
  <div className="flex-1 min-h-0">
    <SignageMap signs={allSigns} />
  </div>
</div>
```

---

## 4. Nearby Signs Page

### 4.1 Purpose

The Nearby Signs page (`/drive/nearby-signs`) shows only signs requiring action (due-retrieval and due-maintenance) for efficient field operations.

### 4.2 Features

- Filtered view of signs needing action
- Inline SLK editing with Save/Cancel
- Per-sign Google Maps navigation
- Mark retrieved or mark due-early
- Delete sign with confirmation
- "Open All in Google Maps" for route planning

### 4.3 Action Buttons

| Button | Function |
|--------|----------|
| Edt | Open job editor |
| Nav | Open Google Maps navigation |
| Ret | Mark as retrieved |
| Early | Mark as due early |
| Del | Delete sign |

---

## 5. New API Endpoints

### 5.1 Route API

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/route | GET | Route API |

### 5.2 Existing Endpoints (Enhanced)

| Endpoint | Changes |
|----------|---------|
| /api/roads | Added pavement data support |
| /api/weather | Added 30-minute caching |
| /api/sync-data | Enhanced offline support |

---

## 6. New Data Structures

### 6.1 AfterCareJob

```typescript
interface AfterCareJob {
  id: string;
  job_name: string;
  road_id: string;
  road_name: string;
  notes: string;
  date_created: string;
  status: JobStatus;
  work_area_slk_start?: number;
  work_area_slk_end?: number;
  signs: AfterCareSign[];
}
```

### 6.2 AfterCareSign

```typescript
interface AfterCareSign {
  id: string;
  slk: number;
  lat: number | null;
  lon: number | null;
  category: SignCategory;
  sign_type: string;
  description: string;
  direction: SignDirection;
  placed_date: string;
  placed_time?: string;
  retrieval_type: RetrievalType;
  retrieval_date?: string;
  last_maintained_date?: string;
  retrieved_date?: string;
  retrieved_time?: string;
  status: SignStatus;
  status_manually_set?: boolean;
  notes: string;
}
```

### 6.3 AfterCarePresets

```typescript
interface AfterCarePresets {
  surface: string[];
  speed: string[];
  hazard: string[];
}
```

### 6.4 Type Definitions

```typescript
type RetrievalType = 'standard' | 'scheduled' | 'maintain-daily' |
                     'maintain-weekly' | 'maintain-monthly' | 'tba';

type SignCategory = 'surface' | 'speed' | 'hazard';

type SignDirection = 'True Left' | 'True Right';

type SignStatus = 'placed' | 'due-retrieval' | 'due-maintenance' |
                  'maintained' | 'retrieved';

type JobStatus = 'active' | 'partial' | 'retrieved' | 'archived';

type ComputedJobStatus = 'due-retrieval' | 'due-maintenance' | 'tba' |
                         'active' | 'retrieved' | 'archived';

type MapFilter = 'all' | 'retrieval' | 'maintenance';
```

---

## 7. New Functions

### 7.1 aftercare.ts

| Function | Purpose |
|----------|---------|
| `getAfterCareJobs()` | Load all jobs from localStorage |
| `saveAfterCareJobs()` | Save jobs to localStorage |
| `createAfterCareJob()` | Create new job |
| `updateAfterCareJob()` | Update existing job |
| `deleteAfterCareJob()` | Delete job |
| `archiveAfterCareJob()` | Archive job |
| `unarchiveAfterCareJob()` | Unarchive job |
| `addSignToJob()` | Add sign to job |
| `updateSignInJob()` | Update sign in job |
| `removeSignFromJob()` | Remove sign from job |
| `markSignRetrieved()` | Mark sign as retrieved |
| `markSignMaintained()` | Mark sign as maintained |
| `markAllSignsRetrieved()` | Mark all signs in job retrieved |
| `markAllSignsMaintained()` | Mark all signs in job maintained |
| `calculateSignStatus()` | Calculate sign status from retrieval_type |
| `calculateJobStatus()` | Calculate job status from sign statuses |
| `updateSignStatuses()` | Update all sign statuses in job |
| `getStatusInfo()` | Get status label, color, icon |
| `getAfterCareStats()` | Get statistics about all jobs |
| `getJobsGroupedByStatus()` | Get jobs grouped by computed status |
| `getJobsForRoad()` | Get jobs for specific road |
| `getNearbySigns()` | Get nearby signs for drive page |
| `generateMapsUrl()` | Generate Google Maps URL with waypoints |
| `getSignStatusCounts()` | Count signs by status in job |
| `generateShareText()` | Generate shareable job summary |
| `exportAllJobs()` | Export all jobs as JSON |
| `importJobs()` | Import jobs from JSON |
| `getAfterCarePresets()` | Get sign type presets |
| `saveAfterCarePresets()` | Save presets |
| `addCustomPreset()` | Add custom preset |
| `removeCustomPreset()` | Remove custom preset |

### 7.2 route-optimizer.ts

| Function | Purpose |
|----------|---------|
| `optimizeRoute()` | Optimize sign visit order |
| `getAllSignsDueForRetrieval()` | Get all signs needing retrieval |
| `getAllSignsDueForMaintenance()` | Get all signs needing maintenance |
| `countSignsByStatus()` | Count signs by status across jobs |
| `generateReport()` | Generate AfterCare report |

### 7.3 offline-db.ts (Enhanced)

| Function | Changes |
|----------|---------|
| `getSpeedLimitForDirection()` | Enhanced with override zone detection |
| `applySpeedZoneCorrections()` | Improved correction application |

---

## 8. New Glossary Terms

### AfterCare

The signage tracking system for managing signs placed on roads awaiting retrieval. Includes job creation, sign tracking, status management, and navigation assistance.

### AfterCare Job

A container for multiple signs placed on a single road or work area. Jobs have computed status based on the signs they contain.

### AfterCare Sign

An individual sign tracked within an AfterCare job. Includes location (SLK, GPS), category, type, direction, retrieval schedule, and status.

### Retrieval Type

The scheduling method for sign retrieval:
- Standard: 2-day default
- Scheduled: Specific date
- Maintain: Periodic checks
- TBA: Indefinite

### Sign Status

The current state of a tracked sign:
- Placed: Active, not yet due
- Due Retrieval: Ready to collect
- Due Maintenance: Needs checking
- Maintained: Recently checked
- Retrieved: Collected

### Route Optimization

Automatic planning of efficient routes for retrieving multiple signs. Uses nearest-neighbor algorithm and generates Google Maps navigation URLs.

---

## 9. New Files

### 9.1 Page Components

| File | Purpose |
|------|---------|
| src/app/aftercare/page.tsx | AfterCare job management |
| src/app/aftercare/map/page.tsx | AfterCare map view |
| src/app/drive/nearby-signs/page.tsx | Nearby signs requiring action |
| src/app/manual/page.tsx | User manual page |

### 9.2 Library Files

| File | Purpose |
|------|---------|
| src/lib/aftercare.ts | AfterCare data management |
| src/lib/route-optimizer.ts | Route optimization for signs |
| src/lib/db.ts | Database utilities |

### 9.3 Component Files

| File | Purpose |
|------|---------|
| src/components/SignageMap.tsx | Leaflet map component |

### 9.4 Hook Files

| File | Purpose |
|------|---------|
| src/hooks/useOrientation.ts | Screen orientation detection |
| src/hooks/use-mobile.ts | Mobile device detection |

### 9.5 API Routes

| File | Purpose |
|------|---------|
| src/app/api/route/route.ts | Route API |

---

## 10. Version Consistency Check

### 10.1 Overview

An automated script checks version consistency across all project files to prevent documentation drift.

### 10.2 Usage

```bash
bun run version-check
```

### 10.3 Files Checked

- `src/app/page.tsx` - App header version
- `src/app/drive/page.tsx` - Drive page version
- `src/app/overrides/page.tsx` - Overrides page version
- `src/app/aftercare/page.tsx` - AfterCare page version
- `PROJECT_CONTEXT.md` - Current Version header
- `README.md` - Version history (Current) marker
- `worklog.md` - Current Version header
- `RC1_Test_Checklist.md` - Title version

### 10.4 Output Example

```
✅ All versions match: RC 1.6.0
```

Or on mismatch:

```
⚠️ VERSION MISMATCH DETECTED!

Found 2 different versions:
- RC 1.5.0
- RC 1.6.0
```

---

## 11. localStorage Keys

| Key | Purpose |
|-----|---------|
| `afterCareJobs` | AfterCare jobs array |
| `afterCarePresets` | Custom sign type presets |
| `speedZoneCorrections` | Speed zone corrections |
| `speedSignOverrides` | Speed sign overrides |
| `defaultRegion` | User's preferred region |
| `gpsSettings` | GPS/EKF configuration |

---

*This document is part of the TC Work Zone Locator documentation suite, Version RC 1.6.0.*
