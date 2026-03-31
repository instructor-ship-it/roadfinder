// AfterCare Signage Management System
// Storage and data management for afterCare job tracking

// ============================================
// TYPES & INTERFACES
// ============================================

export type RetrievalType =
  | 'standard'
  | 'scheduled'
  | 'maintain-daily'
  | 'maintain-weekly'
  | 'maintain-monthly'
  | 'tba';

export type SignCategory = 'surface' | 'speed' | 'hazard';

export type SignDirection = 'True Left' | 'True Right';

export type SignStatus =
  | 'placed'
  | 'due-retrieval'
  | 'due-maintenance'
  | 'maintained'
  | 'retrieved';

export type JobStatus = 'active' | 'partial' | 'retrieved' | 'archived';

export interface AfterCareSign {
  id: string;
  slk: number;
  lat: number | null;
  lon: number | null;
  category: SignCategory;
  sign_type: string;
  description: string;
  direction: SignDirection;
  placed_date: string;
  placed_time?: string; // HH:MM format (24-hour)
  retrieval_type: RetrievalType; // Per-sign retrieval type
  retrieval_date?: string; // For scheduled type (per sign)
  last_maintained_date?: string;
  retrieved_date?: string;
  retrieved_time?: string; // HH:MM format (24-hour)
  status: SignStatus;
  status_manually_set?: boolean; // True if user manually overrode status
  notes: string;
}

export interface AfterCareJob {
  id: string;
  job_name: string;
  road_id: string;
  road_name: string;
  notes: string;
  date_created: string;
  status: JobStatus;
  work_area_slk_start?: number; // Optional work area start SLK
  work_area_slk_end?: number; // Optional work area end SLK
  signs: AfterCareSign[];
}

export interface AfterCarePresets {
  surface: string[];
  speed: string[];
  hazard: string[];
}

// ============================================
// DEFAULT PRESETS
// ============================================

export const DEFAULT_PRESETS: AfterCarePresets = {
  surface: ['Rough Surface', 'Loose Stones', 'Loose Surface', 'Slippery When Wet', 'Chip Seal'],
  speed: ['Speed Restriction'],
  hazard: ['Water Over Road', 'Event In Progress', 'Traffic Hazard'],
};

// ============================================
// STORAGE KEYS
// ============================================

const JOBS_STORAGE_KEY = 'afterCareJobs';
const PRESETS_STORAGE_KEY = 'afterCarePresets';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique ID
 */
import { generateId, formatAusDate, toIsoDate } from './utils';
export { generateId, formatAusDate, toIsoDate };

/**
 * Parse Australian date string to Date object
 */
export function parseAusDate(dateStr: string): Date | null {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get default job name (Road ID - DD/MM/YYYY)
 */
export function getDefaultJobName(roadId: string): string {
  return `${roadId} - ${formatAusDate(new Date())}`;
}

/**
 * Calculate default scheduled date (+2 days from now)
 */
export function getDefaultScheduledDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return toIsoDate(date);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get days until a date (negative if past)
 */
export function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format relative time (e.g., "2 days", "today", "3 days ago")
 */
export function formatRelativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

// ============================================
// SIGN STATUS CALCULATIONS
// ============================================

/**
 * Calculate sign status based on retrieval_type and time elapsed
 * If status_manually_set is true, returns the stored status
 */
export function calculateSignStatus(sign: AfterCareSign): SignStatus {
  // If retrieved, always retrieved
  if (sign.status === 'retrieved') return 'retrieved';

  // If manually set, use stored status
  if (sign.status_manually_set) return sign.status;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (sign.retrieval_type) {
    case 'standard': {
      const placedDate = new Date(sign.placed_date);
      const dueDate = addDays(placedDate, 2);
      dueDate.setHours(0, 0, 0, 0);
      return today >= dueDate ? 'due-retrieval' : 'placed';
    }

    case 'scheduled': {
      if (!sign.retrieval_date) return 'placed';
      const scheduledDate = new Date(sign.retrieval_date);
      scheduledDate.setHours(0, 0, 0, 0);
      return today >= scheduledDate ? 'due-retrieval' : 'placed';
    }

    case 'maintain-daily': {
      return calculateMaintainStatus(sign, 1);
    }

    case 'maintain-weekly': {
      return calculateMaintainStatus(sign, 7);
    }

    case 'maintain-monthly': {
      return calculateMaintainStatus(sign, 30);
    }

    case 'tba': {
      return 'placed';
    }

    default:
      return 'placed';
  }
}

/**
 * Calculate maintenance status based on interval
 */
function calculateMaintainStatus(sign: AfterCareSign, intervalDays: number): SignStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Use last maintained date if available, otherwise placed date
  const lastActivityDate = sign.last_maintained_date
    ? new Date(sign.last_maintained_date)
    : new Date(sign.placed_date);

  const nextDueDate = addDays(lastActivityDate, intervalDays);
  nextDueDate.setHours(0, 0, 0, 0);

  return today >= nextDueDate ? 'due-maintenance' : 'placed';
}

