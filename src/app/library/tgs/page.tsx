'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Types for MMS frame data
interface SpacingEntry {
  postedSpeed_kmh: number;
  D_m: number;
  note?: string;
}

interface WorksiteSpeedRule {
  distanceFromLane: string;
  worksiteSpeed_kmh: number;
  rfReference: string;
}

interface FramePlate {
  id: string;
  plate1: string | null;
  plate2: string | null;
  plate3: string | null;
  frameType: string;
  hasReverseSide: boolean;
  mmsCodes: string[];
  reverseSide?: {
    plate1: string;
    plate2: string;
    plate3: string;
    mmsCodes: string[];
  };
}

interface FrameLayout {
  title: string;
  postedSpeed: string;
  worksiteSpeed: string;
  worksiteProximity: string;
  tmpPage: number;
  drawingNo: string;
  approachFrames: FramePlate[];
  spacings: Record<string, string>;
}

interface MmsCode {
  code: string;
  type: string;
  description: string;
}

interface CommonMistake {
  mistake: string;
  correct: string;
  wrong: string;
}

interface MmsFrameData {
  _meta: { title: string; version: string; generated: string; description: string };
  spacingTable: { source: string; description: string; values: SpacingEntry[] };
  worksiteSpeedRules: WorksiteSpeedRule[];
  speedFrameTemplate: {
    description: string;
    firstSpeedFrame: { plate1: string; plate2: string; plate3: string; mmsCodes: string[] };
    subsequentSpeedFrame: { plate1: string; plate2: string; plate3: string; mmsCodes: string[] };
  };
  trafficControlFrames: Array<{
    position: string;
    plate1: string;
    plate2: string | null;
    plate3: string | null;
    frameType: string;
    mmsCodes: string[];
  }>;
  departureTemplate: {
    description: string;
    plate1: string;
    plate2: string;
    plate3: string;
    mmsCodes: string[];
  };
  conditionalRules: Record<string, Record<string, string | boolean>>;
  frameLayouts: Record<string, FrameLayout>;
  mmsCodeReference: MmsCode[];
  commonMistakes: CommonMistake[];
}

type TabType = 'layouts' | 'codes' | 'spacing' | 'rules' | 'mistakes';

