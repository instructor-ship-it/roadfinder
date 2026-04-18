/**
 * Weather Cache Operations
 *
 * Contains weather caching functions using localStorage.
 *
 * @module lib/offline-db/weather-cache
 */

import { haversineDistance } from '@/lib/utils';
import type { CachedWeather } from './types';

// Re-export CachedWeather for backward compatibility
export type { CachedWeather } from './types';

export const WEATHER_CACHE_KEY = 'weatherCache';
export const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in ms

/**
 * Cache weather data
 */
export function cacheWeatherData(lat: number, lon: number, data: any, location?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const cache: CachedWeather = {
      lat,
      lon,
      data,
      cached_at: new Date().toISOString(),
      location,
    };
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to cache weather data:', e);
  }
}

/**
 * Get cached weather data if still valid
 */
export function getCachedWeatherData(
  lat: number,
  lon: number,
  maxAgeMs: number = WEATHER_CACHE_DURATION
): {
  data: any;
  cached_at: string;
  age_minutes: number;
  is_stale: boolean;
} | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!stored) return null;

    const cache: CachedWeather = JSON.parse(stored);

    // Check if location is close enough (within 10km)
    const dist = haversineDistance(lat, lon, cache.lat, cache.lon);
    if (dist > 10) return null; // Too far from cached location

    const cachedTime = new Date(cache.cached_at).getTime();
    const now = Date.now();
    const ageMs = now - cachedTime;
    const ageMinutes = Math.round(ageMs / 60000);

    return {
      data: cache.data,
      cached_at: cache.cached_at,
      age_minutes: ageMinutes,
      is_stale: ageMs > maxAgeMs,
    };
  } catch {
    return null;
  }
}

/**
 * Clear weather cache
 */
export function clearWeatherCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WEATHER_CACHE_KEY);
}