/**
 * Update all sign statuses in a job based on their retrieval_type and time
 */
export function updateSignStatuses(job: AfterCareJob): AfterCareJob {
  const updatedSigns = job.signs.map((sign) => {
    if (sign.status === 'retrieved') return sign; // Don't change retrieved signs
    if (sign.status_manually_set) return sign; // Don't change manually set statuses

    const calculatedStatus = calculateSignStatus(sign);
    return { ...sign, status: calculatedStatus };
  });

  return { ...job, signs: updatedSigns };
}

// ============================================
// JOB STATUS CALCULATIONS
// ============================================

export type ComputedJobStatus =
  | 'due-retrieval'
  | 'due-maintenance'
  | 'tba'
  | 'active'
  | 'retrieved'
  | 'archived';

/**
 * Calculate the computed status of a job based on aggregated sign statuses
 */
export function calculateJobStatus(job: AfterCareJob): ComputedJobStatus {
  if (job.status === 'archived') return 'archived';

  // No signs = active
  if (job.signs.length === 0) return 'active';

  // Count sign statuses
  let hasDueRetrieval = false;
  let hasDueMaintenance = false;
  let hasTba = false;
  let hasActive = false;
  let allRetrieved = true;

  for (const sign of job.signs) {
    const signStatus = calculateSignStatus(sign);

    if (signStatus === 'retrieved') {
      // retrieved - don't count as active
    } else {
      allRetrieved = false;

      if (signStatus === 'due-retrieval') {
        hasDueRetrieval = true;
      } else if (signStatus === 'due-maintenance' || signStatus === 'maintained') {
        hasDueMaintenance = true;
      } else if (sign.retrieval_type === 'tba') {
        hasTba = true;
      } else {
        hasActive = true;
      }
    }
  }

  // All retrieved
  if (allRetrieved) return 'retrieved';

  // Priority: due-retrieval > due-maintenance > tba > active
  if (hasDueRetrieval) return 'due-retrieval';
  if (hasDueMaintenance) return 'due-maintenance';
  if (hasTba && !hasActive) return 'tba';

  return 'active';
}

/**
 * Get status label and color
 */
export function getStatusInfo(status: ComputedJobStatus): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'due-retrieval':
      return { label: 'Due for Retrieval', color: 'text-red-400', icon: '🔴' };
    case 'due-maintenance':
      return { label: 'Due for Maintenance', color: 'text-yellow-400', icon: '🟡' };
    case 'tba':
      return { label: 'TBA - Awaiting Instruction', color: 'text-gray-400', icon: '⚪' };
    case 'active':
      return { label: 'Active', color: 'text-green-400', icon: '🟢' };
    case 'retrieved':
      return { label: 'Retrieved', color: 'text-blue-400', icon: '✓' };
    case 'archived':
      return { label: 'Archived', color: 'text-gray-500', icon: '📦' };
    default:
      return { label: 'Unknown', color: 'text-gray-400', icon: '❓' };
  }
}

// ============================================
// STORAGE FUNCTIONS - JOBS
// ============================================

/**
 * Get all afterCare jobs from localStorage
 */
export function getAfterCareJobs(): AfterCareJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(JOBS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('Failed to load afterCare jobs');
    return [];
  }
}

