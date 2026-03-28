// Q&A Storage Utility for TC Work Zone Locator
// Stores saved questions and answers in localStorage

const QA_STORAGE_KEY = 'tc-library-qa-history';

// Check if running in browser
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Saved Q&A entry
export interface QaEntry {
  id: string;
  question: string;
  answer: string;
  documents: string[]; // Document IDs that were searched
  documentNames: string[]; // Document short titles for display
  createdAt: string;
  isFavorite: boolean;
  category?: string; // User-assigned category
}

// Get all saved Q&A entries
export function getQaHistory(): QaEntry[] {
  if (!isBrowser()) return [];
  try {
    const data = localStorage.getItem(QA_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save a new Q&A entry
export function saveQaEntry(entry: Omit<QaEntry, 'id' | 'createdAt' | 'isFavorite'>): QaEntry {
  if (!isBrowser()) {
    throw new Error('Cannot save Q&A entry outside browser');
  }

  const newEntry: QaEntry = {
    ...entry,
    id: `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    isFavorite: false,
  };

  const history = getQaHistory();
  history.unshift(newEntry); // Add to beginning

  // Limit to 100 saved entries to prevent localStorage overflow
  const trimmedHistory = history.slice(0, 100);

  localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(trimmedHistory));
  return newEntry;
}

// Delete a Q&A entry
export function deleteQaEntry(id: string): boolean {
  if (!isBrowser()) return false;

  const history = getQaHistory();
  const filtered = history.filter(entry => entry.id !== id);

  if (filtered.length < history.length) {
    localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
  return false;
}

// Toggle favorite status
export function toggleQaFavorite(id: string): boolean {
  if (!isBrowser()) return false;

  const history = getQaHistory();
  const entry = history.find(e => e.id === id);

  if (entry) {
    entry.isFavorite = !entry.isFavorite;
    localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(history));
    return true;
  }
  return false;
}

// Update category
export function updateQaCategory(id: string, category: string): boolean {
  if (!isBrowser()) return false;

  const history = getQaHistory();
  const entry = history.find(e => e.id === id);

  if (entry) {
    entry.category = category;
    localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(history));
    return true;
  }
  return false;
}

// Search Q&A history
export function searchQaHistory(query: string): QaEntry[] {
  const history = getQaHistory();
  const lowerQuery = query.toLowerCase();

  return history.filter(entry =>
    entry.question.toLowerCase().includes(lowerQuery) ||
    entry.answer.toLowerCase().includes(lowerQuery) ||
    entry.documentNames.some(name => name.toLowerCase().includes(lowerQuery)) ||
    (entry.category && entry.category.toLowerCase().includes(lowerQuery))
  );
}

// Get Q&A entries by document
export function getQaByDocument(documentId: string): QaEntry[] {
  const history = getQaHistory();
  return history.filter(entry => entry.documents.includes(documentId));
}

// Get all used categories
export function getQaCategories(): string[] {
  const history = getQaHistory();
  const categories = new Set<string>();

  history.forEach(entry => {
    if (entry.category) {
      categories.add(entry.category);
    }
  });

  return Array.from(categories).sort();
}

// Export Q&A history as JSON
export function exportQaHistory(): string {
  const history = getQaHistory();
  return JSON.stringify(history, null, 2);
}

// Import Q&A history from JSON
export function importQaHistory(jsonData: string): { success: boolean; count: number; error?: string } {
  if (!isBrowser()) {
    return { success: false, count: 0, error: 'Not in browser environment' };
  }

  try {
    const imported = JSON.parse(jsonData);

    if (!Array.isArray(imported)) {
      return { success: false, count: 0, error: 'Invalid format: expected array' };
    }

    // Validate entries have required fields
    const validEntries: QaEntry[] = [];
    for (const entry of imported) {
      if (entry.question && entry.answer && entry.id && entry.createdAt) {
        validEntries.push({
          id: entry.id,
          question: entry.question,
          answer: entry.answer,
          documents: entry.documents || [],
          documentNames: entry.documentNames || [],
          createdAt: entry.createdAt,
          isFavorite: entry.isFavorite || false,
          category: entry.category,
        });
      }
    }

    if (validEntries.length === 0) {
      return { success: false, count: 0, error: 'No valid entries found' };
    }

    // Merge with existing history (avoid duplicates by ID)
    const existing = getQaHistory();
    const existingIds = new Set(existing.map(e => e.id));
    const newEntries = validEntries.filter(e => !existingIds.has(e.id));

    const merged = [...newEntries, ...existing].slice(0, 100);
    localStorage.setItem(QA_STORAGE_KEY, JSON.stringify(merged));

    return { success: true, count: newEntries.length };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to parse JSON'
    };
  }
}

// Clear all Q&A history
export function clearQaHistory(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(QA_STORAGE_KEY);
}
