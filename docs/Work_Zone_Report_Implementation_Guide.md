# Work Zone Report Feature - Implementation Guide

## Overview

This document explains how the Work Zone Report Generator feature was implemented in the TC Work Zone Locator app. The feature allows users to generate a comprehensive text report of all work zone information with a visual ASCII graphic for road width breakdown.

**Version: RC 1.9.9**

---

## File Location

**Main file:** `src/app/page.tsx`

---

## Key Components

### 1. State Variables (around line 100-150)

```typescript
const [reportGenerating, setReportGenerating] = useState(false);
const [reportContent, setReportContent] = useState('');
const [showReportModal, setShowReportModal] = useState(false);
```

### 2. Generate Report Function (starts around line 747)

The main function `generateWorkZoneReport()` creates a comprehensive text report:

```typescript
const generateWorkZoneReport = () => {
  setReportGenerating(true);

  const lines: string[] = [];
  const timestamp = new Date().toLocaleDateString('en-AU', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  // Header
  lines.push(
    '╔══════════════════════════════════════════════════════════════════════════════════╗'
  );
  lines.push(
    '║     TC WORK ZONE LOCATOR - WORK ZONE REPORT                                        ║'
  );
  lines.push(
    '╚══════════════════════════════════════════════════════════════════════════════════╝'
  );
  lines.push('');
  lines.push(`Generated: ${timestamp}`);
  lines.push(`Report Version: 1.0`);
  lines.push('');

  // ... add all sections ...

  // Set the report content and show modal
  setReportContent(lines.join('\n'));
  setShowReportModal(true);
  setReportGenerating(false);
};
```

---

## Report Sections

### Section 1: Work Zone Summary

```typescript
lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
lines.push('🗺️ WORK ZONE SUMMARY');
lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (result) {
  lines.push(`Road ID:           ${result.road_id}`);
  lines.push(`Road Name:         ${result.road_name}`);
  lines.push(`Network Type:      ${result.network_type}`);
  lines.push(`Carriageway:       ${result.carriageway}`);
  lines.push(`Start SLK:         ${result.work_zone.start_slk.toFixed(3)} km`);
  lines.push(`End SLK:           ${result.work_zone.end_slk.toFixed(3)} km`);
  lines.push(`Zone Length:       ${result.work_zone.length_m} m`);
}
```

### Section 2: Road Width Breakdown with Visual Bar

This is the key feature - the ASCII visual bar:

```typescript
if (result.pavement) {
  lines.push(`Lanes:             ${result.pavement.lanes || 'Unknown'}`);
  lines.push('');

  // Get pavement measurements
  const p = result.pavement;
  const unsealedL = p.unsealed_shoulder_l || 0;
  const sealedL = p.sealed_shoulder_l || 0;
  const trafficable = p.width_m || 0;
  const sealedR = p.sealed_shoulder_r || 0;
  const unsealedR = p.unsealed_shoulder_r || 0;
  const kerbL = p.kerb_l || 0;
  const kerbR = p.kerb_r || 0;
  const totalWidth =
    p.total_pave_width || kerbL + unsealedL + sealedL + trafficable + sealedR + unsealedR + kerbR;

  lines.push('Road Width Breakdown:');
  lines.push('');

  // Create visual bar (50 characters wide)
  const barWidth = 50;
  const segments: { width: number; char: string; label: string; color: string }[] = [];

  // Build segments from left to right
  if (kerbL > 0) segments.push({ width: kerbL, char: '▒', label: 'Kerb L', color: 'gray' });
  if (unsealedL > 0)
    segments.push({ width: unsealedL, char: '░', label: 'Unsealed L', color: 'brown' });
  if (sealedL > 0) segments.push({ width: sealedL, char: '▓', label: 'Sealed L', color: 'gray' });
  segments.push({ width: trafficable, char: '█', label: 'Trafficable', color: 'blue' });
  if (sealedR > 0) segments.push({ width: sealedR, char: '▓', label: 'Sealed R', color: 'gray' });
  if (unsealedR > 0)
    segments.push({ width: unsealedR, char: '░', label: 'Unsealed R', color: 'brown' });
  if (kerbR > 0) segments.push({ width: kerbR, char: '▒', label: 'Kerb R', color: 'gray' });

  // Build the visual bar string
  let visualBar = '│';
  for (const seg of segments) {
    const charCount = Math.max(1, Math.round((seg.width / totalWidth) * barWidth));
    visualBar += seg.char.repeat(charCount);
  }
  visualBar += '│';

  // Add bar to report
  lines.push('  ' + visualBar);
  lines.push('  └' + '─'.repeat(barWidth + 2) + '┘');
  lines.push('');

  // Legend
  lines.push(' Legend: ░ = Unsealed  ▒ = Kerb  ▓ = Sealed Shoulder  █ = Trafficable');
  lines.push('');

  // Numeric values
  if (kerbL > 0) lines.push(`  Kerb (Left):             ${kerbL.toFixed(1)} m`);
  if (unsealedL > 0) lines.push(`  Unsealed Shoulder (L): ${unsealedL.toFixed(1)} m`);
  if (sealedL > 0) lines.push(`  Sealed Shoulder (L):   ${sealedL.toFixed(1)} m`);
  lines.push(`  Trafficable Width:      ${trafficable.toFixed(1)} m`);
  if (sealedR > 0) lines.push(`  Sealed Shoulder (R):   ${sealedR.toFixed(1)} m`);
  if (unsealedR > 0) lines.push(`  Unsealed Shoulder (R): ${unsealedR.toFixed(1)} m`);
  if (kerbR > 0) lines.push(`  Kerb (Right):            ${kerbR.toFixed(1)} m`);

  // Totals
  if (p.total_pave_width) lines.push(`  Total Pave Width: ${p.total_pave_width.toFixed(1)} m`);
  if (p.total_seal_width) lines.push(`  Total Seal Width: ${p.total_seal_width.toFixed(1)} m`);
}
```

