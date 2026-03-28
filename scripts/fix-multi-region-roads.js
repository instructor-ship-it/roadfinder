#!/usr/bin/env node
/**
 * Fix multi-region roads - roads that span multiple regions need to appear in each region's file
 * This reads all region files and for each road, ensures it appears in every region file
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// Read all region files
const regionFiles = fs.readdirSync(DATA_DIR)
  .filter(f => f.startsWith('roads-') && f.endsWith('.json'));

console.log(`Found ${regionFiles.length} region files`);

// Collect all roads from all regions
const allRoads = new Map(); // road_id -> road data
const roadRegions = new Map(); // road_id -> Set of regions

for (const file of regionFiles) {
  const filePath = path.join(DATA_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const region = data.region;
  
  for (const road of data.roads) {
    // Store road data
    if (!allRoads.has(road.road_id)) {
      allRoads.set(road.road_id, road);
    }
    
    // Track which regions this road appears in
    if (!roadRegions.has(road.road_id)) {
      roadRegions.set(road.road_id, new Set());
    }
    roadRegions.get(road.road_id).add(region);
  }
}

console.log(`Total unique roads: ${allRoads.size}`);

// Now rebuild each region file with complete road data
const regions = {};
for (const file of regionFiles) {
  const filePath = path.join(DATA_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const region = data.region;
  regions[region] = data.roads;
}

// For each road, check if it should be in more regions based on MRWA
// We need to query MRWA API for roads that span regions
// For now, let's use the segment geometry to infer regions

// Actually, the simpler fix is: roads already have their region in the data
// The problem is the download script only stores the FIRST region
// We need to re-download with the fixed script

console.log('\nThe data files need to be regenerated with the fixed download script.');
console.log('Run: node scripts/download-roads.js');
console.log('\nThis will take ~5-10 minutes to download all data from MRWA.');

// Show which H-roads and M-roads are in each region
console.log('\nCurrent state roads by region:');
for (const [region, roads] of Object.entries(regions)) {
  const hRoads = roads.filter(r => r.road_id.startsWith('H'));
  const mRoads = roads.filter(r => r.road_id.startsWith('M'));
  if (hRoads.length > 0 || mRoads.length > 0) {
    console.log(`  ${region}: ${hRoads.length} H-roads, ${mRoads.length} M-roads`);
    if (hRoads.length <= 5) console.log(`    H: ${hRoads.map(r => r.road_id).join(', ')}`);
    if (mRoads.length <= 20) console.log(`    M: ${mRoads.map(r => r.road_id).join(', ')}`);
  }
}
