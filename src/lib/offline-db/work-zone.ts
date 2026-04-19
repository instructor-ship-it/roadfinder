/**
 * Work Zone Calculations
 *
 * Contains work zone offline calculation functions.
 *
 * @module lib/offline-db/work-zone
 */

import { initDB } from './db-core';
import { haversineDistance } from '@/lib/utils';
import type { RoadData } from './types';

/**
 * Get work zone info from offline data (RC 1.5.5)
 * Calculates TC positions, geometry interpolation from IndexedDB
 */
export async function getWorkZoneOffline(
  roadId: string,
  startSlk: number,
  endSlk: number
): Promise<{
  road_id: string;
  road_name: string;
  network_type: string;
  work_zone: {
    start_slk: number;
    end_slk: number;
    length_m: number;
    start: { lat: number; lon: number; speed: string; cwy: string } | null;
    end: { lat: number; lon: number; speed: string; cwy: string } | null;
  };
  tc_positions: {
    start_slk: number;
    end_slk: number;
    start: { lat: number; lon: number; speed: string; cwy: string } | null;
    end: { lat: number; lon: number; speed: string; cwy: string } | null;
  };
  approach_signs: {
    start_slk: number;
    end_slk: number;
    start: null;
    end: null;
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
  pavement: {
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
  source: 'offline';
} | null> {
  try {
    const db = await initDB();

    // Find the road in all regions
    const roadData = await new Promise<RoadData | null>((resolve) => {
      const tx = db.transaction('regions', 'readonly');
      const store = tx.objectStore('regions');
      const request = store.getAll();

      request.onsuccess = () => {
        for (const region of request.result) {
          const road = region.roads?.find(
            (r: RoadData) => r.road_id.toUpperCase() === roadId.toUpperCase()
          );
          if (road) {
            resolve(road);
            return;
          }
        }
        resolve(null);
      };
      request.onerror = () => resolve(null);
    });

    if (!roadData) {
      return null;
    }

    // Calculate TC zone (±100m from work zone)
    const tcStartSlk = startSlk - 0.1;
    const tcEndSlk = endSlk + 0.1;
    const midSlk = (tcStartSlk + tcEndSlk) / 2;

    // Helper to interpolate position from geometry
    const interpolatePosition = (targetSlk: number): { lat: number; lon: number } | null => {
      for (const segment of roadData.segments) {
        if (!segment.geometry || segment.geometry.length < 2) continue;

        if (targetSlk >= segment.start_slk && targetSlk <= segment.end_slk) {
          const geometry = segment.geometry;
          const segmentLength = segment.end_slk - segment.start_slk;

          if (segmentLength <= 0) continue;

          // Calculate cumulative distances
          let totalDist = 0;
          const distances: number[] = [0];

          for (let i = 1; i < geometry.length; i++) {
            const [lat1, lon1] = geometry[i - 1];
            const [lat2, lon2] = geometry[i];
            totalDist += haversineDistance(lat1, lon1, lat2, lon2);
            distances.push(totalDist);
          }

          if (totalDist === 0) {
            return { lat: geometry[0][0], lon: geometry[0][1] };
          }

          // Find position along path
          const ratio = (targetSlk - segment.start_slk) / segmentLength;
          const targetDist = ratio * totalDist;

          for (let i = 1; i < distances.length; i++) {
            if (distances[i] >= targetDist || i === distances.length - 1) {
              const segRatio =
                distances[i] === distances[i - 1]
                  ? 0
                  : (targetDist - distances[i - 1]) / (distances[i] - distances[i - 1]);

              const [lat1, lon1] = geometry[i - 1];
              const [lat2, lon2] = geometry[i];

              return {
                lat: lat1 + (lat2 - lat1) * segRatio,
                lon: lon1 + (lon2 - lon1) * segRatio,
              };
            }
          }
        }
      }
      return null;
    };

    // Get positions
    const workZoneStart = interpolatePosition(startSlk);
    const workZoneEnd = interpolatePosition(endSlk);
    const tcStart = interpolatePosition(tcStartSlk);
    const tcEnd = interpolatePosition(tcEndSlk);
    const midpoint = interpolatePosition(midSlk);

    // Import speed zone functions
    const { getSpeedZones } = await import('./speed-zones');
    // Import pavement functions
    const { getPavementData } = await import('./pavement');

    // Get speed zones for this road
    const speedZones = await getSpeedZones(roadId);

    // Helper to get speed at SLK
    const getSpeedAtSlk = (slk: number): { speed: string; cwy: string } => {
      const zone = speedZones.find((z) => slk >= z.start_slk && slk <= z.end_slk);
      if (zone) {
        // Add 'km/h' suffix if not already present
        const speedVal = zone.speed_limit.toString();
        return {
          speed: speedVal.includes('km/h') ? speedVal : `${speedVal}km/h`,
          cwy: zone.carriageway,
        };
      }
      return { speed: '100km/h', cwy: 'Single' };
    };

    const workZoneStartSpeed = getSpeedAtSlk(startSlk);
    const workZoneEndSpeed = getSpeedAtSlk(endSlk);
    const tcStartSpeed = getSpeedAtSlk(tcStartSlk);
    const tcEndSpeed = getSpeedAtSlk(tcEndSlk);
    const approachStartSpeed = getSpeedAtSlk(startSlk - 0.2);
    const approachEndSpeed = getSpeedAtSlk(endSlk + 0.2);

    // Get pavement data from IndexedDB
    const pavementData = await getPavementData(roadId, midSlk);

    // Calculate work zone length in meters
    const workZoneLengthM = Math.round((endSlk - startSlk) * 1000);

    return {
      road_id: roadId,
      road_name: roadData.road_name,
      network_type: roadData.network_type || 'State Road',

      work_zone: {
        start_slk: startSlk,
        end_slk: endSlk,
        length_m: workZoneLengthM,
        start: workZoneStart
          ? {
              lat: workZoneStart.lat,
              lon: workZoneStart.lon,
              speed: workZoneStartSpeed.speed,
              cwy: workZoneStartSpeed.cwy,
            }
          : null,
        end: workZoneEnd
          ? {
              lat: workZoneEnd.lat,
              lon: workZoneEnd.lon,
              speed: workZoneEndSpeed.speed,
              cwy: workZoneEndSpeed.cwy,
            }
          : null,
      },

      tc_positions: {
        start_slk: tcStartSlk,
        end_slk: tcEndSlk,
        start: tcStart
          ? {
              lat: tcStart.lat,
              lon: tcStart.lon,
              speed: tcStartSpeed.speed,
              cwy: tcStartSpeed.cwy,
            }
          : null,
        end: tcEnd
          ? {
              lat: tcEnd.lat,
              lon: tcEnd.lon,
              speed: tcEndSpeed.speed,
              cwy: tcEndSpeed.cwy,
            }
          : null,
      },

      approach_signs: {
        start_slk: startSlk - 0.2,
        end_slk: endSlk + 0.2,
        start: null,
        end: null,
      },

      speed_zones: {
        approach_start: approachStartSpeed.speed,
        tc_start: tcStartSpeed.speed,
        work_zone_start: workZoneStartSpeed.speed,
        work_zone_end: workZoneEndSpeed.speed,
        tc_end: tcEndSpeed.speed,
        approach_end: approachEndSpeed.speed,
      },

      carriageway: workZoneStartSpeed.cwy,

      pavement: {
        lanes: pavementData?.lanes ?? null,
        width_m: pavementData?.trafficable_width ?? null,
        cwy: pavementData?.cwy ?? workZoneStartSpeed.cwy,
        total_pave_width: pavementData?.total_pave_width ?? null,
        total_seal_width: pavementData?.total_seal_width ?? null,
        sealed_shoulder_l: pavementData?.sealed_shoulder_l ?? null,
        sealed_shoulder_r: pavementData?.sealed_shoulder_r ?? null,
        unsealed_shoulder_l: pavementData?.unsealed_shoulder_l ?? null,
        unsealed_shoulder_r: pavementData?.unsealed_shoulder_r ?? null,
        kerb_l: pavementData?.kerb_l ?? null,
        kerb_r: pavementData?.kerb_r ?? null,
      },

      midpoint: midpoint ? { lat: midpoint.lat, lon: midpoint.lon, slk: midSlk } : null,

      google_maps: {
        work_zone_start: workZoneStart
          ? `https://www.google.com/maps/dir/?api=1&destination=${workZoneStart.lat},${workZoneStart.lon}`
          : null,
        work_zone_end: workZoneEnd
          ? `https://www.google.com/maps/dir/?api=1&destination=${workZoneEnd.lat},${workZoneEnd.lon}`
          : null,
        tc_start: tcStart
          ? `https://www.google.com/maps/dir/?api=1&destination=${tcStart.lat},${tcStart.lon}`
          : null,
        tc_end: tcEnd
          ? `https://www.google.com/maps/dir/?api=1&destination=${tcEnd.lat},${tcEnd.lon}`
          : null,
      },

      source: 'offline',
    };
  } catch (e) {
    console.error('Error in getWorkZoneOffline:', e);
    return null;
  }
}
