'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function UserManualPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('intro');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'accordion' | 'full'>('accordion');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const scrollToSection = (sectionId: string) => {
    setExpandedSection(sectionId);
    setTimeout(() => {
      sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Static content — wrapped in useMemo for stable reference identity
  const sections = useMemo(
    () => [
      {
        id: 'intro',
        title: '1. Introduction',
        keywords: ['what is', 'features', 'navigation', 'icons', 'manual', 'settings'],
        content: `
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">What is TC Work Zone Locator?</h3>
        <p class="mb-3">TC Work Zone Locator is a mobile-first web application designed specifically for Traffic Controllers working on Western Australian roads. It helps you locate work zones, track your position in real-time, and know the speed limits for any location - even in remote areas without internet access.</p>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Key Features</h3>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>Work Zone Lookup</strong> - Find coordinates for any road by SLK</li>
          <li><strong>Real-time GPS Tracking</strong> - Track position with EKF smoothing</li>
          <li><strong>Speed Zone Display</strong> - See current speed limit with lookahead warnings</li>
          <li><strong>AfterCare Tracking</strong> - Track signage placed for later retrieval</li>
          <li><strong>Speed Sign Overrides</strong> - Record community-verified corrections</li>
          <li><strong>Offline Operation</strong> - Works without internet after downloading data</li>
          <li><strong>Signage Corridor</strong> - View all signage near your work zone</li>
          <li><strong>Weather Integration</strong> - Current conditions when online</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Navigation Icons</h3>
        <p class="mb-2">The home page header contains a single button:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>☰ Hamburger menu</strong> - Opens Settings (bottom sheet drawer)</li>
        </ul>
        <p class="mb-3 text-sm text-gray-400">The drive page (SLK Tracking) has no menu - use "← Back to Work Zone Locator" to return. The User Manual is accessible from Settings → About section.</p>
      `,
      },
      {
        id: 'getting-started',
        title: '2. Getting Started',
        keywords: [
          'setup',
          'download',
          'offline',
          'region',
          'location',
          'permission',
          'first time',
        ],
        content: `
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">First-Time Setup</h3>
        
        <p class="mb-2"><strong>Step 1: Download Offline Data</strong></p>
        <p class="mb-3">Before using the app offline, download the road data: Tap the hamburger menu (☰) in the top-right corner. A bottom sheet drawer will slide up from the bottom. In the Offline Data section, tap "Download Data" and wait for completion (~69,000 roads). The menu button turns green when ready. Swipe down or tap outside the drawer to close it.</p>
        
        <p class="mb-2"><strong>Step 2: Set Default Region</strong></p>
        <p class="mb-3">In Settings, find Default Region and select your region (e.g., Wheatbelt). This region will be pre-selected each time you open the app.</p>
        
        <p class="mb-2"><strong>Step 3: Enable Location Access</strong></p>
        <p class="mb-3">When prompted, allow location access. This is required for GPS-based road detection, SLK tracking, and speed limit display.</p>
      `,
      },
      {
        id: 'offline',
        title: '3. Offline Capability',
        keywords: ['offline', 'remote', 'internet', 'coverage', 'works offline', 'indexeddb'],
        content: `
        <h3 class="text-lg font-semibold text-green-400 mt-4 mb-2">✓ Works Offline</h3>
        <p class="mb-3"><strong>YES! Core features work 100% offline after downloading data.</strong> This is essential for Traffic Controllers working in remote areas of Western Australia where cell coverage is unreliable.</p>
        
        <h4 class="font-semibold text-white mt-4 mb-2">What Works Offline:</h4>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li>Work Zone Lookup (IndexedDB)</li>
          <li>GPS Tracking (Device GPS + IndexedDB)</li>
          <li>SLK Position (computed locally)</li>
          <li>Speed Zones (IndexedDB + localStorage)</li>
          <li>Speed Sign Overrides (localStorage)</li>
          <li>AfterCare Jobs (localStorage)</li>
          <li>Signage Corridor (IndexedDB)</li>
          <li>TC Position Calculation (computed locally)</li>
          <li>Direction Detection (from GPS)</li>
          <li>Google Maps Links (generated URLs)</li>
        </ul>
        
        <h4 class="font-semibold text-white mt-4 mb-2">What Requires Internet:</h4>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li>Weather Data (Open-Meteo API)</li>
          <li>BOM Weather Warnings (RSS Feed)</li>
          <li>Nearby Amenities (Overpass API)</li>
          <li>Traffic Volume (MRWA API)</li>
          <li>Street View Images (Google Maps)</li>
        </ul>
        
        <h4 class="font-semibold text-white mt-4 mb-2">Tips for Remote Work:</h4>
        <ul class="list-disc list-inside space-y-1">
          <li>Download data before leaving coverage area</li>
          <li>Test the app in coverage area first</li>
          <li>All core TC functions work without internet</li>
        </ul>
      `,
      },
      {
        id: 'home',
        title: '4. Home Page - Work Zone Lookup',
        keywords: ['road', 'slk', 'region', 'lookup', 'search', 'select', 'local roads'],
        content: `
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Selecting a Road</h3>
        
        <p class="mb-2"><strong>Option 1: Browse by Region</strong></p>
        <p class="mb-3">Select a region from the dropdown, then select a road ID. The road name and valid SLK range will be displayed.</p>
        
        <p class="mb-2"><strong>Option 2: Local Roads</strong></p>
        <p class="mb-3">Select "Local Roads" from the region dropdown (amber colored), enter the road ID manually, or use GPS to auto-detect.</p>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Entering SLK Values</h3>
        <p class="mb-2"><strong>Start SLK (required):</strong> Enter the starting SLK of your work zone. Use decimal values (e.g., 67.62).</p>
        <p class="mb-3"><strong>End SLK (optional):</strong> Leave blank for single point lookup, or enter end SLK for a range.</p>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Results Include:</h3>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li>Work Zone Summary (coordinates, carriageway type, lanes, road width, action buttons)</li>
          <li>Lane Direction Diagram (visual lane allocation with arrows)</li>
          <li>Road Width Breakdown (shoulders, lanes, total width)</li>
          <li>Traffic Volume (AADT, peak hour, heavy vehicles)</li>
          <li>Signage Corridor (intersections, signs within ±700m)</li>
          <li>TC Positions (±100m from work zone)</li>
          <li>Weather (when online)</li>
          <li>Nearby Amenities (when online)</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Lane Direction Diagram</h3>
        <p class="mb-3">The Work Zone Summary shows a visual lane diagram with direction arrows on dark grey lanes:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><span class="text-white">White arrows (↑)</span> = Traffic moving toward INCREASING SLK</li>
          <li><span class="text-yellow-400">Yellow arrows (↓)</span> = Traffic moving toward DECREASING SLK</li>
        </ul>
        <p class="mb-2"><strong>Lane allocation by carriageway:</strong></p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>Single:</strong> Even split assumed (e.g., 4 lanes = 2 each direction)</li>
          <li><strong>Left:</strong> All lanes travel INCREASING SLK</li>
          <li><strong>Right:</strong> All lanes travel DECREASING SLK</li>
        </ul>
        <p class="text-sm text-gray-400 mb-3">Note: Odd lane counts show a warning since allocation is uncertain.</p>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Road Width Breakdown</h3>
        <p class="mb-3">A visual bar shows the road width components from left to right:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><span class="text-amber-600">Amber</span> = Unsealed shoulder</li>
          <li><span class="text-gray-400">Gray</span> = Sealed shoulder</li>
          <li><span class="text-blue-400">Blue</span> = Trafficable lanes</li>
        </ul>
        <p class="text-sm text-gray-400">Widths are from MRWA Layer 12 (Pavement and Surfacing State).</p>
      `,
      },
      {
        id: 'drive',
        title: '5. Drive Page - GPS Tracking',
        keywords: [
          'gps',
          'tracking',
          'slk',
          'speed',
          'ekf',
          'confidence',
          'lookahead',
          'direction',
        ],
        content: `
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Starting GPS Tracking</h3>
        <p class="mb-3">From home page, tap the tracking icon (📍) next to your work zone, or tap "Start SLK Tracking". Grant location permission if prompted.</p>

        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">The SLK Display</h3>
        <p class="mb-2">A large SLK value shows your current position on the road. The display adapts based on whether you have a target set:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>No target:</strong> Shows current SLK, road ID, and road name</li>
          <li><strong>Target on same road:</strong> Shows SLK, target info (cyan), distance to target, ETA, and navigation buttons</li>
          <li><strong>Target on different road:</strong> Shows current SLK with destination info below</li>
        </ul>

        <p class="mb-2"><strong>SLK Color Indicators:</strong></p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><span class="text-green-400">Green</span> = Moving towards destination</li>
          <li><span class="text-red-400">Red (pulsing)</span> = Moving away from destination</li>
          <li><span class="text-white">White</span> = No destination set</li>
        </ul>

        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Speed Circle (if enabled)</h3>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><span class="text-green-400">Green</span> = At or below speed limit</li>
          <li><span class="text-red-400">Red</span> = Exceeding speed limit</li>
          <li><span class="text-yellow-400">Amber border</span> = Speed decrease ahead</li>
          <li><span class="text-green-400">Green border + ✓</span> = Community-verified zone</li>
        </ul>

        <p class="mb-2"><strong>EKF Status Indicators:</strong></p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li>● Green dot = High confidence</li>
          <li>◐ Yellow dot = Medium confidence</li>
          <li>○ Orange dot = Low confidence</li>
          <li>◈ Cyan diamond = Predicted (GPS outage)</li>
        </ul>

        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Speed Zone Lookahead</h3>
        <p class="mb-3">The app warns you before reaching speed zone changes. Amber border appears when approaching a speed decrease. Shows upcoming speed limit with distance countdown.</p>

        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Speed Display Toggle</h3>
        <p class="mb-3">In Settings, you can toggle "Show Speed During Tracking" to display or hide the current speed and posted speed limit during SLK tracking. Defaults to OFF.</p>
      `,
      },
      {
        id: 'aftercare',
        title: '6. AfterCare - Signage Tracking',
        keywords: [
          'aftercare',
          'signage',
          'tracking',
          'retrieval',
          'signs',
          'job',
          'placed',
          'collect',
        ],
        content: `
        <h3 class="text-lg font-semibold text-cyan-400 mt-4 mb-2">What is AfterCare?</h3>
        <p class="mb-3">AfterCare is a signage tracking system that helps Traffic Controllers manage signs placed on roads awaiting retrieval. It tracks what signs were placed, where, and when they need to be collected.</p>
        
        <h3 class="text-lg font-semibold text-cyan-400 mt-4 mb-2">Accessing AfterCare</h3>
        <p class="mb-3">From the home page, open Settings (☰) and tap "AfterCare Signs" in the TC Tools section.</p>
        
        <h3 class="text-lg font-semibold text-cyan-400 mt-4 mb-2">Creating a New Job</h3>
        <p class="mb-2">Tap "➕ New Job" and enter:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>Job Name</strong> - Auto-generated as "ROAD_ID - DD/MM/YYYY" (editable)</li>
          <li><strong>Road ID</strong> - e.g., M031</li>
          <li><strong>Retrieval Type</strong> - Standard (2 days), Scheduled, Maintain, or TBA</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-cyan-400 mt-4 mb-2">Adding Signs</h3>
        <p class="mb-2">For each sign, enter:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><strong>SLK</strong> - Location on road</li>
          <li><strong>Category</strong> - Surface, Speed, or Hazard</li>
          <li><strong>Sign Type</strong> - From presets or custom</li>
          <li><strong>Side</strong> - True Left (↑) or True Right (↓)</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-cyan-400 mt-4 mb-2">Job Status</h3>
        <ul class="space-y-1 mb-3 text-sm">
          <li><span class="text-red-400">🔴 Due for Retrieval</span> - Past scheduled date or 2-day standard</li>
          <li><span class="text-yellow-400">🟡 Due for Maintenance</span> - Maintenance interval passed</li>
          <li><span class="text-gray-400">⚪ TBA</span> - Awaiting instruction</li>
          <li><span class="text-green-400">🟢 Active</span> - Not yet due</li>
          <li><span class="text-blue-400">✓ Retrieved</span> - All signs collected</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-cyan-400 mt-4 mb-2">Map View</h3>
        <p class="mb-3">Tap the \"📍 Map\" button to see all signs on a full-screen OpenStreetMap:</p>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li><span class="text-green-400">🟢 Green markers</span> - Active signs</li>
          <li><span class="text-yellow-400">🟡 Yellow markers</span> - Due for maintenance</li>
          <li><span class="text-red-400">🔴 Red markers</span> - Due for retrieval</li>
        </ul>
        <p class="mb-3 text-sm text-gray-400">Filter buttons at top show only signs of selected status. Tap any marker for sign details (road ID, SLK, sign type, direction, description).</p>
        
        <h3 class="text-lg font-semibold text-cyan-400 mt-4 mb-2">Drive Page Integration</h3>
        <p class="text-sm text-gray-400">When driving, a cyan banner appears if there are AfterCare signs on the current road. Shows next upcoming sign with distance.</p>
      `,
      },
      {
        id: 'overrides',
        title: '7. Speed Sign Overrides',
        keywords: [
          'override',
          'speed',
          'sign',
          'correction',
          'direction',
          'true left',
          'true right',
          'mrwa',
        ],
        content: `
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Why Override Speed Zones?</h3>
        <p class="mb-3">Sometimes MRWA database doesn't match physical signs due to road works, sign relocations, or data entry errors. The override system lets you record correct speed limits based on field observation.</p>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Direction Reference</h3>
        <table class="w-full text-sm mb-3 border border-gray-600">
          <tr class="bg-gray-700">
            <th class="p-2 border border-gray-600">Direction</th>
            <th class="p-2 border border-gray-600">Carriageway</th>
            <th class="p-2 border border-gray-600">SLK Movement</th>
          </tr>
          <tr>
            <td class="p-2 border border-gray-600">True Left</td>
            <td class="p-2 border border-gray-600">Left Carriageway</td>
            <td class="p-2 border border-gray-600">INCREASING</td>
          </tr>
          <tr>
            <td class="p-2 border border-gray-600">True Right</td>
            <td class="p-2 border border-gray-600">Right Carriageway</td>
            <td class="p-2 border border-gray-600">DECREASING</td>
          </tr>
        </table>
        
        <p class="text-sm text-gray-400">Access via Settings → Speed Zone Overrides section, or go to /overrides</p>
      `,
      },
      {
        id: 'calibrate',
        title: '8. GPS Calibration',
        keywords: ['calibrate', 'lag', 'compensation', 'gps', 'delay', 'warning', 'timing'],
        content: `
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">What is GPS Lag?</h3>
        <p class="mb-3">GPS reports your position with a slight delay (typically 1-3 seconds). This affects the accuracy of speed zone lookahead warnings. The calibration tool measures this delay so the app can compensate.</p>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">How to Calibrate</h3>
        
        <p class="mb-2"><strong>Step 1: Set Target (Stationary)</strong></p>
        <p class="mb-3">Stand at a known location (e.g., a speed sign). Note the SLK. Tap "SET TARGET".</p>
        
        <p class="mb-2"><strong>Step 2: Mark Pass (Moving)</strong></p>
        <p class="mb-3">Drive past the same location. When you pass the sign, tap "MARK PASS" immediately.</p>
        
        <p class="mb-2"><strong>Step 3: Apply</strong></p>
        <p class="mb-3">The app calculates lag based on SLK difference. Tap "APPLY" to save to GPS settings.</p>
        
        <p class="text-sm text-gray-400">Recalibrate when speed warnings seem early/late, or after changing phones.</p>
      `,
      },
      {
        id: 'settings',
        title: '9. Settings',
        keywords: [
          'settings',
          'ekf',
          'filtering',
          'prediction',
          'wind',
          'gust',
          'download',
          'offline',
        ],
        content: `
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Accessing Settings</h3>
        <p class="mb-3">Tap the hamburger menu (☰) in the top-right corner of the home page. Settings opens as a <strong>bottom sheet drawer</strong> that slides up from the bottom. Swipe down or tap outside the drawer to close it.</p>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Settings Sections (Alphabetical)</h3>
        <ul class="list-disc list-inside space-y-1 mb-3 text-sm">
          <li><strong>About</strong> - App info, contact, contributors, user manual link</li>
          <li><strong>Admin Data Sync</strong> - Advanced MRWA sync options</li>
          <li><strong>GPS & Tracking</strong> - EKF settings, calibration, speed display</li>
          <li><strong>Offline Data</strong> - Download/clear road data</li>
          <li><strong>Preferences</strong> - Default region, wind gust threshold</li>
          <li><strong>Speed Zone Overrides</strong> - Community corrections</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">GPS Settings</h3>
        <ul class="list-disc list-inside space-y-1 mb-3 text-sm">
          <li><strong>EKF Filtering</strong> (default On) - Kalman filter for smoother GPS</li>
          <li><strong>Road Constraint</strong> (default On) - Snap predictions to road</li>
          <li><strong>Max Prediction Time</strong> (default 30s) - GPS outage limit</li>
          <li><strong>Show Uncertainty</strong> (default On) - Display ±Xm accuracy</li>
          <li><strong>Early Warnings</strong> (default On) - Alert earlier at higher speeds</li>
          <li><strong>Speed Lookahead</strong> (default 5s) - Warning lookahead time</li>
          <li><strong>GPS Lag Compensation</strong> (default 0s) - Measured lag offset</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Wind Gust Alert</h3>
        <p class="mb-3">Set threshold for wind gust warnings. Default is 60 km/h. Options: 40, 50, 60, 80 km/h.</p>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Offline Data</h3>
        <p class="mb-2"><strong>Download Data:</strong> Downloads all road data. Required before offline use.</p>
        <p><strong>Clear Data:</strong> Removes all offline data for fresh re-download.</p>
      `,
      },
      {
        id: 'troubleshooting',
        title: '10. Troubleshooting',
        keywords: [
          'wrong road',
          'incorrect',
          'gps not working',
          'speed limit',
          'warning',
          'problem',
          'error',
          'fix',
        ],
        content: `
        <h3 class="text-lg font-semibold text-yellow-400 mt-4 mb-2">App Shows Wrong Road</h3>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li>Make sure offline data is downloaded (green menu button)</li>
          <li>Check GPS accuracy - low confidence indicates poor signal</li>
          <li>Try clearing and re-downloading data</li>
          <li>For local roads, use manual entry instead of GPS</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-yellow-400 mt-4 mb-2">Speed Limit Incorrect</h3>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li>MRWA data may be outdated</li>
          <li>Add an override in the Overrides page</li>
          <li>Override takes precedence over MRWA data</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-yellow-400 mt-4 mb-2">GPS Not Working</h3>
        <ul class="list-disc list-inside space-y-1 mb-3">
          <li>Check location permissions in browser settings</li>
          <li>Make sure you're not in a building or underground</li>
          <li>Wait for GPS signal (can take 30+ seconds)</li>
          <li>Try refreshing the page</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-yellow-400 mt-4 mb-2">Speed Warnings Too Early/Late</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>Use the Calibrate page to measure GPS lag</li>
          <li>Apply the measured lag compensation</li>
          <li>Recalibrate if you change devices</li>
        </ul>
      `,
      },
      {
        id: 'reference',
        title: '11. Quick Reference',
        keywords: ['reference', 'direction', 'terminology', 'colors', 'distances', 'quick'],
        content: `
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Direction Terminology</h3>
        <table class="w-full text-sm mb-3 border border-gray-600">
          <tr class="bg-gray-700">
            <th class="p-2 border border-gray-600">Term</th>
            <th class="p-2 border border-gray-600">Meaning</th>
          </tr>
          <tr>
            <td class="p-2 border border-gray-600">True Left</td>
            <td class="p-2 border border-gray-600">INCREASING SLK (Left Carriageway)</td>
          </tr>
          <tr>
            <td class="p-2 border border-gray-600">True Right</td>
            <td class="p-2 border border-gray-600">DECREASING SLK (Right Carriageway)</td>
          </tr>
        </table>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Status Colors</h3>
        <ul class="space-y-1 mb-3 text-sm">
          <li><span class="text-green-400">● Green SLK</span> = Moving towards destination</li>
          <li><span class="text-red-400">● Red SLK (pulsing)</span> = Moving away from destination</li>
          <li><span class="text-white">● White SLK</span> = No destination set</li>
          <li><span class="text-yellow-400">◐ Amber border</span> = Speed decrease ahead</li>
          <li><span class="text-green-400">✓ Green border</span> = Community-verified zone</li>
        </ul>
        
        <h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">Key Distances</h3>
        <ul class="list-disc list-inside space-y-1 text-sm">
          <li>TC Positions: ±100m from work zone</li>
          <li>Signage Corridor: ±700m from work zone</li>
          <li>Intersections: ±100m from work zone</li>
        </ul>
      `,
      },
    ],
    []
  );

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase();
    return sections.filter((section) => {
      const titleMatch = section.title.toLowerCase().includes(query);
      const contentMatch = section.content.toLowerCase().includes(query);
      const keywordMatch = section.keywords.some((kw) => kw.includes(query));
      return titleMatch || contentMatch || keywordMatch;
    });
  }, [searchQuery, sections]);

  // Quick nav chips for common sections
  const quickNavItems = [
    { id: 'intro', label: 'Intro', icon: '📋' },
    { id: 'offline', label: 'Offline', icon: '📦' },
    { id: 'drive', label: 'GPS', icon: '📍' },
    { id: 'settings', label: 'Settings', icon: '☰' },
    { id: 'troubleshooting', label: 'Fix', icon: '🔧' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button size="sm" className="bg-gray-700 text-gray-300 hover:bg-gray-600">
              ← Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">User Manual</h1>
          <div className="w-16"></div>
        </div>

        <p className="text-xs text-gray-400 text-center mb-4">Version RC 1.7.13 • March 2026</p>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <Input
              type="text"
              placeholder="Search manual..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white pl-10 h-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Nav Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300 hover:bg-gray-700 hover:border-blue-500 transition-colors"
            >
              {item.icon} {item.label}
            </button>
          ))}

          {/* View Toggle */}
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setViewMode('accordion')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'accordion' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              ▶ Accordion
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-2 py-1 text-xs rounded ${viewMode === 'full' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              📄 Full
            </button>
          </div>
        </div>

        {/* Search Results Count */}
        {searchQuery && (
          <p className="text-xs text-gray-400 mb-3">
            {filteredSections.length === 0
              ? 'No results found'
              : `${filteredSections.length} section${filteredSections.length !== 1 ? 's' : ''} found`}
          </p>
        )}

        {/* Sections */}
        {viewMode === 'accordion' ? (
          <div className="space-y-2">
            {filteredSections.map((section) => (
              <div
                key={section.id}
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
                className="bg-gray-800 rounded-lg border border-gray-700"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-750"
                >
                  <span className="font-semibold text-blue-400">{section.title}</span>
                  <span className="text-gray-400 text-xl">
                    {expandedSection === section.id ? '−' : '+'}
                  </span>
                </button>
                {expandedSection === section.id && (
                  <div
                    className="px-4 pb-4 text-sm text-gray-300"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSections.map((section) => (
              <div
                key={section.id}
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
                className="bg-gray-800 rounded-lg border border-gray-700 p-4"
              >
                <h2 className="text-lg font-semibold text-blue-400 mb-3">{section.title}</h2>
                <div
                  className="text-sm text-gray-300"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {searchQuery && filteredSections.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">🔍</p>
            <p>No results found for "{searchQuery}"</p>
            <p className="text-sm mt-1">Try different keywords</p>
          </div>
        )}

        {/* Glossary */}
        <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-blue-400 mb-3">Glossary</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-semibold text-white">SLK (Straight Line Kilometre)</dt>
              <dd className="text-gray-400 ml-2">
                Linear reference system for road locations. Values increase from one end to the
                other.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">True Left / True Right</dt>
              <dd className="text-gray-400 ml-2">
                Direction terminology for WA roads. True Left = INCREASING SLK, True Right =
                DECREASING SLK.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">EKF (Extended Kalman Filter)</dt>
              <dd className="text-gray-400 ml-2">
                Algorithm that smooths GPS data for more accurate tracking.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Override</dt>
              <dd className="text-gray-400 ml-2">
                User-recorded correction to MRWA speed zone data.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">IndexedDB</dt>
              <dd className="text-gray-400 ml-2">
                Browser database storing road data locally for offline access.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">MRWA</dt>
              <dd className="text-gray-400 ml-2">
                Main Roads Western Australia - manages WA roads and provides data.
              </dd>
            </div>
          </dl>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          TC Work Zone Locator • For Traffic Controllers in Western Australia
        </div>
      </div>
    </div>
  );
}
