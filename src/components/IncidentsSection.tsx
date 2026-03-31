'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface RoadIncident {
  fid: number;
  id: number;
  location: string;
  incidentType: string;
  closureType: string;
  trafficCondition: string;
  trafficImpact: string;
  road: string;
  region: string;
  suburb: string;
  entryDate: string;
  updateDate: string;
  seeMoreUrl: string | null;
  localRoadName: string;
  latitude: number;
  longitude: number;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
}

interface IncidentsData {
  success: boolean;
  count: number;
  incidents: RoadIncident[];
  lastUpdated: string;
}

interface IncidentsSectionProps {
  roadId?: string;
  roadName?: string;
  enabled?: boolean;
}

export function IncidentsSection({ roadId, roadName, enabled = true }: IncidentsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch incidents — fetchIncidents is unstable; roadId/enabled are the correct triggers
  useEffect(() => {
    if (!enabled) return;
    fetchIncidents();

    // Refresh every 5 minutes
    const interval = setInterval(fetchIncidents, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadId, enabled]);

  // Auto-expand on initial load only — expanded excluded to avoid re-expanding on user collapse
  useEffect(() => {
    if (incidents.length > 0 && !expanded) {
      setExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidents.length]);

  async function fetchIncidents() {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/incidents?action=all&limit=50';
      if (roadId) {
        url += `&road_id=${encodeURIComponent(roadId)}`;
      }

      const response = await fetch(url);
      const data: IncidentsData = await response.json();

      if (data.success) {
        setIncidents(data.incidents);
        setLastUpdated(data.lastUpdated);
      } else {
        setError('Failed to load incidents');
      }
    } catch (err) {
      setError('Network error - unable to fetch incidents');
      console.error('Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  }

  function getSeverityStyles(severity: string) {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-900/40',
          border: 'border-red-500/50',
          text: 'text-red-400',
          icon: '🔴',
        };
      case 'major':
        return {
          bg: 'bg-orange-900/40',
          border: 'border-orange-500/50',
          text: 'text-orange-400',
          icon: '🟠',
        };
      case 'moderate':
        return {
          bg: 'bg-yellow-900/40',
          border: 'border-yellow-500/50',
          text: 'text-yellow-400',
          icon: '🟡',
        };
      default:
        return {
          bg: 'bg-blue-900/40',
          border: 'border-blue-500/50',
          text: 'text-blue-400',
          icon: '🔵',
        };
    }
  }

  function formatUpdateDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const [datePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  // Count by severity
  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const majorCount = incidents.filter((i) => i.severity === 'major').length;
  const moderateCount = incidents.filter((i) => i.severity === 'moderate').length;

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
          <AlertTriangle
            className={`h-4 w-4 ${incidents.length > 0 ? 'text-red-400' : 'text-gray-400'}`}
          />
          <span className="font-medium text-sm">
            🚨 Road Incidents
            {incidents.length > 0 && (
              <span className="ml-2 text-red-400">({incidents.length} active)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {incidents.length > 0 && (
            <div className="flex gap-1 text-xs">
              {criticalCount > 0 && (
                <span className="bg-red-600 px-1.5 py-0.5 rounded">{criticalCount}</span>
              )}
              {majorCount > 0 && (
                <span className="bg-orange-600 px-1.5 py-0.5 rounded">{majorCount}</span>
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
                onClick={fetchIncidents}
                className="block mx-auto mt-2 text-blue-400 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!error && incidents.length === 0 && !loading && (
            <div className="p-4 text-center text-gray-500 text-sm">
              <p>No active incidents in WA</p>
              <p className="text-xs mt-1">Data updates every 5 minutes</p>
            </div>
          )}

          {!error && incidents.length > 0 && (
            <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
              {incidents.map((incident) => {
                const styles = getSeverityStyles(incident.severity);
                return (
                  <div
                    key={incident.fid}
                    className={`p-3 ${styles.bg} border-l-2 ${styles.border}`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{styles.icon}</span>
                        <div>
                          <span className={`text-xs font-bold uppercase ${styles.text}`}>
                            {incident.severity}
                          </span>
                          {incident.closureType && (
                            <span className="ml-2 text-xs text-gray-400">
                              • {incident.closureType}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatUpdateDate(incident.updateDate)}
                      </span>
                    </div>

                    {/* Road & Location */}
                    <div className="mt-2">
                      <span className="font-mono text-green-400 text-sm">{incident.road}</span>
                      <p className="text-sm text-gray-300 mt-1">{incident.location}</p>
                    </div>

                    {/* Incident Type */}
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="bg-gray-700 px-2 py-0.5 rounded">
                        {incident.incidentType}
                      </span>
                      <span className="text-gray-500">{incident.trafficCondition}</span>
                    </div>

                    {/* Traffic Impact */}
                    {incident.trafficImpact && (
                      <p className="mt-2 text-xs text-amber-400">⚠️ {incident.trafficImpact}</p>
                    )}

                    {/* Navigate button */}
                    <div className="mt-2 flex justify-end">
                      <Button
                        onClick={() => {
                          const url = `https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`;
                          window.open(url, '_blank');
                        }}
                        className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Navigate
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
              Source: MRWA WebEOC
            </div>
          )}
        </div>
      )}
    </div>
  );
}