export default function TgsPage() {
  const [data, setData] = useState<MmsFrameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('layouts');
  const [expandedLayout, setExpandedLayout] = useState<string | null>('RF-046');
  const [expandedFrame, setExpandedFrame] = useState<string | null>(null);

  // Load TGS frame data
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/library/tgs-data/MMS_Frame_Layouts.json');
        if (!response.ok) throw new Error('Failed to load TGS data');
        const json: MmsFrameData = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load TGS data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // MMS code type badge
  const TypeBadge = ({ type }: { type: string }) => {
    const colours: Record<string, string> = {
      regulatory: 'bg-red-900/50 text-red-400',
      advisory: 'bg-blue-900/50 text-blue-400',
      termination: 'bg-gray-700 text-gray-300',
    };
    return (
      <span className={`${colours[type] || colours.advisory} px-2 py-0.5 text-xs rounded`}>
        {type}
      </span>
    );
  };

  // Frame visualiser - shows plates in a frame
  const FrameVisualiser = ({ frame, label }: { frame: FramePlate; label?: string }) => (
    <div className="bg-gray-800 rounded-lg p-3">
      {label && <p className="text-xs text-cyan-400 font-medium mb-2">{label}</p>}
      <div className="flex gap-1">
        {[frame.plate1, frame.plate2, frame.plate3]
          .filter((p) => p !== null)
          .map((plate, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-700 border border-gray-600 rounded p-2 text-center min-w-0"
            >
              <p className="text-xs text-white font-medium truncate">{plate}</p>
              {frame.mmsCodes[i] && (
                <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{frame.mmsCodes[i]}</p>
              )}
            </div>
          ))}
      </div>
      {frame.hasReverseSide && frame.reverseSide && (
        <div className="mt-2 border-t border-dashed border-gray-600 pt-2">
          <p className="text-[10px] text-gray-500 mb-1">Reverse side (departure)</p>
          <div className="flex gap-1">
            {[frame.reverseSide.plate1, frame.reverseSide.plate2, frame.reverseSide.plate3]
              .filter((p) => p !== null)
              .map((plate, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded p-1.5 text-center min-w-0"
                >
                  <p className="text-[10px] text-gray-300 truncate">{plate}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  const tabs: Array<{ key: TabType; label: string; icon: string }> = [
    { key: 'layouts', label: 'Layouts', icon: '🏗️' },
    { key: 'codes', label: 'MMS Codes', icon: '🏷️' },
    { key: 'spacing', label: 'Spacing', icon: '📏' },
    { key: 'rules', label: 'Rules', icon: '📐' },
    { key: 'mistakes', label: 'Mistakes', icon: '⚠️' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/library" className="text-cyan-400 hover:text-cyan-300 text-sm">
              &larr; Library
            </Link>
            <h1 className="text-lg font-bold">TGS / MMS Frames</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400">Loading TGS data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* LAYOUTS TAB */}
            {activeTab === 'layouts' && (
              <div className="space-y-4">
                {/* Worksite speed rules */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-cyan-400 mb-2">Worksite Speed Rules</h3>
                  <div className="space-y-2">
                    {data.worksiteSpeedRules.map((rule, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{rule.distanceFromLane} from lane</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {rule.worksiteSpeed_kmh} km/h
                          </span>
                          <span className="text-xs text-gray-500">({rule.rfReference})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Frame layouts */}
                {Object.entries(data.frameLayouts).map(([key, layout]) => (
                  <div
                    key={key}
                    className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
                  >
                    {/* Layout header */}
                    <button
                      onClick={() => setExpandedLayout(expandedLayout === key ? null : key)}
                      className="w-full px-3 py-3 flex items-center justify-between text-left"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-bold">{key}</span>
                          <span className="text-xs text-gray-500">TMP p.{layout.tmpPage}</span>
                        </div>
                        <p className="text-sm text-gray-300 mt-0.5">{layout.title}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          <span>Posted: {layout.postedSpeed}</span>
                          <span>Worksite: {layout.worksiteSpeed}</span>
                          <span>Proximity: {layout.worksiteProximity}</span>
                        </div>
                      </div>
                      <span
                        className={`text-gray-500 transition-transform ${expandedLayout === key ? 'rotate-180' : ''}`}
                      >
                        &#9660;
                      </span>
                    </button>

                    {/* Expanded layout details */}
                    {expandedLayout === key && (
                      <div className="px-3 pb-3 space-y-3 border-t border-gray-800 pt-3">
                        {/* Drawing reference */}
                        <p className="text-xs text-gray-500 font-mono">
                          Drawing: {layout.drawingNo}
                        </p>

                        {/* Approach frames */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-400 mb-2">
                            Approach Frames ({layout.approachFrames.length})
                          </h4>
                          <div className="space-y-2">
                            {layout.approachFrames.map((frame) => (
                              <div key={frame.id}>
                                <button
                                  onClick={() =>
                                    setExpandedFrame(
                                      expandedFrame === `${key}-${frame.id}`
                                        ? null
                                        : `${key}-${frame.id}`
                                    )
                                  }
                                  className="w-full text-left"
                                >
                                  <FrameVisualiser
                                    frame={frame}
                                    label={`Frame ${frame.id} (${frame.frameType})`}
                                  />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Spacings */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-400 mb-2">Sign Spacings</h4>
                          <div className="space-y-1">
                            {Object.entries(layout.spacings).map(([label, value]) => (
                              <div
                                key={label}
                                className="flex justify-between text-xs bg-gray-800 rounded px-2 py-1.5"
                              >
                                <span className="text-gray-300">{label.replace(/_/g, ' ')}</span>
                                <span className="text-cyan-400 font-mono">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* MMS CODES TAB */}
            {activeTab === 'codes' && (
              <div className="space-y-2">
                {/* Group by type */}
                {['regulatory', 'advisory', 'termination'].map((type) => {
                  const codes = data.mmsCodeReference.filter((c) => c.type === type);
                  if (codes.length === 0) return null;
                  return (
                    <div key={type}>
                      <h3 className="text-xs font-medium text-gray-400 uppercase mb-2 px-1">
                        {type} signs ({codes.length})
                      </h3>
                      <div className="space-y-1">
                        {codes.map((code) => (
                          <div
                            key={code.code}
                            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm text-cyan-400">{code.code}</span>
                              <span className="text-sm text-white">{code.description}</span>
                            </div>
                            <TypeBadge type={code.type} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SPACING TAB */}
            {activeTab === 'spacing' && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-cyan-400 mb-1">Sign Spacing Table</h3>
                  <p className="text-xs text-gray-500 mb-3">Source: {data.spacingTable.source}</p>
                  <div className="space-y-1">
                    {/* Header */}
                    <div className="flex justify-between text-xs text-gray-500 px-2 pb-1 border-b border-gray-800">
                      <span>Posted Speed</span>
                      <span>Distance D</span>
                    </div>
                    {data.spacingTable.values.map((entry, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm px-2 py-1.5 bg-gray-800/50 rounded"
                      >
                        <span className="text-white">
                          {entry.postedSpeed_kmh} km/h
                          {entry.note && (
                            <span className="text-gray-500 text-xs ml-1">({entry.note})</span>
                          )}
                        </span>
                        <span className="text-cyan-400 font-mono">{entry.D_m} m</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Speed frame templates */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-cyan-400 mb-3">Speed Frame Templates</h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-2">First Speed Frame</p>
                      <div className="flex gap-1">
                        {[
                          data.speedFrameTemplate.firstSpeedFrame.plate1,
                          data.speedFrameTemplate.firstSpeedFrame.plate2,
                          data.speedFrameTemplate.firstSpeedFrame.plate3,
                        ].map((plate, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-center"
                          >
                            <p className="text-xs text-white">{plate}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {data.speedFrameTemplate.firstSpeedFrame.mmsCodes[i]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 mb-2">Subsequent Speed Frames</p>
                      <div className="flex gap-1">
                        {[
                          data.speedFrameTemplate.subsequentSpeedFrame.plate1,
                          data.speedFrameTemplate.subsequentSpeedFrame.plate2,
                          data.speedFrameTemplate.subsequentSpeedFrame.plate3,
                        ].map((plate, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-center"
                          >
                            <p className="text-xs text-white">{plate}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              {data.speedFrameTemplate.subsequentSpeedFrame.mmsCodes[i]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Traffic control frames */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-cyan-400 mb-3">Traffic Control Frames</h3>
                  <div className="space-y-3">
                    {data.trafficControlFrames.map((frame, i) => (
                      <div key={i}>
                        <p className="text-xs text-gray-400 mb-1">{frame.position}</p>
                        <div className="flex gap-1">
                          {[frame.plate1, frame.plate2, frame.plate3]
                            .filter((p) => p !== null)
                            .map((plate, j) => (
                              <div
                                key={j}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-center"
                              >
                                <p className="text-xs text-white">{plate}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Departure template */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <h3 className="text-sm font-medium text-cyan-400 mb-3">Departure Side</h3>
                  <p className="text-xs text-gray-400 mb-2">{data.departureTemplate.description}</p>
                  <div className="flex gap-1">
                    {[
                      data.departureTemplate.plate1,
                      data.departureTemplate.plate2,
                      data.departureTemplate.plate3,
                    ].map((plate, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-center"
                      >
                        <p className="text-xs text-white">{plate}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {data.departureTemplate.mmsCodes[i]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* RULES TAB */}
            {activeTab === 'rules' && (
              <div className="space-y-3">
                {Object.entries(data.conditionalRules).map(([key, rules]) => {
                  const titleMap: Record<string, string> = {
                    postedSpeedGte100: 'Posted Speed 100 km/h or above',
                    postedSpeedGte80: 'Posted Speed 80 km/h or above',
                    postedSpeedLt80: 'Posted Speed below 80 km/h',
                  };
                  return (
                    <div key={key} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                      <h3 className="text-sm font-medium text-cyan-400 mb-2">
                        {titleMap[key] || key}
                      </h3>
                      <div className="space-y-1.5">
                        {Object.entries(rules).map(([ruleKey, value]) => {
                          const label = ruleKey
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (s) => s.toUpperCase());
                          return (
                            <div
                              key={ruleKey}
                              className="flex justify-between text-sm bg-gray-800/50 rounded px-2 py-1.5"
                            >
                              <span className="text-gray-300">{label}</span>
                              <span className="text-white text-right max-w-[60%]">
                                {typeof value === 'boolean'
                                  ? value
                                    ? 'Required'
                                    : 'Not required'
                                  : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MISTAKES TAB */}
            {activeTab === 'mistakes' && (
              <div className="space-y-3">
                {data.commonMistakes.map((mistake, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                    <h3 className="text-sm font-medium text-amber-400 mb-2">{mistake.mistake}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-green-400 shrink-0">Correct:</span>
                        <span className="text-white">{mistake.correct}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-400 shrink-0">Wrong:</span>
                        <span className="text-gray-400">{mistake.wrong}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
