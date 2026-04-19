'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStoredRegions } from '@/lib/offline-db';

interface UseRegionsReturn {
  regions: string[];
  selectedRegion: string;
  loadingRegions: boolean;
  error: string;
  updateSelectedRegion: (region: string) => void;
  refreshRegions: () => Promise<void>;
}

/**
 * Custom hook for managing region selection and loading
 * Handles offline fallback and caching
 */
export function useRegions(): UseRegionsReturn {
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const selectedRegionRef = useRef<string>('');
  const [loadingRegions, setLoadingRegions] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Keep ref in sync with state to avoid stale closures in async functions
  const updateSelectedRegion = useCallback((region: string) => {
    selectedRegionRef.current = region;
    setSelectedRegion(region);
  }, []);

  const fetchRegions = useCallback(async () => {
    try {
      // Try IndexedDB first (works offline)
      const storedRegions = await getStoredRegions();
      if (storedRegions && storedRegions.length > 0) {
        setRegions(storedRegions);
        // Check for saved default region first
        const savedDefault = localStorage.getItem('defaultRegion');
        if (savedDefault && storedRegions.includes(savedDefault)) {
          updateSelectedRegion(savedDefault);
        } else if (storedRegions.includes('Wheatbelt')) {
          updateSelectedRegion('Wheatbelt');
        } else {
          updateSelectedRegion(storedRegions[0]);
        }
        setLoadingRegions(false);
        return; // Exit early, no need to fetch from API
      }

      // OFFLINE CHECK: Skip API entirely if no internet connection
      // This prevents the app from hanging while waiting for network timeout
      if (!navigator.onLine) {
        console.log('Offline: Loading regions from static metadata.json');
        const metaResponse = await fetch('/data/metadata.json');
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          if (metaData.regions && metaData.regions.length > 0) {
            setRegions(metaData.regions);
            const savedDefault = localStorage.getItem('defaultRegion');
            if (savedDefault && metaData.regions.includes(savedDefault)) {
              updateSelectedRegion(savedDefault);
            } else if (metaData.regions.includes('Wheatbelt')) {
              updateSelectedRegion('Wheatbelt');
            } else {
              updateSelectedRegion(metaData.regions[0]);
            }
          }
        }
        return;
      }

      // Online: Try API with timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch('/api/roads?action=regions', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();

        // Check for API error response
        if (data.error) {
          console.error('API error fetching regions:', data.error);
          // Try to get regions from static metadata as fallback
          const metaResponse = await fetch('/data/metadata.json');
          if (metaResponse.ok) {
            const metaData = await metaResponse.json();
            if (metaData.regions && metaData.regions.length > 0) {
              setRegions(metaData.regions);
              const savedDefault = localStorage.getItem('defaultRegion');
              if (savedDefault && metaData.regions.includes(savedDefault)) {
                updateSelectedRegion(savedDefault);
              } else {
                updateSelectedRegion(metaData.regions[0]);
              }
            }
          }
          return;
        }

        if (data.regions && data.regions.length > 0) {
          setRegions(data.regions);
          // Check for saved default region first
          const savedDefault = localStorage.getItem('defaultRegion');
          if (savedDefault && data.regions.includes(savedDefault)) {
            updateSelectedRegion(savedDefault);
          } else if (data.regions.includes('Wheatbelt')) {
            updateSelectedRegion('Wheatbelt');
          } else {
            updateSelectedRegion(data.regions[0]);
          }
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        // API timed out or failed - fall back to static metadata
        console.log('API fetch failed, loading regions from static metadata.json');
        const metaResponse = await fetch('/data/metadata.json');
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          if (metaData.regions && metaData.regions.length > 0) {
            setRegions(metaData.regions);
            const savedDefault = localStorage.getItem('defaultRegion');
            if (savedDefault && metaData.regions.includes(savedDefault)) {
              updateSelectedRegion(savedDefault);
            } else if (metaData.regions.includes('Wheatbelt')) {
              updateSelectedRegion('Wheatbelt');
            } else {
              updateSelectedRegion(metaData.regions[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load regions:', err);
      setError('Failed to load regions');
      // Try static metadata as last resort
      try {
        const metaResponse = await fetch('/data/metadata.json');
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          if (metaData.regions && metaData.regions.length > 0) {
            setRegions(metaData.regions);
            updateSelectedRegion(metaData.regions[0]);
          }
        }
      } catch {
        // No regions available - user will only see Local option
      }
    } finally {
      setLoadingRegions(false);
    }
  }, [updateSelectedRegion]);

  // Fetch regions on mount
  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  return {
    regions,
    selectedRegion,
    loadingRegions,
    error,
    updateSelectedRegion,
    refreshRegions: fetchRegions,
  };
}
