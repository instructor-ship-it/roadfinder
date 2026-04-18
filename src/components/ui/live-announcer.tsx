/**
 * Live Region Announcer
 *
 * Provides accessible announcements for screen readers using ARIA live regions.
 * Use this to announce dynamic content changes, loading states, and errors.
 *
 * @see https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA19
 */

'use client';

import { createContext, useContext, useCallback, useRef, ReactNode } from 'react';

type AriaLive = 'polite' | 'assertive' | 'off';

interface AnnouncerContextValue {
  /** Announce a message to screen readers */
  announce: (message: string, priority?: AriaLive) => void;
  /** Clear any pending announcements */
  clear: () => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

/**
 * Hook to access the announcer context
 */
export function useAnnouncer() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider');
  }
  return context;
}

interface AnnouncerProviderProps {
  children: ReactNode;
}

/**
 * Provider component for the announcer
 *
 * @example
 * <AnnouncerProvider>
 *   <App />
 * </AnnouncerProvider>
 */
export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: AriaLive = 'polite') => {
    const ref = priority === 'assertive' ? assertiveRef : politeRef;
    if (ref.current) {
      // Clear first, then set message (triggers announcement)
      ref.current.textContent = '';
      // Small delay to ensure the clear is processed
      setTimeout(() => {
        if (ref.current) {
          ref.current.textContent = message;
        }
      }, 50);
    }
  }, []);

  const clear = useCallback(() => {
    if (politeRef.current) politeRef.current.textContent = '';
    if (assertiveRef.current) assertiveRef.current.textContent = '';
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce, clear }}>
      {children}
      {/* Polite live region */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {/* Assertive live region */}
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </AnnouncerContext.Provider>
  );
}

/**
 * Announce function for use outside of React components
 */
let globalAnnounce: ((message: string, priority?: AriaLive) => void) | null = null;

/**
 * Set the global announce function (called by AnnouncerProvider)
 */
export function setGlobalAnnouncer(announce: (message: string, priority?: AriaLive) => void) {
  globalAnnounce = announce;
}

/**
 * Announce a message globally (works outside React components)
 */
export function announce(message: string, priority: AriaLive = 'polite') {
  if (globalAnnounce) {
    globalAnnounce(message, priority);
  } else {
    console.warn('Announcer not initialized. Wrap app in AnnouncerProvider.');
  }
}

/**
 * Common announcement helpers
 */
export const announcements = {
  loading: () => 'Loading. Please wait.',
  loaded: () => 'Content loaded.',
  error: (message?: string) => message || 'An error occurred.',
  saved: () => 'Changes saved.',
  deleted: (item?: string) => `${item || 'Item'} deleted.`,
  copied: () => 'Copied to clipboard.',
  offline: () => 'You are currently offline. Some features may be unavailable.',
  online: () => 'You are back online.',
  gpsStarted: () => 'GPS tracking started.',
  gpsStopped: () => 'GPS tracking stopped.',
  speedWarning: (speed: number, limit: number) =>
    `Warning: You are traveling at ${speed} kilometers per hour in a ${limit} zone.`,
};
