'use client';

interface LaneDirectionDiagramProps {
  lanes: number;
  carriageway: string; // 'Single' | 'Left' | 'Right'
}

/**
 * Visual diagram showing lane directions
 * Shows which lanes go toward increasing/decreasing SLK
 */
export function LaneDirectionDiagram({ lanes, carriageway }: LaneDirectionDiagramProps) {
  if (lanes <= 0) return null;

  // Determine lanes per direction
  let lanesIncreasing = 0; // → toward higher SLK
  let lanesDecreasing = 0; // ← toward lower SLK

  if (carriageway === 'Single') {
    // Single carriageway: split evenly between directions
    lanesIncreasing = Math.ceil(lanes / 2);
    lanesDecreasing = Math.floor(lanes / 2);
  } else if (carriageway === 'Left') {
    // Left carriageway: all lanes go INCREASING SLK
    lanesIncreasing = lanes;
    lanesDecreasing = 0;
  } else if (carriageway === 'Right') {
    // Right carriageway: all lanes go DECREASING SLK
    lanesIncreasing = 0;
    lanesDecreasing = lanes;
  }

  // Create lane array with directions
  // For Single: left lanes = increasing (→), right lanes = decreasing (←)
  const laneDirections: ('increasing' | 'decreasing')[] = [];
  for (let i = 0; i < lanesIncreasing; i++) {
    laneDirections.push('increasing');
  }
  for (let i = 0; i < lanesDecreasing; i++) {
    laneDirections.push('decreasing');
  }

  return (
    <div className="mt-4 pt-3 border-t border-gray-700">
      <p className="text-xs text-gray-500 mb-2">Lane Directions ({lanes} lanes total)</p>

      {/* Visual lane diagram */}
      <div className="flex h-10 rounded overflow-hidden border border-gray-600">
        {(() => {
          let increasingLaneNum = 0;
          let decreasingLaneNum = 0;
          return laneDirections.map((dir, idx) => {
            if (dir === 'increasing') {
              increasingLaneNum++;
            } else {
              decreasingLaneNum++;
            }
            // For decreasing, reverse numbering so L1 is curb-side (right side)
            const laneNum =
              dir === 'increasing' ? increasingLaneNum : lanesDecreasing - decreasingLaneNum + 1;
            return (
              <div
                key={idx}
                className={`flex-1 flex flex-col items-center justify-center border-r border-gray-600 last:border-r-0 bg-blue-800`}
                title={dir === 'increasing' ? 'Toward higher SLK (↑)' : 'Toward lower SLK (↓)'}
              >
                <span
                  className={`text-lg font-bold ${dir === 'increasing' ? 'text-white' : 'text-yellow-400'}`}
                >
                  {dir === 'increasing' ? '↑' : '↓'}
                </span>
                {lanes >= 3 && (
                  <span
                    className={`text-[10px] font-medium ${dir === 'increasing' ? 'text-white/70' : 'text-yellow-400/70'}`}
                  >
                    L{laneNum}
                  </span>
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* Direction legend */}
      <div className="flex justify-between mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white rounded"></div>
          <span className="text-gray-400">
            ↑ INCREASING SLK ({lanesIncreasing} lane
            {lanesIncreasing !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">
            DECREASING SLK ({lanesDecreasing} lane
            {lanesDecreasing !== 1 ? 's' : ''}) ↓
          </span>
          <div className="w-3 h-3 bg-yellow-400 rounded"></div>
        </div>
      </div>

      {/* Direction explanation */}
      <p className="text-xs text-gray-500 mt-2 italic">
        {carriageway === 'Single'
          ? lanes % 2 !== 0
            ? `⚠️ Odd lane count - allocation uncertain. Assuming ${lanesIncreasing} lane(s) INCREASING, ${lanesDecreasing} lane(s) DECREASING`
            : `${lanesIncreasing} lane(s) toward INCREASING SLK, ${lanesDecreasing} lane(s) toward DECREASING SLK`
          : carriageway === 'Left'
            ? 'Left carriageway: all lanes travel toward INCREASING SLK'
            : 'Right carriageway: all lanes travel toward DECREASING SLK'}
      </p>
    </div>
  );
}
