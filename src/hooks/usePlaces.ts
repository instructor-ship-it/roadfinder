'use client';

import { useState, useCallback } from 'react';
import { findNearestAmenities } from '@/lib/offline-db';

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
  hospitalType?: string; // 'Public' | 'Private' | 'Nursing Post'
  hospitalCategory?: string; // e.g. 'Acute Hospital', 'Nursing Post'
  beds?: number;
  suburb?: string;
  // Fuel station-specific (from FuelWatch WA)
  fuelBrand?: string;
  fuelPrice?: number; // cents per litre (e.g. 231.3 = $2.313/L)
  fuelDate?: string; // date of price
  siteFeatures?: string[]; // e.g. ['Open 24 hours', 'Toilets', 'ATM']
  // Toilet-specific (from National Public Toilet Map)
  toiletType?: string; // e.g. 'Park or reserve', 'Service station', 'Community building'
  openingHours?: string;
  wheelchair?: boolean;
  toiletNote?: string;
  toiletUrl?: string;
  toiletSource?: string; // 'NationalToiletMap' | 'OpenStreetMap'
}

export interface PlacesData {
  hospital: Place | null;
  toilet: Place | null;
  fuelStation: Place | null;
  fromCache?: boolean;
  cachedAt?: number;
  cachedLocation?: { lat: number; lon: number };
  source?: string;
  dataUnavailable?: boolean; // True when offline mode but no cached data available
  // Enhanced source tracking
  hospitalSource?: string; // e.g. 'WA Health SLIP' | 'Overpass API'
  fuelSource?: string; // e.g. 'FuelWatch WA' | 'Overpass API'
}

interface UsePlacesReturn {
  places: PlacesData | null;
  fetchPlaces: (lat: number, lon: number) => Promise<void>;
  setPlaces: (places: PlacesData | null) => void;
}

/**
 * Custom hook for managing places/amenities data fetching and caching
 */
export function usePlaces(offlineToggles: { amenities: boolean }): UsePlacesReturn {
  const [places, setPlaces] = useState<PlacesData | null>(null);

  // Helper to get places from IndexedDB (used for offline fallback)
  const getPlacesFromIndexedDB = useCallback(
    async (lat: number, lon: number): Promise<PlacesData | null> => {
      try {
        // Use 100km radius for rural WA (matching the online API behavior)
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

  const fetchPlaces = useCallback(
    async (lat: number, lon: number) => {
      // Helper: return cached data from localStorage or IndexedDB
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

      // OFFLINE MODE: Use cached data only
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

      // ONLINE MODE: Fetch from three sources in parallel
      let hospital: Place | null = null;
      let hospitalSource = '';
      let fuelStation: Place | null = null;
      let fuelSource = '';
      let toilet: Place | null = null;
      let toiletSource = '';

      try {
        // 1. Hospital from WA Health SLIP Services
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
          console.log('WA Health SLIP hospital query failed, will try Overpass fallback:', e);
        }

        // 2. Fuel station from FuelWatch WA + Overpass merge
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
          // Fallback to Overpass via /api/places
          try {
            const placesRes = await fetch(`/api/places?lat=${lat}&lon=${lon}`);
            if (placesRes.ok) {
              const placesData = await placesRes.json();
              if (!toilet && placesData.toilet) {
                toilet = placesData.toilet;
                toiletSource = 'OpenStreetMap (fallback)';
              }
              // Use Overpass as fallback for hospital if SLIP failed
              if (!hospital && placesData.hospital) {
                hospital = placesData.hospital;
                hospitalSource = 'OpenStreetMap';
              }
            }
          } catch (e2) {
            console.log('Overpass toilet fallback failed:', e2);
          }
        }

        // If all three sources failed, try cache
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

        // Build source string
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

        // Cache the result
        localStorage.setItem('cachedPlaces', JSON.stringify(result));
        setPlaces(result);
      } catch (err) {
        // Last resort: cache
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
    [offlineToggles.amenities, getPlacesFromIndexedDB]
  );

  return {
    places,
    fetchPlaces,
    setPlaces,
  };
}
