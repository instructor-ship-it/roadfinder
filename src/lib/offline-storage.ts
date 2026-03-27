// Offline Storage Utility for TC Work Zone Locator
// Uses Cache API for document storage and localStorage for tracking

const OFFLINE_CACHE_NAME = 'tc-workzone-offline-v1';
const TRACKING_KEY = 'tc-offline-library';
const DOWNLOADED_KEY = 'tc-downloaded-library';

// Check if running in browser
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof caches !== 'undefined';
}

// Offline library tracking entry
export interface OfflineDocument {
  id: string;
  url: string;
  title: string;
  shortTitle: string;
  savedDate: string;
  fileSize?: string;
}

// Downloaded files tracking entry (user saved to their device)
export interface DownloadedDocument {
  id: string;
  title: string;
  shortTitle: string;
  downloadedDate: string;
  fileSize?: string;
}

// Get all offline documents from localStorage tracking
export function getOfflineDocuments(): OfflineDocument[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(TRACKING_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Check if a specific document is saved offline
export function isDocumentOffline(documentId: string): boolean {
  if (!isBrowser()) return false;
  const docs = getOfflineDocuments();
  return docs.some(d => d.id === documentId);
}

// Verify if cached document actually exists in Cache API
export async function verifyCacheExists(documentId: string): Promise<boolean> {
  if (!isBrowser()) return false;
  
  const docs = getOfflineDocuments();
  const doc = docs.find(d => d.id === documentId);
  
  if (!doc) return false;
  
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const cachedResponse = await cache.match(doc.url);
    return !!cachedResponse;
  } catch {
    return false;
  }
}

// Check all cached documents and return which ones have been deleted
export async function getDeletedCacheIds(): Promise<string[]> {
  if (!isBrowser()) return [];
  
  const docs = getOfflineDocuments();
  const deletedIds: string[] = [];
  
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    
    for (const doc of docs) {
      const cachedResponse = await cache.match(doc.url);
      if (!cachedResponse) {
        deletedIds.push(doc.id);
      }
    }
  } catch {
    // If cache access fails, assume all might be deleted
    return docs.map(d => d.id);
  }
  
  return deletedIds;
}

// ============ DOWNLOADED FILES TRACKING ============
// These track files the user downloaded to their device
// Note: We cannot verify the file still exists on the user's device

