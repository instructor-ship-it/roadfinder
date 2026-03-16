'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, AlertTriangle, Loader2, ExternalLink, Wind, CloudRain, Thermometer } from 'lucide-react';

interface BomWarning {
  id: string;
  title: string;
  description: string;
  type: string;
  severity: 'advice' | 'watch' | 'warning' | 'emergency';
  status: string;
  state: string;
  regions: string[];
  issued: string;
  url: string;
  windGusts?: number;
  rainfall?: number;
  temperature?: number;
  fireDangerRating?: string;
}

interface WarningsData {
  success: boolean;
  state: string;
  count: number;
  warnings: BomWarning[];
  lastUpdated: string;
  source: string;
}

interface WarningsSectionProps {
  state?: string;
  regions?: string[];
  enabled?: boolean;
}

export function WarningsSection({ state = 'WA', regions, enabled = true }: WarningsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [warnings, setWarnings] = useState<BomWarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    fetchWarnings();

    // Refresh every 5 minutes
    const interval = setInterval(fetchWarnings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [state, regions, enabled]);

  // Auto-expand when warnings are loaded
  useEffect(() => {
    if (warnings.length > 0 && !expanded) {
      setExpanded(true);
    }
  }, [warnings.length]);

  async function fetchWarnings() {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/weather/warnings?action=all&state=${state}`;
      if (regions && regions.length > 0) {
        url += `&regions=${regions.join(',')}`;
      }

      const response = await fetch(url);
      const data: WarningsData = await response.json();

      if (data.success) {
        setWarnings(data.warnings);
        setLastUpdated(data.lastUpdated);
      } else {
        setError('Failed to load weather warnings');
      }
    } catch (err) {
      setError('Network error - unable to fetch warnings');
      console.error('Failed to fetch BOM warnings:', err);
    } finally {
      setLoading(false);
    }
  }

  function getSeverityStyles(severity: string) {
    switch (severity) {
      case 'emergency':
        return {
          bg: 'bg-purple-900/40',
          border: 'border-purple-500/50',
          text: 'text-purple-400',
          icon: '🚨',
          label: 'EMERGENCY'
        };
      case 'warning':
        return {
          bg: 'bg-red-900/40',
          border: 'border-red-500/50',
          text: 'text-red-400',
          icon: '🔴',
          label: 'WARNING'
        };
      case 'watch':
        return {
          bg: 'bg-orange-900/40',
          border: 'border-orange-500/50',
          text: 'text-orange-400',
          icon: '🟠',
          label: 'WATCH'
        };
      default:
        return {
          bg: 'bg-blue-900/40',
          border: 'border-blue-500/50',
          text: 'text-blue-400',
          icon: '🔵',
          label: 'ADVICE'
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
      case 'frost':
        return '❄️';
      case 'fog':
        return '🌫️';
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
      case 'severe_weather':
        return 'Severe Weather';
      case 'wind':
        return 'Damaging Wind';
      case 'rain':
        return 'Heavy Rain';
      case 'heatwave':
        return 'Heatwave';
      case 'tsunami':
        return 'Tsunami';
      case 'frost':
        return 'Frost';
      case 'fog':
        return 'Fog';
      default:
        return 'Weather Warning';
    }
  }

  function formatIssuedTime(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-AU', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return dateStr;
    }
  }

  // Count by severity
  const emergencyCount = warnings.filter(w => w.severity === 'emergency').length;
  const warningCount = warnings.filter(w => w.severity === 'warning').length;
  const watchCount = warnings.filter(w => w.severity === 'watch').length;

  if (!enabled) return null;

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <AlertTriangle className={`h-4 w-4 ${warnings.length > 0 ? 'text-amber-400' : 'text-gray-400'}`} />
          <span className="font-medium text-sm">
            🌩️ Weather Warnings
            {warnings.length > 0 && (
              <span className="ml-2 text-amber-400">({warnings.length} active)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {warnings.length > 0 && (
            <div className="flex gap-1 text-xs">
              {emergencyCount > 0 && (
                <span className="bg-purple-600 px-1.5 py-0.5 rounded">{emergencyCount}</span>
              )}
              {warningCount > 0 && (
                <span className="bg-red-600 px-1.5 py-0.5 rounded">{warningCount}</span>
              )}
              {watchCount > 0 && (
                <span className="bg-orange-600 px-1.5 py-0.5 rounded">{watchCount}</span>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-700">
          {error && (
            <div className="p-4 text-center text-red-400 text-sm">
              {error}
              <button
                onClick={fetchWarnings}
                className="block mx-auto mt-2 text-blue-400 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!error && warnings.length === 0 && !loading && (
            <div className="p-4 text-center text-gray-500 text-sm">
              <p>No active weather warnings for {state}</p>
              <p className="text-xs mt-1">Data from Bureau of Meteorology</p>
            </div>
          )}

          {!error && warnings.length > 0 && (
            <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
              {warnings.map((warning) => {
                const styles = getSeverityStyles(warning.severity);
                const warningIcon = getWarningIcon(warning.type);
                const typeLabel = getWarningTypeLabel(warning.type);
                
                return (
                  <div
                    key={warning.id}
                    className={`p-3 ${styles.bg} border-l-2 ${styles.border}`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{styles.icon}</span>
                        <span className={`text-xs font-bold uppercase ${styles.text}`}>
                          {styles.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatIssuedTime(warning.issued)}
                      </span>
                    </div>

                    {/* Warning type & icon */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xl">{warningIcon}</span>
                      <span className={`text-sm font-medium ${styles.text}`}>
                        {typeLabel}
                      </span>
                    </div>

                    {/* Affected regions */}
                    {warning.regions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-300">
                          📍 {warning.regions.slice(0, 4).join(', ')}
                          {warning.regions.length > 4 && ` +${warning.regions.length - 4} more`}
                        </p>
                      </div>
                    )}

                    {/* Description snippet */}
                    <p className="mt-2 text-xs text-gray-400 line-clamp-2">
                      {warning.description.slice(0, 150)}
                      {warning.description.length > 150 ? '...' : ''}
                    </p>

                    {/* Weather details */}
                    {(warning.windGusts || warning.rainfall || warning.fireDangerRating) && (
                      <div className="mt-2 flex items-center gap-4 text-xs flex-wrap">
                        {warning.windGusts && (
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Wind className="h-3 w-3" />
                            {warning.windGusts} km/h gusts
                          </span>
                        )}
                        {warning.rainfall && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <CloudRain className="h-3 w-3" />
                            {warning.rainfall} mm
                          </span>
                        )}
                        {warning.fireDangerRating && (
                          <span className="flex items-center gap-1 text-orange-400">
                            🔥 {warning.fireDangerRating}
                          </span>
                        )}
                      </div>
                    )}

                    {/* BOM Link */}
                    <div className="mt-2 flex justify-end">
                      <Button
                        onClick={() => window.open(warning.url, '_blank')}
                        className="h-7 px-2 text-xs bg-amber-600 hover:bg-amber-700"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        BOM Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {lastUpdated && (
            <div className="px-3 py-2 bg-gray-900 text-xs text-gray-500 text-center">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
              {' • '}
              Source: Bureau of Meteorology
            </div>
          )}
        </div>
      )}
    </div>
  );
}
