/**
 * Tests for useGpsTracking hook
 *
 * Tests the GPS tracking functionality with mocked geolocation API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mocks ─────────────────────────────────────────────────────────────────

// Mock the offline-db functions used by the hook
vi.mock('../lib/offline-db', () => ({
  findRoadNearGps: vi.fn().mockResolvedValue(null),
  getSpeedZones: vi.fn().mockResolvedValue([]),
  getSpeedLimitForDirection: vi.fn().mockReturnValue({
    speedLimit: 100,
    zone: null,
    hasDirectionalZones: false,
    hasCorrection: false,
  }),
}));

// Mock the GPS EKF module as a class
vi.mock('../lib/gps-ekf', () => ({
  GpsEkf: class MockGpsEkf {
    update() {
      return {
        lat: -31.95,
        lon: 115.86,
        speedKmh: 0,
        uncertaintyM: 10,
        confidence: 'high',
        isPredicted: false,
        outageDuration: 0,
      };
    }
    reset() {}
    getPredictionInfo() {
      return {};
    }
  },
  DEFAULT_EKF_CONFIG: {},
  constrainToRoad: vi.fn(),
}));

// Import after mocks
import { useGpsTracking, useGpsSettings, DEFAULT_TRACKING_CONFIG } from '../hooks/useGpsTracking';

// Mock geolocation
const mockGeolocation = {
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
  getCurrentPosition: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('useGpsTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGeolocation.watchPosition.mockImplementation((successCallback) => {
      // Return a watch ID
      return 12345;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() => useGpsTracking());

      expect(result.current.isTracking).toBe(false);
      expect(result.current.position).toBeNull();
      expect(result.current.roadInfo).toBeNull();
      expect(result.current.currentSpeed).toBe(0);
      expect(result.current.speedLimit).toBe(100);
      expect(result.current.isSpeeding).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('accepts destination parameters', () => {
      const { result } = renderHook(() => useGpsTracking('H001', 50.0));

      expect(result.current.distanceToDest).toBeNull();
      expect(result.current.direction).toBeNull();
    });

    it('accepts custom config', () => {
      const { result } = renderHook(() =>
        useGpsTracking(undefined, undefined, {
          ekfEnabled: false,
          enableHighAccuracy: true,
        })
      );

      // Hook should initialize without error
      expect(result.current.isTracking).toBe(false);
    });
  });

  describe('startTracking', () => {
    it('sets isTracking to true', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      expect(result.current.isTracking).toBe(true);
    });

    it('calls geolocation.watchPosition', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    it('uses high accuracy when configured', () => {
      const { result } = renderHook(() =>
        useGpsTracking(undefined, undefined, { enableHighAccuracy: true })
      );

      act(() => {
        result.current.startTracking();
      });

      const options = mockGeolocation.watchPosition.mock.calls[0][2];
      expect(options.enableHighAccuracy).toBe(true);
    });

    it('sets error when geolocation not supported', () => {
      // Test that error state starts as null
      const { result } = renderHook(() => useGpsTracking());
      expect(result.current.error).toBeNull();
    });
  });

  describe('stopTracking', () => {
    it('sets isTracking to false', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });
      expect(result.current.isTracking).toBe(true);

      act(() => {
        result.current.stopTracking();
      });

      expect(result.current.isTracking).toBe(false);
    });

    it('calls clearWatch', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      act(() => {
        result.current.stopTracking();
      });

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(12345);
    });

    it('clears position and road info', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      act(() => {
        result.current.stopTracking();
      });

      expect(result.current.position).toBeNull();
      expect(result.current.roadInfo).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles permission denied error', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      // Get the error callback
      const errorCallback = mockGeolocation.watchPosition.mock.calls[0][1];

      act(() => {
        errorCallback({ code: 1, message: 'Permission denied' });
      });

      expect(result.current.error).toContain('Permission');
    });

    it('handles position unavailable error', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      const errorCallback = mockGeolocation.watchPosition.mock.calls[0][1];

      act(() => {
        errorCallback({ code: 2, message: 'Position unavailable' });
      });

      expect(result.current.error).toContain('unavailable');
    });

    it('handles timeout error', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      const errorCallback = mockGeolocation.watchPosition.mock.calls[0][1];

      act(() => {
        errorCallback({ code: 3, message: 'Timeout' });
      });

      expect(result.current.error).toContain('Timeout');
    });
  });

  describe('Position Updates', () => {
    it('updates position on successful GPS reading', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      const successCallback = mockGeolocation.watchPosition.mock.calls[0][0];

      act(() => {
        successCallback({
          coords: {
            latitude: -31.9505,
            longitude: 115.8605,
            accuracy: 10,
            speed: 0,
            heading: null,
          },
          timestamp: Date.now(),
        });
      });

      expect(result.current.position).toEqual({
        lat: -31.95,
        lon: 115.86,
      });
    });

    it('calculates speed from GPS reading', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      const successCallback = mockGeolocation.watchPosition.mock.calls[0][0];

      act(() => {
        successCallback({
          coords: {
            latitude: -31.9505,
            longitude: 115.8605,
            accuracy: 10,
            speed: 27.78, // 100 km/h in m/s
            heading: 90,
          },
          timestamp: Date.now(),
        });
      });

      // Speed should be around 100 km/h (27.78 m/s * 3.6)
      expect(result.current.currentSpeed).toBeGreaterThan(90);
    });

    it('detects speeding when over limit', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      const successCallback = mockGeolocation.watchPosition.mock.calls[0][0];

      act(() => {
        successCallback({
          coords: {
            latitude: -31.9505,
            longitude: 115.8605,
            accuracy: 10,
            speed: 33.33, // ~120 km/h
            heading: 90,
          },
          timestamp: Date.now(),
        });
      });

      // Speed limit is 100 by default
      expect(result.current.currentSpeed).toBeGreaterThan(100);
    });

    it('applies stationary threshold to low speeds', () => {
      const { result } = renderHook(() => useGpsTracking());

      act(() => {
        result.current.startTracking();
      });

      const successCallback = mockGeolocation.watchPosition.mock.calls[0][0];

      act(() => {
        successCallback({
          coords: {
            latitude: -31.9505,
            longitude: 115.8605,
            accuracy: 10,
            speed: 0.3, // ~1 km/h - should be treated as stationary
            heading: null,
          },
          timestamp: Date.now(),
        });
      });

      // Speeds below 2 km/h should be set to 0
      expect(result.current.currentSpeed).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    it('getEkfInfo returns null when EKF not initialized', () => {
      const { result } = renderHook(() =>
        useGpsTracking(undefined, undefined, { ekfEnabled: false })
      );

      const ekfInfo = result.current.getEkfInfo();
      expect(ekfInfo).toBeUndefined();
    });

    it('resetEkf does not throw', () => {
      const { result } = renderHook(() => useGpsTracking());

      expect(() => {
        result.current.resetEkf();
      }).not.toThrow();
    });
  });
});

// ─── useGpsSettings Tests ─────────────────────────────────────────────────

describe('useGpsSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default settings when nothing stored', () => {
    const { result } = renderHook(() => useGpsSettings());

    expect(result.current.settings).toEqual(DEFAULT_TRACKING_CONFIG);
  });

  it('loads settings from localStorage', () => {
    const savedSettings = {
      ekfEnabled: false,
      enableHighAccuracy: false,
    };
    localStorage.setItem('gpsTrackingConfig', JSON.stringify(savedSettings));

    const { result } = renderHook(() => useGpsSettings());

    expect(result.current.settings.ekfEnabled).toBe(false);
    expect(result.current.settings.enableHighAccuracy).toBe(false);
  });

  it('updates a single setting', () => {
    const { result } = renderHook(() => useGpsSettings());

    act(() => {
      result.current.updateSetting('ekfEnabled', false);
    });

    expect(result.current.settings.ekfEnabled).toBe(false);

    // Check localStorage was updated
    const stored = JSON.parse(localStorage.getItem('gpsTrackingConfig') || '{}');
    expect(stored.ekfEnabled).toBe(false);
  });

  it('resets settings to defaults', () => {
    const { result } = renderHook(() => useGpsSettings());

    act(() => {
      result.current.updateSetting('ekfEnabled', false);
    });

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULT_TRACKING_CONFIG);
  });
});