/**
 * Save all afterCare jobs to localStorage
 */
export function saveAfterCareJobs(jobs: AfterCareJob[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    console.error('Failed to save afterCare jobs');
  }
}

/**
 * Get a single job by ID
 */
export function getAfterCareJob(id: string): AfterCareJob | null {
  const jobs = getAfterCareJobs();
  return jobs.find((j) => j.id === id) || null;
}

/**
 * Create a new job
 */
export function createAfterCareJob(
  job: Omit<AfterCareJob, 'id' | 'date_created' | 'status' | 'signs'> & { signs?: AfterCareSign[] }
): AfterCareJob {
  const newJob: AfterCareJob = {
    ...job,
    id: generateId(),
    date_created: toIsoDate(new Date()),
    status: 'active',
    signs: job.signs || [],
  };

  const jobs = getAfterCareJobs();
  jobs.push(newJob);
  saveAfterCareJobs(jobs);

  return newJob;
}

/**
 * Update an existing job
 */
export function updateAfterCareJob(
  id: string,
  updates: Partial<AfterCareJob>
): AfterCareJob | null {
  const jobs = getAfterCareJobs();
  const index = jobs.findIndex((j) => j.id === id);

  if (index === -1) return null;

  jobs[index] = { ...jobs[index], ...updates };
  saveAfterCareJobs(jobs);

  return jobs[index];
}

/**
 * Delete a job
 */
export function deleteAfterCareJob(id: string): boolean {
  const jobs = getAfterCareJobs();
  const filtered = jobs.filter((j) => j.id !== id);

  if (filtered.length === jobs.length) return false;

  saveAfterCareJobs(filtered);
  return true;
}

/**
 * Archive a job
 */
export function archiveAfterCareJob(id: string): AfterCareJob | null {
  return updateAfterCareJob(id, { status: 'archived' });
}

/**
 * Unarchive a job
 */
export function unarchiveAfterCareJob(id: string): AfterCareJob | null {
  return updateAfterCareJob(id, { status: 'active' });
}

// ============================================
// SIGN MANAGEMENT
// ============================================

/**
 * Add a sign to a job
 */
export function addSignToJob(
  jobId: string,
  sign: Omit<AfterCareSign, 'id' | 'placed_date' | 'status'>
): AfterCareSign | null {
  const newSign: AfterCareSign = {
    ...sign,
    id: generateId(),
    placed_date: toIsoDate(new Date()),
    status: 'placed',
  };

  const job = getAfterCareJob(jobId);
  if (!job) return null;

  job.signs.push(newSign);
  updateAfterCareJob(jobId, { signs: job.signs });

  return newSign;
}

/**
 * Update a sign in a job
 */
export function updateSignInJob(
  jobId: string,
  signId: string,
  updates: Partial<AfterCareSign>
): boolean {
  const job = getAfterCareJob(jobId);
  if (!job) return false;

  const index = job.signs.findIndex((s) => s.id === signId);
  if (index === -1) return false;

  job.signs[index] = { ...job.signs[index], ...updates };
  updateAfterCareJob(jobId, { signs: job.signs });

  return true;
}

/**
 * Remove a sign from a job
 */
export function removeSignFromJob(jobId: string, signId: string): boolean {
  const job = getAfterCareJob(jobId);
  if (!job) return false;

  const filtered = job.signs.filter((s) => s.id !== signId);
  if (filtered.length === job.signs.length) return false;

  updateAfterCareJob(jobId, { signs: filtered });
  return true;
}

/**
 * Mark a sign as retrieved
 */
export function markSignRetrieved(jobId: string, signId: string): boolean {
  return updateSignInJob(jobId, signId, {
    status: 'retrieved',
    retrieved_date: toIsoDate(new Date()),
  });
}

/**
 * Mark a sign as maintained
 */
export function markSignMaintained(jobId: string, signId: string): boolean {
  return updateSignInJob(jobId, signId, {
    status: 'maintained',
    last_maintained_date: toIsoDate(new Date()),
  });
}

/**
 * Mark all signs in a job as retrieved
 */
