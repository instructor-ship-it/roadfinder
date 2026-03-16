// Route Optimizer for AfterCare Signs
// Uses TSP (Travelling Salesman Problem) with Nearest Neighbor algorithm
// Supports both online (OSRM) and offline (Haversine) distance calculation

import { AfterCareSign, AfterCareJob, calculateSignStatus } from './aftercare';

// ============================================
// TYPES
// ============================================

export interface OptimizedRoute {
  signs: (AfterCareSign & { job: AfterCareJob })[];
  totalDistance: number;
  estimatedDuration: number;
  googleMapsUrl: string;
  optimizationMode: 'online' | 'offline';
}

export interface RouteSign extends AfterCareSign {
  job: AfterCareJob;
}

// ============================================
// HAVERSINE DISTANCE (OFFLINE)
// ============================================

/**
 * Calculate straight-line distance between two GPS coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ============================================
// OSRM DISTANCE (ONLINE)
// ============================================

/**
 * Get road distance between two points using OSRM (OpenStreetMap Routing Machine)
 * Free, no API key required
 */
export async function getOSRMDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<{ distance: number; duration: number } | null> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      return {
        distance: data.routes[0].distance / 1000, // Convert m to km
        duration: data.routes[0].duration / 60    // Convert s to min
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get distance matrix for multiple points using OSRM Table API
 * More efficient than individual calls
 */
export async function getOSRMDistanceMatrix(
  points: { lat: number; lon: number }[]
): Promise<{ distances: number[][]; durations: number[][] } | null> {
  if (points.length < 2) return null;
  
  try {
    const coords = points.map(p => `${p.lon},${p.lat}`).join(';');
    const response = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.code === 'Ok' && data.distances && data.durations) {
      return {
        distances: data.distances.map((row: number[]) => row.map(d => d / 1000)), // km
        durations: data.durations.map((row: number[]) => row.map(d => d / 60))    // min
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// TSP SOLVER - NEAREST NEIGHBOR
// ============================================

/**
 * Solve TSP using Nearest Neighbor algorithm
 * Fast but approximate - good enough for route planning
 */
export function solveTSPNearestNeighbor(
  distances: number[][],
  startIndex: number = 0
): number[] {
  const n = distances.length;
  if (n <= 1) return [0];
  
  const visited = new Set<number>();
  const route: number[] = [startIndex];
  visited.add(startIndex);
  
  let current = startIndex;
  
  while (visited.size < n) {
    let nearestDist = Infinity;
    let nearestIdx = -1;
    
    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && distances[current][i] < nearestDist) {
        nearestDist = distances[current][i];
        nearestIdx = i;
      }
    }
    
    if (nearestIdx >= 0) {
      route.push(nearestIdx);
      visited.add(nearestIdx);
      current = nearestIdx;
    }
  }
  
  return route;
}

// ============================================
// ROUTE OPTIMIZER
// ============================================

/**
 * Check if we have internet connectivity
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    // Try to reach OSRM server
    const response = await fetch('https://router.project-osrm.org/', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Calculate distance matrix using Haversine (offline)
 */
function calculateHaversineMatrix(
  points: { lat: number; lon: number }[]
): number[][] {
  const n = points.length;
  const distances: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    distances[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
      } else {
        distances[i][j] = haversineDistance(
          points[i].lat, points[i].lon,
          points[j].lat, points[j].lon
        );
      }
    }
  }
  
  return distances;
}

/**
 * Optimize route for signs
 * Automatically uses OSRM (online) if available, falls back to Haversine (offline)
 */
export async function optimizeRoute(
  signs: RouteSign[]
): Promise<OptimizedRoute | null> {
  // Filter signs that have GPS coordinates
  const validSigns = signs.filter(s => s.lat !== null && s.lon !== null);
  
  if (validSigns.length === 0) return null;
  
  if (validSigns.length === 1) {
    // Single sign - no optimization needed
    const sign = validSigns[0];
    return {
      signs: [sign],
      totalDistance: 0,
      estimatedDuration: 0,
      googleMapsUrl: `https://www.google.com/maps/dir//${sign.lat},${sign.lon}`,
      optimizationMode: 'offline'
    };
  }
  
  // Check connectivity and try OSRM
  const isOnline = await checkConnectivity();
  let distances: number[][];
  let durations: number[][] = [];
  let mode: 'online' | 'offline' = 'offline';
  
  if (isOnline) {
    const points = validSigns.map(s => ({ lat: s.lat!, lon: s.lon! }));
    const osrmResult = await getOSRMDistanceMatrix(points);
    
    if (osrmResult) {
      distances = osrmResult.distances;
      durations = osrmResult.durations;
      mode = 'online';
    } else {
      distances = calculateHaversineMatrix(points);
    }
  } else {
    const points = validSigns.map(s => ({ lat: s.lat!, lon: s.lon! }));
    distances = calculateHaversineMatrix(points);
  }
  
  // Solve TSP - index 0 is "current location" concept, but we use double-slash URL
  // So we just optimize the order of signs
  const orderedIndices = solveTSPNearestNeighbor(distances);
  const orderedSigns = orderedIndices.map(i => validSigns[i]);
  
  // Calculate total distance and duration
  let totalDistance = 0;
  let totalDuration = 0;
  
  for (let i = 0; i < orderedIndices.length - 1; i++) {
    totalDistance += distances[orderedIndices[i]][orderedIndices[i + 1]];
    if (durations.length > 0) {
      totalDuration += durations[orderedIndices[i]][orderedIndices[i + 1]];
    } else {
      // Estimate: 50 km/h average speed
      totalDuration += (distances[orderedIndices[i]][orderedIndices[i + 1]] / 50) * 60;
    }
  }
  
  // Generate Google Maps URL with optimized order
  const coords = orderedSigns.map(s => `${s.lat},${s.lon}`).join('/');
  const googleMapsUrl = `https://www.google.com/maps/dir//${coords}`;
  
  return {
    signs: orderedSigns,
    totalDistance,
    estimatedDuration: Math.round(totalDuration),
    googleMapsUrl,
    optimizationMode: mode
  };
}