### Visual Bar Characters Explained

| Character | Name           | Usage                  |
| --------- | -------------- | ---------------------- |
| `░`       | Light shade    | Unsealed shoulder      |
| `▒`       | Medium shade   | Kerb                   |
| `▓`       | Dark shade     | Sealed shoulder        |
| `█`       | Full block     | Trafficable road width |
| `│`       | Vertical bar   | End caps               |
| `└`       | Corner         | Bottom left corner     |
| `┘`       | Corner         | Bottom right corner    |
| `─`       | Horizontal bar | Bottom line            |

### Example Output:

```
Road Width Breakdown:

  │░░▓▓████████████████████████████████████████████████▓▓░░│
  └────────────────────────────────────────────────────────┘

 Legend: ░ = Unsealed  ▒ = Kerb  ▓ = Sealed Shoulder  █ = Trafficable

 Unsealed Shoulder (L): 1.5 m
 Sealed Shoulder (L):   1.0 m
 Trafficable Width:      7.2 m
 Sealed Shoulder (R):   1.0 m
 Unsealed Shoulder (R): 1.5 m

 Total Pave Width: 12.2 m
```

---

## Other Report Sections

### Speed Zones

```typescript
lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
lines.push('🚗 SPEED ZONES');
if (result?.speed_zones) {
  lines.push(`Approach Start:    ${result.speed_zones.approach_start}`);
  lines.push(`TC Start:             ${result.speed_zones.tc_start}`);
  lines.push(`Work Zone Start:   ${result.speed_zones.work_zone_start}`);
  lines.push(`Work Zone End:     ${result.speed_zones.work_zone_end}`);
  lines.push(`TC End:                ${result.speed_zones.tc_end}`);
  lines.push(`Approach End:       ${result.speed_zones.approach_end}`);
}
```

### TC Positions

```typescript
lines.push('🗺️ TC POSITIONS (±100m from work zone)');
if (result?.tc_positions) {
  lines.push('TC START:');
  lines.push(`  SLK:                 ${result.tc_positions.start_slk.toFixed(3)} km`);
  lines.push(
    `  Coordinates:    ${result.tc_positions.start.lat.toFixed(6)}, ${result.tc_positions.start.lon.toFixed(6)}`
  );
  lines.push(`  Speed:             ${result.tc_positions.start.speed}`);
  lines.push(`  Google Maps:    ${result.google_maps.tc_start}`);

  lines.push('TC END:');
  lines.push(`  SLK:                 ${result.tc_positions.end_slk.toFixed(3)} km`);
  lines.push(
    `  Coordinates:    ${result.tc_positions.end.lat.toFixed(6)}, ${result.tc_positions.end.lon.toFixed(6)}`
  );
  lines.push(`  Speed:             ${result.tc_positions.end.speed}`);
  lines.push(`  Google Maps:    ${result.google_maps.tc_end}`);
}
```

