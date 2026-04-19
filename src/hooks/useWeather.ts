'use client';

import { useState, useCallback } from 'react';
import { haversineDistance } from '@/lib/utils';
import { getCachedWeatherData, cacheWeatherData } from '@/lib/offline-db';

export interface WeatherData {
  location: string;
  current: {
    temp: number;
    humidity: number;
    windSpeed: number;
    windDir: string;
    windGust: number;
    condition: string;
  };
  sun: {
    sunrise: string;
    sunset: string;
    daylightHours: string;
    uvIndex: number;
    uvLevel: string;
  };
  forecast: Array<{
    time: string;
    condition: string;
    temp: number;
    windSpeed: number;
  }>;
  fromCache?: boolean;
  cachedAt?: number;
  cachedLocation?: { lat: number; lon: number };
  dataUnavailable?: boolean;
  source?: string;
}

interface UseWeatherReturn {
  weather: WeatherData | null;
  fetchWeather: (lat: number, lon: number) => Promise<void>;
  setWeather: (weather: WeatherData | null) => void;
}

/**
 * Custom hook for managing weather data fetching and caching
 */
export function useWeather(offlineToggles: { workZoneLookup: boolean }): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Helper to get weather from cache (used for offline fallback)
  const getWeatherFromCache = useCallback((lat: number, lon: number): WeatherData | null => {
    // Try the utility function first (uses 'weatherCache' key)
    const cachedData = getCachedWeatherData(lat, lon, 24 * 60 * 60 * 1000); // Accept up to 24 hours old
    if (cachedData && cachedData.data) {
      return {
        ...cachedData.data,
        fromCache: true,
        cachedAt: cachedData.cached_at ? new Date(cachedData.cached_at).getTime() : undefined,
      };
    }
    // Fallback to the old cache key for backwards compatibility
    const legacyCached = localStorage.getItem('cachedWeather');
    if (legacyCached) {
      try {
        const cachedData = JSON.parse(legacyCached);
        // Check if location is reasonably close (within 50km)
        if (cachedData.cachedLocation) {
          const dist = haversineDistance(
            lat,
            lon,
            cachedData.cachedLocation.lat,
            cachedData.cachedLocation.lon
          );
          if (dist > 50) return null; // Too far from cached location
        }
        return { ...cachedData, fromCache: true };
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const fetchWeather = useCallback(
    async (lat: number, lon: number) => {
      // Check offline toggle first - ON = offline mode (use cached data only)
      if (offlineToggles.workZoneLookup) {
        // OFFLINE MODE: Use cached data only
        const cachedWeather = getWeatherFromCache(lat, lon);
        if (cachedWeather) {
          setWeather({
            ...cachedWeather,
            source: 'Offline: Cached weather data',
          });
        } else {
          // No cached weather available - show clear indicator
          setWeather({
            location: 'Offline Mode',
            current: {
              temp: 0,
              humidity: 0,
              windSpeed: 0,
              windDir: '',
              windGust: 0,
              condition: 'No cached weather data - download required',
            },
            sun: {
              sunrise: 'N/A',
              sunset: 'N/A',
              daylightHours: 'N/A',
              uvIndex: 0,
              uvLevel: 'N/A',
            },
            forecast: [],
            fromCache: true,
            dataUnavailable: true,
            source: 'Offline: No cached data available',
          });
        }
        return;
      }

      // ONLINE MODE: Fetch from API, fall back to cache
      // Also check navigator.onLine as a safety net
      if (!navigator.onLine) {
        const cachedWeather = getWeatherFromCache(lat, lon);
        if (cachedWeather) {
          setWeather({
            ...cachedWeather,
            source: 'Offline: Cached weather data (browser offline)',
          });
        } else {
          setWeather({
            location: 'Offline Mode',
            current: {
              temp: 0,
              humidity: 0,
              windSpeed: 0,
              windDir: '',
              windGust: 0,
              condition: 'Browser offline - no cached data',
            },
            sun: {
              sunrise: 'N/A',
              sunset: 'N/A',
              daylightHours: 'N/A',
              uvIndex: 0,
              uvLevel: 'N/A',
            },
            forecast: [],
            fromCache: true,
            dataUnavailable: true,
            source: 'Offline: Browser offline, no cached data',
          });
        }
        return;
      }

      try {
        const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        if (response.ok) {
          // Cache weather data using the utility function
          cacheWeatherData(lat, lon, data, data.location);
          // Also cache in the old format for backwards compatibility
          data.cachedAt = Date.now();
          data.cachedLocation = { lat, lon };
          localStorage.setItem('cachedWeather', JSON.stringify(data));
          setWeather({
            ...data,
            source: 'Online: Open-Meteo API',
          });
        } else {
          // Try cached weather on API failure
          const cachedWeather = getWeatherFromCache(lat, lon);
          if (cachedWeather) {
            setWeather({
              ...cachedWeather,
              source: 'Cached (API unavailable)',
            });
          } else {
            setWeather({
              location: 'API Error',
              current: {
                temp: 0,
                humidity: 0,
                windSpeed: 0,
                windDir: '',
                windGust: 0,
                condition: 'Weather API unavailable - no cached data',
              },
              sun: {
                sunrise: 'N/A',
                sunset: 'N/A',
                daylightHours: 'N/A',
                uvIndex: 0,
                uvLevel: 'N/A',
              },
              forecast: [],
              dataUnavailable: true,
              source: 'Error: API unavailable, no cached data',
            });
          }
        }
      } catch (err) {
        // Try cached weather on network error
        const cachedWeather = getWeatherFromCache(lat, lon);
        if (cachedWeather) {
          setWeather({
            ...cachedWeather,
            source: 'Cached (network error)',
          });
        } else {
          setWeather({
            location: 'Network Error',
            current: {
              temp: 0,
              humidity: 0,
              windSpeed: 0,
              windDir: '',
              windGust: 0,
              condition: 'Network error - no cached data',
            },
            sun: {
              sunrise: 'N/A',
              sunset: 'N/A',
              daylightHours: 'N/A',
              uvIndex: 0,
              uvLevel: 'N/A',
            },
            forecast: [],
            dataUnavailable: true,
            source: 'Error: Network error, no cached data',
          });
        }
      }
    },
    [offlineToggles.workZoneLookup, getWeatherFromCache]
  );

  return {
    weather,
    fetchWeather,
    setWeather,
  };
}
