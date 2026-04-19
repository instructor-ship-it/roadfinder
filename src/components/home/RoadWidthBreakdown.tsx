'use client';

interface PavementData {
  lanes: number | null;
  width_m: number | null;
  cwy: string;
  total_pave_width: number | null;
  total_seal_width: number | null;
  sealed_shoulder_l: number | null;
  sealed_shoulder_r: number | null;
  unsealed_shoulder_l: number | null;
  unsealed_shoulder_r: number | null;
  kerb_l: string | null;
  kerb_r: string | null;
}

interface RoadWidthBreakdownProps {
  pavement: PavementData;
}

/**
 * Visual breakdown of road width components
 * Shows sealed/unsealed shoulders and trafficable lanes
 */
export function RoadWidthBreakdown({ pavement }: RoadWidthBreakdownProps) {
  if (!pavement.total_pave_width) return null;

  const totalWidth = pavement.total_pave_width || 1;
  const unsealedL = pavement.unsealed_shoulder_l || 0;
  const sealedL = pavement.sealed_shoulder_l || 0;
  const trafficable = pavement.width_m || 0;
  const sealedR = pavement.sealed_shoulder_r || 0;
  const unsealedR = pavement.unsealed_shoulder_r || 0;

  // Calculate percentages
  const pctUnsealedL = (unsealedL / totalWidth) * 100;
  const pctSealedL = (sealedL / totalWidth) * 100;
  const pctTrafficable = (trafficable / totalWidth) * 100;
  const pctSealedR = (sealedR / totalWidth) * 100;
  const pctUnsealedR = (unsealedR / totalWidth) * 100;

  return (
    <div className="mt-4 pt-3 border-t border-gray-700">
      <p className="text-xs text-gray-500 mb-2">
        Road Width Breakdown (Total: {pavement.total_pave_width?.toFixed(1)}m)
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
        <span>{pavement.cwy} Carriageway</span>
        <span>RIGHT →</span>
      </div>
    </div>
  );
}
