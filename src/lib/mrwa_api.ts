/**
 * Main Roads WA ArcGIS API Integration
 * 
 * This module provides functions to:
 * 1. Get GPS coordinates for a road at a specific SLK
 * 2. Find intersecting roads within a TC zone
 * 
 * TC Zone Definition:
 * - If only slk_start provided: TC Zone = slk_start - 0.1 to slk_start + 0.1
 * - If slk_start and slk_end provided: TC Zone = slk_start - 0.1 to slk_end + 0.1
 * 
 * IMPORTANT: Cross road names are sourced from the Intersections Layer (Layer 6)
 * which provides accurate, verified intersection names like "Dawson St & Vincent St"
 * instead of potentially outdated Road Network node names.
 */

// API endpoints
const STATE_ROAD_URL = "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/24/query";
const LOCAL_ROAD_URL = "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/25/query";
const ALL_ROADS_URL = "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/17/query"; // Layer 17 has RA_NAME for all roads
const INTERSECTIONS_URL = "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/6/query"; // Layer 6 has accurate intersection names (NODE_DESCR)

// ============================================================
// TYPES
// ============================================================

export interface IntersectionNode {
  nodeNo: string;
  nodeName: string;
  slkOnRefRoad: number;
  hasConnectedRoad: boolean;
  connectedRoadId?: string;
  lat: number;
  lon: number;
}

export interface IntersectingRoad {
  roadId: string;
  roadName: string;
  slkStart: number;
  slkEnd: number;
  region: string;
  source: string;
  intersectionNode?: string;
  intersectionSlk: number;
  lat: number;
  lon: number;
  distanceFromTcStartKm?: number;
}

export interface GpsCoordinate {
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
}

export interface RoadInfo {
  roadId: string;
  roadName: string;
  slkStart: number;
  slkEnd: number;
  region: string;
}

export interface TcZoneResult {
  referenceRoad: RoadInfo;
  tcZone: {
    startSlk: number;
    endSlk: number;
    startCoord: { lat: number; lon: number } | null;
    endCoord: { lat: number; lon: number } | null;
  };
  workZone?: {
    startSlk: number;
    endSlk: number;
  };
  intersectingRoads: IntersectingRoad[];
  intersectionNodes: IntersectionNode[];
}

export interface GpsResult {
  roadId: string;
  roadName: string;
  slk: number;
  region: string;
  coordinate: GpsCoordinate;
}

// ============================================================
// CORE FUNCTIONS
// ============================================================

async function fetchArcGIS(baseUrl: string, params: Record<string, string>): Promise<any> {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  const response = await fetch(url.toString());
  return response.json();
}

function getGeometryBounds(features: any[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const feature of features) {
    const geom = feature.geometry;
    if (geom?.paths) {
      for (const path of geom.paths) {
        for (const point of path) {
          if (point[0] < minX) minX = point[0];
          if (point[1] < minY) minY = point[1];
          if (point[0] > maxX) maxX = point[0];
          if (point[1] > maxY) maxY = point[1];
        }
      }
    }
  }
  
  return { minX, minY, maxX, maxY };
}

function interpolateGpsFromGeometry(
  geometry: any,
  segmentStartSlk: number,
  segmentEndSlk: number,
  targetSlk: number
): { lat: number; lon: number } | null {
  if (!geometry?.paths || geometry.paths.length === 0) return null;
  
  const path = geometry.paths[0];
  if (path.length < 2) return null;
  
  const slkRange = segmentEndSlk - segmentStartSlk;
  if (slkRange <= 0) return null;
  
  const distances: number[] = [0];
  let totalDistance = 0;
  
  for (let i = 1; i < path.length; i++) {
    const [lon1, lat1] = path[i - 1];
    const [lon2, lat2] = path[i];
    totalDistance += Math.sqrt(Math.pow(lon2 - lon1, 2) + Math.pow(lat2 - lat1, 2));
    distances.push(totalDistance);
  }
  
  if (totalDistance === 0) {
    return { lat: path[0][1], lon: path[0][0] };
  }
  
  const ratio = (targetSlk - segmentStartSlk) / slkRange;
  const targetDistance = ratio * totalDistance;
  
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] >= targetDistance || i === distances.length - 1) {
      const segRatio = distances[i] === distances[i - 1] ? 0 : 
        (targetDistance - distances[i - 1]) / (distances[i] - distances[i - 1]);
      
      const [lon1, lat1] = path[i - 1];
      const [lon2, lat2] = path[i];
      
      return {
        lon: lon1 + (lon2 - lon1) * segRatio,
        lat: lat1 + (lat2 - lat1) * segRatio
      };
    }
  }
  
  return { lat: path[path.length - 1][1], lon: path[path.length - 1][0] };
}

