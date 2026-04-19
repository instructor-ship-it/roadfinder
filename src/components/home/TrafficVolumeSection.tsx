/**
 * Traffic Volume Section Component
 *
 * Displays traffic data including AADT, peak hour volume, shuttle flow calculations,
 * and maximum hold time calculations. Supports both MRWA data and user-counted data.
 *
 * @module components/home/TrafficVolumeSection
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  calculateMaxHoldTime,
  PREPARE_TO_STOP_DISTANCE_M,
  ADV_QUEUE_WARNING_DISTANCE_M,
} from '@/lib/max-hold-time';
import { getShuttleFlowLength, getLaneCapacity } from '@/lib/traffic-calculations';
import type { TrafficData } from '@/types/shared';
import type { TrafficCountRecord } from '@/lib/traffic-counter-storage';

// Re-export for convenience
export type { TrafficCountRecord } from '@/lib/traffic-counter-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrafficVolumeSectionProps {
  traffic: TrafficData | null;
  userTrafficCounts: TrafficCountRecord[];
  userTrafficOverride: TrafficCountRecord | null;
  selectedRoad: string;
  selectedRegion: string;
  startSlk: string;
  roadName: string;
  tcLengthM?: number;
  onSetUserTrafficOverride: (record: TrafficCountRecord | null) => void;
  onSelectCountDetail: (record: TrafficCountRecord) => void;
  defaultExpanded?: boolean;
}

// ─── Reference Table Component ───────────────────────────────────────────────

function ShuttleFlowReferenceTable({ reducedVph }: { reducedVph: number }) {
  const rows = [
    { range: '701-800', max: '70m', source: 'AGTTM', highlight: reducedVph >= 701 },
    {
      range: '601-700',
      max: '100m',
      source: 'AGTTM',
      highlight: reducedVph >= 601 && reducedVph <= 700,
    },
    {
      range: '501-600',
      max: '150m',
      source: 'AGTTM',
      highlight: reducedVph >= 501 && reducedVph <= 600,
    },
    {
      range: '401-500',
      max: '250m',
      source: 'AGTTM',
      highlight: reducedVph >= 401 && reducedVph <= 500,
    },
    {
      range: '351-400',
      max: '400m',
      source: 'AGTTM',
      highlight: reducedVph >= 351 && reducedVph <= 400,
    },
    {
      range: '301-350',
      max: '600m',
      source: 'AGTTM',
      highlight: reducedVph >= 301 && reducedVph <= 350,
    },
    {
      range: '≤300',
      max: '800m',
      source: 'AGTTM',
      highlight: reducedVph >= 251 && reducedVph <= 300,
    },
    {
      range: '201-250',
      max: '1200m',
      source: 'MRWA COP',
      highlight: reducedVph >= 201 && reducedVph <= 250,
    },
    {
      range: '151-200',
      max: '1600m',
      source: 'MRWA COP',
      highlight: reducedVph >= 151 && reducedVph <= 200,
    },
    { range: '≤150', max: '2200m', source: 'MRWA COP', highlight: reducedVph < 151 },
  ];

  return (
    <details className="mt-2">
      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
        📖 Reference Table (AGTTM Part 2, Table 3.5 & MRWA COP Table 15)
      </summary>
      <div className="mt-2 text-xs bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
        <table className="w-full">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left pr-2">VPH (both dir)</th>
              <th className="text-left">Max Length</th>
              <th className="text-left">Source</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {rows.map((row, i) => (
              <tr key={i} className={row.highlight ? 'bg-blue-900/30' : ''}>
                <td className="pr-2 py-0.5">{row.range}</td>
                <td>{row.max}</td>
                <td className={row.source === 'MRWA COP' ? 'text-amber-500' : 'text-gray-500'}>
                  {row.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-gray-500 mt-1">
          MRWA COP rows exceed AGTTM limits — risk assessment required to the satisfaction of the
          relevant road authority
        </p>
      </div>
    </details>
  );
}

// ─── Max Hold Time Display Component ──────────────────────────────────────────

function MaxHoldTimeDisplay({
  maxHold,
  tcLengthM,
  vphOneDir,
  heavyPct,
}: {
  maxHold: NonNullable<ReturnType<typeof calculateMaxHoldTime>>;
  tcLengthM?: number;
  vphOneDir: number;
  heavyPct: number;
}) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-700">
      <div className="bg-orange-900/20 border border-orange-700/50 rounded p-3">
        <h4 className="text-sm font-medium text-orange-400 mb-2">⏱️ Maximum Hold Time</h4>
        <div className="grid grid-cols-2 gap-3 text-sm mb-2">
          <div>
            <p className="text-gray-400 text-xs">Max Hold</p>
            <p className="text-xl font-bold text-orange-300">{maxHold.maxHoldTimeMinutes} min</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Recommended Stop</p>
            <p
              className={`text-xl font-bold ${maxHold.belowMinimum ? 'text-red-400' : 'text-white'}`}
            >
              {maxHold.recommendedStopMinutes} min
              {maxHold.belowMinimum && (
                <span className="text-xs font-normal ml-1">⚠️ exceeds max</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Queue Growth</p>
            <p className="font-medium text-gray-200">{maxHold.queueGrowthRate} m/min</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Queue @ {maxHold.recommendedStopMinutes}min</p>
            <p className="font-medium text-gray-200">{maxHold.queueAtRecommendedStop}m</p>
          </div>
        </div>
        {tcLengthM && tcLengthM > 0 && (
          <div className="bg-gray-900/50 rounded p-2 mb-2">
            <p className="text-xs text-gray-400">
              📏 TC zone length: <span className="text-white font-semibold">{tcLengthM}m</span>
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
              ⚠️ Queue at {maxHold.recommendedStopMinutes}min stop ({maxHold.queueAtRecommendedStop}
              m) exceeds Prepare to Stop distance ({PREPARE_TO_STOP_DISTANCE_M}m)
            </p>
          </div>
        )}
        <p className="text-xs text-gray-500">
          Based on {vphOneDir} VPH/direction, {heavyPct.toFixed(1)}% heavy. Sign distances: Prepare
          to Stop {PREPARE_TO_STOP_DISTANCE_M}m, Adv Queue Warning {ADV_QUEUE_WARNING_DISTANCE_M}m.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TrafficVolumeSection({
  traffic,
  userTrafficCounts,
  userTrafficOverride,
  selectedRoad,
  selectedRegion,
  startSlk,
  roadName,
  tcLengthM,
  onSetUserTrafficOverride,
  onSelectCountDetail,
  defaultExpanded = true,
}: TrafficVolumeSectionProps) {
  const [showTraffic, setShowTraffic] = useState(defaultExpanded);

  const countTrafficUrl = selectedRoad
    ? `/traffic-counter?road_id=${selectedRoad}&road_name=${encodeURIComponent(roadName)}&slk=${startSlk}&region=${encodeURIComponent(selectedRegion)}`
    : '/traffic-counter';

  const hasRealTrafficData = traffic && (traffic.aadt || traffic.peak_hour_volume);

  // Calculate traffic values for MRWA data
  const mrwaCalculations = useMemo(() => {
    if (!traffic) return null;

    let peakHourBothDir = traffic.peak_hour_volume || 0;
    let peakHourOneDir = Math.round(peakHourBothDir / 2);
    const estimatedPeakFromAadt = traffic.aadt ? Math.round(traffic.aadt * 0.1) : 0;
    let vphBothDir = peakHourBothDir || estimatedPeakFromAadt;
    let vphOneDir = peakHourOneDir || Math.round(vphBothDir / 2);
    let heavyPct = traffic.heavy_vehicle_percent || 0;
    let overrideActive = false;

    // Apply user traffic override if active
    if (userTrafficOverride) {
      const ov = userTrafficOverride;
      const ovOneDir = ov.vph_one_direction || 0;
      const ovBothDir =
        ov.direction_mode === 'both-ways' ? ov.vph_combined || ovOneDir * 2 : ovOneDir * 2;
      vphBothDir = ovBothDir;
      vphOneDir = ovOneDir;
      heavyPct = ov.heavy_percentage || 0;
      overrideActive = true;
    }

    const reductionFactor = heavyPct > 10 ? 0.8 : 1;
    const reducedVph = Math.round(vphBothDir * reductionFactor);
    const shuttleFlow = getShuttleFlowLength(reducedVph);
    const laneCapacity = getLaneCapacity(Math.round(vphOneDir * reductionFactor));
    const maxHold = calculateMaxHoldTime(vphOneDir, heavyPct);

    return {
      vphBothDir,
      vphOneDir,
      heavyPct,
      reductionFactor,
      reducedVph,
      shuttleFlow,
      laneCapacity,
      maxHold,
      overrideActive,
    };
  }, [traffic, userTrafficOverride]);

  // Calculate traffic values for user count (no MRWA data)
  const userCountCalculations = useMemo(() => {
    if (userTrafficCounts.length === 0) return null;

    const primaryCount = userTrafficCounts[0];
    const vphOneDir = primaryCount.vph_one_direction || 0;
    const vphBothDir =
      primaryCount.direction_mode === 'both-ways'
        ? primaryCount.vph_combined || vphOneDir * 2
        : vphOneDir * 2;
    const heavyPct = primaryCount.heavy_percentage || 0;
    const reductionFactor = heavyPct > 10 ? 0.8 : 1;
    const reducedVph = Math.round(vphBothDir * reductionFactor);
    const shuttleFlow = getShuttleFlowLength(reducedVph);
    const laneCapacity = getLaneCapacity(Math.round(vphOneDir * reductionFactor));
    const maxHold = calculateMaxHoldTime(vphOneDir, heavyPct);

    return {
      primaryCount,
      vphBothDir,
      vphOneDir,
      heavyPct,
      reductionFactor,
      reducedVph,
      shuttleFlow,
      laneCapacity,
      maxHold,
    };
  }, [userTrafficCounts]);

  // STATE 3: No data at all
  if (!hasRealTrafficData && userTrafficCounts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg">
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-semibold text-blue-400">🚗 Traffic Volume</h3>
          <span className="text-gray-400 text-lg">{showTraffic ? '−' : '+'}</span>
        </button>
        {showTraffic && (
          <div className="px-4 pb-4">
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm mb-1">No traffic data available</p>
              <p className="text-gray-500 text-xs mb-3">
                {traffic?.source || 'No MRWA data for this road'}
              </p>
              <Link href={countTrafficUrl}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                  📊 Count Traffic
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STATE 2: No MRWA data, user counts exist
  if (!hasRealTrafficData && userCountCalculations) {
    const {
      primaryCount,
      vphBothDir,
      vphOneDir,
      heavyPct,
      reductionFactor,
      reducedVph,
      shuttleFlow,
      laneCapacity,
      maxHold,
    } = userCountCalculations;

    return (
      <div className="bg-gray-800 rounded-lg">
        <button
          onClick={() => setShowTraffic(!showTraffic)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-semibold text-blue-400">🚗 Traffic Volume</h3>
          <span className="text-gray-400 text-lg">{showTraffic ? '−' : '+'}</span>
        </button>
        {showTraffic && (
          <div className="px-4 pb-4">
            {/* User count header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                User Counted
              </span>
              <button
                className="text-xs text-gray-400 hover:text-white transition-colors"
                onClick={() => onSelectCountDetail(primaryCount)}
              >
                {new Date(primaryCount.date).toLocaleDateString('en-AU')} •{' '}
                {primaryCount.duration_minutes}min
                {primaryCount.slk && startSlk ? ` • SLK ${primaryCount.slk.toFixed(2)}` : ''}
              </button>
              <Link href={countTrafficUrl} className="ml-auto">
                <Button className="text-xs h-6 px-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300">
                  📊 New Count
                </Button>
              </Link>
            </div>

            {/* Traffic stats from user count */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400">Combined VPH</p>
                <p className="font-medium text-lg">{vphBothDir}</p>
                <p className="text-xs text-gray-500">
                  {primaryCount.direction_mode === 'both-ways'
                    ? 'both directions'
                    : 'one direction'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Heavy Vehicles</p>
                <p className="font-medium text-lg">{heavyPct.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">
                  {primaryCount.total_heavy}/{primaryCount.total_vehicles} counted
                </p>
              </div>
              {primaryCount.direction_mode === 'both-ways' && (
                <>
                  <div>
                    <p className="text-gray-400">True Left</p>
                    <p className="font-medium text-lg">{primaryCount.vph_true_left} VPH</p>
                    <p className="text-xs text-gray-500">
                      {(primaryCount.true_left_light || 0) + (primaryCount.true_left_heavy || 0)}{' '}
                      vehicles
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">True Right</p>
                    <p className="font-medium text-lg">{primaryCount.vph_true_right} VPH</p>
                    <p className="text-xs text-gray-500">
                      {(primaryCount.true_right_light || 0) + (primaryCount.true_right_heavy || 0)}{' '}
                      vehicles
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-gray-400">Worst Dir VPH</p>
                <p className="font-medium text-lg">{vphOneDir}</p>
                <p className="text-xs text-gray-500">
                  {primaryCount.total_vehicles} vehicles in {primaryCount.duration_minutes}min
                </p>
              </div>
            </div>

            {/* Calculated Values */}
            {vphBothDir > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-700">
                <h4 className="text-xs font-semibold text-green-400 mb-2">📊 Calculated Values</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-900 rounded p-2">
                    <p className="text-gray-400 text-xs">Est. VPH (both dir)</p>
                    <p className="font-medium text-white">{vphBothDir.toLocaleString()}</p>
                    {heavyPct > 10 && (
                      <p className="text-xs text-amber-400">
                        → {reducedVph.toLocaleString()} (reduced)
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-900 rounded p-2">
                    <p className="text-gray-400 text-xs">Lane Capacity</p>
                    <p className="font-medium text-white">{laneCapacity}</p>
                    <p className="text-xs text-gray-500">one direction</p>
                  </div>
                </div>
              </div>
            )}

            {/* Shuttle Flow */}
            {vphBothDir > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <h4 className="text-xs font-semibold text-purple-400 mb-2">
                  🚦 Shuttle Flow Max Length
                </h4>
                <div className="bg-gray-900 rounded p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Max single lane section:</span>
                    <span
                      className={`font-bold text-lg ${shuttleFlow.risk ? 'text-amber-400' : 'text-green-400'}`}
                    >
                      {shuttleFlow.length}
                    </span>
                  </div>
                  {shuttleFlow.risk && (
                    <p className="text-xs text-amber-400 mt-1">
                      ⚠️ Exceeds AGTTM limits — risk assessment required to the satisfaction of the
                      relevant road authority (MRWA COP Section 6.8.7)
                    </p>
                  )}
                  {heavyPct > 10 && (
                    <p className="text-xs text-amber-400 mt-1">
                      ⚠️ Heavy vehicles &gt;10%: 20% volume reduction applied
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Based on {reducedVph.toLocaleString()} VPH (both directions)
                  </p>
                </div>
                <ShuttleFlowReferenceTable reducedVph={reducedVph} />
              </div>
            )}

            {/* Maximum Hold Time */}
            {maxHold && (
              <MaxHoldTimeDisplay
                maxHold={maxHold}
                tcLengthM={tcLengthM}
                vphOneDir={vphOneDir}
                heavyPct={heavyPct}
              />
            )}

            {/* Other user counts */}
            {userTrafficCounts.length > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-2">
                  Other counts ({userTrafficCounts.length - 1} more):
                </p>
                <div className="text-xs space-y-1">
                  {userTrafficCounts.slice(1, 4).map((record) => (
                    <div
                      key={record.id}
                      className="flex justify-between text-gray-300 cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors"
                      onClick={() => onSelectCountDetail(record)}
                    >
                      <span>
                        {record.vph_one_direction} VPH • {record.heavy_percentage}% heavy •{' '}
                        {record.duration_minutes}min
                      </span>
                      <span className="text-gray-500">
                        {new Date(record.date).toLocaleDateString('en-AU')}
                        {record.slk &&
                          startSlk &&
                          ` • ${
                            Math.abs(record.slk - parseFloat(startSlk)) < 0.05
                              ? 'at work zone'
                              : `${Math.abs(record.slk - parseFloat(startSlk)).toFixed(1)} km`
                          }`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Source: User counted data (no MRWA data available)
            </p>
          </div>
        )}
      </div>
    );
  }

  // STATE 1: Has real MRWA traffic data
  if (!mrwaCalculations) return null;

  const {
    vphBothDir,
    vphOneDir,
    heavyPct,
    reductionFactor,
    reducedVph,
    shuttleFlow,
    laneCapacity,
    maxHold,
    overrideActive,
  } = mrwaCalculations;

  return (
    <div className="bg-gray-800 rounded-lg">
      <button
        onClick={() => setShowTraffic(!showTraffic)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold text-blue-400">
          🚗 Traffic Volume
          {traffic?.fromCache && (
            <span className="ml-2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
              Cached {traffic.cachedAt ? new Date(traffic.cachedAt).toLocaleTimeString() : ''}
            </span>
          )}
        </h3>
        <span className="text-gray-400 text-lg">{showTraffic ? '−' : '+'}</span>
      </button>
      {showTraffic && (
        <div className="px-4 pb-4">
          {/* Raw Traffic Data */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400">AADT</p>
              <p className="font-medium text-lg">{traffic?.aadt?.toLocaleString() || 'N/A'}</p>
              <p className="text-xs text-gray-500">vehicles/day</p>
            </div>
            <div>
              <p className="text-gray-400">Peak Hour (est.)</p>
              <p className="font-medium text-lg">{traffic?.peak_hour_volume || 'N/A'}</p>
              <p className="text-xs text-gray-500">vehicles/hour (both dir)</p>
            </div>
            <div>
              <p className="text-gray-400">Heavy Vehicles</p>
              <p className="font-medium text-lg">{traffic?.heavy_vehicle_percent}%</p>
            </div>
            <div>
              <p className="text-gray-400">Data Year</p>
              <p className="font-medium text-lg">{traffic?.aadt_year}</p>
            </div>
          </div>

          {/* Override banner */}
          {overrideActive && userTrafficOverride && (
            <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-2 mb-3 mt-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-400 font-semibold">📊 Using live count data</p>
                <p className="text-xs text-gray-400">
                  {vphBothDir} VPH • {heavyPct}% heavy • {userTrafficOverride.duration_minutes}min
                  count
                </p>
              </div>
              <button
                onClick={() => onSetUserTrafficOverride(null)}
                className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
              >
                Revert
              </button>
            </div>
          )}

          {/* Calculated Values */}
          {vphBothDir > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700">
              <h4 className="text-xs font-semibold text-green-400 mb-2">📊 Calculated Values</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-900 rounded p-2">
                  <p className="text-gray-400 text-xs">Est. VPH (both dir)</p>
                  <p className="font-medium text-white">{vphBothDir.toLocaleString()}</p>
                  {heavyPct > 10 && (
                    <p className="text-xs text-amber-400">
                      → {reducedVph.toLocaleString()} (reduced)
                    </p>
                  )}
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <p className="text-gray-400 text-xs">Lane Capacity</p>
                  <p className="font-medium text-white">{laneCapacity}</p>
                  <p className="text-xs text-gray-500">one direction</p>
                </div>
              </div>
            </div>
          )}

          {/* Shuttle Flow */}
          {vphBothDir > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <h4 className="text-xs font-semibold text-purple-400 mb-2">
                🚦 Shuttle Flow Max Length
              </h4>
              <div className="bg-gray-900 rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Max single lane section:</span>
                  <span
                    className={`font-bold text-lg ${shuttleFlow.risk ? 'text-amber-400' : 'text-green-400'}`}
                  >
                    {shuttleFlow.length}
                  </span>
                </div>
                {shuttleFlow.risk && (
                  <p className="text-xs text-amber-400 mt-1">
                    ⚠️ Exceeds AGTTM limits — risk assessment required to the satisfaction of the
                    relevant road authority (MRWA COP Section 6.8.7)
                  </p>
                )}
                {heavyPct > 10 && (
                  <p className="text-xs text-amber-400 mt-1">
                    ⚠️ Heavy vehicles &gt;10%: 20% volume reduction applied
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Based on {reducedVph.toLocaleString()} VPH (both directions)
                </p>
              </div>
              <ShuttleFlowReferenceTable reducedVph={reducedVph} />
            </div>
          )}

          {/* Maximum Hold Time */}
          {maxHold && (
            <MaxHoldTimeDisplay
              maxHold={maxHold}
              tcLengthM={tcLengthM}
              vphOneDir={vphOneDir}
              heavyPct={heavyPct}
            />
          )}

          {/* User counts section for MRWA data */}
          {userTrafficCounts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">
                Your traffic counts ({userTrafficCounts.length}):
              </p>
              <div className="text-xs space-y-1">
                {userTrafficCounts.slice(0, 3).map((record) => (
                  <div
                    key={record.id}
                    className="flex justify-between text-gray-300 cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 -mx-2 transition-colors"
                    onClick={() => onSelectCountDetail(record)}
                  >
                    <span>
                      {record.vph_one_direction} VPH • {record.heavy_percentage}% heavy •{' '}
                      {record.duration_minutes}min
                    </span>
                    <span className="text-gray-500">
                      {new Date(record.date).toLocaleDateString('en-AU')}
                    </span>
                  </div>
                ))}
              </div>
              <Link href={countTrafficUrl} className="block mt-2">
                <Button className="text-xs h-7 w-full bg-blue-600/30 hover:bg-blue-600/50 text-blue-300">
                  📊 New Count
                </Button>
              </Link>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Source: MRWA Traffic Data ({traffic?.aadt_year || 'Unknown year'})
            {traffic?.source && ` • ${traffic.source}`}
          </p>
        </div>
      )}
    </div>
  );
}

export default TrafficVolumeSection;
