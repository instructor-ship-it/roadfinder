'use client';

import { useMemo } from 'react';
import type { ParsedSpeedZone } from '@/lib/offline-db';

// Speed limit colors
const SPEED_COLORS: Record<number, string> = {
  40: '#ef4444',   // red
  50: '#f97316',   // orange
  60: '#eab308',   // yellow
  70: '#84cc16',   // lime
  80: '#22c55e',   // green
  90: '#14b8a6',   // teal
  100: '#0ea5e9',  // cyan
  110: '#3b82f6',  // blue
  130: '#8b5cf6',  // purple
};

// Intersection colors - distinct colors for each intersection
const INTERSECTION_COLORS = [
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ef4444', // red
  '#8b5cf6', // violet
];

function getSpeedColor(speed: number): string {
  return SPEED_COLORS[speed] || '#6b7280';
}

function getIntersectionColor(index: number): string {
  return INTERSECTION_COLORS[index % INTERSECTION_COLORS.length];
}

interface SignageItem {
  slk: number;
  carriageway: string;
  category: 'speed' | 'regulatory' | 'warning' | 'railway' | 'intersection';
  sign_type: string;
  description: string;
  action: string;
  speedLimit?: number;
  sign_face_increasing?: number;
  sign_face_decreasing?: number;
  replicated?: boolean;
  override_id?: string;
}

interface Intersection {
  name: string;
  slk: number;
  roadType?: string;
}

interface SpeedZoneLayoutProps {
  workZoneStart: number;
  workZoneEnd: number;
  signageCorridor: SignageItem[];
  speedZones?: ParsedSpeedZone[]; // Actual zone data with extents
  intersections?: Intersection[]; // Intersecting roads to show as vertical lines
  corridorMargin?: number; // in km, default 0.85 (850m) to show ±800m signage
}

interface ZoneSegment {
  startSlk: number;
  endSlk: number;
  speed: number;
  source: 'community' | 'mrwa' | 'gap';
  zone: ParsedSpeedZone | null;
  sign: SignageItem | null;
}

