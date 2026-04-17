'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { setSheetsConfig, toggleSheets } from '@/lib/traffic-event-logger';
import type { TrafficEventState } from '@/lib/traffic-event-logger';

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: TrafficEventState;
  onToggleHold: () => void;
  onToggleBreak: () => void;
  onToggleSuspend: () => void;
  onToggleShuttle: () => void;
  onLogEvent: (type: string, label: string) => void;
  onOpenFlashers: () => void;
}

export function MoreSheet({
  open,
  onOpenChange,
  state,
  onToggleHold,
  onToggleBreak,
  onToggleSuspend,
  onToggleShuttle,
  onLogEvent,
  onOpenFlashers,
}: MoreSheetProps) {
  // Cloud sync settings state
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [syncUrl, setSyncUrl] = useState(state.sheetsUrl || '');
  const [syncSecret, setSyncSecret] = useState(state.sheetsSecret || '');
  const [saveMessage, setSaveMessage] = useState('');

  // Handle save
  const handleSaveSync = () => {
    setSheetsConfig(syncUrl, syncSecret);
    setSaveMessage('✅ Saved!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  // Handle toggle sheets on/off
  const handleToggleSync = () => {
    if (!state.sheetsUrl) {
      // No URL configured - show settings
      setShowSyncSettings(true);
      return;
    }
    toggleSheets();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gray-900 border-t border-gray-700">
        <DrawerHeader>
          <DrawerTitle className="text-white">More Actions</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {/* Cloud Sync Section */}
          <div className="border border-gray-700 rounded-lg p-3 bg-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">☁️ Cloud Sync</span>
              <button
                onClick={handleToggleSync}
                disabled={!state.sheetsUrl}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  state.sheetsEnabled && state.sheetsUrl
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {state.sheetsEnabled && state.sheetsUrl ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Sync status */}
            {!state.sheetsUrl ? (
              <p className="text-xs text-amber-400 mb-2">
                ⚠️ No sync URL configured. Data is stored locally only.
              </p>
            ) : (
              <p className="text-xs text-green-400 mb-2">
                ✓ Sync configured • {state.sheetsUrl.slice(0, 40)}...
              </p>
            )}

            {/* Show/hide settings button */}
            <button
              onClick={() => setShowSyncSettings(!showSyncSettings)}
              className="w-full py-2 px-3 rounded border border-gray-600 bg-gray-700 text-gray-200 text-xs hover:bg-gray-600 transition-all"
            >
              {showSyncSettings ? '▲ Hide Settings' : '▼ Configure Sync'}
            </button>

            {/* Settings panel */}
            {showSyncSettings && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Google Apps Script URL</label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/..."
                    value={syncUrl}
                    onChange={(e) => setSyncUrl(e.target.value)}
                    className="w-full py-2 px-3 rounded bg-gray-700 border border-gray-600 text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Secret (optional)</label>
                  <input
                    type="text"
                    placeholder="Your secret key"
                    value={syncSecret}
                    onChange={(e) => setSyncSecret(e.target.value)}
                    className="w-full py-2 px-3 rounded bg-gray-700 border border-gray-600 text-white text-xs placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveSync}
                    className="flex-1 py-2 px-3 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-all"
                  >
                    Save
                  </button>
                  {saveMessage && <span className="text-xs text-green-400">{saveMessage}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Each user should configure their own Google Sheet. See docs for setup
                  instructions.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 my-3" />
          {/* On Hold - Red toggle */}
          <button
            onClick={() => {
              onToggleHold();
              onOpenChange(false);
            }}
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-all ${
              state.hold.active
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {state.hold.active ? 'Hold OFF' : 'On Hold'}
          </button>

          {/* Data Entry Suspended - Red toggle */}
          <button
            onClick={() => {
              onToggleSuspend();
              onOpenChange(false);
            }}
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-all ${
              state.suspended
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {state.suspended ? 'Suspended OFF' : 'Data Entry Suspended'}
          </button>

          {/* Take Break - Green toggle */}
          <button
            onClick={() => {
              onToggleBreak();
              onOpenChange(false);
            }}
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-all ${
              state.break.active
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {state.break.active ? 'Break OFF' : 'Take Break'}
          </button>

          {/* Shuttle - Green toggle */}
          <button
            onClick={() => {
              onToggleShuttle();
              onOpenChange(false);
            }}
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-all ${
              state.shuttle
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {state.shuttle ? 'Shuttle OFF' : 'Shuttle'}
          </button>

          {/* Site check */}
          <button
            onClick={() => {
              onLogEvent('siteCheck', 'Site check');
              onOpenChange(false);
            }}
            className="w-full py-3 px-4 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 font-medium text-sm hover:bg-gray-700 active:scale-[0.99] transition-all"
          >
            Site check
          </button>

          {/* Advanced flashers */}
          <button
            onClick={() => {
              onOpenFlashers();
              onOpenChange(false);
            }}
            className="w-full py-3 px-4 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 font-medium text-sm hover:bg-gray-700 active:scale-[0.99] transition-all"
          >
            Advanced flashers…
          </button>
        </div>
        <DrawerFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-2.5 px-4 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-sm hover:bg-gray-600 transition-all"
          >
            Close
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