/**
 * Get GPS coordinates for a specific SLK on a feature
 */
function getGpsForFeatureSlk(features: any[], targetSlk: number): { lat: number; lon: number } | null {
  for (const f of features) {
    if (targetSlk >= f.attributes.START_SLK && targetSlk <= f.attributes.END_SLK) {
      return interpolateGpsFromGeometry(f.geometry, f.attributes.START_SLK, f.attributes.END_SLK, targetSlk);
    }
  }
  return null;
}

/**
 * Get SLK on a reference road for a given GPS coordinate
 * This is the reverse of interpolateGpsFromGeometry
 */
function getSlkForGpsCoordinate(
  features: any[],
  targetLat: number,
  targetLon: number
): number | null {
  let bestSlk: number | null = null;
  let minDist = Infinity;
  
  for (const f of features) {
    const geom = f.geometry;
    if (!geom?.paths) continue;
    
    const startSlk = f.attributes.START_SLK;
    const endSlk = f.attributes.END_SLK;
    const slkRange = endSlk - startSlk;
    if (slkRange <= 0) continue;
    
    // Calculate total path length
    const path = geom.paths[0];
    if (!path || path.length < 2) continue;
    
    // Build distance array
    const distances: number[] = [0];
    let totalDistance = 0;
    for (let i = 1; i < path.length; i++) {
      const [lon1, lat1] = path[i - 1];
      const [lon2, lat2] = path[i];
      totalDistance += Math.sqrt(Math.pow(lon2 - lon1, 2) + Math.pow(lat2 - lat1, 2));
      distances.push(totalDistance);
    }
    
    if (totalDistance === 0) continue;
    
    // Find closest point on path to target coordinate
    for (let i = 1; i < path.length; i++) {
      const [lon1, lat1] = path[i - 1];
      const [lon2, lat2] = path[i];
      const segLen = distances[i] - distances[i - 1];
      
      if (segLen === 0) continue;
      
      // Project target point onto this segment
      const dx = lon2 - lon1;
      const dy = lat2 - lat1;
      const lengthSq = dx * dx + dy * dy;
      
      if (lengthSq === 0) continue;
      
      // Calculate projection parameter t (0-1 along segment)
      let t = ((targetLon - lon1) * dx + (targetLat - lat1) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t)); // Clamp to segment
      
      // Calculate distance from target to projected point
      const projLon = lon1 + t * dx;
      const projLat = lat1 + t * dy;
      const dist = Math.sqrt(Math.pow(targetLon - projLon, 2) + Math.pow(targetLat - projLat, 2));
      
      if (dist < minDist) {
        minDist = dist;
        // Calculate SLK at this point
        const distanceAlongPath = distances[i - 1] + t * segLen;
        const ratio = distanceAlongPath / totalDistance;
        bestSlk = startSlk + ratio * slkRange;
      }
    }
  }
  
  return bestSlk;
}

/**
 * Get accurate intersection name from Intersections Layer (Layer 6)
 * This provides verified names like "Dawson St & Vincent St" instead of
 * potentially outdated Road Network node names.
 */
async function getAccurateIntersectionName(lat: number, lon: number, radiusM: number = 100): Promise<string | null> {
  // Convert radius to degrees (approximate)
  const radiusDeg = radiusM / 111000; // ~111km per degree
  
  // Build bounding box
  const minLat = lat - radiusDeg;
  const maxLat = lat + radiusDeg;
  const minLon = lon - radiusDeg;
  const maxLon = lon + radiusDeg;
  
  const params = {
    geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "NODE_DESCR",
    returnGeometry: "false",
    f: "json",
    resultRecordCount: "5"
  };
  
  try {
    const result = await fetchArcGIS(INTERSECTIONS_URL, params);
    
    if (result.features && result.features.length > 0) {
      // Return the first intersection name found
      return result.features[0].attributes.NODE_DESCR || null;
    }
  } catch (e) {
    console.error('Failed to get accurate intersection name:', e);
  }
  
  return null;
}

// ============================================================
// PUBLIC API FUNCTIONS
// ============================================================

/**
 * Get GPS coordinates for a road at a specific SLK
 */
