'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// App version constant - single source of truth
export const APP_VERSION = '1.26.0';

// Offline toggles type - shared with page.tsx
export interface OfflineToggles {
  roadsList: boolean;
  workZoneLookup: boolean;
  speedZones: boolean;
  railCrossings: boolean;
  regulatorySigns: boolean;
  warningSigns: boolean;
  amenities: boolean;
}

// Types for props
interface SettingsDrawerProps {
  // Page context
  variant?: 'home' | 'drive';

  // Offline data props (home page)
  offlineStats?: {
    total_roads: number;
    pavement_roads?: number;
    traffic_roads?: number;
    download_date: string;
  } | null;
  downloading?: boolean;
  downloadProgress?: string;
  onDownloadData?: () => void;
  onClearData?: () => void;

  // GPS settings props
  gpsSettings?: {
    ekfEnabled: boolean;
    showUncertainty: boolean;
    earlyWarnings: boolean;
    gpsLagCompensation?: number;
    speedLookaheadTime?: number;
  };
  onUpdateGpsSetting?: (key: string, value: boolean | number) => void;

  // Preferences props
  defaultRegion?: string;
  regions?: string[];
  onUpdateRegion?: (region: string) => void;
  windGustThreshold?: number;
  onUpdateWindGustThreshold?: (threshold: number) => void;

  // Drive page specific
  showSpeedDisplay?: boolean;
  onToggleSpeedDisplay?: (value: boolean) => void;
  showAfterCareOnDrive?: boolean;
  onToggleAfterCare?: (value: boolean) => void;
  afterCareLookaheadKm?: number;
  onUpdateAfterCareLookahead?: (km: number) => void;

  // TC Tools props
  result?: unknown;
  setDistanceActive?: boolean;
  onStartSetDistance?: () => void;
  onExportReport?: () => void;
  exporting?: boolean;

  // Admin sync props (home page)
  mrwaStatus?: {
    _meta?: {
      mrwaReachable: boolean;
      message: string;
    };
    roads?: { total: number };
    speedZones?: { total: number };
    railCrossings?: { total: number };
    regulatorySigns?: { total: number };
    warningSigns?: { total: number };
  };
  datasetStats?: {
    roads: { count: number; lastSync: string | null };
    speedZones: { count: number; lastSync: string | null };
    railCrossings: { count: number; lastSync: string | null };
    regulatorySigns: { count: number; lastSync: string | null };
    warningSigns: { count: number; lastSync: string | null };
  } | null;
  syncProgress?: Record<string, { status: string; message: string; percent: number }>;
  syncingDatasets?: Set<string>;
  onSyncAll?: () => void;
  onSyncDataset?: (dataset: string) => void;
  onGenerateDebug?: () => void;

  // Offline toggles
  offlineToggles?: {
    roadsList: boolean;
    workZoneLookup: boolean;
    speedZones: boolean;
    railCrossings: boolean;
    regulatorySigns: boolean;
    warningSigns: boolean;
    amenities: boolean;
  };
  onUpdateOfflineToggle?: (key: keyof OfflineToggles, value: boolean) => void;
  onResetOfflineToggles?: () => void;

  // Offline ready indicator
  offlineReady?: boolean;
}

