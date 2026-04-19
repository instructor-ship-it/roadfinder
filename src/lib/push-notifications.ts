/**
 * Push Notification Manager
 *
 * Handles Web Push API subscriptions and notifications for critical safety alerts.
 * Supports weather warnings, incident alerts, and other time-sensitive notifications.
 *
 * @module push-notifications
 * @version 1.34.1
 */

// ============================================================================
// Types
// ============================================================================

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
  userId?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface PushNotificationPreferences {
  enabled: boolean;
  weatherWarnings: boolean;
  incidentAlerts: boolean;
  shiftReminders: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
}

// ============================================================================
// Constants
// ============================================================================

const PREFERENCES_KEY = 'tc-push-notification-preferences';
const SUBSCRIPTION_KEY = 'tc-push-subscription';

const DEFAULT_PREFERENCES: PushNotificationPreferences = {
  enabled: false,
  weatherWarnings: true,
  incidentAlerts: true,
  shiftReminders: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
};

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Get notification preferences from localStorage
 */
export function getPreferences(): PushNotificationPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };

  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('[Push] Failed to load preferences:', e);
  }

  return { ...DEFAULT_PREFERENCES };
}

/**
 * Save notification preferences to localStorage
 */
export function savePreferences(preferences: Partial<PushNotificationPreferences>): void {
  if (typeof window === 'undefined') return;

  const current = getPreferences();
  const updated = { ...current, ...preferences };

  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
    console.log('[Push] Preferences saved:', updated);
  } catch (e) {
    console.error('[Push] Failed to save preferences:', e);
  }
}

/**
 * Check if we're in quiet hours
 */
export function isInQuietHours(): boolean {
  const prefs = getPreferences();

  if (!prefs.quietHoursEnabled) return false;

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 22:00 - 06:00)
  if (startMinutes > endMinutes) {
    return currentTime >= startMinutes || currentTime < endMinutes;
  }

  return currentTime >= startMinutes && currentTime < endMinutes;
}

// ============================================================================
// Push Subscription Management
// ============================================================================

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if we have an active subscription
 */
export async function hasSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (e) {
    console.error('[Push] Failed to check subscription:', e);
    return false;
  }
}

/**
 * Get the current push subscription
 */
export async function getSubscription(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) return null;

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.toJSON().keys?.p256dh || '',
        auth: subscription.toJSON().keys?.auth || '',
      },
      createdAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[Push] Failed to get subscription:', e);
    return null;
  }
}

/**
 * Subscribe to push notifications
 *
 * Note: In production, you would need:
 * 1. A VAPID key pair (generated server-side)
 * 2. A backend endpoint to store subscriptions
 * 3. A backend endpoint to send notifications
 */
export async function subscribeToPush(
  vapidPublicKey?: string
): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      // In production, use your VAPID public key from environment
      const options: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      };

      // Only add applicationServerKey if we have a valid VAPID key
      if (vapidPublicKey) {
        // Convert to Uint8Array and cast - TypeScript strict mode requires ArrayBuffer
        const keyArray = urlBase64ToUint8Array(vapidPublicKey);
        // Create a fresh ArrayBuffer copy to satisfy TypeScript
        options.applicationServerKey = new Uint8Array(keyArray).buffer as ArrayBuffer;
      }

      subscription = await registration.pushManager.subscribe(options);
      console.log('[Push] New subscription created');
    } else {
      console.log('[Push] Using existing subscription');
    }

    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.toJSON().keys?.p256dh || '',
        auth: subscription.toJSON().keys?.auth || '',
      },
      createdAt: new Date().toISOString(),
    };

    // Store subscription locally
    localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscriptionData));

    // Enable notifications in preferences
    savePreferences({ enabled: true });

    // In production, send subscription to your backend
    // await sendSubscriptionToBackend(subscriptionData);

    return subscriptionData;
  } catch (e) {
    console.error('[Push] Failed to subscribe:', e);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed successfully');
    }

    // Remove local storage
    localStorage.removeItem(SUBSCRIPTION_KEY);
    savePreferences({ enabled: false });

    // In production, remove subscription from your backend
    // await removeSubscriptionFromBackend();

    return true;
  } catch (e) {
    console.error('[Push] Failed to unsubscribe:', e);
    return false;
  }
}

/**
 * Request notification permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    console.warn('[Push] Notification permission denied');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('[Push] Permission result:', permission);
  return permission;
}

/**
 * Get current permission status
 */
export function getPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// ============================================================================
// Local Notification Helpers
// ============================================================================

/**
 * Show a local notification (doesn't require push subscription)
 * Useful for in-app alerts that should also appear as notifications
 */
export async function showLocalNotification(payload: NotificationPayload): Promise<boolean> {
  if (!isPushSupported()) {
    console.warn('[Push] Notifications not supported');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Push] No notification permission');
    return false;
  }

  // Check quiet hours
  if (isInQuietHours()) {
    console.log('[Push] In quiet hours, skipping notification');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Build options - note: 'actions' is not in standard NotificationOptions
    // but is supported by many browsers for service worker notifications
    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      tag: payload.tag,
      data: payload.data,
      requireInteraction: payload.requireInteraction ?? false,
    };

    // Use type assertion for actions which is supported in service worker notifications
    // but not yet in the TypeScript type definitions
    const extendedOptions = options as NotificationOptions & {
      actions?: Array<{ action: string; title: string; icon?: string }>;
    };
    if (payload.actions) {
      extendedOptions.actions = payload.actions;
    }

    await registration.showNotification(payload.title, extendedOptions);

    console.log('[Push] Local notification shown:', payload.title);
    return true;
  } catch (e) {
    console.error('[Push] Failed to show notification:', e);
    return false;
  }
}

/**
 * Show weather warning notification
 */
export async function showWeatherWarningNotification(
  title: string,
  body: string,
  warningUrl: string
): Promise<boolean> {
  const prefs = getPreferences();

  if (!prefs.enabled || !prefs.weatherWarnings) {
    return false;
  }

  return showLocalNotification({
    title: `⚠️ ${title}`,
    body,
    tag: 'weather-warning',
    requireInteraction: true,
    data: { url: warningUrl, type: 'weather-warning' },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

/**
 * Show incident alert notification
 */
export async function showIncidentAlertNotification(
  title: string,
  body: string,
  incidentId: string
): Promise<boolean> {
  const prefs = getPreferences();

  if (!prefs.enabled || !prefs.incidentAlerts) {
    return false;
  }

  return showLocalNotification({
    title: `🚨 ${title}`,
    body,
    tag: `incident-${incidentId}`,
    requireInteraction: true,
    data: { incidentId, type: 'incident-alert' },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

/**
 * Show shift reminder notification
 */
export async function showShiftReminderNotification(message: string): Promise<boolean> {
  const prefs = getPreferences();

  if (!prefs.enabled || !prefs.shiftReminders) {
    return false;
  }

  return showLocalNotification({
    title: '👷 Shift Reminder',
    body: message,
    tag: 'shift-reminder',
    data: { type: 'shift-reminder' },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a base64 encoded VAPID key to Uint8Array
 * Required for push subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check if push notifications are fully configured and working
 */
export async function isFullyConfigured(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  preferences: PushNotificationPreferences;
}> {
  const supported = isPushSupported();
  const permission = getPermissionStatus();
  const subscribed = await hasSubscription();
  const preferences = getPreferences();

  return {
    supported,
    permission,
    subscribed,
    preferences,
  };
}
