/**
 * Emergency Location Button Component
 *
 * Provides quick access to emergency location information.
 * Extracted from page.tsx for maintainability.
 *
 * @module components/home/EmergencyLocationButton
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, MapPin, Phone, Navigation, ExternalLink } from 'lucide-react';

interface EmergencyLocationButtonProps {
  /** Optional road ID for context */
  roadId?: string;
  /** Optional SLK for context */
  slk?: number;
  /** Optional GPS position */
  gpsPosition?: { lat: number; lon: number } | null;
}

interface EmergencyInfo {
  roadName: string;
  slk: number;
  direction: string;
  nearestTown: string;
  townDistance: string;
  nearestHospital: {
    name: string;
    distance: string;
    eta: string;
  } | null;
  crossRoad: string;
  gpsCoordinates: {
    lat: number;
    lon: number;
  };
}

export function EmergencyLocationButton({
  roadId,
  slk,
  gpsPosition,
}: EmergencyLocationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getEmergencyLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use GPS position if available, otherwise use road/slk
      const params = new URLSearchParams();

      if (gpsPosition) {
        params.append('lat', gpsPosition.lat.toString());
        params.append('lon', gpsPosition.lon.toString());
      } else if (roadId && slk !== undefined) {
        params.append('road_id', roadId);
        params.append('slk', slk.toString());
      } else {
        throw new Error('No location information available');
      }

      const response = await fetch(`/api/emergency?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to get emergency location');
      }

      const data = await response.json();
      setEmergencyInfo(data);
      setIsOpen(true);
    } catch (err) {
      console.error('[EmergencyLocationButton] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [gpsPosition, roadId, slk]);

  const formatEmergencyMessage = (info: EmergencyInfo): string => {
    const parts = [`Location: ${info.roadName} at SLK ${info.slk.toFixed(2)}`];

    if (info.direction) {
      parts.push(`${info.direction}`);
    }

    if (info.nearestTown && info.townDistance) {
      parts.push(`about ${info.townDistance} ${info.direction} of ${info.nearestTown}`);
    }

    if (info.crossRoad) {
      parts.push(`Near intersection with ${info.crossRoad}`);
    }

    parts.push(`GPS: ${info.gpsCoordinates.lat.toFixed(5)}, ${info.gpsCoordinates.lon.toFixed(5)}`);

    return parts.join('\n');
  };

  const copyToClipboard = async () => {
    if (!emergencyInfo) return;

    const message = formatEmergencyMessage(emergencyInfo);
    try {
      await navigator.clipboard.writeText(message);
    } catch (err) {
      console.error('[EmergencyLocationButton] Failed to copy:', err);
    }
  };

  const openInGoogleMaps = () => {
    if (!emergencyInfo) return;

    const { lat, lon } = emergencyInfo.gpsCoordinates;
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <Button
        onClick={getEmergencyLocation}
        disabled={isLoading || (!gpsPosition && !roadId)}
        variant="destructive"
        size="sm"
        className="bg-red-600 hover:bg-red-700"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        {isLoading ? 'Loading...' : 'Emergency Location'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Emergency Location
            </DialogTitle>
            <DialogDescription>
              Use this information to direct emergency services to your location.
            </DialogDescription>
          </DialogHeader>

          {emergencyInfo && (
            <div className="space-y-4">
              {/* Location */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white">{emergencyInfo.roadName}</div>
                    <div className="text-gray-400">
                      SLK {emergencyInfo.slk.toFixed(2)}
                      {emergencyInfo.direction && ` (${emergencyInfo.direction})`}
                    </div>
                    {emergencyInfo.nearestTown && (
                      <div className="text-sm text-gray-400 mt-1">
                        About {emergencyInfo.townDistance} {emergencyInfo.direction} of{' '}
                        {emergencyInfo.nearestTown}
                      </div>
                    )}
                    {emergencyInfo.crossRoad && (
                      <div className="text-sm text-gray-400">Near: {emergencyInfo.crossRoad}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">GPS Coordinates</div>
                <div className="font-mono text-white">
                  {emergencyInfo.gpsCoordinates.lat.toFixed(5)},{' '}
                  {emergencyInfo.gpsCoordinates.lon.toFixed(5)}
                </div>
              </div>

              {/* Nearest Hospital */}
              {emergencyInfo.nearestHospital && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Phone className="h-4 w-4" />
                    Nearest Hospital
                  </div>
                  <div className="text-white font-medium">{emergencyInfo.nearestHospital.name}</div>
                  <div className="text-sm text-gray-400">
                    {emergencyInfo.nearestHospital.distance} away
                    {emergencyInfo.nearestHospital.eta &&
                      ` • ~${emergencyInfo.nearestHospital.eta}`}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={copyToClipboard} variant="outline" size="sm" className="flex-1">
                  Copy Location
                </Button>
                <Button onClick={openInGoogleMaps} variant="default" size="sm" className="flex-1">
                  <Navigation className="h-4 w-4 mr-2" />
                  Open in Maps
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default EmergencyLocationButton;