export function markAllSignsRetrieved(jobId: string): boolean {
  const job = getAfterCareJob(jobId);
  if (!job) return false;

  const today = toIsoDate(new Date());
  const updatedSigns = job.signs.map((s) => ({
    ...s,
    status: 'retrieved' as SignStatus,
    retrieved_date: today,
  }));

  updateAfterCareJob(jobId, {
    signs: updatedSigns,
    status: 'retrieved',
  });

  return true;
}

/**
 * Mark all signs in a job as maintained
 */
export function markAllSignsMaintained(jobId: string): boolean {
  const job = getAfterCareJob(jobId);
  if (!job) return false;

  const today = toIsoDate(new Date());
  const updatedSigns = job.signs.map((s) => ({
    ...s,
    status: 'maintained' as SignStatus,
    last_maintained_date: today,
  }));

  updateAfterCareJob(jobId, { signs: updatedSigns });

  return true;
}

// ============================================
// STORAGE FUNCTIONS - PRESETS
// ============================================

/**
 * Get presets (merged with defaults)
 */
export function getAfterCarePresets(): AfterCarePresets {
  if (typeof window === 'undefined') return DEFAULT_PRESETS;
  try {
    const data = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!data) return DEFAULT_PRESETS;

    const customPresets = JSON.parse(data) as AfterCarePresets;

    // Merge with defaults (custom additions preserved)
    return {
      surface: [...new Set([...DEFAULT_PRESETS.surface, ...customPresets.surface])],
      speed: [...new Set([...DEFAULT_PRESETS.speed, ...customPresets.speed])],
      hazard: [...new Set([...DEFAULT_PRESETS.hazard, ...customPresets.hazard])],
    };
  } catch {
    return DEFAULT_PRESETS;
  }
}

/**
 * Save custom presets
 */
export function saveAfterCarePresets(presets: AfterCarePresets): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    console.error('Failed to save afterCare presets');
  }
}

/**
 * Add a custom preset to a category
 */
export function addCustomPreset(category: SignCategory, preset: string): void {
  const presets = getAfterCarePresets();
  if (!presets[category].includes(preset)) {
    presets[category].push(preset);
    saveAfterCarePresets(presets);
  }
}

/**
 * Remove a custom preset from a category
 */
export function removeCustomPreset(category: SignCategory, preset: string): void {
  // Don't allow removing default presets
  if (DEFAULT_PRESETS[category].includes(preset)) return;

  const presets = getAfterCarePresets();
  presets[category] = presets[category].filter((p) => p !== preset);
  saveAfterCarePresets(presets);
}

// ============================================
// STATISTICS & REPORTING
// ============================================

export interface AfterCareStats {
  totalJobs: number;
  activeJobs: number;
  archivedJobs: number;
  dueForRetrieval: number;
  dueForMaintenance: number;
  tbaJobs: number;
  totalSigns: number;
  signsAwaitingRetrieval: number;
  signsRetrieved: number;
}

/**
 * Get statistics about afterCare jobs
 */
export function getAfterCareStats(): AfterCareStats {
  const jobs = getAfterCareJobs();

  const stats: AfterCareStats = {
    totalJobs: jobs.length,
    activeJobs: 0,
    archivedJobs: 0,
    dueForRetrieval: 0,
    dueForMaintenance: 0,
    tbaJobs: 0,
    totalSigns: 0,
    signsAwaitingRetrieval: 0,
    signsRetrieved: 0,
  };

  for (const job of jobs) {
    const status = calculateJobStatus(job);

    switch (status) {
      case 'archived':
        stats.archivedJobs++;
        break;
      case 'due-retrieval':
        stats.dueForRetrieval++;
        stats.activeJobs++;
        break;
      case 'due-maintenance':
        stats.dueForMaintenance++;
        stats.activeJobs++;
        break;
      case 'tba':
        stats.tbaJobs++;
        stats.activeJobs++;
        break;
      case 'active':
        stats.activeJobs++;
        break;
      case 'retrieved':
        // Job is retrieved but not yet archived
        stats.activeJobs++;
        break;
    }

    stats.totalSigns += job.signs.length;
    stats.signsAwaitingRetrieval += job.signs.filter((s) => s.status !== 'retrieved').length;
    stats.signsRetrieved += job.signs.filter((s) => s.status === 'retrieved').length;
  }

  return stats;
}

