/**
 * Tests for offline-db.ts core functions
 *
 * Tests the most critical functions for road data and speed zone calculations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock IndexedDB and localStorage for testing
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
});

// Import the functions we're testing
// We need to mock initDB for these tests
vi.mock('./offline-db', async () => {
  const actual = await vi.importActual('./offline-db');
  return {
    ...actual,
    initDB: vi.fn().mockResolvedValue({}),
  };
});

// Import after mocking
import {
  signsToSpeedZones,
  getSpeedLimitForDirection,
  getSpeedZoneCorrections,
  addSpeedZoneCorrection,
  removeSpeedZoneCorrection,
  clearSpeedZoneCorrections,
  applySpeedZoneCorrections,
  type ParsedSpeedZone,
  type SpeedSignOverride,
} from './offline-db';

// ─── Test Data ───────────────────────────────────────────────────────────

const createMockSign = (overrides: Partial<SpeedSignOverride>): SpeedSignOverride => ({
  id: 'test-sign-1',
  road_id: 'H001',
  road_name: 'Test Road',
  slk: 10.0,
  direction: 'True Left',
  sign_type: 'Single',
  replicated: true,
  start_slk: 10.0,
  end_slk: 20.0,
  front_speed: 80,
  source: 'community_verified',
  ...overrides,
});

const createMockZone = (overrides: Partial<ParsedSpeedZone>): ParsedSpeedZone => ({
  road_id: 'H001',
  road_name: 'Test Road',
  start_slk: 10.0,
  end_slk: 20.0,
  speed_limit: 100,
  carriageway: 'Single',
  ...overrides,
});

// ─── signsToSpeedZones Tests ───────────────────────────────────────────────

describe('signsToSpeedZones', () => {
  it('returns empty array for empty input', () => {
    const result = signsToSpeedZones([]);
    expect(result).toEqual([]);
  });

  it('skips non-replicated single signs (repeaters)', () => {
    const signs = [createMockSign({ sign_type: 'Single', replicated: false })];
    const result = signsToSpeedZones(signs);
    expect(result).toHaveLength(0);
  });

  it('skips replicated signs without end_slk', () => {
    const signs = [createMockSign({ replicated: true, end_slk: undefined })];
    const result = signsToSpeedZones(signs);
    expect(result).toHaveLength(0);
  });

  it('creates zone for single replicated sign (True Left = Left carriageway)', () => {
    const signs = [
      createMockSign({
        sign_type: 'Single',
        replicated: true,
        direction: 'True Left',
        front_speed: 80,
        start_slk: 10.0,
        end_slk: 20.0,
      }),
    ];
    const result = signsToSpeedZones(signs);

    expect(result).toHaveLength(1);
    expect(result[0].carriageway).toBe('Left');
    expect(result[0].speed_limit).toBe(80);
    expect(result[0].is_override).toBe(true);
  });

  it('creates zone for single replicated sign (True Right = Right carriageway)', () => {
    const signs = [
      createMockSign({
        sign_type: 'Single',
        replicated: true,
        direction: 'True Right',
        front_speed: 60,
        start_slk: 10.0,
        end_slk: 20.0,
      }),
    ];
    const result = signsToSpeedZones(signs);

    expect(result).toHaveLength(1);
    expect(result[0].carriageway).toBe('Right');
    expect(result[0].speed_limit).toBe(60);
  });

  it('creates single zone for double-sided sign with same speed both directions', () => {
    const signs = [
      createMockSign({
        sign_type: 'Double',
        replicated: true,
        direction: 'True Left',
        front_speed: 80,
        back_speed: 80,
        start_slk: 10.0,
        end_slk: 20.0,
      }),
    ];
    const result = signsToSpeedZones(signs);

    expect(result).toHaveLength(1);
    expect(result[0].carriageway).toBe('Single');
    expect(result[0].speed_limit).toBe(80);
    expect(result[0].sign_face_increasing).toBe(80);
    expect(result[0].sign_face_decreasing).toBe(80);
  });

  it('creates zone with different sign faces for double-sided sign', () => {
    const signs = [
      createMockSign({
        sign_type: 'Double',
        replicated: true,
        direction: 'True Left',
        front_speed: 80, // What increasing SLK traffic sees
        back_speed: 110, // What decreasing SLK traffic sees
        start_slk: 10.0,
        end_slk: 20.0,
      }),
    ];
    const result = signsToSpeedZones(signs);

    expect(result).toHaveLength(1);
    expect(result[0].speed_limit).toBe(80); // Zone speed = front_speed
    expect(result[0].sign_face_increasing).toBe(80);
    expect(result[0].sign_face_decreasing).toBe(110);
  });

  it('handles True Right direction correctly for sign faces', () => {
    const signs = [
      createMockSign({
        sign_type: 'Double',
        replicated: true,
        direction: 'True Right',
        front_speed: 60, // What decreasing SLK traffic sees
        back_speed: 80, // What increasing SLK traffic sees
        start_slk: 10.0,
        end_slk: 20.0,
      }),
    ];
    const result = signsToSpeedZones(signs);

    expect(result).toHaveLength(1);
    expect(result[0].sign_face_increasing).toBe(80); // Back face
    expect(result[0].sign_face_decreasing).toBe(60); // Front face
  });

  it('sorts zones by start_slk', () => {
    const signs = [
      createMockSign({ slk: 30.0, start_slk: 30.0, end_slk: 40.0 }),
      createMockSign({ slk: 10.0, start_slk: 10.0, end_slk: 20.0 }),
      createMockSign({ slk: 20.0, start_slk: 20.0, end_slk: 30.0 }),
    ];
    const result = signsToSpeedZones(signs);

    expect(result[0].start_slk).toBe(10.0);
    expect(result[1].start_slk).toBe(20.0);
    expect(result[2].start_slk).toBe(30.0);
  });

  it('uses slk as start_slk if start_slk not defined', () => {
    const signs = [
      createMockSign({
        slk: 15.0,
        start_slk: undefined as unknown as number,
        end_slk: 25.0,
      }),
    ];
    // Need to handle the undefined case
    signs[0].start_slk = undefined as unknown as number;

    const result = signsToSpeedZones(signs);
    // Should still create zone using slk value
    expect(result).toHaveLength(1);
  });
});

// ─── getSpeedLimitForDirection Tests ───────────────────────────────────────

describe('getSpeedLimitForDirection', () => {
  it('returns default 100 when no zones match SLK', () => {
    const zones = [createMockZone({ start_slk: 10.0, end_slk: 20.0 })];
    const result = getSpeedLimitForDirection(zones, 30.0, 'increasing');

    expect(result.speedLimit).toBe(100);
    expect(result.zone).toBeNull();
    expect(result.hasDirectionalZones).toBe(false);
  });

  it('returns speed from single carriageway zone', () => {
    const zones = [
      createMockZone({
        start_slk: 10.0,
        end_slk: 20.0,
        speed_limit: 80,
        carriageway: 'Single',
      }),
    ];
    const result = getSpeedLimitForDirection(zones, 15.0, 'increasing');

    expect(result.speedLimit).toBe(80);
    expect(result.zone).not.toBeNull();
    expect(result.hasDirectionalZones).toBe(false);
  });

  it('returns left carriageway speed for increasing SLK direction', () => {
    const zones = [
      createMockZone({
        start_slk: 10.0,
        end_slk: 20.0,
        speed_limit: 80,
        carriageway: 'Left',
      }),
      createMockZone({
        start_slk: 10.0,
        end_slk: 20.0,
        speed_limit: 100,
        carriageway: 'Right',
      }),
    ];
    const result = getSpeedLimitForDirection(zones, 15.0, 'increasing');

    expect(result.speedLimit).toBe(80);
    expect(result.hasDirectionalZones).toBe(true);
  });

  it('returns right carriageway speed for decreasing SLK direction', () => {
    const zones = [
      createMockZone({
        start_slk: 10.0,
        end_slk: 20.0,
        speed_limit: 80,
        carriageway: 'Left',
      }),
      createMockZone({
        start_slk: 10.0,
        end_slk: 20.0,
        speed_limit: 100,
        carriageway: 'Right',
      }),
    ];
    const result = getSpeedLimitForDirection(zones, 15.0, 'decreasing');

    expect(result.speedLimit).toBe(100);
    expect(result.hasDirectionalZones).toBe(true);
  });

  it('uses sign face values when available for increasing direction', () => {
    const zones = [
      createMockZone({
        start_slk: 10.0,
        end_slk: 20.0,
        speed_limit: 80,
        carriageway: 'Single',
        sign_face_increasing: 60,
        sign_face_decreasing: 80,
      }),
    ];
    const result = getSpeedLimitForDirection(zones, 15.0, 'increasing');

    expect(result.speedLimit).toBe(60);
  });

  it('uses sign face values when available for decreasing direction', () => {
    const zones = [
      createMockZone({
        start_slk: 10.0,
        end_slk: 20.0,
        speed_limit: 80,
        carriageway: 'Single',
        sign_face_increasing: 60,
        sign_face_decreasing: 100,
      }),
    ];
    const result = getSpeedLimitForDirection(zones, 15.0, 'decreasing');

    expect(result.speedLimit).toBe(100);
  });

  it('returns zone speed when sign face not available', () => {
    const zones = [
      createMockZone({
        start_slk: 10.0,
        end_slk: 20.0,
        speed_limit: 80,
        carriageway: 'Single',
      }),
    ];
    const result = getSpeedLimitForDirection(zones, 15.0, 'increasing');

    expect(result.speedLimit).toBe(80);
  });

  it('handles null SLK direction', () => {
    const zones = [
      createMockZone({
        start_slk: 10.0,
        end_slk: 20.0,
        speed_limit: 80,
        carriageway: 'Single',
      }),
    ];
    const result = getSpeedLimitForDirection(zones, 15.0, null);

    expect(result.speedLimit).toBe(80);
    expect(result.hasDirectionalZones).toBe(false);
  });
});

// ─── Speed Zone Corrections Tests ───────────────────────────────────────────

describe('Speed Zone Corrections', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('getSpeedZoneCorrections', () => {
    it('returns empty array when no corrections stored', () => {
      const result = getSpeedZoneCorrections();
      expect(result).toEqual([]);
    });

    it('returns stored corrections', () => {
      const corrections = [
        {
          road_id: 'H001',
          start_slk: 10,
          end_slk: 20,
          direction: 'increasing' as const,
          correct_speed: 80,
          original_speed: 100,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];
      mockLocalStorage.setItem('speedZoneCorrections', JSON.stringify(corrections));

      const result = getSpeedZoneCorrections();
      expect(result).toHaveLength(1);
      expect(result[0].road_id).toBe('H001');
    });
  });

  describe('addSpeedZoneCorrection', () => {
    it('adds a new correction', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      const result = getSpeedZoneCorrections();
      expect(result).toHaveLength(1);
      expect(result[0].correct_speed).toBe(80);
      expect(result[0].created_at).toBeDefined();
    });

    it('replaces existing correction for same road/slk/direction', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 60, // Changed
        original_speed: 100,
      });

      const result = getSpeedZoneCorrections();
      expect(result).toHaveLength(1);
      expect(result[0].correct_speed).toBe(60);
    });

    it('keeps corrections for different directions separate', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'decreasing',
        correct_speed: 60,
        original_speed: 100,
      });

      const result = getSpeedZoneCorrections();
      expect(result).toHaveLength(2);
    });
  });

  describe('removeSpeedZoneCorrection', () => {
    it('removes a specific correction', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      removeSpeedZoneCorrection('H001', 10, 20, 'increasing');

      const result = getSpeedZoneCorrections();
      expect(result).toHaveLength(0);
    });

    it('does not remove correction with different parameters', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      removeSpeedZoneCorrection('H001', 10, 20, 'decreasing');

      const result = getSpeedZoneCorrections();
      expect(result).toHaveLength(1);
    });
  });

  describe('clearSpeedZoneCorrections', () => {
    it('clears all corrections', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      clearSpeedZoneCorrections();

      const result = getSpeedZoneCorrections();
      expect(result).toHaveLength(0);
    });
  });

  describe('applySpeedZoneCorrections', () => {
    it('returns original speed when no correction applies', () => {
      const result = applySpeedZoneCorrections('H001', 15, 'increasing', 100);
      expect(result).toBe(100);
    });

    it('applies correction when SLK is within range', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      const result = applySpeedZoneCorrections('H001', 15, 'increasing', 100);
      expect(result).toBe(80);
    });

    it('does not apply correction when SLK is outside range', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      const result = applySpeedZoneCorrections('H001', 25, 'increasing', 100);
      expect(result).toBe(100);
    });

    it('does not apply correction when direction does not match', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      const result = applySpeedZoneCorrections('H001', 15, 'decreasing', 100);
      expect(result).toBe(100);
    });

    it('returns original speed when direction is null', () => {
      addSpeedZoneCorrection({
        road_id: 'H001',
        start_slk: 10,
        end_slk: 20,
        direction: 'increasing',
        correct_speed: 80,
        original_speed: 100,
      });

      const result = applySpeedZoneCorrections('H001', 15, null, 100);
      expect(result).toBe(100);
    });
  });
});
