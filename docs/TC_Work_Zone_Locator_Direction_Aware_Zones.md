# Direction-Aware Speed Zones

## Technical Addendum for RC 1.7.18

### Bidirectional Speed Zone Detection and Manual Corrections

---

## 1. Introduction

This addendum documents the Direction-Aware Speed Zone feature implemented in the TC Work Zone Locator application. This feature addresses a critical issue where MRWA speed zone data incorrectly records bidirectional zones (roads with different speed limits per direction) as single carriageway zones with only one speed limit.

The problem was discovered on M031 at SLK 67.34-67.62 where a double-sided speed sign displays 60 km/h for True Right direction and 90 km/h for True Left direction, but MRWA data only shows 90 km/h for the entire section. This caused the application to display incorrect speed limits for users traveling in the True Right direction.

---

## 2. Problem Statement

MRWA's speed zone data structure uses a 'carriageway' field to differentiate between 'Right', 'Left', and 'Single' road sections. However, many bidirectional zones are incorrectly recorded as 'Single' with only one speed limit, when they actually have different speed limits for each direction of travel.

### Example: M031 Speed Zone Data

| SLK Range | MRWA Speed | Carriageway | Reality |
|-----------|------------|-------------|---------|
| 67.340 - 69.180 | 90 km/h | Single | 60 Right / 90 Left |

---

## 3. Solution Architecture

The solution implements three key components: direction detection, speed zone lookup, and manual correction management. The system detects the direction of travel (increasing or decreasing SLK), matches it to the appropriate carriageway (True Right or True Left), and applies any user-defined corrections when MRWA data is inaccurate.

### 3.1 Direction Detection

The system tracks SLK movement to determine travel direction. When SLK values increase over time, the user is traveling toward higher SLK values (True Right). When SLK values decrease, the user is traveling toward lower SLK values (True Left). This direction is stored in state and used for speed zone matching.

**Direction Mapping:**

| SLK Movement | Direction Terminology |
|--------------|----------------------|
| Increasing (SLK values go up) | True Right |
| Decreasing (SLK values go down) | True Left |

### 3.2 Direction-Aware Speed Zone Lookup

The `getSpeedLimitForDirection()` function checks for Right/Left carriageway zones first, then falls back to Single carriageway zones. When directional zones exist, the function returns the speed limit matching the current travel direction. This ensures correct speed limits are displayed even when MRWA has properly recorded directional zones.

### 3.3 Manual Speed Zone Corrections

For cases where MRWA data is incorrect (Single carriageway recorded when directional zones exist), the system supports user-defined corrections. Corrections are stored in localStorage and applied automatically when the user enters a corrected zone while traveling in the specified direction.

---

## 4. Road Type Priority System

When GPS tracking is active, the system must determine which road the user is traveling on. Previously, the system simply returned the closest road within the search radius. This caused issues where Local Roads were incorrectly matched instead of State Roads (M-roads, H-roads) when the GPS position was slightly offset.

The fix implements a priority-based matching system that prefers State Roads over Local Roads:

| Priority | Road Type | Examples |
|----------|-----------|----------|
| 1 (Highest) | State Roads | M031, H005, M010, M026 |
| 2 | Regional Roads | R-roads |
| 3 | Local Roads | Local streets |
| 4 (Lowest) | Miscellaneous | Unknown types |

**How it works:**

- The system collects all candidate roads within 500m of the GPS position
- Candidates are sorted by priority first (State Roads > Local Roads)
- Within the same priority, candidates are sorted by distance
- The best match is returned

**Priority as Tiebreaker (RC 1.0.2 Fix):**

Priority only applies as a tiebreaker when distances are within 50m:
- If State Road is 103m away and Local Road is 20m away → Local Road selected (correct)
- If State Road is 50m away and Local Road is 45m away → State Road selected (correct)

---

## 5. New Functions Reference

### 5.1 Speed Zone Functions (src/lib/offline-db.ts)

| Function | Description |
|----------|-------------|
| `getSpeedLimitForDirection()` | Get speed limit for current SLK considering travel direction |
| `getSpeedZoneCorrections()` | Get all stored speed zone corrections from localStorage |
| `addSpeedZoneCorrection()` | Add a new speed zone correction for a road/direction |
| `removeSpeedZoneCorrection()` | Remove a specific speed zone correction |
| `clearSpeedZoneCorrections()` | Clear all stored speed zone corrections |
| `applySpeedZoneCorrections()` | Apply corrections to speed limit for current location/direction |
| `getRoadTypePriority()` | Get priority level for road type (State > Regional > Local) |

---

## 6. Data Structures

### 6.1 SpeedZoneCorrection Interface

