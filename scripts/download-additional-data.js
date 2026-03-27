#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Download additional MRWA data:
 * - Pavement Data (Layer 12) - lanes, widths, shoulders
 * - Traffic Volume (Layer 27) - AADT, peak hour, heavy vehicles
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PAVEMENT_URL = "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/12/query";
const TRAFFIC_URL = "https://gisservices.mainroads.wa.gov.au/arcgis/rest/services/OpenData/RoadAssets_DataPortal/MapServer/27/query";

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchAllPavementData(batchSize = 1000) {
  const allFeatures = [];
  let offset = 0;
  let hasMore = true;
  
  console.log('Fetching all pavement data from Layer 12...');
  
  while (hasMore) {
    const url = `${PAVEMENT_URL}?where=1%3D1&outFields=ROAD,ROAD_NAME,START_SLK,END_SLK,NO_OF_LANES,TRAFFICABLE_SURF_WIDTH,CWY,TOTAL_PAVE_WIDTH,TOTAL_SEAL_WIDTH,SEALED_SHOULDER_L,SEALED_SHOULDER_R,UNSEALED_SHOULDER_L,UNSEALED_SHOULDER_R,KERB_L,KERB_R&returnGeometry=false&resultOffset=${offset}&resultRecordCount=${batchSize}&f=json`;
    
    console.log(`  Batch ${Math.floor(offset/batchSize) + 1}: offset ${offset}...`);
    const data = await fetchJson(url);
    
    if (data.error) {
      console.error(`  Error: ${JSON.stringify(data.error)}`);
      break;
    }
    
    if (!data.features || data.features.length === 0) {
      console.log('  No more features');
      break;
    }
    
    allFeatures.push(...data.features);
    console.log(`  Got ${data.features.length} features, total: ${allFeatures.length}`);
    
    hasMore = data.exceededTransferLimit === true;
    offset += batchSize;
  }
  
  return allFeatures;
}

async function fetchAllTrafficData(batchSize = 1000) {
  const allFeatures = [];
  let offset = 0;
  let hasMore = true;
  
  console.log('Fetching all traffic volume data from Layer 27...');
  
  while (hasMore) {
    // Use simpler query with only essential fields
    const url = `${TRAFFIC_URL}?where=1%3D1&outFields=*&returnGeometry=false&resultOffset=${offset}&resultRecordCount=${batchSize}&f=json`;
    
    console.log(`  Batch ${Math.floor(offset/batchSize) + 1}: offset ${offset}...`);
    const data = await fetchJson(url);
    
    if (data.error) {
      console.error(`  Error: ${JSON.stringify(data.error)}`);
      // Try with different approach - get all records without offset
      if (offset === 0) {
        console.log('  Trying alternative query without pagination...');
        const altUrl = `${TRAFFIC_URL}?where=1%3D1&outFields=ROAD,ROAD_NAME,SITE_NO,LOCATION_DESC,TRAFFIC_YEAR,COLLECTION_TYPE,MON_SUN,MON_FRI,PCT_HEAVY_MON_SUN&returnGeometry=false&f=json`;
        const altData = await fetchJson(altUrl);
        if (altData.features && altData.features.length > 0) {
          return altData.features;
        }
      }
      break;
    }
    
    if (!data.features || data.features.length === 0) {
      console.log('  No more features');
      break;
    }
    
    allFeatures.push(...data.features);
    console.log(`  Got ${data.features.length} features, total: ${allFeatures.length}`);
    
    hasMore = data.exceededTransferLimit === true;
    offset += batchSize;
  }
  
  return allFeatures;
}

