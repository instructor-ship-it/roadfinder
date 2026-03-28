# TC Work Zone Locator - Continuation Prompt

> **Last Updated:** 2026-03-18
> **Current Version:** RC 1.7.28

---

## 🚀 STARTUP COMMANDS

Run these commands at the start of each new session:

```bash
cd /home/z/my-project
rm -rf * .* 2>/dev/null || true
git clone https://github.com/instructor-ship-it/roadfinder.git .
bun install
```

Then read `PROJECT_CONTEXT.md` and `worklog.md` to get up to speed.

---

## 📍 WHERE WE LEFT OFF (2026-03-17)

### ✅ COMPLETED TODAY

1. **Signage Corridor Intersection Detection - FIXED**
   - Updated work zone reports to use `crossRoads` from `/api/intersections` (MRWA Layer 6)
   - Previously used buggy `findIntersectionsInCorridor()` which found parallel roads
   - Now correctly shows only actual intersecting roads within TC zone
   - Both text and HTML reports updated

2. **Code Cleanup**
   - Removed buggy intersection markers from `getSignageInCorridor()` in offline-db.ts
   - Updated `CrossRoad` interface to include `intersectionSlk` field

3. **Previous Session (RC 1.7.17)**
   - Created shared `src/lib/emergency.ts` module
   - Fixed emergency cross road detection
   - Added utility functions: `getBearing()`, `getDirectionFromBearing()`, `formatDistance()`

### ✅ ALL KNOWN ISSUES RESOLVED

The "SIGNAGE CORRIDOR" section now correctly shows only actual intersections within the TC zone, matching the "INTERSECTING ROADS IN TC ZONE" section.

---

## 🔧 KEY FILES

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main page - work zone report generation |
| `src/lib/offline-db.ts` | IndexedDB and offline data (signage corridor) |
| `src/app/api/intersections/route.ts` | API for Layer 6 intersection queries |
| `src/lib/emergency.ts` | Shared emergency functions |

---

## 📦 KEY DATA SOURCES

| Layer | Name | Purpose |
|-------|------|---------|
| Layer 6 | Intersections | Point layer with accurate intersection names (`NODE_DESCR` field) |
| Layer 17 | State Road Network | Road geometry and SLK data |
| Layer 24 | All Roads | Includes local roads |

---

## 🌐 GITHUB REPOSITORY

- **URL:** https://github.com/instructor-ship-it/roadfinder.git
- **Branches:** master, main (kept in sync)
- **Push to both:**
  ```bash
  git push origin master
  git push origin main
  ```

---

## 💡 TIPS FOR THE AI

1. **Layer 6 (Intersections)** is the gold standard for intersection names
   - Field `NODE_DESCR` contains names like "Dawson St & Elizabeth St"
   - Use this for accurate cross road detection

2. **ArcGIS API limits** - Always set `resultRecordCount` high enough for radius queries
   - Default is often 50, which can cut off nearby results
   - We increased to 200 for intersections

3. **SLK ranges** - TC zone is work zone ±100m
   - TC Start = work zone start - 0.1 km
   - TC End = work zone end + 0.1 km
   - Signage corridor is ±700m for signs, intersections via Layer 6 API

4. **Code organization** - New shared code goes in `src/lib/`
   - `emergency.ts` - Emergency location functions
   - `utils.ts` - General utilities
   - `offline-db.ts` - IndexedDB and offline data

---