| Field | Type | Description |
|-------|------|-------------|
| `road_id` | string | Road identifier (e.g., 'M031') |
| `start_slk` | number | Start SLK of correction zone |
| `end_slk` | number | End SLK of correction zone |
| `direction` | 'increasing' \| 'decreasing' | Travel direction (increasing=True Right, decreasing=True Left) |
| `correct_speed` | number | Correct speed limit (km/h) |
| `original_speed` | number | Original (incorrect) MRWA speed |
| `notes` | string (optional) | User notes about the correction |
| `created_at` | string | ISO timestamp of creation |

---

## 7. Usage Guide

### 7.1 Accessing Speed Zone Corrections

Users can add speed zone corrections through the Drive page UI. Navigate to Tools (wrench icon) and select 'Speed Zone Corrections'. The form allows manual entry of all correction parameters.

### 7.2 Correction Form Fields

The correction form supports manual entry for any road, without requiring active GPS tracking:

| Field | Description |
|-------|-------------|
| Road ID | Manual entry field (e.g., M031). Auto-converts to uppercase. |
| Direction | Two buttons: 'True Right' or 'True Left'. No technical terms shown. |
| Start SLK | Start of correction zone (lower SLK value) |
| End SLK | End of correction zone (higher SLK value) |
| MRWA Speed | The incorrect speed from MRWA data |
| Correct Speed | The actual speed limit at this location |
| Notes | Optional notes about the correction |

### 7.3 Example: M031 Correction

For the M031 bidirectional zone issue at SLK 67.34-67.62:

| Field | Value |
|-------|-------|
| Road ID | M031 |
| Direction | True Right (button selection) |
| Start SLK | 67.340 |
| End SLK | 67.620 |
| MRWA Speed | 90 |
| Correct Speed | 60 |
| Notes | Double-sided sign: 60 True Right, 90 True Left |

---

## 8. Signage Corridor Display

The Signage Corridor dialog has been simplified with neutral colors and reduced visual noise:

**Changes Made:**

- Removed intersection warning messages (e.g., '100m from Malabaine Rd intersection')
- Changed row backgrounds from red/amber to neutral gray
- Removed 'COVER REQUIRED' action text
- Removed 'Signs requiring cover' count
- Changed footer warning to neutral information text

---

## 9. Bidirectional Speed Zone Lookahead (v5.3.2)

### 9.1 Overview

The speed zone lookahead feature was enhanced to work in both SLK directions. Previously, it only detected speed decreases when traveling in the increasing SLK direction. Now it correctly warns of speed decreases from either direction.

### 9.2 Implementation

- Added `slkDirection` state to track 'increasing' or 'decreasing' travel
- Display shows direction indicator (↑/↓) next to SLK value
- Lookahead calculation uses appropriate zone boundary based on direction
- Example: M031 SLK 67.64 has 60→90 (increasing) and 90→60 (decreasing) signs

### 9.3 Visual Indicators

| Border Color | Meaning |
|--------------|---------|
| White | Current speed zone, no change ahead |
| Yellow/Amber | Speed DECREASE approaching |
| Green | Community-verified override zone |

---

## 10. Override Zone Visual Indicator (RC 1.2.1)

### 10.1 Purpose

When driving through a community-verified speed zone, the application provides clear visual feedback to distinguish MRWA data from field-verified zones.

### 10.2 Visual Elements

When in an override zone:

- Speed limit circle has GREEN border (instead of white)
- Pulsating ✓ icon appears next to speed limit
- "VERIFIED" label displayed
- "Community Verified Zone" text shown below

### 10.3 Implementation

The drive page computes `currentOverrideZone` using `useMemo`:

- Checks if current SLK is within any override zone for current road
- Checks if direction matches the override zone direction
- Returns matching override or null

---

## 11. Technical Notes

Corrections are stored in localStorage under the key `speedZoneCorrections`. This means corrections persist across browser sessions but are specific to each device. Corrections are applied in the `getSpeedLimitForDirection()` function after checking MRWA carriageway data but before returning the final speed limit.

The direction detection algorithm requires a minimum speed of 5 km/h and a minimum SLK change of 0.001 km (1 meter) to determine direction. This prevents GPS jitter from causing false direction changes when stationary or moving slowly.

---

## 12. AfterCare Integration (RC 1.4.0+)

The direction-aware zone system integrates with the AfterCare signage tracking system:

- Signs stored in AfterCare include direction (True Left / True Right)
- Nearby signs feature shows signs based on travel direction
- Navigation links open Google Maps for sign retrieval
- Route optimization considers direction for efficient sign visits

---

*This document is part of the TC Work Zone Locator documentation suite, Version RC 1.7.18.*
