# TC Work Zone Locator

## RC 1.2.1 Documentation Supplement

### New Features and Changes

**Version: RC 1.2.1**

**Date: March 4, 2026**

---

## Table of Contents

1. Version History Summary
2. Speed Sign Override System
3. Override Zone Visual Indicator
4. New API Endpoints
5. New Data Structures
6. New Functions
7. New Glossary Terms
8. New Files
9. Version Consistency Check

---

## 1. Version History Summary

### RC 1.2.1 - Override Zone Visual Indicator

**Released: March 2026**

**New Features:**
- Pulsating ✓ icon appears when driving through community-verified speed zones
- Green border around speed limit circle indicates override zone
- "VERIFIED" label and "Community Verified Zone" text for clarity
- Added currentOverrideZone computed value using useMemo

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

**Mobile Export Fix:**
- Export displays data in textarea for copy/paste (mobile-friendly)
- Added "Copy to Clipboard" button

**Documentation:**
- Merged AI_CONTEXT.md into PROJECT_CONTEXT.md

### RC 1.0.4 - Sign-Based Override System

**Released: March 2026**

- New sign-based override system with direction, sign_type, replicated fields
- Zone generation logic for single/double sided signs
- New override UI with full sign configuration form

### RC 1.0.3 - Speed Zone Override System

**Released: March 2026**

- Override management page at /overrides
- MRWA Exception Report generator
- GPS-verified sign locations
- Community-verified corrections take precedence over MRWA data

### RC 1.0.2 - Road Priority Fix

**Released: March 2026**

- Fixed road priority causing State Road shown when on Local Road
- Priority now used as 50m tiebreaker only
- Automatic IndexedDB clearing before download

### RC 1.0.1 - GPS Priority Fix

**Released: March 2026**

- Fixed GPS tracking prioritizing Local Roads over State Roads
- Added road type priority system

---

## 2. Speed Sign Override System

### 2.1 Overview

The Speed Sign Override System allows Traffic Controllers to record community-verified corrections to MRWA speed zone data. This is essential when physical signs differ from MRWA database records, which can occur after road works, sign relocations, or data entry errors.

### 2.2 Override Page (/overrides)

The override management page provides:

- Table of all existing overrides with full metadata
- Form for adding new speed sign overrides
- Export functionality (copy/paste for mobile)
- Import from JSON file
- Delete individual overrides
- Clear all overrides option

### 2.3 Sign Data Structure

Each override captures complete sign information:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| road_id | string | MRWA road identifier |
| road_name | string | Full road name |
| slk | number | Straight line kilometre |
| direction | string | "True Left" or "True Right" |
| sign_type | string | "Single" or "Double" |
| replicated | boolean | Has matching opposite sign |
| front_speed | number | Speed on front face |
| back_speed | number | Speed on back face (double signs) |

### 2.4 Zone Generation Logic

The `signsToSpeedZones()` function converts signs to zones:

1. Double signs with different front/back speeds → TWO zones
2. Double signs with same speeds → ONE Single carriageway zone
3. Single replicated signs → ONE directional zone
4. Single non-replicated → No zone (repeater only)

---

## 3. Override Zone Visual Indicator

### 3.1 Purpose

When driving through a community-verified speed zone, the application provides clear visual feedback to distinguish MRWA data from field-verified zones.

### 3.2 Visual Elements

When in an override zone:

- Speed limit circle has GREEN border (instead of white)
- Pulsating ✓ icon appears next to speed limit
- "VERIFIED" label displayed
- "Community Verified Zone" text shown below

### 3.3 Implementation

The drive page computes `currentOverrideZone` using useMemo:

- Checks if current SLK is within any override zone for current road
- Checks if direction matches the override zone direction
- Returns matching override or null

---

## 4. New API Endpoints

### 4.1 Override Storage

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/overrides` | GET | Get all overrides |
| `/api/overrides` | POST | Save overrides |
| `/api/overrides` | DELETE | Clear all overrides |

### 4.2 Speed Comparison

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/speed-comparison` | GET | Compare MRWA vs override speeds |

