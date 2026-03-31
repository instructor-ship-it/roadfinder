/**
 * Shared Type Definitions
 *
 * Canonical source for interfaces used across multiple components.
 * Import these instead of redefining locally.
 */

// ─── Weather Types ───────────────────────────────────────────────────────

export interface WeatherData {
  location: string;
  current: {
    temp: number;
    humidity: number;
    windSpeed: number;
    windDir: string;
    windGust: number;
    condition: string;
  };
  sun: {
    sunrise: string;
    sunset: string;
    daylightHours: string;
    uvIndex: number;
    uvLevel: string;
  };
  forecast: Array<{
    time: string;
    temp: number;
    windSpeed: number;
    windDir: string;
    condition: string;
  }>;
  fromCache?: boolean;
  cachedAt?: number;
  source?: string;
  dataUnavailable?: boolean;
  cachedLocation?: { lat: number; lon: number };
}

export interface WarningItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  category: string;
  urgency: string;
  severity: string;
}

export interface WarningData {
  warnings: WarningItem[];
  count: number;
  lastUpdated: string;
  source: string;
}

// ─── Traffic Types ───────────────────────────────────────────────────────

export interface TrafficData {
  road_id: string;
  road_name?: string;
  aadt: number;
  aadt_year: string;
  heavy_vehicle_percent: number;
  peak_hour_volume: number;
  aadt_weekday?: number;
  peak_hour_volume_weekday?: number;
  heavy_vehicle_weekday_pct?: number;
  source: string;
  distance_to_site?: number;
  nearest_sites?: Array<{
    site_no: string;
    location: string;
    year: string;
    aadt: number;
    heavy_percent: number;
    distance_km: number | null;
  }>;
  note?: string;
  fromCache?: boolean;
  cachedAt?: number;
}

// ─── Saved Location Types ───────────────────────────────────────────────

export interface SavedLocation {
  id: string;
  name: string;
  road_id: string;
  road_name: string;
  region: string;
  start_slk: number;
  end_slk: number | null;
  created_at: string;
}
