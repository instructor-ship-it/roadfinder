/**
 * Custom hook for Set Distance feature
 *
 * Manages distance measurement using GPS tracking with road lookup support.
 *
 * @module hooks/useSetDistance
 */

import { useState, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SetDistanceMark {
  id: number;
  distance: number; // meters from reference
  slk: number | null;
  roadId: string | null;
  roadName: string | null;
  timestamp: string;
}

export interface SetDistanceRefPoint {
  lat: number;
  lon: number;
  slk: number;
  roadId: string | null;
  roadName: string | null;
}

export interface SetDistanceCurrentRoad {
  roadId: string;
  roadName: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSetDistance() {
  // State
  const [active, setActive] = useState<boolean>(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [refPoint, setRefPoint] = useState<SetDistanceRefPoint | null>(null);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lon: number } | null>(null);
  const [currentSlk, setCurrentSlk] = useState<number | null>(null);
  const [currentRoad, setCurrentRoad] = useState<SetDistanceCurrentRoad | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [marks, setMarks] = useState<SetDistanceMark[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [markId, setMarkId] = useState<number>(0);

  // Ref for reference point to avoid closure staleness in watchPosition
  const refPointRef = useRef<{ lat: number; lon: number } | null>(null);

  // Start Set Distance tracking
  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('GPS not available');
      return;
    }

    setActive(true);

    // Get current position to set as reference
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setCurrentPos({ lat, lon });

        // Try to get road info for current position
        try {
          const response = await fetch(`/api/gps?lat=${lat}&lon=${lon}`);
          const data = await response.json();

          if (data.road_id && data.slk !== undefined) {
            // Set reference point with road info
            setRefPoint({
              lat,
              lon,
              slk: data.slk,
              roadId: data.road_id,
              roadName: data.road_name || data.road_id,
            });
            refPointRef.current = { lat, lon };
            setCurrentSlk(data.slk);
            setCurrentRoad({
              roadId: data.road_id,
              roadName: data.road_name || data.road_id,
            });
          } else {
            // No road found, just use GPS position
            setRefPoint({
              lat,
              lon,
              slk: 0,
              roadId: null,
              roadName: null,
            });
            refPointRef.current = { lat, lon };
          }
        } catch (err) {
          // Use GPS position without road info
          setRefPoint({
            lat,
            lon,
            slk: 0,
            roadId: null,
            roadName: null,
          });
          refPointRef.current = { lat, lon };
        }
      },
      (err) => {
        alert('Could not get GPS position: ' + err.message);
        setActive(false);
      },
      { enableHighAccuracy: true }
    );

    // Start watching position
    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setCurrentPos({ lat, lon });

        // Calculate distance from reference (use ref to avoid stale closure)
        if (refPointRef.current) {
          const dist = calculateDistance(
            refPointRef.current.lat,
            refPointRef.current.lon,
            lat,
            lon
          );
          setDistance(dist);
        }

        // Try to get road info
        try {
          const response = await fetch(`/api/gps?lat=${lat}&lon=${lon}`);
          const data = await response.json();

          if (data.road_id && data.slk !== undefined) {
            setCurrentSlk(data.slk);
            setCurrentRoad({
              roadId: data.road_id,
              roadName: data.road_name || data.road_id,
            });
          }
        } catch {
          // Silently fail - might be offline
        }
      },
      (err) => {
        console.error('GPS watch error:', err);
      },
      { enableHighAccuracy: true, maximumAge: 1000 }
    );

    setWatchId(id);
  }, []);

  // Set current position as new reference (reset trip meter to 0)
  const setReference = useCallback(() => {
    if (currentPos) {
      setRefPoint({
        lat: currentPos.lat,
        lon: currentPos.lon,
        slk: currentSlk || 0,
        roadId: currentRoad?.roadId || null,
        roadName: currentRoad?.roadName || null,
      });
      refPointRef.current = {
        lat: currentPos.lat,
        lon: currentPos.lon,
      };
      setDistance(0);
    }
  }, [currentPos, currentSlk, currentRoad]);

  // Mark current position
  const markPosition = useCallback(() => {
    if (!currentPos) return;

    const newMark: SetDistanceMark = {
      id: markId,
      distance: distance,
      slk: currentSlk,
      roadId: currentRoad?.roadId || null,
      roadName: currentRoad?.roadName || null,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Calculate total distance (sum of all mark distances from reference)
    const newTotal = totalDistance + distance;

    setMarks((prev) => [...prev, newMark]);
    setTotalDistance(newTotal);
    setMarkId((prev) => prev + 1);

    // Reset reference to current position for next mark
    setReference();
  }, [currentPos, distance, currentSlk, currentRoad, markId, totalDistance, setReference]);

  // Reset completely
  const reset = useCallback(() => {
    setMarks([]);
    setTotalDistance(0);
    setDistance(0);
    setMarkId(0);
    if (currentPos) {
      setReference();
    }
  }, [currentPos, setReference]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    setActive(false);
    setWatchId(null);
    setCurrentPos(null);
    setDistance(0);
    setCurrentSlk(null);
    setCurrentRoad(null);
  }, [watchId]);

  return {
    // State
    setDistanceActive: active,
    setDistanceWatchId: watchId,
    setDistanceRefPoint: refPoint,
    setDistanceCurrentPos: currentPos,
    setDistanceCurrentSlk: currentSlk,
    setDistanceCurrentRoad: currentRoad,
    setDistanceDistance: distance,
    setDistanceMarks: marks,
    setDistanceTotalDistance: totalDistance,
    setDistanceMarkId: markId,

    // Actions
    setSetDistanceActive: setActive,
    startSetDistance: startTracking,
    stopSetDistance: stopTracking,
    setSetDistanceReference: setReference,
    markSetDistancePosition: markPosition,
    resetSetDistance: reset,
  };
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

export default useSetDistance;
