'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MobileNav, MobilePage } from '@/components/ui/mobile-nav';
import { APP_VERSION } from '@/components/SettingsDrawer';

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
      className={`flex items-center justify-between py-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <div className="flex-">
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

// Section Component
function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-gray-800">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/30">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-medium text-white">{title}</h2>
      </div>
      <div className="px-4">{children}</div>
    </section>
  );
}

// Menu Item Component
function MenuItem({
  icon,
  label,
  href,
  onClick,
  badge,
}: {
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: string;
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
      <Link
        href={href}
        className="block py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors -mx-4 px-4"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors -mx-4 px-4"
    >
      {content}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  // GPS Settings state
  const [ekfEnabled, setEkfEnabled] = useState(true);
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [earlyWarnings, setEarlyWarnings] = useState(true);
  const [gpsLagCompensation, setGpsLagCompensation] = useState(0);
  const [speedLookaheadTime, setSpeedLookaheadTime] = useState(5);

  // Preferences state
  const [defaultRegion, setDefaultRegion] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [windGustThreshold, setWindGustThreshold] = useState(60);

  // AI settings state
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiTestingKey, setAiTestingKey] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    // GPS settings
    const savedEkf = localStorage.getItem('gps_ekf_enabled');
    const savedUncertainty = localStorage.getItem('gps_show_uncertainty');
    const savedEarly = localStorage.getItem('gps_early_warnings');
    const savedLag = localStorage.getItem('gps_lag_compensation');
    const savedLookahead = localStorage.getItem('speed_lookahead_time');

    if (savedEkf !== null) setEkfEnabled(savedEkf === 'true');
    if (savedUncertainty !== null) setShowUncertainty(savedUncertainty === 'true');
    if (savedEarly !== null) setEarlyWarnings(savedEarly === 'true');
    if (savedLag !== null) setGpsLagCompensation(parseFloat(savedLag) || 0);
    if (savedLookahead !== null) setSpeedLookaheadTime(parseInt(savedLookahead) || 5);

    // Preferences
    const savedRegion = localStorage.getItem('default_region');
    const savedWindGust = localStorage.getItem('wind_gust_threshold');

    if (savedRegion) setDefaultRegion(savedRegion);
    if (savedWindGust) setWindGustThreshold(parseInt(savedWindGust) || 60);

    // AI settings
    const savedKey = localStorage.getItem('ai_api_key') || '';
    setAiApiKey(savedKey);

    // Load regions
    const loadRegions = async () => {
      try {
        const res = await fetch('/api/roads?regions=true');
        if (res.ok) {
          const data = await res.json();
          setRegions(data.regions || []);
        }
      } catch {
        // Silently fail
      }
    };
    loadRegions();
  }, []);

  // Save handlers
  const saveGpsSetting = (key: string, value: boolean | number) => {
    localStorage.setItem(key, String(value));
  };

  const saveAiApiKey = () => {
    localStorage.setItem('ai_api_key', aiApiKey);
    alert('✓ API key saved!');
  };

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
    } catch {
      alert('✗ Connection failed: Network error');
    } finally {
      setAiTestingKey(false);
    }
  };

  return (
    <MobilePage>
      <MobileNav title="Settings" subtitle={`v${APP_VERSION}`} showBack backHref="/" />

      {/* TC TOOLS Section */}
      <Section icon="🛠️" title="TC Tools">
        <div className="py-1">
          <MenuItem icon="🚧" label="AfterCare Signs" href="/aftercare" />
          <MenuItem icon="📊" label="Traffic Counter" href="/traffic-counter" />
          <MenuItem icon="⏱️" label="Cycle Timer" href="/cycle-timer" />
          <MenuItem icon="👥" label="Contact Directory" href="/contacts" />
          <MenuItem icon="📍" label="GPS Calibration" href="/calibrate" />
        </div>
      </Section>

      {/* LIBRARY Section */}
      <Section icon="📚" title="Library">
        <div className="py-1">
          <MenuItem icon="📚" label="Document Registers" href="/library" />
          <MenuItem icon="🤖" label="AI Q&A Assistant" href="/qa" badge="AI" />
          <MenuItem icon="📖" label="Expanded Library" href="/library/expanded" />
          <MenuItem icon="📋" label="TMP Documents" href="/library/tmp" />
        </div>
      </Section>

      {/* GPS & CALIBRATION Section */}
      <Section icon="📍" title="GPS & Calibration">
        <div className="py-2">
          <ToggleSwitch
            label="EKF Filtering"
            description="Kalman filter for GPS smoothing"
            checked={ekfEnabled}
            onChange={(v) => {
              setEkfEnabled(v);
              saveGpsSetting('gps_ekf_enabled', v);
            }}
          />
          <ToggleSwitch
            label="Show Uncertainty"
            description="Display GPS accuracy indicator"
            checked={showUncertainty}
            onChange={(v) => {
              setShowUncertainty(v);
              saveGpsSetting('gps_show_uncertainty', v);
            }}
            disabled={!ekfEnabled}
          />
          <ToggleSwitch
            label="Early Warnings"
            description="Alert earlier at higher speeds"
            checked={earlyWarnings}
            onChange={(v) => {
              setEarlyWarnings(v);
              saveGpsSetting('gps_early_warnings', v);
            }}
          />

          <div className="py-3 border-t border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Lag Compensation</span>
              <span className="font-mono text-yellow-400">
                {gpsLagCompensation > 0 ? `+${gpsLagCompensation}s` : 'Not set'}
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

          <div className="py-3 border-t border-gray-800">
            <span className="text-sm text-white">Speed Lookahead Time</span>
            <div className="flex gap-2 mt-2">
              {[3, 5, 7, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSpeedLookaheadTime(s);
                    saveGpsSetting('speed_lookahead_time', s);
                  }}
                  className={`flex-1 py-1.5 text-xs rounded transition-colors ${
                    speedLookaheadTime === s
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* PREFERENCES Section */}
      <Section icon="⚙️" title="Preferences">
        <div className="py-2">
          {regions.length > 0 && (
            <div className="py-2">
              <span className="text-sm text-white">Default Region</span>
              <Select
                value={defaultRegion || '__none__'}
                onValueChange={(v) => {
                  const region = v === '__none__' ? '' : v;
                  setDefaultRegion(region);
                  localStorage.setItem('default_region', region);
                }}
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

          <div className="py-2">
            <span className="text-sm text-white">Wind Gust Alert (km/h)</span>
            <div className="flex gap-2 mt-2">
              {[40, 50, 60, 80].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setWindGustThreshold(t);
                    localStorage.setItem('wind_gust_threshold', String(t));
                  }}
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
        </div>
      </Section>

      {/* SPEED ZONE OVERRIDES Section */}
      <Section icon="🔧" title="Speed Zone Overrides">
        <div className="py-2">
          <p className="text-xs text-gray-400 mb-2">
            Community-verified corrections for MRWA speed zone data.
          </p>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-gray-500">Status:</span>
            <span className="text-green-400">✓ Active</span>
          </div>
          <Link href="/overrides">
            <Button className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-sm h-9">
              Manage Overrides
            </Button>
          </Link>
        </div>
      </Section>

      {/* AI ASSISTANT Section */}
      <Section icon="🤖" title="AI Assistant">
        <div className="py-3 space-y-2">
          <input
            type="password"
            value={aiApiKey}
            onChange={(e) => setAiApiKey(e.target.value)}
            placeholder="Enter API key"
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <div className="flex gap-2">
            <Button onClick={saveAiApiKey} className="flex-1 bg-cyan-600 hover:bg-cyan-700 h-9">
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
      </Section>

      {/* ABOUT Section */}
      <Section icon="ℹ️" title="About">
        <div className="py-2 space-y-2">
          <div className="text-sm">
            <p className="text-white font-medium">TC Work Zone Locator</p>
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
      </Section>
    </MobilePage>
  );
}
