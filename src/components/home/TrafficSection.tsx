'use client';

import { Button } from '@/components/ui/button';
import {
  calculateMaxHoldTime,
  PREPARE_TO_STOP_DISTANCE_M,
  ADV_QUEUE_WARNING_DISTANCE_M,
  type MaxHoldTimeResult,
} from '@/lib/max-hold-time';

interface TrafficData {
  aadt?: number;
  aadt_weekday?: number;
  peak_hour_volume?: number;
  peak_hour_volume_weekday?: number;
  heavy_vehicle_percent?: number;
  heavy_vehicle_weekday_pct?: number;
  source: string;
  distance_to_site?: number;
  nearest_sites?: Array<{
    location: string;
    aadt?: number;
    distance_km: number;
  }>;
  note?: string;
}

interface TrafficSectionProps {
  traffic: TrafficData | null;
  showTraffic: boolean;
  onToggle: () => void;
  tcLengthM?: number | null;
}

// Helper functions for traffic calculations
function getShuttleFlowLength(vph: number): { length: string; risk: boolean } {
  if (vph >= 701) return { length: '70m', risk: false };
  if (vph >= 601) return { length: '100m', risk: false };
  if (vph >= 501) return { length: '150m', risk: false };
  if (vph >= 401) return { length: '250m', risk: false };
  if (vph >= 351) return { length: '400m', risk: false };
  if (vph >= 301) return { length: '600m', risk: false };
  if (vph >= 251) return { length: '800m', risk: false }; // AGTTM Table 3.5: ≤300 VPH → 800m
  if (vph >= 201) return { length: '1200m', risk: true }; // MRWA COP Table 15: exceeds AGTTM
  if (vph >= 151) return { length: '1600m', risk: true }; // MRWA COP Table 15: exceeds AGTTM
  return { length: '2200m', risk: true }; // MRWA COP Table 15: exceeds AGTTM
}

function getLaneCapacity(vph: number): string {
  if (vph <= 1000) return '1 lane';
  if (vph <= 2000) return '2 lanes';
  if (vph <= 3000) return '3 lanes';
  return '4+ lanes';
}