export default function SpeedZoneLayout({
  workZoneStart,
  workZoneEnd,
  signageCorridor,
  speedZones = [],
  intersections = [],
  corridorMargin = 0.85
}: SpeedZoneLayoutProps) {
  
  // Calculate corridor bounds
  const corridorStart = workZoneStart - corridorMargin;
  const corridorEnd = (workZoneEnd || workZoneStart) + corridorMargin;
  
  // Filter speed signs to corridor
  const speedSigns = useMemo(() => {
    return signageCorridor
      .filter(s => s.category === 'speed')
      .sort((a, b) => a.slk - b.slk);
  }, [signageCorridor]);

  // Build complete zone segments using actual zone data
  const zoneSegments = useMemo((): ZoneSegment[] => {
    const segments: ZoneSegment[] = [];
    
    if (speedZones.length > 0) {
      // Use actual speed zone data
      // Filter zones that overlap with corridor
      const relevantZones = speedZones.filter(zone => 
        zone.end_slk > corridorStart && zone.start_slk < corridorEnd
      ).sort((a, b) => a.start_slk - b.start_slk);
      
      // Track covered areas to find gaps
      let lastEnd = corridorStart;
      
      for (const zone of relevantZones) {
        const zoneStart = Math.max(zone.start_slk, corridorStart);
        const zoneEnd = Math.min(zone.end_slk, corridorEnd);
        
        // Check for gap before this zone
        if (zoneStart > lastEnd + 0.01) { // 10m tolerance
          // Find the speed for the gap (use previous zone or default)
          const prevZone = relevantZones.find(z => z.end_slk <= zoneStart);
          const gapSpeed = prevZone?.speed_limit || zone.speed_limit;
          segments.push({
            startSlk: lastEnd,
            endSlk: zoneStart,
            speed: gapSpeed,
            source: 'gap',
            zone: null,
            sign: null
          });
        }
        
        // Add the zone
        const source = zone.is_override ? 'community' : 'mrwa';
        segments.push({
          startSlk: zoneStart,
          endSlk: zoneEnd,
          speed: zone.speed_limit,
          source,
          zone,
          sign: speedSigns.find(s => Math.abs(s.slk - zone.start_slk) < 0.02) || null
        });
        
        lastEnd = zoneEnd;
      }
      
      // Check for gap after last zone
      if (lastEnd < corridorEnd - 0.01) {
        const lastZone = relevantZones[relevantZones.length - 1];
        const gapSpeed = lastZone?.speed_limit || 110;
        segments.push({
          startSlk: lastEnd,
          endSlk: corridorEnd,
          speed: gapSpeed,
          source: 'gap',
          zone: null,
          sign: null
        });
      }
    } else {
      // Fall back to sign-based estimation when no zone data available
      const corridorSigns = speedSigns.filter(s => 
        s.slk >= corridorStart && s.slk <= corridorEnd
      );
      
      for (const sign of corridorSigns) {
        const speed = sign.speedLimit || sign.sign_face_increasing || 100;
        const nextSign = corridorSigns.find(s => s.slk > sign.slk);
        const endSlk = nextSign ? nextSign.slk : corridorEnd;
        
        segments.push({
          startSlk: sign.slk,
          endSlk,
          speed,
          source: sign.override_id ? 'community' : 'mrwa',
          zone: null,
          sign
        });
      }
      
      // If no signs at all, show a default zone for the whole corridor
      if (corridorSigns.length === 0) {
        segments.push({
          startSlk: corridorStart,
          endSlk: corridorEnd,
          speed: 110,
          source: 'gap',
          zone: null,
          sign: null
        });
      }
    }
    
    return segments;
  }, [speedZones, speedSigns, corridorStart, corridorEnd]);

  // Calculate scale
  const scale = useMemo(() => {
    const totalRange = corridorEnd - corridorStart;
    return {
      scale: 100 / totalRange,
      offset: corridorStart
    };
  }, [corridorStart, corridorEnd]);

  const slkToPercent = (slk: number): number => {
    return ((slk - scale.offset) * scale.scale);
  };

  // Check if we have any real data
  const hasData = zoneSegments.some(s => s.source !== 'gap') || speedSigns.length > 0;

  return (
    <div className="space-y-3">
      {/* SLK Scale with Sign Position Markers */}
      {(() => {
        // Calculate sign positions
        const tc1Slk = workZoneStart - 0.1;
        const tc2Slk = (workZoneEnd || workZoneStart) + 0.1;
        const pts1Slk = workZoneStart - 0.2;
        const pts2Slk = (workZoneEnd || workZoneStart) + 0.2;
        const boxPts1Slk = workZoneStart - 0.4;
        const boxPts2Slk = (workZoneEnd || workZoneStart) + 0.4;
        const sr1Slk = workZoneStart - 0.5;
        const rnst2Slk = (workZoneEnd || workZoneStart) + 0.5;
        const rwa1Slk = workZoneStart - 0.8;
        const rwa2Slk = (workZoneEnd || workZoneStart) + 0.8;
        
        // Get approach and exit speeds for conditional display
        const approachSpeed = zoneSegments.length > 0 ? zoneSegments[0].speed : 110;
        const exitSpeed = zoneSegments.length > 0 ? zoneSegments[zoneSegments.length - 1].speed : 110;
        const isHighSpeed = approachSpeed >= 80;
        const isExitHighSpeed = exitSpeed >= 80;
        
        // Sign position markers with colors
        const signMarkers = [
          { slk: rwa1Slk, color: 'bg-yellow-500' },
          { slk: sr1Slk, color: 'bg-white border border-red-500' },
          ...(isHighSpeed ? [{ slk: boxPts1Slk, color: 'bg-red-400' }] : []),
          { slk: pts1Slk, color: 'bg-red-500' },
          { slk: tc1Slk, color: 'bg-orange-500' },
          { slk: tc2Slk, color: 'bg-orange-500' },
          { slk: pts2Slk, color: 'bg-red-500' },
          ...(isExitHighSpeed ? [{ slk: boxPts2Slk, color: 'bg-red-400' }] : []),
          { slk: rnst2Slk, color: 'bg-white border border-red-500' },
          { slk: rwa2Slk, color: 'bg-yellow-500' },
        ];
        
        return (
          <div className="relative h-6 bg-gray-700 rounded overflow-hidden">
            {/* Scale markers */}
            {Array.from({ length: Math.ceil(corridorEnd) - Math.floor(corridorStart) + 1 }).map((_, i) => {
              const slk = Math.floor(corridorStart) + i;
              if (slk < corridorStart || slk > corridorEnd) return null;
              const percent = slkToPercent(slk);
              return (
                <div
                  key={slk}
                  className="absolute top-0 h-full flex flex-col items-center"
                  style={{ left: `${percent}%` }}
                >
                  <div className="h-full w-px bg-gray-500"></div>
                </div>
              );
            })}
            
            {/* Intersection vertical lines - each with different color */}
            {intersections.map((intersection, idx) => {
              if (intersection.slk < corridorStart || intersection.slk > corridorEnd) return null;
              const percent = slkToPercent(intersection.slk);
              const color = getIntersectionColor(idx);
              return (
                <div
                  key={`int-${idx}`}
                  className="absolute top-0 h-full w-0 border-l-2 z-10"
                  style={{ left: `${percent}%`, borderLeftColor: color }}
                  title={`🔀 ${intersection.name} (SLK ${intersection.slk.toFixed(2)})`}
                />
              );
            })}
            
            {/* Sign position markers */}
            {signMarkers.map((marker, idx) => {
              if (marker.slk < corridorStart || marker.slk > corridorEnd) return null;
              const percent = slkToPercent(marker.slk);
              return (
                <div
                  key={idx}
                  className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${marker.color}`}
                  style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                />
              );
            })}
            
            {/* Work zone highlight */}
            <div
              className="absolute top-0 h-full bg-blue-500/20 border-l-2 border-r-2 border-blue-400"
              style={{
                left: `${slkToPercent(workZoneStart)}%`,
                width: `${slkToPercent(workZoneEnd || workZoneStart) - slkToPercent(workZoneStart)}%`
              }}
            />
          </div>
        );
      })()}
      
      {/* SLK Labels */}
      <div className="relative h-4 text-xs text-gray-500">
        <span style={{ position: 'absolute', left: '0%' }}>{corridorStart.toFixed(1)}</span>
        <span style={{ position: 'absolute', left: `${slkToPercent(workZoneStart)}%`, transform: 'translateX(-50%)', color: '#60a5fa' }}>
          {workZoneStart.toFixed(2)}
        </span>
        <span style={{ position: 'absolute', left: `${slkToPercent(workZoneEnd || workZoneStart)}%`, transform: 'translateX(-50%)', color: '#60a5fa' }}>
          {(workZoneEnd || workZoneStart).toFixed(2)}
        </span>
        <span style={{ position: 'absolute', right: '0%' }}>{corridorEnd.toFixed(1)}</span>
      </div>

      {/* Speed Zones */}
      <div className="relative h-12 bg-gray-700 rounded overflow-hidden">
        {/* Work zone indicator */}
        <div
          className="absolute top-0 h-full bg-blue-900/30 border-l-2 border-r-2 border-blue-500"
          style={{
            left: `${slkToPercent(workZoneStart)}%`,
            width: `${slkToPercent(workZoneEnd || workZoneStart) - slkToPercent(workZoneStart)}%`
          }}
        />
        
        {/* Zone segments */}
        {zoneSegments.map((segment, idx) => {
          const isGap = segment.source === 'gap';
          const width = slkToPercent(segment.endSlk) - slkToPercent(segment.startSlk);
          
          return (
            <div
              key={idx}
              className={`absolute top-0 h-full flex items-center justify-center cursor-pointer hover:brightness-110 transition-all group ${
                isGap ? 'border-2 border-dashed border-gray-500' : ''
              }`}
              style={{
                left: `${slkToPercent(segment.startSlk)}%`,
                width: `${Math.max(width, 1)}%`,
                backgroundColor: isGap ? 'transparent' : getSpeedColor(segment.speed)
              }}
              title={`${segment.speed} km/h: SLK ${segment.startSlk.toFixed(2)} - ${segment.endSlk.toFixed(2)} (${segment.source})`}
            >
              {isGap ? (
                <span className="text-gray-500 text-xs italic">?{segment.speed}</span>
              ) : (
                <span className="font-bold text-white text-sm drop-shadow-lg">{segment.speed}</span>
              )}
              
              {/* Source indicator tooltip */}
              <div className="absolute bottom-full mb-1 bg-gray-800 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border border-gray-600">
                <div className="font-semibold" style={{ color: getSpeedColor(segment.speed) }}>
                  {segment.speed} km/h
                </div>
                <div className="text-gray-300">
                  SLK {segment.startSlk.toFixed(2)} → {segment.endSlk.toFixed(2)}
                </div>
                <div className="text-gray-400">
                  Length: {((segment.endSlk - segment.startSlk) * 1000).toFixed(0)}m
                </div>
                <div className={`text-xs ${segment.source === 'community' ? 'text-green-400' : segment.source === 'mrwa' ? 'text-blue-400' : 'text-orange-400'}`}>
                  {segment.source === 'community' ? '✓ Community verified' : 
                   segment.source === 'mrwa' ? 'MRWA data' : 
                   '⚠ Inferred (no zone data)'}
                </div>
                {segment.zone?.override_id && (
                  <div className="text-yellow-400 font-mono text-xs">
                    ID: {segment.zone.override_id}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sign Positions */}
      <div className="relative h-16 bg-gray-700/50 rounded overflow-hidden">
        {/* Work zone indicator */}
        <div
          className="absolute top-0 h-full bg-blue-900/20"
          style={{
            left: `${slkToPercent(workZoneStart)}%`,
            width: `${slkToPercent(workZoneEnd || workZoneStart) - slkToPercent(workZoneStart)}%`
          }}
        />
        
        {/* Sign markers */}
        {speedSigns.map((sign, idx) => {
          const isBoundary = sign.replicated;
          const isWorkZoneSign = sign.slk >= workZoneStart && sign.slk <= (workZoneEnd || workZoneStart);
          const isInCorridor = sign.slk >= corridorStart && sign.slk <= corridorEnd;
          
          if (!isInCorridor) return null;
          
          return (
            <div
              key={idx}
              className="absolute top-1 flex flex-col items-center cursor-pointer group z-10"
              style={{ 
                left: `${Math.min(Math.max(slkToPercent(sign.slk), 2), 98)}%`, 
                transform: 'translateX(-50%)' 
              }}
            >
              <div 
                className={`flex items-center justify-center text-xs font-bold ${
                  isBoundary 
                    ? 'w-5 h-5 rounded-full border-2 border-white' 
                    : 'w-4 h-4 rounded-full border border-gray-300'
                }`}
                style={{ 
                  backgroundColor: getSpeedColor(sign.speedLimit || 100)
                }}
              >
                {isBoundary ? '◆' : '●'}
              </div>
              
              {/* Tooltip on hover */}
              <div className="absolute top-6 bg-gray-800 rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border border-gray-600">
                <div className="font-mono text-yellow-400">{sign.override_id || sign.sign_type}</div>
                <div className="text-gray-300">SLK {sign.slk.toFixed(2)}</div>
                <div className="text-gray-400">{sign.description}</div>
                {sign.sign_face_increasing && sign.sign_face_decreasing && (
                  <div className="text-gray-400">
                    ↑{sign.sign_face_increasing} / ↓{sign.sign_face_decreasing}
                  </div>
                )}
                {sign.override_id && (
                  <div className="text-green-400 text-xs">Community verified</div>
                )}
              </div>
              
              {/* SLK label */}
              <span className={`text-xs mt-1 ${isWorkZoneSign ? 'text-blue-300' : 'text-gray-400'}`}>
                {sign.slk.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* TC Signage List */}
      {(() => {
        // Get approach and exit speeds from zone segments
        const approachSpeed = zoneSegments.length > 0 ? zoneSegments[0].speed : 110;
        const exitSpeed = zoneSegments.length > 0 ? zoneSegments[zoneSegments.length - 1].speed : 110;
        const isHighSpeed = approachSpeed >= 80;
        const isExitHighSpeed = exitSpeed >= 80;
        
        // Calculate SLK positions
        const tc1Slk = workZoneStart - 0.1;
        const tc2Slk = (workZoneEnd || workZoneStart) + 0.1;
        const pts1Slk = workZoneStart - 0.2;
        const pts2Slk = (workZoneEnd || workZoneStart) + 0.2;
        const boxPts1Slk = workZoneStart - 0.4;
        const boxPts2Slk = (workZoneEnd || workZoneStart) + 0.4;
        const sr1Slk = workZoneStart - 0.5;
        const rnst2Slk = (workZoneEnd || workZoneStart) + 0.5;
        const rwa1Slk = workZoneStart - 0.8;
        const rwa2Slk = (workZoneEnd || workZoneStart) + 0.8;
        
        // Get zone speeds at sign positions
        const getSpeedAtSlk = (slk: number): number => {
          const segment = zoneSegments.find(s => slk >= s.startSlk && slk < s.endSlk);
          return segment?.speed || approachSpeed;
        };
        
        const rwa1Speed = getSpeedAtSlk(rwa1Slk);
        const rwa2Speed = getSpeedAtSlk(rwa2Slk);
        const sr1ZoneSpeed = getSpeedAtSlk(sr1Slk);
        const rnstZoneSpeed = getSpeedAtSlk(rnst2Slk);
        
        // Format RWA display: (80) if zone >= 80, (RWA) if zone < 80
        const formatRwa = (speed: number): string => {
          return speed >= 80 ? '(80)' : '(RWA)';
        };
        
        return (
          <div className="bg-gray-700/50 rounded p-3 text-sm">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-xs">
                  <th className="text-left w-28"></th>
                  <th className="text-center text-orange-400 w-32">TC1</th>
                  <th className="text-center text-orange-400 w-32">TC2</th>
                </tr>
              </thead>
              <tbody className="text-gray-200 font-mono">
                <tr className="border-b border-gray-600">
                  <td className="py-1.5 text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    TC Position
                  </td>
                  <td className="text-center">{tc1Slk.toFixed(2)}</td>
                  <td className="text-center">{tc2Slk.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-600">
                  <td className="py-1.5 text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    PTS
                  </td>
                  <td className="text-center">{pts1Slk.toFixed(2)}</td>
                  <td className="text-center">{pts2Slk.toFixed(2)}</td>
                </tr>
                {isHighSpeed && isExitHighSpeed && (
                  <tr className="border-b border-gray-600">
                    <td className="py-1.5 text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      Box PTS
                    </td>
                    <td className="text-center">{boxPts1Slk.toFixed(2)}</td>
                    <td className="text-center">{boxPts2Slk.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-600">
                  <td className="py-1.5 text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white border border-red-500"></span>
                    SR/RNST
                  </td>
                  <td className="text-center">
                    <div>{sr1Slk.toFixed(2)}</div>
                    <div className="text-gray-500 text-xs">(60/{sr1ZoneSpeed})</div>
                  </td>
                  <td className="text-center">
                    <div>{rnst2Slk.toFixed(2)}</div>
                    <div className="text-gray-500 text-xs">(60/{rnstZoneSpeed})</div>
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    RWA
                  </td>
                  <td className="text-center">
                    <div>{rwa1Slk.toFixed(2)}</div>
                    <div className="text-gray-500 text-xs">{formatRwa(rwa1Speed)}</div>
                  </td>
                  <td className="text-center">
                    <div>{rwa2Slk.toFixed(2)}</div>
                    <div className="text-gray-500 text-xs">{formatRwa(rwa2Speed)}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Data Source Summary */}
      {!hasData && (
        <div className="text-xs text-orange-400 bg-orange-900/20 rounded p-2">
          ⚠ No speed zone data available. Speed zones shown are inferred.
          {speedZones.length === 0 && ' No MRWA speed zones loaded for this road.'}
        </div>
      )}
      
      {/* Gap warning */}
      {zoneSegments.some(s => s.source === 'gap') && (
        <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded p-2">
          ⚠ Some speed zone data is missing in this corridor. Gaps are shown with inferred speeds.
          Please verify with site inspection or MRWA records.
        </div>
      )}
    </div>
  );
}
