'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface OfflineStatusIndicatorProps {
  /** Whether data is from cache */
  fromCache?: boolean;
  /** Timestamp when data was cached (epoch ms) */
  cachedAt?: number;
  /** Whether data is unavailable due to offline mode */
  dataUnavailable?: boolean;
  /** Source of the data */
  source?: string;
  /** Whether to show detailed info */
  detailed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Offline Status Indicator
 * Shows data freshness status with visual indicators for cached/offline data.
 * Provides users with clear feedback about data source and age.
 */
export function OfflineStatusIndicator({
  fromCache = false,
  cachedAt,
  dataUnavailable = false,
  source,
  detailed = false,
  className = '',
}: OfflineStatusIndicatorProps) {
  const [now, setNow] = useState(Date.now());

  // Update relative time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate cache age
  const getCacheAge = (): string => {
    if (!cachedAt) return '';
    const ageMs = now - cachedAt;
    const ageMins = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMins / 60);
    const ageDays = Math.floor(ageHours / 24);

    if (ageDays > 0) return `${ageDays}d ${ageHours % 24}h ago`;
    if (ageHours > 0) return `${ageHours}h ${ageMins % 60}m ago`;
    if (ageMins > 0) return `${ageMins}m ago`;
    return 'just now';
  };

  // Data unavailable state
  if (dataUnavailable) {
    return (
      <span
        className={`inline-flex items-center gap-1 bg-red-600/80 text-white text-xs px-2 py-0.5 rounded-full ${className}`}
        title="No cached data available"
      >
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        No Cached Data
      </span>
    );
  }

  // Fresh data state
  if (!fromCache) {
    return (
      <span
        className={`inline-flex items-center gap-1 bg-green-600/80 text-white text-xs px-2 py-0.5 rounded-full ${className}`}
        title="Fresh data from API"
      >
        <span className="w-2 h-2 rounded-full bg-white" />
        Live
      </span>
    );
  }

  // Cached data state
  const cacheAge = getCacheAge();
  const ageWarning = cacheAge && cachedAt && now - cachedAt > 30 * 60 * 1000; // 30 mins

  return (
    <span
      className={`inline-flex items-center gap-1 ${
        ageWarning ? 'bg-amber-600/80' : 'bg-blue-600/80'
      } text-white text-xs px-2 py-0.5 rounded-full ${className}`}
      title={`Cached data from ${source || 'API'}`}
    >
      <span className="w-2 h-2 rounded-full bg-white" />
      Cached {cacheAge}
      {detailed && source && <span className="ml-1 opacity-75">({source})</span>}
    </span>
  );
}

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  // Initialize lastOnline with current date if currently online
  const [lastOnline, setLastOnline] = useState<Date | null>(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      return new Date();
    }
    return null;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastOnline };
}

/**
 * Network Status Banner
 * Shows a banner when the app is offline with helpful information.
 */
