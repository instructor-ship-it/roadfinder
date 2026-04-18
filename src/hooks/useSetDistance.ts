/**
 * Custom hook for Set Distance feature
 *
 * Manages distance measurement using GPS tracking.
 *
 * @module hooks/useSetDistance
 */

import { useState, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SetDistanceMark {
  id: number;
  lat: number;
  lon: number;
  distance: number;
  slk: number | null;
  roadName: string | null;
  timestamp: number;
}

export interface SetDistanceRefPoint {
  lat: number;
  lon: number;
}

export interface SetDistanceCurrentPos {
  lat: number;
  lon: number;
}

export interface SetDistanceCurrentRoad {
  road_id: string;
  road_name: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSetDistance() {
  const [active, setActive] = useState<boolean>(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [refPoint, setRefPoint] = useState<SetDistanceRefPoint | null>(null);
  const [currentPos, setCurrentPos] = useState<SetDistanceCurrentPos | null>(null);
  const [currentSlk, setCurrentSlk] = useState<number | null>(null);
  const [currentRoad, setCurrentRoad] = useState<SetDistanceCurrentRoad | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [marks, setMarks] = useState<SetDistanceMark[]>([]);
  const [totalDistance, setTotalDistance] = useState<number>(0);
  const [markId, setMarkId] = useState<number>(0);

  // Refs for GPS callback
  const refPointRef = useRef<SetDistanceRefPoint | null>(null);
  const onPositionUpdateRef = useRef<{
    onUpdate: (lat: number, lon: number) => void;
    onRoadUpdate: (roadId: string, roadName: string, slk: number) => void;
  } | null>(null);

  // Start set distance tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }

    setActive(true);
    setMarks([]);
    setTotalDistance(0);
    setMarkId(0);
    setDistance(0);
    setCurrentSlk(null);
    setCurrentRoad(null);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setCurrentPos({ lat, lon });

        // If we have a reference point, calculate distance
        if (refPointRef.current) {
          const dist = calculateDistance(
            refPointRef.current.lat,
            refPointRef.current.lon,
            lat,
            lon
          );
          setDistance(dist);
        }

        // Call position update callback if set
        if (onPositionUpdateRef.current) {
          onPositionUpdateRef.current.onUpdate(lat, lon);
        }
      },
      (error) => {
        console.error('Set distance GPS error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    setWatchId(id);
  }, []);

  // Stop set distance tracking
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    setActive(false);
    setRefPoint(null);
    refPointRef.current = null;
    setCurrentPos(null);
    setDistance(0);
    setCurrentSlk(null);
    setCurrentRoad(null);
  }, [watchId]);

  // Set reference point
  const setReferencePoint = useCallback((lat: number, lon: number) => {
    setRefPoint({ lat, lon });
    refPointRef.current = { lat, lon };
    setDistance(0);
  }, []);

  // Add a mark at current position
  const addMark = useCallback(
    (lat: number, lon: number, slk: number | null, roadName: string | null) => {
      setMarkId((prev) => {
        const newId = prev + 1;
        const mark: SetDistanceMark = {
          id: newId,
          lat,
          lon,
          distance: distance,
          slk,
          roadName,
          timestamp: Date.now(),
        };

        setMarks((prevMarks) => [...prevMarks, mark]);
        setTotalDistance(distance);

        return newId;
      });
    },
    [distance]
  );

  // Clear all marks
  const clearMarks = useCallback(() => {
    setMarks([]);
    setTotalDistance(0);
    setMarkId(0);
  }, []);

  // Set position update callback
  const setOnPositionUpdate = useCallback(
    (callbacks: {
      onUpdate: (lat: number, lon: number) => void;
      onRoadUpdate: (roadId: string, roadName: string, slk: number) => void;
    }) => {
      onPositionUpdateRef.current = callbacks;
    },
    []
  );

  // Update current road info
  const updateCurrentRoad = useCallback((roadId: string, roadName: string, slk: number) => {
    setCurrentRoad({ road_id: roadId, road_name: roadName });
    setCurrentSlk(slk);

    if (onPositionUpdateRef.current) {
      onPositionUpdateRef.current.onRoadUpdate(roadId, roadName, slk);
    }
  }, []);

  return {
    // State
    setDistanceActive: active,
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
    setReferencePoint,
    addMark,
    clearMarks,
    setOnPositionUpdate,
    updateCurrentRoad,
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