export function SettingsDrawer({
  variant = 'home',
  offlineStats,
  downloading = false,
  downloadProgress,
  onDownloadData,
  onClearData,
  gpsSettings,
  onUpdateGpsSetting,
  defaultRegion = '',
  regions = [],
  onUpdateRegion,
  windGustThreshold = 60,
  onUpdateWindGustThreshold,
  showSpeedDisplay = false,
  onToggleSpeedDisplay,
  showAfterCareOnDrive = true,
  onToggleAfterCare,
  afterCareLookaheadKm = 5,
  onUpdateAfterCareLookahead,
  result,
  setDistanceActive = false,
  onStartSetDistance,
  onExportReport,
  exporting = false,
  mrwaStatus,
  datasetStats,
  syncProgress = {},
  syncingDatasets = new Set(),
  onSyncAll,
  onSyncDataset,
  onGenerateDebug,
  offlineToggles,
  onUpdateOfflineToggle,
  onResetOfflineToggles,
  offlineReady = false,
}: SettingsDrawerProps) {
  // Section expansion state
  const [showAbout, setShowAbout] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSpeedOverrides, setShowSpeedOverrides] = useState(false);
  const [showTcTools, setShowTcTools] = useState(false);
  const [showAdminSync, setShowAdminSync] = useState(false);
  const [showGpsTracking, setShowGpsTracking] = useState(false);
  const [showOfflineData, setShowOfflineData] = useState(false); // Always start collapsed
  const [showAiSettings, setShowAiSettings] = useState(false);

  // AI settings state
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiTestingKey, setAiTestingKey] = useState(false);
  const [aiKeyVisible, setAiKeyVisible] = useState(false);

  // Load AI settings from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('ai_api_key') || '';
    setAiApiKey(savedKey);
  }, []);

  // Keep in sync: when data is downloaded, collapse; when cleared, also collapse
  useEffect(() => {
    if (offlineStats) setShowOfflineData(false);
  }, [offlineStats]);

  // Save AI API key
  const saveAiApiKey = () => {
    localStorage.setItem('ai_api_key', aiApiKey);
    alert('✓ API key saved!');
  };

  // Test AI connection
  const testAiConnection = async () => {
    if (!aiApiKey) {
      alert('Please enter an API key first');
      return;
    }
    setAiTestingKey(true);
    try {
      const response = await fetch('/api/ai/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: aiApiKey }),
      });
      const data = await response.json();
      if (data.success) {
        alert('✓ Connection successful!');
      } else {
        alert('✗ ' + (data.error || 'Connection failed'));
      }
    } catch (err) {
      alert('✗ Connection failed: Network error');
    } finally {
      setAiTestingKey(false);
    }
  };

  // Clear AI settings
  const clearAiSettings = () => {
    if (confirm('Clear API key?')) {
      setAiApiKey('');
      localStorage.removeItem('ai_api_key');
    }
  };

  // Page-specific info
  const pageName = variant === 'home' ? 'TC Work Zone Locator' : 'SLK Tracking';
  const pageDescription =
    variant === 'home'
      ? 'Mobile-first PWA for Traffic Controllers in Western Australia'
      : 'GPS-based SLK tracking for Traffic Controllers in Western Australia';

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full text-xl font-bold bg-gray-700 hover:bg-gray-600"
          title="Settings"
        >
          ☰
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-gray-900 border-gray-700 max-h-[85vh]">
        <DrawerHeader className="border-b border-gray-700 pb-3">
          <DrawerTitle className="text-blue-400 text-lg">Settings</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 py-4 flex-1">
          {/* ABOUT Section */}
          <div className="mb-3">
            <button
              onClick={() => setShowAbout(!showAbout)}
              className="w-full text-left text-sm font-semibold text-cyan-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
            >
              <span className={`transition-transform duration-200 ${showAbout ? 'rotate-90' : ''}`}>
                ›
              </span>
              ℹ️ About
            </button>

            {showAbout && (
              <div className="space-y-3 mt-2 pl-3 border-l-4 border-cyan-500/60">
                <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
                  <h4 className="text-white font-semibold mb-2">{pageName}</h4>
                  <p className="text-gray-400 text-xs mb-3">{pageDescription}</p>
                  <div className="text-xs mb-1">
                    <span className="text-gray-400">Version {APP_VERSION}</span>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
                  <h4 className="text-amber-400 font-semibold mb-2">📧 Contact</h4>
                  <p className="text-gray-400 text-xs">
                    Developer:{' '}
                    <a href="mailto:dev@jaytec.net" className="text-blue-400 hover:underline">
                      dev@jaytec.net
                    </a>
                  </p>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
                  <h4 className="text-purple-400 font-semibold mb-2">🤝 Contributors</h4>
                  <p className="text-gray-400 text-xs">• Jaytec (Developer)</p>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3 text-sm">
                  <h4 className="text-green-400 font-semibold mb-2">🛠️ Built With</h4>
                  <div className="text-gray-400 text-xs space-y-1">
                    <p>• Next.js 16 / React</p>
                    <p>• Tailwind CSS</p>
                    <p>• IndexedDB for Offline Storage</p>
                    <p>• Extended Kalman Filter for GPS smoothing</p>
                  </div>
                </div>

                {/* Documents Link */}
                <Link
                  href="/library"
                  className="block bg-blue-900/40 hover:bg-blue-900/60 border border-blue-700/50 rounded-lg p-3 text-sm transition-colors"
                >
                  <h4 className="text-blue-400 font-semibold mb-1">📚 Documents Library</h4>
                  <p className="text-gray-400 text-xs">
                    View traffic control documents, standards, and reference materials
                  </p>
                </Link>

                {/* User Manual Link */}
                <Link href="/manual">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-sm">
                    📖 Open User Manual
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* LIBRARY Section */}
          <div className="mb-3">
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className="w-full text-left text-sm font-semibold text-purple-400 py-2 flex items-center gap-2 border-b border-gray-700/50 hover:text-purple-300 transition-colors"
            >
              <span
                className={`transition-transform duration-200 ${showLibrary ? 'rotate-90' : ''}`}
              >
                ›
              </span>
              <span>📚</span>
              Library
            </button>

            {showLibrary && (
              <div className="space-y-1 mt-1 pl-3 border-l-2 border-purple-500/60">
                <Link href="/library">
                  <button className="w-full text-left text-sm text-gray-300 py-1.5 px-2 flex items-center gap-2 hover:bg-gray-700/50 rounded transition-colors">
                    <span>📚</span>
                    Document Registers
                  </button>
                </Link>

                <Link href="/qa">
                  <button className="w-full text-left text-sm text-purple-300 py-1.5 px-2 flex items-center gap-2 hover:bg-purple-700/30 rounded transition-colors">
                    <span>🤖</span>
                    AI Q&A Assistant
                    <span className="text-xs text-purple-400 bg-purple-900/50 px-1.5 py-0.5 rounded">
                      NEW
                    </span>
                  </button>
                </Link>

                <Link href="/library/expanded">
                  <button className="w-full text-left text-sm text-gray-300 py-1.5 px-2 flex items-center gap-2 hover:bg-gray-700/50 rounded transition-colors">
                    <span>📖</span>
                    Expanded
                  </button>
                </Link>

                <div className="pl-4 border-l border-gray-700/50 ml-2">
                  <Link href="/library/tmp">
                    <button className="w-full text-left text-sm text-gray-400 py-1.5 px-2 flex items-center gap-2 hover:bg-gray-700/50 rounded transition-colors">
                      <span>📋</span>
                      TMP
                    </button>
                  </Link>

                  <div className="pl-4 border-l border-gray-700/30 ml-2">
                    <Link href="/library/tmp/wheatbelt/tmp-0922-01531-rev6">
                      <button className="w-full text-left text-xs text-gray-500 py-1 px-2 flex items-center gap-2 hover:bg-gray-700/50 rounded transition-colors">
                        <span>🌾</span>
                        Wheatbelt TMP
                        <span className="text-green-500 text-xs">231 TGS</span>
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Document Processing */}
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <button
                    onClick={async () => {
                      if (!aiApiKey) {
                        alert('Please configure your AI API key first (in AI Settings section)');
                        return;
                      }
                      // Navigate to document processing or show modal
                      window.location.href = '/library?process=true';
                    }}
                    className="w-full text-left text-sm text-amber-300 py-1.5 px-2 flex items-center gap-2 hover:bg-amber-700/30 rounded transition-colors"
                  >
                    <span>🧠</span>
                    Document Processing
                    <span className="text-xs text-amber-400 bg-amber-900/50 px-1.5 py-0.5 rounded">
                      AI
                    </span>
                  </button>
                  <p className="text-xs text-gray-500 px-2 mt-1">
                    Auto-generate summaries & extract knowledge from PDFs
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* PREFERENCES Section */}
          <div className="mb-3">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="w-full text-left text-sm font-semibold text-gray-300 py-2 flex items-center gap-2 border-b border-gray-700/50"
            >
              <span
                className={`transition-transform duration-200 ${showPreferences ? 'rotate-90' : ''}`}
              >
                ›
              </span>
              ⚙️ Preferences
            </button>

            {showPreferences && (
              <div className="space-y-4 mt-2 pl-3 border-l-4 border-gray-400/60">
                {/* EKF Filtering Toggle (if gpsSettings provided) */}
                {gpsSettings && onUpdateGpsSetting && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">EKF Filtering</span>
                      <button
                        onClick={() => onUpdateGpsSetting('ekfEnabled', !gpsSettings.ekfEnabled)}
                        className={`w-12 h-6 rounded-full transition-colors ${gpsSettings.ekfEnabled ? 'bg-purple-600' : 'bg-gray-600'}`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${gpsSettings.ekfEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                        ></span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Kalman filter for smoother, accurate GPS tracking
                    </p>
                  </>
                )}

                {/* Speed Display Toggle (drive page) */}
                {onToggleSpeedDisplay && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Speed Display</span>
                      <button
                        onClick={() => onToggleSpeedDisplay(!showSpeedDisplay)}
                        className={`w-12 h-6 rounded-full transition-colors ${showSpeedDisplay ? 'bg-cyan-600' : 'bg-gray-600'}`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${showSpeedDisplay ? 'translate-x-6' : 'translate-x-0'}`}
                        ></span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Display current speed and posted speed</p>
                  </>
                )}

                {/* AfterCare Alerts Toggle (drive page) */}
                {onToggleAfterCare && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">AfterCare Alerts</span>
                      <button
                        onClick={() => onToggleAfterCare(!showAfterCareOnDrive)}
                        className={`w-12 h-6 rounded-full transition-colors ${showAfterCareOnDrive ? 'bg-green-600' : 'bg-gray-600'}`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white transition-transform ${showAfterCareOnDrive ? 'translate-x-6' : 'translate-x-0'}`}
                        ></span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Display nearby AfterCare signage alerts</p>
                  </>
                )}

                {/* AfterCare Lookahead Distance (drive page) */}
                {onUpdateAfterCareLookahead && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      AfterCare Lookahead (km)
                    </label>
                    <div className="flex gap-2">
                      {[2, 5, 10, 20].map((km) => (
                        <Button
                          key={km}
                          onClick={() => onUpdateAfterCareLookahead(km)}
                          className={`flex-1 h-8 text-xs ${afterCareLookaheadKm === km ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                        >
                          {km}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">How far ahead to look for signs</p>
                  </div>
                )}

                {/* Default Region Selector (home page) */}
                {regions.length > 0 && onUpdateRegion && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Default Region</label>
                    <Select
                      value={defaultRegion || '__none__'}
                      onValueChange={(value) => onUpdateRegion(value === '__none__' ? '' : value)}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-10">
                        <SelectValue placeholder="Select default region" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="__none__" className="text-gray-400">
                          None
                        </SelectItem>
                        {regions.map((region) => (
                          <SelectItem key={region} value={region} className="text-white">
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Pre-selects this region on load</p>
                  </div>
                )}

                {/* Wind Gust Alert Threshold (home page) */}
                {onUpdateWindGustThreshold && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Wind Gust Alert Threshold
                    </label>
                    <div className="flex gap-2">
                      {[40, 50, 60, 80].map((threshold) => (
                        <Button
                          key={threshold}
                          onClick={() => onUpdateWindGustThreshold(threshold)}
                          className={`flex-1 h-8 text-xs ${windGustThreshold === threshold ? 'bg-amber-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                        >
                          {threshold}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Alert when gusts exceed this (km/h)
                    </p>
                  </div>
                )}

                {/* Show Uncertainty Toggle */}
                {gpsSettings && onUpdateGpsSetting && (
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm text-white">Show Uncertainty</span>
                      <p className="text-xs text-gray-500">Display GPS accuracy indicator</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={gpsSettings.showUncertainty}
                      onChange={(e) => onUpdateGpsSetting('showUncertainty', e.target.checked)}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                      disabled={!gpsSettings.ekfEnabled}
                    />
                  </label>
                )}

                {/* Early Warnings Toggle */}
                {gpsSettings && onUpdateGpsSetting && (
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm text-white">Early Warnings</span>
                      <p className="text-xs text-gray-500">
                        Alert earlier at higher speeds (3 sec travel time)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={gpsSettings.earlyWarnings}
                      onChange={(e) => onUpdateGpsSetting('earlyWarnings', e.target.checked)}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* SPEED ZONE OVERRIDES Section */}
          <div className="mb-3">
            <button
              onClick={() => setShowSpeedOverrides(!showSpeedOverrides)}
              className="w-full text-left text-sm font-semibold text-orange-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
            >
              <span
                className={`transition-transform duration-200 ${showSpeedOverrides ? 'rotate-90' : ''}`}
              >
                ›
              </span>
              🔧 Speed Zone Overrides
            </button>

            {showSpeedOverrides && (
              <div className="space-y-3 mt-2 pl-3 border-l-4 border-orange-500/60">
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-2">
                    Community-verified corrections for MRWA speed zone data. Overrides are applied
                    automatically when you search or track on affected roads.
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400">✓ Active (M031 corrections loaded)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-500">Version:</span>
                    <span className="text-gray-400">1.0 • Updated: 2025-03-02</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-500">Affected Roads:</span>
                    <span className="text-orange-400">M031 (4 zone corrections)</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Override data is bundled with the app and loaded automatically. Corrections are
                  field-verified where MRWA data is outdated after road works.
                </p>
                <Link href="/overrides">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-sm">
                    📋 Manage Overrides & Generate Reports
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* TC TOOLS Section */}
          <div className="mb-3">
            <button
              onClick={() => setShowTcTools(!showTcTools)}
              className="w-full text-left text-sm font-semibold text-cyan-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
            >
              <span
                className={`transition-transform duration-200 ${showTcTools ? 'rotate-90' : ''}`}
              >
                ›
              </span>
              🛠️ TC Tools
            </button>

            {showTcTools && (
              <div className="space-y-3 mt-2 pl-3 border-l-4 border-cyan-500/60">
                {/* Set Distance (home page) */}
                {onStartSetDistance ? (
                  <div className="pt-2">
                    {!setDistanceActive ? (
                      <DrawerClose asChild>
                        <button
                          onClick={onStartSetDistance}
                          className="text-cyan-400 hover:text-cyan-300 text-sm pl-2"
                          type="button"
                        >
                          📏 Set Distance
                        </button>
                      </DrawerClose>
                    ) : (
                      <div className="flex items-center gap-2 text-sm pl-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span className="text-green-400">Set Distance Active</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Export Work Zone Info (home page) */}
                {onExportReport && !!result && (
                  <div className="pt-1">
                    <button
                      onClick={onExportReport}
                      disabled={exporting}
                      className="text-cyan-400 hover:text-cyan-300 text-sm pl-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      type="button"
                    >
                      {exporting ? '📄 Exporting...' : '📄 Export Work Zone Info'}
                    </button>
                  </div>
                )}

                {/* AfterCare Signs */}
                <div className="pt-1">
                  <DrawerClose asChild>
                    <Link
                      href="/aftercare"
                      className="text-cyan-400 hover:text-cyan-300 text-sm pl-2 block"
                    >
                      🚧 AfterCare Signs
                    </Link>
                  </DrawerClose>
                </div>

                {/* Traffic Counter */}
                <div className="pt-1">
                  <DrawerClose asChild>
                    <Link
                      href="/traffic-counter"
                      className="text-cyan-400 hover:text-cyan-300 text-sm pl-2 block"
                    >
                      📊 Traffic Counter
                    </Link>
                  </DrawerClose>
                </div>
              </div>
            )}
          </div>

          {/* GPS & TRACKING Section (home page) */}
          {gpsSettings && onUpdateGpsSetting && (
            <div className="mb-3">
              <button
                onClick={() => setShowGpsTracking(!showGpsTracking)}
                className="w-full text-left text-sm font-semibold text-purple-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
              >
                <span
                  className={`transition-transform duration-200 ${showGpsTracking ? 'rotate-90' : ''}`}
                >
                  ›
                </span>
                📍 GPS & Tracking
              </button>

              {showGpsTracking && (
                <div className="space-y-3 mt-2 pl-3 border-l-4 border-purple-500/60">
                  {/* GPS Calibration */}
                  <div className="bg-gray-900 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-amber-400 mb-3">
                      🎯 GPS Calibration
                    </h4>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Lag Compensation</span>
                        <span className="text-sm font-mono text-yellow-400">
                          {gpsSettings.gpsLagCompensation && gpsSettings.gpsLagCompensation > 0
                            ? `+${gpsSettings.gpsLagCompensation}s`
                            : 'Not set'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500">
                        Calibrate GPS lag to improve speed sign lookahead accuracy.
                      </p>

                      <Button
                        onClick={() => (window.location.href = '/calibrate')}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-sm"
                      >
                        🎯 Open Calibration Tool
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OFFLINE DATA Section */}
          {onDownloadData && (
            <div className="mb-3">
              {offlineStats ? (
                /* Downloaded: compact single-line display */
                <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                  <span className="text-sm text-gray-400">
                    📦 Offline Data
                    <span className="ml-2 text-xs text-green-400">
                      ✓ {offlineStats.total_roads.toLocaleString()} roads
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      (updated {new Date(offlineStats.download_date).toLocaleDateString()})
                    </span>
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowOfflineData(true)}
                      className="text-xs h-6 px-2 bg-gray-700 hover:bg-gray-600"
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              ) : (
                /* Not downloaded: full expandable section */
                <>
                  <button
                    onClick={() => setShowOfflineData(!showOfflineData)}
                    className="w-full text-left text-sm font-semibold text-blue-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
                  >
                    <span
                      className={`transition-transform duration-200 ${showOfflineData ? 'rotate-90' : ''}`}
                    >
                      ›
                    </span>
                    📦 Offline Data
                  </button>

                  {showOfflineData && (
                    <div className="space-y-3 mt-2 pl-3 border-l-4 border-blue-500/60">
                      <p className="text-gray-400 text-sm">
                        Download road data for offline SLK tracking without internet.
                      </p>

                      {downloadProgress && (
                        <p
                          className={`text-sm ${downloadProgress.startsWith('✓') ? 'text-green-400' : downloadProgress.startsWith('Error') ? 'text-red-400' : 'text-blue-400'}`}
                        >
                          {downloadProgress}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={onDownloadData}
                          disabled={downloading}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {downloading ? 'Downloading...' : 'Download Data'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Manage panel (opens from compact view or remains accessible) */}
              {showOfflineData && offlineStats && (
                <div className="space-y-3 mt-2 pl-3 border-l-4 border-blue-500/60">
                  <div className="text-sm">
                    <p className="text-green-400">✓ Offline data downloaded</p>
                    <p className="text-gray-400">
                      {offlineStats.total_roads.toLocaleString()} roads
                    </p>
                    {offlineStats.pavement_roads && (
                      <p className="text-gray-400">
                        {offlineStats.pavement_roads.toLocaleString()} roads with pavement data
                      </p>
                    )}
                    {offlineStats.traffic_roads && (
                      <p className="text-gray-400">
                        {offlineStats.traffic_roads.toLocaleString()} roads with traffic data
                      </p>
                    )}
                    <p className="text-gray-500 text-xs">
                      Downloaded: {new Date(offlineStats.download_date).toLocaleDateString()}
                    </p>
                  </div>

                  {downloadProgress && (
                    <p
                      className={`text-sm ${downloadProgress.startsWith('✓') ? 'text-green-400' : downloadProgress.startsWith('Error') ? 'text-red-400' : 'text-blue-400'}`}
                    >
                      {downloadProgress}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={onDownloadData}
                      disabled={downloading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {downloading ? 'Downloading...' : 'Update Data'}
                    </Button>
                    {onClearData && (
                      <Button
                        onClick={() => {
                          onClearData();
                          setShowOfflineData(false);
                        }}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={downloading}
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Offline Data Source Toggles */}
                  {offlineToggles && onUpdateOfflineToggle && (
                    <div className="mt-4 pt-3 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-amber-400">
                          ⚡ Data Source Toggles
                        </p>
                        {onResetOfflineToggles && (
                          <Button
                            onClick={onResetOfflineToggles}
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-500 h-6 px-2"
                          >
                            Reset All
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Default: OFFLINE mode (uses local data first, falls back to online if
                        unavailable).
                      </p>

                      <div className="space-y-2">
                        {(
                          [
                            { key: 'roadsList', label: 'Roads List' },
                            { key: 'workZoneLookup', label: 'Work Zone Lookup' },
                            { key: 'speedZones', label: 'Speed Zones' },
                            { key: 'railCrossings', label: 'Rail Crossings' },
                            { key: 'regulatorySigns', label: 'Regulatory Signs' },
                            { key: 'warningSigns', label: 'Warning Signs' },
                            { key: 'amenities', label: 'Amenities (Hospital, Fuel, Toilet)' },
                          ] as const
                        ).map(({ key, label }) => (
                          <label
                            key={key}
                            className="flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-750"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={offlineToggles[key] || false}
                                onChange={(e) => onUpdateOfflineToggle?.(key, e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                              />
                              <span className="text-sm text-gray-300">{label}</span>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${offlineToggles[key] ? 'bg-amber-600 text-white' : 'bg-green-600/30 text-green-300'}`}
                            >
                              {offlineToggles[key] ? 'OFFLINE' : 'ONLINE'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ADMIN DATA SYNC Section - Collapsed by default */}
          {onSyncAll && (
            <div className="mb-3">
              <button
                onClick={() => setShowAdminSync(!showAdminSync)}
                className="w-full text-left text-sm font-semibold text-amber-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
              >
                <span
                  className={`transition-transform duration-200 ${showAdminSync ? 'rotate-90' : ''}`}
                >
                  ›
                </span>
                🔧 Admin Data Sync
              </button>

              {showAdminSync && (
                <div className="space-y-3 mt-2 pl-3 border-l-4 border-amber-500/60">
                  <p className="text-xs text-gray-500">
                    Sync data directly from MRWA servers. Downloads in chunks to avoid memory
                    issues. Signage data is filtered to speed/railway signs only.
                  </p>

                  {/* MRWA Connection Status */}
                  {mrwaStatus?._meta && (
                    <div
                      className={`rounded p-2 text-xs ${mrwaStatus._meta.mrwaReachable ? 'bg-green-900/30' : 'bg-amber-900/30'}`}
                    >
                      <p
                        className={`font-semibold mb-1 ${mrwaStatus._meta.mrwaReachable ? 'text-green-400' : 'text-amber-400'}`}
                      >
                        {mrwaStatus._meta.mrwaReachable ? '✓ MRWA Connected' : '⚠ MRWA Unreachable'}
                      </p>
                      <p className="text-gray-400">{mrwaStatus._meta.message}</p>
                    </div>
                  )}

                  {/* MRWA Status */}
                  {mrwaStatus && mrwaStatus._meta?.mrwaReachable && (
                    <div className="bg-gray-900 rounded p-2 text-xs">
                      <p className="text-gray-400 font-semibold mb-1">MRWA Server Status:</p>
                      <div className="grid grid-cols-2 gap-1">
                        <span className="text-gray-500">Roads:</span>
                        <span className="text-gray-300">
                          {mrwaStatus.roads?.total?.toLocaleString() || '?'}
                        </span>
                        <span className="text-gray-500">Speed Zones:</span>
                        <span className="text-gray-300">
                          {mrwaStatus.speedZones?.total?.toLocaleString() || '?'}
                        </span>
                        <span className="text-gray-500">Rail Crossings:</span>
                        <span className="text-gray-300">
                          {mrwaStatus.railCrossings?.total?.toLocaleString() || '?'}
                        </span>
                        <span className="text-gray-500">Reg Signs:</span>
                        <span className="text-gray-300">
                          {mrwaStatus.regulatorySigns?.total?.toLocaleString() || '?'}
                        </span>
                        <span className="text-gray-500">Warn Signs:</span>
                        <span className="text-gray-300">
                          {mrwaStatus.warningSigns?.total?.toLocaleString() || '?'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Local Dataset Status */}
                  {datasetStats && (
                    <div className="bg-gray-900 rounded p-2 text-xs">
                      <p className="text-gray-400 font-semibold mb-1">Local Data Status:</p>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="text-gray-500">Dataset</span>
                        <span className="text-gray-500">Count</span>
                        <span className="text-gray-500">Sync Date</span>

                        <span className="text-gray-300">Roads</span>
                        <span className="text-gray-300">{datasetStats.roads.count}</span>
                        <span className="text-gray-400">
                          {datasetStats.roads.lastSync
                            ? new Date(datasetStats.roads.lastSync).toLocaleDateString()
                            : '-'}
                        </span>

                        <span className="text-gray-300">Speed Zones</span>
                        <span className="text-gray-300">{datasetStats.speedZones.count}</span>
                        <span className="text-gray-400">
                          {datasetStats.speedZones.lastSync
                            ? new Date(datasetStats.speedZones.lastSync).toLocaleDateString()
                            : '-'}
                        </span>

                        <span className="text-gray-300">Rail Crossings</span>
                        <span className="text-gray-300">{datasetStats.railCrossings.count}</span>
                        <span className="text-gray-400">
                          {datasetStats.railCrossings.lastSync
                            ? new Date(datasetStats.railCrossings.lastSync).toLocaleDateString()
                            : '-'}
                        </span>

                        <span className="text-gray-300">Reg Signs</span>
                        <span className="text-gray-300">{datasetStats.regulatorySigns.count}</span>
                        <span className="text-gray-400">
                          {datasetStats.regulatorySigns.lastSync
                            ? new Date(datasetStats.regulatorySigns.lastSync).toLocaleDateString()
                            : '-'}
                        </span>

                        <span className="text-gray-300">Warn Signs</span>
                        <span className="text-gray-300">{datasetStats.warningSigns.count}</span>
                        <span className="text-gray-400">
                          {datasetStats.warningSigns.lastSync
                            ? new Date(datasetStats.warningSigns.lastSync).toLocaleDateString()
                            : '-'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sync Progress */}
                  {Object.keys(syncProgress).length > 0 && (
                    <div className="bg-gray-900 rounded p-2 text-xs">
                      <p className="text-gray-400 font-semibold mb-1">Sync Progress:</p>
                      {Object.entries(syncProgress).map(([dataset, progress]) => (
                        <div key={dataset} className="mb-1">
                          <div className="flex justify-between">
                            <span className="text-gray-300 capitalize">
                              {dataset.replace(/([A-Z])/g, ' $1')}
                            </span>
                            <span
                              className={
                                progress.status === 'complete'
                                  ? 'text-green-400'
                                  : progress.status === 'error'
                                    ? 'text-red-400'
                                    : 'text-blue-400'
                              }
                            >
                              {progress.message}
                            </span>
                          </div>
                          {progress.status === 'syncing' && (
                            <div className="w-full bg-gray-700 h-1 rounded mt-1">
                              <div
                                className="bg-blue-500 h-1 rounded"
                                style={{ width: `${progress.percent}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sync Buttons */}
                  <div className="space-y-2">
                    <Button
                      onClick={onSyncAll}
                      disabled={syncingDatasets.size > 0}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-sm"
                    >
                      {syncingDatasets.size > 0
                        ? `Syncing ${syncingDatasets.size} dataset(s)...`
                        : '🔄 Sync All from MRWA'}
                    </Button>

                    {onSyncDataset && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'roads',
                          'speedZones',
                          'railCrossings',
                          'regulatorySigns',
                          'warningSigns',
                        ].map((dataset) => (
                          <Button
                            key={dataset}
                            onClick={() => onSyncDataset(dataset)}
                            disabled={syncingDatasets.has(dataset)}
                            className="bg-gray-600 hover:bg-gray-500 text-xs py-1 h-8"
                          >
                            {syncingDatasets.has(dataset)
                              ? '...'
                              : `Sync ${dataset.replace(/([A-Z])/g, ' $1')}`}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Debug Button */}
                  {onGenerateDebug && (
                    <Button
                      onClick={onGenerateDebug}
                      className="w-full bg-gray-600 hover:bg-gray-500 text-sm mt-2"
                    >
                      🔧 Generate Debug Info
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI ASSISTANT Section */}
          <div className="mb-3">
            <button
              onClick={() => setShowAiSettings(!showAiSettings)}
              className="w-full text-left text-sm font-semibold text-purple-400 py-2 flex items-center gap-2 border-b border-gray-700/50"
            >
              <span
                className={`transition-transform duration-200 ${showAiSettings ? 'rotate-90' : ''}`}
              >
                ›
              </span>
              🤖 AI Assistant
              {aiApiKey && (
                <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded ml-1">
                  ✓ Configured
                </span>
              )}
            </button>

            {showAiSettings && (
              <div className="space-y-3 mt-2 pl-3 border-l-4 border-purple-500/60">
                <div className="bg-gray-900/50 rounded-lg p-3 text-xs">
                  <p className="text-gray-400 mb-2">
                    Enter your z.ai API key to enable direct AI chat in the Q&A Assistant.
                  </p>
                  <a
                    href="https://z.ai/manage-apikey/apikey-list"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Get your API key at z.ai →
                  </a>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">API Key</label>
                  <div className="relative">
                    <input
                      type={aiKeyVisible ? 'text' : 'password'}
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="{API Key ID}.{secret}"
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2 pr-10 text-sm font-mono"
                    />
                    <button
                      onClick={() => setAiKeyVisible(!aiKeyVisible)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {aiKeyVisible ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Format: {`{ID}.{secret}`} • Stored locally on this device
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={testAiConnection}
                    disabled={!aiApiKey || aiTestingKey}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
                  >
                    {aiTestingKey ? 'Testing...' : 'Test'}
                  </Button>
                  <Button
                    onClick={saveAiApiKey}
                    disabled={!aiApiKey}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                  >
                    Save
                  </Button>
                  {aiApiKey && (
                    <Button
                      onClick={clearAiSettings}
                      className="bg-red-600 hover:bg-red-700 text-sm"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Link to Q&A */}
                <Link href="/qa">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-sm">
                    🤖 Open Q&A Assistant
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default SettingsDrawer;