### Signage Corridor

```typescript
lines.push('🚧 SIGNAGE CORRIDOR');
if (result?.signage) {
  // Speed signs
  if (result.signage.speed_signs?.length > 0) {
    lines.push('Speed Signs:');
    result.signage.speed_signs.forEach((sign, i) => {
      lines.push(
        `   ${i + 1}. SLK ${sign.slk.toFixed(3)} - ${sign.speed} km/h (${sign.direction})`
      );
    });
  }
  // Warning signs, rail crossings, intersections...
}
```

### Weather

```typescript
lines.push('🌦️ WEATHER');
if (weather) {
  lines.push(`Temperature:       ${weather.temperature}°C`);
  lines.push(`Condition:          ${weather.condition}`);
  lines.push(`Humidity:          ${weather.humidity}%`);
  lines.push(`Wind:                 ${weather.wind_speed} km/h ${weather.wind_direction}`);
  lines.push(`Gusts:               ${weather.gusts} km/h`);
  lines.push(`Sunrise:            ${weather.sunrise}`);
  lines.push(`Sunset:               ${weather.sunset}`);
  lines.push(`UV Index:           ${weather.uv_index}`);
}
```

### Weather Warnings (BOM)

```typescript
lines.push('⚠️ WEATHER WARNINGS');
if (weather?.warnings && weather.warnings.length > 0) {
  weather.warnings.forEach((warning, i) => {
    lines.push(`   ${i + 1}. ${warning.title}`);
    lines.push(`       ${warning.description}`);
  });
}
```

### Traffic Volume

```typescript
lines.push('📊 TRAFFIC VOLUME');
if (traffic) {
  lines.push(`AADT:                  ${traffic.aadt?.toLocaleString() || 'N/A'}`);
  lines.push(`Peak Hour:          ${traffic.peak_hour?.toLocaleString() || 'N/A'}`);
  lines.push(`Heavy Vehicles:  ${traffic.heavy_vehicles}%`);
  lines.push(`Data Year:          ${traffic.data_year || 'N/A'}`);
}
```

### Nearby Amenities

```typescript
lines.push('📍 NEARBY AMENITIES');
if (places) {
  if (places.hospital) {
    lines.push('Hospital:');
    lines.push(`  Name:           ${places.hospital.name}`);
    lines.push(`  Distance:       ${places.hospital.distance} km`);
    if (places.hospital.type) lines.push(`  Type:           ${places.hospital.type}`);
    if (places.hospital.hasEmergency) lines.push(`  ED:             Yes`);
    if (places.hospital.beds) lines.push(`  Beds:           ${places.hospital.beds}`);
    if (places.hospital.address) lines.push(`  Address:        ${places.hospital.address}`);
    if (places.hospital.phone) lines.push(`  Phone:           ${places.hospital.phone}`);
  }
  if (places.fuelStation) {
    lines.push('Fuel Station:');
    lines.push(`  Name:           ${places.fuelStation.name}`);
    lines.push(`  Distance:       ${places.fuelStation.distance} km`);
    if (places.fuelStation.dieselPrice)
      lines.push(
        `  Diesel Price:   ${places.fuelStation.dieselPrice} c/L ($${(places.fuelStation.dieselPrice / 100).toFixed(2)})`
      );
    if (places.fuelStation.brand) lines.push(`  Brand:          ${places.fuelStation.brand}`);
    if (places.fuelStation.features) lines.push(`  Features:       ${places.fuelStation.features}`);
    if (places.fuelStation.address) lines.push(`  Address:        ${places.fuelStation.address}`);
    if (places.fuelStation.phone) lines.push(`  Phone:           ${places.fuelStation.phone}`);
  }
  if (places.toilet) {
    lines.push('Public Toilet:');
    lines.push(`  Name:           ${places.toilet.name}`);
    lines.push(`  Distance:       ${places.toilet.distance} km`);
  }
}
```

