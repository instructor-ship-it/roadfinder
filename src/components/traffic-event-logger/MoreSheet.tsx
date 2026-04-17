'use client';

import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { setSheetsConfig, toggleSheets } from '@/lib/traffic-event-logger';
import type { TrafficEventState } from '@/lib/traffic-event-logger';
import { HelpCircle, X, ExternalLink, Copy, Check } from 'lucide-react';

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
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [syncUrl, setSyncUrl] = useState(state.sheetsUrl || '');
  const [syncSecret, setSyncSecret] = useState(state.sheetsSecret || '');
  const [saveMessage, setSaveMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Google Apps Script code for user to copy
  const SCRIPT_CODE = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  var time = e.parameter.time || '';
  var type = e.parameter.type || '';
  var label = e.parameter.label || '';
  var note = e.parameter.note || '';
  var roadId = e.parameter.roadId || '';
  var roadName = e.parameter.roadName || '';
  var slk = e.parameter.slk || '';
  var op = e.parameter.op || '';
  var targetId = e.parameter.targetId || '';
  var latitude = e.parameter.latitude || '';
  var longitude = e.parameter.longitude || '';
  
  // Handle DELETE operation
  if (op === 'DELETE') {
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 0; i--) {
      if (data[i][8] === targetId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return ContentService.createTextOutput('OK');
  }
  
  sheet.appendRow([time, type, label, note, roadId, roadName, slk, op, targetId, latitude, longitude]);
  return ContentService.createTextOutput('OK');
}`;

  // Copy script to clipboard
  const handleCopyScript = () => {
    navigator.clipboard.writeText(SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <div className="flex gap-2">
              <button
                onClick={() => setShowSyncSettings(!showSyncSettings)}
                className="flex-1 py-2 px-3 rounded border border-gray-600 bg-gray-700 text-gray-200 text-xs hover:bg-gray-600 transition-all"
              >
                {showSyncSettings ? '▲ Hide Settings' : '▼ Configure Sync'}
              </button>
              <button
                onClick={() => setShowHelpDialog(true)}
                className="py-2 px-3 rounded border border-blue-600 bg-blue-600/20 text-blue-400 text-xs hover:bg-blue-600/30 transition-all"
                title="Setup Instructions"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>

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

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">📋 Cloud Sync Setup Guide</h2>
            <button
              onClick={() => setShowHelpDialog(false)}
              className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <p className="text-gray-300">
              Cloud sync sends your traffic events to your own private Google Sheet. Follow these
              steps:
            </p>

            {/* Step 1 */}
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-800/50">
              <h3 className="font-medium text-blue-400 mb-2">Step 1: Create a Google Sheet</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 text-xs">
                <li>Go to sheets.google.com and create a new spreadsheet</li>
                <li>Add headers in row 1 (optional):</li>
              </ol>
              <code className="block mt-2 p-2 bg-gray-900 rounded text-xs text-green-400 overflow-x-auto">
                Time | Type | Label | Note | Road ID | Road Name | SLK | Op | Target ID | Lat | Lon
              </code>
            </div>

            {/* Step 2 */}
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-800/50">
              <h3 className="font-medium text-blue-400 mb-2">Step 2: Add Apps Script</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 text-xs">
                <li>In your sheet, go to Extensions → Apps Script</li>
                <li>Delete any existing code</li>
                <li>Paste the script below</li>
                <li>Save (Ctrl+S)</li>
              </ol>
              <button
                onClick={handleCopyScript}
                className="mt-2 flex items-center gap-2 py-1.5 px-3 rounded bg-gray-700 text-xs hover:bg-gray-600 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy Script
                  </>
                )}
              </button>
            </div>

            {/* Step 3 */}
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-800/50">
              <h3 className="font-medium text-blue-400 mb-2">Step 3: Deploy</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 text-xs">
                <li>Click Deploy → New deployment</li>
                <li>Choose type: Web app</li>
                <li>Execute as: Me</li>
                <li>Who has access: Anyone</li>
                <li>Click Deploy</li>
                <li>
                  <strong className="text-yellow-400">Copy the Web app URL</strong> (looks like
                  https://script.google.com/macros/s/.../exec)
                </li>
              </ol>
            </div>

            {/* Step 4 */}
            <div className="border border-gray-700 rounded-lg p-3 bg-gray-800/50">
              <h3 className="font-medium text-blue-400 mb-2">Step 4: Configure in App</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-300 text-xs">
                <li>Close this help dialog</li>
                <li>Tap "Configure Sync"</li>
                <li>Paste your URL</li>
                <li>Tap Save</li>
              </ol>
            </div>

            {/* Security note */}
            <div className="border border-amber-700/50 rounded-lg p-3 bg-amber-900/20">
              <h3 className="font-medium text-amber-400 mb-1">🔒 Security Note</h3>
              <p className="text-xs text-gray-300">
                Your data goes to YOUR sheet only. No one else has access unless you share the URL.
                Each user should create their own sheet for privacy.
              </p>
            </div>

            {/* Video tutorial link */}
            <a
              href="https://github.com/instructor-ship-it/roadfinder#cloud-sync-setup"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs"
            >
              <ExternalLink className="h-3 w-3" />
              View full documentation on GitHub
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