export async function getGpsForSlk(roadId: string, slk: number): Promise<GpsResult | null> {
  const query = {
    where: `ROAD = '${roadId}' AND START_SLK <= ${slk} AND END_SLK >= ${slk}`,
    outFields: "ROAD,ROAD_NAME,START_SLK,END_SLK,RA_NAME",
    returnGeometry: "true",
    f: "json"
  };
  
  const result = await fetchArcGIS(STATE_ROAD_URL, query);
  
  if (!result.features || result.features.length === 0) {
    return null;
  }
  
  const feature = result.features[0];
  const attrs = feature.attributes;
  const coords = interpolateGpsFromGeometry(feature.geometry, attrs.START_SLK, attrs.END_SLK, slk);
  
  if (!coords) return null;
  
  return {
    roadId: attrs.ROAD,
    roadName: attrs.ROAD_NAME,
    slk: slk,
    region: attrs.RA_NAME,
    coordinate: {
      latitude: coords.lat,
      longitude: coords.lon,
      googleMapsUrl: `https://www.google.com/maps?q=${coords.lat},${coords.lon}`
    }
  };
}

/**
 * Find roads intersecting within the TC zone
 * 
 * TC Zone Definition:
 * - If only slkStart provided: TC Zone = slkStart - range to slkStart + range
 * - If slkStart and slkEnd provided: TC Zone = slkStart - range to slkEnd + range
 * - Default range is 0.1 (±100m for TC zone), use 0.7 for signage corridor (±700m)
 * 
 * Intersections are only found WITHIN the TC zone
 * Supports both State Roads (H/M prefix) and Local Roads
 */
