// Traffic Counter Storage
// Storage and data management for traffic count records

// ============================================
// TYPES & INTERFACES
// ============================================

export type CountDirection = 'one-way' | 'both-ways';

export interface TrafficCountRecord {
  id: string;
  // Location data
  road_id: string;
  road_name: string;
  slk: number | null;
  lat: number | null;
  lon: number | null;
  region: string;
  // Count configuration
  duration_minutes: number;
  direction_mode: CountDirection; // 'one-way' or 'both-ways'
  // Counts - True Left
  true_left_light: number;
  true_left_heavy: number;
  // Counts - True Right
  true_right_light: number;
  true_right_heavy: number;
  // Calculated values
  total_light: number;
  total_heavy: number;
  total_vehicles: number;
  heavy_percentage: number;
  vph_true_left: number;
  vph_true_right: number;
  vph_combined: number;
  vph_one_direction: number; // For lane capacity reference
  queue_length?: number; // Estimated queue length in meters (optional for backward compatibility)
  // Metadata
  date: string; // ISO date
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  notes: string;
  created_at: string; // ISO timestamp
}

// ============================================
// STORAGE KEY
// ============================================

const STORAGE_KEY = 'trafficCounterHistory';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format date in Australian format (DD/MM/YYYY)
 */
export function formatAusDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format time (HH:MM)
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format date for ISO storage
 */
export function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate Vehicles Per Hour
 */
export function calculateVPH(count: number, durationMinutes: number): number {
  if (durationMinutes <= 0) return 0;
  return Math.round((count / durationMinutes) * 60);
}

/**
 * Calculate heavy vehicle percentage
 */
export function calculateHeavyPercentage(light: number, heavy: number): number {
  const total = light + heavy;
  if (total === 0) return 0;
  return Math.round((heavy / total) * 100);
}

/**
 * Get multiplier for VPH calculation based on duration
 */
export function getVphMultiplier(durationMinutes: number): number {
  return 60 / durationMinutes;
}

// ============================================
// REFERENCE TABLES (from AGTTM/MRWA COP)
// ============================================

/**
 * Lane Capacity Reference (AGTTM Part 2, Table 3.1)
 */
export const LANE_CAPACITY_TABLE = [
  { midBlockVph: '≤1000', nearIntersectionVph: '≤500', lanes: 1 },
  { midBlockVph: '1001-2000', nearIntersectionVph: '501-1000', lanes: 2 },
  { midBlockVph: '2001-3000', nearIntersectionVph: '1001-1500', lanes: 3 },
  { midBlockVph: '3001-4000', nearIntersectionVph: '1501-2000', lanes: 4 },
];

/**
 * Shuttle Flow Length Reference (AGTTM Part 2, Table 3.5 & MRWA COP Table 15)
 * Based on BOTH directions VPH
 */
export const SHUTTLE_FLOW_TABLE = [
  { vph: 'Residential street', maxLength: '60m', vphMax: 0 },
  { vph: '701-800', maxLength: '70m', vphMax: 800 },
  { vph: '601-700', maxLength: '100m', vphMax: 700 },
  { vph: '501-600', maxLength: '150m', vphMax: 600 },
  { vph: '401-500', maxLength: '250m', vphMax: 500 },
  { vph: '351-400', maxLength: '400m', vphMax: 400 },
  { vph: '301-350', maxLength: '600m', vphMax: 350 },
  { vph: '≤300', maxLength: '800m', vphMax: 300 }, // AGTTM Table 3.5
  { vph: '201-250', maxLength: '1200m', vphMax: 250 }, // MRWA COP Table 15: exceeds AGTTM
  { vph: '151-200', maxLength: '1600m', vphMax: 200 }, // MRWA COP Table 15: exceeds AGTTM
  { vph: '≤150', maxLength: '2200m', vphMax: 150 }, // MRWA COP Table 15: exceeds AGTTM
];

/**
 * Reduction Factors (MRWA COP)
 */