### 4.3 Other New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/export-overrides` | GET | Export overrides as JSON |
| `/api/import-overrides` | POST | Import overrides from file |

---

## 5. New Data Structures

### 5.1 SpeedSignOverride

TypeScript interface for speed sign overrides:

```typescript
interface SpeedSignOverride {
  id: string;
  road_id: string;
  road_name: string;
  common_usage_name?: string;
  slk: number;
  lat?: number;
  lon?: number;
  direction: "True Left" | "True Right";
  sign_type: "Single" | "Double";
  replicated: boolean;
  start_slk: number;
  end_slk?: number;
  approach_speed?: number;
  front_speed: number;
  back_speed?: number;
  verified_by?: string;
  verified_date?: string;
  note?: string;
  source?: string;
}
```

### 5.2 GeneratedSpeedZone

Zone generated from sign data:

```typescript
interface GeneratedSpeedZone {
  road_id: string;
  start_slk: number;
  end_slk: number;
  speed_limit: number;
  carriageway: "Left" | "Right" | "Single";
  source_id: string;
  is_override: true;
}
```

---

## 6. New Functions

### 6.1 offline-db.ts

| Function | Description |
|----------|-------------|
| `saveOverrides()` | Save overrides to localStorage |
| `loadOverrides()` | Load overrides from localStorage |
| `clearOverrides()` | Clear all override data |

### 6.2 signsToSpeedZones() Logic

1. For each sign, determine zone creation based on sign_type and replicated
2. Double signs with different front/back speeds → TWO zones
3. Double signs with same speeds → ONE Single carriageway zone
4. Single replicated signs → ONE directional zone
5. Single non-replicated → No zone (repeater only)

---

## 7. New Glossary Terms

| Term | Definition |
|------|------------|
| **Speed Sign Override** | A community-verified correction to MRWA speed zone data. Overrides are stored locally and take precedence over MRWA data for speed limit display. |
| **Override Zone** | A speed zone that has been corrected through user field verification. Identified in the UI by green border and pulsating checkmark icon. |
| **Double-Sided Sign** | A speed restriction sign with different speed limits displayed on each face, for different directions of traffic. Uses front_speed for the face in the indicated direction, and back_speed for the opposite face. |
| **Replicated Sign** | A speed sign that has a matching sign on the opposite side of the road, creating zones for both directions of travel. |
| **Community Verified** | Data that has been verified by field observation rather than from MRWA database. Marked with source: "community_verified" in override data. |
| **localStorage Override** | Override data stored in the browser's localStorage, enabling persistence across sessions without server-side storage. |

---

## 8. New Files

### 8.1 Page Components

| File | Description |
|------|-------------|
| `src/app/overrides/page.tsx` | Override management page |

### 8.2 API Routes

| File | Description |
|------|-------------|
| `src/app/api/overrides/route.ts` | Override CRUD operations |
| `src/app/api/speed-comparison/route.ts` | Speed comparison logic |

### 8.3 Scripts

| File | Description |
|------|-------------|
| `scripts/version-check.ts` | Version consistency checker |

---

## 9. Version Consistency Check

### 9.1 Overview

An automated script checks version consistency across all project files to prevent documentation drift.

### 9.2 Usage

```bash
bun run version-check
```

### 9.3 Files Checked

- `src/app/page.tsx` - App header version
- `src/app/drive/page.tsx` - Drive page version
- `src/app/overrides/page.tsx` - Overrides page version
- `PROJECT_CONTEXT.md` - Current Version header
- `README.md` - Version history (Current) marker
- `worklog.md` - Current Version header
- `RC1_Test_Checklist.md` - Title version

### 9.4 Output Example

On success:
```
✅ All versions match: RC 1.2.1
```

On mismatch:
```
⚠️ VERSION MISMATCH DETECTED!
   Found 2 different versions:
   - RC 1.2.0
   - RC 1.2.1
```