/**
 * Get jobs grouped by status
 */
export function getJobsGroupedByStatus(): {
  dueRetrieval: AfterCareJob[];
  dueMaintenance: AfterCareJob[];
  tba: AfterCareJob[];
  active: AfterCareJob[];
  retrieved: AfterCareJob[];
  archived: AfterCareJob[];
} {
  const jobs = getAfterCareJobs();

  const groups = {
    dueRetrieval: [] as AfterCareJob[],
    dueMaintenance: [] as AfterCareJob[],
    tba: [] as AfterCareJob[],
    active: [] as AfterCareJob[],
    retrieved: [] as AfterCareJob[],
    archived: [] as AfterCareJob[],
  };

  for (const job of jobs) {
    const status = calculateJobStatus(job);

    switch (status) {
      case 'due-retrieval':
        groups.dueRetrieval.push(job);
        break;
      case 'due-maintenance':
        groups.dueMaintenance.push(job);
        break;
      case 'tba':
        groups.tba.push(job);
        break;
      case 'active':
        groups.active.push(job);
        break;
      case 'retrieved':
        groups.retrieved.push(job);
        break;
      case 'archived':
        groups.archived.push(job);
        break;
    }
  }

  return groups;
}

/**
 * Get jobs for a specific road (for drive page integration)
 */
export function getJobsForRoad(roadId: string): AfterCareJob[] {
  const jobs = getAfterCareJobs();
  return jobs.filter(
    (j) =>
      j.road_id.toUpperCase() === roadId.toUpperCase() &&
      j.status !== 'archived' &&
      !j.signs.every((s) => calculateSignStatus(s) === 'retrieved')
  );
}

/**
 * Get nearby signs for drive page (both ahead and behind, both carriageways)
 * Uses calculated status to include signs due for retrieval or maintenance
 */
export function getNearbySigns(
  roadId: string,
  currentSlk: number,
  direction: 'increasing' | 'decreasing',
  maxDistanceKm: number = 5
): (AfterCareSign & { job: AfterCareJob; position: 'ahead' | 'behind' })[] {
  const jobs = getJobsForRoad(roadId);
  const signs: (AfterCareSign & { job: AfterCareJob; position: 'ahead' | 'behind' })[] = [];

  for (const job of jobs) {
    for (const sign of job.signs) {
      // Use calculated status - only skip if actually retrieved
      const calculatedStatus = calculateSignStatus(sign);
      if (calculatedStatus === 'retrieved') continue;

      // Calculate distance in km
      const distanceKm = Math.abs(sign.slk - currentSlk);
      if (distanceKm > maxDistanceKm) continue;

      // Determine if sign is ahead or behind based on travel direction
      let position: 'ahead' | 'behind';
      if (direction === 'increasing') {
        position = sign.slk >= currentSlk ? 'ahead' : 'behind';
      } else {
        position = sign.slk <= currentSlk ? 'ahead' : 'behind';
      }

      signs.push({ ...sign, job, position });
    }
  }

  // Sort by distance (closest first)
  signs.sort((a, b) => {
    const distA = Math.abs(a.slk - currentSlk);
    const distB = Math.abs(b.slk - currentSlk);
    return distA - distB;
  });

  return signs;
}

// ============================================
// EXPORT / SHARE FUNCTIONS
// ============================================

/**
 * Map filter types
 */
export type MapFilter = 'all' | 'retrieval' | 'maintenance';

/**
 * Generate Google Maps URL with filtered sign locations
 * Uses double-slash format to start from current location (A, B, C, D waypoints)
 */
