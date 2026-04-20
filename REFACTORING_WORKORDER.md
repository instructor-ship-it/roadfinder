# page.tsx Refactoring Workorder

> **Purpose**: Step-by-step instructions for extracting components and hooks from `src/app/page.tsx` (1987 lines).
> Each item is self-contained, verifiable, and can be done one at a time.
> After completing any item, run verification, commit, push to GitHub, then mark it DONE below.

---

## How to Use This File

1. Find the next `[ ]` (incomplete) item below
2. Follow the instructions exactly — they specify what to create, what to move, and what to delete
3. After each item, run the **Verification Steps** at the bottom of this file
4. If all checks pass: commit, push to GitHub, update this file's status to `[x]`, commit & push this file too
5. If checks fail: fix the issue before moving on. Do NOT mark the item as done.
6. If your session times out: read this file to see what's done and what's next

**Rules**:

- ONE item at a time. Never batch items.
- Always verify before marking done.
- Always push to GitHub after each item.
- Preserve all existing functionality — refactoring must not change behavior.

---

## Critical Discovery: Dead Code in page.tsx

Several components and hooks **already exist** in the codebase but are NOT used in page.tsx.
page.tsx has **duplicate inline implementations** of these extracted components.
Phase 1 items simply delete the inline duplicates and wire up the existing extracted versions.
This is the lowest-risk, highest-reward work.

---

## Phase 1: Replace Inline JSX with Existing Extracted Components

### Item 1.1: Use Existing WeatherSection Component

**Status**: [x]

**Problem**: `WeatherSection` component exists at `src/components/home/WeatherSection.tsx` and is already imported in page.tsx (line 24), but page.tsx renders weather content INLINE (lines 1520-1670) instead of using the component.

**What to do**:

1. Open `src/app/page.tsx`
2. Locate the inline Weather JSX block. It starts with:
   ```jsx
   {/* Weather with Sun Data */}
   <SectionErrorBoundary sectionName="Weather">
     {weather && (
       <div className="bg-gray-800 rounded-lg">
   ```
   This is inside the `{result && ( ... )}` block, after the TrafficVolumeSection.
3. Replace the ENTIRE inline weather block (from `{/* Weather with Sun Data */}` through the closing `</SectionErrorBoundary>`) with:
   ```jsx
   {
     /* Weather with Sun Data */
   }
   <SectionErrorBoundary sectionName="Weather">
     <WeatherSection
       weather={weather}
       warnings={warnings}
       windGustThreshold={windGustThreshold}
       showWeather={showWeather}
       onToggle={() => setShowWeather(!showWeather)}
       getUvColor={getUvColor}
     />
   </SectionErrorBoundary>;
   ```
4. Verify the `WeatherSection` import already exists at line 24: `import { WeatherSection } from '@/components/home/WeatherSection';`
5. The inline `getUvColor` function (around line 1174) must remain in page.tsx since it's passed as a prop.

**Lines to remove**: ~150 lines of inline JSX (lines 1520-1670 approximately)

**Verification**: The WeatherSection component accepts these props: `weather`, `warnings`, `windGustThreshold`, `showWeather`, `onToggle`, `getUvColor`. Compare the existing component's props interface with what you're passing. The existing component signature is:

```typescript
interface WeatherSectionProps {
  weather: WeatherData | null;
  warnings: WarningData | null;
  windGustThreshold: number;
  showWeather: boolean;
  onToggle: () => void;
  getUvColor: (level: string) => string;
}
```

---

### Item 1.2: Use Existing AmenitiesSection Component

**Status**: [x]

**Problem**: `AmenitiesSection` component exists at `src/components/home/AmenitiesSection.tsx` and is already imported in page.tsx (line 26), but page.tsx renders amenities content INLINE (lines 1682-1890).

**What to do**:

1. Open `src/app/page.tsx`
2. Locate the inline Amenities JSX block. It starts with:
   ```jsx
   {/* Nearby Amenities */}
   <SectionErrorBoundary sectionName="Amenities">
     {places && (
       <div className="bg-gray-800 rounded-lg">
   ```
