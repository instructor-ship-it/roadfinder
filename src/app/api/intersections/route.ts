/**
 * API Route: /api/intersections
 * 
 * Uses Main Roads WA ArcGIS API for accurate intersection detection.
 * 
 * Parameters:
 * - road_id: Road ID (e.g., H005, M060)
 * - slk_start: Start SLK of work zone
 * - slk_end: End SLK of work zone (optional, defaults to slk_start)
 * - range: Search range in km (optional, defaults to 0.1 for TC zone ±100m)
 *          Use 0.7 for signage corridor (±700m)
 */

import { NextResponse } from 'next/server';
import { findIntersectingRoads } from '@/lib/mrwa_api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const roadId = searchParams.get('road_id');
  const slkStartStr = searchParams.get('slk_start');
  const slkEndStr = searchParams.get('slk_end');
  const rangeStr = searchParams.get('range'); // Range in km (e.g., 0.1 for ±100m, 0.7 for ±700m)
  
  if (!roadId || !slkStartStr) {
    return NextResponse.json({ 
      error: 'Parameters required: road_id, slk_start (optional: slk_end, range)',
      example: '/api/intersections?road_id=M060&slk_start=43.13',
      example2: '/api/intersections?road_id=M060&slk_start=43.13&slk_end=43.33',
      example3: '/api/intersections?road_id=H005&slk_start=170&range=0.7'
    }, { status: 400 });
  }
  
  const slkStart = parseFloat(slkStartStr);
  const slkEnd = slkEndStr ? parseFloat(slkEndStr) : undefined;
  const range = rangeStr ? parseFloat(rangeStr) : 0.1; // Default ±100m (TC zone)
  
  if (isNaN(slkStart) || (slkEnd !== undefined && isNaN(slkEnd)) || isNaN(range)) {
    return NextResponse.json({ error: 'Invalid SLK or range values' }, { status: 400 });
  }
  
  try {
    const result = await findIntersectingRoads(roadId, slkStart, slkEnd, range);
    
    if (!result) {
      return NextResponse.json({ 
        error: `No road segments found for ${roadId} at the specified SLK range`,
        road_id: roadId,
        slk_start: slkStart,
        slk_end: slkEnd
      }, { status: 404 });
    }
    
    // Format response for backward compatibility with existing frontend
    const crossRoads = result.intersectingRoads.map(road => {
      // Calculate distance from TC start (in km)
      const distanceFromTcStart = road.distanceFromTcStartKm ?? (road.intersectionSlk - result.tcZone.startSlk);
      
      return {
        name: road.roadName,
        road_id: road.roadId,
        distance: distanceFromTcStart.toFixed(2), // Just the number, formatted
        distanceFromTcStart: distanceFromTcStart,
        lat: road.lat,
        lon: road.lon,
        roadType: road.roadId.startsWith('H') ? 'Highway' : 
                  road.roadId.startsWith('M') ? 'Main Road' : 'Local Road',
        googleMapsUrl: road.lat && road.lon ? 
          `https://www.google.com/maps?q=${road.lat},${road.lon}` : '',
        intersectionNode: road.intersectionNode,
        intersectionSlk: road.intersectionSlk
      };
    });
    
    // Also add intersection nodes without connected roads (these are local roads not in MRWA database)
    for (const node of result.intersectionNodes) {
      if (!node.hasConnectedRoad && node.nodeName) {
        // Calculate distance from TC start
        const distanceFromTcStart = node.slkOnRefRoad - result.tcZone.startSlk;
        
        crossRoads.push({
          name: node.nodeName,
          road_id: 'LOCAL',
          distance: distanceFromTcStart.toFixed(2), // Just the number, formatted
          distanceFromTcStart: distanceFromTcStart,
          lat: node.lat,
          lon: node.lon,
          roadType: 'Local Road (unconfirmed)',
          googleMapsUrl: node.lat && node.lon ? 
            `https://www.google.com/maps?q=${node.lat},${node.lon}` : '',
          intersectionNode: node.nodeName,
          intersectionSlk: node.slkOnRefRoad
        });
      }
    }
    
    return NextResponse.json({
      // Reference road info
      referenceRoad: {
        road_id: result.referenceRoad.roadId,
        road_name: result.referenceRoad.roadName,
        region: result.referenceRoad.region
      },
      
      // TC Zone boundaries (where intersections are searched)
      tcZone: {
        start_slk: result.tcZone.startSlk,
        end_slk: result.tcZone.endSlk,
        start: result.tcZone.startCoord,
        end: result.tcZone.endCoord
      },
      
      // Work zone (if slk_end was provided)
      workZone: result.workZone,
      
      // Intersecting roads found within TC zone
      crossRoads: crossRoads,
      
      // Intersection nodes (including those without roads in database)
      intersectionNodes: result.intersectionNodes.map(node => ({
        nodeName: node.nodeName,
        slkOnRefRoad: node.slkOnRefRoad,
        hasConnectedRoad: node.hasConnectedRoad,
        connectedRoadId: node.connectedRoadId,
        lat: node.lat,
        lon: node.lon
      })),
      
      // Summary
      count: crossRoads.length,
      nodesWithoutRoads: result.intersectionNodes.filter(n => !n.hasConnectedRoad).length,
      
      // Metadata
      searchType: 'mrwa-tc-zone',
      tcZoneLength: Math.round((result.tcZone.endSlk - result.tcZone.startSlk) * 1000) + ' m'
    });
    
  } catch (error) {
    console.error('Intersection search error:', error);
    return NextResponse.json({ error: 'Failed to find intersections' }, { status: 500 });
  }
}
