/**
 * Contacts Storage
 *
 * Manages contact directory with job/project assignment.
 * Hybrid approach: permanent contacts + current job tagging.
 * @version 1.35.0
 */

// ============================================================================
// Types
// ============================================================================

export interface Contact {
  id: string;
  name: string;
  title: string; // Role/Title (e.g., "Site Supervisor", "TC")
  company?: string;
  vehicle?: string; // What they drive
  phone?: string;
  email?: string;
  notes?: string;
  isOnCurrentJob: boolean; // Tagged for current job
  createdAt: number;
  updatedAt: number;
}

export interface ContactsState {
  contacts: Contact[];
  currentJobName?: string; // Name of current job/project
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'tc-contacts';

const DEFAULT_TITLES = [
  'Traffic Controller',
  'Site Supervisor',
  'Project Manager',
  'Driver',
  'Spotter',
  'Safety Officer',
  'Foreman',
  'Other',
];

const DEFAULT_STATE: ContactsState = {
  contacts: [],
  currentJobName: undefined,
};

// ============================================================================
// Storage Functions
// ============================================================================

export function getState(): ContactsState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load contacts state:', e);
  }

  return { ...DEFAULT_STATE };
}

function saveState(state: ContactsState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save contacts state:', e);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function getTitles(): string[] {
  return DEFAULT_TITLES;
}

// ============================================================================
// Contact CRUD Functions
// ============================================================================

export function addContact(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Contact {
  const state = getState();

  const now = Date.now();
  const newContact: Contact = {
    ...contact,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  state.contacts.push(newContact);
  saveState(state);

  return newContact;
}

export function updateContact(
  id: string,
  updates: Partial<Omit<Contact, 'id' | 'createdAt'>>
): void {
  const state = getState();
  const contact = state.contacts.find((c) => c.id === id);

  if (!contact) return;

  Object.assign(contact, updates, { updatedAt: Date.now() });
  saveState(state);
}

export function deleteContact(id: string): void {
  const state = getState();
  state.contacts = state.contacts.filter((c) => c.id !== id);
  saveState(state);
}

export function getContact(id: string): Contact | undefined {
  const state = getState();
  return state.contacts.find((c) => c.id === id);
}

// ============================================================================
// Job Assignment Functions
// ============================================================================

export function setCurrentJobName(name: string | undefined): void {
  const state = getState();
  state.currentJobName = name;
  saveState(state);
}

export function toggleContactOnJob(contactId: string): void {
  const state = getState();
  const contact = state.contacts.find((c) => c.id === contactId);

  if (!contact) return;

  contact.isOnCurrentJob = !contact.isOnCurrentJob;
  contact.updatedAt = Date.now();
  saveState(state);
}

export function addContactToJob(contactId: string): void {
  const state = getState();
  const contact = state.contacts.find((c) => c.id === contactId);

  if (!contact) return;

  contact.isOnCurrentJob = true;
  contact.updatedAt = Date.now();
  saveState(state);
}

export function removeContactFromJob(contactId: string): void {
  const state = getState();
  const contact = state.contacts.find((c) => c.id === contactId);

  if (!contact) return;

  contact.isOnCurrentJob = false;
  contact.updatedAt = Date.now();
  saveState(state);
}

export function clearAllFromJob(): void {
  const state = getState();

  state.contacts.forEach((contact) => {
    contact.isOnCurrentJob = false;
  });

  saveState(state);
}

export function getContactsOnJob(): Contact[] {
  const state = getState();
  return state.contacts.filter((c) => c.isOnCurrentJob);
}

export function getContactsNotOnJob(): Contact[] {
  const state = getState();
  return state.contacts.filter((c) => !c.isOnCurrentJob);
}

// ============================================================================
// Import/Export Functions
// ============================================================================

export function exportContacts(): string {
  const state = getState();
  return JSON.stringify(state, null, 2);
}

export function importContacts(json: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(json);

    if (!parsed.contacts || !Array.isArray(parsed.contacts)) {
      return { success: false, count: 0, error: 'Invalid format: missing contacts array' };
    }

    const state = getState();

    // Merge contacts (avoid duplicates by ID)
    const existingIds = new Set(state.contacts.map((c) => c.id));
    const newContacts = parsed.contacts.filter((c: Contact) => !existingIds.has(c.id));

    state.contacts = [...state.contacts, ...newContacts];

    if (parsed.currentJobName) {
      state.currentJobName = parsed.currentJobName;
    }

    saveState(state);

    return { success: true, count: newContacts.length };
  } catch (e) {
    return { success: false, count: 0, error: 'Failed to parse JSON' };
  }
}

export function clearAllContacts(): void {
  saveState({ contacts: [], currentJobName: undefined });
}

// ============================================================================
// Search/Filter Functions
// ============================================================================

export function searchContacts(query: string): Contact[] {
  const state = getState();
  const lowerQuery = query.toLowerCase();

  return state.contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.title.toLowerCase().includes(lowerQuery) ||
      c.company?.toLowerCase().includes(lowerQuery) ||
      c.vehicle?.toLowerCase().includes(lowerQuery) ||
      c.phone?.includes(query) ||
      c.email?.toLowerCase().includes(lowerQuery)
  );
}
