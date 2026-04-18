/**
 * Custom hook for offline data management
 *
 * Manages offline data state, downloads, and synchronization.
 *
 * @module hooks/useOfflineData
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initDB,
  isOfflineDataAvailable,
  getOfflineMetadata,
  clearOfflineData,
  getDetailedStats,
  storeRegionData,
  storeSpeedZones,
  storeRailCrossings,
  storeRegulatorySigns,
  storeWarningSigns,
  storePavementData,
  storeTrafficData,
  storeAllAmenitiesData,
  storeMetadata,
} from '@/lib/offline-db';
import { loadStaticData, checkStaticData } from '@/lib/download-roads';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OfflineStats {
  total_roads: number;
  download_date: string;
  pavement_roads?: number;
  traffic_roads?: number;
  amenities_regions?: number;
}

export interface OfflineToggles {
  roadsList: boolean;
  workZoneLookup: boolean;
  speedZones: boolean;
  railCrossings: boolean;
  regulatorySigns: boolean;
  warningSigns: boolean;
  amenities: boolean;
}

export interface DatasetStats {
  roads: { count: number; lastSync: string | null };
  speedZones: { count: number; lastSync: string | null };
  railCrossings: { count: number; lastSync: string | null };
  regulatorySigns: { count: number; lastSync: string | null };
  warningSigns: { count: number; lastSync: string | null };
}

export interface SyncProgress {
  status: string;
  percent: number;
  message: string;
}

export interface MrwaStatus {
  _meta?: {
    mrwaReachable: boolean;
    message: string;
  };
  roads?: { total: number };
  speedZones?: { total: number };
  railCrossings?: { total: number };
  regulatorySigns?: { total: number };
  warningSigns?: { total: number };
}

const DEFAULT_OFFLINE_TOGGLES: OfflineToggles = {
  roadsList: true,
  workZoneLookup: true,
  speedZones: true,
  railCrossings: true,
  regulatorySigns: true,
  warningSigns: true,
  amenities: false, // Default to ONLINE for better rural/regional coverage
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useOfflineData() {
  // Offline data state
  const [offlineReady, setOfflineReady] = useState<boolean>(false);
  const [defaultRegion, setDefaultRegion] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [offlineStats, setOfflineStats] = useState<OfflineStats | null>(null);

  // Offline data source toggles
  const [offlineToggles, setOfflineToggles] = useState<OfflineToggles>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('offlineToggles');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_OFFLINE_TOGGLES, ...parsed };
        } catch {
          return DEFAULT_OFFLINE_TOGGLES;
        }
      }
    }
    return DEFAULT_OFFLINE_TOGGLES;
  });

  // Admin sync state
  const [syncProgress, setSyncProgress] = useState<Record<string, SyncProgress>>({});
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null);
  const [mrwaStatus, setMrwaStatus] = useState<MrwaStatus | null>(null);
  const [syncingDatasets, setSyncingDatasets] = useState<Set<string>>(new Set());

  // Check offline data availability on mount
  useEffect(() => {
    const checkOfflineStatus = async () => {
      try {
        await initDB();
        const hasData = await isOfflineDataAvailable();
        setOfflineReady(hasData);

        if (hasData) {
          const metadata = await getOfflineMetadata();
          if (metadata) {
            setOfflineStats({
              total_roads: metadata.total_roads,
              download_date: metadata.download_date,
            });
          }

          // Get detailed stats for dataset stats
          const stats = await getDetailedStats();
          setDatasetStats(stats);
        }
      } catch (e) {
        console.error('Failed to check offline status:', e);
      }
    };

    checkOfflineStatus();
  }, []);

  // Load default region from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('defaultRegion');
    if (saved) {
      setDefaultRegion(saved);
    }
  }, []);

  // Update offline toggle
  const updateOfflineToggle = useCallback((key: keyof OfflineToggles, value: boolean) => {
    setOfflineToggles((prev) => {
      const newToggles = { ...prev, [key]: value };
      localStorage.setItem('offlineToggles', JSON.stringify(newToggles));
      return newToggles;
    });
  }, []);

  // Reset offline toggles to defaults
  const resetOfflineToggles = useCallback(() => {
    setOfflineToggles(DEFAULT_OFFLINE_TOGGLES);
    localStorage.setItem('offlineToggles', JSON.stringify(DEFAULT_OFFLINE_TOGGLES));
  }, []);

  // Update default region
  const updateDefaultRegion = useCallback((region: string) => {
    setDefaultRegion(region);
    localStorage.setItem('defaultRegion', region);
  }, []);

  // Download offline data (full implementation)
  const handleDownloadOfflineData = useCallback(async () => {
    setDownloading(true);
    setDownloadProgress('Clearing old data...');

    try {
      // Always clear old data before downloading new data to prevent corruption
      await clearOfflineData();

      // Check if static data is available
      setDownloadProgress('Checking for static data...');
      const { available, metadata } = await checkStaticData();

      if (!available) {
        setDownloadProgress(
          'No static data available. Please run: node scripts/download-roads.js locally and commit the data files.'
        );
        setTimeout(() => setDownloading(false), 5000);
        return { success: false, error: 'No static data available' };
      }

      setDownloadProgress(
        `Found data from ${metadata.download_date ? new Date(metadata.download_date).toLocaleDateString() : 'unknown date'}. Loading...`
      );

      const downloadDate = new Date().toISOString();

      // Load static data into IndexedDB
      const result = await loadStaticData(
        async (region, roads, speedZones, railCrossings, regulatorySigns, warningSigns) => {
          await storeRegionData(region, roads);
          await storeSpeedZones(speedZones);
          if (railCrossings && railCrossings.length > 0) {
            await storeRailCrossings(railCrossings);
          }
          if (regulatorySigns && regulatorySigns.length > 0) {
            await storeRegulatorySigns(regulatorySigns);
          }
          if (warningSigns && warningSigns.length > 0) {
            await storeWarningSigns(warningSigns);
          }
        },
        (progress) => {
          setDownloadProgress(progress.message);
        },
        // Store pavement data
        async (pavementData) => {
          await storePavementData(pavementData);
        },
        // Store traffic data
        async (trafficData) => {
          await storeTrafficData(trafficData);
        },
        // Store amenities data
        async (amenitiesData) => {
          await storeAllAmenitiesData(amenitiesData);
        }
      );

      // Save metadata
      await storeMetadata({
        download_date: downloadDate,
        total_roads: result.totalRoads,
        regions: result.regions,
      });

      setOfflineReady(true);
      setOfflineStats({
        total_roads: result.totalRoads,
        download_date: downloadDate,
      });

      // Build summary message
      const parts: string[] = [];
      parts.push(`${result.totalRoads} roads`);
      parts.push(`${result.totalSpeedZones} speed zones`);
      if (result.totalPavement > 0) parts.push(`${result.totalPavement} roads with pavement data`);
      if (result.totalTraffic > 0) parts.push(`${result.totalTraffic} roads with traffic data`);
      if (result.totalAmenities > 0) parts.push(`${result.totalAmenities} amenities`);
      if (result.totalRailCrossings > 0) parts.push(`${result.totalRailCrossings} rail crossings`);
      if (result.totalRegulatorySigns > 0)
        parts.push(`${result.totalRegulatorySigns} regulatory signs`);
      if (result.totalWarningSigns > 0) parts.push(`${result.totalWarningSigns} warning signs`);

      setDownloadProgress(`✓ Loaded ${parts.join(', ')} from ${result.regions.length} regions`);

      setTimeout(() => {
        setDownloadProgress('');
      }, 5000);

      return { success: true, result };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setDownloadProgress(`Error: ${message}`);
      return { success: false, error: message };
    } finally {
      setDownloading(false);
    }
  }, []);

  // Clear offline data
  const handleClearOfflineData = useCallback(async () => {
    try {
      await clearOfflineData();
      setOfflineReady(false);
      setOfflineStats(null);
      setDatasetStats(null);
      setDownloadProgress('Offline data cleared');
      setTimeout(() => setDownloadProgress(''), 2000);
      return { success: true };
    } catch (e) {
      setDownloadProgress('Failed to clear data');
      return { success: false, error: 'Failed to clear data' };
    }
  }, []);

  // Load dataset stats
  const loadDatasetStats = useCallback(async () => {
    try {
      const stats = await getDetailedStats();
      setDatasetStats(stats);
    } catch (e) {
      console.error('Failed to load dataset stats:', e);
    }
  }, []);

  // Fetch MRWA status (record counts)
  const fetchMrwaStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin-sync?action=status');
      if (response.ok) {
        const data = await response.json();
        setMrwaStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch MRWA status:', e);
    }
  }, []);

  // Sync dataset from MRWA
  const syncDatasetFromMrwa = useCallback(
    async (dataset: string) => {
      setSyncingDatasets((prev) => new Set(prev).add(dataset));
      setSyncProgress((prev) => ({
        ...prev,
        [dataset]: { status: 'syncing', percent: 0, message: 'Starting sync...' },
      }));

      try {
        const response = await fetch(`/api/admin-sync?action=sync&dataset=${dataset}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                setSyncProgress((prev) => ({
                  ...prev,
                  [dataset]: data,
                }));
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        // Refresh stats after sync
        await loadDatasetStats();
      } catch (e) {
        setSyncProgress((prev) => ({
          ...prev,
          [dataset]: {
            status: 'error',
            percent: 0,
            message: e instanceof Error ? e.message : 'Sync failed',
          },
        }));
      } finally {
        setSyncingDatasets((prev) => {
          const next = new Set(prev);
          next.delete(dataset);
          return next;
        });
      }
    },
    [loadDatasetStats]
  );

  // Sync all datasets
  const syncAllDatasets = useCallback(async () => {
    const datasets = ['roads', 'speedZones', 'railCrossings', 'regulatorySigns', 'warningSigns'];
    for (const dataset of datasets) {
      await syncDatasetFromMrwa(dataset);
    }
  }, [syncDatasetFromMrwa]);

  return {
    // State
    offlineReady,
    defaultRegion,
    downloading,
    downloadProgress,
    offlineStats,
    offlineToggles,
    syncProgress,
    datasetStats,
    mrwaStatus,
    syncingDatasets,

    // Actions
    updateOfflineToggle,
    resetOfflineToggles,
    updateDefaultRegion,
    handleDownloadOfflineData,
    handleClearOfflineData,
    loadDatasetStats,
    fetchMrwaStatus,
    syncDatasetFromMrwa,
    syncAllDatasets,
    setDownloadProgress,
    setSyncProgress,
    setMrwaStatus,
    setSyncingDatasets,
  };
}

export default useOfflineData;
