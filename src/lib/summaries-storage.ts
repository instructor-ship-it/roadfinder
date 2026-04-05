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

// Summary structure
export interface DocumentSummary {
  generatedAt: string;
  generatedBy?: string;
  title?: string;
  abstract: string;
  keywords?: string[];
  targetAudience?: string[];
  keyRequirements?: string[];
  keySections?: { section: string; summary: string }[];
  complianceNotes?: string[];
  crossReferences?: string[];
  type?: string;
  source?: 'repo' | 'user';
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
 */
export async function getAllSummaries(): Promise<SummariesCollection> {
  // Load repo summaries (from static JSON)
  let repoSummaries: SummariesCollection = {};
  try {
    const response = await fetch('/library/generated-summaries.json');
    if (response.ok) {
      repoSummaries = await response.json();
    }
  } catch (error) {
    console.error('Error loading repo summaries:', error);
  }
  
  // Load local summaries
  const localSummaries = loadLocalSummaries();
  
  // Merge and return
  return mergeSummaries(repoSummaries, localSummaries);
}

/**
 * Get a single summary by document ID
 */
export async function getSummary(documentId: string): Promise<DocumentSummary | null> {
  const all = await getAllSummaries();
  return all[documentId] || null;
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
      return { success: false, imported: 0, error: 'Invalid format: expected JSON object with summaries' };
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
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    return { 
      success: false, 
      imported: 0, 
      error: error instanceof Error ? error.message : 'Failed to parse JSON' 
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