export function TrafficSection({ traffic, showTraffic, onToggle, tcLengthM }: TrafficSectionProps) {
  if (!traffic) return null;

  // Calculate shuttle flow and lane capacity from traffic data
  const peakHourOneDir = traffic.peak_hour_volume || 0;
  const peakHourBothDir = peakHourOneDir * 2;

  // If we have AADT, estimate peak hour from typical 10% factor
  const estimatedPeakFromAadt = traffic.aadt ? Math.round(traffic.aadt * 0.1) : 0;
  const vphBothDir = peakHourBothDir || estimatedPeakFromAadt;
  const vphOneDir = peakHourOneDir || Math.round(vphBothDir / 2);

  // Apply reduction factor for heavy vehicles >10%
  const heavyPct = traffic.heavy_vehicle_percent || 0;
  const reductionFactor = heavyPct > 10 ? 0.8 : 1;
  const reducedVph = Math.round(vphBothDir * reductionFactor);

  const shuttleFlow = getShuttleFlowLength(reducedVph);
  const laneCapacity = getLaneCapacity(Math.round(vphOneDir * reductionFactor));

  // Maximum Hold Time calculation (use weekday data preferentially)
  const peakVphWeekday = traffic.peak_hour_volume_weekday || traffic.peak_hour_volume || 0;
  const heavyPctWeekday = traffic.heavy_vehicle_weekday_pct || traffic.heavy_vehicle_percent || 0;
  const vphOneDirWeekday = peakVphWeekday ? Math.round(peakVphWeekday / 2) : vphOneDir;
  const maxHold: MaxHoldTimeResult | null = calculateMaxHoldTime(vphOneDirWeekday, heavyPctWeekday);

  return (
    <div className="bg-gray-800 rounded-lg">
      <button onClick={onToggle} className="w-full p-4 flex items-center justify-between text-left">
        <h3 className="text-sm font-semibold text-blue-400">
          🚗 Traffic Volume
          {traffic.aadt && (
            <span className="text-gray-400 text-sm ml-2">
              ({traffic.aadt.toLocaleString()} v/day)
            </span>
          )}
        </h3>
        <span className="text-gray-400 text-lg">{showTraffic ? '−' : '+'}</span>
      </button>

      {showTraffic && (
        <div className="px-4 pb-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-400">AADT</p>
              <p className="font-medium text-lg">{traffic.aadt?.toLocaleString() || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400">Peak Hour</p>
              <p className="font-medium text-lg">{vphBothDir} v/h</p>
            </div>
            <div>
              <p className="text-gray-400">Heavy Vehicles</p>
              <p className={`font-medium ${heavyPct > 10 ? 'text-amber-400' : ''}`}>
                {heavyPct}%{heavyPct > 10 && ' (reduced capacity)'}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Lane Capacity</p>
              <p className="font-medium">{laneCapacity}</p>
            </div>
          </div>

          {/* Shuttle Flow Guidance */}
          <div className="bg-gray-700/30 rounded p-3 mb-4">
            <h4 className="text-sm font-medium text-cyan-400 mb-2">🚦 Shuttle Flow Max Length</h4>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-bold">{shuttleFlow.length}</span>
              {shuttleFlow.risk && (
                <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded">
                  Requires Risk Assessment
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Based on {reducedVph} v/h both directions
              {heavyPct > 10 && ` (20% reduction for ${heavyPct}% heavy vehicles)`}
            </p>
          </div>

          {/* Maximum Hold Time */}
          {maxHold && (
            <div className="bg-orange-900/20 border border-orange-700/50 rounded p-3 mb-4">
              <h4 className="text-sm font-medium text-orange-400 mb-2">⏱️ Maximum Hold Time</h4>
              <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                <div>
                  <p className="text-gray-400 text-xs">Max Hold</p>
                  <p className="text-xl font-bold text-orange-300">
                    {maxHold.maxHoldTimeMinutes} min
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Recommended Stop</p>
                  <p className="text-xl font-bold text-white">
                    {maxHold.recommendedStopMinutes} min
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Queue Growth</p>
                  <p className="font-medium text-gray-200">{maxHold.queueGrowthRate} m/min</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">
                    Queue @ {maxHold.recommendedStopMinutes}min
                  </p>
                  <p className="font-medium text-gray-200">{maxHold.queueAtRecommendedStop}m</p>
                </div>
              </div>
              {tcLengthM && tcLengthM > 0 && (
                <div className="bg-gray-900/50 rounded p-2 mb-2">
                  <p className="text-xs text-gray-400">
                    📏 TC zone length:{' '}
                    <span className="text-white font-semibold">{tcLengthM}m</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Clearance time:{' '}
                    <span className="text-white font-semibold">
                      ~{Math.round((tcLengthM / 40) * 3.6)}s
                    </span>
                  </p>
                </div>
              )}
              {maxHold.queueAtRecommendedStop > PREPARE_TO_STOP_DISTANCE_M && (
                <div className="bg-red-900/30 border border-red-700 rounded p-2 mb-2">
                  <p className="text-xs text-red-400">
                    ⚠️ Queue at {maxHold.recommendedStopMinutes}min stop (
                    {maxHold.queueAtRecommendedStop}m) exceeds Prepare to Stop distance (
                    {PREPARE_TO_STOP_DISTANCE_M}m)
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Based on weekday peak {vphOneDirWeekday} VPH/direction, {heavyPctWeekday}% heavy.
                Sign distances: Prepare to Stop {PREPARE_TO_STOP_DISTANCE_M}m, Adv Queue Warning{' '}
                {ADV_QUEUE_WARNING_DISTANCE_M}m.
              </p>
            </div>
          )}

          {/* Shuttle Flow Table */}
          <details className="text-sm">
            <summary className="text-cyan-400 cursor-pointer">
              📋 AGTTM & MRWA COP Shuttle Flow Table
            </summary>
            <div className="mt-2 bg-gray-700/30 rounded p-2 overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr className="text-gray-400">
                    <th className="text-left pr-2 py-0.5">VPH (both dir)</th>
                    <th className="text-left py-0.5">Max Length</th>
                    <th className="text-left py-0.5">Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={reducedVph >= 701 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">701-800</td>
                    <td>70m</td>
                    <td className="text-gray-500">AGTTM</td>
                  </tr>
                  <tr className={reducedVph >= 601 && reducedVph <= 700 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">601-700</td>
                    <td>100m</td>
                    <td className="text-gray-500">AGTTM</td>
                  </tr>
                  <tr className={reducedVph >= 501 && reducedVph <= 600 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">501-600</td>
                    <td>150m</td>
                    <td className="text-gray-500">AGTTM</td>
                  </tr>
                  <tr className={reducedVph >= 401 && reducedVph <= 500 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">401-500</td>
                    <td>250m</td>
                    <td className="text-gray-500">AGTTM</td>
                  </tr>
                  <tr className={reducedVph >= 351 && reducedVph <= 400 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">351-400</td>
                    <td>400m</td>
                    <td className="text-gray-500">AGTTM</td>
                  </tr>
                  <tr className={reducedVph >= 301 && reducedVph <= 350 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">301-350</td>
                    <td>600m</td>
                    <td className="text-gray-500">AGTTM</td>
                  </tr>
                  <tr className={reducedVph >= 251 && reducedVph <= 300 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">≤300</td>
                    <td>800m</td>
                    <td className="text-gray-500">AGTTM</td>
                  </tr>
                  <tr className={reducedVph >= 201 && reducedVph <= 250 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">201-250</td>
                    <td>1200m</td>
                    <td className="text-amber-500">MRWA COP</td>
                  </tr>
                  <tr className={reducedVph >= 151 && reducedVph <= 200 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">151-200</td>
                    <td>1600m</td>
                    <td className="text-amber-500">MRWA COP</td>
                  </tr>
                  <tr className={reducedVph < 151 ? 'bg-blue-900/30' : ''}>
                    <td className="pr-2 py-0.5">≤150</td>
                    <td>2200m</td>
                    <td className="text-amber-500">MRWA COP</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-gray-500 mt-1">
                MRWA COP rows exceed AGTTM limits — risk assessment required to the satisfaction of
                the relevant road authority
              </p>
            </div>
          </details>

          {traffic.distance_to_site !== undefined && (
            <p className="text-xs text-cyan-400 mt-2">
              📍 Nearest count site: {traffic.distance_to_site} km from work zone
            </p>
          )}

          <p className="text-xs text-gray-500 mt-2">Source: {traffic.source}</p>

          {traffic.nearest_sites && traffic.nearest_sites.length > 1 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Other nearby count sites:</p>
              <div className="text-xs space-y-1">
                {traffic.nearest_sites.slice(1, 4).map((site, i) => (
                  <div key={i} className="flex justify-between text-gray-300">
                    <span>{site.location}</span>
                    <span className="text-gray-500">
                      {site.aadt?.toLocaleString()} v/d ({site.distance_km} km)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {traffic.note && <p className="text-xs text-amber-400 mt-2">{traffic.note}</p>}
        </div>
      )}
    </div>
  );
}
