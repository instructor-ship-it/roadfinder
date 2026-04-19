/**
 * Custom hook for work zone data fetching
 *
 * Extracts all fetch functions from page.tsx for better maintainability.
 * Handles weather, traffic, places, warnings, and cross roads fetching.
 *
 * @module hooks/useWorkZoneFetch
 */

import { useCallback } from 'react';
import { haversineDistance } from '@/lib/utils';
import {
  getSpeedZones,
  findNearestAmenities,
  cacheWeatherData,
  getCachedWeatherData,
} from '@/lib/offline-db';
import { WeatherData, TrafficData, WarningData } from '@/types/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Place {
  name: string;
  distance: string;
  lat: number;
  lon: number;
  phone?: string;
  address?: string;
  googleMapsUrl: string;
  isEmergency?: boolean;
  // Hospital-specific (from WA Health SLIP)
  hospitalType?: string;
  hospitalCategory?: string;
  beds?: number;
  suburb?: string;
  // Fuel station-specific (from FuelWatch WA)
  fuelBrand?: string;
  fuelPrice?: number;
  fuelDate?: string;
  siteFeatures?: string[];
  // Toilet-specific (from National Public Toilet Map)
  toiletType?: string;
  openingHours?: string;
  wheelchair?: boolean;
  toiletNote?: string;
  toiletUrl?: string;
  toiletSource?: string;
}

export interface PlacesData {
  hospital: Place | null;
  toilet: Place | null;
  fuelStation: Place | null;
  fromCache?: boolean;
  cachedAt?: number;
  cachedLocation?: { lat: number; lon: number };
  source?: string;
  dataUnavailable?: boolean;
  hospitalSource?: string;
  fuelSource?: string;
}

export interface CrossRoad {
  name: string;
  distance: string;
  lat: number;
  lon: number;
  roadType: string;
  googleMapsUrl: string;
  intersectionSlk?: number;
}

interface WorkZoneResult {
  road_id: string;
  road_name: string;
  work_zone: {
    start_slk: number;
    end_slk: number;
  };
}

