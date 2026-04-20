'use client';

import { useState, useCallback } from 'react';

interface CollapsibleSections {
  showTraffic: boolean;
  showSignageCorridor: boolean;
  showSpeedZoneLayout: boolean;
  showTcPositions: boolean;
  showIntersections: boolean;
  showWeather: boolean;
  showAmenities: boolean;
  toggleTraffic: () => void;
  toggleSignageCorridor: () => void;
  toggleSpeedZoneLayout: () => void;
  toggleTcPositions: () => void;
  toggleIntersections: () => void;
  toggleWeather: () => void;
  toggleAmenities: () => void;
}

/**
 * Custom hook for managing collapsible section state
 * Centralizes all section toggle state in one place
 */
export function useCollapsibleSections(): CollapsibleSections {
  const [showTraffic, setShowTraffic] = useState(true);
  const [showSignageCorridor, setShowSignageCorridor] = useState(true);
  const [showSpeedZoneLayout, setShowSpeedZoneLayout] = useState(true);
  const [showTcPositions, setShowTcPositions] = useState(true);
  const [showIntersections, setShowIntersections] = useState(true);
  const [showWeather, setShowWeather] = useState(true);
  const [showAmenities, setShowAmenities] = useState(true);

  const toggleTraffic = useCallback(() => setShowTraffic((v) => !v), []);
  const toggleSignageCorridor = useCallback(() => setShowSignageCorridor((v) => !v), []);
  const toggleSpeedZoneLayout = useCallback(() => setShowSpeedZoneLayout((v) => !v), []);
  const toggleTcPositions = useCallback(() => setShowTcPositions((v) => !v), []);
  const toggleIntersections = useCallback(() => setShowIntersections((v) => !v), []);
  const toggleWeather = useCallback(() => setShowWeather((v) => !v), []);
  const toggleAmenities = useCallback(() => setShowAmenities((v) => !v), []);

  return {
    showTraffic,
    showSignageCorridor,
    showSpeedZoneLayout,
    showTcPositions,
    showIntersections,
    showWeather,
    showAmenities,
    toggleTraffic,
    toggleSignageCorridor,
    toggleSpeedZoneLayout,
    toggleTcPositions,
    toggleIntersections,
    toggleWeather,
    toggleAmenities,
  };
}