3. Replace the ENTIRE inline amenities block with:
   ```jsx
   {
     /* Nearby Amenities */
   }
   <SectionErrorBoundary sectionName="Amenities">
     <AmenitiesSection
       places={places}
       showAmenities={showAmenities}
       onToggle={() => setShowAmenities(!showAmenities)}
       onOpenGoogleMaps={(url) => openGoogleMaps(url)}
       onOpenStreetView={openStreetView}
     />
   </SectionErrorBoundary>;
   ```
4. Verify the `AmenitiesSection` import already exists at line 26: `import { AmenitiesSection } from '@/components/home/AmenitiesSection';`

**IMPORTANT**: Compare the `PlacesData` and `Place` interfaces in `AmenitiesSection.tsx` vs page.tsx. The component has its own local `Place` and `PlacesData` interfaces that may differ slightly from page.tsx's versions (e.g., `cachedAt` type is `string | number` in the component but `number` in page.tsx; `googleMapsUrl` is optional in component but required in page.tsx). If there are type mismatches, update the component's local interfaces to match page.tsx's versions (page.tsx is the source of truth for runtime data).

**Lines to remove**: ~210 lines of inline JSX

**Verification**: The AmenitiesSection component accepts these props:

```typescript
interface AmenitiesSectionProps {
  places: PlacesData | null;
  showAmenities: boolean;
  onToggle: () => void;
  onOpenGoogleMaps: (url: string | null) => void;
  onOpenStreetView: (lat: number, lon: number) => void;
}
```

---

### Item 1.3: Use Existing IntersectionsSection Component

**Status**: [x]

**Problem**: `IntersectionsSection` component exists at `src/components/home/IntersectionsSection.tsx` and is already imported in page.tsx (line 30), but page.tsx renders intersecting roads content INLINE (lines 1426-1490).

**What to do**:

1. Open `src/app/page.tsx`
2. Locate the inline Intersecting Roads JSX block. It starts with:
   ```jsx
   {/* Intersecting Roads */}
   {crossRoads.filter((road) => road.name.toLowerCase() !== result.road_name.toLowerCase())
     .length > 0 && (
     <div className="bg-gray-800 rounded-lg">
   ```
3. Replace the ENTIRE inline intersecting roads block (from `{/* Intersecting Roads */}` through its closing `)}`) with:
   ```jsx
   {
     /* Intersecting Roads */
   }
   <IntersectionsSection
     crossRoads={crossRoads}
     roadName={result.road_name}
     defaultExpanded={showIntersections}
   />;
   ```