export async function findIntersectingRoads(
  roadId: string,
  slkStart: number,
  slkEnd?: number,
  range: number = 0.1 // Default ±100m (TC zone), use 0.7 for signage corridor
): Promise<TcZoneResult | null> {
  
  // Calculate TC Zone boundaries
  // TC Zone extends `range` km before work zone start and `range` km after work zone end
  const tcStartSlk = slkStart - range;
  const tcEndSlk = slkEnd !== undefined ? slkEnd + range : slkStart + range;
  
  // Calculate min/max for proper range checking (handles both increasing and decreasing SLK)
  // When SLK decreases (e.g., 170.24 → 169.24), tcStartSlk > tcEndSlk
  const tcMinSlk = Math.min(tcStartSlk, tcEndSlk);
  const tcMaxSlk = Math.max(tcStartSlk, tcEndSlk);
  
  // Determine if this is a state road (H/M prefix) or local road
  const isStateRoad = roadId.startsWith('H') || roadId.startsWith('M');
  
  // Get reference road geometry and nodes within TC zone
  // Use Layer 18 (All Roads) for local roads, Layer 24 for state roads
  const roadLayerUrl = isStateRoad ? STATE_ROAD_URL : ALL_ROADS_URL;
  
  const refQuery = {
    where: `ROAD = '${roadId}' AND START_SLK < ${tcEndSlk} AND END_SLK > ${tcStartSlk}`,
    outFields: isStateRoad 
      ? "ROAD,ROAD_NAME,START_SLK,END_SLK,RA_NAME,START_NODE_NO,START_NODE_NAME,END_NODE_NO,END_NODE_NAME"
      : "ROAD,ROAD_NAME,START_SLK,END_SLK,RA_NAME,NETWORK_TYPE",
    returnGeometry: "true",
    f: "json"
  };
  
  let refResult = await fetchArcGIS(roadLayerUrl, refQuery);
  
  // If not found in expected layer, try the other layer
  if (!refResult.features || refResult.features.length === 0) {
    const fallbackUrl = isStateRoad ? ALL_ROADS_URL : STATE_ROAD_URL;
    refResult = await fetchArcGIS(fallbackUrl, refQuery);
  }
  
  if (!refResult.features || refResult.features.length === 0) {
    return null;
  }
  
  // Extract road info
  const refAttrs = refResult.features[0].attributes;
  const actualSlkStart = Math.min(...refResult.features.map((f: any) => f.attributes.START_SLK));
  const actualSlkEnd = Math.max(...refResult.features.map((f: any) => f.attributes.END_SLK));
  
  const referenceRoad: RoadInfo = {
    roadId: refAttrs.ROAD,
    roadName: refAttrs.ROAD_NAME,
    slkStart: actualSlkStart,
    slkEnd: actualSlkEnd,
    region: refAttrs.RA_NAME || 'Local'
  };
  
  // Get TC zone coordinates
  const tcStartCoord = getGpsForFeatureSlk(refResult.features, tcStartSlk);
  const tcEndCoord = getGpsForFeatureSlk(refResult.features, tcEndSlk);
  
  // Get bounding box for spatial queries
  const bounds = getGeometryBounds(refResult.features);
  const buffer = 0.002; // ~200m buffer
  const bbox = `${bounds.minX - buffer},${bounds.minY - buffer},${bounds.maxX + buffer},${bounds.maxY + buffer}`;
  
  // Find intersecting roads
  const intersectingRoads: IntersectingRoad[] = [];
  const intersectionNodes: IntersectionNode[] = [];
  const addedRoads = new Set<string>();
  
  if (isStateRoad) {
    // STATE ROAD: Use node-based intersection detection
    
    // Extract intersection nodes WITHIN TC zone only
    const nodeMap = new Map<string, { name: string; slk: number }>();
    
    for (const f of refResult.features) {
      const attrs = f.attributes;
      
      // Only include nodes that fall WITHIN the TC zone
      // Use tcMinSlk/tcMaxSlk to handle both increasing and decreasing SLK directions
      if (attrs.START_SLK >= tcMinSlk && attrs.START_SLK <= tcMaxSlk) {
        if (attrs.START_NODE_NO) {
          nodeMap.set(attrs.START_NODE_NO, { name: attrs.START_NODE_NAME, slk: attrs.START_SLK });
        }
      }
      if (attrs.END_SLK >= tcMinSlk && attrs.END_SLK <= tcMaxSlk) {
        if (attrs.END_NODE_NO) {
          nodeMap.set(attrs.END_NODE_NO, { name: attrs.END_NODE_NAME, slk: attrs.END_SLK });
        }
      }
    }
    
    const nodeNumbers = Array.from(nodeMap.keys());
    const nodesWithRoads = new Map<string, string>();
    
    // Method 1: Node-based matching (most accurate - finds roads sharing intersection nodes)
    // IMPORTANT: We verify geometry to ensure roads actually CROSS, not just share a node (parallel roads)
    if (nodeNumbers.length > 0) {
      const nodeQuery = {
        where: `START_NODE_NO IN ('${nodeNumbers.join("','")}') OR END_NODE_NO IN ('${nodeNumbers.join("','")}')`,
        outFields: "ROAD,ROAD_NAME,START_SLK,END_SLK,RA_NAME,START_NODE_NO,END_NODE_NO",
        returnGeometry: "false",
        f: "json",
        resultRecordCount: "2000"
      };
      
      const nodeResult = await fetchArcGIS(STATE_ROAD_URL, nodeQuery);
      if (nodeResult.features) {
        for (const f of nodeResult.features) {
          const attrs = f.attributes;
          
          // Skip our own road - we want CROSS roads, not our road
          if (attrs.ROAD === roadId || attrs.ROAD?.toLowerCase() === roadId?.toLowerCase()) {
            continue;
          }
          
          const key = attrs.ROAD;
          if (addedRoads.has(key)) continue;
          
          const nodeNo = nodeNumbers.includes(attrs.START_NODE_NO) 
            ? attrs.START_NODE_NO 
            : attrs.END_NODE_NO;
          const nodeInfo = nodeMap.get(nodeNo)!;
          
          // Get GPS for intersection
          const gps = getGpsForFeatureSlk(refResult.features, nodeInfo.slk);
          
          // CRITICAL: Verify that this road actually CROSSES the reference road
          // This filters out parallel roads that share nodes but don't intersect
          if (gps && attrs.ROAD) {
            const actuallyCrosses = await verifyRoadsActuallyCross(
              refResult.features,
              attrs.ROAD,
              gps.lat,
              gps.lon,
              0.003 // ~300m tolerance for geometry verification
            );
            
            if (!actuallyCrosses) {
              // Road shares a node but doesn't actually cross - likely a parallel road
              console.log(`[RC 1.7.28] Filtering parallel road: ${attrs.ROAD_NAME} at SLK ${nodeInfo.slk.toFixed(2)}`);
              continue;
            }
          }
          
          // Road verified as crossing - add it
          addedRoads.add(key);
          
          // Get accurate intersection name from Layer 6 (Intersections Layer)
          let accurateNodeName = nodeInfo.name; // fallback to road network name
          if (gps) {
            const layer6Name = await getAccurateIntersectionName(gps.lat, gps.lon, 100);
            if (layer6Name) {
              accurateNodeName = layer6Name;
            }
          }
          
          intersectingRoads.push({
            roadId: attrs.ROAD,
            roadName: attrs.ROAD_NAME,
            slkStart: attrs.START_SLK,
            slkEnd: attrs.END_SLK,
            region: attrs.RA_NAME,
            source: 'State Road Network (Verified)',
            intersectionNode: accurateNodeName,
            intersectionSlk: nodeInfo.slk,
            lat: gps?.lat || 0,
            lon: gps?.lon || 0
          });
          
          nodesWithRoads.set(nodeNo, attrs.ROAD);
        }
      }
    }
    
    // Method 2: Search for local roads by intersection node name
    for (const [nodeNo, info] of nodeMap) {
      const nodeName = info.name;
      
      // Skip generic node names
      if (nodeName.includes('Start') || nodeName.includes('End') || 
          nodeName.includes('Slip') || nodeName.includes('Dual') ||
          nodeName.includes('Link Rd') || nodeName.includes('Great Eastern Hwy')) {
        continue;
      }
      
      // Get GPS for this intersection
      const gps = getGpsForFeatureSlk(refResult.features, info.slk);
      
      // Get accurate intersection name from Layer 6 (Intersections Layer)
      let accurateNodeName = nodeName; // fallback to road network name
      if (gps) {
        const layer6Name = await getAccurateIntersectionName(gps.lat, gps.lon, 100);
        if (layer6Name) {
          accurateNodeName = layer6Name;
        }
      }
      
      // Search for local roads matching this node name
      // Use the accurate name from Layer 6 for better matching
      const cleanName = accurateNodeName.replace(' Slip Rd', '').replace(' Link Rd', '').split(' & ')[0].trim();
      
      // Try multiple search patterns
      const searchPatterns = [
        `ROAD_NAME LIKE '%${cleanName}%'`,
        `ROAD_NAME LIKE '%${cleanName.replace(/ /g, '%')}%'`,
      ];
      
      let foundRoad = nodesWithRoads.has(nodeNo);
      
      for (const pattern of searchPatterns) {
        if (foundRoad) break;
        
        const nameQuery = {
          where: pattern,
          outFields: "ROAD,ROAD_NAME,START_SLK,END_SLK,RA_NAME",
          returnGeometry: "false",
          f: "json",
          resultRecordCount: "50"
        };
        
        try {
          const localResult = await fetchArcGIS(LOCAL_ROAD_URL, nameQuery);
          if (localResult.features && localResult.features.length > 0) {
            for (const f of localResult.features) {
              // Skip if this is the reference road (we want CROSS roads, not our road)
              if (f.attributes.ROAD === roadId || f.attributes.ROAD?.toLowerCase() === roadId?.toLowerCase()) {
                continue;
              }
              if (addedRoads.has(f.attributes.ROAD)) continue;
              // Check if the road name actually matches
              const roadName = f.attributes.ROAD_NAME.toLowerCase();
              if (roadName.includes(cleanName.toLowerCase())) {
                addedRoads.add(f.attributes.ROAD);
                
                intersectingRoads.push({
                  roadId: f.attributes.ROAD,
                  roadName: f.attributes.ROAD_NAME,
                  slkStart: f.attributes.START_SLK,
                  slkEnd: f.attributes.END_SLK,
                  region: f.attributes.RA_NAME,
                  source: 'Local Road Network',
                  intersectionNode: accurateNodeName,
                  intersectionSlk: info.slk,
                  lat: gps?.lat || 0,
                  lon: gps?.lon || 0
                });
                
                nodesWithRoads.set(nodeNo, f.attributes.ROAD);
                foundRoad = true;
              }
            }
          }
        } catch (e) {
          // Local road layer might not be available
        }
      }
      
      // Add intersection node (even if no road found)
      intersectionNodes.push({
        nodeNo,
        nodeName: accurateNodeName,
        slkOnRefRoad: info.slk,
        hasConnectedRoad: nodesWithRoads.has(nodeNo),
        connectedRoadId: nodesWithRoads.get(nodeNo),
        lat: gps?.lat || 0,
        lon: gps?.lon || 0
      });
    }
    
    // Method 3: Direct Layer 6 query for ALL intersections within TC zone
    // This catches local roads that aren't connected via node numbers
    const layer6Query = {
      geometry: bbox,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: "NODE_DESCR,NODE_TYPE",
      returnGeometry: "true",
      f: "json",
      resultRecordCount: "200"
    };
    
    try {
      const layer6Result = await fetchArcGIS(INTERSECTIONS_URL, layer6Query);
      
      if (layer6Result.features) {
        for (const f of layer6Result.features) {
          const nodeName = f.attributes?.NODE_DESCR || '';
          const geom = f.geometry;
          
          // Skip generic node names
          if (nodeName.toLowerCase().includes('end road') || 
              nodeName.toLowerCase().includes('start road')) {
            continue;
          }
          
          // IMPORTANT: Only include nodes that CONTAIN the reference road name
          // These are actual intersections WITH our road (e.g., "Great Eastern Hwy & Little Underwood Rd")
          // Skip nodes that DON'T contain our road name - they're intersections between OTHER roads
          const refRoadNamePart = referenceRoad.roadName?.toLowerCase().split(' ')[0] || '';
          if (refRoadNamePart && !nodeName.toLowerCase().includes(refRoadNamePart)) {
            continue;
          }
          
          // Extract the intersecting road name from node description (format: "Road A & Road B")
          const roads = nodeName.split(' & ').map(r => r.trim());
          for (const road of roads) {
            // Skip if this is the reference road (we want the CROSS road, not our road)
            if (road.toLowerCase().includes(refRoadNamePart)) {
              continue;
            }
            
            // Check if we already have this intersection
            const key = `layer6-${road}`;
            if (addedRoads.has(key)) continue;
            addedRoads.add(key);
            
            // Get SLK for this intersection
            const intLat = geom?.y || 0;
            const intLon = geom?.x || 0;
            const intSlk = getSlkForGpsCoordinate(refResult.features, intLat, intLon);
            
            // Only include if within TC zone
            if (intSlk !== null && intSlk >= tcMinSlk && intSlk <= tcMaxSlk) {
              intersectingRoads.push({
                roadId: 'LOCAL',
                roadName: road,
                slkStart: intSlk,
                slkEnd: intSlk,
                region: referenceRoad.region,
                source: 'Layer 6 Intersections',
                intersectionNode: nodeName,
                intersectionSlk: intSlk,
                lat: intLat,
                lon: intLon
              });
              
              // Also add intersection node with hasConnectedRoad: true
              // This prevents duplicates from Method 2
              intersectionNodes.push({
                nodeNo: road,
                nodeName: nodeName,
                slkOnRefRoad: intSlk,
                hasConnectedRoad: true,
                connectedRoadId: road,
                lat: intLat,
                lon: intLon
              });
            }
          }
        }
      }
    } catch (e) {
      // Layer 6 might not be available
    }
  } else {
    // LOCAL ROAD: Use Layer 6 (Intersections) for accurate intersection detection
    
    // Get the road name for Layer 6 query
    const roadName = refAttrs.ROAD_NAME || '';
    const baseRoadName = roadName.split(' ')[0]; // e.g., "Dawson" from "Dawson St"
    
    // Query Layer 6 for intersections involving this road
    const intersectionQuery = {
      geometry: bbox,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: "NODE_DESCR,NODE_TYPE",
      returnGeometry: "true",
      f: "json",
      resultRecordCount: "200"
    };
    
    try {
      const intResult = await fetchArcGIS(INTERSECTIONS_URL, intersectionQuery);
      
      if (intResult.features) {
        for (const f of intResult.features) {
          const nodeName = f.attributes?.NODE_DESCR || '';
          const geom = f.geometry;
          
          // Skip if not a real intersection (end/start roads)
          if (nodeName.toLowerCase().includes('end road') || 
              nodeName.toLowerCase().includes('start road')) {
            continue;
          }
          
          // Check if this intersection involves our road
          if (!nodeName.toLowerCase().includes(baseRoadName.toLowerCase())) {
            continue;
          }
          
          // Parse the intersection name to extract cross roads
          const parts = nodeName.split(' & ');
          const crossParts = parts.filter((p: string) => 
            !p.toLowerCase().includes(baseRoadName.toLowerCase())
          );
          
          if (crossParts.length === 0 || !geom) continue;
          
          const intLat = geom.y;
          const intLon = geom.x;
          
          // Calculate SLK on reference road for this intersection using proper projection
          const closestSlk = getSlkForGpsCoordinate(refResult.features, intLat, intLon);
          
          if (closestSlk === null) continue;
          
          // Check if intersection is within TC zone
          // Use tcMinSlk/tcMaxSlk to handle both increasing and decreasing SLK directions
          if (closestSlk < tcMinSlk || closestSlk > tcMaxSlk) {
            continue;
          }
          
          // Add each cross road from this intersection
          for (const crossName of crossParts) {
            const cleanName = crossName.trim();
            const key = `${cleanName}-${closestSlk.toFixed(2)}`;
            
            if (addedRoads.has(key)) continue;
            addedRoads.add(key);
            
            // Calculate distance from TC start (use absolute distance)
            const distanceFromTcStart = Math.abs(closestSlk - tcStartSlk);
            
            intersectingRoads.push({
              roadId: cleanName,
              roadName: cleanName,
              slkStart: 0,
              slkEnd: 0,
              region: refAttrs.RA_NAME || 'Local',
              source: 'Layer 6 Intersections',
              intersectionNode: nodeName,
              intersectionSlk: closestSlk,
              lat: intLat,
              lon: intLon,
              distanceFromTcStartKm: distanceFromTcStart
            });
            
            intersectionNodes.push({
              nodeNo: cleanName,
              nodeName: nodeName,
              slkOnRefRoad: closestSlk,
              hasConnectedRoad: true,
              connectedRoadId: cleanName,
              lat: intLat,
              lon: intLon
            });
          }
        }
      }
    } catch (e) {
      console.error('Layer 6 intersection query failed:', e);
    }
  }
  
  // Sort results
  intersectingRoads.sort((a, b) => a.intersectionSlk - b.intersectionSlk);
  intersectionNodes.sort((a, b) => a.slkOnRefRoad - b.slkOnRefRoad);
  
  // Deduplicate intersection nodes - prioritize entries with hasConnectedRoad: true
  const dedupedNodes: typeof intersectionNodes = [];
  const nodeKeys = new Set<string>();
  
  // First pass: add nodes with hasConnectedRoad: true
  for (const node of intersectionNodes) {
    if (node.hasConnectedRoad) {
      const key = `${node.slkOnRefRoad.toFixed(2)}-${node.nodeName}`;
      if (!nodeKeys.has(key)) {
        nodeKeys.add(key);
        dedupedNodes.push(node);
      }
    }
  }
  
  // Second pass: add nodes with hasConnectedRoad: false only if not already added
  for (const node of intersectionNodes) {
    if (!node.hasConnectedRoad) {
      const key = `${node.slkOnRefRoad.toFixed(2)}-${node.nodeName}`;
      if (!nodeKeys.has(key)) {
        nodeKeys.add(key);
        dedupedNodes.push(node);
      }
    }
  }
  
  // Sort deduplicated nodes
  dedupedNodes.sort((a, b) => a.slkOnRefRoad - b.slkOnRefRoad);
  
  return {
    referenceRoad,
    tcZone: {
      startSlk: tcStartSlk,
      endSlk: tcEndSlk,
      startCoord: tcStartCoord,
      endCoord: tcEndCoord
    },
    workZone: slkEnd !== undefined ? { startSlk: slkStart, endSlk: slkEnd } : undefined,
    intersectingRoads,
    intersectionNodes: dedupedNodes
  };
}

