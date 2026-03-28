'use client';

import { Button } from '@/components/ui/button';

interface WorkZone {
  start_slk: number;
  end_slk: number;
  length_m: number;
  start?: { lat: number; lon: number };
  end?: { lat: number; lon: number };
}

interface GoogleMapsLinks {
  work_zone_start: string;
  work_zone_end: string;
}

interface PavementData {
  lanes?: number;
  width_m?: number;
  total_pave_width?: number;
  unsealed_shoulder_l?: number;
  sealed_shoulder_l?: number;
  sealed_shoulder_r?: number;
  unsealed_shoulder_r?: number;
  cwy?: string;
}

interface WorkZoneResult {
  road_id: string;
  road_name: string;
  network_type?: string;
  work_zone: WorkZone;
  carriageway: string;
  google_maps: GoogleMapsLinks;
  pavement?: PavementData;
}

interface WorkZoneSummaryProps {
  result: WorkZoneResult;
  isSinglePoint: boolean;
  onOpenStreetView: (lat: number, lon: number) => void;
  onOpenGoogleMaps: (url: string) => void;
  onStartSlkTracking: () => void;
}

export function WorkZoneSummary({ 
  result, 
  isSinglePoint,
  onOpenStreetView, 
  onOpenGoogleMaps,
  onStartSlkTracking 
}: WorkZoneSummaryProps) {
  const p = result.pavement;
  
  // Road width breakdown calculations
  const totalWidth = p?.total_pave_width || 1;
  const unsealedL = p?.unsealed_shoulder_l || 0;
  const sealedL = p?.sealed_shoulder_l || 0;
  const trafficable = p?.width_m || 0;
  const sealedR = p?.sealed_shoulder_r || 0;
  const unsealedR = p?.unsealed_shoulder_r || 0;
  
  // Calculate percentages
  const pctUnsealedL = (unsealedL / totalWidth) * 100;
  const pctSealedL = (sealedL / totalWidth) * 100;
  const pctTrafficable = (trafficable / totalWidth) * 100;
  const pctSealedR = (sealedR / totalWidth) * 100;
  const pctUnsealedR = (unsealedR / totalWidth) * 100;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="border-b border-gray-700 pb-2 mb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-blue-400">
            📍 Work Zone Summary
          </h3>
          {result.work_zone.start && (
            <div className="flex gap-1">
              <Button 
                onClick={() => onOpenStreetView(result.work_zone.start!.lat, result.work_zone.start!.lon)}
                className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
                title="Street View at Start SLK"
              >
                🏠 Street View
              </Button>
              <Button 
                onClick={() => onOpenGoogleMaps(result.google_maps.work_zone_start)}
                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 flex items-center gap-1"
                title="Google Maps at Start SLK"
              >
                🗺️ Maps
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Track button for single point lookups */}
      {isSinglePoint && result.work_zone.start && (
        <div className="mb-3">
          <Button 
            onClick={onStartSlkTracking}
            className="w-full h-8 text-sm bg-blue-800 hover:bg-blue-900 flex items-center justify-center gap-1"
            title="Start SLK Tracking"
          >
            📍 Start SLK Tracking
          </Button>
        </div>
      )}
      
      <p className="text-lg font-medium">{result.road_name}</p>
      <p className="text-sm text-gray-400">
        Road ID: {result.road_id}
        {result.network_type && (
          <span className={`ml-2 ${result.network_type === 'Local Road' ? 'text-amber-400' : 'text-gray-500'}`}>
            ({result.network_type})
          </span>
        )}
      </p>
      
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Start SLK</p>
          <p className="font-mono">{result.work_zone.start_slk.toFixed(2)} km</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">End SLK</p>
          <p className="font-mono">{result.work_zone.end_slk.toFixed(2)} km</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Zone Length</p>
          <p className="font-medium">{result.work_zone.length_m} m</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Carriageway</p>
          <p className="font-medium">{result.carriageway}</p>
        </div>
        {result.pavement && (
          <>
            <div>
              <p className="text-xs text-gray-500">Lanes</p>
              <p className="font-medium">{result.pavement.lanes || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Road Width</p>
              <p className="font-medium">{result.pavement.width_m ? `${result.pavement.width_m} m` : '—'}</p>
            </div>
          </>
        )}
      </div>
      
      {/* Road Width Visual Breakdown */}
      {result.pavement && result.pavement.total_pave_width && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-2">
            Road Width Breakdown (Total: {result.pavement.total_pave_width?.toFixed(1)}m)
          </p>
          
          {/* Visual bar */}
          <div className="flex h-8 rounded overflow-hidden text-xs">
            {unsealedL > 0 && (
              <div 
                className="bg-amber-700 flex items-center justify-center"
                style={{ width: `${pctUnsealedL}%` }}
                title={`Unsealed shoulder L: ${unsealedL.toFixed(1)}m`}
              >
                {pctUnsealedL > 10 && <span className="text-white">{unsealedL.toFixed(1)}</span>}
              </div>
            )}
            {sealedL > 0 && (
              <div 
                className="bg-gray-500 flex items-center justify-center"
                style={{ width: `${pctSealedL}%` }}
                title={`Sealed shoulder L: ${sealedL.toFixed(1)}m`}
              >
                {pctSealedL > 10 && <span className="text-white">{sealedL.toFixed(1)}</span>}
              </div>
            )}
            {trafficable > 0 && (
              <div 
                className="bg-blue-800 flex items-center justify-center"
                style={{ width: `${pctTrafficable}%` }}
                title={`Trafficable: ${trafficable.toFixed(1)}m`}
              >
                <span className="text-white font-medium">{trafficable.toFixed(1)}</span>
              </div>
            )}
            {sealedR > 0 && (
              <div 
                className="bg-gray-500 flex items-center justify-center"
                style={{ width: `${pctSealedR}%` }}
                title={`Sealed shoulder R: ${sealedR.toFixed(1)}m`}
              >
                {pctSealedR > 10 && <span className="text-white">{sealedR.toFixed(1)}</span>}
              </div>
            )}
            {unsealedR > 0 && (
              <div 
                className="bg-amber-700 flex items-center justify-center"
                style={{ width: `${pctUnsealedR}%` }}
                title={`Unsealed shoulder R: ${unsealedR.toFixed(1)}m`}
              >
                {pctUnsealedR > 10 && <span className="text-white">{unsealedR.toFixed(1)}</span>}
              </div>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            {unsealedL > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-700 rounded"></div>
                <span className="text-gray-400">Unsealed {unsealedL.toFixed(1)}m</span>
              </div>
            )}
            {sealedL > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span className="text-gray-400">Sealed {sealedL.toFixed(1)}m</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-800 rounded"></div>
              <span className="text-gray-400">Lanes {trafficable.toFixed(1)}m</span>
            </div>
            {sealedR > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span className="text-gray-400">Sealed {sealedR.toFixed(1)}m</span>
              </div>
            )}
            {unsealedR > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-700 rounded"></div>
                <span className="text-gray-400">Unsealed {unsealedR.toFixed(1)}m</span>
              </div>
            )}
          </div>
          
          {/* Direction labels */}
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>← LEFT</span>
            <span>{result.pavement.cwy} Carriageway</span>
            <span>RIGHT →</span>
          </div>
        </div>
      )}
    </div>
  );
}
