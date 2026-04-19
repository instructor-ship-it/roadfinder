'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { APP_VERSION } from '@/components/SettingsDrawer';
import { WeatherData, WarningData, TrafficData } from '@/types/shared';
import {
  calculateMaxHoldTime,
  PREPARE_TO_STOP_DISTANCE_M,
  ADV_QUEUE_WARNING_DISTANCE_M,
} from '@/lib/max-hold-time';
import { formatAusDate, type TrafficCountRecord } from '@/lib/traffic-counter-storage';
import type { SignageItem, ParsedSpeedZone } from '@/lib/offline-db';

// ─── Types ───────────────────────────────────────────────────────────────

interface Position {
  lat: number;
  lon: number;
  speed: string;
  cwy: string;
}

interface WorkZoneResult {
  road_id: string;
  road_name: string;
  network_type?: string;
  work_zone: {
    start_slk: number;
    end_slk: number;
    length_m: number;
    start: Position | null;
    end: Position | null;
  };
  tc_positions: {
    start_slk: number;
    end_slk: number;
    start: Position | null;
    end: Position | null;
    tc_length_m?: number;
  };
  approach_signs: {
    start_slk: number;
    end_slk: number;
    start: Position | null;
    end: Position | null;
  };
  speed_zones: {
    approach_start: string;
    tc_start: string;
    work_zone_start: string;
    work_zone_end: string;
    tc_end: string;
    approach_end: string;
  };
  carriageway: string;
  pavement?: {
    lanes: number | null;
    width_m: number | null;
    cwy: string;
    total_pave_width: number | null;
    total_seal_width: number | null;
    sealed_shoulder_l: number | null;
    sealed_shoulder_r: number | null;
    unsealed_shoulder_l: number | null;
    unsealed_shoulder_r: number | null;
    kerb_l: string | null;
    kerb_r: string | null;
  };
  midpoint: { lat: number; lon: number; slk: number } | null;
  google_maps: {
    work_zone_start: string | null;
    work_zone_end: string | null;
    tc_start: string | null;
    tc_end: string | null;
  };
}

interface Place {
  name: string;
  distance: string;
  lat: number;
  lon: number;
  phone?: string;
  address?: string;
  googleMapsUrl: string;
  isEmergency?: boolean;
  hospitalType?: string;
  hospitalCategory?: string;
  beds?: number;
  suburb?: string;
  fuelBrand?: string;
  fuelPrice?: number;
  fuelDate?: string;
  siteFeatures?: string[];
  toiletType?: string;
  openingHours?: string;
  wheelchair?: boolean;
  toiletNote?: string;
  toiletUrl?: string;
  toiletSource?: string;
}

interface PlacesData {
  hospital: Place | null;
  toilet: Place | null;
  fuelStation: Place | null;
  fromCache?: boolean;
  cachedAt?: number;
  cachedLocation?: { lat: number; lon: number };
  source?: string;
  dataUnavailable?: boolean;
  hospitalSource?: string;
  fuelSource?: string;
}

interface CrossRoad {
  name: string;
  distance: string;
  lat: number;
  lon: number;
  roadType: string;
  googleMapsUrl: string;
  intersectionSlk?: number;
}

export interface WorkZoneReportProps {
  isOpen: boolean;
  onClose: () => void;
  result: WorkZoneResult | null;
  weather: WeatherData | null;
  warnings: WarningData | null;
  traffic: TrafficData | null;
  places: PlacesData | null;
  crossRoads: CrossRoad[];
  signageCorridor: SignageItem[];
  corridorIntersections: CrossRoad[];
  userTrafficCounts: TrafficCountRecord[];
  selectedCountDetail: TrafficCountRecord | null;
  corridorSpeedZones: ParsedSpeedZone[];
  windGustThreshold: number;
}

// ─── Helper Functions ───────────────────────────────────────────────────