/**
 * Get a list of all available roads
 */
export async function listRoads(): Promise<{ roadId: string; roadName: string }[]> {
  const query = {
    where: "ROAD LIKE 'H%' OR ROAD LIKE 'M%'",
    outFields: "ROAD,ROAD_NAME",
    returnGeometry: "false",
    f: "json",
    resultRecordCount: "2000",
    orderByFields: "ROAD"
  };
  
  const result = await fetchArcGIS(STATE_ROAD_URL, query);
  
  if (!result.features) return [];
  
  const seen = new Set<string>();
  const roads: { roadId: string; roadName: string }[] = [];
  
  for (const f of result.features) {
    if (!seen.has(f.attributes.ROAD)) {
      seen.add(f.attributes.ROAD);
      roads.push({
        roadId: f.attributes.ROAD,
        roadName: f.attributes.ROAD_NAME
      });
    }
  }
  
  return roads.sort((a, b) => a.roadId.localeCompare(b.roadId, undefined, { numeric: true }));
}

// ============================================================
// INTERSECTIONS LAYER (Layer 6) - For accurate cross road names
// ============================================================

export interface IntersectionResult {
  nodeName: string;
  lat: number;
  lon: number;
  nodeType: string;
  distanceM: number;
}

/**
 * Find nearest intersections to a GPS point using the Intersections layer (Layer 6)
 * This gives accurate intersection names instead of confusing road network node names
 */