// ============================================
// HELPERS FOR AFTERCARE PAGE
// ============================================

/**
 * Get all signs due for retrieval across all jobs
 */
export function getAllSignsDueForRetrieval(jobs: AfterCareJob[]): RouteSign[] {
  const signs: RouteSign[] = [];
  
  for (const job of jobs) {
    for (const sign of job.signs) {
      const status = calculateSignStatus(sign);
      if (status === 'due-retrieval' && sign.lat && sign.lon) {
        signs.push({ ...sign, job });
      }
    }
  }
  
  return signs;
}

/**
 * Get all signs due for maintenance across all jobs
 */
export function getAllSignsDueForMaintenance(jobs: AfterCareJob[]): RouteSign[] {
  const signs: RouteSign[] = [];
  
  for (const job of jobs) {
    for (const sign of job.signs) {
      const status = calculateSignStatus(sign);
      if ((status === 'due-maintenance' || status === 'maintained') && sign.lat && sign.lon) {
        signs.push({ ...sign, job });
      }
    }
  }
  
  return signs;
}

/**
 * Count signs by status across all jobs (using calculated status)
 */
export function countSignsByStatus(jobs: AfterCareJob[]): {
  dueRetrieval: number;
  dueMaintenance: number;
  active: number;
  retrieved: number;
  total: number;
} {
  let dueRetrieval = 0;
  let dueMaintenance = 0;
  let active = 0;
  let retrieved = 0;
  
  for (const job of jobs) {
    for (const sign of job.signs) {
      const status = calculateSignStatus(sign);
      switch (status) {
        case 'due-retrieval':
          dueRetrieval++;
          break;
        case 'due-maintenance':
        case 'maintained':
          dueMaintenance++;
          break;
        case 'retrieved':
          retrieved++;
          break;
        default:
          active++;
      }
    }
  }
  
  return {
    dueRetrieval,
    dueMaintenance,
    active,
    retrieved,
    total: dueRetrieval + dueMaintenance + active + retrieved
  };
}

// ============================================
// REPORT GENERATION
// ============================================

export interface AfterCareReport {
  generatedAt: Date;
  summary: {
    totalJobs: number;
    totalSigns: number;
    dueRetrieval: number;
    dueMaintenance: number;
    active: number;
    retrieved: number;
  };
  jobsByStatus: {
    dueRetrieval: AfterCareJob[];
    dueMaintenance: AfterCareJob[];
    active: AfterCareJob[];
    retrieved: AfterCareJob[];
  };
  allSignsDueRetrieval: RouteSign[];
  allSignsDueMaintenance: RouteSign[];
}

/**
 * Generate a comprehensive report of all AfterCare data
 */
export function generateReport(jobs: AfterCareJob[]): AfterCareReport {
  const statusCounts = countSignsByStatus(jobs);
  
  const jobsByStatus = {
    dueRetrieval: jobs.filter(j => calculateJobStatusForReport(j) === 'due-retrieval'),
    dueMaintenance: jobs.filter(j => calculateJobStatusForReport(j) === 'due-maintenance'),
    active: jobs.filter(j => calculateJobStatusForReport(j) === 'active'),
    retrieved: jobs.filter(j => calculateJobStatusForReport(j) === 'retrieved')
  };
  
  return {
    generatedAt: new Date(),
    summary: {
      totalJobs: jobs.length,
      totalSigns: statusCounts.total,
      dueRetrieval: statusCounts.dueRetrieval,
      dueMaintenance: statusCounts.dueMaintenance,
      active: statusCounts.active,
      retrieved: statusCounts.retrieved
    },
    jobsByStatus,
    allSignsDueRetrieval: getAllSignsDueForRetrieval(jobs),
    allSignsDueMaintenance: getAllSignsDueForMaintenance(jobs)
  };
}

/**
 * Calculate job status for report purposes
 */
function calculateJobStatusForReport(job: AfterCareJob): string {
  if (job.status === 'archived') return 'archived';
  if (job.signs.length === 0) return 'active';
  
  let hasDueRetrieval = false;
  let hasDueMaintenance = false;
  let allRetrieved = true;
  
  for (const sign of job.signs) {
    const status = calculateSignStatus(sign);
    if (status !== 'retrieved') {
      allRetrieved = false;
      if (status === 'due-retrieval') hasDueRetrieval = true;
      if (status === 'due-maintenance' || status === 'maintained') hasDueMaintenance = true;
    }
  }
  
  if (allRetrieved) return 'retrieved';
  if (hasDueRetrieval) return 'due-retrieval';
  if (hasDueMaintenance) return 'due-maintenance';
  return 'active';
}
