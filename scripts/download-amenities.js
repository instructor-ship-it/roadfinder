#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Download amenities data from OpenStreetMap (Overpass API)
 * - Hospitals
 * - Fuel stations  
 * - Public toilets
 * 
 * Data is stored per-region for efficient offline queries
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');

// Western Australia bounding box (approximate)
const WA_BOUNDS = {
  north: -13.5,
  south: -35.5,
  west: 112.5,
  east: 129.0
};

// Region bounding boxes for more targeted queries
const REGIONS = {
  'Metropolitan': { north: -31.5, south: -32.5, west: 115.5, east: 116.5 },
  'Wheatbelt': { north: -30.5, south: -33.0, west: 116.0, east: 118.5 },
  'South West': { north: -33.0, south: -35.0, west: 115.0, east: 117.0 },
  'Goldfields-Esperance': { north: -28.0, south: -35.0, west: 117.0, east: 124.0 },
  'Great Southern': { north: -33.5, south: -35.5, west: 116.5, east: 119.0 },
  'Kimberley': { north: -13.5, south: -18.0, west: 123.0, east: 129.0 },
  'Mid West-Gascoyne': { north: -22.0, south: -28.0, west: 113.0, east: 120.0 },
  'Pilbara': { north: -18.0, south: -22.0, west: 117.0, east: 124.0 }
};

const OVERPASS_SERVERS = [
  'overpass-api.de',
  'overpass.kumi.systems'
];

function fetchOverpass(query, server = OVERPASS_SERVERS[0]) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: server,
      path: `/api/interpreter?data=${encodeURIComponent(query)}`,
      method: 'GET',
      headers: { 'User-Agent': 'TC-Work-Zone-Locator/1.0' }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function fetchAmenitiesForBbox(bbox, amenityTypes) {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  
  const queries = amenityTypes.map(type => {
    if (type === 'hospital') {
      return `
        node["amenity"="hospital"](${bboxStr});
        way["amenity"="hospital"](${bboxStr});
        node["healthcare"="hospital"](${bboxStr});
      `;
    } else if (type === 'fuel') {
      return `
        node["amenity"="fuel"](${bboxStr});
        way["amenity"="fuel"](${bboxStr});
      `;
    } else if (type === 'toilets') {
      return `
        node["amenity"="toilets"](${bboxStr});
        way["amenity"="toilets"](${bboxStr});
      `;
    }
    return '';
  }).join('\n');

  const query = `[out:json][timeout:60];(${queries});out center;`;
  
  for (const server of OVERPASS_SERVERS) {
    try {
      console.log(`    Trying ${server}...`);
      const data = await fetchOverpass(query, server);
      return data.elements || [];
    } catch (e) {
      console.log(`    ${server} failed: ${e.message}`);
      continue;
    }
  }
  
  return [];
}

function processAmenity(element, type) {
  const tags = element.tags || {};
  const center = element.center || { lat: element.lat, lon: element.lon };
  
  return {
    id: element.id,
    type: type,
    name: tags.name || tags.operator || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
    lat: center.lat,
    lon: center.lon,
    phone: tags.phone || tags['contact:phone'] || null,
    address: tags['addr:street'] 
      ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}, ${tags['addr:city'] || ''}`.trim()
      : null,
    opening_hours: tags.opening_hours || null,
    wheelchair: tags.wheelchair || null,
    emergency: tags.emergency === 'yes' || tags['healthcare:hospital'] === 'emergency',
    operator: tags.operator || null
  };
}

async function main() {
  console.log('=== Downloading Amenities Data from OpenStreetMap ===\n');
  
  const amenityTypes = ['hospital', 'fuel', 'toilets'];
  const allAmenities = {
    hospitals: [],
    fuelStations: [],
    toilets: []
  };
  
  // Fetch for each region
  for (const [regionName, bbox] of Object.entries(REGIONS)) {
    console.log(`\n--- ${regionName} ---`);
    console.log(`  BBox: ${bbox.south},${bbox.west} to ${bbox.north},${bbox.east}`);
    
    try {
      const elements = await fetchAmenitiesForBbox(bbox, amenityTypes);
      console.log(`  Found ${elements.length} amenities`);
      
      for (const el of elements) {
        const tags = el.tags || {};
        
        if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') {
          allAmenities.hospitals.push({
            ...processAmenity(el, 'hospital'),
            region: regionName
          });
        } else if (tags.amenity === 'fuel') {
          allAmenities.fuelStations.push({
            ...processAmenity(el, 'fuel'),
            region: regionName
          });
        } else if (tags.amenity === 'toilets') {
          allAmenities.toilets.push({
            ...processAmenity(el, 'toilets'),
            region: regionName
          });
        }
      }
      
      // Be nice to the Overpass API
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (e) {
      console.log(`  Error fetching ${regionName}: ${e.message}`);
    }
  }
  
  // Deduplicate (same amenity may appear in multiple regions)
  const dedupe = (arr) => {
    const seen = new Set();
    return arr.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };
  
  allAmenities.hospitals = dedupe(allAmenities.hospitals);
  allAmenities.fuelStations = dedupe(allAmenities.fuelStations);
  allAmenities.toilets = dedupe(allAmenities.toilets);
  
  // Save combined file
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'amenities.json'),
    JSON.stringify({
      download_date: new Date().toISOString(),
      source: 'OpenStreetMap via Overpass API',
      hospitals_count: allAmenities.hospitals.length,
      fuel_stations_count: allAmenities.fuelStations.length,
      toilets_count: allAmenities.toilets.length,
      ...allAmenities
    }, null, 2)
  );
  
  console.log('\n=== Download Complete ===');
  console.log(`Hospitals: ${allAmenities.hospitals.length}`);
  console.log(`Fuel Stations: ${allAmenities.fuelStations.length}`);
  console.log(`Toilets: ${allAmenities.toilets.length}`);
  console.log('\nSaved to public/data/amenities.json');
}

main().catch(console.error);