### Intersecting Roads

```typescript
lines.push('🔀 INTERSECTING ROADS IN TC ZONE');
if (result?.intersecting_roads && result.intersecting_roads.length > 0) {
  result.intersecting_roads.forEach((road, i) => {
    lines.push(`   ${i + 1}. ${road.name} - ${road.distance} from work zone`);
  });
}
```

### Google Maps Links

```typescript
lines.push('🗺️ GOOGLE MAPS LINKS');
if (result?.google_maps) {
  lines.push(`Work Zone Start: ${result.google_maps.work_zone_start}`);
  lines.push(`Work Zone End:   ${result.google_maps.work_zone_end}`);
  lines.push(`TC Start:            ${result.google_maps.tc_start}`);
  lines.push(`TC End:              ${result.google_maps.tc_end}`);
}
```

---

## UI Components

### Generate Report Button (around line 3574)

```tsx
{/* Generate Report Button */}
{result && (
  <div className="mt-6 bg-gray-800 rounded-lg p-4">
    <Button
      onClick={generateWorkZoneReport}
      disabled={reportGenerating}
      className="w-full bg-purple-700 hover:bg-purple-600 h-12 text-base font-medium"
    >
      {reportGenerating ? (
        <><⏳ Generating Report...</>
      ) : (
        <><📋 Generate Work Zone Report</>
      )}
    </Button>
    <p className="text-xs text-gray-500 mt-2 text-center">
      Creates a comprehensive report with all work zone information
    </p>
  </div>
)}
```

### Report Modal (around line 3597)

```tsx
{/* Report Modal */}
{showReportModal && (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-purple-400"><📋 Work Zone Report</h2>
        <button onClick={() => setShowReportModal(false)} className="...">
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-800 p-4 rounded-lg">
          {reportContent}
        </pre>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <div className="flex gap-2">
          <Button onClick={copyReportToClipboard} className="flex-1">
            <📋 Copy to Clipboard
          </Button>
          <Button onClick={downloadReport} className="flex-1">
            <⬇️ Download
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
```

### Copy and Download Functions

```typescript
const copyReportToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(reportContent);
    alert('Report copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const downloadReport = () => {
  const roadId = result?.road_id || 'unknown';
  const date = new Date().toISOString().split('T')[0];
  const filename = `work-zone-report-${roadId}-${date}.txt`;

  const blob = new Blob([reportContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

## Data Sources

The report uses data from these state variables:

| Variable             | Source                                                                        | Content                                             |
| -------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| `result`             | `/api/roads`                                                                  | Work zone info, pavement, TC positions, speed zones |
| `weather`            | `/api/weather`                                                                | Temperature, conditions, UV, wind, warnings         |
| `traffic`            | `/api/traffic`                                                                | AADT, peak hour, heavy vehicles                     |
| `places`             | `/api/nearest-hospital` + `/api/fuel-stations` + `/api/places` (toilets only) | Nearby hospital, fuel, toilet                       |
| `signage`            | IndexedDB                                                                     | Speed signs, warning signs, rail crossings          |
| `intersecting_roads` | Overpass API                                                                  | Cross roads in work zone                            |

---

## Version History

| Version   | Date       | Changes                                                          |
| --------- | ---------- | ---------------------------------------------------------------- |
| RC 1.9.9  | 2025-06    | Enhanced amenity details (hospital types, fuel prices, features) |
| RC 1.9.7  | 2025-06    | Updated for new features, added warning banners                  |
| RC 1.5.3  | 2026-03-09 | Added work zone report generator with visual road width bar      |
| Build Fix | 2026-03-09 | Fixed `emergency` → `isEmergency` property name                  |

---

## Summary

The work zone report is a text-based comprehensive summary that:

1. Gathers all available work zone data
2. Formats it with Unicode box-drawing characters for visual appeal
3. Includes an ASCII visual bar for road width breakdown
4. Can be copied to clipboard or downloaded as a .txt file
5. Works on mobile devices for field use

The key innovation is the visual bar that uses proportional Unicode block characters to show the road cross-section, making the report both informative and visually intuitive.