export function generateMapsUrl(job: AfterCareJob, filter: MapFilter = 'all'): string | null {
  // Compute status once per sign, then filter (was 3 separate filter passes calling calculateSignStatus each time)
  const signsWithStatus = job.signs
    .filter((s) => s.lat && s.lon)
    .map((s) => ({ sign: s, status: calculateSignStatus(s) }));

  let filteredSigns = signsWithStatus.filter(({ status }) => status !== 'retrieved');

  if (filter === 'retrieval') {
    filteredSigns = signsWithStatus.filter(({ status }) => status === 'due-retrieval');
  } else if (filter === 'maintenance') {
    filteredSigns = signsWithStatus.filter(
      ({ status }) => status === 'due-maintenance' || status === 'maintained'
    );
  }

  if (filteredSigns.length === 0) return null;

  if (filteredSigns.length === 1) {
    const { sign } = filteredSigns[0];
    // Single destination - start from current location
    return `https://www.google.com/maps/dir//${sign.lat},${sign.lon}`;
  }

  // Multiple pins - use directions format starting from current location
  // Sort by SLK for logical route order
  const sortedSigns = [...filteredSigns].sort((a, b) => a.sign.slk - b.sign.slk);
  const coords = sortedSigns.map(({ sign }) => `${sign.lat},${sign.lon}`).join('/');

  // Double-slash format: /dir// = start from current location
  // This shows waypoints as A (current), B, C, D etc.
  return `https://www.google.com/maps/dir//${coords}`;
}

/**
 * Get sign counts by status for a job (uses calculated status)
 */
export function getSignStatusCounts(job: AfterCareJob): {
  total: number;
  active: number;
  dueRetrieval: number;
  dueMaintenance: number;
  retrieved: number;
} {
  const total = job.signs.length;
  let retrieved = 0;
  let dueRetrieval = 0;
  let dueMaintenance = 0;

  for (const sign of job.signs) {
    const calculatedStatus = calculateSignStatus(sign);
    if (calculatedStatus === 'retrieved') {
      retrieved++;
    } else if (calculatedStatus === 'due-retrieval') {
      dueRetrieval++;
    } else if (calculatedStatus === 'due-maintenance' || calculatedStatus === 'maintained') {
      dueMaintenance++;
    }
  }

  const active = total - retrieved - dueRetrieval - dueMaintenance;

  return { total, active, dueRetrieval, dueMaintenance, retrieved };
}

/**
 * Generate shareable text summary
 */
export function generateShareText(job: AfterCareJob): string {
  const lines: string[] = [];
  lines.push(`🚧 AfterCare Job: ${job.job_name}`);
  lines.push(`Road: ${job.road_id} - ${job.road_name}`);
  lines.push(`Created: ${formatAusDate(job.date_created)}`);
  lines.push(`Status: ${getStatusInfo(calculateJobStatus(job)).label}`);

  if (job.notes) {
    lines.push(`Notes: ${job.notes}`);
  }

  lines.push('');
  lines.push(`Signs (${job.signs.length}):`);

  for (const sign of job.signs) {
    const dirLabel = sign.direction === 'True Left' ? 'TL' : 'TR';
    lines.push(`  SLK ${sign.slk.toFixed(2)}: ${sign.sign_type} (${dirLabel})`);
    if (sign.description) {
      lines.push(`    ${sign.description}`);
    }
  }

  return lines.join('\n');
}

/**
 * Export all jobs as JSON string (for backup)
 */
export function exportAllJobs(): string {
  return JSON.stringify(getAfterCareJobs(), null, 2);
}

/**
 * Import jobs from JSON string
 */
export function importJobs(
  json: string,
  replace: boolean = false
): { success: boolean; count: number; error?: string } {
  try {
    const imported = JSON.parse(json) as AfterCareJob[];

    if (!Array.isArray(imported)) {
      return { success: false, count: 0, error: 'Invalid format' };
    }

    // Validate structure
    for (const job of imported) {
      if (!job.id || !job.road_id || !job.signs) {
        return { success: false, count: 0, error: 'Invalid job structure' };
      }
    }

    if (replace) {
      saveAfterCareJobs(imported);
    } else {
      const existing = getAfterCareJobs();
      // Merge, avoiding duplicates by ID
      const merged = [...existing];
      for (const job of imported) {
        if (!merged.find((j) => j.id === job.id)) {
          merged.push(job);
        }
      }
      saveAfterCareJobs(merged);
    }

    return { success: true, count: imported.length };
  } catch (e) {
    return { success: false, count: 0, error: 'Failed to parse JSON' };
  }
}
