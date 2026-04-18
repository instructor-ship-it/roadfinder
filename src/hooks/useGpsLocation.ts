/**
 * Custom hook for GPS location management
 *
 * Manages GPS location state and location lookup functionality.
 *
 * @module hooks/useGpsLocation
 */

import { useState, useCallback, useRef } from 'react';
import { findRoadNearGps } from '@/lib/offline-db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GpsRoadInfo {
  road_id: string;
  road_name: string;
  network_type: string;
  slk: number;
}

export interface GpsLocationState {
  gpsLat: string;
  gpsLon: string;
  loadingGps: boolean;
  gpsError: string;
  gpsRoadInfo: GpsRoadInfo | null;
  showGpsDialog: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGpsLocation() {
  const [gpsLat, setGpsLat] = useState<string>('');
  const [gpsLon, setGpsLon] = useState<string>('');
  const [loadingGps, setLoadingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string>('');
  const [gpsRoadInfo, setGpsRoadInfo] = useState<GpsRoadInfo | null>(null);
  const [showGpsDialog, setShowGpsDialog] = useState<boolean>(false);

  // Ref for GPS road lookup callback
  const onGpsLocationFoundRef = useRef<((lat: number, lon: number) => void) | null>(null);

  // Get current GPS location from device
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by this browser');
      return;
    }

    setLoadingGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLat(position.coords.latitude.toFixed(6));
        setGpsLon(position.coords.longitude.toFixed(6));
        setLoadingGps(false);

        // Call the callback if set
        if (onGpsLocationFoundRef.current) {
          onGpsLocationFoundRef.current(position.coords.latitude, position.coords.longitude);
        }
      },
      (err) => {
        setLoadingGps(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGpsError('Location permission denied. Please allow location access.');
            break;
          case err.POSITION_UNAVAILABLE:
            setGpsError('Location information unavailable');
            break;
          case err.TIMEOUT:
            setGpsError('Location request timed out');
            break;
          default:
            setGpsError('An unknown error occurred');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Lookup GPS location to find road
  const lookupGpsLocation = useCallback(async (lat: number, lon: number) => {
    try {
      const result = await findRoadNearGps(lat, lon, 0.5);
      if (result) {
        setGpsRoadInfo({
          road_id: result.road_id,
          road_name: result.road_name,
          network_type: result.network_type,
          slk: result.slk,
        });
        return result;
      }
      return null;
    } catch (error) {
      console.error('GPS lookup failed:', error);
      return null;
    }
  }, []);

  // Set callback for when GPS location is found
  const setOnGpsLocationFound = useCallback((callback: (lat: number, lon: number) => void) => {
    onGpsLocationFoundRef.current = callback;
  }, []);

  // Clear GPS state
  const clearGpsState = useCallback(() => {
    setGpsLat('');
    setGpsLon('');
    setGpsError('');
    setGpsRoadInfo(null);
  }, []);

  return {
    // State
    gpsLat,
    gpsLon,
    loadingGps,
    gpsError,
    gpsRoadInfo,
    showGpsDialog,

    // Actions
    setGpsLat,
    setGpsLon,
    setGpsError,
    setGpsRoadInfo,
    setShowGpsDialog,
    getCurrentLocation,
    lookupGpsLocation,
    setOnGpsLocationFound,
    clearGpsState,
  };
}

export default useGpsLocation;