export function NetworkStatusBanner() {
  const { isOnline, lastOnline } = useOnlineStatus();
  // Track offline start time to show banner
  const offlineStartTimeRef = useRef<Date | null>(
    typeof navigator !== 'undefined' && !navigator.onLine ? new Date() : null
  );
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle online/offline transitions using refs to avoid setState in effects
  const handleOnlineChange = useCallback((online: boolean) => {
    if (!online) {
      // Going offline - show banner immediately
      offlineStartTimeRef.current = new Date();
      setShowBanner(true);
      // Clear any pending hide timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else {
      // Coming back online - keep banner for 3 seconds
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = setTimeout(() => {
        setShowBanner(false);
        offlineStartTimeRef.current = null;
      }, 3000);
    }
  }, []);

  useEffect(() => {
    // Subscribe to online/offline events
    const handleOnline = () => handleOnlineChange(true);
    const handleOffline = () => handleOnlineChange(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [handleOnlineChange]);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 p-2 text-center text-sm font-medium ${
        isOnline ? 'bg-green-600 text-white animate-fade-out' : 'bg-amber-600 text-white'
      }`}
    >
      {!isOnline ? (
        <>
          📴 You are offline • App will work with cached data
          {lastOnline && (
            <span className="ml-2 opacity-75">
              (last online: {lastOnline.toLocaleTimeString()})
            </span>
          )}
        </>
      ) : (
        <>✓ Back online • Syncing data...</>
      )}
    </div>
  );
}

/**
 * Data Freshness Display
 * Shows how fresh the current data is with visual indicators.
 */
export function DataFreshnessDisplay({
  timestamp,
  label = 'Data',
  showIcon = true,
}: {
  timestamp?: number;
  label?: string;
  showIcon?: boolean;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!timestamp) {
    return (
      <span className="text-xs text-gray-500">
        {showIcon && '⏱️ '}
        {label}: Unknown
      </span>
    );
  }

  const ageMs = now - timestamp;
  const ageMins = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMins / 60);
  const ageDays = Math.floor(ageHours / 24);

  let freshnessText: string;
  let freshnessColor: string;
  let freshnessIcon: string;

  if (ageMins < 5) {
    freshnessText = 'Fresh';
    freshnessColor = 'text-green-400';
    freshnessIcon = '🟢';
  } else if (ageMins < 30) {
    freshnessText = `${ageMins}m ago`;
    freshnessColor = 'text-green-400';
    freshnessIcon = '🟢';
  } else if (ageHours < 1) {
    freshnessText = `${ageMins}m ago`;
    freshnessColor = 'text-blue-400';
    freshnessIcon = '🔵';
  } else if (ageHours < 24) {
    freshnessText = `${ageHours}h ago`;
    freshnessColor = 'text-amber-400';
    freshnessIcon = '🟡';
  } else {
    freshnessText = `${ageDays}d ago`;
    freshnessColor = 'text-red-400';
    freshnessIcon = '🔴';
  }

  return (
    <span className={`text-xs ${freshnessColor}`}>
      {showIcon && `${freshnessIcon} `}
      {label}: {freshnessText}
    </span>
  );
}

/**
 * Sync Status Indicator
 * Shows the current sync progress when data is being synchronized.
 */
export function SyncStatusIndicator({
  isSyncing,
  progress,
  message,
  className = '',
}: {
  isSyncing: boolean;
  progress?: number; // 0-100
  message?: string;
  className?: string;
}) {
  if (!isSyncing) return null;

  return (
    <span
      className={`inline-flex items-center gap-2 bg-blue-600/80 text-white text-xs px-3 py-1 rounded-full ${className}`}
    >
      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
      {message || 'Syncing...'}
      {progress !== undefined && (
        <span className="bg-blue-800 px-1.5 py-0.5 rounded text-[10px]">{progress}%</span>
      )}
    </span>
  );
}

/**
 * Data Source Badge
 * Shows the source of data (IndexedDB, API, localStorage, etc.)
 */
export function DataSourceBadge({
  source,
  className = '',
}: {
  source?: string;
  className?: string;
}) {
  if (!source) return null;

  // Determine badge color based on source
  const getBadgeStyle = (): string => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('indexeddb')) return 'bg-purple-600/80';
    if (lowerSource.includes('offline') || lowerSource.includes('cached')) return 'bg-blue-600/80';
    if (lowerSource.includes('online') || lowerSource.includes('api')) return 'bg-green-600/80';
    if (lowerSource.includes('error') || lowerSource.includes('unavailable'))
      return 'bg-red-600/80';
    return 'bg-gray-600/80';
  };

  // Shorten source text
  const getShortSource = (): string => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('indexeddb')) return 'IndexedDB';
    if (lowerSource.includes('wa health')) return 'WA Health';
    if (lowerSource.includes('fuelwatch')) return 'FuelWatch';
    if (lowerSource.includes('open-meteo')) return 'Open-Meteo';
    if (lowerSource.includes('openstreetmap')) return 'OSM';
    if (lowerSource.includes('national toilet')) return 'Toilet Map';
    if (lowerSource.includes('offline')) return 'Offline';
    if (lowerSource.includes('cached')) return 'Cache';
    if (lowerSource.includes('online')) return 'Live';
    return source.split('|')[0].trim().substring(0, 15);
  };

  return (
    <span
      className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded ${getBadgeStyle()} text-white ${className}`}
      title={source}
    >
      {getShortSource()}
    </span>
  );
}

/**
 * Data Status Panel
 * Shows comprehensive status for multiple data types.
 */
export function DataStatusPanel({
  dataTypes,
  className = '',
}: {
  dataTypes: Array<{
    name: string;
    fromCache?: boolean;
    cachedAt?: number;
    dataUnavailable?: boolean;
    source?: string;
  }>;
  className?: string;
}) {
  const [now, setNow] = useState(Date.now());

  // Update relative time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate cache age
  const getCacheAge = (cachedAt?: number): string => {
    if (!cachedAt) return 'unknown';
    const ageMs = now - cachedAt;
    const ageMins = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMins / 60);
    const ageDays = Math.floor(ageHours / 24);

    if (ageDays > 0) return `${ageDays}d ${ageHours % 24}h`;
    if (ageHours > 0) return `${ageHours}h ${ageMins % 60}m`;
    if (ageMins > 0) return `${ageMins}m`;
    return 'now';
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-3 text-xs ${className}`}>
      <h4 className="font-semibold text-gray-300 mb-2 flex items-center gap-1">📊 Data Status</h4>
      <div className="space-y-1.5">
        {dataTypes.map((dataType, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-gray-400">{dataType.name}</span>
            <div className="flex items-center gap-2">
              {dataType.dataUnavailable ? (
                <span className="text-red-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  No data
                </span>
              ) : dataType.fromCache ? (
                <span className="text-blue-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Cached {getCacheAge(dataType.cachedAt)}
                </span>
              ) : (
                <span className="text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              )}
              {dataType.source && <DataSourceBadge source={dataType.source} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook to get comprehensive offline data statistics
 */
export function useOfflineDataStats() {
  const [stats, setStats] = useState<{
    hasOfflineData: boolean;
    regionCount: number;
    roadCount: number;
    lastSync: number | null;
    dataTypes: Array<{
      name: string;
      count: number;
      lastUpdated: number | null;
    }>;
  }>({
    hasOfflineData: false,
    regionCount: 0,
    roadCount: 0,
    lastSync: null,
    dataTypes: [],
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Check localStorage for basic stats
        const metadata = localStorage.getItem('offlineMetadata');
        if (metadata) {
          const parsed = JSON.parse(metadata);
          setStats((prev) => ({
            ...prev,
            lastSync: parsed.lastSync || null,
            regionCount: parsed.regions?.length || 0,
          }));
        }

        // Check IndexedDB for detailed stats (if available)
        if (typeof indexedDB !== 'undefined') {
          // This would need to be implemented in offline-db.ts
          // For now, we'll just set basic stats
        }
      } catch (err) {
        console.error('Failed to load offline stats:', err);
      }
    };

    loadStats();
  }, []);

  return stats;
}

export default OfflineStatusIndicator;
