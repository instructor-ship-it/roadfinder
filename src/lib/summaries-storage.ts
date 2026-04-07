/**
 * Summaries Storage Utility
 *
 * Hybrid storage system for document summaries:
 * - Tier 1: Repo JSON (pre-generated, shipped with app)
 * - Tier 2: localStorage (user-generated, per-device)
 *
 * Merges both sources at runtime, with localStorage taking precedence
 * for user-generated updates.
 */

// Structured extraction data for traffic management documents
export interface ExtractedData {
  // Speed zones mentioned in the document
  speedZonesMentioned?: number[];

  // TGS diagram references (e.g., "IW-01", "LC-05")
  tgsDiagramsReferenced?: string[];

  // Role definitions (e.g., "Traffic Management Supervisor", "Traffic Controller")
  roleDefinitions?: string[];

  // Notification thresholds with timeframes
  notificationThresholds?: {
    roadClosure?: string;
    speedReduction?: string;
    laneClosure?: string;
    [key: string]: string | undefined;
  };

  // Extracted requirements with section references
  requirements?: Array<{
    requirement: string;
    section?: string;
    type: 'mandatory' | 'recommended' | 'optional';
  }>;

  // Speed zone taper lengths
  taperLengths?: Array<{
    speedZone: number;
    taperLength: string;
    notes?: string;
  }>;

  // Sign schedules or requirements
  signSchedules?: Array<{
    setup: string;
    signs: string[];
    speedZone?: number;
  }>;
}

// Phase 3: Diagram analysis data
export interface DiagramAnalysis {
  // Diagram identifier (e.g., "IW-01", "LC-05")
  diagramId?: string;

  // Page number in PDF
  pageNumber: number;

  // Diagram type classification
  diagramType?: 'TGS' | 'TMP' | 'sign_schedule' | 'taper_diagram' | 'layout' | 'other';

  // Setup type (e.g., "Intersection Works", "Lane Closure")
  setupType?: string;

  // Speed zone this diagram applies to
  speedZone?: number;

  // Signs shown in the diagram
  signs?: string[];

  // Traffic control devices shown
  trafficControlDevices?: string[];

  // Number of lanes affected
  lanesAffected?: number;

  // Work area description
  workAreaDescription?: string;

  // Key measurements from diagram
  measurements?: Array<{
    label: string;
    value: string;
    unit?: string;
  }>;

  // Safety notes extracted
  safetyNotes?: string[];

  // Detailed description of the diagram
  description?: string;

  // Confidence score (0-1)
  confidence?: number;

  // Base64 image data for preview
  imageData?: string;
}

// Complete section structure from PDF TOC extraction
export interface CompleteSection {
  sectionNumber: string;
  sectionTitle: string;
  page?: number;
}

// Key requirement structure (supports both string and object format)
export interface KeyRequirement {
  requirement: string;
  section?: string;
  regulation?: string;
  documentPage?: number;
  physicalPage?: number;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  employeeDuty?: boolean;
  employeeRight?: boolean;
}

// Compliance note structure (supports both string and object format)
export interface ComplianceNote {
  note: string;
  reference?: string;
  title?: string;
  documentPage?: number;
  physicalPage?: number;
  consequence?: string;
  employeeDuty?: boolean;
}

// Summary structure
export interface DocumentSummary {
  generatedAt: string;
  generatedBy?: string;
  title?: string;
  abstract: string;
  keywords?: string[];
  targetAudience?: string[];
  keyRequirements?: (string | KeyRequirement)[];
  keySections?: { section: string; summary: string }[];
  complianceNotes?: (string | ComplianceNote)[];
  crossReferences?: string[];
  type?: string;
  source?: 'repo' | 'user';
  pageOffset?: number;

  // Phase 1: Complete document sections from TOC extraction
  completeSections?: CompleteSection[];
  pages?: number;
  issuingAuthority?: string;
  lastUpdated?: string;
  tgsDiagramsReferenced?: string[];

  // Phase 2: Structured extraction data
  extractedData?: ExtractedData;

  // Extraction metadata
  extractionVersion?: string;
  extractionType?: 'basic' | 'structured' | 'full' | 'diagrams';

  // Phase 3: Diagram analyses
  diagramAnalyses?: DiagramAnalysis[];
}

export interface SummariesCollection {
  [documentId: string]: DocumentSummary;
}

const STORAGE_KEY = 'tc_document_summaries';

/**
 * Load summaries from localStorage
 */
export function loadLocalSummaries(): SummariesCollection {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading local summaries:', error);
  }
  return {};
}

/**
 * Save summaries to localStorage
 */
export function saveLocalSummaries(summaries: SummariesCollection): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
  } catch (error) {
    console.error('Error saving local summaries:', error);
    // Try to clear old data and save
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
    } catch {
      console.error('Failed to save summaries even after clearing');
    }
  }
}

/**
 * Save a single summary to localStorage
 */
export function saveSummary(documentId: string, summary: DocumentSummary): void {
  const existing = loadLocalSummaries();
  existing[documentId] = {
    ...summary,
    source: 'user',
    generatedAt: summary.generatedAt || new Date().toISOString(),
  };
  saveLocalSummaries(existing);
}

/**
 * Delete a summary from localStorage
 */
export function deleteSummary(documentId: string): void {
  const existing = loadLocalSummaries();
  delete existing[documentId];
  saveLocalSummaries(existing);
}

/**
 * Clear all user-generated summaries
 */
