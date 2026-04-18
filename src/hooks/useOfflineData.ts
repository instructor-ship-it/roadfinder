/**
 * Custom hook for offline data management
 *
 * Manages offline data state, downloads, and synchronization.
 *
 * @module hooks/useOfflineData
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isOfflineDataAvailable,
  getOfflineMetadata,
  clearOfflineData,
  getDetailedStats,
} from '@/lib/offline-db';

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
  const [mrwaStatus, setMrwaStatus] = useState<unknown>(null);
  const [syncingDatasets, setSyncingDatasets] = useState<Set<string>>(new Set());

  // Check offline data availability on mount
  useEffect(() => {
    const checkOfflineData = async () => {
      const available = await isOfflineDataAvailable();
      setOfflineReady(available);

      if (available) {
        const metadata = await getOfflineMetadata();
        if (metadata) {
          setOfflineStats({
            total_roads: metadata.total_roads,
            download_date: metadata.download_date || '',
          });
        }

        // Get detailed stats for dataset stats
        const stats = await getDetailedStats();
        setDatasetStats(stats);
      }
    };

    checkOfflineData();
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

  // Download offline data
  const downloadOfflineData = useCallback(
    async (
      onProgress?: (message: string) => void,
      storeDataCallback?: (
        region: string,
        roads: unknown[],
        speedZones: unknown[],
        railCrossings?: unknown[],
        regulatorySigns?: unknown[],
        warningSigns?: unknown[]
      ) => Promise<void>
    ) => {
      setDownloading(true);
      setDownloadProgress('Initializing...');

      try {
        // This would need to be implemented based on the actual download logic in page.tsx
        // For now, just a placeholder
        setDownloadProgress('Download functionality requires integration with page.tsx');
        return { success: false, error: 'Not implemented - use page.tsx implementation' };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setDownloadProgress(`Error: ${message}`);
        return { success: false, error: message };
      } finally {
        setDownloading(false);
      }
    },
    []
  );

  // Clear offline data
  const clearOfflineDataHandler = useCallback(async () => {
    try {
      await clearOfflineData();
      setOfflineReady(false);
      setOfflineStats(null);
      setDatasetStats(null);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }, []);

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
    downloadOfflineData,
    clearOfflineData: clearOfflineDataHandler,
    setDownloadProgress,
    setSyncProgress,
    setMrwaStatus,
    setSyncingDatasets,
  };
}

export default useOfflineData;