export async function findNearestIntersections(
  lat: number,
  lon: number,
  radiusKm: number = 2
): Promise<IntersectionResult[]> {
  
  // Convert radius to degrees (approximate)
  const radiusDeg = radiusKm / 111; // ~111km per degree
  
  // Build bounding box
  const minLat = lat - radiusDeg;
  const maxLat = lat + radiusDeg;
  const minLon = lon - radiusDeg;
  const maxLon = lon + radiusDeg;
  
  const query = {
    geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "NODE_DESCR,NODE_TYPE",
    returnGeometry: "true",
    f: "json",
    resultRecordCount: "50"
  };
  
  const result = await fetchArcGIS(INTERSECTIONS_URL, query);
  
  if (!result.features || result.features.length === 0) {
    return [];
  }
  
  // Calculate distance to each intersection and sort
  const intersections: IntersectionResult[] = [];
  
  for (const f of result.features) {
    const attrs = f.attributes;
    const geom = f.geometry;
    
    if (!geom || !attrs.NODE_DESCR) continue;
    
    const intLat = geom.y;
    const intLon = geom.x;
    
    // Calculate distance using Haversine formula
    const distanceM = haversineDistance(lat, lon, intLat, intLon) * 1000;
    
    intersections.push({
      nodeName: attrs.NODE_DESCR,
      lat: intLat,
      lon: intLon,
      nodeType: attrs.NODE_TYPE || 'Unknown',
      distanceM: Math.round(distanceM)
    });
  }
  
  // Sort by distance
  intersections.sort((a, b) => a.distanceM - b.distanceM);
  
  return intersections;
}

