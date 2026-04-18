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
export const APP_VERSION = '1.33.1';

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
  onOpenTrafficEventLogger?: () => void;

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

// Section Header Component
function SectionHeader({
  icon,
  title,
  expanded,
  onClick,
}: {
  icon: string;
  title: string;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-white hover:text-cyan-400 transition-colors"
    >
      <span className="flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </span>
      <span
        className={`text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      >
        ▼
      </span>
    </button>
  );
}

// Menu Item Component
function MenuItem({
  icon,
  label,
  href,
  onClick,
  badge,
  close,
}: {
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
  close?: () => void;
}) {
  const content = (
    <span className="flex items-center gap-3">
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-400">{badge}</span>
      )}
      <span className="text-gray-600">→</span>
    </span>
  );

  if (href) {
    return (
      <DrawerClose asChild>
        <Link
          href={href}
          className="block py-2 px-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded transition-colors"
        >
          {content}
        </Link>
      </DrawerClose>
    );
  }

  return (
    <DrawerClose asChild>
      <button
        onClick={onClick}
        className="w-full text-left py-2 px-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded transition-colors"
      >
        {content}
      </button>
    </DrawerClose>
  );
}

// Toggle Switch Component
function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between py-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <div className="flex-1">
        <span className="text-sm text-white">{label}</span>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-cyan-600' : 'bg-gray-700'}`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </label>
  );
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
  onOpenTrafficEventLogger,
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
  const [expanded, setExpanded] = useState<string | null>(null);

  // AI settings state
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiTestingKey, setAiTestingKey] = useState(false);

  // Load AI settings from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('ai_api_key') || '';
    setAiApiKey(savedKey);
  }, []);

  // Toggle section
  const toggleSection = (section: string) => {
    setExpanded(expanded === section ? null : section);
  };

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

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full text-xl font-bold bg-gray-700 hover:bg-gray-600"
          title="Settings"
          aria-label="Open settings menu"
          aria-haspopup="dialog"
        >
          ☰
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-gray-900 border-gray-700 max-h-[85vh]">
        <DrawerHeader className="border-b border-gray-800 pb-3">
          <DrawerTitle className="text-white text-lg">Menu</DrawerTitle>
          <p className="text-xs text-gray-500 mt-1">v{APP_VERSION}</p>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1">
          {/* TC TOOLS Section */}
          <div className="border-b border-gray-800">
            <SectionHeader
              icon="🛠️"
              title="TC Tools"
              expanded={expanded === 'tools'}
              onClick={() => toggleSection('tools')}
            />
            {expanded === 'tools' && (
              <div className="px-2 pb-3 space-y-1">
                {onStartSetDistance && !setDistanceActive && (
                  <MenuItem icon="📏" label="Set Distance" onClick={onStartSetDistance} />
                )}
                {setDistanceActive && (
                  <div className="py-2 px-3 text-sm text-green-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Set Distance Active
                  </div>
                )}
                {onExportReport && result !== null && result !== undefined && (
                  <MenuItem
                    icon="📄"
                    label={exporting ? 'Exporting...' : 'Export Report'}
                    onClick={onExportReport}
                  />
                )}
                <MenuItem icon="🚧" label="AfterCare Signs" href="/aftercare" />
                <MenuItem icon="📊" label="Traffic Counter" href="/traffic-counter" />
                <MenuItem icon="⏱️" label="Cycle Timer" href="/cycle-timer" />
                <MenuItem icon="👥" label="Contact Directory" href="/contacts" />
                {onOpenTrafficEventLogger && (
                  <MenuItem icon="📝" label="Event Logger" onClick={onOpenTrafficEventLogger} />
                )}
              </div>
            )}
          </div>

          {/* LIBRARY Section */}
          <div className="border-b border-gray-800">
            <SectionHeader
              icon="📚"
              title="Library"
              expanded={expanded === 'library'}
              onClick={() => toggleSection('library')}
            />
            {expanded === 'library' && (
              <div className="px-2 pb-3 space-y-1">
                <MenuItem icon="📚" label="Document Registers" href="/library" />
                <MenuItem icon="🤖" label="AI Q&A Assistant" href="/qa" badge="AI" />
                <MenuItem icon="📖" label="Expanded Library" href="/library/expanded" />
                <MenuItem icon="📋" label="TMP Documents" href="/library/tmp" />
              </div>
            )}
          </div>

          {/* PREFERENCES Section */}
          <div className="border-b border-gray-800">
            <SectionHeader
              icon="⚙️"
              title="Preferences"
              expanded={expanded === 'prefs'}
              onClick={() => toggleSection('prefs')}
            />
            {expanded === 'prefs' && (
              <div className="px-3 pb-3 space-y-1">
                {gpsSettings && onUpdateGpsSetting && (
                  <>
                    <ToggleSwitch
                      label="EKF Filtering"
                      description="Kalman filter for GPS smoothing"
                      checked={gpsSettings.ekfEnabled}
                      onChange={(v) => onUpdateGpsSetting('ekfEnabled', v)}
                    />
                    <ToggleSwitch
                      label="Show Uncertainty"
                      description="Display GPS accuracy indicator"
                      checked={gpsSettings.showUncertainty}
                      onChange={(v) => onUpdateGpsSetting('showUncertainty', v)}
                      disabled={!gpsSettings.ekfEnabled}
                    />
                    <ToggleSwitch
                      label="Early Warnings"
                      description="Alert earlier at higher speeds"
                      checked={gpsSettings.earlyWarnings}
                      onChange={(v) => onUpdateGpsSetting('earlyWarnings', v)}
                    />
                  </>
                )}

                {onToggleSpeedDisplay && (
                  <ToggleSwitch
                    label="Speed Display"
                    description="Show current and posted speed"
                    checked={showSpeedDisplay}
                    onChange={onToggleSpeedDisplay}
                  />
                )}

                {onToggleAfterCare && (
                  <ToggleSwitch
                    label="AfterCare Alerts"
                    description="Nearby signage warnings"
                    checked={showAfterCareOnDrive}
                    onChange={onToggleAfterCare}
                  />
                )}

                {onUpdateAfterCareLookahead && (
                  <div className="py-2">
                    <span className="text-sm text-white">AfterCare Lookahead</span>
                    <div className="flex gap-2 mt-2">
                      {[2, 5, 10, 20].map((km) => (
                        <button
                          key={km}
                          onClick={() => onUpdateAfterCareLookahead(km)}
                          className={`flex-1 py-1.5 text-xs rounded transition-colors ${
                            afterCareLookaheadKm === km
                              ? 'bg-cyan-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {km} km
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {regions.length > 0 && onUpdateRegion && (
                  <div className="py-2">
                    <span className="text-sm text-white">Default Region</span>
                    <Select
                      value={defaultRegion || '__none__'}
                      onValueChange={(v) => onUpdateRegion(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9 mt-2">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="__none__" className="text-gray-400">
                          None
                        </SelectItem>
                        {regions.map((r) => (
                          <SelectItem key={r} value={r} className="text-white">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {onUpdateWindGustThreshold && (
                  <div className="py-2">
                    <span className="text-sm text-white">Wind Gust Alert (km/h)</span>
                    <div className="flex gap-2 mt-2">
                      {[40, 50, 60, 80].map((t) => (
                        <button
                          key={t}
                          onClick={() => onUpdateWindGustThreshold(t)}
                          className={`flex-1 py-1.5 text-xs rounded transition-colors ${
                            windGustThreshold === t
                              ? 'bg-amber-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GPS & CALIBRATION Section */}
          {gpsSettings && onUpdateGpsSetting && (
            <div className="border-b border-gray-800">
              <SectionHeader
                icon="📍"
                title="GPS & Calibration"
                expanded={expanded === 'gps'}
                onClick={() => toggleSection('gps')}
              />
              {expanded === 'gps' && (
                <div className="px-3 pb-3">
                  <div className="py-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Lag Compensation</span>
                      <span className="font-mono text-yellow-400">
                        {gpsSettings.gpsLagCompensation && gpsSettings.gpsLagCompensation > 0
                          ? `+${gpsSettings.gpsLagCompensation}s`
                          : 'Not set'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Calibrate GPS lag for speed sign lookahead accuracy.
                    </p>
                    <Link href="/calibrate">
                      <Button className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-sm h-9">
                        🎯 Open Calibration Tool
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OFFLINE DATA Section */}
          {onDownloadData && (
            <div className="border-b border-gray-800">
              <SectionHeader
                icon="📦"
                title="Offline Data"
                expanded={expanded === 'offline'}
                onClick={() => toggleSection('offline')}
              />
              {expanded === 'offline' && (
                <div className="px-3 pb-3 space-y-3">
                  {offlineStats ? (
                    <>
                      <div className="text-sm">
                        <p className="text-green-400">
                          ✓ {offlineStats.total_roads.toLocaleString()} roads downloaded
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Updated: {new Date(offlineStats.download_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={onDownloadData}
                          disabled={downloading}
                          className="flex-1 bg-green-600 hover:bg-green-700 h-9"
                        >
                          {downloading ? 'Updating...' : 'Update Data'}
                        </Button>
                        {onClearData && (
                          <Button
                            onClick={onClearData}
                            className="bg-red-600 hover:bg-red-700 h-9"
                            disabled={downloading}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-400">
                        Download road data for offline SLK tracking.
                      </p>
                      <Button
                        onClick={onDownloadData}
                        disabled={downloading}
                        className="w-full bg-green-600 hover:bg-green-700 h-9"
                      >
                        {downloading ? 'Downloading...' : 'Download Data'}
                      </Button>
                    </>
                  )}

                  {downloadProgress && (
                    <p
                      className={`text-sm ${downloadProgress.startsWith('✓') ? 'text-green-400' : 'text-blue-400'}`}
                    >
                      {downloadProgress}
                    </p>
                  )}

                  {/* Data Source Toggles */}
                  {offlineToggles && onUpdateOfflineToggle && (
                    <div className="pt-2 border-t border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white">Data Source Toggles</span>
                        {onResetOfflineToggles && (
                          <button
                            onClick={onResetOfflineToggles}
                            className="text-xs text-gray-500 hover:text-white"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {(
                          [
                            { key: 'roadsList', label: 'Roads List' },
                            { key: 'workZoneLookup', label: 'Work Zone Lookup' },
                            { key: 'speedZones', label: 'Speed Zones' },
                            { key: 'railCrossings', label: 'Rail Crossings' },
                            { key: 'regulatorySigns', label: 'Regulatory Signs' },
                            { key: 'warningSigns', label: 'Warning Signs' },
                            { key: 'amenities', label: 'Amenities' },
                          ] as const
                        ).map(({ key, label }) => (
                          <label key={key} className="flex items-center justify-between py-1.5">
                            <span className="text-sm text-gray-300">{label}</span>
                            <span
                              onClick={() => onUpdateOfflineToggle?.(key, !offlineToggles[key])}
                              className={`text-xs px-2 py-0.5 rounded cursor-pointer ${
                                offlineToggles[key]
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-green-600/30 text-green-300'
                              }`}
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

          {/* SPEED ZONE OVERRIDES Section */}
          <div className="border-b border-gray-800">
            <SectionHeader
              icon="🔧"
              title="Speed Zone Overrides"
              expanded={expanded === 'overrides'}
              onClick={() => toggleSection('overrides')}
            />
            {expanded === 'overrides' && (
              <div className="px-3 pb-3">
                <p className="text-xs text-gray-400 mb-2">
                  Community-verified corrections for MRWA speed zone data.
                </p>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-500">Status:</span>
                  <span className="text-green-400">✓ Active</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-500">Affected Roads:</span>
                  <span className="text-orange-400">M031</span>
                </div>
                <Link href="/overrides">
                  <Button className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-sm h-9">
                    Manage Overrides
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* ADMIN DATA SYNC Section */}
          {onSyncAll && (
            <div className="border-b border-gray-800">
              <SectionHeader
                icon="🔄"
                title="Admin Data Sync"
                expanded={expanded === 'admin'}
                onClick={() => toggleSection('admin')}
              />
              {expanded === 'admin' && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={onSyncAll}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 h-9"
                    >
                      Sync All
                    </Button>
                    {onGenerateDebug && (
                      <Button
                        onClick={onGenerateDebug}
                        className="bg-gray-700 hover:bg-gray-600 h-9"
                      >
                        Debug
                      </Button>
                    )}
                  </div>

                  {datasetStats && (
                    <div className="text-xs space-y-1">
                      {Object.entries(datasetStats).map(([key, val]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-500">{key}:</span>
                          <span className="text-gray-300">{val.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI ASSISTANT Section */}
          <div className="border-b border-gray-800">
            <SectionHeader
              icon="🤖"
              title="AI Assistant"
              expanded={expanded === 'ai'}
              onClick={() => toggleSection('ai')}
            />
            {expanded === 'ai' && (
              <div className="px-3 pb-3 space-y-2">
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="Enter API key"
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={saveAiApiKey}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 h-9"
                  >
                    Save Key
                  </Button>
                  <Button
                    onClick={testAiConnection}
                    disabled={aiTestingKey}
                    className="bg-gray-700 hover:bg-gray-600 h-9"
                  >
                    {aiTestingKey ? 'Testing...' : 'Test'}
                  </Button>
                </div>
                <p className="text-xs text-amber-500/80 mt-1">
                  ⚠️ Key stored locally. Only use on trusted devices.
                </p>
              </div>
            )}
          </div>

          {/* ABOUT Section */}
          <div className="border-b border-gray-800">
            <SectionHeader
              icon="ℹ️"
              title="About"
              expanded={expanded === 'about'}
              onClick={() => toggleSection('about')}
            />
            {expanded === 'about' && (
              <div className="px-3 pb-3 space-y-2">
                <div className="text-sm">
                  <p className="text-white font-medium">
                    {variant === 'home' ? 'TC Work Zone Locator' : 'SLK Tracking'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Mobile-first PWA for Traffic Controllers in Western Australia
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-500">Version:</span>
                  <span className="text-gray-300">{APP_VERSION}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-gray-500">Developer:</span>
                  <a href="mailto:dev@jaytec.net" className="text-cyan-400 hover:underline">
                    dev@jaytec.net
                  </a>
                </div>
                <Link href="/manual">
                  <Button className="w-full mt-2 bg-green-600 hover:bg-green-700 text-sm h-9">
                    📖 User Manual
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

// Default export for backward compatibility
export default SettingsDrawer;