export function clearAllSummaries(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Merge repo summaries with local summaries
 * Local summaries take precedence (newer, user-generated)
 */
export function mergeSummaries(
  repoSummaries: SummariesCollection,
  localSummaries: SummariesCollection
): SummariesCollection {
  const merged: SummariesCollection = { ...repoSummaries };

  // Mark repo summaries
  for (const id of Object.keys(merged)) {
    if (!merged[id].source) {
      merged[id].source = 'repo';
    }
  }

  // Override with local summaries (user-generated take precedence)
  for (const [id, summary] of Object.entries(localSummaries)) {
    merged[id] = {
      ...summary,
      source: 'user',
    };
  }

  return merged;
}

/**
 * Get all summaries (merged from repo + localStorage)
 *
 * New architecture: Loads from individual files in /library/summaries/
 * - index.json lists available documents
 * - {docId}.json contains individual document summaries
 * - Falls back to monolithic generated-summaries.json if individual files not found
 */
export async function getAllSummaries(): Promise<SummariesCollection> {
  // Load repo summaries (try new individual files first, fallback to monolithic)
  let repoSummaries: SummariesCollection = {};

  try {
    // Try loading from individual files (new architecture)
    const indexResponse = await fetch('/library/summaries/index.json');
    if (indexResponse.ok) {
      const indexData = await indexResponse.json();
      const documentList = indexData.documents || [];

      // Load all individual summary files in parallel
      const loadPromises = documentList.map(async (doc: { id: string }) => {
        try {
          const response = await fetch(`/library/summaries/${doc.id}.json`);
          if (response.ok) {
            const summary = await response.json();
            return { id: doc.id, summary };
          }
        } catch {
          // Silently skip failed loads
        }
        return null;
      });

      const results = await Promise.all(loadPromises);

      // Build the summaries collection
      for (const result of results) {
        if (result) {
          repoSummaries[result.id] = result.summary;
        }
      }
    }
  } catch (error) {
    console.error('Error loading from individual summaries:', error);
  }

  // Fallback: Try loading from monolithic file if no summaries loaded
  if (Object.keys(repoSummaries).length === 0) {
    try {
      const response = await fetch('/library/generated-summaries.json');
      if (response.ok) {
        const data = await response.json();
        // Handle both old flat format and new nested format
        if (data.documents && typeof data.documents === 'object') {
          repoSummaries = data.documents;
        } else {
          repoSummaries = data;
        }
      }
    } catch (error) {
      console.error('Error loading repo summaries:', error);
    }
  }

  // Load local summaries
  const localSummaries = loadLocalSummaries();

  // Merge and return
  return mergeSummaries(repoSummaries, localSummaries);
}

/**
 * Get a single summary by document ID
 * Uses lazy loading - only loads the specific document file
 */
export async function getSummary(documentId: string): Promise<DocumentSummary | null> {
  // First check localStorage (fastest, user-generated takes precedence)
  const localSummaries = loadLocalSummaries();
  if (localSummaries[documentId]) {
    return { ...localSummaries[documentId], source: 'user' };
  }

  // Try loading from individual file (new architecture - lazy load)
  try {
    const response = await fetch(`/library/summaries/${documentId}.json`);
    if (response.ok) {
      const summary = await response.json();
      return { ...summary, source: 'repo' };
    }
  } catch {
    // Fall through to monolithic fallback
  }

  // Fallback: Load from monolithic file (old architecture)
  try {
    const response = await fetch('/library/generated-summaries.json');
    if (response.ok) {
      const data = await response.json();
      const documents = data.documents || data;
      if (documents[documentId]) {
        return { ...documents[documentId], source: 'repo' };
      }
    }
  } catch {
    // Silently fail
  }

  return null;
}

/**
 * Export all summaries as JSON string
 */
export function exportSummariesToJson(): string {
  const localSummaries = loadLocalSummaries();
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    summaries: localSummaries,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import summaries from JSON string
 */
export function importSummariesFromJson(jsonString: string): {
  success: boolean;
  imported: number;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  try {
    const data = JSON.parse(jsonString);

    // Handle different formats
    let summariesToImport: SummariesCollection;

    if (data.summaries) {
      // New export format with metadata
      summariesToImport = data.summaries;
    } else if (typeof data === 'object' && !Array.isArray(data)) {
      // Direct summaries object
      summariesToImport = data;
    } else {
      return {
        success: false,
        imported: 0,
        error: 'Invalid format: expected JSON object with summaries',
      };
    }

    // Validate summaries
    const validSummaries: SummariesCollection = {};
    let skipped = 0;

    for (const [id, summary] of Object.entries(summariesToImport)) {
      if (typeof summary === 'object' && summary !== null && 'abstract' in summary) {
        validSummaries[id] = summary as DocumentSummary;
      } else {
        skipped++;
      }
    }

    if (skipped > 0) {
      warnings.push(`Skipped ${skipped} invalid summaries`);
    }

    // Merge with existing
    const existing = loadLocalSummaries();
    const merged = { ...existing, ...validSummaries };
    saveLocalSummaries(merged);

    return {
      success: true,
      imported: Object.keys(validSummaries).length,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      error: error instanceof Error ? error.message : 'Failed to parse JSON',
    };
  }
}

/**
 * Download summaries as JSON file
 */
export function downloadSummaries(): void {
  const json = exportSummariesToJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `tc-summaries-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  localCount: number;
  localStorageSize: string;
} {
  const local = loadLocalSummaries();
  const localCount = Object.keys(local).length;

  let localStorageSize = '0 KB';
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || '';
    const bytes = new Blob([stored]).size;
    if (bytes < 1024) {
      localStorageSize = `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      localStorageSize = `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      localStorageSize = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  } catch {
    localStorageSize = 'Unknown';
  }

  return { localCount, localStorageSize };
}
