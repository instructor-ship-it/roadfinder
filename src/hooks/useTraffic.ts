'use client';

import { useState, useCallback } from 'react';

export interface TrafficData {
  road_id: string;
  aadt?: number;
  heavy_vehicle_pct?: number;
  peak_hours?: {
    morning: string;
    evening: string;
  };
  nearby_counters?: Array<{
    id: string;
    name: string;
    aadt: number;
    distance_km: number;
  }>;
  cachedAt?: number;
  fromCache?: boolean;
}

interface UseTrafficReturn {
  traffic: TrafficData | null;
  fetchTraffic: (roadId: string, lat?: number, lon?: number) => Promise<void>;
  setTraffic: (traffic: TrafficData | null) => void;
}

/**
 * Custom hook for managing traffic data fetching and caching
 */
export function useTraffic(): UseTrafficReturn {
  const [traffic, setTraffic] = useState<TrafficData | null>(null);

  const fetchTraffic = useCallback(async (roadId: string, lat?: number, lon?: number) => {
    try {
      let url = `/api/traffic?road_id=${roadId}`;
      if (lat && lon) {
        url += `&lat=${lat}&lon=${lon}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        // Cache traffic data
        data.cachedAt = Date.now();
        localStorage.setItem(`traffic_${roadId}`, JSON.stringify(data));
        setTraffic(data);
      } else {
        // Try cached traffic on API failure
        const cached = localStorage.getItem(`traffic_${roadId}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          cachedData.fromCache = true;
          setTraffic(cachedData);
        }
      }
    } catch (err) {
      // Try cached traffic on network error
      const cached = localStorage.getItem(`traffic_${roadId}`);
      if (cached) {
        const cachedData = JSON.parse(cached);
        cachedData.fromCache = true;
        setTraffic(cachedData);
      }
    }
  }, []);

  return {
    traffic,
    fetchTraffic,
    setTraffic,
  };
}
