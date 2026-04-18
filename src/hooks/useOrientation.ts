'use client';

import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';

interface OrientationInfo {
  orientation: Orientation;
  isLandscape: boolean;
  isPortrait: boolean;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Hook to detect screen orientation
 * Returns orientation info and helper booleans
 */
export function useOrientation(): OrientationInfo {
  const [orientationInfo, setOrientationInfo] = useState<OrientationInfo>(() => {
    // Initial state (SSR safe)
    if (typeof window === 'undefined') {
      return {
        orientation: 'portrait',
        isLandscape: false,
        isPortrait: true,
        screenWidth: 0,
        screenHeight: 0,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isLandscape = width > height;

    return {
      orientation: isLandscape ? 'landscape' : 'portrait',
      isLandscape,
      isPortrait: !isLandscape,
      screenWidth: width,
      screenHeight: height,
    };
  });

  useEffect(() => {
    const updateOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;

      setOrientationInfo({
        orientation: isLandscape ? 'landscape' : 'portrait',
        isLandscape,
        isPortrait: !isLandscape,
        screenWidth: width,
        screenHeight: height,
      });
    };

    // Listen for resize events
    window.addEventListener('resize', updateOrientation);

    // Listen for orientation change events (mobile)
    window.addEventListener('orientationchange', updateOrientation);

    // Also use matchMedia for more reliable detection
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handleChange = () => updateOrientation();

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Initial check
    updateOrientation();

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);

      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return orientationInfo;
}
