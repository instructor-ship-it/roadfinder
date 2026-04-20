'use client';

import type { ComponentProps } from 'react';
import SettingsDrawer, { APP_VERSION } from '@/components/SettingsDrawer';

interface HomeHeaderProps {
  offlineReady: boolean;
  onShowEmergency: () => void;
  settingsDrawerProps: ComponentProps<typeof SettingsDrawer>;
}

export function HomeHeader({
  offlineReady,
  onShowEmergency,
  settingsDrawerProps,
}: HomeHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-1" role="banner">
      <button
        onClick={onShowEmergency}
        className="w-8 h-8 flex items-center justify-center rounded-full text-lg bg-red-600 hover:bg-red-700"
        title="Emergency Location (000)"
        aria-label="Get emergency location for 000 call"
      >
        🆘
      </button>
      <div className="text-center flex-1">
        <h1 className="text-xl font-bold">TC Work Zone Locator</h1>
        <p className="text-xs text-gray-400">
          v{APP_VERSION} {offlineReady && <span className="text-green-400">• Offline Ready</span>}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <SettingsDrawer {...settingsDrawerProps} />
      </div>
    </header>
  );
}
