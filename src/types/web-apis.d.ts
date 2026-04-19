/**
 * Type declarations for Web APIs not yet in TypeScript lib
 *
 * These extend the standard TypeScript definitions for:
 * - Background Sync API
 * - Periodic Background Sync API
 * - Web Share API enhancements
 * - Service Worker Notification actions
 */

// ============================================================================
// Background Sync API
// ============================================================================

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistration {
  readonly sync?: SyncManager;
  readonly periodicSync?: PeriodicSyncManager;
}

// ============================================================================
// Periodic Background Sync API
// ============================================================================

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval?: number }): Promise<void>;
  getTags(): Promise<string[]>;
  unregister(tag: string): Promise<void>;
}

// ============================================================================
// Service Worker Notification Options
// ============================================================================

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface ServiceWorkerNotificationOptions extends NotificationOptions {
  actions?: NotificationAction[];
}

// ============================================================================
// Web Share API Enhancements
// ============================================================================

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

declare namespace Navigator {
  interface Navigator {
    share(data: ShareData): Promise<void>;
    canShare(data: ShareData): boolean;
  }
}

// ============================================================================
// Service Worker Extensions
// ============================================================================

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

interface SyncEvent extends ExtendableEvent {
  tag: string;
  lastChance: boolean;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

interface ServiceWorkerGlobalScopeEventMap {
  sync: SyncEvent;
  periodicsync: PeriodicSyncEvent;
  push: PushEvent;
  notificationclick: NotificationEvent;
  notificationclose: NotificationEvent;
}

interface PushEvent extends ExtendableEvent {
  readonly data: PushMessageData | null;
}

interface PushMessageData {
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
  json(): any;
  text(): string;
}

interface NotificationEvent extends ExtendableEvent {
  readonly action: string;
  readonly notification: Notification;
}
