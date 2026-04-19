/**
 * Custom hook for home page settings management
 *
 * Manages GPS settings, wind gust threshold, afterCare lookahead, and speed display.
 *
 * @module hooks/useHomeSettings
 */

import { useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GpsSettings {
  ekfEnabled: boolean;
  roadConstraint: boolean;
  maxPredictionTime: number;
  showUncertainty: boolean;
  earlyWarnings: boolean;
  speedLookaheadTime: number;
  gpsLagCompensation: number;
}

interface UseHomeSettingsReturn {
  // Speed display
  showSpeedDisplay: boolean;
  setShowSpeedDisplay: (value: boolean) => void;

  // GPS settings
  gpsSettings: GpsSettings;
  updateGpsSetting: (key: string, value: boolean | number) => void;

  // Wind gust alert
  windGustThreshold: number;
  updateWindGustThreshold: (value: number) => void;

  // AfterCare lookahead
  afterCareLookaheadKm: number;
  updateAfterCareLookaheadKm: (value: number) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_GPS_SETTINGS: GpsSettings = {
  ekfEnabled: true,
  roadConstraint: true,
  maxPredictionTime: 30,
  showUncertainty: true,
  earlyWarnings: true,
  speedLookaheadTime: 5,
  gpsLagCompensation: 0,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHomeSettings(): UseHomeSettingsReturn {
  // Speed display setting (controls visibility on /drive page)
  const [showSpeedDisplay, setShowSpeedDisplay] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showSpeedDisplay') === 'true';
    }
    return false;
  });

  // GPS Enhancement Settings (EKF-based)
  const [gpsSettings, setGpsSettings] = useState<GpsSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gpsSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Migrate old settings to new format
          if ('interpolation' in parsed || 'smoothing' in parsed) {
            return {
              ...DEFAULT_GPS_SETTINGS,
              earlyWarnings: parsed.earlyWarnings ?? true,
            };
          }
          // Add speedLookaheadTime if missing (migration)
          if (!('speedLookaheadTime' in parsed)) {
            return {
              ...parsed,
              speedLookaheadTime: 5,
              gpsLagCompensation: parsed.gpsLagCompensation ?? 0,
            };
          }
          // Add gpsLagCompensation if missing (migration)
          if (!('gpsLagCompensation' in parsed)) {
            return { ...parsed, gpsLagCompensation: 0 };
          }
          return parsed;
        } catch {
          return DEFAULT_GPS_SETTINGS;
        }
      }
    }
    return DEFAULT_GPS_SETTINGS;
  });

  // Wind Gust Alert Settings
  const [windGustThreshold, setWindGustThreshold] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('windGustThreshold');
      if (saved) {
        try {
          return parseInt(saved, 10);
        } catch {
          return 60;
        }
      }
    }
    return 60; // Default 60 km/h
  });

  // AfterCare Lookahead Distance
  const [afterCareLookaheadKm, setAfterCareLookaheadKm] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('afterCareLookaheadKm');
      if (saved) {
        try {
          return parseInt(saved, 10);
        } catch {
          return 5;
        }
      }
    }
    return 5; // Default 5 km
  });

  // Update GPS setting
  const updateGpsSetting = useCallback((key: string, value: boolean | number) => {
    setGpsSettings((prev) => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem('gpsSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  // Update wind gust threshold
  const updateWindGustThreshold = useCallback((value: number) => {
    setWindGustThreshold(value);
    localStorage.setItem('windGustThreshold', value.toString());
  }, []);

  // Update afterCare lookahead
  const updateAfterCareLookaheadKm = useCallback((value: number) => {
    setAfterCareLookaheadKm(value);
    localStorage.setItem('afterCareLookaheadKm', value.toString());
  }, []);

  // Update speed display
  const handleSetShowSpeedDisplay = useCallback((value: boolean) => {
    setShowSpeedDisplay(value);
    localStorage.setItem('showSpeedDisplay', value.toString());
  }, []);

  return {
    showSpeedDisplay,
    setShowSpeedDisplay: handleSetShowSpeedDisplay,
    gpsSettings,
    updateGpsSetting,
    windGustThreshold,
    updateWindGustThreshold,
    afterCareLookaheadKm,
    updateAfterCareLookaheadKm,
  };
}

export default useHomeSettings;