export const REDUCTION_FACTORS = [
  { condition: 'Rough or unsealed pavement', reduction: '30%' },
  { condition: 'Geometry reduced to <40 km/h speed', reduction: '50%' },
  { condition: 'Heavy vehicles >10% on down/level/easy grade', reduction: '20%' },
  { condition: 'Heavy vehicles >10% on sustained upgrade >5%', reduction: '40%' },
];

/**
 * Queue Length Multipliers (AGTTM Part 3, Table 4.3)
 */
export const QUEUE_MULTIPLIERS = [
  { stoppingTime: '2 min', averageMultiplier: 2.4, heavyMultiplier: 8 },
  { stoppingTime: '5 min', averageMultiplier: 6, heavyMultiplier: 20 },
  { stoppingTime: '10 min', averageMultiplier: 12, heavyMultiplier: '-' },
];

// ============================================
// STORAGE FUNCTIONS
// ============================================

/**
 * Get all traffic count records from localStorage
 */
export function getTrafficCountHistory(): TrafficCountRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('Failed to load traffic count history');
    return [];
  }
}

/**
 * Save all traffic count records to localStorage
 */
export function saveTrafficCountHistory(records: TrafficCountRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    console.error('Failed to save traffic count history');
  }
}

/**
 * Get a single record by ID
 */
export function getTrafficCountRecord(id: string): TrafficCountRecord | null {
  const records = getTrafficCountHistory();
  return records.find((r) => r.id === id) || null;
}

/**
 * Create a new traffic count record
 */