interface UseWorkZoneFetchOptions {
  offlineToggles: {
    workZoneLookup: boolean;
    amenities: boolean;
  };
  setWeather: (weather: WeatherData | null) => void;
  setTraffic: (traffic: TrafficData | null) => void;
  setPlaces: (places: PlacesData | null) => void;
  setWarnings: (warnings: WarningData | null) => void;
  setCrossRoads: (roads: CrossRoad[]) => void;
  setCorridorIntersections: (roads: CrossRoad[]) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkZoneFetch({
  offlineToggles,
  setWeather,
  setTraffic,
  setPlaces,
  setWarnings,
  setCrossRoads,
  setCorridorIntersections,
}: UseWorkZoneFetchOptions) {
  // Helper to get weather from cache
  const getWeatherFromCache = useCallback((lat: number, lon: number): WeatherData | null => {
    const cachedData = getCachedWeatherData(lat, lon, 24 * 60 * 60 * 1000);
    if (cachedData && cachedData.data) {
      return {
        ...cachedData.data,
        fromCache: true,
        cachedAt: cachedData.cached_at ? new Date(cachedData.cached_at).getTime() : undefined,
      };
    }
    const legacyCached = localStorage.getItem('cachedWeather');
    if (legacyCached) {
      try {
        const cachedData = JSON.parse(legacyCached);
        if (cachedData.cachedLocation) {
          const dist = haversineDistance(
            lat,
            lon,
            cachedData.cachedLocation.lat,
            cachedData.cachedLocation.lon
          );
          if (dist > 50) return null;
        }
        return { ...cachedData, fromCache: true };
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Fetch weather data
  const fetchWeather = useCallback(
    async (lat: number, lon: number) => {
      const setOfflineUnavailable = (reason: string) => {
        setWeather({
          location: 'Offline Mode',
          current: {
            temp: 0,
            humidity: 0,
            windSpeed: 0,
            windDir: '',
            windGust: 0,
            condition: reason,
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
          source: `Offline: ${reason}`,
        });
      };

      // OFFLINE MODE
      if (offlineToggles.workZoneLookup) {
        const cachedWeather = getWeatherFromCache(lat, lon);
        if (cachedWeather) {
          setWeather({
            ...cachedWeather,
            source: 'Offline: Cached weather data',
          });
        } else {
          setOfflineUnavailable('No cached weather data - download required');
        }
        return;
      }

      // ONLINE MODE
      if (!navigator.onLine) {
        const cachedWeather = getWeatherFromCache(lat, lon);
        if (cachedWeather) {
          setWeather({
            ...cachedWeather,
            source: 'Offline: Cached weather data (browser offline)',
          });
        } else {
          setOfflineUnavailable('Browser offline - no cached data');
        }
        return;
      }

      try {
        const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const data = await response.json();
        if (response.ok) {
          cacheWeatherData(lat, lon, data, data.location);
          data.cachedAt = Date.now();
          data.cachedLocation = { lat, lon };
          localStorage.setItem('cachedWeather', JSON.stringify(data));
          setWeather({
            ...data,
            source: 'Online: Open-Meteo API',
          });
        } else {
          const cachedWeather = getWeatherFromCache(lat, lon);
          if (cachedWeather) {
            setWeather({ ...cachedWeather, source: 'Cached (API unavailable)' });
          } else {
            setOfflineUnavailable('API unavailable, no cached data');
          }
        }
      } catch {
        const cachedWeather = getWeatherFromCache(lat, lon);
        if (cachedWeather) {
          setWeather({ ...cachedWeather, source: 'Cached (network error)' });
        } else {
          setOfflineUnavailable('Network error - no cached data');
        }
      }
    },
    [offlineToggles.workZoneLookup, getWeatherFromCache, setWeather]
  );

  // Fetch traffic data
  const fetchTraffic = useCallback(
    async (roadId: string, lat?: number, lon?: number) => {
      try {
        let url = `/api/traffic?road_id=${roadId}`;
        if (lat && lon) {
          url += `&lat=${lat}&lon=${lon}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
          data.cachedAt = Date.now();
          localStorage.setItem(`traffic_${roadId}`, JSON.stringify(data));
          setTraffic(data);
        } else {
          const cached = localStorage.getItem(`traffic_${roadId}`);
          if (cached) {
            const cachedData = JSON.parse(cached);
            cachedData.fromCache = true;
            setTraffic(cachedData);
          }
        }
      } catch {
        const cached = localStorage.getItem(`traffic_${roadId}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          cachedData.fromCache = true;
          setTraffic(cachedData);
        }
      }
    },
    [setTraffic]
  );

  // Helper to get places from IndexedDB
  const getPlacesFromIndexedDB = useCallback(
    async (lat: number, lon: number): Promise<PlacesData | null> => {
      try {
        const amenities = await findNearestAmenities(lat, lon, undefined, 100);
        if (amenities.hospital || amenities.fuelStation || amenities.toilet) {
          return {
            hospital: amenities.hospital
              ? {
                  name: amenities.hospital.name,
                  distance: amenities.hospital.distance?.toFixed(1) || '',
                  lat: amenities.hospital.lat,
                  lon: amenities.hospital.lon,
                  phone: amenities.hospital.phone,
                  address: amenities.hospital.address,
                  googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${amenities.hospital.lat},${amenities.hospital.lon}`,
                  isEmergency: amenities.hospital.emergency,
                }
              : null,
            fuelStation: amenities.fuelStation
              ? {
                  name: amenities.fuelStation.name,
                  distance: amenities.fuelStation.distance?.toFixed(1) || '',
                  lat: amenities.fuelStation.lat,
                  lon: amenities.fuelStation.lon,
                  phone: amenities.fuelStation.phone,
                  address: amenities.fuelStation.address,
                  googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${amenities.fuelStation.lat},${amenities.fuelStation.lon}`,
                  isEmergency: false,
                }
              : null,
            toilet: amenities.toilet
              ? {
                  name: amenities.toilet.name,
                  distance: amenities.toilet.distance?.toFixed(1) || '',
                  lat: amenities.toilet.lat,
                  lon: amenities.toilet.lon,
                  phone: amenities.toilet.phone,
                  address: amenities.toilet.address,
                  googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${amenities.toilet.lat},${amenities.toilet.lon}`,
                  isEmergency: false,
                }
              : null,
            source: 'Offline: IndexedDB cached data',
            fromCache: true,
          };
        }
      } catch (err) {
        console.log('Could not load amenities from IndexedDB:', err);
      }
      return null;
    },
    []
  );

  // Fetch places (hospital, fuel, toilet)
  const fetchPlaces = useCallback(
    async (lat: number, lon: number) => {
      const getCachedPlaces = async (): Promise<PlacesData | null> => {
        const indexedDBPlaces = await getPlacesFromIndexedDB(lat, lon);
        if (indexedDBPlaces) return indexedDBPlaces;
        const cached = localStorage.getItem('cachedPlaces');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            return null;
          }
        }
        return null;
      };

      const setOfflineUnavailable = () => {
        setPlaces({
          hospital: null,
          toilet: null,
          fuelStation: null,
          fromCache: true,
          dataUnavailable: true,
          source: 'Offline: No cached amenities data - download required',
        });
      };

      // OFFLINE MODE
      if (offlineToggles.amenities || !navigator.onLine) {
        const cached = await getCachedPlaces();
        if (cached) {
          setPlaces({
            ...cached,
            fromCache: true,
            source: offlineToggles.amenities
              ? 'Offline: Cached data'
              : 'Offline: Cached data (browser offline)',
          });
        } else {
          setOfflineUnavailable();
        }
        return;
      }

      // ONLINE MODE - Fetch from three sources
      let hospital: Place | null = null;
      let hospitalSource = '';
      let fuelStation: Place | null = null;
      let fuelSource = '';
      let toilet: Place | null = null;
      let toiletSource = '';

      try {
        // 1. Hospital from WA Health SLIP
        try {
          const hospRes = await fetch(`/api/nearest-hospital?lat=${lat}&lon=${lon}&radius=100`);
          if (hospRes.ok) {
            const hospData = await hospRes.json();
            const h = hospData.nearestHospital;
            if (h) {
              hospital = {
                name: h.name,
                distance: (h.distanceM / 1000).toFixed(1),
                lat: h.lat,
                lon: h.lon,
                phone: h.phone || undefined,
                address: h.address ? `${h.address}${h.suburb ? `, ${h.suburb}` : ''}` : undefined,
                googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`,
                isEmergency: h.hasED,
                hospitalType: h.type === 'Nursing Post' ? 'Nursing Post' : h.type,
                hospitalCategory: h.category || undefined,
                beds: h.beds || undefined,
                suburb: h.suburb || undefined,
              };
              hospitalSource = 'WA Health SLIP';
            }
          }
        } catch (e) {
          console.log('WA Health SLIP hospital query failed:', e);
        }

        // 2. Fuel station from FuelWatch WA + Overpass
        try {
          const fuelRes = await fetch(`/api/fuel-stations?lat=${lat}&lon=${lon}&radius=100`);
          if (fuelRes.ok) {
            const fuelData = await fuelRes.json();
            const f = fuelData.nearest;
            if (f) {
              fuelStation = {
                name: f.name,
                distance: String(f.distanceKm),
                lat: f.lat,
                lon: f.lon,
                phone: f.phone || undefined,
                address: [f.address, f.location].filter(Boolean).join(', ') || undefined,
                googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lon}`,
                fuelBrand: f.brand || undefined,
                fuelPrice: f.price || undefined,
                fuelDate: f.date || undefined,
                siteFeatures: f.siteFeatures || [],
              };
              fuelSource = f.source === 'OpenStreetMap' ? 'OpenStreetMap' : 'FuelWatch WA';
            }
          }
        } catch (e) {
          console.log('Fuel station query failed:', e);
        }

        // 3. Toilets from National Public Toilet Map
        try {
          const toiletRes = await fetch(`/api/toilets?lat=${lat}&lon=${lon}`);
          if (toiletRes.ok) {
            const toiletData = await toiletRes.json();
            if (toiletData.nearest) {
              const t = toiletData.nearest;
              toilet = {
                name: t.name,
                distance: String(t.distanceKm),
                lat: t.lat,
                lon: t.lon,
                googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lon}`,
                toiletType: t.facilityType,
                openingHours: t.openingHours || undefined,
                wheelchair: t.accessible || t.wheelchair || false,
                toiletNote: t.toiletNote || undefined,
                toiletUrl: t.url || undefined,
                toiletSource: t.source || 'NationalToiletMap',
              };
              toiletSource =
                t.source === 'NationalToiletMap' ? 'National Toilet Map' : 'OpenStreetMap';
            }
          }
        } catch (e) {
          console.log('Toilet map query failed:', e);
          // Fallback to Overpass
          try {
            const placesRes = await fetch(`/api/places?lat=${lat}&lon=${lon}`);
            if (placesRes.ok) {
              const placesData = await placesRes.json();
              if (!toilet && placesData.toilet) {
                toilet = placesData.toilet;
                toiletSource = 'OpenStreetMap (fallback)';
              }
              if (!hospital && placesData.hospital) {
                hospital = placesData.hospital;
                hospitalSource = 'OpenStreetMap';
              }
            }
          } catch (e2) {
            console.log('Overpass fallback failed:', e2);
          }
        }

        // If all failed, try cache
        if (!hospital && !fuelStation && !toilet) {
          const cached = await getCachedPlaces();
          if (cached) {
            setPlaces({ ...cached, source: 'Cached (all APIs unavailable)' });
            return;
          }
          setPlaces({
            hospital: null,
            toilet: null,
            fuelStation: null,
            dataUnavailable: true,
            source: 'Error: All data sources unavailable, no cached data',
          });
          return;
        }

        // Build result
        const sources: string[] = [];
        if (hospitalSource) sources.push(`Hospital: ${hospitalSource}`);
        if (fuelSource) sources.push(`Fuel: ${fuelSource}`);
        if (toiletSource) sources.push(`Toilet: ${toiletSource}`);

        const result: PlacesData = {
          hospital,
          fuelStation,
          toilet,
          hospitalSource,
          fuelSource,
          cachedAt: Date.now(),
          cachedLocation: { lat, lon },
          source: sources.length > 0 ? `Online: ${sources.join(' | ')}` : 'Online',
        };

        localStorage.setItem('cachedPlaces', JSON.stringify(result));
        setPlaces(result);
      } catch {
        const cached = await getCachedPlaces();
        if (cached) {
          setPlaces({ ...cached, source: 'Cached (error)' });
        } else {
          setPlaces({
            hospital: null,
            toilet: null,
            fuelStation: null,
            dataUnavailable: true,
            source: 'Error: Network error, no cached data',
          });
        }
      }
    },
    [offlineToggles.amenities, getPlacesFromIndexedDB, setPlaces]
  );

  // Fetch weather warnings
  const fetchWarnings = useCallback(async () => {
    try {
      const response = await fetch('/api/warnings');
      const data = await response.json();
      if (response.ok) setWarnings(data);
    } catch {
      // Graceful degradation - warnings not critical
    }
  }, [setWarnings]);

  // Fetch cross roads (intersections)
  const fetchCrossRoads = useCallback(
    async (result: WorkZoneResult) => {
      try {
        // Fetch intersections for TC zone (±100m)
        const tcResponse = await fetch(
          `/api/intersections?road_id=${result.road_id}&slk_start=${result.work_zone.start_slk}&slk_end=${result.work_zone.end_slk}&range=0.1`
        );
        const tcData = await tcResponse.json();
        if (tcResponse.ok) setCrossRoads(tcData.crossRoads || []);

        // Fetch intersections for signage corridor (±700m)
        const corridorResponse = await fetch(
          `/api/intersections?road_id=${result.road_id}&slk_start=${result.work_zone.start_slk}&slk_end=${result.work_zone.end_slk}&range=0.7`
        );
        const corridorData = await corridorResponse.json();
        if (corridorResponse.ok) setCorridorIntersections(corridorData.crossRoads || []);
      } catch (err) {
        console.warn('[fetchCrossRoads] Failed to fetch intersections:', err);
      }
    },
    [setCrossRoads, setCorridorIntersections]
  );

  return {
    fetchWeather,
    fetchTraffic,
    fetchPlaces,
    fetchWarnings,
    fetchCrossRoads,
    getWeatherFromCache,
  };
}

export default useWorkZoneFetch;