function processPavementData(features) {
  // Group by road_id
  const pavementByRoad = {};
  
  for (const f of features) {
    const roadId = f.attributes.ROAD;
    if (!roadId) continue;
    
    if (!pavementByRoad[roadId]) {
      pavementByRoad[roadId] = {
        road_id: roadId,
        road_name: f.attributes.ROAD_NAME || '',
        segments: []
      };
    }
    
    pavementByRoad[roadId].segments.push({
      start_slk: f.attributes.START_SLK || 0,
      end_slk: f.attributes.END_SLK || 0,
      lanes: f.attributes.NO_OF_LANES || null,
      trafficable_width: f.attributes.TRAFFICABLE_SURF_WIDTH || null,
      cwy: f.attributes.CWY || 'Single',
      total_pave_width: f.attributes.TOTAL_PAVE_WIDTH || null,
      total_seal_width: f.attributes.TOTAL_SEAL_WIDTH || null,
      sealed_shoulder_l: f.attributes.SEALED_SHOULDER_L || null,
      sealed_shoulder_r: f.attributes.SEALED_SHOULDER_R || null,
      unsealed_shoulder_l: f.attributes.UNSEALED_SHOULDER_L || null,
      unsealed_shoulder_r: f.attributes.UNSEALED_SHOULDER_R || null,
      kerb_l: f.attributes.KERB_L || null,
      kerb_r: f.attributes.KERB_R || null
    });
  }
  
  // Sort segments by start_slk
  for (const road of Object.values(pavementByRoad)) {
    road.segments.sort((a, b) => a.start_slk - b.start_slk);
  }
  
  return Object.values(pavementByRoad);
}

function processTrafficData(features) {
  // Group by road_name (Layer 27 doesn't have ROAD field, only ROAD_NAME)
  const trafficByRoad = {};
  
  for (const f of features) {
    const roadName = f.attributes.ROAD_NAME;
    if (!roadName) continue;
    
    // Create a key from road name (lowercase, stripped)
    const key = roadName.toLowerCase().trim();
    
    if (!trafficByRoad[key]) {
      trafficByRoad[key] = {
        road_name: roadName,
        sites: []
      };
    }
    
    trafficByRoad[key].sites.push({
      site_no: f.attributes.SITE_NO,
      location_desc: f.attributes.LOCATION_DESC || '',
      traffic_year: f.attributes.TRAFFIC_YEAR || null,
      collection_type: f.attributes.COLLECTION_TYPE || '',
      aadt: f.attributes.MON_SUN || null, // Average Annual Daily Traffic
      aadt_weekday: f.attributes.MON_FRI || null,
      aadt_weekend: f.attributes.SAT_SUN || null,
      heavy_vehicle_pct: f.attributes.PCT_HEAVY_MON_SUN || null,
      heavy_vehicle_weekday_pct: f.attributes.PCT_HEAVY_MON_FRI || null,
      heavy_vehicle_weekend_pct: f.attributes.PCT_HEAVY_SAT_SUN || null,
      region: f.attributes.RA_NAME || null,
      local_government: f.attributes.LG_NAME || null
    });
  }
  
  // Sort sites by site_no
  for (const road of Object.values(trafficByRoad)) {
    road.sites.sort((a, b) => (a.site_no || '').localeCompare(b.site_no || ''));
  }
  
  return Object.values(trafficByRoad);
}

async function main() {
  console.log('=== Downloading Additional MRWA Data ===\n');
  
  // Download pavement data
  console.log('--- Pavement Data (Layer 12) ---');
  const pavementFeatures = await fetchAllPavementData();
  console.log(`\nTotal pavement features: ${pavementFeatures.length}`);
  
  const pavementData = processPavementData(pavementFeatures);
  console.log(`Processed into ${pavementData.length} roads with pavement data`);
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'pavement-data.json'),
    JSON.stringify({ pavement: pavementData }, null, 2)
  );
  console.log('Saved pavement-data.json');
  
  // Download traffic data
  console.log('\n--- Traffic Volume Data (Layer 27) ---');
  const trafficFeatures = await fetchAllTrafficData();
  console.log(`\nTotal traffic features: ${trafficFeatures.length}`);
  
  const trafficData = processTrafficData(trafficFeatures);
  console.log(`Processed into ${trafficData.length} roads with traffic data`);
  
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'traffic-data.json'),
    JSON.stringify({ traffic: trafficData }, null, 2)
  );
  console.log('Saved traffic-data.json');
  
  // Summary
  console.log('\n=== Download Complete ===');
  console.log(`Pavement segments: ${pavementFeatures.length}`);
  console.log(`Traffic sites: ${trafficFeatures.length}`);
  console.log(`Roads with pavement data: ${pavementData.length}`);
  console.log(`Roads with traffic data: ${trafficData.length}`);
}

main().catch(console.error);