/**
 * Haversine distance calculation (returns km)
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if two line segments intersect
 * Uses parametric line intersection test
 */
function segmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-10) return false; // Parallel lines
  
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

/**
 * Check if a cross road's geometry actually intersects (crosses) the reference road
 * This filters out parallel roads that share nodes but don't actually cross
 * 
 * @param refFeatures - Reference road features with geometry (from ArcGIS)
 * @param crossRoadId - Cross road ID to check
 * @param intersectionLat - Latitude of the proposed intersection point
 * @param intersectionLon - Longitude of the proposed intersection point
 * @param tolerance - Maximum distance (in degrees) from intersection point to consider
 * @returns true if the roads actually cross, false if parallel or no intersection
 */
async function verifyRoadsActuallyCross(
  refFeatures: any[],
  crossRoadId: string,
  intersectionLat: number,
  intersectionLon: number,
  tolerance: number = 0.002 // ~200m in degrees
): Promise<boolean> {
  // For local roads (non H/M prefix), we can't easily verify via API
  // They are typically found via Layer 6 which already has verified intersections
  if (!crossRoadId.startsWith('H') && !crossRoadId.startsWith('M')) {
    return true; // Assume valid for local roads
  }
  
  // Query cross road geometry near the intersection
  const latBuffer = tolerance;
  const lonBuffer = tolerance;
  
  const query = {
    where: `ROAD = '${crossRoadId}'`,
    geometry: `${intersectionLon - lonBuffer},${intersectionLat - latBuffer},${intersectionLon + lonBuffer},${intersectionLat + latBuffer}`,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "ROAD,ROAD_NAME",
    returnGeometry: "true",
    f: "json",
    resultRecordCount: "10"
  };
  
  try {
    const result = await fetchArcGIS(STATE_ROAD_URL, query);
    
    if (!result.features || result.features.length === 0) {
      return true; // Can't verify, assume valid
    }
    
    return checkGeometryCrosses(refFeatures, result.features, intersectionLat, intersectionLon, tolerance);
  } catch (e) {
    console.error('Error verifying road crossing:', e);
    return true; // On error, assume valid to not break functionality
  }
}

