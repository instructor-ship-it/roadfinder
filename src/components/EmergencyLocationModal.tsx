/**
 * Emergency Location Modal Component
 *
 * Provides comprehensive emergency location information for 000 calls.
 * Extracted from page.tsx for maintainability.
 *
 * @module components/EmergencyLocationModal
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  findCrossRoad,
  findNearestTown,
  findNearestHospital,
  findNearestFireStation,
  findNearestPoliceStation,
} from '@/lib/emergency';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmergencyData {
  roadName: string;
  slk: number;
  region: string;
  locality: string | null;
  lat: number;
  lon: number;
  crossRoad: { name: string; distance: string; direction: string; distanceM?: number } | null;
  nearestTown: { name: string; distance: string; direction: string } | null;
  nearbyRoads: Array<{ road_name: string; distance_m: number }>;
  nearestHospital: {
    name: string;
    address: string;
    suburb: string;
    phone: string | null;
    hasED: boolean;
    distanceM: number;
    type: string;
  } | null;
  nearestFireStation: {
    name: string;
    type: string;
    typeDescription: string;
    distanceM: number;
    lat: number;
    lon: number;
    googleMapsUrl: string;
    address?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
    operationalStatus?: string;
    buildingName?: string;
    isProfessional?: boolean;
  } | null;
  nearestVolunteerFireStation: {
    name: string;
    type: string;
    typeDescription: string;
    distanceM: number;
    lat: number;
    lon: number;
    googleMapsUrl: string;
    address?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
    operationalStatus?: string;
    buildingName?: string;
    isProfessional?: boolean;
  } | null;
  nearestPoliceStation: {
    name: string;
    address: string;
    suburb: string;
    distanceM: number;
  } | null;
}

interface EmergencyLocationModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal open state changes */
  onOpenChange: (open: boolean) => void;
  /** Optional road info to use instead of GPS */
  roadInfo?: {
    roadId: string;
    roadName: string;
    slk: number;
    lat: number;
    lon: number;
  } | null;
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Format distance for emergency messages
 * Rounds to nearest 100m when under 1km for easier communication
 */
function formatEmergencyDistance(distanceStr: string): string {
  // Parse the distance string (e.g., "60m", "1.5km", "394m")
  if (distanceStr.endsWith('km')) {
    return distanceStr; // Keep km distances as-is
  }

  const meters = parseInt(distanceStr);
  if (isNaN(meters)) return distanceStr;

  // Round to nearest 100m for distances under 1km
  const rounded = Math.round(meters / 100) * 100;
  return `${rounded}m`;
}

/**
 * Format distance from meters to readable string
 */