const openStreetView = (lat: number, lon: number) => {
  window.open(
    `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
    '_blank'
  );
};

const openGoogleMaps = (url: string | null) => {
  if (url) window.open(url, '_blank');
};

// ─── Component ───────────────────────────────────────────────────────────

export function WorkZoneReport({
  isOpen,
  onClose,
  result,
  weather,
  warnings,
  traffic,
  places,
  crossRoads,
  signageCorridor,
  corridorIntersections,
  userTrafficCounts,
  selectedCountDetail,
  corridorSpeedZones,
  windGustThreshold,
}: WorkZoneReportProps) {
  const [reportContent, setReportContent] = useState<string>('');
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);

  // User traffic override - use selectedCountDetail if available
  const userTrafficOverride = selectedCountDetail;

  // Generate the report
  const generateReport = useCallback(() => {
    if (!isOpen) return;

    setReportGenerating(true);

    const timestamp = new Date().toLocaleString('en-AU', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // Build text version for clipboard/download
    const lines: string[] = [];
    lines.push('╔════════════════════════════════════════════════════════════════╗');
    lines.push('║         TC WORK ZONE LOCATOR - WORK ZONE REPORT                ║');
    lines.push('╚════════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`Generated: ${timestamp}`);
    lines.push(`App Version:      ${APP_VERSION}`);
    lines.push('');

    // === WORK ZONE SUMMARY ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📍 WORK ZONE SUMMARY');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (result) {
      lines.push(`Road ID:          ${result.road_id}`);
      lines.push(`Road Name:        ${result.road_name}`);
      if (result.network_type) {
        lines.push(`Network Type:     ${result.network_type}`);
      }
      lines.push(`Carriageway:      ${result.carriageway}`);
      lines.push('');
      lines.push(`Start SLK:        ${result.work_zone.start_slk.toFixed(3)} km`);
      lines.push(`End SLK:          ${result.work_zone.end_slk.toFixed(3)} km`);
      lines.push(`Zone Length:      ${result.work_zone.length_m} m`);
      lines.push('');
      if (result.pavement) {
        lines.push(`Lanes:            ${result.pavement.lanes || 'Unknown'}`);
        lines.push('');

        // Road width breakdown with visual bar
        const p = result.pavement;
        const unsealedL = p.unsealed_shoulder_l || 0;
        const sealedL = p.sealed_shoulder_l || 0;
        const trafficable = p.width_m || 0;
        const sealedR = p.sealed_shoulder_r || 0;
        const unsealedR = p.unsealed_shoulder_r || 0;
        // Note: kerb_l and kerb_r are string types (e.g., "YES", "NO"), not width values
        const hasKerbL =
          p.kerb_l && p.kerb_l.toUpperCase() !== 'NO' && p.kerb_l.toUpperCase() !== 'NONE';
        const hasKerbR =
          p.kerb_r && p.kerb_r.toUpperCase() !== 'NO' && p.kerb_r.toUpperCase() !== 'NONE';
        const totalWidth =
          p.total_pave_width || unsealedL + sealedL + trafficable + sealedR + unsealedR;

        lines.push('Road Width Breakdown:');
        lines.push('');

        // Create visual bar (50 characters wide)
        const barWidth = 50;
        const segments: { width: number; char: string; label: string; color: string }[] = [];

        if (hasKerbL) segments.push({ width: 0.3, char: '▒', label: 'Kerb L', color: 'gray' });
        if (unsealedL > 0)
          segments.push({ width: unsealedL, char: '░', label: 'Unsealed L', color: 'brown' });
        if (sealedL > 0)
          segments.push({ width: sealedL, char: '▓', label: 'Sealed L', color: 'gray' });
        segments.push({ width: trafficable, char: '█', label: 'Trafficable', color: 'blue' });
        if (sealedR > 0)
          segments.push({ width: sealedR, char: '▓', label: 'Sealed R', color: 'gray' });
        if (unsealedR > 0)
          segments.push({ width: unsealedR, char: '░', label: 'Unsealed R', color: 'brown' });
        if (hasKerbR) segments.push({ width: 0.3, char: '▒', label: 'Kerb R', color: 'gray' });

        // Build the visual bar
        let visualBar = '│';
        for (const seg of segments) {
          const charCount = Math.max(1, Math.round((seg.width / totalWidth) * barWidth));
          visualBar += seg.char.repeat(charCount);
        }
        visualBar += '│';

        lines.push('  ' + visualBar);
        lines.push('  └' + '─'.repeat(barWidth + 2) + '┘');
        lines.push('');

        // Legend and values
        lines.push('  Legend: ░ = Unsealed  ▒ = Kerb  ▓ = Sealed Shoulder  █ = Trafficable');
        lines.push('');

        if (hasKerbL) {
          lines.push(`  Kerb (Left):           ${p.kerb_l}`);
        }
        if (unsealedL > 0) {
          lines.push(`  Unsealed Shoulder (L): ${unsealedL.toFixed(1)} m`);
        }
        if (sealedL > 0) {
          lines.push(`  Sealed Shoulder (L):   ${sealedL.toFixed(1)} m`);
        }
        lines.push(`  Trafficable Width:     ${trafficable.toFixed(1)} m`);
        if (sealedR > 0) {
          lines.push(`  Sealed Shoulder (R):   ${sealedR.toFixed(1)} m`);
        }
        if (unsealedR > 0) {
          lines.push(`  Unsealed Shoulder (R): ${unsealedR.toFixed(1)} m`);
        }
        if (hasKerbR) {
          lines.push(`  Kerb (Right):          ${p.kerb_r}`);
        }
        lines.push('');
        if (p.total_pave_width) {
          lines.push(`  Total Pave Width: ${p.total_pave_width.toFixed(1)} m`);
        }
        if (p.total_seal_width) {
          lines.push(`  Total Seal Width: ${p.total_seal_width.toFixed(1)} m`);
        }
      }
    }
    lines.push('');

    // === SPEED ZONES ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🚦 SPEED ZONES');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (result?.speed_zones) {
      lines.push(`Approach Start:   ${result.speed_zones.approach_start}`);
      lines.push(`TC Start:         ${result.speed_zones.tc_start}`);
      lines.push(`Work Zone Start:  ${result.speed_zones.work_zone_start}`);
      lines.push(`Work Zone End:    ${result.speed_zones.work_zone_end}`);
      lines.push(`TC End:           ${result.speed_zones.tc_end}`);
      lines.push(`Approach End:     ${result.speed_zones.approach_end}`);
    } else {
      lines.push('No speed zone data available');
    }
    lines.push('');

    // === TC POSITIONS ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('👷 TC POSITIONS (±100m from work zone)');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (result?.tc_positions) {
      lines.push('');
      lines.push('TC START:');
      lines.push(`  SLK:            ${result.tc_positions.start_slk.toFixed(3)} km`);
      if (result.tc_positions.start) {
        lines.push(
          `  Coordinates:    ${result.tc_positions.start.lat.toFixed(6)}, ${result.tc_positions.start.lon.toFixed(6)}`
        );
        lines.push(`  Speed:          ${result.tc_positions.start.speed}`);
      }
      if (result.google_maps?.tc_start) {
        lines.push(`  Google Maps:    ${result.google_maps.tc_start}`);
      }
      lines.push('');
      lines.push('TC END:');
      lines.push(`  SLK:            ${result.tc_positions.end_slk.toFixed(3)} km`);
      if (result.tc_positions.end) {
        lines.push(
          `  Coordinates:    ${result.tc_positions.end.lat.toFixed(6)}, ${result.tc_positions.end.lon.toFixed(6)}`
        );
        lines.push(`  Speed:          ${result.tc_positions.end.speed}`);
      }
      if (result.google_maps?.tc_end) {
        lines.push(`  Google Maps:    ${result.google_maps.tc_end}`);
      }
    }
    lines.push('');

    // === SIGNAGE CORRIDOR ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🚸 SIGNAGE CORRIDOR (±700m)');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (signageCorridor && signageCorridor.length > 0 && result) {
      // Calculate corridor bounds for ±700m filtering
      const workZoneStart = result.work_zone.start_slk;
      const workZoneEnd = result.work_zone.end_slk || result.work_zone.start_slk;
      const corridorStart = workZoneStart - 0.7;
      const corridorEnd = workZoneEnd + 0.7;

      // Filter all signage to corridor bounds
      const corridorSignage = signageCorridor.filter(
        (s) => s.slk >= corridorStart && s.slk <= corridorEnd
      );

      // Group by category
      const speedSigns = corridorSignage.filter((s) => s.category === 'speed');
      const warningSigns = corridorSignage.filter((s) => s.category === 'warning');
      const railCrossings = corridorSignage.filter((s) => s.category === 'railway');

      // Intersections: Use corridorIntersections (±700m range for signage corridor)
      // Filter out the main road name to avoid showing it as an intersection
      const nearbyIntersections = corridorIntersections.filter(
        (road) => result && road.name.toLowerCase() !== result.road_name.toLowerCase()
      );

      if (speedSigns.length > 0) {
        lines.push('');
        lines.push('Speed Restriction Signs:');
        speedSigns.forEach((s) => {
          lines.push(
            `  • SLK ${s.slk.toFixed(2)}: ${s.sign_type} - ${s.description} (${s.action})`
          );
          if (s.speedLimit) lines.push(`    Speed: ${s.speedLimit} km/h`);
        });
      }

      if (warningSigns.length > 0) {
        lines.push('');
        lines.push('Warning Signs:');
        warningSigns.forEach((s) => {
          lines.push(`  • SLK ${s.slk.toFixed(2)}: ${s.sign_type} - ${s.description}`);
        });
      }

      if (railCrossings.length > 0) {
        lines.push('');
        lines.push('Rail Crossings:');
        railCrossings.forEach((s) => {
          lines.push(`  • SLK ${s.slk.toFixed(2)}: ${s.description}`);
        });
      }

      if (nearbyIntersections.length > 0) {
        lines.push('');
        lines.push('Intersections (within TC zone):');
        nearbyIntersections.forEach((road) => {
          const slk =
            road.intersectionSlk ?? parseFloat(road.distance) + (result?.work_zone?.start_slk || 0);
          lines.push(`  • SLK ${slk.toFixed(2)}: ${road.name} (${road.roadType})`);
        });
      }

      // Count total items (corridor signage + nearby intersections)
      const totalItems = corridorSignage.length + nearbyIntersections.length;
      lines.push('');
      lines.push(`Total items in corridor: ${totalItems}`);
    } else {
      lines.push('No signage data available');
    }
    lines.push('');

    // === WEATHER ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🌤️ WEATHER');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (weather) {
      lines.push(`Location:         ${weather.location}`);
      lines.push('');
      lines.push('Current Conditions:');
      lines.push(`  Temperature:    ${weather.current.temp}°C`);
      lines.push(`  Condition:      ${weather.current.condition}`);
      lines.push(`  Humidity:       ${weather.current.humidity}%`);
      lines.push(`  Wind:           ${weather.current.windSpeed} km/h ${weather.current.windDir}`);
      lines.push(`  Wind Gust:      ${weather.current.windGust} km/h`);
      if (weather.current.windGust >= windGustThreshold) {
        lines.push(`  ⚠️ HIGH WIND GUST ALERT (threshold: ${windGustThreshold} km/h)`);
      }
      lines.push('');
      lines.push('Sun Data:');
      lines.push(`  Sunrise:        ${weather.sun.sunrise}`);
      lines.push(`  Sunset:         ${weather.sun.sunset}`);
      lines.push(`  Daylight:       ${weather.sun.daylightHours}`);
      lines.push(`  UV Index:       ${weather.sun.uvIndex} (${weather.sun.uvLevel})`);
    } else {
      lines.push('No weather data available');
    }
    lines.push('');

    // === WEATHER WARNINGS ===
    if (warnings && warnings.count > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('⚠️ WEATHER WARNINGS');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      warnings.warnings.forEach((w, i) => {
        lines.push(`${i + 1}. ${w.title}`);
        if (w.description) {
          lines.push(`   ${w.description.substring(0, 100)}...`);
        }
        lines.push(`   Link: ${w.link}`);
        lines.push('');
      });
    }

    // === TRAFFIC VOLUME ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🚗 TRAFFIC VOLUME');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Determine effective values (MRWA or user override)
    const effectiveVphBothDir = (() => {
      if (userTrafficOverride) {
        const ovOneDir = userTrafficOverride.vph_one_direction || 0;
        return userTrafficOverride.direction_mode === 'both-ways'
          ? userTrafficOverride.vph_combined || ovOneDir * 2
          : ovOneDir * 2;
      }
      return traffic?.peak_hour_volume || (traffic?.aadt ? Math.round(traffic.aadt * 0.1) : 0);
    })();
    const effectiveVphOneDir = (() => {
      if (userTrafficOverride) return userTrafficOverride.vph_one_direction || 0;
      return Math.round(effectiveVphBothDir / 2);
    })();
    const effectiveHeavyPct = (() => {
      if (userTrafficOverride) return userTrafficOverride.heavy_percentage || 0;
      return traffic?.heavy_vehicle_percent || 0;
    })();

    if (traffic) {
      lines.push('Historical Data (MRWA):');
      lines.push(`  AADT:           ${traffic.aadt?.toLocaleString() || 'N/A'} vehicles/day`);
      lines.push(`  Peak Hour:      ${traffic.peak_hour_volume || 'N/A'} vehicles/hour (both dir)`);
      lines.push(`  Heavy Vehicles: ${traffic.heavy_vehicle_percent}%`);
      lines.push(`  Data Year:      ${traffic.aadt_year}`);
      if (traffic.distance_to_site !== undefined) {
        lines.push(`  Count Site:     ${traffic.distance_to_site} km from work zone`);
      }
      lines.push(`  Source:         ${traffic.source}`);
    } else {
      lines.push('No historical traffic data available');
    }

    // User traffic count override
    if (userTrafficOverride) {
      const ov = userTrafficOverride;
      lines.push('');
      lines.push('Live Count Data (user counted — used for calculations):');
      lines.push(`  Date:           ${formatAusDate(ov.date)}`);
      lines.push(`  Time:           ${ov.start_time} - ${ov.end_time}`);
      lines.push(`  Duration:       ${ov.duration_minutes} min`);
      lines.push(
        `  Direction:      ${ov.direction_mode === 'both-ways' ? 'Both directions' : 'One direction'}`
      );
      lines.push(`  Total Vehicles: ${ov.total_vehicles}`);
      lines.push(`  Heavy Vehicles: ${ov.heavy_percentage}%`);
      lines.push(`  Combined VPH:   ${effectiveVphBothDir}`);
      lines.push(`  VPH/Direction:  ${effectiveVphOneDir}`);
      if (ov.direction_mode === 'both-ways') {
        lines.push('');
        lines.push('  Per Direction:');
        lines.push(
          `    True Left:    ${ov.true_left_light} light, ${ov.true_left_heavy} heavy (${ov.vph_true_left} VPH)`
        );
        lines.push(
          `    True Right:   ${ov.true_right_light} light, ${ov.true_right_heavy} heavy (${ov.vph_true_right} VPH)`
        );
      }
      if (ov.queue_length) {
        lines.push(`  Queue Length:   ${ov.queue_length}m`);
      }
      if (ov.notes) {
        lines.push(`  Notes:          ${ov.notes}`);
      }
    }
    lines.push('');

    // === TRAFFIC CALCULATIONS ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 TRAFFIC CALCULATIONS');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (effectiveVphBothDir > 0) {
      const reductionFactor = effectiveHeavyPct > 10 ? 0.8 : 1;
      const reducedVph = Math.round(effectiveVphBothDir * reductionFactor);

      lines.push(`Effective VPH (both dir):  ${effectiveVphBothDir}`);
      lines.push(`Effective VPH (one dir):   ${effectiveVphOneDir}`);
      lines.push(`Heavy Vehicle %:           ${effectiveHeavyPct}%`);
      if (effectiveHeavyPct > 10) {
        lines.push(`Heavy Reduction Factor:   ×${reductionFactor} (>10% heavy vehicles)`);
        lines.push(`Reduced VPH (both dir):   ${reducedVph}`);
      }
      lines.push('');

      // Shuttle flow
      const getShuttleLength = (v: number) => {
        if (v >= 701) return '70m';
        if (v >= 601) return '100m';
        if (v >= 501) return '150m';
        if (v >= 401) return '250m';
        if (v >= 351) return '400m';
        if (v >= 301) return '600m';
        if (v >= 251) return '800m';
        if (v >= 201) return '1200m';
        if (v >= 151) return '1600m';
        return '2200m';
      };
      const shuttleLen = getShuttleLength(reducedVph);
      const shuttleRisk = reducedVph < 301;
      lines.push(
        `Shuttle Flow Max Length:   ${shuttleLen}${shuttleRisk ? ' (exceeds AGTTM — risk assessment required)' : ''}`
      );
      lines.push('');

      // Lane capacity
      const getLaneCap = (v: number) => {
        if (v <= 1000) return '1 lane';
        if (v <= 2000) return '2 lanes';
        if (v <= 3000) return '3 lanes';
        return '4+ lanes';
      };
      const reducedOneDir = Math.round(effectiveVphOneDir * reductionFactor);
      lines.push(`Lane Capacity (one dir):  ${getLaneCap(reducedOneDir)} (${reducedOneDir} VPH)`);
      lines.push('');

      // Max hold time
      const maxHold = calculateMaxHoldTime(effectiveVphOneDir, effectiveHeavyPct);
      if (maxHold) {
        lines.push(`Maximum Hold Time:        ${maxHold.maxHoldTimeMinutes} min`);
        lines.push(
          `Recommended Stop:        ${maxHold.recommendedStopMinutes} min${maxHold.belowMinimum ? ' (exceeds max!)' : ''}`
        );
        lines.push(`Queue Growth Rate:       ${maxHold.queueGrowthRate} m/min`);
        lines.push(
          `Queue @ ${maxHold.recommendedStopMinutes}min stop:     ${maxHold.queueAtRecommendedStop}m`
        );
        lines.push(`Prepare to Stop Distance: ${PREPARE_TO_STOP_DISTANCE_M}m`);
        lines.push(`Adv Queue Warning Dist:   ${ADV_QUEUE_WARNING_DISTANCE_M}m`);
        if (maxHold.queueAtRecommendedStop > PREPARE_TO_STOP_DISTANCE_M) {
          lines.push(`⚠️ Queue at recommended stop exceeds Prepare to Stop distance`);
        }
      }

      if (userTrafficOverride) {
        lines.push('');
        lines.push(
          `* Calculations based on live user count of ${userTrafficOverride.duration_minutes}min on ${formatAusDate(userTrafficOverride.date)}`
        );
      } else {
        lines.push('');
        lines.push('* Calculations based on MRWA historical data');
      }
    } else {
      lines.push('No traffic data available for calculations');
    }
    lines.push('');

    // === NEARBY AMENITIES ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🏥 NEARBY AMENITIES');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (places) {
      if (places.hospital) {
        lines.push('');
        lines.push('Hospital:');
        lines.push(`  Name:           ${places.hospital.name}`);
        lines.push(`  Distance:       ${places.hospital.distance} km`);
        if (places.hospital.hospitalType) {
          lines.push(`  Type:           ${places.hospital.hospitalType}`);
        }
        if (places.hospital.isEmergency) {
          lines.push(`  Emergency Dept: Yes`);
        }
        if (places.hospital.address) {
          lines.push(`  Address:        ${places.hospital.address}`);
        }
        if (places.hospital.phone) {
          lines.push(`  Phone:          ${places.hospital.phone}`);
        }
        if (places.hospital.beds) {
          lines.push(`  Beds:           ${places.hospital.beds}`);
        }
      }
      if (places.fuelStation) {
        lines.push('');
        lines.push('Fuel Station:');
        lines.push(`  Name:           ${places.fuelStation.name}`);
        lines.push(`  Distance:       ${places.fuelStation.distance} km`);
        if (places.fuelStation.fuelPrice) {
          lines.push(
            `  Diesel Price:   ${places.fuelStation.fuelPrice.toFixed(1)} c/L ($${(places.fuelStation.fuelPrice / 100).toFixed(2)})`
          );
        } else {
          lines.push(`  Diesel Price:   No price reported today`);
        }
        if (places.fuelStation.fuelDate) {
          lines.push(`  Price Date:     ${places.fuelStation.fuelDate}`);
        }
        if (places.fuelStation.address) {
          lines.push(`  Address:        ${places.fuelStation.address}`);
        }
        if (places.fuelStation.phone) {
          lines.push(`  Phone:          ${places.fuelStation.phone}`);
        }
        if (places.fuelStation.siteFeatures && places.fuelStation.siteFeatures.length > 0) {
          lines.push(`  Features:       ${places.fuelStation.siteFeatures.join(', ')}`);
        }
      }
      if (places.toilet) {
        lines.push('');
        lines.push('Public Toilet:');
        lines.push(`  Name:           ${places.toilet.name}`);
        lines.push(`  Distance:       ${places.toilet.distance} km`);
        if (places.toilet.address) {
          lines.push(
            `  Address:        ${places.toilet.address}${places.toilet.suburb ? `, ${places.toilet.suburb}` : ''}`
          );
        }
        if (places.toilet.openingHours) {
          lines.push(`  Hours:          ${places.toilet.openingHours}`);
        }
        const toiletFeatures: string[] = [];
        if (places.toilet.wheelchair) toiletFeatures.push('♿ Wheelchair accessible');
        if (places.toilet.toiletType) toiletFeatures.push(places.toilet.toiletType);
        if (toiletFeatures.length > 0) {
          lines.push(`  Features:       ${toiletFeatures.join(' · ')}`);
        }
      }
      if (!places.hospital && !places.fuelStation && !places.toilet) {
        lines.push('No amenities found nearby');
      }
    } else {
      lines.push('No amenities data available');
    }
    lines.push('');

    // === INTERSECTING ROADS ===
    if (crossRoads && crossRoads.length > 0) {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lines.push('🔀 INTERSECTING ROADS IN TC ZONE');
      lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      crossRoads
        .filter((road) => result && road.name.toLowerCase() !== result.road_name.toLowerCase())
        .forEach((road) => {
          lines.push(`• ${road.name} (${road.roadType}) - ${road.distance} km from TC start`);
        });
      lines.push('');
      lines.push('⚠️ Consider TC coverage for these intersecting roads');
      lines.push('');
    }

    // === GOOGLE MAPS LINKS ===
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🗺️ GOOGLE MAPS LINKS');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (result?.google_maps) {
      if (result.google_maps.work_zone_start) {
        lines.push(`Work Zone Start: ${result.google_maps.work_zone_start}`);
      }
      if (result.google_maps.work_zone_end) {
        lines.push(`Work Zone End:   ${result.google_maps.work_zone_end}`);
      }
    }
    lines.push('');

    // Footer
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Report generated by TC Work Zone Locator v${APP_VERSION}`);
    lines.push('Data sources: MRWA Open Data, Open-Meteo Weather, OpenStreetMap');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Store text version for clipboard/download
    setReportContent(lines.join('\n'));

    // Generate HTML report for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report');
      setReportGenerating(false);
      return;
    }

    // Helper for road width visual bar
    const generateWidthBar = () => {
      if (!result?.pavement?.total_pave_width) return '';
      const p = result.pavement;
      const totalWidth = p.total_pave_width || 1; // Already guarded above, but TS needs fallback
      const unsealedL = p.unsealed_shoulder_l || 0;
      const sealedL = p.sealed_shoulder_l || 0;
      const trafficable = p.width_m || 0;
      const sealedR = p.sealed_shoulder_r || 0;
      const unsealedR = p.unsealed_shoulder_r || 0;

      const pctUnsealedL = (unsealedL / totalWidth) * 100;
      const pctSealedL = (sealedL / totalWidth) * 100;
      const pctTrafficable = (trafficable / totalWidth) * 100;
      const pctSealedR = (sealedR / totalWidth) * 100;
      const pctUnsealedR = (unsealedR / totalWidth) * 100;

      return `
        <div class="width-bar">
          ${unsealedL > 0 ? `<div class="width-segment unsealed" style="width: ${pctUnsealedL}%" title="Unsealed L: ${unsealedL.toFixed(1)}m"></div>` : ''}
          ${sealedL > 0 ? `<div class="width-segment sealed" style="width: ${pctSealedL}%" title="Sealed L: ${sealedL.toFixed(1)}m"></div>` : ''}
          <div class="width-segment trafficable" style="width: ${pctTrafficable}%" title="Trafficable: ${trafficable.toFixed(1)}m">${trafficable.toFixed(1)}m</div>
          ${sealedR > 0 ? `<div class="width-segment sealed" style="width: ${pctSealedR}%" title="Sealed R: ${sealedR.toFixed(1)}m"></div>` : ''}
          ${unsealedR > 0 ? `<div class="width-segment unsealed" style="width: ${pctUnsealedR}%" title="Unsealed R: ${unsealedR.toFixed(1)}m"></div>` : ''}
        </div>
        <div class="width-legend">
          ${unsealedL > 0 ? `<span class="legend-item"><span class="legend-color unsealed"></span>Unsealed ${unsealedL.toFixed(1)}m</span>` : ''}
          ${sealedL > 0 ? `<span class="legend-item"><span class="legend-color sealed"></span>Sealed ${sealedL.toFixed(1)}m</span>` : ''}
          <span class="legend-item"><span class="legend-color trafficable"></span>Lanes ${trafficable.toFixed(1)}m</span>
          ${sealedR > 0 ? `<span class="legend-item"><span class="legend-color sealed"></span>Sealed ${sealedR.toFixed(1)}m</span>` : ''}
          ${unsealedR > 0 ? `<span class="legend-item"><span class="legend-color unsealed"></span>Unsealed ${unsealedR.toFixed(1)}m</span>` : ''}
        </div>
      `;
    };

    // Helper for lane direction diagram
    const generateLaneDirection = () => {
      if (!result?.pavement?.lanes || result.pavement.lanes === 0) return '';
      const lanes = result.pavement.lanes;
      const cwy = result.pavement.cwy || 'Single';

      // Determine lanes per direction
      let lanesIncreasing = 0; // → toward higher SLK
      let lanesDecreasing = 0; // ← toward lower SLK

      if (cwy === 'Single') {
        lanesIncreasing = Math.ceil(lanes / 2);
        lanesDecreasing = Math.floor(lanes / 2);
      } else if (cwy === 'Left') {
        lanesIncreasing = lanes;
        lanesDecreasing = 0;
      } else if (cwy === 'Right') {
        lanesIncreasing = 0;
        lanesDecreasing = lanes;
      }

      // Build lane segments
      const laneSegments: string[] = [];
      let incNum = 0;
      let decNum = 0;

      for (let i = 0; i < lanesIncreasing; i++) {
        incNum++;
        laneSegments.push(
          `<div class="lane-segment increasing" title="Toward higher SLK (↑)"><span class="lane-arrow">↑</span>${lanes >= 3 ? `<span class="lane-num">L${incNum}</span>` : ''}</div>`
        );
      }
      for (let i = 0; i < lanesDecreasing; i++) {
        decNum++;
        const laneNum = lanesDecreasing - i;
        laneSegments.push(
          `<div class="lane-segment decreasing" title="Toward lower SLK (↓)"><span class="lane-arrow">↓</span>${lanes >= 3 ? `<span class="lane-num">L${laneNum}</span>` : ''}</div>`
        );
      }

      // Direction explanation
      let explanation = '';
      if (cwy === 'Single') {
        if (lanes % 2 !== 0) {
          explanation = `⚠️ Odd lane count - allocation uncertain. Assuming ${lanesIncreasing} lane(s) INCREASING, ${lanesDecreasing} lane(s) DECREASING`;
        } else {
          explanation = `${lanesIncreasing} lane(s) toward INCREASING SLK, ${lanesDecreasing} lane(s) toward DECREASING SLK`;
        }
      } else if (cwy === 'Left') {
        explanation = 'Left carriageway: all lanes travel toward INCREASING SLK';
      } else {
        explanation = 'Right carriageway: all lanes travel toward DECREASING SLK';
      }

      return `
        <h3>Lane Directions (${lanes} lanes total)</h3>
        <div class="lane-diagram">
          ${laneSegments.join('')}
        </div>
        <div class="lane-legend">
          <span class="legend-item"><span class="legend-color lane-inc"></span>↑ INCREASING SLK (${lanesIncreasing} lane${lanesIncreasing !== 1 ? 's' : ''})</span>
          <span class="legend-item"><span class="legend-color lane-dec"></span>DECREASING SLK (${lanesDecreasing} lane${lanesDecreasing !== 1 ? 's' : ''}) ↓</span>
        </div>
        <p style="font-size: 10px; color: #6b7280; font-style: italic; margin-top: 8px;">${explanation}</p>
      `;
    };

    const reportVersion = APP_VERSION;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Work Zone Report - ${result?.road_id || 'Unknown'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
      padding: 20px; 
      font-size: 12px; 
      color: #333;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 20px; margin-bottom: 5px; color: #1e40af; }
    h2 { font-size: 14px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px; color: #1e40af; }
    h3 { font-size: 12px; margin-top: 10px; margin-bottom: 5px; color: #374151; }
    .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
    .header p { color: #6b7280; font-size: 11px; }
    .section { margin-bottom: 15px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    .stat { background: #f9fafb; padding: 10px; border-radius: 6px; }
    .stat-label { color: #6b7280; font-size: 10px; text-transform: uppercase; }
    .stat-value { font-size: 16px; font-weight: 600; margin-top: 2px; }
    .stat-value.large { font-size: 24px; }
    .road-id { font-family: monospace; font-size: 14px; color: #059669; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; }
    .badge-alert { background: #fef3c7; color: #92400e; }
    .badge-warning { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .width-bar { display: flex; height: 30px; border-radius: 4px; overflow: hidden; margin: 10px 0; border: 1px solid #d1d5db; }
    .width-segment { display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 500; color: white; min-width: 30px; }
    .width-segment.unsealed { background: #92400e; }
    .width-segment.sealed { background: #6b7280; }
    .width-segment.trafficable { background: #1e40af; }
    .width-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #6b7280; }
    .legend-color { width: 12px; height: 12px; border-radius: 2px; }
    .legend-color.unsealed { background: #92400e; }
    .legend-color.sealed { background: #6b7280; }
    .legend-color.trafficable { background: #1e40af; }
    .legend-color.lane-inc { background: #3b82f6; }
    .legend-color.lane-dec { background: #eab308; }
    .lane-diagram { display: flex; height: 35px; border-radius: 4px; overflow: hidden; margin: 10px 0; border: 1px solid #d1d5db; }
    .lane-segment { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 1px solid #d1d5db; }
    .lane-segment:last-child { border-right: none; }
    .lane-segment.increasing { background: #3b82f6; }
    .lane-segment.decreasing { background: #ca8a04; }
    .lane-arrow { font-size: 16px; font-weight: bold; color: white; }
    .lane-num { font-size: 9px; color: rgba(255,255,255,0.8); }
    .lane-legend { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    .sign-speed { background: #dcfce7; }
    .sign-warning { background: #fef9c3; }
    .sign-rail { background: #fee2e2; }
    .sign-intersection { background: #f3e8ff; }
    .weather-current { background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%); padding: 15px; border-radius: 8px; margin: 10px 0; }
    .alert { padding: 10px; border-radius: 6px; margin: 10px 0; }
    .alert-warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .alert-danger { background: #fee2e2; border-left: 4px solid #ef4444; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 10px; }
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚧 TC Work Zone Report</h1>
    <p>Generated: ${timestamp}</p>
  </div>

  <!-- Work Zone Summary -->
  <h2>📍 Work Zone Summary</h2>
  <div class="section">
    <div class="grid">
      <div class="stat">
        <div class="stat-label">Road ID</div>
        <div class="stat-value road-id">${result?.road_id || 'N/A'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Road Name</div>
        <div class="stat-value">${result?.road_name || 'N/A'}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Start SLK</div>
        <div class="stat-value">${result?.work_zone.start_slk.toFixed(2) || 'N/A'} km</div>
      </div>
      <div class="stat">
        <div class="stat-label">End SLK</div>
        <div class="stat-value">${result?.work_zone.end_slk.toFixed(2) || 'N/A'} km</div>
      </div>
      <div class="stat">
        <div class="stat-label">Zone Length</div>
        <div class="stat-value">${result?.work_zone.length_m || 'N/A'} m</div>
      </div>
      <div class="stat">
        <div class="stat-label">Carriageway</div>
        <div class="stat-value">${result?.carriageway || 'N/A'}</div>
      </div>
      ${
        result?.pavement?.lanes
          ? `
      <div class="stat">
        <div class="stat-label">Lanes</div>
        <div class="stat-value">${result.pavement.lanes}</div>
      </div>
      `
          : ''
      }
      ${
        result?.pavement?.width_m
          ? `
      <div class="stat">
        <div class="stat-label">Road Width</div>
        <div class="stat-value">${result.pavement.width_m} m</div>
      </div>
      `
          : ''
      }
    </div>
    
    ${
      result?.pavement?.total_pave_width
        ? `
    <h3>Road Width Breakdown (Total: ${result.pavement.total_pave_width.toFixed(1)}m)</h3>
    ${generateWidthBar()}
    `
        : ''
    }
    
    ${generateLaneDirection()}
  </div>

  <!-- Speed Zones -->
  <h2>🚦 Speed Zones</h2>
  <div class="section">
    ${
      result?.speed_zones
        ? `
    <table>
      <tr><th>Zone</th><th>Speed</th></tr>
      <tr><td>Approach Start</td><td><strong>${result.speed_zones.approach_start}</strong></td></tr>
      <tr><td>TC Start</td><td><strong>${result.speed_zones.tc_start}</strong></td></tr>
      <tr><td>Work Zone Start</td><td><strong>${result.speed_zones.work_zone_start}</strong></td></tr>
      <tr><td>Work Zone End</td><td><strong>${result.speed_zones.work_zone_end}</strong></td></tr>
      <tr><td>TC End</td><td><strong>${result.speed_zones.tc_end}</strong></td></tr>
      <tr><td>Approach End</td><td><strong>${result.speed_zones.approach_end}</strong></td></tr>
    </table>
    `
        : '<p style="color: #9ca3af;">No speed zone data available</p>'
    }
  </div>

  <!-- Speed Zone Layout Graphic -->
  ${
    result && corridorSpeedZones.length > 0
      ? (() => {
          const wzStart = result.work_zone.start_slk;
          const wzEnd = result.work_zone.end_slk || wzStart;
          const margin = 0.85;
          const corStart = wzStart - margin;
          const corEnd = wzEnd + margin;
          const totalRange = corEnd - corStart;

          const relZones = corridorSpeedZones
            .filter((z) => z.end_slk > corStart && z.start_slk < corEnd)
            .sort((a, b) => a.start_slk - b.start_slk);

          const segments: { start: number; end: number; speed: number; source: string }[] = [];
          let lastEnd = corStart;
          for (const zone of relZones) {
            const zs = Math.max(zone.start_slk, corStart);
            const ze = Math.min(zone.end_slk, corEnd);
            if (zs > lastEnd + 0.01) {
              const prevZone = relZones.find((z) => z.end_slk <= zs);
              segments.push({
                start: lastEnd,
                end: zs,
                speed: prevZone?.speed_limit || zone.speed_limit,
                source: 'inferred',
              });
            }
            segments.push({
              start: zs,
              end: ze,
              speed: zone.speed_limit,
              source: zone.is_override ? 'community' : 'mrwa',
            });
            lastEnd = ze;
          }
          if (lastEnd < corEnd - 0.01) {
            const lastZone = relZones[relZones.length - 1];
            segments.push({
              start: lastEnd,
              end: corEnd,
              speed: lastZone?.speed_limit || 110,
              source: 'inferred',
            });
          }

          const speedColors: Record<number, string> = {
            40: '#ef4444',
            50: '#f97316',
            60: '#eab308',
            70: '#84cc16',
            80: '#22c55e',
            90: '#14b8a6',
            100: '#0ea5e9',
            110: '#3b82f6',
            130: '#8b5cf6',
          };
          const getColor = (s: number) => speedColors[s] || '#6b7280';
          const pct = (slk: number) => (((slk - corStart) / totalRange) * 100).toFixed(2);

          const approachSpeed = segments.length > 0 ? segments[0].speed : 110;
          const exitSpeed = segments.length > 0 ? segments[segments.length - 1].speed : 110;
          const isHighSpeed = approachSpeed >= 80;
          const isExitHighSpeed = exitSpeed >= 80;

          const tc1Slk = wzStart - 0.1;
          const tc2Slk = wzEnd + 0.1;
          const pts1Slk = wzStart - 0.2;
          const pts2Slk = wzEnd + 0.2;
          const boxPts1Slk = wzStart - 0.4;
          const boxPts2Slk = wzEnd + 0.4;
          const sr1Slk = wzStart - 0.5;
          const rnst2Slk = wzEnd + 0.5;
          const rwa1Slk = wzStart - 0.8;
          const rwa2Slk = wzEnd + 0.8;

          const getSpeedAtSlk = (slk: number): number => {
            const seg = segments.find((s) => slk >= s.start && slk < s.end);
            return seg?.speed || approachSpeed;
          };
          const formatRwa = (speed: number): string => (speed >= 80 ? '(80)' : '(RWA)');

          // Intersection markers
          const intMarkers = crossRoads
            .filter((r) => r.name.toLowerCase() !== result.road_name.toLowerCase())
            .map((r) => ({
              name: r.name,
              slk: r.intersectionSlk ?? parseFloat(r.distance) + wzStart,
            }))
            .filter((r) => r.slk >= corStart && r.slk <= corEnd);

          return `
  <h2>📊 Speed Zone Layout (±850m)</h2>
  <div class="section" style="padding: 16px;">
    <!-- Speed zone bar -->
    <div style="position: relative; height: 48px; background: #374151; border-radius: 8px; overflow: hidden; margin-bottom: 4px;">
      ${segments
        .map((seg) => {
          const left = pct(seg.start);
          const right = pct(seg.end);
          const width = (parseFloat(right) - parseFloat(left)).toFixed(2);
          const isInf = seg.source === 'inferred';
          const bg = isInf
            ? 'border: 2px dashed #6b7280; background: transparent;'
            : 'background: ' + getColor(seg.speed) + ';';
          return (
            '<div style="position: absolute; top: 0; height: 100%; left: ' +
            left +
            '%; width: ' +
            width +
            '%; ' +
            bg +
            ' display: flex; align-items: center; justify-content: center;"><span style="font-weight: bold; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.8); font-size: 14px;">' +
            seg.speed +
            '</span></div>'
          );
        })
        .join('')}

      <!-- Work zone indicator -->
      <div style="position: absolute; top: 0; height: 100%; border-left: 3px solid #3b82f6; border-right: 3px solid #3b82f6;
        background: rgba(59,130,246,0.15); left: ${pct(wzStart)}%; width: ${(parseFloat(pct(wzEnd)) - parseFloat(pct(wzStart))).toFixed(2)}%;">
      </div>

      <!-- Intersection markers -->
      ${intMarkers
        .map((int, i) => {
          const colors = [
            '#a855f7',
            '#ec4899',
            '#14b8a6',
            '#f97316',
            '#06b6d4',
            '#84cc16',
            '#ef4444',
            '#8b5cf6',
          ];
          const color = colors[i % colors.length];
          return (
            '<div style="position: absolute; top: 0; height: 100%; border-left: 2px solid ' +
            color +
            '; left: ' +
            pct(int.slk) +
            '%;" title="' +
            int.name +
            '"></div>'
          );
        })
        .join('')}
    </div>

    <!-- SLK scale labels -->
    <div style="position: relative; height: 20px; font-size: 11px; color: #9ca3af; margin-bottom: 8px;">
      <span style="position: absolute; left: 0;">${corStart.toFixed(2)}</span>
      <span style="position: absolute; left: ${pct(wzStart)}%; transform: translateX(-50%); color: #60a5fa;">${wzStart.toFixed(2)}</span>
      <span style="position: absolute; left: ${pct(wzEnd)}%; transform: translateX(-50%); color: #60a5fa;">${wzEnd.toFixed(2)}</span>
      <span style="position: absolute; right: 0;">${corEnd.toFixed(2)}</span>
    </div>

    <!-- Sign position markers -->
    <div style="position: relative; height: 8px; background: #1f2937; border-radius: 4px; margin-bottom: 16px;">
      <div style="position: absolute; top: 0; height: 100%; background: rgba(59,130,246,0.2);
        left: ${pct(wzStart)}%; width: ${(parseFloat(pct(wzEnd)) - parseFloat(pct(wzStart))).toFixed(2)}%;"></div>
      <div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: #f97316; left: ${pct(tc1Slk)}%;"></div>
      <div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: #f97316; left: ${pct(tc2Slk)}%;"></div>
      <div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: #ef4444; left: ${pct(pts1Slk)}%;"></div>
      <div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: #ef4444; left: ${pct(pts2Slk)}%;"></div>
      ${
        isHighSpeed
          ? `<div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: #f87171; left: ${pct(boxPts1Slk)}%;"></div>
      <div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: #f87171; left: ${pct(boxPts2Slk)}%;"></div>`
          : ''
      }
      <div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: white; border: 2px solid #ef4444; left: ${pct(sr1Slk)}%;"></div>
      <div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: white; border: 2px solid #ef4444; left: ${pct(rnst2Slk)}%;"></div>
      <div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: #eab308; left: ${pct(rwa1Slk)}%;"></div>
      <div style="position: absolute; top: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; border-radius: 50%; background: #eab308; left: ${pct(rwa2Slk)}%;"></div>
    </div>

    <!-- TC Signage Position Table -->
    <table style="width: 100%; max-width: 400px; margin: 0 auto 16px auto;">
      <thead>
        <tr style="border-bottom: 2px solid #374151;">
          <th style="text-align: left; padding: 6px 12px; color: #9ca3af; font-size: 12px;">Sign Type</th>
          <th style="text-align: center; padding: 6px 12px; color: #f97316; font-size: 12px;">TC1</th>
          <th style="text-align: center; padding: 6px 12px; color: #f97316; font-size: 12px;">TC2</th>
        </tr>
      </thead>
      <tbody style="font-family: monospace; font-size: 13px;">
        <tr style="border-bottom: 1px solid #1f2937;">
          <td style="padding: 6px 12px; color: #d1d5db;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f97316; margin-right: 8px;"></span>TC Position
          </td>
          <td style="text-align: center; padding: 6px 12px; color: white;">${tc1Slk.toFixed(2)}</td>
          <td style="text-align: center; padding: 6px 12px; color: white;">${tc2Slk.toFixed(2)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #1f2937;">
          <td style="padding: 6px 12px; color: #d1d5db;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; margin-right: 8px;"></span>PTS
          </td>
          <td style="text-align: center; padding: 6px 12px; color: white;">${pts1Slk.toFixed(2)}</td>
          <td style="text-align: center; padding: 6px 12px; color: white;">${pts2Slk.toFixed(2)}</td>
        </tr>
        ${
          isHighSpeed && isExitHighSpeed
            ? `
        <tr style="border-bottom: 1px solid #1f2937;">
          <td style="padding: 6px 12px; color: #d1d5db;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f87171; margin-right: 8px;"></span>Box PTS
          </td>
          <td style="text-align: center; padding: 6px 12px; color: white;">${boxPts1Slk.toFixed(2)}</td>
          <td style="text-align: center; padding: 6px 12px; color: white;">${boxPts2Slk.toFixed(2)}</td>
        </tr>`
            : ''
        }
        <tr style="border-bottom: 1px solid #1f2937;">
          <td style="padding: 6px 12px; color: #d1d5db;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: white; border: 2px solid #ef4444; margin-right: 8px;"></span>SR/RNST
          </td>
          <td style="text-align: center; padding: 6px 12px; color: white;">
            ${sr1Slk.toFixed(2)}<br>
            <span style="color: #6b7280; font-size: 11px;">(60/${getSpeedAtSlk(sr1Slk)})</span>
          </td>
          <td style="text-align: center; padding: 6px 12px; color: white;">
            ${rnst2Slk.toFixed(2)}<br>
            <span style="color: #6b7280; font-size: 11px;">(60/${getSpeedAtSlk(rnst2Slk)})</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 12px; color: #d1d5db;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #eab308; margin-right: 8px;"></span>RWA
          </td>
          <td style="text-align: center; padding: 6px 12px; color: white;">
            ${rwa1Slk.toFixed(2)}<br>
            <span style="color: #6b7280; font-size: 11px;">${formatRwa(getSpeedAtSlk(rwa1Slk))}</span>
          </td>
          <td style="text-align: center; padding: 6px 12px; color: white;">
            ${rwa2Slk.toFixed(2)}<br>
            <span style="color: #6b7280; font-size: 11px;">${formatRwa(getSpeedAtSlk(rwa2Slk))}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Zone segment details -->
    <table style="width: 100%; font-size: 12px;">
      <thead>
        <tr style="border-bottom: 2px solid #374151;">
          <th style="text-align: left; padding: 4px 8px; color: #9ca3af;">Speed</th>
          <th style="text-align: left; padding: 4px 8px; color: #9ca3af;">Start SLK</th>
          <th style="text-align: left; padding: 4px 8px; color: #9ca3af;">End SLK</th>
          <th style="text-align: left; padding: 4px 8px; color: #9ca3af;">Length</th>
          <th style="text-align: left; padding: 4px 8px; color: #9ca3af;">Source</th>
        </tr>
      </thead>
      <tbody>
        ${segments
          .map((seg) => {
            const len = ((seg.end - seg.start) * 1000).toFixed(0);
            const srcColor =
              seg.source === 'community'
                ? '#22c55e'
                : seg.source === 'mrwa'
                  ? '#60a5fa'
                  : '#f97316';
            const srcLabel =
              seg.source === 'community'
                ? 'Community'
                : seg.source === 'mrwa'
                  ? 'MRWA'
                  : 'Inferred';
            const isWZ = seg.start <= wzStart && seg.end >= wzEnd;
            const wzBg = isWZ ? 'background: rgba(59,130,246,0.1);' : '';
            const wzTag = isWZ ? ' ◄ Work Zone' : '';
            return (
              '<tr style="border-bottom: 1px solid #1f2937; ' +
              wzBg +
              '"><td style="padding: 4px 8px; color: white;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 2px; background: ' +
              getColor(seg.speed) +
              '; margin-right: 6px; vertical-align: middle;"></span>' +
              seg.speed +
              ' km/h</td><td style="padding: 4px 8px; color: #d1d5db; font-family: monospace;">' +
              seg.start.toFixed(2) +
              '</td><td style="padding: 4px 8px; color: #d1d5db; font-family: monospace;">' +
              seg.end.toFixed(2) +
              '</td><td style="padding: 4px 8px; color: #d1d5db;">' +
              len +
              'm</td><td style="padding: 4px 8px; color: ' +
              srcColor +
              ';">' +
              srcLabel +
              wzTag +
              '</td></tr>'
            );
          })
          .join('')}
      </tbody>
    </table>

    ${
      segments.some((s) => s.source === 'inferred')
        ? `
    <div class="alert alert-warning" style="margin-top: 10px; font-size: 11px;">
      ⚠ Some speed zone data is missing in this corridor. Gaps are shown with dashed borders. Please verify with site inspection or MRWA records.
    </div>`
        : ''
    }
  </div>`;
        })()
      : ''
  }

  <!-- TC Positions -->
  <h2>👷 TC Positions (±100m from work zone)</h2>
  <div class="section">
    <div class="grid">
      <div class="stat">
        <div class="stat-label">TC Start</div>
        <div class="stat-value">SLK ${result?.tc_positions.start_slk.toFixed(3) || 'N/A'} km</div>
        ${result?.tc_positions.start ? `<p style="font-size: 10px; color: #6b7280; margin-top: 4px;">${result.tc_positions.start.lat.toFixed(6)}, ${result.tc_positions.start.lon.toFixed(6)}</p>` : ''}
      </div>
      <div class="stat">
        <div class="stat-label">TC End</div>
        <div class="stat-value">SLK ${result?.tc_positions.end_slk.toFixed(3) || 'N/A'} km</div>
        ${result?.tc_positions.end ? `<p style="font-size: 10px; color: #6b7280; margin-top: 4px;">${result.tc_positions.end.lat.toFixed(6)}, ${result.tc_positions.end.lon.toFixed(6)}</p>` : ''}
      </div>
    </div>
  </div>

  <!-- Signage Corridor -->
  <h2>🚸 Signage in Corridor (±700m)</h2>
  <div class="section">
    ${
      signageCorridor && signageCorridor.length > 0
        ? (() => {
            // Calculate corridor bounds for ±700m filtering
            const workZoneStart = result?.work_zone?.start_slk || 0;
            const workZoneEnd = result?.work_zone?.end_slk || workZoneStart;
            const corridorStart = workZoneStart - 0.7;
            const corridorEnd = workZoneEnd + 0.7;

            // Filter all signage to corridor bounds
            const corridorSignage = signageCorridor.filter(
              (s) => s.slk >= corridorStart && s.slk <= corridorEnd
            );

            const railCrossings = corridorSignage.filter((s) => s.category === 'railway');
            const speedSigns = corridorSignage.filter((s) => s.category === 'speed');
            const warningSigns = corridorSignage.filter((s) => s.category === 'warning');

            // Intersections: Use corridorIntersections (±700m range for signage corridor)
            // Filter out the main road name to avoid showing it as an intersection
            const nearbyIntersections = corridorIntersections.filter(
              (road) => result && road.name.toLowerCase() !== result.road_name.toLowerCase()
            );

            const totalItems = corridorSignage.length + nearbyIntersections.length;

            return `
      ${
        railCrossings.length > 0
          ? `
      <h3>🚂 Railway Crossings</h3>
      <table>
        <tr><th>SLK</th><th>Description</th><th>Action</th></tr>
        ${railCrossings
          .map(
            (s) => `
        <tr class="sign-rail">
          <td>${s.slk.toFixed(2)}</td>
          <td>${s.description}</td>
          <td>${s.action || ''}</td>
        </tr>
        `
          )
          .join('')}
      </table>
      `
          : ''
      }
      
      ${
        speedSigns.length > 0
          ? `
      <h3>⚡ Speed Restriction Signs</h3>
      <table>
        <tr><th>SLK</th><th>Sign Type</th><th>Description</th><th>Action</th></tr>
        ${speedSigns
          .map(
            (s) => `
        <tr class="sign-speed">
          <td>${s.slk.toFixed(2)}</td>
          <td>${s.sign_type}</td>
          <td>${s.description}</td>
          <td>${s.action || ''}</td>
        </tr>
        `
          )
          .join('')}
      </table>
      `
          : ''
      }
      
      ${
        warningSigns.length > 0
          ? `
      <h3>⚠️ Warning Signs</h3>
      <table>
        <tr><th>SLK</th><th>Sign Type</th><th>Description</th></tr>
        ${warningSigns
          .map(
            (s) => `
        <tr class="sign-warning">
          <td>${s.slk.toFixed(2)}</td>
          <td>${s.sign_type}</td>
          <td>${s.description}</td>
        </tr>
        `
          )
          .join('')}
      </table>
      `
          : ''
      }
      
      ${
        nearbyIntersections.length > 0
          ? `
      <h3>🔀 Intersections (within TC zone)</h3>
      <table>
        <tr><th>SLK</th><th>Road Name</th><th>Road Type</th></tr>
        ${nearbyIntersections
          .map((road) => {
            const slk =
              road.intersectionSlk ??
              parseFloat(road.distance) + (result?.work_zone?.start_slk || 0);
            return `
        <tr class="sign-intersection">
          <td>${slk.toFixed(2)}</td>
          <td>${road.name}</td>
          <td>${road.roadType}</td>
        </tr>
        `;
          })
          .join('')}
      </table>
      `
          : ''
      }
      
      <p style="color: #6b7280; margin-top: 10px;">Total items in corridor: ${totalItems}</p>
        `;
          })()
        : '<p style="color: #9ca3af;">No signage data available for this corridor</p>'
    }
  </div>

  <!-- Weather -->
  <h2>🌤️ Weather - ${weather?.location || 'N/A'}</h2>
  <div class="section">
    ${
      weather
        ? `
      ${
        warnings && warnings.count > 0
          ? `
      <div class="alert alert-warning">
        <strong>⚠️ ${warnings.count} Weather Warning${warnings.count !== 1 ? 's' : ''} Active</strong>
        <ul style="margin-top: 5px; margin-left: 20px;">
          ${warnings.warnings
            .slice(0, 3)
            .map((w) => `<li>${w.title}</li>`)
            .join('')}
        </ul>
      </div>
      `
          : ''
      }
      
      ${
        weather.current.windGust >= windGustThreshold
          ? `
      <div class="alert alert-danger">
        <strong>💨 High Wind Gust Alert: ${weather.current.windGust} km/h</strong>
        <p style="margin-top: 4px;">Threshold: ${windGustThreshold} km/h - Exercise caution with traffic control devices</p>
      </div>
      `
          : ''
      }
      
      <div class="weather-current">
        <div class="grid-3">
          <div>
            <div class="stat-label">Sunrise</div>
            <div style="font-size: 14px; font-weight: 600;">🌅 ${weather.sun.sunrise}</div>
          </div>
          <div>
            <div class="stat-label">Sunset</div>
            <div style="font-size: 14px; font-weight: 600;">🌇 ${weather.sun.sunset}</div>
          </div>
          <div>
            <div class="stat-label">Daylight</div>
            <div style="font-size: 14px; font-weight: 600;">☀️ ${weather.sun.daylightHours}</div>
          </div>
        </div>
      </div>
      
      <div class="grid">
        <div class="stat">
          <div class="stat-label">Temperature</div>
          <div class="stat-value">${weather.current.temp}°C</div>
        </div>
        <div class="stat">
          <div class="stat-label">Condition</div>
          <div class="stat-value">${weather.current.condition}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Wind</div>
          <div class="stat-value">${weather.current.windSpeed} km/h ${weather.current.windDir}</div>
          <p style="font-size: 10px; color: ${weather.current.windGust >= windGustThreshold ? '#dc2626' : '#6b7280'};">
            Gusts: ${weather.current.windGust} km/h
          </p>
        </div>
        <div class="stat">
          <div class="stat-label">Humidity</div>
          <div class="stat-value">${weather.current.humidity}%</div>
        </div>
        <div class="stat">
          <div class="stat-label">UV Index</div>
          <div class="stat-value">${weather.sun.uvIndex} (${weather.sun.uvLevel})</div>
        </div>
      </div>
    `
        : '<p style="color: #9ca3af;">No weather data available</p>'
    }
  </div>

  <!-- Traffic Volume -->
  <h2>🚗 Traffic Volume</h2>
  <div class="section">
    ${
      traffic
        ? `
    <h3 style="font-size: 11px; color: #9ca3af; margin: 0 0 4px 0; text-transform: uppercase;">Historical Data (MRWA)</h3>
    <div class="grid">
      <div class="stat">
        <div class="stat-label">AADT</div>
        <div class="stat-value">${traffic.aadt?.toLocaleString() || 'N/A'}</div>
        <p style="font-size: 10px; color: #6b7280;">vehicles/day</p>
      </div>
      <div class="stat">
        <div class="stat-label">Peak Hour</div>
        <div class="stat-value">${traffic.peak_hour_volume || 'N/A'}</div>
        <p style="font-size: 10px; color: #6b7280;">vehicles/hour (both dir)</p>
      </div>
      <div class="stat">
        <div class="stat-label">Heavy Vehicles</div>
        <div class="stat-value">${traffic.heavy_vehicle_percent}%</div>
      </div>
      <div class="stat">
        <div class="stat-label">Data Year</div>
        <div class="stat-value">${traffic.aadt_year}</div>
      </div>
    </div>
    <p style="color: #6b7280; margin-top: 8px; font-size: 10px;">Source: ${traffic.source}</p>
    ${
      userTrafficOverride
        ? `
    <h3 style="font-size: 11px; color: #60a5fa; margin: 16px 0 4px 0; text-transform: uppercase;">Live Count Data (user counted — used for calculations)</h3>
    <div class="grid">
      <div class="stat">
        <div class="stat-label">Combined VPH</div>
        <div class="stat-value" style="color: #60a5fa;">${effectiveVphBothDir}</div>
      </div>
      <div class="stat">
        <div class="stat-label">VPH/Direction</div>
        <div class="stat-value" style="color: #60a5fa;">${effectiveVphOneDir}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Heavy Vehicles</div>
        <div class="stat-value" style="color: #fbbf24;">${effectiveHeavyPct}%</div>
      </div>
      <div class="stat">
        <div class="stat-label">Total Counted</div>
        <div class="stat-value">${userTrafficOverride.total_vehicles}</div>
      </div>
    </div>
    <p style="color: #9ca3af; margin-top: 8px; font-size: 10px;">${formatAusDate(userTrafficOverride.date)} ${userTrafficOverride.start_time}–${userTrafficOverride.end_time} · ${userTrafficOverride.duration_minutes}min · ${userTrafficOverride.direction_mode === 'both-ways' ? 'Both directions' : 'One direction'}${userTrafficOverride.notes ? ' · ' + userTrafficOverride.notes : ''}</p>
    ${
      userTrafficOverride.direction_mode === 'both-ways'
        ? `
    <table style="width:100%; font-size: 10px; margin-top: 8px; border-collapse: collapse;">
      <tr style="color: #9ca3af; border-bottom: 1px solid #374151;">
        <td style="padding: 2px 4px;">Direction</td><td>Light</td><td>Heavy</td><td>VPH</td>
      </tr>
      <tr>
        <td style="padding: 2px 4px;">True Left</td><td>${userTrafficOverride.true_left_light}</td><td>${userTrafficOverride.true_left_heavy}</td><td>${userTrafficOverride.vph_true_left}</td>
      </tr>
      <tr>
        <td style="padding: 2px 4px;">True Right</td><td>${userTrafficOverride.true_right_light}</td><td>${userTrafficOverride.true_right_heavy}</td><td>${userTrafficOverride.vph_true_right}</td>
      </tr>
    </table>`
        : ''
    }
    `
        : ''
    }
    `
        : '<p style="color: #9ca3af;">No traffic data available</p>'
    }
  </div>

  <!-- Traffic Calculations -->
  <h2>📊 Traffic Calculations</h2>
  <div class="section">
    ${
      effectiveVphBothDir > 0
        ? (() => {
            const rf = effectiveHeavyPct > 10 ? 0.8 : 1;
            const rv = Math.round(effectiveVphBothDir * rf);
            const rod = Math.round(effectiveVphOneDir * rf);
            const sl = (() => {
              if (rv >= 701) return '70m';
              if (rv >= 601) return '100m';
              if (rv >= 501) return '150m';
              if (rv >= 401) return '250m';
              if (rv >= 351) return '400m';
              if (rv >= 301) return '600m';
              if (rv >= 251) return '800m';
              if (rv >= 201) return '1200m';
              if (rv >= 151) return '1600m';
              return '2200m';
            })();
            const sr = rv < 301;
            const lc = (() => {
              if (rod <= 1000) return '1 lane';
              if (rod <= 2000) return '2 lanes';
              if (rod <= 3000) return '3 lanes';
              return '4+ lanes';
            })();
            const mh = calculateMaxHoldTime(effectiveVphOneDir, effectiveHeavyPct);
            return `
    <div class="grid">
      <div class="stat">
        <div class="stat-label">Effective VPH (both)</div>
        <div class="stat-value">${effectiveVphBothDir}${effectiveHeavyPct > 10 ? `<span style="font-size:10px;color:#fbbf24;"> → ${rv}</span>` : ''}</div>
        <p style="font-size: 10px; color: #6b7280;">${effectiveHeavyPct > 10 ? `×${rf} heavy reduction` : 'no reduction'}</p>
      </div>
      <div class="stat">
        <div class="stat-label">Effective VPH (one)</div>
        <div class="stat-value">${effectiveVphOneDir}${effectiveHeavyPct > 10 ? `<span style="font-size:10px;color:#fbbf24;"> → ${rod}</span>` : ''}</div>
        <p style="font-size: 10px; color: #6b7280;">per direction</p>
      </div>
      <div class="stat">
        <div class="stat-label">Heavy Vehicle %</div>
        <div class="stat-value">${effectiveHeavyPct}%</div>
        ${effectiveHeavyPct > 10 ? '<p style="font-size: 10px; color: #fbbf24;">⚠️ >10% — 20% reduction applied</p>' : ''}
      </div>
      <div class="stat">
        <div class="stat-label">Lane Capacity</div>
        <div class="stat-value">${lc}</div>
        <p style="font-size: 10px; color: #6b7280;">one direction</p>
      </div>
    </div>
    <div class="grid" style="margin-top: 8px;">
      <div class="stat">
        <div class="stat-label">Shuttle Flow Max</div>
        <div class="stat-value" style="color: ${sr ? '#fbbf24' : '#4ade80'};">${sl}</div>
        ${sr ? '<p style="font-size: 10px; color: #fbbf24;">⚠️ Exceeds AGTTM limits</p>' : ''}
      </div>
      ${
        mh
          ? `
      <div class="stat">
        <div class="stat-label">Max Hold Time</div>
        <div class="stat-value">${mh.maxHoldTimeMinutes} min</div>
        <p style="font-size: 10px; color: #6b7280;">queue ${mh.queueGrowthRate}m/min</p>
      </div>
      <div class="stat">
        <div class="stat-label">Recommended Stop</div>
        <div class="stat-value" style="color: ${mh.belowMinimum ? '#f87171' : '#111827'};">${mh.recommendedStopMinutes} min${mh.belowMinimum ? ' ⚠️' : ''}</div>
        <p style="font-size: 10px; color: #6b7280;">queue ${mh.queueAtRecommendedStop}m</p>
      </div>
      `
          : ''
      }
    </div>
    <p style="color: #6b7280; margin-top: 8px; font-size: 10px;">
      Prepare to Stop: ${PREPARE_TO_STOP_DISTANCE_M}m · Adv Queue Warning: ${ADV_QUEUE_WARNING_DISTANCE_M}m
      ${mh && mh.queueAtRecommendedStop > PREPARE_TO_STOP_DISTANCE_M ? '<br><span style="color: #f87171;">⚠️ Queue at recommended stop exceeds Prepare to Stop distance</span>' : ''}
    </p>
    <p style="color: #6b7280; margin-top: 4px; font-size: 10px;">* ${userTrafficOverride ? `Based on live user count (${userTrafficOverride.duration_minutes}min, ${formatAusDate(userTrafficOverride.date)})` : 'Based on MRWA historical data'}</p>
    `;
          })()
        : '<p style="color: #9ca3af;">No traffic data available for calculations</p>'
    }
  </div>

  <!-- Nearby Amenities -->
  <h2>🏥 Nearby Amenities</h2>
  <div class="section">
    <div class="grid">
      ${
        places?.hospital
          ? `
      <div class="stat">
        <div class="stat-label">🏥 Hospital</div>
        <div style="font-weight: 600;">${places.hospital.name}</div>
        <p style="font-size: 10px; color: #6b7280;">${places.hospital.distance} km away</p>
        ${places.hospital.hospitalType ? `<span class="badge ${places.hospital.hospitalType === 'Public' ? 'badge-info' : places.hospital.hospitalType === 'Nursing Post' ? 'badge-warning' : 'badge-secondary'}">${places.hospital.hospitalType}</span>` : ''}
        ${places.hospital.isEmergency ? '<span class="badge badge-warning">ED</span>' : ''}
        ${places.hospital.beds ? `<p style="font-size: 10px; color: #6b7280; margin-top: 4px;">${places.hospital.beds} beds</p>` : ''}
        ${places.hospital.phone ? `<p style="font-size: 10px; margin-top: 4px;">📞 ${places.hospital.phone}</p>` : ''}
      </div>
      `
          : '<div class="stat"><p style="color: #9ca3af;">No hospital found</p></div>'
      }
      
      ${
        places?.fuelStation
          ? `
      <div class="stat">
        <div class="stat-label">⛽ Fuel Station</div>
        <div style="font-weight: 600;">${places.fuelStation.name}</div>
        <p style="font-size: 10px; color: #6b7280;">${places.fuelStation.distance} km away</p>
        ${places.fuelStation.fuelPrice ? `<span class="badge badge-success">$${(places.fuelStation.fuelPrice / 100).toFixed(2)}/L Diesel</span>` : ''}
        ${places.fuelStation.phone ? `<p style="font-size: 10px; margin-top: 4px;">📞 ${places.fuelStation.phone}</p>` : ''}
        ${places.fuelStation.siteFeatures && places.fuelStation.siteFeatures.length > 0 ? `<p style="font-size: 10px; color: #6b7280; margin-top: 4px;">${places.fuelStation.siteFeatures.join(' · ')}</p>` : ''}
      </div>
      `
          : '<div class="stat"><p style="color: #9ca3af;">No fuel station found</p></div>'
      }
      
      ${
        places?.toilet
          ? `
      <div class="stat">
        <div class="stat-label">🚻 Public Toilet</div>
        <div style="font-weight: 600;">${places.toilet.name}${places.toilet.wheelchair ? ' ♿' : ''}</div>
        <p style="font-size: 10px; color: #6b7280;">${places.toilet.distance} km away</p>
        ${places.toilet.address ? `<p style="font-size: 10px; color: #6b7280;">${places.toilet.address}${places.toilet.suburb ? `, ${places.toilet.suburb}` : ''}</p>` : ''}
        ${places.toilet.openingHours ? `<p style="font-size: 10px; color: #6b7280;">${places.toilet.openingHours}</p>` : ''}
      </div>
      `
          : '<div class="stat"><p style="color: #9ca3af;">No toilet found</p></div>'
      }
    </div>
  </div>

  <!-- Intersecting Roads -->
  ${
    crossRoads &&
    crossRoads.filter(
      (road) => result && road.name.toLowerCase() !== result.road_name.toLowerCase()
    ).length > 0
      ? `
  <h2>🔀 Intersecting Roads in TC Zone</h2>
  <div class="section">
    <table>
      <tr><th>Road Name</th><th>Type</th><th>Distance</th></tr>
      ${crossRoads
        .filter((road) => result && road.name.toLowerCase() !== result.road_name.toLowerCase())
        .map(
          (road) => `
        <tr>
          <td>${road.name}</td>
          <td>${road.roadType}</td>
          <td>${road.distance} km from TC start</td>
        </tr>
        `
        )
        .join('')}
    </table>
    <div class="alert alert-warning" style="margin-top: 10px;">
      ⚠️ Consider TC coverage for these intersecting roads
    </div>
  </div>
  `
      : ''
  }

  <div class="footer">
    <p>Report generated by TC Work Zone Locator v${reportVersion}</p>
    <p>Data sources: MRWA Open Data, Open-Meteo Weather, OpenStreetMap</p>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();

    setReportGenerating(false);
  }, [
    isOpen,
    result,
    weather,
    warnings,
    traffic,
    places,
    crossRoads,
    signageCorridor,
    corridorIntersections,
    userTrafficOverride,
    corridorSpeedZones,
    windGustThreshold,
  ]);

  // Track if report was generated for current open state
  const [hasGenerated, setHasGenerated] = useState(false);

  // Generate report when modal opens (only once per open)
  useEffect(() => {
    if (isOpen && !hasGenerated) {
      setHasGenerated(true);
      generateReport();
    }
    if (!isOpen) {
      setHasGenerated(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-purple-400">📋 Work Zone Report</h2>
            {result?.work_zone?.start && (
              <div className="flex gap-1">
                <Button
                  onClick={() =>
                    openStreetView(result.work_zone.start!.lat, result.work_zone.start!.lon)
                  }
                  className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
                  title="Street View at Start SLK"
                >
                  🏠 Street View
                </Button>
                <Button
                  onClick={() => openGoogleMaps(result.google_maps.work_zone_start)}
                  className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 flex items-center gap-1"
                  title="Google Maps at Start SLK"
                >
                  🗺️ Maps
                </Button>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {reportGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              <span className="ml-3 text-gray-400">Generating report...</span>
            </div>
          ) : (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-800 p-4 rounded-lg">
              {reportContent}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                // Try Web Share API first, fallback to clipboard
                const shareData = {
                  title: `Work Zone Report - ${result?.road_id || 'Unknown'}`,
                  text: reportContent,
                };

                if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                  try {
                    await navigator.share(shareData);
                    // Share successful - no need for alert as the OS handles feedback
                  } catch (err) {
                    // User cancelled or share failed - fall back to clipboard
                    if ((err as Error).name !== 'AbortError') {
                      await navigator.clipboard.writeText(reportContent);
                      alert('Report copied to clipboard!');
                    }
                  }
                } else {
                  // Web Share not supported - use clipboard
                  await navigator.clipboard.writeText(reportContent);
                  alert('Report copied to clipboard!');
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-500"
              disabled={reportGenerating || !reportContent}
            >
              📤 Share / Copy
            </Button>
            <Button
              onClick={() => {
                const blob = new Blob([reportContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `work-zone-report-${result?.road_id || 'unknown'}-${new Date().toISOString().split('T')[0]}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 bg-green-600 hover:bg-green-500"
              disabled={reportGenerating || !reportContent}
            >
              💾 Download
            </Button>
          </div>
          <Button
            onClick={onClose}
            className="w-full bg-gray-800 text-white hover:bg-gray-700 border border-gray-600"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
