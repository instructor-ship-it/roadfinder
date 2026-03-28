import { describe, it, expect } from "vitest";
import {
  cn,
  haversineDistance,
  haversineDistanceKm,
  degreesToMeters,
  metersToDegrees,
  getBearing,
  getDirectionFromBearing,
  formatDistance,
} from "./utils";

describe("cn (className merge utility)", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle undefined values", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("should handle empty input", () => {
    expect(cn()).toBe("");
  });
});

describe("haversineDistance", () => {
  it("should return 0 for same point", () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0);
  });

  it("should calculate distance from Perth to Sydney (~3,290 km)", () => {
    const distance = haversineDistance(-31.9505, 115.8605, -33.8688, 151.2093);
    expect(distance).toBeGreaterThan(3_200_000);
    expect(distance).toBeLessThan(3_400_000);
  });

  it("should calculate distance across equator", () => {
    const distance = haversineDistance(-10, 0, 10, 0);
    // ~2,220 km (20 degrees of latitude)
    expect(distance).toBeGreaterThan(2_200_000);
    expect(distance).toBeLessThan(2_230_000);
  });

  it("should calculate distance across prime meridian", () => {
    const distance = haversineDistance(0, -10, 0, 10);
    // ~2,220 km (20 degrees of longitude at equator)
    expect(distance).toBeGreaterThan(2_200_000);
    expect(distance).toBeLessThan(2_230_000);
  });
});

describe("haversineDistanceKm", () => {
  it("should return distance in kilometers", () => {
    const distanceKm = haversineDistanceKm(
      -31.9505,
      115.8605,
      -33.8688,
      151.2093,
    );
    expect(distanceKm).toBeGreaterThan(3200);
    expect(distanceKm).toBeLessThan(3400);
  });

  it("should be consistent with haversineDistance", () => {
    const distanceM = haversineDistance(10, 20, 30, 40);
    const distanceKm = haversineDistanceKm(10, 20, 30, 40);
    expect(distanceKm).toBe(distanceM / 1000);
  });
});

describe("degreesToMeters", () => {
  it("should convert degrees to meters at equator", () => {
    const meters = degreesToMeters(1, 0);
    // 1 degree ≈ 111,000m at equator
    expect(meters).toBeGreaterThan(110_000);
    expect(meters).toBeLessThan(112_000);
  });

  it("should convert degrees to meters at higher latitude", () => {
    const meters = degreesToMeters(1, 60);
    // At 60° latitude, 1 degree longitude ≈ 55,500m
    // Average of latitude and longitude scales
    expect(meters).toBeGreaterThan(80_000);
    expect(meters).toBeLessThan(90_000);
  });

  it("should handle zero degrees", () => {
    expect(degreesToMeters(0, 0)).toBe(0);
  });
});

describe("metersToDegrees", () => {
  it("should be inverse of degreesToMeters", () => {
    const originalDegrees = 1.5;
    const latitude = 35;
    const meters = degreesToMeters(originalDegrees, latitude);
    const backToDegrees = metersToDegrees(meters, latitude);
    expect(backToDegrees).toBeCloseTo(originalDegrees, 5);
  });

  it("should handle zero meters", () => {
    expect(metersToDegrees(0, 0)).toBe(0);
  });
});

describe("getBearing", () => {
  it("should return 0 for same point", () => {
    expect(getBearing(0, 0, 0, 0)).toBe(0);
  });

  it("should return 0 (north) when moving directly north", () => {
    const bearing = getBearing(0, 0, 10, 0);
    expect(bearing).toBeCloseTo(0, 1);
  });

  it("should return 90 (east) when moving directly east", () => {
    const bearing = getBearing(0, 0, 0, 10);
    expect(bearing).toBeCloseTo(90, 1);
  });

  it("should return 180 (south) when moving directly south", () => {
    const bearing = getBearing(10, 0, 0, 0);
    expect(bearing).toBeCloseTo(180, 1);
  });

  it("should return 270 (west) when moving directly west", () => {
    const bearing = getBearing(0, 10, 0, 0);
    expect(bearing).toBeCloseTo(270, 1);
  });
});

describe("getDirectionFromBearing", () => {
  it("should return north for bearing 0", () => {
    expect(getDirectionFromBearing(0)).toBe("north");
  });

  it("should return east for bearing 90", () => {
    expect(getDirectionFromBearing(90)).toBe("east");
  });

  it("should return south for bearing 180", () => {
    expect(getDirectionFromBearing(180)).toBe("south");
  });

  it("should return west for bearing 270", () => {
    expect(getDirectionFromBearing(270)).toBe("west");
  });

  it("should return northeast for bearing 45", () => {
    expect(getDirectionFromBearing(45)).toBe("northeast");
  });

  it("should handle 360 as north", () => {
    expect(getDirectionFromBearing(360)).toBe("north");
  });
});

describe("formatDistance", () => {
  it("should format meters under 1km", () => {
    expect(formatDistance(500)).toBe("500m");
  });

  it("should round to nearest 100m for distances under 1km", () => {
    expect(formatDistance(450)).toBe("500m");
    expect(formatDistance(420)).toBe("400m");
  });

  it("should format 1km exactly", () => {
    expect(formatDistance(1000)).toBe("1km");
  });

  it("should format kilometers with one decimal", () => {
    expect(formatDistance(1500)).toBe("1.5km");
    expect(formatDistance(2350)).toBe("2.4km");
  });

  it("should remove trailing .0 for whole kilometers", () => {
    expect(formatDistance(2000)).toBe("2km");
    expect(formatDistance(5000)).toBe("5km");
  });
});