function formatDistanceM(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters / 100) * 100} m`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EmergencyLocationModal({
  open,
  onOpenChange,
  roadInfo,
}: EmergencyLocationModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EmergencyData | null>(null);

  const getEmergencyLocation = useCallback(async () => {
    setLoading(true);
    setData(null);

    const getPosition = (): Promise<{ lat: number; lon: number }> => {
      return new Promise((resolve, reject) => {
        if (roadInfo) {
          resolve({ lat: roadInfo.lat, lon: roadInfo.lon });
        } else {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
              });
            },
            (error) => {
              reject(error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      });
    };

    try {
      const { lat, lon } = await getPosition();

      // Get road info from GPS
      const gpsResponse = await fetch(`/api/gps?lat=${lat}&lon=${lon}&radius=1000`);
      const gpsData = await gpsResponse.json();

      if (gpsData.road_id) {
        // Use shared functions for all emergency data lookups (runs in parallel for speed)
        const [crossRoad, nearestTown, nearestHospital, fireStations, nearestPoliceStation] =
          await Promise.all([
            findCrossRoad(lat, lon, gpsData.road_name || gpsData.road_id),
            findNearestTown(lat, lon, gpsData.locality || gpsData.region),
            findNearestHospital(lat, lon),
            findNearestFireStation(lat, lon),
            findNearestPoliceStation(lat, lon),
          ]);

        setData({
          roadName: gpsData.road_name || gpsData.road_id,
          slk: gpsData.slk,
          region: gpsData.region || 'Western Australia',
          locality: gpsData.locality || null,
          lat,
          lon,
          crossRoad,
          nearestTown,
          nearbyRoads: gpsData.nearby_roads || [],
          nearestHospital,
          nearestFireStation: fireStations.professional,
          nearestVolunteerFireStation: fireStations.volunteer,
          nearestPoliceStation,
        });
      } else {
        // No road found, use GPS coordinates only
        // Still try to get emergency services
        const [nearestHospital, fireStations, nearestPoliceStation] = await Promise.all([
          findNearestHospital(lat, lon),
          findNearestFireStation(lat, lon),
          findNearestPoliceStation(lat, lon),
        ]);

        setData({
          roadName: 'Unknown Road',
          slk: 0,
          region: 'Western Australia',
          locality: null,
          lat,
          lon,
          crossRoad: null,
          nearestTown: null,
          nearbyRoads: [],
          nearestHospital,
          nearestFireStation: fireStations.professional,
          nearestVolunteerFireStation: fireStations.volunteer,
          nearestPoliceStation,
        });
      }
    } catch (error) {
      console.error('Emergency location error:', error);
      // Fallback to GPS coordinates only
      if (roadInfo) {
        setData({
          roadName: roadInfo.roadName || roadInfo.roadId,
          slk: roadInfo.slk,
          region: 'Western Australia',
          locality: null,
          lat: roadInfo.lat,
          lon: roadInfo.lon,
          crossRoad: null,
          nearestTown: null,
          nearbyRoads: [],
          nearestHospital: null,
          nearestFireStation: null,
          nearestVolunteerFireStation: null,
          nearestPoliceStation: null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [roadInfo]);

  // Trigger location fetch when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !data && !loading) {
      getEmergencyLocation();
    }
    onOpenChange(newOpen);
  };

  const handleClose = () => {
    onOpenChange(false);
    setData(null);
  };

  const copyToClipboard = () => {
    if (!data) return;

    const text = `Emergency on ${data.roadName}${data.crossRoad ? `, approximately ${formatEmergencyDistance(data.crossRoad.distance)} ${data.crossRoad.direction} of ${data.crossRoad.name}` : ''}${data.nearestTown ? `, about ${formatEmergencyDistance(data.nearestTown.distance)} ${data.nearestTown.direction} of ${data.nearestTown.name}` : ''}. GPS coordinates: ${data.lat.toFixed(6)}, ${data.lon.toFixed(6)}.`;
    navigator.clipboard.writeText(text);
    alert('Location copied to clipboard!');
  };

  const openGoogleMaps = () => {
    if (!data) return;
    window.open(`https://www.google.com/maps?q=${data.lat},${data.lon}`, '_blank');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-red-900/20">
          <h2 className="text-lg font-bold text-red-400">🆘 EMERGENCY LOCATION - READ TO 000</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-600 hover:bg-gray-500 text-white font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
              <p className="text-gray-400">Getting your location...</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Main message to read */}
              <div className="bg-gray-800 rounded-lg p-4 border border-red-600">
                <p className="text-white text-lg leading-relaxed">
                  "Emergency on <span className="font-bold text-yellow-400">{data.roadName}</span>
                  {data.crossRoad && (
                    <>
                      , approximately{' '}
                      <span className="font-bold text-yellow-400">
                        {formatEmergencyDistance(data.crossRoad.distance)}
                      </span>{' '}
                      <span className="font-bold text-yellow-400">{data.crossRoad.direction}</span>{' '}
                      of <span className="font-bold text-yellow-400">{data.crossRoad.name}</span>
                    </>
                  )}
                  {data.nearestTown && (
                    <>
                      , about{' '}
                      <span className="font-bold text-yellow-400">
                        {formatEmergencyDistance(data.nearestTown.distance)}
                      </span>{' '}
                      <span className="font-bold text-yellow-400">
                        {data.nearestTown.direction}
                      </span>{' '}
                      of <span className="font-bold text-yellow-400">{data.nearestTown.name}</span>
                    </>
                  )}
                  . GPS coordinates:{' '}
                  <span className="font-bold text-green-400">
                    {data.lat.toFixed(6)}, {data.lon.toFixed(6)}
                  </span>
                  ."
                </p>
              </div>

              {/* Emergency Services */}
              <div className="bg-gray-800/50 rounded-lg p-3 space-y-3">
                {/* Nearest Hospital with ED */}
                {data.nearestHospital && (
                  <div className="bg-green-900/30 rounded-lg p-3 border border-green-600">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-400">🏥</span>
                      <span className="text-green-400 font-semibold">
                        {data.nearestHospital.type === 'Nursing Post'
                          ? 'Nearest Medical Facility'
                          : 'Nearest Hospital with Emergency Dept'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white font-semibold">{data.nearestHospital.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Distance:</span>
                      <span className="text-white">
                        {formatDistanceM(data.nearestHospital.distanceM)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white">
                        {data.nearestHospital.type}{' '}
                        {data.nearestHospital.hasED && (
                          <span className="text-green-400">(has ED)</span>
                        )}
                      </span>
                    </div>
                    {data.nearestHospital.phone && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Phone:</span>
                        <a
                          href={`tel:${data.nearestHospital.phone.replace(/[^0-9+]/g, '')}`}
                          className="text-blue-400 hover:text-blue-300 font-mono font-bold"
                        >
                          📞 {data.nearestHospital.phone}
                        </a>
                      </div>
                    )}
                    {data.nearestHospital.address && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Address:</span>
                        <span className="text-white text-sm">
                          {data.nearestHospital.address}
                          {data.nearestHospital.suburb && `, ${data.nearestHospital.suburb}`}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      {data.nearestHospital.phone && (
                        <Button
                          onClick={() => {
                            window.location.href = `tel:${data.nearestHospital!.phone?.replace(/[^0-9+]/g, '')}`;
                          }}
                          className="flex-1 bg-blue-700 hover:bg-blue-600 text-sm py-1"
                        >
                          📞 Call Hospital
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          if (data.nearestHospital) {
                            window.open(
                              `https://www.google.com/maps?q=${encodeURIComponent(data.nearestHospital.name + ' hospital ' + data.nearestHospital.suburb)}`,
                              '_blank'
                            );
                          }
                        }}
                        className="flex-1 bg-green-700 hover:bg-green-600 text-sm py-1"
                      >
                        📍 Directions
                      </Button>
                    </div>
                  </div>
                )}

                {/* Nearest Fire/Emergency Stations */}
                {(data.nearestFireStation || data.nearestVolunteerFireStation) && (
                  <div className="bg-orange-900/30 rounded-lg p-3 border border-orange-600">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-400">🚒</span>
                      <span className="text-orange-400 font-semibold">
                        Fire & Emergency Stations
                      </span>
                    </div>

                    {/* Professional (CFRS/PFRS) - 24/7 staffed */}
                    {data.nearestFireStation && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold text-sm">
                            {data.nearestFireStation.buildingName || data.nearestFireStation.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs bg-green-700 text-white px-1.5 py-0.5 rounded">
                              24/7 Staffed
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Type:</span>
                          <span className="text-gray-300">
                            {data.nearestFireStation.typeDescription} (
                            {data.nearestFireStation.type})
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Distance:</span>
                          <span className="text-gray-300">
                            {formatDistanceM(data.nearestFireStation.distanceM)}
                          </span>
                        </div>
                        {data.nearestFireStation.address && (
                          <div className="text-xs">
                            <span className="text-gray-500">
                              📍 {data.nearestFireStation.address}
                            </span>
                            {data.nearestFireStation.suburb && (
                              <span className="text-gray-500">
                                , {data.nearestFireStation.suburb}
                              </span>
                            )}
                            {data.nearestFireStation.postcode && (
                              <span className="text-gray-500">
                                {' '}
                                {data.nearestFireStation.postcode}
                              </span>
                            )}
                          </div>
                        )}
                        <Button
                          onClick={() => {
                            const fs = data.nearestFireStation!;
                            window.open(
                              fs.googleMapsUrl ||
                                `https://www.google.com/maps/dir/?api=1&destination=${fs.lat},${fs.lon}`,
                              '_blank'
                            );
                          }}
                          className="w-full bg-orange-700 hover:bg-orange-600 text-xs py-0.5 mt-1"
                        >
                          📍 Directions to {data.nearestFireStation.typeDescription}
                        </Button>
                      </div>
                    )}

                    {/* Volunteer (VFRS/VFESU/BFB) - only show if different from professional */}
                    {data.nearestVolunteerFireStation &&
                      (!data.nearestFireStation ||
                        data.nearestVolunteerFireStation.name !== data.nearestFireStation.name) && (
                        <div className="border-t border-orange-600/50 mt-2 pt-2 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-white font-semibold text-sm">
                              {data.nearestVolunteerFireStation.buildingName ||
                                data.nearestVolunteerFireStation.name}
                            </span>
                            <span className="text-xs bg-yellow-700 text-white px-1.5 py-0.5 rounded">
                              Volunteer
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Type:</span>
                            <span className="text-gray-300">
                              {data.nearestVolunteerFireStation.typeDescription} (
                              {data.nearestVolunteerFireStation.type})
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Distance:</span>
                            <span className="text-gray-300">
                              {formatDistanceM(data.nearestVolunteerFireStation.distanceM)}
                            </span>
                          </div>
                          {data.nearestVolunteerFireStation.address && (
                            <div className="text-xs">
                              <span className="text-gray-500">
                                📍 {data.nearestVolunteerFireStation.address}
                              </span>
                              {data.nearestVolunteerFireStation.suburb && (
                                <span className="text-gray-500">
                                  , {data.nearestVolunteerFireStation.suburb}
                                </span>
                              )}
                              {data.nearestVolunteerFireStation.postcode && (
                                <span className="text-gray-500">
                                  {' '}
                                  {data.nearestVolunteerFireStation.postcode}
                                </span>
                              )}
                            </div>
                          )}
                          <Button
                            onClick={() => {
                              const fs = data.nearestVolunteerFireStation!;
                              window.open(
                                fs.googleMapsUrl ||
                                  `https://www.google.com/maps/dir/?api=1&destination=${fs.lat},${fs.lon}`,
                                '_blank'
                              );
                            }}
                            className="w-full bg-orange-700 hover:bg-orange-600 text-xs py-0.5 mt-1"
                          >
                            📍 Directions to {data.nearestVolunteerFireStation.typeDescription}
                          </Button>
                        </div>
                      )}
                  </div>
                )}

                {/* Nearest Police Station */}
                {data.nearestPoliceStation && (
                  <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-600">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-400">🚔</span>
                      <span className="text-blue-400 font-semibold">Nearest Police Station</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white font-semibold">
                        {data.nearestPoliceStation.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Distance:</span>
                      <span className="text-white">
                        {formatDistanceM(data.nearestPoliceStation.distanceM)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Address:</span>
                      <span className="text-white text-sm">
                        {data.nearestPoliceStation.address}, {data.nearestPoliceStation.suburb}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Button
                        onClick={() => {
                          if (data.nearestPoliceStation) {
                            window.open(
                              `https://www.google.com/maps?q=${encodeURIComponent(data.nearestPoliceStation.name + ' police station ' + data.nearestPoliceStation.suburb + ' Western Australia')}`,
                              '_blank'
                            );
                          }
                        }}
                        className="w-full bg-blue-700 hover:bg-blue-600 text-sm py-1"
                      >
                        📍 Directions to Station
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button onClick={copyToClipboard} className="flex-1 bg-blue-600 hover:bg-blue-500">
                  📋 Copy Text
                </Button>
                <Button onClick={openGoogleMaps} className="flex-1 bg-green-600 hover:bg-green-500">
                  📍 Open Maps
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No location data available</p>
              <Button onClick={getEmergencyLocation} className="bg-red-600 hover:bg-red-700">
                🔄 Retry
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <Button
            onClick={handleClose}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EmergencyLocationModal;
