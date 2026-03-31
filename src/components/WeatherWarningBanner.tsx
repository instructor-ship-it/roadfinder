'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, Wind, CloudRain, AlertTriangle } from 'lucide-react';

interface BomWarning {
  id: string;
  title: string;
  type: string;
  severity: 'advice' | 'watch' | 'warning' | 'emergency';
  regions: string[];
  description: string;
  url: string;
  windGusts?: number;
  rainfall?: number;
  fireDangerRating?: string;
}

interface WeatherWarningBannerProps {
  state?: string;
  currentRegion?: string;
  enabled?: boolean;
}

export function WeatherWarningBanner({
  state = 'WA',
  currentRegion,
  enabled = true,
}: WeatherWarningBannerProps) {
  const [warnings, setWarnings] = useState<BomWarning[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Fetch warnings — fetchWarnings unstable, lastFetch excluded for throttling
  useEffect(() => {
    if (!enabled) return;

    const now = Date.now();
    // Only fetch every 5 minutes
    if (now - lastFetch < 5 * 60 * 1000 && warnings.length > 0) return;

    fetchWarnings();

    // Refresh every 5 minutes
    const interval = setInterval(fetchWarnings, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, currentRegion, enabled]);

  async function fetchWarnings() {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/weather/warnings?action=all&state=${state}`);
      const data = await response.json();

      if (data.success && data.warnings) {
        // Filter to only warning and emergency severity, and not dismissed
        let relevantWarnings = data.warnings.filter(
          (w: BomWarning) =>
            (w.severity === 'warning' || w.severity === 'emergency') && !dismissed.has(w.id)
        );

        // If we have a current region, further filter
        if (currentRegion && relevantWarnings.length > 0) {
          const regionLower = currentRegion.toLowerCase();
          relevantWarnings = relevantWarnings.filter((w: BomWarning) =>
            w.regions.some(
              (r) => r.toLowerCase().includes(regionLower) || regionLower.includes(r.toLowerCase())
            )
          );
        }

        setWarnings(relevantWarnings);
        setLastFetch(Date.now());
      }
    } catch (err) {
      console.error('Failed to fetch weather warnings:', err);
    } finally {
      setLoading(false);
    }
  }

  function dismissWarning(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
    setWarnings((prev) => prev.filter((w) => w.id !== id));
  }

  function getSeverityStyles(severity: string) {
    switch (severity) {
      case 'emergency':
        return {
          bg: 'bg-purple-900/70',
          border: 'border-purple-500',
          text: 'text-purple-200',
          icon: '🚨',
          label: 'EMERGENCY',
          animate: true,
        };
      case 'warning':
        return {
          bg: 'bg-red-900/60',
          border: 'border-red-500',
          text: 'text-red-200',
          icon: '⚠️',
          label: 'WARNING',
          animate: false,
        };
      default:
        return {
          bg: 'bg-orange-900/50',
          border: 'border-orange-500',
          text: 'text-orange-200',
          icon: '⚡',
          label: 'WATCH',
          animate: false,
        };
    }
  }

  function getWarningIcon(type: string) {
    switch (type) {
      case 'severe_thunderstorm':
        return '⛈️';
      case 'tropical_cyclone':
        return '🌀';
      case 'flood':
        return '🌊';
      case 'fire_weather':
        return '🔥';
      case 'wind':
        return '💨';
      case 'rain':
        return '🌧️';
      case 'heatwave':
        return '🌡️';
      case 'tsunami':
        return '🌊';
      default:
        return '🌩️';
    }
  }

  function getWarningTypeLabel(type: string): string {
    switch (type) {
      case 'severe_thunderstorm':
        return 'Severe Thunderstorm';
      case 'tropical_cyclone':
        return 'Tropical Cyclone';
      case 'flood':
        return 'Flood Warning';
      case 'fire_weather':
        return 'Fire Weather';
      case 'wind':
        return 'Damaging Wind';
      case 'rain':
        return 'Heavy Rain';
      case 'heatwave':
        return 'Heatwave';
      case 'tsunami':
        return 'Tsunami Warning';
      default:
        return 'Weather Warning';
    }
  }

  if (!enabled || warnings.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {warnings.slice(0, 2).map((warning) => {
        const styles = getSeverityStyles(warning.severity);
        const icon = getWarningIcon(warning.type);
        const typeLabel = getWarningTypeLabel(warning.type);

        return (
          <div
            key={warning.id}
            className={`${styles.bg} border ${styles.border} rounded-lg p-3 ${styles.animate ? 'animate-pulse' : ''}`}
            style={styles.animate ? { animationDuration: '3s' } : undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{icon}</span>
                  <span className={`text-xs font-bold uppercase ${styles.text}`}>
                    {styles.label}
                  </span>
                  <span className="text-white text-sm font-medium">{typeLabel}</span>
                </div>

                {/* Regions */}
                {warning.regions.length > 0 && (
                  <p className="text-white text-sm mt-1">
                    📍 {warning.regions.slice(0, 3).join(', ')}
                  </p>
                )}

                {/* Description */}
                <p className="text-gray-200 text-xs mt-1 line-clamp-1">
                  {warning.description.slice(0, 100)}...
                </p>

                {/* Key impacts */}
                {(warning.windGusts || warning.rainfall || warning.fireDangerRating) && (
                  <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
                    {warning.windGusts && (
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Wind className="h-3 w-3" />
                        {warning.windGusts} km/h
                      </span>
                    )}
                    {warning.rainfall && (
                      <span className="flex items-center gap-1 text-blue-300">
                        <CloudRain className="h-3 w-3" />
                        {warning.rainfall} mm
                      </span>
                    )}
                    {warning.fireDangerRating && (
                      <span className="flex items-center gap-1 text-orange-300">
                        🔥 {warning.fireDangerRating}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => window.open(warning.url, '_blank')}
                  className="flex items-center justify-center gap-1 text-xs bg-amber-600 hover:bg-amber-700 px-2 py-1.5 rounded transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  BOM
                </button>
                <button
                  onClick={() => dismissWarning(warning.id)}
                  className="flex items-center justify-center text-gray-400 hover:text-white px-2 py-1 transition-colors"
                  title="Dismiss warning"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