export function createTrafficCountRecord(
  data: Omit<TrafficCountRecord, 'id' | 'created_at'>
): TrafficCountRecord {
  const newRecord: TrafficCountRecord = {
    ...data,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  const records = getTrafficCountHistory();
  records.unshift(newRecord); // Add to beginning (most recent first)
  saveTrafficCountHistory(records);

  return newRecord;
}

/**
 * Update an existing traffic count record
 */
export function updateTrafficCountRecord(
  id: string,
  updates: Partial<TrafficCountRecord>
): TrafficCountRecord | null {
  const records = getTrafficCountHistory();
  const index = records.findIndex((r) => r.id === id);

  if (index === -1) return null;

  records[index] = { ...records[index], ...updates };
  saveTrafficCountHistory(records);

  return records[index];
}

/**
 * Delete a traffic count record
 */
export function deleteTrafficCountRecord(id: string): boolean {
  const records = getTrafficCountHistory();
  const filtered = records.filter((r) => r.id !== id);

  if (filtered.length === records.length) return false;

  saveTrafficCountHistory(filtered);
  return true;
}

/**
 * Clear all traffic count history
 */
export function clearTrafficCountHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get records for a specific road
 */
export function getRecordsForRoad(roadId: string): TrafficCountRecord[] {
  const records = getTrafficCountHistory();
  return records.filter((r) => r.road_id.toUpperCase() === roadId.toUpperCase());
}

/**
 * Get recent records (last N days)
 */
export function getRecentRecords(days: number = 30): TrafficCountRecord[] {
  const records = getTrafficCountHistory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return records.filter((r) => new Date(r.created_at) >= cutoff);
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Generate shareable text summary
 */
export function generateShareText(record: TrafficCountRecord): string {
  const lines: string[] = [];
  lines.push(`📊 Traffic Count Report`);
  lines.push(`─────────────────────────`);
  lines.push(`Road: ${record.road_id} - ${record.road_name}`);
  lines.push(`SLK: ${record.slk?.toFixed(2) || 'N/A'}`);
  lines.push(`Date: ${formatAusDate(record.date)}`);
  lines.push(`Time: ${record.start_time} - ${record.end_time}`);
  lines.push(`Duration: ${record.duration_minutes} minutes`);
  lines.push(
    `Direction: ${record.direction_mode === 'one-way' ? 'One direction' : 'Both directions'}`
  );
  lines.push(``);

  if (record.direction_mode === 'both-ways') {
    lines.push(`TRUE LEFT (Increasing SLK):`);
    lines.push(`  Light: ${record.true_left_light} | Heavy: ${record.true_left_heavy}`);
    lines.push(`  VPH: ${record.vph_true_left}`);
    lines.push(``);
    lines.push(`TRUE RIGHT (Decreasing SLK):`);
    lines.push(`  Light: ${record.true_right_light} | Heavy: ${record.true_right_heavy}`);
    lines.push(`  VPH: ${record.vph_true_right}`);
    lines.push(``);
  } else {
    lines.push(`TRAFFIC COUNT:`);
    lines.push(`  Light: ${record.total_light} | Heavy: ${record.total_heavy}`);
    lines.push(``);
  }

  lines.push(`SUMMARY:`);
  lines.push(`  Total Vehicles: ${record.total_vehicles}`);
  lines.push(`  Heavy Vehicles: ${record.heavy_percentage}%`);
  lines.push(`  Combined VPH: ${record.vph_combined}`);

  if (record.queue_length) {
    lines.push(`  Estimated Queue: ${record.queue_length}m`);
  }

  if (record.notes) {
    lines.push(``);
    lines.push(`Notes: ${record.notes}`);
  }

  return lines.join('\n');
}

/**
 * Export all records as JSON string (for backup)
 */
export function exportAllRecords(): string {
  return JSON.stringify(getTrafficCountHistory(), null, 2);
}

/**
 * Import records from JSON string
 */
export function importRecords(
  json: string,
  replace: boolean = false
): { success: boolean; count: number; error?: string } {
  try {
    const imported = JSON.parse(json) as TrafficCountRecord[];

    if (!Array.isArray(imported)) {
      return { success: false, count: 0, error: 'Invalid format' };
    }

    // Validate structure
    for (const record of imported) {
      if (!record.id || record.road_id === undefined) {
        return { success: false, count: 0, error: 'Invalid record structure' };
      }
    }

    if (replace) {
      saveTrafficCountHistory(imported);
    } else {
      const existing = getTrafficCountHistory();
      // Merge, avoiding duplicates by ID
      const merged = [...existing];
      for (const record of imported) {
        if (!merged.find((r) => r.id === record.id)) {
          merged.push(record);
        }
      }
      saveTrafficCountHistory(merged);
    }

    return { success: true, count: imported.length };
  } catch {
    return { success: false, count: 0, error: 'Failed to parse JSON' };
  }
}

// ============================================
// STATISTICS
// ============================================

export interface TrafficCountStats {
  totalRecords: number;
  totalVehiclesCounted: number;
  averageHeavyPercent: number;
  mostCountedRoad: { road_id: string; road_name: string; count: number } | null;
}

/**
 * Get statistics about traffic counts
 */
export function getTrafficCountStats(): TrafficCountStats {
  const records = getTrafficCountHistory();

  if (records.length === 0) {
    return {
      totalRecords: 0,
      totalVehiclesCounted: 0,
      averageHeavyPercent: 0,
      mostCountedRoad: null,
    };
  }

  // Count vehicles
  const totalVehicles = records.reduce((sum, r) => sum + r.total_vehicles, 0);

  // Average heavy percent
  const avgHeavy = records.reduce((sum, r) => sum + r.heavy_percentage, 0) / records.length;

  // Most counted road
  const roadCounts = new Map<string, { road_name: string; count: number }>();
  for (const record of records) {
    const existing = roadCounts.get(record.road_id);
    if (existing) {
      existing.count++;
    } else {
      roadCounts.set(record.road_id, { road_name: record.road_name, count: 1 });
    }
  }

  let mostCountedRoad: { road_id: string; road_name: string; count: number } | null = null;
  for (const [road_id, data] of roadCounts) {
    if (!mostCountedRoad || data.count > mostCountedRoad.count) {
      mostCountedRoad = { road_id, road_name: data.road_name, count: data.count };
    }
  }

  return {
    totalRecords: records.length,
    totalVehiclesCounted: totalVehicles,
    averageHeavyPercent: Math.round(avgHeavy),
    mostCountedRoad,
  };
}