4. Note: The existing `IntersectionsSection` component manages its own `showIntersections` state internally via `useState(defaultExpanded)`. This means the `showIntersections` state in page.tsx will no longer control this section directly. The component initializes from `defaultExpanded` and then manages itself. This is acceptable — the section will default to expanded and toggle independently.
5. After this change, the `showIntersections` state variable and `setShowIntersections` in page.tsx are no longer used by this section. Keep them for now (they'll be cleaned up in Phase 4 Item 4.1). Or remove them if no other code references them.
6. The `CrossRoad` interface is defined locally in `IntersectionsSection.tsx`. The one in page.tsx (lines 202-210) is identical. This duplication will be resolved in Phase 5.

**Lines to remove**: ~65 lines of inline JSX

**Verification**: The component signature:

```typescript
interface IntersectionsSectionProps {
  crossRoads: CrossRoad[];
  roadName: string;
  defaultExpanded?: boolean;
}
```

Where `CrossRoad` has: `name`, `distance`, `lat`, `lon`, `roadType`, `googleMapsUrl`, `intersectionSlk?`.

---

## Phase 2: Replace Inline Logic with Existing Extracted Hooks

### Item 2.1: Use Existing useRegions Hook

**Status**: [x]

**Problem**: `useRegions` hook exists at `src/hooks/useRegions.ts` with full offline/API fallback logic, but page.tsx has its own `fetchRegions` function (lines 510-631) that duplicates this logic.

**What to do**:

1. The `useRegions` import already exists at line 13: `import { useRegions } from '@/hooks/useRegions';`
2. Replace the inline region state management in page.tsx:
   - **Remove** these state declarations: `regions`, `setRegions`, `selectedRegion`, `setSelectedRegion`, `selectedRegionRef`, `loadingRegions`, `setLoadingRegions` (around lines 213-227)
   - **Remove** the `updateSelectedRegion` callback (lines 217-220)
   - **Remove** the `fetchRegions` function (lines 510-631)
   - **Remove** the `useEffect` that calls `fetchRegions` on mount (lines 416-419)
   - **Add** the hook call:
     ```typescript
     const {
       regions,
       selectedRegion,
       loadingRegions,
       error: regionsError,
       updateSelectedRegion,
       refreshRegions: fetchRegions,
     } = useRegions();
     ```
3. **IMPORTANT**: The `useRegions` hook already calls `fetchRegions` internally via useEffect on mount. The `updateSelectedRegion` from the hook keeps a ref in sync, just like the inline version. This is a drop-in replacement.
4. Check all references to `setRegions`, `setSelectedRegion`, `setLoadingRegions` — any that remain must be removed or replaced with the hook's returned values. The hook does NOT expose setters; it manages state internally.
5. The `regionsError` from the hook may need to be merged into the page's `error` state. If `regionsError` is non-empty, display it (or set `error` from it).
6. The `selectedRegion` from useRegions is the source of truth. The `useEffect` that calls `fetchRoads(selectedRegion)` (lines 450-455) should still work since `selectedRegion` comes from the hook now.

**Lines to remove**: ~130 lines (fetchRegions function + state declarations + useEffect)

**Risk**: MEDIUM — the useRegions hook auto-fetches on mount. Verify that the region defaults match (Wheatbelt default, localStorage defaultRegion).

---

### Item 2.2: Use Existing useRoads Hook

**Status**: [x]

**Problem**: `useRoads` hook exists at `src/hooks/useRoads.ts` with full offline/API fallback logic, but page.tsx has its own `fetchRoads` function (lines 633-723) that duplicates this logic.

**What to do**:

1. The `useRoads` import already exists at line 14: `import { useRoads } from '@/hooks/useRoads';`
2. Replace the inline road state management:
   - **Remove** these state declarations: `roads`, `setRoads`, `loadingRoads`, `setLoadingRoads` (around lines 221, 227)
   - **Remove** the `fetchRoads` function (lines 633-723)
   - **Remove** the `useEffect` that calls `fetchRoads` on region change (lines 450-455)
   - **Add** the hook call:
     ```typescript
     const { roads, loadingRoads, error: roadsError } = useRoads(selectedRegion, offlineToggles);
     ```
3. The `useRoads` hook auto-fetches when `selectedRegion` changes, so you don't need the separate useEffect.
4. **IMPORTANT**: The inline `fetchRoads` has special logic for `isRestoring.current` — it skips resetting `selectedRoad` when restoring. The `useRoads` hook does NOT handle this. You need to keep the `isRestoring` ref logic in page.tsx for the road selection behavior. The hook only manages the road LIST, not the selected road.
5. The `useRoads` hook also has a `useRoadsRestore` export. Consider whether to use it, or keep the existing `isRestoring`/`pendingRestoreParams` refs in page.tsx.

**Lines to remove**: ~100 lines (fetchRoads function + state declarations + useEffect)

**Risk**: MEDIUM — the isRestoring logic must be preserved. Test session restore flow carefully.

---

### Item 2.3: Use Existing useGpsLocation Hook

**Status**: [x] (SKIPPED - hook interface doesn't match well; inline GPS logic has page-level side effects that the hook doesn't handle)

**Problem**: `useGpsLocation` hook exists at `src/hooks/useGpsLocation.ts`, but page.tsx has inline GPS state and functions (lines 299-311, 1022-1111).

**What to do**:

1. First, read `src/hooks/useGpsLocation.ts` to understand what it provides
2. Compare its interface with the inline GPS code in page.tsx
3. If the hook is a suitable replacement, replace the inline GPS state (`gpsLat`, `gpsLon`, `loadingGps`, `gpsError`, `gpsRoadInfo`, `showGpsDialog`) and functions (`getCurrentLocation`, `lookupGpsLocation`) with the hook
4. The `setGpsRoadInfo` is used by `lookupGpsLocation` to store the result — the hook should handle this
5. The `lookupGpsLocation` function also sets `selectedRoad`, `startSlk`, `updateSelectedRegion` — these are page-level side effects that the hook may not handle. If the hook only returns data, you'll need a callback wrapper.

**Risk**: MEDIUM-HIGH — GPS logic has side effects on page state (setting road, SLK, region). The hook may need modification or the integration may need careful callback wiring.

**Skip condition**: If the hook's interface doesn't match well, skip this item and leave GPS logic inline. It's not a priority.

---

## Phase 3: Extract New Components from Inline JSX

### Item 3.1: Extract SpeedZoneLayoutSection Component

**Status**: [x]

**Problem**: The Speed Zone Layout section (collapsible wrapper around `<SpeedZoneLayout>`) is inline JSX in page.tsx (~30 lines).

**What to do**:

1. Create new file: `src/components/home/SpeedZoneLayoutSection.tsx`
2. Move this inline JSX into the new component:
   ```jsx
   {/* Speed Zone Layout Diagram */}
   <div className="bg-gray-800 rounded-lg">
     <button onClick={() => setShowSpeedZoneLayout(!showSpeedZoneLayout)} ...>
       <h3>📊 Speed Zone Layout (±850m)</h3>
       <span>{showSpeedZoneLayout ? '−' : '+'}</span>
     </button>
     {showSpeedZoneLayout && (
       <div className="px-4 pb-4">
         <SpeedZoneLayout ... />
       </div>
     )}
   </div>
   ```
3. Component props interface:
   ```typescript
   interface SpeedZoneLayoutSectionProps {
     workZoneStart: number;
     workZoneEnd: number;
     signageCorridor: SignageItem[];
     speedZones: ParsedSpeedZone[];
     intersections: Array<{ name: string; slk: number; roadType: string }>;
     corridorMargin: number;
     defaultExpanded?: boolean;
   }
   ```
4. The component manages its own `showSpeedZoneLayout` state internally (initialized from `defaultExpanded`)
5. After creating the component, import it in page.tsx and replace the inline JSX
6. Add to `src/components/home/index.ts` barrel export

**Lines removed from page.tsx**: ~30 lines

---

### Item 3.2: Extract GenerateReportButton Component

**Status**: [x]

**Problem**: The "Generate Work Zone Report" button section is inline JSX in page.tsx (~20 lines).

**What to do**:

1. Create new file: `src/components/home/GenerateReportButton.tsx`
2. Move this inline JSX:
   ```jsx
   {result && (
     <div className="mt-6 bg-gray-800 rounded-lg p-4">
       <Button onClick={generateWorkZoneReport} disabled={reportGenerating} ...>
         {reportGenerating ? <>⏳ Generating Report...</> : <>📋 Generate Work Zone Report</>}
       </Button>
       <p className="text-xs text-gray-500 mt-2 text-center">...</p>
     </div>
   )}
   ```
3. Component props:
   ```typescript
   interface GenerateReportButtonProps {
     onGenerate: () => void;
     isGenerating: boolean;
   }
   ```
4. The component conditionally renders only when result exists — pass `hasResult: boolean` or let parent control visibility
5. Add to barrel export

**Lines removed from page.tsx**: ~20 lines

---

### Item 3.3: Extract HomeHeader Component

**Status**: [x]

**Problem**: The header bar (emergency button, title/version, settings drawer) is inline JSX (~55 lines).

**What to do**:

1. Create new file: `src/components/home/HomeHeader.tsx`
2. Move the `<header>` block (lines 1227-1279) into the new component
3. Props interface:
   ```typescript
   interface HomeHeaderProps {
     offlineReady: boolean;
     onShowEmergency: () => void;
     settingsDrawerProps: React.ComponentProps<typeof SettingsDrawer>;
   }
   ```
4. The SettingsDrawer has MANY props. Rather than listing them all, pass them as a spread object or use `React.ComponentProps<typeof SettingsDrawer>`.
5. Add to barrel export

**Lines removed from page.tsx**: ~55 lines

---

### Item 3.4: Extract StartSlkTrackingButton Component

**Status**: [x]

**Problem**: The "Start SLK Tracking" button is inline JSX (~15 lines).

**What to do**:

1. Create new file: `src/components/home/StartSlkTrackingButton.tsx`
2. Move the button JSX:
   ```jsx
   {!result && !isRestoringUI && (
     <div className="mb-4">
       <Button onClick={startSlkTracking} ...>📍 Start SLK Tracking</Button>
       <p className="text-xs text-gray-500 text-center mt-1">...</p>
     </div>
   )}
   ```
3. Props:
   ```typescript
   interface StartSlkTrackingButtonProps {
     onStartTracking: () => void;
     visible: boolean;
   }
   ```
4. Add to barrel export

**Lines removed from page.tsx**: ~15 lines

---

## Phase 4: Extract Stateful Logic into New Hooks

### Item 4.1: Create useCollapsibleSections Hook

**Status**: [x]

**Problem**: page.tsx has 7 boolean state variables for collapsible sections, each with a toggle.

**What to do**:

1. Create new file: `src/hooks/useCollapsibleSections.ts`
2. Move these 7 states into the hook:
   ```typescript
   const [showTraffic, setShowTraffic] = useState(true);
   const [showSignageCorridor, setShowSignageCorridor] = useState(true);
   const [showSpeedZoneLayout, setShowSpeedZoneLayout] = useState(true);
   const [showTcPositions, setShowTcPositions] = useState(true);
   const [showIntersections, setShowIntersections] = useState(true);
   const [showWeather, setShowWeather] = useState(true);
   const [showAmenities, setShowAmenities] = useState(true);
   ```
3. Return an object with each state and a toggle function:
   ```typescript
   interface CollapsibleSections {
     showTraffic: boolean;
     showSignageCorridor: boolean;
     showSpeedZoneLayout: boolean;
     showTcPositions: boolean;
     showIntersections: boolean;
     showWeather: boolean;
     showAmenities: boolean;
     toggleTraffic: () => void;
     toggleSignageCorridor: () => void;
     toggleSpeedZoneLayout: () => void;
     toggleTcPositions: () => void;
     toggleIntersections: () => void;
     toggleWeather: () => void;
     toggleAmenities: () => void;
   }
   ```
4. Replace the 7 useState declarations + 7 toggle patterns in page.tsx with:
   ```typescript
   const sections = useCollapsibleSections();
   ```
5. Update all references from `showTraffic` to `sections.showTraffic`, `setShowTraffic(!showTraffic)` to `sections.toggleTraffic()`, etc.

**Lines removed from page.tsx**: ~14 lines (7 useState + potentially toggle references)

**Risk**: LOW — pure state extraction, no logic changes

---

### Item 4.2: Create useWorkZoneLookup Hook

**Status**: [ ]

**Problem**: The `getWorkZoneInfo` function (lines 761-913) is ~150 lines of complex logic mixing data fetching, state management, and coordination of sub-fetches (weather, traffic, places, signage, speed limit, cross roads). This is the most complex function in the file.

**What to do**:

1. Create new file: `src/hooks/useWorkZoneLookup.ts`
2. Move these states into the hook:
   - `result` / `setResult`
   - `error` / `setError`
   - `loading` / `setLoading`
   - `isSinglePoint` / `setIsSinglePoint`
   - `exporting` / `setExporting`
3. Move these functions into the hook:
   - `getWorkZoneInfo` (the main function)
   - `handleSearch` (wrapper using current state)
   - `handleReset` (clears all lookup state)
   - `exportReport` (PDF export)
   - `generateWorkZoneReport` (report modal trigger)
4. The hook receives these as parameters (from parent):
   ```typescript
   interface UseWorkZoneLookupParams {
     selectedRegion: string;
     selectedRoad: string;
     startSlk: string;
     endSlk: string;
     updateSelectedRegion: (region: string) => void;
     setSelectedRoad: (road: string) => void;
     setStartSlk: (slk: string) => void;
     setEndSlk: (slk: string) => void;
     offlineToggles: Record<string, boolean>;
     fetchWeather: (lat: number, lon: number) => Promise<void>;
     fetchTraffic: (roadId: string, lat: number, lon: number) => Promise<void>;
     fetchPlaces: (lat: number, lon: number) => Promise<void>;
     fetchWarnings: () => Promise<void>;
     fetchCrossRoads: (data: any) => Promise<void>;
     fetchSpeedLimit: (roadId: string, slk: number) => Promise<void>;
     fetchSignageCorridor: (roadId: string, startSlk: number, endSlk?: number) => Promise<void>;
     setSignageCorridor: (items: SignageItem[]) => void;
     setSignageLoading: (loading: boolean) => void;
     setCorridorSpeedZones: (zones: ParsedSpeedZone[]) => void;
     setSpeedLimit: (limit: number | null) => void;
     setWeather: (weather: WeatherData | null) => void;
     setTraffic: (traffic: TrafficData | null) => void;
     setPlaces: (places: PlacesData | null) => void;
     setWarnings: (warnings: WarningData | null) => void;
     setCrossRoads: (roads: CrossRoad[]) => void;
   }
   ```
5. The hook returns:
   ```typescript
   interface UseWorkZoneLookupReturn {
     result: WorkZoneResult | null;
     error: string;
     loading: boolean;
     isSinglePoint: boolean;
     exporting: boolean;
     getWorkZoneInfo: (...) => Promise<void>;
     handleSearch: () => Promise<void>;
     handleReset: () => void;
     exportReport: () => Promise<void>;
     generateWorkZoneReport: () => void;
   }
   ```

**Risk**: HIGH — this is the most complex extraction. Many state variables and callbacks cross boundaries. Consider doing this LAST or splitting into smaller pieces.

**Lines removed from page.tsx**: ~200 lines

---

### Item 4.3: Create useSignageData Hook

**Status**: [x]

**Problem**: Speed limit and signage corridor fetching logic (~70 lines total) is inline in page.tsx.

**What to do**:

1. Create new file: `src/hooks/useSignageData.ts`
2. Move these states into the hook:
   - `speedLimit` / `setSpeedLimit`
   - `signageCorridor` / `setSignageCorridor`
   - `signageLoading` / `setSignageLoading`
   - `corridorSpeedZones` / `setCorridorSpeedZones`
3. Move these functions:
   - `fetchSpeedLimit` (lines 951-983)
   - `fetchSignageCorridor` (lines 986-1019)
4. The hook receives: `offlineToggles` (for speedZones toggle check)
5. Return:
   ```typescript
   interface UseSignageDataReturn {
     speedLimit: number | null;
     signageCorridor: SignageItem[];
     signageLoading: boolean;
     corridorSpeedZones: ParsedSpeedZone[];
     fetchSpeedLimit: (roadId: string, slk: number) => Promise<void>;
     fetchSignageCorridor: (roadId: string, startSlk: number, endSlk?: number) => Promise<void>;
   }
   ```

**Lines removed from page.tsx**: ~70 lines

**Risk**: LOW-MEDIUM — straightforward state + function extraction

---

### Item 4.4: Create useSessionRestore Hook

**Status**: [x] (SKIPPED - session restore logic too deeply coupled with getWorkZoneInfo, recallLocation, and render conditions; extraction would require major rework of Item 4.2 first)

**Problem**: Session restore logic (isRestoring ref, pendingRestoreParams ref, isRestoringUI state, sessionStorage handling) is spread across page.tsx in multiple useEffects and functions.

**What to do**:

1. Create new file: `src/hooks/useSessionRestore.ts`
2. Move these into the hook:
   - `isRestoring` ref
   - `pendingRestoreParams` ref
   - `isRestoringUI` state
   - The `useEffect` that restores from sessionStorage (lines 422-447)
   - The `useEffect` that calls getWorkZoneInfo after roads load (lines 745-758)
3. The hook needs a callback for when restore params are ready:
   ```typescript
   interface UseSessionRestoreParams {
     updateSelectedRegion: (region: string) => void;
     onRestoreReady: (params: {
       region: string;
       roadId: string;
       startSlk: string;
       endSlk: string;
     }) => Promise<void>;
   }
   ```
4. Return:
   ```typescript
   interface UseSessionRestoreReturn {
     isRestoring: React.MutableRefObject<boolean>;
     isRestoringUI: boolean;
     setPendingRestoreParams: (
       params: { region: string; roadId: string; startSlk: string; endSlk: string } | null
     ) => void;
   }
   ```
5. The `recallLocation` function also uses `isRestoring` and `pendingRestoreParams` — it should receive these from the hook.

**Lines removed from page.tsx**: ~30 lines

**Risk**: MEDIUM — session restore involves timing-sensitive logic with refs and async state

---

## Phase 5: Move Interfaces to Shared Types

### Item 5.1: Move WorkZoneResult Interface to shared.ts

**Status**: [x]

**What to do**:

1. Open `src/types/shared.ts`
2. Add the `Position` interface (from page.tsx lines 98-103) if not already there
3. Add the `WorkZoneResult` interface (from page.tsx lines 105-158)
4. In page.tsx, replace the local interface definitions with:
   ```typescript
   import { WorkZoneResult, Position } from '@/types/shared';
   ```
5. Update any other files that define these interfaces locally to import from shared.ts

**Lines removed from page.tsx**: ~60 lines

---

### Item 5.2: Move Place, PlacesData, CrossRoad Interfaces to shared.ts

**Status**: [x]

**What to do**:

1. Add `Place` and `PlacesData` interfaces (from page.tsx lines 160-200) to `src/types/shared.ts`
2. Add `CrossRoad` interface (from page.tsx lines 202-210) to `src/types/shared.ts`
3. In page.tsx, replace local definitions with imports from shared.ts
4. Also update `src/components/home/AmenitiesSection.tsx` and `src/components/home/IntersectionsSection.tsx` to import from shared.ts instead of defining locally

**Lines removed from page.tsx**: ~45 lines

**Also removes duplicate interface definitions** in AmenitiesSection.tsx and IntersectionsSection.tsx

---

### Item 5.3: Move Road Interface to shared.ts

**Status**: [ ]

**What to do**:

1. The `Road` interface (page.tsx lines 90-96) already has a similar `RoadInfo` in shared.ts
2. Compare `Road` vs `RoadInfo` in shared.ts. If they're similar enough, consolidate.
3. The `Road` in page.tsx has: `road_id`, `road_name`, `min_slk`, `max_slk`, `region?`
4. The `RoadInfo` in shared.ts has: `road_id`, `road_name`, `road_type?`, `region?`, `min_slk?`, `max_slk?`, `network_type?`
5. If consolidation makes sense, use `RoadInfo` everywhere and update page.tsx. If not, add `Road` as a separate type.
6. Also check `useRoads.ts` which has its own `Road` interface — consolidate there too.

**Lines removed from page.tsx**: ~7 lines

---

## Verification Steps (Run After EVERY Item)

After completing any item, run these commands from the project root (`/home/z/my-project/roadfinder`):

```bash
# 1. TypeScript type check — must show 0 errors
npx tsc --noEmit 2>&1 | tail -5

# 2. ESLint — must show 0 errors (warnings are acceptable)
npx eslint src/ 2>&1 | tail -5

# 3. Unit tests — all must pass
npx jest --passWithNoTests 2>&1 | tail -10

# 4. Line count of page.tsx — track progress
wc -l src/app/page.tsx
```

**Success criteria**:

- TypeScript: 0 errors
- ESLint: 0 errors
- Tests: all pass
- page.tsx line count decreased from previous measurement

If any check fails, fix the issue before marking the item as done.

---

## Progress Tracking

| Item | Description                                  | Status        | Lines Removed | Date Completed |
| ---- | -------------------------------------------- | ------------- | ------------- | -------------- |
| 1.1  | Use existing WeatherSection                  | [x]           | ~150          | 2026-04-21     |
| 1.2  | Use existing AmenitiesSection                | [x]           | ~210          | 2026-04-21     |
| 1.3  | Use existing IntersectionsSection            | [x]           | ~65           | 2026-04-21     |
| 2.1  | Use existing useRegions hook                 | [x]           | ~130          | 2026-04-21     |
| 2.2  | Use existing useRoads hook                   | [x]           | ~100          | 2026-04-21     |
| 2.3  | Use existing useGpsLocation hook             | [x] (SKIPPED) | ~90           | 2026-04-21     |
| 3.1  | Extract SpeedZoneLayoutSection               | [x]           | ~30           | 2026-04-21     |
| 3.2  | Extract GenerateReportButton                 | [x]           | ~20           | 2026-04-21     |
| 3.3  | Extract HomeHeader                           | [x]           | ~55           | 2026-04-21     |
| 3.4  | Extract StartSlkTrackingButton               | [x]           | ~15           | 2026-04-21     |
| 4.1  | Create useCollapsibleSections                | [x]           | ~14           | 2026-04-21     |
| 4.2  | Create useWorkZoneLookup                     | [ ]           | ~200          |                |
| 4.3  | Create useSignageData                        | [x]           | ~70           | 2026-04-21     |
| 4.4  | Create useSessionRestore                     | [x] (SKIPPED) | ~30           | 2026-04-21     |
| 5.1  | Move WorkZoneResult to shared.ts             | [ ]           | ~60           |                |
| 5.2  | Move Place/PlacesData/CrossRoad to shared.ts | [ ]           | ~45           |                |
| 5.3  | Move/consolidate Road interface              | [ ]           | ~7            |                |

**Starting line count**: 1987 lines
**Estimated final line count**: ~700-800 lines (after all items)
**Estimated total reduction**: ~1,200 lines (~60% reduction)

---

## Commit Message Format

After completing each item:

```
refactor: [item#] extract <component/hook name> from page.tsx
```

Example:

```
refactor: 1.1 use existing WeatherSection component from page.tsx
```

---

## Session Resilience & Recovery

### If the Local Filesystem is Wiped

Between sessions, the local server filesystem (`/home/z/my-project/roadfinder/`) may be reset.
When this happens, the workorder file and all code changes will be gone locally — but they
persist on GitHub. Here's the recovery procedure:

1. **Clone the repo fresh:**

   ```bash
   git clone https://github.com/instructor-ship-it/roadfinder.git /home/z/my-project/roadfinder
   cd /home/z/my-project/roadfinder
   bun install
   ```

2. **Read the workorder from the repo** — it's now at `/home/z/my-project/roadfinder/REFACTORING_WORKORDER.md`
   with all completed items marked `[x]` and the latest code already reflecting those changes.

3. **Continue from the next `[ ]` item.**

### If Only the Workorder File is Missing (Code is Fine)

If the code changes are still local but just the workorder file got deleted:

```bash
cd /home/z/my-project/roadfinder
git checkout main -- REFACTORING_WORKORDER.md
```

Or simply `git pull origin main` to sync with GitHub.

### Why GitHub is the Source of Truth

- Every completed item is committed AND pushed to GitHub
- The workorder file status is updated and pushed after each item
- The code changes for each item are also committed and pushed
- Therefore, GitHub always has the latest state — local is just a working copy

---

## Session Continuation Prompt

To continue this refactoring in a new session (whether local files exist or not), use:

```
Resume the page.tsx refactoring for the roadfinder project. First, if /home/z/my-project/roadfinder doesn't exist or is empty, clone it from https://github.com/instructor-ship-it/roadfinder.git and run bun install. Then read REFACTORING_WORKORDER.md in the repo root. Find the next incomplete item (marked [ ]) and execute it. After completing it, run the verification steps from the workorder, commit, push to GitHub, update the status in the workorder file to [x], commit and push the workorder file too. Then proceed to the next item.
```
