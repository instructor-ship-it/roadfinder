/**
 * Signage Operations
 *
 * Contains rail crossings, regulatory signs, warning signs, and corridor signage.
 *
 * @module lib/offline-db/signage
 */

import { initDB } from './db-core';
import { haversineDistance } from '@/lib/utils';
import type {
  RailCrossingData,
  RegulatorySignData,
  WarningSignData,
  SignageItem,
  ParsedSpeedZone,
  SpeedSignOverride,
  RoadData,
} from './types';

// ============================================================================
// Rail Crossings
// ============================================================================

/**
 * Get rail crossings for a road
 */
export async function getRailCrossings(roadId: string): Promise<RailCrossingData[]> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('railCrossings', 'readonly');
      const store = tx.objectStore('railCrossings');
      const request = store.get(roadId);

      request.onsuccess = () => {
        resolve(request.result?.crossings || []);
      };

      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Store rail crossings
 */
export async function storeRailCrossings(crossings: RailCrossingData[] | undefined): Promise<void> {
  if (!crossings || !crossings.length) return;

  const db = await initDB();

  // Group by road_id
  const byRoad = new Map<string, RailCrossingData[]>();
  for (const crossing of crossings) {
    if (!crossing.road_id) continue;
    if (!byRoad.has(crossing.road_id)) {
      byRoad.set(crossing.road_id, []);
    }
    byRoad.get(crossing.road_id)!.push(crossing);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('railCrossings', 'readwrite');
    const store = tx.objectStore('railCrossings');

    for (const [road_id, roadCrossings] of byRoad) {
      store.put({ road_id, crossings: roadCrossings });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Store rail crossings data (for MRWA sync)
 */
export async function storeRailCrossingsData(
  crossings: any[],
  source: 'static' | 'mrwa' = 'mrwa'
): Promise<number> {
  if (!crossings.length) return 0;
  await storeRailCrossings(crossings);

  // Import storeDatasetMeta from metadata module
  const { storeDatasetMeta } = await import('./metadata');
  await storeDatasetMeta({
    dataset: 'railCrossings',
    lastSync: new Date().toISOString(),
    recordCount: crossings.length,
    source,
  });
  return crossings.length;
}

// ============================================================================
// Regulatory Signs
// ============================================================================

/**
 * Get regulatory signs for a road
 */
export async function getRegulatorySigns(roadId: string): Promise<RegulatorySignData[]> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('regulatorySigns', 'readonly');
      const store = tx.objectStore('regulatorySigns');
      const request = store.get(roadId);

      request.onsuccess = () => {
        resolve(request.result?.signs || []);
      };

      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Store regulatory signs
 */
export async function storeRegulatorySigns(signs: RegulatorySignData[] | undefined): Promise<void> {
  if (!signs || !signs.length) return;

  const db = await initDB();

  // Group by road_id
  const byRoad = new Map<string, RegulatorySignData[]>();
  for (const sign of signs) {
    if (!sign.road_id) continue;
    if (!byRoad.has(sign.road_id)) {
      byRoad.set(sign.road_id, []);
    }
    byRoad.get(sign.road_id)!.push(sign);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('regulatorySigns', 'readwrite');
    const store = tx.objectStore('regulatorySigns');

    for (const [road_id, roadSigns] of byRoad) {
      store.put({ road_id, signs: roadSigns });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Store regulatory signs data (for MRWA sync)
 */
export async function storeRegulatorySignsData(
  signs: any[],
  source: 'static' | 'mrwa' = 'mrwa'
): Promise<number> {
  if (!signs.length) return 0;
  await storeRegulatorySigns(signs);

  // Import storeDatasetMeta from metadata module
  const { storeDatasetMeta } = await import('./metadata');
  await storeDatasetMeta({
    dataset: 'regulatorySigns',
    lastSync: new Date().toISOString(),
    recordCount: signs.length,
    source,
  });
  return signs.length;
}

// ============================================================================
// Warning Signs
// ============================================================================

/**
 * Get warning signs for a road
 */
export async function getWarningSigns(roadId: string): Promise<WarningSignData[]> {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('warningSigns', 'readonly');
      const store = tx.objectStore('warningSigns');
      const request = store.get(roadId);

      request.onsuccess = () => {
        resolve(request.result?.signs || []);
      };

      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Store warning signs
 */
export async function storeWarningSigns(signs: WarningSignData[] | undefined): Promise<void> {
  if (!signs || !signs.length) return;

  const db = await initDB();

  // Group by road_id
  const byRoad = new Map<string, WarningSignData[]>();
  for (const sign of signs) {
    if (!sign.road_id) continue;
    if (!byRoad.has(sign.road_id)) {
      byRoad.set(sign.road_id, []);
    }
    byRoad.get(sign.road_id)!.push(sign);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('warningSigns', 'readwrite');
    const store = tx.objectStore('warningSigns');

    for (const [road_id, roadSigns] of byRoad) {
      store.put({ road_id, signs: roadSigns });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Store warning signs data (for MRWA sync)
 */
export async function storeWarningSignsData(
  signs: any[],
  source: 'static' | 'mrwa' = 'mrwa'
): Promise<number> {
  if (!signs.length) return 0;
  await storeWarningSigns(signs);

  // Import storeDatasetMeta from metadata module
  const { storeDatasetMeta } = await import('./metadata');
  await storeDatasetMeta({
    dataset: 'warningSigns',
    lastSync: new Date().toISOString(),
    recordCount: signs.length,
    source,
  });
  return signs.length;
}

// ============================================================================
// Corridor Signage
// ============================================================================

/**
 * Find intersections for a road within a corridor
 * This checks road geometries for points that intersect with the main road
 */
async function findIntersectionsInCorridor(
  roadId: string,
  corridorStart: number,
  corridorEnd: number
): Promise<{ slk: number; roadName: string; roadId: string }[]> {
  const intersections: { slk: number; roadName: string; roadId: string }[] = [];

  try {
    const db = await initDB();

    // Get the main road's geometry first
    const mainRoadData = await new Promise<RoadData | null>((resolve) => {
      const tx = db.transaction('regions', 'readonly');
      const store = tx.objectStore('regions');
      const request = store.getAll();

      request.onsuccess = () => {
        for (const region of request.result) {
          const road = region.roads?.find((r: RoadData) => r.road_id === roadId);
          if (road) {
            resolve(road);
            return;
          }
        }
        resolve(null);
      };
      request.onerror = () => resolve(null);
    });

    if (!mainRoadData || !mainRoadData.segments) {
      return intersections;
    }

    // Get segments within corridor and their geometry bounds
    const corridorSegments = mainRoadData.segments.filter(
      (seg) => seg.start_slk <= corridorEnd && seg.end_slk >= corridorStart
    );

    if (corridorSegments.length === 0 || !corridorSegments[0].geometry) {
      return intersections;
    }

    // Get geometry bounds for the corridor
    const allPoints = corridorSegments.flatMap((seg) => seg.geometry || []);
    if (allPoints.length === 0) return intersections;

    const minLat = Math.min(...allPoints.map((p) => p[0])) - 0.005; // ~500m buffer
    const maxLat = Math.max(...allPoints.map((p) => p[0])) + 0.005;
    const minLon = Math.min(...allPoints.map((p) => p[1])) - 0.005;
    const maxLon = Math.max(...allPoints.map((p) => p[1])) + 0.005;

    // Search all roads for intersections
    const allRegions = await new Promise<any[]>((resolve) => {
      const tx = db.transaction('regions', 'readonly');
      const store = tx.objectStore('regions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });

    // Find roads that have geometry points within our corridor bounds
    // OPTIMIZATION: Pre-compute road-level bounding boxes to skip non-overlapping roads
    // (was O(all_roads × segments × points × corridor_segments × corridor_points))
    for (const region of allRegions) {
      for (const road of region.roads || []) {
        if (road.road_id === roadId) continue; // Skip the main road

        if (road.segments) {
          // Quick check: does this road have any segment within the corridor SLK range?
          const inSlkRange = road.segments.some(
            (seg: { start_slk: number; end_slk: number }) =>
              seg.start_slk <= corridorEnd && seg.end_slk >= corridorStart
          );
          if (!inSlkRange) continue;

          // Pre-compute this road's geometry bounding box
          let roadMinLat = Infinity,
            roadMaxLat = -Infinity;
          let roadMinLon = Infinity,
            roadMaxLon = -Infinity;
          let hasGeometry = false;

          for (const seg of road.segments) {
            if (!seg.geometry) continue;
            hasGeometry = true;
            for (const point of seg.geometry) {
              if (point[0] < roadMinLat) roadMinLat = point[0];
              if (point[0] > roadMaxLat) roadMaxLat = point[0];
              if (point[1] < roadMinLon) roadMinLon = point[1];
              if (point[1] > roadMaxLon) roadMaxLon = point[1];
            }
          }

          if (!hasGeometry) continue;

          // Skip this road entirely if its bounding box doesn't overlap with corridor bounds
          if (
            roadMaxLat < minLat ||
            roadMinLat > maxLat ||
            roadMaxLon < minLon ||
            roadMinLon > maxLon
          ) {
            continue;
          }

          for (const seg of road.segments) {
            if (!seg.geometry) continue;

            // Check if any point is within the corridor bounds
            for (const point of seg.geometry) {
              const [lat, lon] = point;

              if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
                // This road has geometry near our corridor - find the closest main road point
                // to estimate the intersection SLK
                let closestSlk: number | null = null;
                let minDist = Infinity;

                for (const mainSeg of corridorSegments) {
                  if (!mainSeg.geometry) continue;

                  for (let i = 0; i < mainSeg.geometry.length; i++) {
                    const [mainLat, mainLon] = mainSeg.geometry[i];
                    // Use Haversine for accurate distance in meters
                    const dist = haversineDistance(lat, lon, mainLat, mainLon);

                    if (dist < minDist && dist < 200) {
                      // Within 200m
                      minDist = dist;
                      // Estimate SLK based on position in segment
                      const segLen = mainSeg.end_slk - mainSeg.start_slk;
                      const ratio = i / (mainSeg.geometry.length - 1 || 1);
                      closestSlk = mainSeg.start_slk + segLen * ratio;
                    }
                  }
                }

                if (closestSlk !== null) {
                  // Check we haven't already found this intersection
                  const exists = intersections.some(
                    (i) => Math.abs(i.slk - closestSlk!) < 0.1 && i.roadId === road.road_id
                  );

                  if (!exists) {
                    intersections.push({
                      slk: closestSlk,
                      roadName: road.road_name,
                      roadId: road.road_id,
                    });
                  }
                }
                break; // Only need one point per segment
              }
            }
          }
        }
      }
    }

    // Sort by SLK
    intersections.sort((a, b) => a.slk - b.slk);
  } catch (e) {
    console.error('Error finding intersections:', e);
  }

  return intersections;
}

/**
 * Get all signage in corridor for Signage Corridor Report
 * @param roadId Road ID
 * @param corridorStart SLK start of corridor
 * @param corridorEnd SLK end of corridor
 */
export async function getSignageInCorridor(
  roadId: string,
  corridorStart: number,
  corridorEnd: number
): Promise<SignageItem[]> {
  const signage: SignageItem[] = [];

  // Find intersections in the corridor first
  const intersections = await findIntersectionsInCorridor(roadId, corridorStart, corridorEnd);

  // Import speed zone functions
  const { getSpeedZones, getSpeedSignOverrides } = await import('./speed-zones');

  // Get speed zones
  const speedZones = await getSpeedZones(roadId);

  // Group zones by SLK location (combine signs at same location)
  const slkGroups = new Map<number, ParsedSpeedZone[]>();

  for (const zone of speedZones) {
    // Only include zone starts within corridor
    if (zone.start_slk >= corridorStart && zone.start_slk <= corridorEnd) {
      // Round SLK to 2 decimal places for grouping (handles ~10m discrepancies)
      const roundedSlk = Math.round(zone.start_slk * 100) / 100;
      if (!slkGroups.has(roundedSlk)) {
        slkGroups.set(roundedSlk, []);
      }
      slkGroups.get(roundedSlk)!.push(zone);
    }
  }

  // Process each SLK group
  for (const [slk, zones] of slkGroups) {
    // Check if this speed sign is near an intersection
    let nearestIntersection:
      | {
          roadName: string;
          roadId: string;
          intersectionSlk: number;
          distanceToIntersection: number;
        }
      | undefined;

    for (const intersection of intersections) {
      const distKm = Math.abs(slk - intersection.slk);
      const distM = distKm * 1000;

      if (distM <= 500) {
        if (!nearestIntersection || distM < nearestIntersection.distanceToIntersection) {
          nearestIntersection = {
            roadName: intersection.roadName,
            roadId: intersection.roadId,
            intersectionSlk: intersection.slk,
            distanceToIntersection: distM,
          };
        }
      }
    }

    // Find zone with sign face info
    const zoneWithSignFaces = zones.find(
      (z) => z.sign_face_increasing !== undefined || z.sign_face_decreasing !== undefined
    );

    if (zoneWithSignFaces && zoneWithSignFaces.replicated) {
      // Double-sided replicated sign - show sign faces
      const incSpeed = zoneWithSignFaces.sign_face_increasing || zoneWithSignFaces.speed_limit;
      const decSpeed = zoneWithSignFaces.sign_face_decreasing || zoneWithSignFaces.speed_limit;

      const signItem: SignageItem = {
        slk: slk,
        carriageway: 'Both',
        category: 'speed',
        sign_type: 'Speed Restriction',
        description: `TL[${incSpeed}/${decSpeed}] + TR[${incSpeed}/${decSpeed}]`,
        action: nearestIntersection ? 'COVER REQUIRED' : 'Check if covering needed',
        speedLimit: zoneWithSignFaces.speed_limit,
        sign_face_increasing: incSpeed,
        sign_face_decreasing: decSpeed,
        replicated: true,
      };

      if (nearestIntersection) {
        signItem.nearIntersection = nearestIntersection;
      }

      signage.push(signItem);
    } else {
      // Single-sided or MRWA zone without sign face info - show as before
      for (const zone of zones) {
        const signItem: SignageItem = {
          slk: slk,
          carriageway: zone.carriageway,
          category: 'speed',
          sign_type: 'Speed Restriction',
          description: `${zone.speed_limit} km/h zone`,
          action: nearestIntersection ? 'COVER REQUIRED' : 'Check if covering needed',
          speedLimit: zone.speed_limit,
        };

        if (nearestIntersection) {
          signItem.nearIntersection = nearestIntersection;
        }

        signage.push(signItem);
      }
    }
  }

  // Get community-verified speed signs (including repeaters/non-replicated signs)
  // These are individual signs that may not define zones but are still relevant for signage reports
  const communitySigns = await getSpeedSignOverrides(roadId);
  for (const sign of communitySigns) {
    // Only include signs within corridor bounds
    if (sign.slk >= corridorStart && sign.slk <= corridorEnd) {
      // Check if this sign is already represented as a zone (avoid duplicates)
      const roundedSlk = Math.round(sign.slk * 100) / 100;
      const alreadyListed = signage.some(
        (s) => Math.abs(s.slk - roundedSlk) < 0.02 && s.category === 'speed'
      );

      if (alreadyListed) continue;

      // Check if near an intersection
      let nearestIntersection:
        | {
            roadName: string;
            roadId: string;
            intersectionSlk: number;
            distanceToIntersection: number;
          }
        | undefined;

      for (const intersection of intersections) {
        const distKm = Math.abs(sign.slk - intersection.slk);
        const distM = distKm * 1000;

        if (distM <= 500) {
          if (!nearestIntersection || distM < nearestIntersection.distanceToIntersection) {
            nearestIntersection = {
              roadName: intersection.roadName,
              roadId: intersection.roadId,
              intersectionSlk: intersection.slk,
              distanceToIntersection: distM,
            };
          }
        }
      }

      // Format description based on sign type
      let description: string;
      let signType: string;

      if (sign.sign_type === 'Double' && sign.replicated) {
        // Double-sided sign
        const incSpeed =
          sign.direction === 'True Left' ? sign.front_speed : sign.back_speed || sign.front_speed;
        const decSpeed =
          sign.direction === 'True Right' ? sign.front_speed : sign.back_speed || sign.front_speed;
        description = `TL[${incSpeed}/${decSpeed}] + TR[${incSpeed}/${decSpeed}]`;
        signType = 'Speed Zone Boundary';
      } else if (sign.sign_type === 'Single' && !sign.replicated) {
        // Repeater sign
        description = `${sign.front_speed} km/h repeater (${sign.direction})`;
        signType = 'Speed Repeater';
      } else {
        // Single replicated sign
        description = `${sign.front_speed} km/h (${sign.direction})`;
        signType = 'Speed Restriction';
      }

      const signItem: SignageItem = {
        slk: sign.slk,
        carriageway: sign.direction === 'True Left' ? 'Left' : 'Right',
        category: 'speed',
        sign_type: signType,
        description: description,
        action: nearestIntersection ? 'COVER REQUIRED' : 'Check if covering needed',
        speedLimit: sign.front_speed,
        override_id: sign.id,
      };

      if (nearestIntersection) {
        signItem.nearIntersection = nearestIntersection;
      }

      signage.push(signItem);
    }
  }

  // Get rail crossings
  const railCrossings = await getRailCrossings(roadId);
  for (const crossing of railCrossings) {
    if (crossing.slk >= corridorStart && crossing.slk <= corridorEnd) {
      signage.push({
        slk: crossing.slk,
        carriageway: crossing.carriageway,
        category: 'railway',
        sign_type: 'Railway Crossing',
        description: `${crossing.crossing_type} crossing`,
        action: 'Contact Arc Infrastructure',
      });
    }
  }

  // Get regulatory signs (speed restriction signs)
  const regulatorySigns = await getRegulatorySigns(roadId);
  for (const sign of regulatorySigns) {
    if (sign.slk >= corridorStart && sign.slk <= corridorEnd) {
      // Check if this is a speed restriction sign
      const isSpeedSign =
        sign.panel_meaning.toUpperCase().includes('SPEED') || sign.panel_design?.startsWith('R4-');

      if (isSpeedSign) {
        // Check if near an intersection
        let nearestIntersection:
          | {
              roadName: string;
              roadId: string;
              intersectionSlk: number;
              distanceToIntersection: number;
            }
          | undefined;

        for (const intersection of intersections) {
          const distKm = Math.abs(sign.slk - intersection.slk);
          const distM = distKm * 1000;

          if (distM <= 500) {
            if (!nearestIntersection || distM < nearestIntersection.distanceToIntersection) {
              nearestIntersection = {
                roadName: intersection.roadName,
                roadId: intersection.roadId,
                intersectionSlk: intersection.slk,
                distanceToIntersection: distM,
              };
            }
          }
        }

        const signItem: SignageItem = {
          slk: sign.slk,
          carriageway: sign.carriageway,
          category: 'regulatory',
          sign_type: sign.panel_design,
          description: sign.panel_meaning,
          action: nearestIntersection ? 'COVER REQUIRED' : 'Check if covering needed',
        };

        if (nearestIntersection) {
          signItem.nearIntersection = nearestIntersection;
        }

        signage.push(signItem);
      } else {
        // Other important regulatory signs
        const importantSigns = ['STOP', 'GIVE WAY', 'KEEP LEFT', 'NO ENTRY'];
        const isImportant = importantSigns.some((s) =>
          sign.panel_meaning.toUpperCase().includes(s)
        );

        if (isImportant) {
          signage.push({
            slk: sign.slk,
            carriageway: sign.carriageway,
            category: 'regulatory',
            sign_type: sign.panel_design,
            description: sign.panel_meaning,
            action: 'Check site',
          });
        }
      }
    }
  }

  // Get warning signs
  const warningSigns = await getWarningSigns(roadId);
  for (const sign of warningSigns) {
    if (sign.slk >= corridorStart && sign.slk <= corridorEnd) {
      // Filter to important signs only
      const importantSigns = [
        'ADVISORY',
        'CURVE',
        'SPEED',
        'RAILWAY',
        'SIGNALS',
        'STOP SIGN AHEAD',
        'GIVE WAY AHEAD',
      ];
      const isImportant = importantSigns.some((s) => sign.panel_meaning.toUpperCase().includes(s));

      if (isImportant) {
        signage.push({
          slk: sign.slk,
          carriageway: sign.carriageway,
          category: 'warning',
          sign_type: sign.panel_design,
          description: sign.panel_meaning,
          action: 'Check site',
        });
      }
    }
  }

  // NOTE: Intersections are no longer added here because the findIntersectionsInCorridor
  // function finds roads with geometry NEAR the corridor (including parallel roads),
  // not actual intersections. For accurate intersection data, use the /api/intersections
  // endpoint which queries MRWA Layer 6 (Intersections).

  // Sort by SLK
  signage.sort((a, b) => a.slk - b.slk);

  return signage;
}