/**
 * Check if any cross road feature geometry crosses the reference road path
 */
function checkGeometryCrosses(
  refFeatures: any[],
  crossFeatures: any[],
  intersectionLat: number,
  intersectionLon: number,
  tolerance: number
): boolean {
  for (const refFeature of refFeatures) {
    const refGeom = refFeature.geometry;
    if (!refGeom?.paths) continue;
    
    for (const refPath of refGeom.paths) {
      if (refPath.length < 2) continue;
      
      for (const crossFeature of crossFeatures) {
        const crossGeom = crossFeature.geometry;
        if (!crossGeom?.paths) continue;
        
        for (const crossPath of crossGeom.paths) {
          if (crossPath.length < 2) continue;
          
          // Check each segment of cross road against each segment of reference road
          for (let i = 1; i < crossPath.length; i++) {
            const [cx1, cy1] = crossPath[i - 1];
            const [cx2, cy2] = crossPath[i];
            
            for (let j = 1; j < refPath.length; j++) {
              const [rx1, ry1] = refPath[j - 1];
              const [rx2, ry2] = refPath[j];
              
              // Check if segments intersect
              if (segmentsIntersect(rx1, ry1, rx2, ry2, cx1, cy1, cx2, cy2)) {
                // Calculate intersection point
                const denom = (cy2 - cy1) * (rx2 - rx1) - (cx2 - cx1) * (ry2 - ry1);
                if (Math.abs(denom) < 1e-10) continue;
                
                const ua = ((cx2 - cx1) * (ry1 - cy1) - (cy2 - cy1) * (rx1 - cx1)) / denom;
                const intLon = rx1 + ua * (rx2 - rx1);
                const intLat = ry1 + ua * (ry2 - ry1);
                
                // Check if intersection point is within tolerance of proposed point
                const dist = Math.sqrt(
                  Math.pow(intLat - intersectionLat, 2) + 
                  Math.pow(intLon - intersectionLon, 2)
                );
                
                if (dist <= tolerance * 2) { // Allow 2x tolerance for intersection verification
                  return true; // Verified: roads actually cross
                }
              }
            }
          }
        }
      }
    }
  }
  
  return false; // No crossing found
}
