'use client';

import { Button } from '@/components/ui/button';

interface Place {
  name: string;
  distance: string;
  lat: number;
  lon: number;
  phone?: string;
  isEmergency?: boolean;
  googleMapsUrl?: string;
  address?: string;
  // Hospital-specific (from WA Health SLIP)
  hospitalType?: string;
  hospitalCategory?: string;
  beds?: number;
  // Fuel station-specific (from FuelWatch WA)
  fuelBrand?: string;
  fuelPrice?: number;
  siteFeatures?: string[];
}

interface PlacesData {
  hospital?: Place;
  fuelStation?: Place;
  toilet?: Place;
  fromCache?: boolean;
  cachedAt?: string | number;
  dataUnavailable?: boolean;
  source?: string;
  hospitalSource?: string;
  fuelSource?: string;
}

interface AmenitiesSectionProps {
  places: PlacesData | null;
  showAmenities: boolean;
  onToggle: () => void;
  onOpenGoogleMaps: (url: string | null) => void;
  onOpenStreetView: (lat: number, lon: number) => void;
}

export function AmenitiesSection({
  places,
  showAmenities,
  onToggle,
  onOpenGoogleMaps,
  onOpenStreetView,
}: AmenitiesSectionProps) {
  if (!places) return null;

  return (
    <div className="bg-gray-800 rounded-lg">
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between text-left">
        <h3 className="text-sm font-semibold text-blue-400">
          🏥 Amenities
          {places.dataUnavailable && (
            <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              No Cached Data
            </span>
          )}
          {places.fromCache && !places.dataUnavailable && (
            <span className="ml-2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
              Cached {places.cachedAt ? new Date(Number(places.cachedAt)).toLocaleTimeString() : ''}
            </span>
          )}
        </h3>
        <span className="text-gray-400 text-lg">{showAmenities ? '−' : '+'}</span>
      </button>

      {showAmenities && (
        <div className="px-4 pb-4">
          {/* Data Unavailable Warning */}
          {places.dataUnavailable && (
            <div className="bg-red-900/30 border border-red-500/50 rounded p-3 mb-4">
              <p className="text-sm font-semibold text-red-400">⚠️ Amenities Data Unavailable</p>
              <p className="text-xs text-gray-400 mt-1">
                {places.source || 'No cached amenities data available in offline mode.'}
              </p>
              <p className="text-xs text-amber-400 mt-2">
                💡 Switch to ONLINE mode to download amenities data, or previously fetched amenities
                will be cached for offline use.
              </p>
            </div>
          )}

          {/* Hospital */}
          {places.hospital ? (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-red-400">
                  🏥 {places.hospital.name}
                  <span className="text-gray-500 text-sm ml-2">
                    ({places.hospital.distance} km)
                  </span>
                  {places.hospital.isEmergency && (
                    <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded ml-1">
                      ED
                    </span>
                  )}
                  {places.hospital.hospitalType === 'Public' && (
                    <span className="text-xs bg-blue-700 text-white px-1.5 py-0.5 rounded ml-1">
                      Public
                    </span>
                  )}
                  {places.hospital.hospitalType === 'Private' && (
                    <span className="text-xs bg-gray-600 text-white px-1.5 py-0.5 rounded ml-1">
                      Private
                    </span>
                  )}
                  {places.hospital.hospitalType === 'Nursing Post' && (
                    <span className="text-xs bg-amber-700 text-white px-1.5 py-0.5 rounded ml-1">
                      Nursing Post
                    </span>
                  )}
                </p>
                <div className="flex gap-1">
                  <Button
                    onClick={() => onOpenGoogleMaps(places.hospital?.googleMapsUrl || null)}
                    className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                    title="Navigate"
                  >
                    🗺️
                  </Button>
                  <Button
                    onClick={() => onOpenStreetView(places.hospital!.lat, places.hospital!.lon)}
                    className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                    title="Street View"
                  >
                    🏠
                  </Button>
                </div>
              </div>
              <div className="mt-1 space-y-0.5">
                {places.hospital.address && (
                  <p className="text-xs text-gray-400">📍 {places.hospital.address}</p>
                )}
                {places.hospital.phone && (
                  <p className="text-xs text-gray-400">📞 {places.hospital.phone}</p>
                )}
                {places.hospital.beds && places.hospital.beds > 0 && (
                  <p className="text-xs text-gray-500">🛏️ {places.hospital.beds} beds</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-4">No hospital found nearby</p>
          )}

          {/* Fuel Station */}
          {places.fuelStation ? (
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-yellow-400">
                  ⛽ {places.fuelStation.name}
                  <span className="text-gray-500 text-sm ml-2">
                    ({places.fuelStation.distance} km)
                  </span>
                  {places.fuelStation.fuelPrice && (
                    <span className="text-xs bg-green-700 text-white px-1.5 py-0.5 rounded ml-1">
                      ${places.fuelStation.fuelPrice.toFixed(1)}/L
                    </span>
                  )}
                  {!places.fuelStation.fuelPrice && (
                    <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded ml-1">
                      No price today
                    </span>
                  )}
                </p>
                <div className="flex gap-1">
                  <Button
                    onClick={() => onOpenGoogleMaps(places.fuelStation?.googleMapsUrl || null)}
                    className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                    title="Navigate"
                  >
                    🗺️
                  </Button>
                  <Button
                    onClick={() =>
                      onOpenStreetView(places.fuelStation!.lat, places.fuelStation!.lon)
                    }
                    className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                    title="Street View"
                  >
                    🏠
                  </Button>
                </div>
              </div>
              <div className="mt-1 space-y-0.5">
                {places.fuelStation.address && (
                  <p className="text-xs text-gray-400">📍 {places.fuelStation.address}</p>
                )}
                {places.fuelStation.phone && (
                  <p className="text-xs text-gray-400">📞 {places.fuelStation.phone}</p>
                )}
                {places.fuelStation.siteFeatures && places.fuelStation.siteFeatures.length > 0 && (
                  <p className="text-xs text-gray-500">
                    🏷️ {places.fuelStation.siteFeatures.join(' · ')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-4">No fuel station found nearby</p>
          )}

          {/* Toilet */}
          {places.toilet ? (
            <div>
              <div className="flex items-center justify-between">
                <p className="font-medium text-blue-400">
                  🚻 {places.toilet.name}
                  <span className="text-gray-500 text-sm ml-2">({places.toilet.distance} km)</span>
                </p>
                <div className="flex gap-1">
                  <Button
                    onClick={() => onOpenGoogleMaps(places.toilet?.googleMapsUrl || null)}
                    className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                    title="Navigate"
                  >
                    🗺️
                  </Button>
                  <Button
                    onClick={() => onOpenStreetView(places.toilet!.lat, places.toilet!.lon)}
                    className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700"
                    title="Street View"
                  >
                    🏠
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No toilet found nearby</p>
          )}
        </div>
      )}
    </div>
  );
}
