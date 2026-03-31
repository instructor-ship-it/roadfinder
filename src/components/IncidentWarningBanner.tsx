'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, X } from 'lucide-react';

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
  latitude: number;
  longitude: number;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
}

interface IncidentWarningBannerProps {
  roadId?: string;
  currentSlk?: number;
  enabled?: boolean;
}

export function IncidentWarningBanner({
  roadId,
  currentSlk,
  enabled = true,
}: IncidentWarningBannerProps) {
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Fetch incidents for current road — fetchIncidents unstable, lastFetch excluded for throttling
  useEffect(() => {
    if (!enabled || !roadId) return;

    const now = Date.now();
    // Only fetch every 2 minutes
    if (now - lastFetch < 2 * 60 * 1000) return;

    fetchIncidents();

    // Refresh every 2 minutes
    const interval = setInterval(fetchIncidents, 2 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadId, enabled]);

  async function fetchIncidents() {
    if (!roadId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/incidents?action=all&road_id=${encodeURIComponent(roadId)}&limit=10`
      );
      const data = await response.json();

      if (data.success && data.incidents) {
        // Filter to only critical and major incidents, and not dismissed
        const relevantIncidents = data.incidents.filter(
          (i: RoadIncident) =>
            (i.severity === 'critical' || i.severity === 'major') && !dismissed.has(i.fid)
        );
        setIncidents(relevantIncidents);
        setLastFetch(Date.now());
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  }

  function dismissIncident(fid: number) {
    setDismissed((prev) => new Set([...prev, fid]));
    setIncidents((prev) => prev.filter((i) => i.fid !== fid));
  }

  function getSeverityStyles(severity: string) {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-900/60',
          border: 'border-red-500/60',
          text: 'text-red-300',
          icon: '🔴',
        };
      case 'major':
        return {
          bg: 'bg-orange-900/50',
          border: 'border-orange-500/50',
          text: 'text-orange-300',
          icon: '🟠',
        };
      default:
        return {
          bg: 'bg-yellow-900/40',
          border: 'border-yellow-500/40',
          text: 'text-yellow-300',
          icon: '🟡',
        };
    }
  }

  function openNavigation(incident: RoadIncident) {
    const url = `https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`;
    window.open(url, '_blank');
  }

  if (!enabled || incidents.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {incidents.map((incident) => {
        const styles = getSeverityStyles(incident.severity);
        return (
          <div
            key={incident.fid}
            className={`${styles.bg} border ${styles.border} rounded-lg p-3 animate-pulse`}
            style={{ animationDuration: '3s' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{styles.icon}</span>
                  <span className={`text-sm font-bold uppercase ${styles.text}`}>
                    {incident.severity} INCIDENT
                  </span>
                </div>
                <p className="text-white text-sm mt-1">{incident.location}</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="bg-gray-700 px-2 py-0.5 rounded">{incident.incidentType}</span>
                  {incident.closureType && (
                    <span className="bg-gray-700 px-2 py-0.5 rounded">{incident.closureType}</span>
                  )}
                </div>
                {incident.trafficImpact && (
                  <p className="text-amber-300 text-xs mt-2">{incident.trafficImpact}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => openNavigation(incident)}
                  className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                >
                  <MapPin className="h-3 w-3" />
                  Navigate
                </button>
                <button
                  onClick={() => dismissIncident(incident.fid)}
                  className="flex items-center justify-center text-gray-400 hover:text-white px-2 py-1"
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