// Get all downloaded documents
export function getDownloadedDocuments(): DownloadedDocument[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(DOWNLOADED_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Check if a document has been downloaded
export function isDocumentDownloaded(documentId: string): boolean {
  if (!isBrowser()) return false;
  const docs = getDownloadedDocuments();
  return docs.some(d => d.id === documentId);
}

// Mark a document as downloaded
export function markDocumentDownloaded(doc: {
  id: string;
  title: string;
  shortTitle: string;
  fileSize?: string;
}): void {
  if (!isBrowser()) return;
  
  const docs = getDownloadedDocuments();
  const existingIndex = docs.findIndex(d => d.id === doc.id);
  
  const downloadedDoc: DownloadedDocument = {
    id: doc.id,
    title: doc.title,
    shortTitle: doc.shortTitle,
    downloadedDate: new Date().toISOString(),
    fileSize: doc.fileSize
  };
  
  if (existingIndex >= 0) {
    docs[existingIndex] = downloadedDoc;
  } else {
    docs.push(downloadedDoc);
  }
  
  localStorage.setItem(DOWNLOADED_KEY, JSON.stringify(docs));
}

// Remove download tracking
export function removeDownloadedTracking(documentId: string): void {
  if (!isBrowser()) return;
  
  const docs = getDownloadedDocuments();
  const updatedDocs = docs.filter(d => d.id !== documentId);
  localStorage.setItem(DOWNLOADED_KEY, JSON.stringify(updatedDocs));
}

// Get offline document info
export function getOfflineDocumentInfo(documentId: string): OfflineDocument | null {
  if (!isBrowser()) return null;
  const docs = getOfflineDocuments();
  return docs.find(d => d.id === documentId) || null;
}

// Save a document for offline use
export async function saveDocumentOffline(doc: {
  id: string;
  url: string;
  title: string;
  shortTitle: string;
  fileSize?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isBrowser()) {
    return { success: false, error: 'Not in browser environment' };
  }

  try {
    // Open the cache
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    
    // Fetch and cache the document
    const response = await fetch(doc.url);
    if (!response.ok) {
      return { success: false, error: `Failed to fetch: ${response.status}` };
    }
    
    await cache.put(doc.url, response);
    
    // Update tracking in localStorage
    const docs = getOfflineDocuments();
    const existingIndex = docs.findIndex(d => d.id === doc.id);
    
    const offlineDoc: OfflineDocument = {
      id: doc.id,
      url: doc.url,
      title: doc.title,
      shortTitle: doc.shortTitle,
      savedDate: new Date().toISOString(),
      fileSize: doc.fileSize
    };
    
    if (existingIndex >= 0) {
      docs[existingIndex] = offlineDoc;
    } else {
      docs.push(offlineDoc);
    }
    
    localStorage.setItem(TRACKING_KEY, JSON.stringify(docs));
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save document offline:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Remove a document from offline storage
export async function removeDocumentOffline(documentId: string): Promise<{ success: boolean; error?: string }> {
  if (!isBrowser()) {
    return { success: false, error: 'Not in browser environment' };
  }

  try {
    const docs = getOfflineDocuments();
    const doc = docs.find(d => d.id === documentId);
    
    if (!doc) {
      return { success: false, error: 'Document not found in offline library' };
    }
    
    // Remove from cache
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    await cache.delete(doc.url);
    
    // Update tracking
    const updatedDocs = docs.filter(d => d.id !== documentId);
    localStorage.setItem(TRACKING_KEY, JSON.stringify(updatedDocs));
    
    return { success: true };
  } catch (error) {
    console.error('Failed to remove document from offline:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Get the URL for a document (offline cache or network)
export async function getDocumentUrl(
  doc: { id: string; file?: string; url?: string; path?: string }
): Promise<string> {
  if (!isBrowser()) {
    // Server-side: just return the URL
    return doc.file || doc.url || doc.path || '#';
  }
  
  // Check if document is cached offline
  const offlineDocs = getOfflineDocuments();
  const offlineDoc = offlineDocs.find(d => d.id === doc.id);
  
  if (offlineDoc) {
    // Verify it's actually in the cache
    try {
      const cache = await caches.open(OFFLINE_CACHE_NAME);
      const cachedResponse = await cache.match(offlineDoc.url);
      if (cachedResponse) {
        return offlineDoc.url; // Return cached URL
      }
    } catch {
      // Cache check failed, fall through to network
    }
  }
  
  // Return the appropriate network URL
  return doc.file || doc.url || doc.path || '#';
}

// Synchronous version for initial render (returns cached URL immediately)
export function getDocumentUrlSync(
  doc: { id: string; file?: string; url?: string; path?: string }
): string {
  if (!isBrowser()) {
    return doc.file || doc.url || doc.path || '#';
  }
  
  // Check if document is tracked as offline
  const offlineDocs = getOfflineDocuments();
  const offlineDoc = offlineDocs.find(d => d.id === doc.id);
  
  if (offlineDoc) {
    return offlineDoc.url; // Return the URL that's cached
  }
  
  return doc.file || doc.url || doc.path || '#';
}

// Clear all offline documents
export async function clearAllOfflineDocuments(): Promise<{ success: boolean; count: number }> {
  if (!isBrowser()) {
    return { success: false, count: 0 };
  }

  try {
    const docs = getOfflineDocuments();
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    
    // Remove all documents from cache
    for (const doc of docs) {
      await cache.delete(doc.url);
    }
    
    // Clear tracking
    localStorage.removeItem(TRACKING_KEY);
    
    return { success: true, count: docs.length };
  } catch (error) {
    console.error('Failed to clear offline documents:', error);
    return { success: false, count: 0 };
  }
}

// Get storage usage estimate
export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
  if (!isBrowser() || !navigator.storage) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  } catch {
    return null;
  }
}

// Check if app is online
export function isOnline(): boolean {
  if (!isBrowser()) return true;
  return navigator.onLine;
}
